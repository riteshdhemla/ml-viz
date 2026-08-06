"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, seededRandom } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";

/**
 * Speech recognition from frames to Word Error Rate, one stage at a time.
 *
 * The lesson states CTC's machinery correctly — blank, collapse rule, sum over
 * alignments, then WER. What a static page cannot show is the thing that makes
 * decoding interesting: **two of the errors in this utterance have completely
 * different causes, and only one of them is the decoder's fault.**
 *
 * Everything here is the real algorithm run in the browser:
 *   - the CTC forward DP, checked against brute-force enumeration of every
 *     frame labelling on a tiny case (they agree exactly, and the labellings
 *     sum to 1);
 *   - the same recurrence with probabilities replaced by ones, to count how
 *     many alignments exist at all (7.9e33 for this utterance);
 *   - greedy best-path decoding;
 *   - CTC prefix beam search (Hannun et al.), optionally weighted by a
 *     lexicon language model;
 *   - Levenshtein alignment with backtrace for the S/D/I breakdown behind WER.
 *
 * The acoustic model is synthetic but not hand-written: each character is held
 * for a few frames with one logit vector per segment, and two segments are
 * deliberately *barely voiced* so that blank outscores the character in every
 * frame. That single mechanism produces the whole narrative:
 *
 *   greedy    "the cat sat n te mat"    WER 0.333  — drops both weak characters
 *   beam      "the cat sat on tee mat"  WER 0.167  — recovers one
 *   beam + LM "the cat sat on the mat"  WER 0.000
 *
 * The pattern holds for all 8 seeds tried and across the whole plateau of
 * weakness values from 2.7 to 3.1 and 3.4 to 4.6, so it is not a knife-edge.
 *
 * The subtle part, and the reason the last two steps are separate: beam's
 * output is *more probable than the truth* under the acoustic model (5.9e-16
 * against 2.8e-16). The search is not failing — the model is. Greedy's error is
 * a search error and better search fixes it; beam's remaining error is a model
 * error and only outside knowledge does. That distinction is exactly why a CTC
 * system ships with a language model, and it is why the walkthrough measures
 * the probability of each decoder's own output rather than only its WER.
 */

/* -------------------------------------------------------------- constants */

const BLANK = "_";
/** Rendered space — a real token in the alphabet, shown visibly in the strip. */
const SPACE = "␣";

const TARGET = "the cat sat on the mat";
const ALPHABET = [BLANK, SPACE, "a", "c", "e", "h", "k", "m", "n", "o", "s", "t"] as const;

/** A tiny pronunciation lexicon — the only outside knowledge the decoder gets. */
const LEXICON = [
  "the", "cat", "sat", "on", "mat", "hat", "cot", "can", "man", "at",
  "he", "so", "not", "ten", "tan", "cast", "coat", "moat", "oat", "an", "as",
];

const FRAMES_PER_CHAR = 4;
const BLANK_BIAS = 0.9;
const NOISE = 0.22;
const SHARP = 3.4;
const SEED = 7;
/** Off-lexicon character extensions are multiplied by this in the beam. */
const LM_PENALTY = 0.04;

/**
 * Characters the speaker barely voices, by index into TARGET: the "o" of "on"
 * and the "h" of the second "the". The value is subtracted from the character's
 * logit, so blank wins every frame and greedy drops the letter outright.
 */
const WEAK: Record<number, number> = { 12: 2.9, 16: 4.0 };

const ARTICULATIONS = [
  { id: "clear", label: "Clear", scale: 0.45, note: "every phoneme fully voiced" },
  { id: "normal", label: "Normal", scale: 1.0, note: "two barely-voiced characters" },
  { id: "mumbled", label: "Mumbled", scale: 1.3, note: "swallowed consonants" },
] as const;
type ArticulationId = (typeof ARTICULATIONS)[number]["id"];

const BEAM_WIDTHS = [1, 8, 40] as const;

/* ------------------------------------------------------------------ model */

function softmax(z: number[]) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

interface Acoustics {
  /** post[t][k] = P(token k at frame t). */
  post: number[][];
  /** Which character each frame was generated from, for the truth overlay. */
  frameChar: string[];
  /** Index into TARGET, or -1 for a blank segment. */
  segOf: number[];
}

/**
 * One logit vector per held segment, so an ambiguity is consistent across the
 * frames of a phoneme rather than flickering frame to frame.
 */
function buildAcoustics(scale: number): Acoustics {
  const rnd = seededRandom(SEED);
  const post: number[][] = [];
  const frameChar: string[] = [];
  const segOf: number[] = [];
  const plan: { c: string; n: number; ci: number }[] = [];
  let ci = -1;
  for (const ch of TARGET) {
    ci += 1;
    plan.push({ c: BLANK, n: 1, ci: -1 });
    plan.push({ c: ch === " " ? SPACE : ch, n: ch === " " ? 2 : FRAMES_PER_CHAR, ci });
  }
  plan.push({ c: BLANK, n: 2, ci: -1 });

  for (const seg of plan) {
    const weak = (WEAK[seg.ci] ?? 0) * scale;
    const base = ALPHABET.map((a) => {
      let v = 0;
      if (a === seg.c) v += SHARP - weak;
      if (a === BLANK) v += BLANK_BIAS;
      return v;
    });
    for (let k = 0; k < seg.n; k++) {
      post.push(softmax(base.map((v) => v + (rnd() - 0.5) * NOISE)));
      frameChar.push(seg.c);
      segOf.push(seg.ci);
    }
  }
  return { post, frameChar, segOf };
}

/* -------------------------------------------------------------- CTC core */

/** Merge repeats, then drop blanks. */
export function collapse(path: string) {
  let out = "";
  let prev: string | null = null;
  for (const c of path) {
    if (c !== prev) {
      if (c !== BLANK) out += c;
      prev = c;
    }
  }
  return out;
}

/** l' = blank, l1, blank, l2, … blank. */
const extend = (target: string) => {
  const ext = [BLANK];
  for (const c of target) {
    ext.push(c);
    ext.push(BLANK);
  }
  return ext;
};

/** Full forward trellis; alpha[t][s]. */
function forwardTrellis(post: number[][], target: string) {
  const T = post.length;
  const ext = extend(target);
  const S = ext.length;
  const idx = (c: string) => ALPHABET.indexOf(c as (typeof ALPHABET)[number]);
  const alpha: number[][] = [new Array<number>(S).fill(0)];
  alpha[0][0] = post[0][idx(BLANK)];
  if (S > 1) alpha[0][1] = post[0][idx(ext[1])];
  for (let t = 1; t < T; t++) {
    const row = new Array<number>(S).fill(0);
    for (let s = 0; s < S; s++) {
      let a = alpha[t - 1][s];
      if (s > 0) a += alpha[t - 1][s - 1];
      if (s > 1 && ext[s] !== BLANK && ext[s] !== ext[s - 2]) a += alpha[t - 1][s - 2];
      row[s] = a * post[t][idx(ext[s])];
    }
    alpha.push(row);
  }
  return { alpha, ext };
}

/** P(target | acoustics), summed over every alignment. */
function ctcProb(post: number[][], target: string) {
  const { alpha } = forwardTrellis(post, target);
  const last = alpha[alpha.length - 1];
  return last[last.length - 1] + (last.length > 1 ? last[last.length - 2] : 0);
}

/** The same recurrence with probabilities replaced by 1: how many alignments exist. */
function countAlignments(T: number, target: string) {
  const ext = extend(target);
  const S = ext.length;
  let a = new Array<number>(S).fill(0);
  a[0] = 1;
  if (S > 1) a[1] = 1;
  for (let t = 1; t < T; t++) {
    const nx = new Array<number>(S).fill(0);
    for (let s = 0; s < S; s++) {
      let v = a[s];
      if (s > 0) v += a[s - 1];
      if (s > 1 && ext[s] !== BLANK && ext[s] !== ext[s - 2]) v += a[s - 2];
      nx[s] = v;
    }
    a = nx;
  }
  return a[S - 1] + (S > 1 ? a[S - 2] : 0);
}

/**
 * Enumerate every frame labelling for a tiny posterior matrix. Used once, to
 * show that the forward DP and brute force agree and that the labellings sum
 * to one — the claim the lesson makes but cannot show.
 */
function bruteForceCheck() {
  const alphabet = [BLANK, "a", "b"];
  const post = [
    [0.55, 0.3, 0.15],
    [0.4, 0.45, 0.15],
    [0.5, 0.35, 0.15],
    [0.45, 0.4, 0.15],
  ];
  const totals = new Map<string, number>();
  const walk = (t: number, path: string, p: number) => {
    if (t === post.length) {
      const l = collapse(path);
      totals.set(l, (totals.get(l) ?? 0) + p);
      return;
    }
    for (let k = 0; k < alphabet.length; k++) walk(t + 1, path + alphabet[k], p * post[t][k]);
  };
  walk(0, "", 1);

  // the same DP as above, over this alphabet
  const dp = (target: string) => {
    const ext = extend(target);
    const S = ext.length;
    const idx = (c: string) => alphabet.indexOf(c);
    let a = new Array<number>(S).fill(0);
    a[0] = post[0][idx(BLANK)];
    if (S > 1) a[1] = post[0][idx(ext[1])];
    for (let t = 1; t < post.length; t++) {
      const nx = new Array<number>(S).fill(0);
      for (let s = 0; s < S; s++) {
        let v = a[s];
        if (s > 0) v += a[s - 1];
        if (s > 1 && ext[s] !== BLANK && ext[s] !== ext[s - 2]) v += a[s - 2];
        nx[s] = v * post[t][idx(ext[s])];
      }
      a = nx;
    }
    return a[S - 1] + (S > 1 ? a[S - 2] : 0);
  };

  const rows = [...totals.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 5)
    .map(([label, brute]) => ({ label, brute, dp: dp(label) }));
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const maxErr = Math.max(...rows.map((r) => Math.abs(r.brute - r.dp)));
  return { rows, total, maxErr, paths: alphabet.length ** post.length };
}

/* ------------------------------------------------------------- decoding */

function greedyDecode(post: number[][]) {
  let path = "";
  let p = 1;
  for (const row of post) {
    let bi = 0;
    for (let k = 1; k < row.length; k++) if (row[k] > row[bi]) bi = k;
    path += ALPHABET[bi];
    p *= row[bi];
  }
  return { path, text: collapse(path), pathProb: p };
}

const isWordPrefix = (w: string) => LEXICON.some((x) => x.startsWith(w));

/** Lexicon LM: penalise any extension that walks off every real word. */
function lexiconLM(prefix: string, c: string) {
  const lastWord = prefix.split(SPACE).pop() ?? "";
  if (c === SPACE) return lastWord.length > 0 && LEXICON.includes(lastWord) ? 1 : LM_PENALTY;
  return isWordPrefix(lastWord + c) ? 1 : LM_PENALTY;
}

interface Hypothesis {
  text: string;
  p: number;
}

/** CTC prefix beam search — merges every path that collapses to the same prefix. */
function beamDecode(post: number[][], width: number, useLM: boolean): Hypothesis[] {
  const bi = ALPHABET.indexOf(BLANK);
  // prefix -> [p_ending_in_blank, p_ending_in_symbol]
  let beams = new Map<string, [number, number]>([["", [1, 0]]]);
  for (let t = 0; t < post.length; t++) {
    const next = new Map<string, [number, number]>();
    const get = (k: string): [number, number] => next.get(k) ?? [0, 0];
    for (const [prefix, [pb, pnb]] of beams) {
      const last = prefix.length ? prefix[prefix.length - 1] : null;
      for (let k = 0; k < ALPHABET.length; k++) {
        const c = ALPHABET[k];
        const p = post[t][k];
        if (p < 1e-9) continue;
        if (k === bi) {
          const e = get(prefix);
          next.set(prefix, [e[0] + (pb + pnb) * p, e[1]]);
          continue;
        }
        const w = useLM ? lexiconLM(prefix, c) : 1;
        if (c === last) {
          // no blank between them: stays the same prefix
          const s = get(prefix);
          next.set(prefix, [s[0], s[1] + pnb * p]);
          // a blank did intervene: a genuine repeated character
          const grown = prefix + c;
          const g = get(grown);
          next.set(grown, [g[0], g[1] + pb * p * w]);
        } else {
          const grown = prefix + c;
          const g = get(grown);
          next.set(grown, [g[0], g[1] + (pb + pnb) * p * w]);
        }
      }
    }
    beams = new Map(
      [...next.entries()]
        .sort((a, b) => b[1][0] + b[1][1] - (a[1][0] + a[1][1]))
        .slice(0, width),
    );
  }
  return [...beams.entries()]
    .map(([text, v]) => ({ text, p: v[0] + v[1] }))
    .sort((a, b) => b.p - a.p);
}

/* ------------------------------------------------------------------ WER */

type Op = { kind: "ok" | "sub" | "del" | "ins"; ref: string | null; hyp: string | null };

function werAlign(ref: string[], hyp: string[]) {
  const R = ref.length;
  const H = hyp.length;
  const d = Array.from({ length: R + 1 }, () => new Array<number>(H + 1).fill(0));
  for (let i = 0; i <= R; i++) d[i][0] = i;
  for (let j = 0; j <= H; j++) d[0][j] = j;
  for (let i = 1; i <= R; i++)
    for (let j = 1; j <= H; j++)
      d[i][j] =
        ref[i - 1] === hyp[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);

  let i = R;
  let j = H;
  let S = 0;
  let D = 0;
  let I = 0;
  const ops: Op[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      ops.push({ kind: "ok", ref: ref[i - 1], hyp: hyp[j - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      ops.push({ kind: "sub", ref: ref[i - 1], hyp: hyp[j - 1] });
      S++;
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ kind: "del", ref: ref[i - 1], hyp: null });
      D++;
      i--;
    } else {
      ops.push({ kind: "ins", ref: null, hyp: hyp[j - 1] });
      I++;
      j--;
    }
  }
  ops.reverse();
  return { S, D, I, N: R, wer: (S + D + I) / R, ops };
}

const readable = (t: string) => t.split(SPACE).join(" ").trim();
const werOf = (t: string) => werAlign(TARGET.split(" "), readable(t).split(/\s+/).filter(Boolean));

/* ------------------------------------------------------------------ steps */

const S_ALIGN = 0;
const S_BLANK = 1;
const S_SUM = 2;
const S_GREEDY = 3;
const S_BEAM = 4;
const S_LM = 5;
const S_WER = 6;

const PHASES: GuidedPhase[] = [
  { id: "align", label: "The alignment problem", tone: "teal" },
  { id: "ctc", label: "CTC · training objective", tone: "brand", numberPrefix: "F" },
  { id: "decode", label: "Decoding · turning frames into text", tone: "orange", numberPrefix: "D" },
  { id: "score", label: "Scoring", tone: "yellow", numberPrefix: "W" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "align",
    label: "Frames vs text",
    title: "There are far more frames than characters, and no map between them",
    body: (
      <>
        <p>
          The acoustic model emits a distribution over characters for{" "}
          <strong>every frame</strong> — about 100 a second. The transcript is far shorter, and
          nobody labelled which frames belong to which character: people stretch vowels, pause, and
          run words together.
        </p>
        <p>
          Without a way to handle that, you would need frame-level annotations to train at all,
          which is exactly the hand-built alignment stage that classical HMM systems needed and CTC
          removed.
        </p>
      </>
    ),
    hint: "The bright band is the model's per-frame belief. Notice it is a staircase, not a diagonal — each character is held for several frames.",
  },
  {
    phase: "align",
    label: "Blank + collapse",
    title: "The blank token is what makes the collapse well-defined",
    body: (
      <>
        <p>
          CTC lets the model emit a <strong>blank</strong> when it is between characters or unsure.
          To read a frame labelling as text: merge runs of the same character, then delete the
          blanks.
        </p>
        <p>
          Without the blank, a held sound and a genuine double letter would be indistinguishable —
          the collapse would turn both into a single character, and no model could ever output{" "}
          <code>hello</code>.
        </p>
      </>
    ),
    hint: "Click any frame below to change what the model emitted, and watch the collapsed text update. Try deleting the blank between the two l's.",
  },
  {
    phase: "ctc",
    label: "Sum over alignments",
    title: "Score the text by summing every alignment that produces it",
    body: (
      <>
        <p>
          CTC does not pick an alignment — it adds up <em>all</em> of them. The probability of a
          transcript is the total probability of every frame labelling that collapses to it,
          computed with the same forward dynamic program as an HMM.
        </p>
        <p>
          That is what removes the need for frame labels: no alignment is ever chosen, so none has
          to be supplied. The trellis below is that DP; each row is a position in{" "}
          <code>_ t _ h _ e _ …</code> and the band is where the probability mass actually lives.
        </p>
      </>
    ),
    hint: "The staircase band is the set of alignments carrying real mass — everything outside it is possible but negligible.",
  },
  {
    phase: "decode",
    label: "Greedy",
    title: "Greedy decoding takes the best path, not the best transcript",
    body: (
      <>
        <p>
          The cheapest decoder takes the argmax token at every frame and collapses the result. It is
          one pass and it is what most people reach for first.
        </p>
        <p>
          But the most likely <em>path</em> is not the most likely <em>transcript</em>. Where the
          speaker barely voices a character, blank wins every individual frame while the many
          alignments that keep the character are collectively far more likely. Greedy drops the
          letter, confidently.
        </p>
      </>
    ),
    hint: "The shaded frames are where the speaker mumbles. Greedy emits blank across all of them.",
  },
  {
    phase: "decode",
    label: "Beam search",
    title: "Beam search scores transcripts instead of paths",
    body: (
      <>
        <p>
          CTC prefix beam search keeps the best few <em>prefixes</em> rather than the best path, and
          merges every path that collapses to the same prefix — so a character supported by many
          scattered alignments can win even if it never wins a single frame.
        </p>
        <p>
          That fixes the dropped character. What it cannot fix is a transcript the acoustic model
          genuinely prefers: the top hypotheses below differ only in a consonant the audio barely
          contains, and the model has no idea which of them is a word.
        </p>
      </>
    ),
    hint: "Compare the top hypotheses' probabilities — they are within a few percent of each other. The acoustics simply do not decide it.",
  },
  {
    phase: "decode",
    label: "Add a lexicon",
    title: "The last error is the model's, not the search's",
    body: (
      <>
        <p>
          CTC assumes frames are conditionally independent given the audio, so the acoustic model
          has no notion of a word. Weighting each beam extension by whether it still spells
          something in a lexicon supplies exactly the knowledge it lacks.
        </p>
        <p>
          This is the difference between a <strong>search error</strong> and a{" "}
          <strong>model error</strong>. Greedy made a search error and better search fixed it; what
          remained was the model preferring the wrong answer, and no amount of searching fixes that
          — only outside knowledge does.
        </p>
      </>
    ),
    hint: "Set the beam width to 1 and watch the language model make things worse — with no alternatives kept, there is nothing for it to re-rank.",
  },
  {
    phase: "score",
    label: "Word Error Rate",
    title: "WER counts the edits, and hides where they came from",
    body: (
      <>
        <p>
          WER aligns the hypothesis to the reference by edit distance and counts substitutions,
          deletions and insertions over the reference length. It is the number every ASR paper
          reports.
        </p>
        <p>
          It is also the number that flattens everything above: two errors from two entirely
          different causes count the same, and only the walkthrough tells you that one was fixable
          by search and the other needed a lexicon.
        </p>
      </>
    ),
    hint: "Switch the articulation control to Clear and every decoder ties at zero — the whole pipeline earns its keep only on hard audio.",
  },
];

/* ---------------------------------------------------------- collapse demo */

const DEMO_INITIAL = ["h", "h", BLANK, "e", BLANK, "l", "l", BLANK, "l", "o"];
const DEMO_TOKENS = [BLANK, "h", "e", "l", "o"];

/* -------------------------------------------------------------- component */

export function CTCDecodingViz({ className }: { className?: string }) {
  const [articulation, setArticulation] = useState<ArticulationId>("normal");
  const [width, setWidth] = useState<number>(40);
  const [demo, setDemo] = useState<string[]>(DEMO_INITIAL);

  const scale = ARTICULATIONS.find((a) => a.id === articulation)!.scale;
  const acoustics = useMemo(() => buildAcoustics(scale), [scale]);
  const { post, segOf } = acoustics;

  const greedy = useMemo(() => greedyDecode(post), [post]);
  const beam = useMemo(() => beamDecode(post, width, false), [post, width]);
  const beamLM = useMemo(() => beamDecode(post, width, true), [post, width]);

  const targetTokens = TARGET.replace(/ /g, SPACE);
  const truthProb = useMemo(() => ctcProb(post, targetTokens), [post, targetTokens]);
  const alignments = useMemo(() => countAlignments(post.length, targetTokens), [post.length, targetTokens]);
  const trellis = useMemo(() => forwardTrellis(post, targetTokens), [post, targetTokens]);
  const check = useMemo(() => bruteForceCheck(), []);

  const beamProb = useMemo(
    () => (beam.length ? ctcProb(post, beam[0].text) : 0),
    [post, beam],
  );
  const greedyProb = useMemo(() => ctcProb(post, greedy.text), [post, greedy.text]);

  const wGreedy = werOf(greedy.text);
  const wBeam = werOf(beam[0]?.text ?? "");
  const wLM = werOf(beamLM[0]?.text ?? "");

  const weakFrames = useMemo(
    () => segOf.map((ci) => (WEAK[ci] !== undefined ? 1 : 0)),
    [segOf],
  );

  /* ------------------------------------------------------------ controls */

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        articulation
      </span>
      {ARTICULATIONS.map((a) => (
        <VizButton key={a.id} onClick={() => setArticulation(a.id)} active={articulation === a.id}>
          {a.label}
        </VizButton>
      ))}
      <span className="ml-2 self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        beam width
      </span>
      {BEAM_WIDTHS.map((w) => (
        <VizButton key={w} onClick={() => setWidth(w)} active={width === w}>
          {w}
        </VizButton>
      ))}
    </>
  );

  /* -------------------------------------------------------------- stages */

  const W = 680;
  const PLOT_X0 = 30;
  const PLOT_X1 = 668;
  const frameW = (PLOT_X1 - PLOT_X0) / post.length;

  /** The per-frame posterior matrix: tokens down, time across. */
  const posteriorStage = (highlightPath: string | null) => {
    const rowH = 13;
    const H = ALPHABET.length * rowH + 34;
    // batch cells into a few opacity buckets so this stays a handful of paths
    const levels = 6;
    const buckets: string[][] = Array.from({ length: levels }, () => []);
    for (let t = 0; t < post.length; t++) {
      for (let k = 0; k < ALPHABET.length; k++) {
        const v = post[t][k];
        if (v < 0.04) continue;
        const l = Math.min(levels - 1, Math.floor(v * levels));
        const x = PLOT_X0 + t * frameW;
        const y = 16 + k * rowH;
        buckets[l].push(`M${x.toFixed(2)} ${y}h${frameW.toFixed(2)}v${rowH - 1.5}h-${frameW.toFixed(2)}z`);
      }
    }
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Per-frame character posteriors over the whole utterance"
      >
        {weakFrames.map((w, t) =>
          w ? (
            <rect
              key={t}
              x={PLOT_X0 + t * frameW}
              y={12}
              width={frameW}
              height={ALPHABET.length * rowH + 4}
              fill={VIZ.rose}
              opacity={0.16}
            />
          ) : null,
        )}
        {buckets.map((b, l) =>
          b.length ? (
            <path key={l} d={b.join("")} fill={VIZ.brandLight} opacity={0.12 + (l / levels) * 0.88} />
          ) : null,
        )}
        {highlightPath &&
          highlightPath.split("").map((c, t) => {
            const k = ALPHABET.indexOf(c as (typeof ALPHABET)[number]);
            if (k < 0) return null;
            return (
              <rect
                key={t}
                x={PLOT_X0 + t * frameW}
                y={16 + k * rowH}
                width={frameW}
                height={rowH - 1.5}
                fill="none"
                stroke={VIZ.orange}
                strokeWidth={0.9}
              />
            );
          })}
        {ALPHABET.map((a, k) => (
          <text
            key={a}
            x={PLOT_X0 - 6}
            y={16 + k * rowH + 9}
            textAnchor="end"
            fill={VIZ.text}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
          >
            {a}
          </text>
        ))}
        <text
          x={PLOT_X0}
          y={H - 6}
          fill={VIZ.axis}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          {post.length} frames · {TARGET.length} characters · {TARGET.split(" ").length} words
        </text>
      </svg>
    );
  };

  /** The interactive blank/collapse demo. */
  const collapseStage = () => {
    const cellW = 52;
    const x0 = (W - demo.length * cellW) / 2;
    const H = 150;
    const text = collapse(demo.join(""));
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="An editable frame labelling and the text it collapses to"
      >
        {demo.map((c, i) => (
          <g
            key={i}
            onClick={() => {
              const next = [...demo];
              const k = DEMO_TOKENS.indexOf(c);
              next[i] = DEMO_TOKENS[(k + 1) % DEMO_TOKENS.length];
              setDemo(next);
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={x0 + i * cellW}
              y={18}
              width={cellW - 5}
              height={38}
              rx={4}
              fill={c === BLANK ? VIZ.card : VIZ.brand}
              opacity={c === BLANK ? 1 : 0.8}
              stroke={VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={x0 + i * cellW + (cellW - 5) / 2}
              y={43}
              textAnchor="middle"
              fill={c === BLANK ? VIZ.axis : "#fff"}
              fontSize={17}
              fontFamily="ui-monospace, monospace"
            >
              {c}
            </text>
          </g>
        ))}
        <text
          x={W / 2}
          y={12}
          textAnchor="middle"
          fill={VIZ.axis}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          frame labelling — click any frame to change it
        </text>
        <text
          x={W / 2}
          y={84}
          textAnchor="middle"
          fill={VIZ.text}
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          merge repeats, then drop blanks
        </text>
        <text
          x={W / 2}
          y={116}
          textAnchor="middle"
          fill={text === "hello" ? VIZ.teal : VIZ.orange}
          fontSize={24}
          fontFamily="ui-monospace, monospace"
        >
          &ldquo;{text}&rdquo;
        </text>
        <text
          x={W / 2}
          y={138}
          textAnchor="middle"
          fill={VIZ.axis}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          {text === "hello"
            ? "correct — the blank between the two l's is what keeps them apart"
            : "not the target text yet"}
        </text>
      </svg>
    );
  };

  /** The forward trellis: extended label positions down, frames across. */
  const trellisStage = () => {
    const { alpha, ext } = trellis;
    const S = ext.length;
    const H = 230;
    const rowH = (H - 40) / S;
    const levels = 6;
    const buckets: string[][] = Array.from({ length: levels }, () => []);
    for (let t = 0; t < alpha.length; t++) {
      const row = alpha[t];
      const max = Math.max(...row);
      if (max <= 0) continue;
      for (let s = 0; s < S; s++) {
        if (row[s] <= 0) continue;
        // log scale relative to the frame's own best cell
        const rel = Math.log10(row[s] / max);
        if (rel < -6) continue;
        const l = Math.min(levels - 1, Math.floor((1 + rel / 6) * levels));
        const x = PLOT_X0 + t * frameW;
        const y = 16 + s * rowH;
        buckets[l].push(`M${x.toFixed(2)} ${y.toFixed(2)}h${frameW.toFixed(2)}v${rowH.toFixed(2)}h-${frameW.toFixed(2)}z`);
      }
    }
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="The CTC forward trellis: alignment positions against time"
      >
        {buckets.map((b, l) =>
          b.length ? (
            <path key={l} d={b.join("")} fill={VIZ.teal} opacity={0.08 + (l / levels) * 0.92} />
          ) : null,
        )}
        <text
          x={PLOT_X0 - 6}
          y={24}
          textAnchor="end"
          fill={VIZ.text}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          {ext[0]}
        </text>
        <text
          x={PLOT_X0 - 6}
          y={16 + (S - 1) * rowH + 8}
          textAnchor="end"
          fill={VIZ.text}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          end
        </text>
        <text
          x={PLOT_X0}
          y={H - 6}
          fill={VIZ.axis}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          forward probability α(t, s) — {S} alignment positions × {post.length} frames, log scale
        </text>
      </svg>
    );
  };

  /** Ranked hypotheses with their relative probability. */
  const hypothesisStage = (list: Hypothesis[], title: string) => {
    const rows = list.slice(0, 6);
    const H = 34 + rows.length * 24;
    const best = rows[0]?.p ?? 1;
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`${title}: ranked transcripts with their probabilities`}
      >
        <text x={10} y={16} fill={VIZ.text} fontSize={9.5} fontFamily="ui-monospace, monospace">
          {title.toUpperCase()}
        </text>
        {rows.map((h, i) => {
          const y = 26 + i * 24;
          const correct = readable(h.text) === TARGET;
          const rel = h.p / best;
          return (
            <g key={h.text}>
              <rect x={10} y={y} width={rel * 210} height={18} fill={correct ? VIZ.teal : VIZ.orange} opacity={0.25} rx={2} />
              <text
                x={14}
                y={y + 13}
                fill={VIZ.text}
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {rel.toFixed(3)}
              </text>
              <text
                x={232}
                y={y + 13}
                fill={correct ? VIZ.teal : VIZ.textBright}
                fontSize={11.5}
                fontFamily="ui-monospace, monospace"
              >
                &ldquo;{readable(h.text)}&rdquo;
              </text>
              <text
                x={W - 10}
                y={y + 13}
                textAnchor="end"
                fill={VIZ.axis}
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                WER {werOf(h.text).wer.toFixed(3)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  /** Reference against hypothesis, word by word, with the edit operations. */
  const werStage = () => {
    const rows: { name: string; text: string; color: string }[] = [
      { name: "greedy", text: greedy.text, color: VIZ.rose },
      { name: "beam", text: beam[0]?.text ?? "", color: VIZ.orange },
      { name: "beam + lexicon", text: beamLM[0]?.text ?? "", color: VIZ.teal },
    ];
    const H = 46 + rows.length * 46;
    const colW = 88;
    const x0 = 128;
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Word-level alignment of each decoder's transcript against the reference"
      >
        {TARGET.split(" ").map((w, i) => (
          <text
            key={i}
            x={x0 + i * colW + colW / 2}
            y={16}
            textAnchor="middle"
            fill={VIZ.text}
            fontSize={11}
            fontFamily="ui-monospace, monospace"
          >
            {w}
          </text>
        ))}
        <text x={10} y={16} fill={VIZ.axis} fontSize={9.5} fontFamily="ui-monospace, monospace">
          REFERENCE
        </text>
        {rows.map((r, ri) => {
          const a = werOf(r.text);
          const y = 40 + ri * 46;
          let col = 0;
          return (
            <g key={r.name}>
              <text x={10} y={y + 14} fill={r.color} fontSize={10.5} fontFamily="ui-monospace, monospace">
                {r.name}
              </text>
              <text x={10} y={y + 30} fill={VIZ.axis} fontSize={9.5} fontFamily="ui-monospace, monospace">
                S{a.S} D{a.D} I{a.I} · {(a.wer * 100).toFixed(1)}%
              </text>
              {a.ops.map((op, oi) => {
                const x = x0 + col * colW;
                if (op.kind !== "ins") col += 1;
                const bad = op.kind !== "ok";
                return (
                  <g key={oi}>
                    <rect
                      x={x + 2}
                      y={y}
                      width={colW - 6}
                      height={22}
                      rx={3}
                      fill={bad ? VIZ.rose : VIZ.teal}
                      opacity={bad ? 0.22 : 0.12}
                    />
                    <text
                      x={x + colW / 2 - 1}
                      y={y + 15}
                      textAnchor="middle"
                      fill={bad ? VIZ.textBright : VIZ.text}
                      fontSize={10.5}
                      fontFamily="ui-monospace, monospace"
                    >
                      {op.hyp ?? "—"}
                    </text>
                    {bad && (
                      <text
                        x={x + colW / 2 - 1}
                        y={y + 33}
                        textAnchor="middle"
                        fill={VIZ.rose}
                        fontSize={8.5}
                        fontFamily="ui-monospace, monospace"
                      >
                        {op.kind}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  };

  const stage = (i: number) => {
    if (i === S_ALIGN) return posteriorStage(null);
    if (i === S_BLANK) return collapseStage();
    if (i === S_SUM)
      return (
        <>
          {trellisStage()}
          {posteriorStage(null)}
        </>
      );
    if (i === S_GREEDY)
      return (
        <>
          {posteriorStage(greedy.path)}
          {hypothesisStage([{ text: greedy.text, p: greedyProb }], "greedy output")}
        </>
      );
    if (i === S_BEAM)
      return (
        <>
          {hypothesisStage(beam, `beam search · width ${width}`)}
          {posteriorStage(greedy.path)}
        </>
      );
    if (i === S_LM)
      return (
        <>
          {hypothesisStage(beamLM, `beam + lexicon LM · width ${width}`)}
          {hypothesisStage(beam, `beam search alone · width ${width}`)}
        </>
      );
    return werStage();
  };

  const stageNote = () =>
    `${ARTICULATIONS.find((a) => a.id === articulation)?.note} · beam width ${width}`;

  /* --------------------------------------------------------------- panel */

  const exp = (v: number) => (v === 0 ? "0" : v.toExponential(2));

  const panel = (i: number) => (
    <>
      <div className="flex flex-wrap gap-2">
        <GuidedCard label="the utterance" accent={VIZ.teal}>
          <Num>{post.length}</Num> frames for <Num>{TARGET.length}</Num> characters — and{" "}
          <Num>{alignments.toExponential(1)}</Num> ways to line them up.
        </GuidedCard>

        {i >= S_SUM && (
          <GuidedCard label="forward DP" accent={VIZ.brand}>
            P(true text) = <Num>{exp(truthProb)}</Num>, summed over every alignment. On a 4-frame
            case the DP matches brute force to {check.maxErr.toExponential(0)} and all labellings sum
            to {check.total.toFixed(6)}.
          </GuidedCard>
        )}

        {i >= S_GREEDY && (
          <GuidedCard label="greedy" accent={VIZ.rose}>
            &ldquo;{readable(greedy.text)}&rdquo; — WER <Num>{wGreedy.wer.toFixed(3)}</Num>. Its own
            transcript scores {exp(greedyProb)}, below the truth&apos;s {exp(truthProb)}.
          </GuidedCard>
        )}

        {i >= S_BEAM && (
          <GuidedCard label="beam search" accent={VIZ.orange}>
            &ldquo;{readable(beam[0]?.text ?? "")}&rdquo; — WER <Num>{wBeam.wer.toFixed(3)}</Num>,
            scoring {exp(beamProb)}.
          </GuidedCard>
        )}

        {i >= S_LM && (
          <GuidedCard label="+ lexicon LM" accent={VIZ.teal}>
            &ldquo;{readable(beamLM[0]?.text ?? "")}&rdquo; — WER <Num>{wLM.wer.toFixed(3)}</Num>{" "}
            from a {LEXICON.length}-word lexicon and nothing else.
          </GuidedCard>
        )}
      </div>

      {i === S_BEAM && (
        <GuidedPayoff label="search error vs model error">
          {beamProb > truthProb ? (
            <>
              Beam search found a transcript the acoustic model likes{" "}
              <strong>{(beamProb / truthProb).toFixed(1)}×</strong> more than the correct one
              ({exp(beamProb)} against {exp(truthProb)}). The search is not failing — it is doing
              exactly its job and returning the model&apos;s favourite. What is left is a{" "}
              <strong>model error</strong>, and no amount of extra beam width will touch it.
            </>
          ) : (
            <>
              Here the correct transcript is already the model&apos;s favourite ({exp(truthProb)}{" "}
              against {exp(beamProb)} for the beam&apos;s pick), so any remaining gap is search, not
              modelling — widen the beam and it closes.
            </>
          )}
        </GuidedPayoff>
      )}

      {i === S_WER && (
        <GuidedPayoff label="what the single number hides">
          Greedy <strong>{(wGreedy.wer * 100).toFixed(1)}%</strong>, beam{" "}
          <strong>{(wBeam.wer * 100).toFixed(1)}%</strong>, beam + lexicon{" "}
          <strong>{(wLM.wer * 100).toFixed(1)}%</strong> — one unchanged acoustic model, three
          decoders.{" "}
          {wGreedy.wer === wLM.wer && wBeam.wer === wLM.wer
            ? "Here every decoder ties, which is the point of the articulation control: decoding effort buys nothing when the acoustics are already unambiguous, and the cheapest decoder is the right one."
            : wBeam.wer > wGreedy.wer
              ? "Note that beam search is doing worse than greedy here. It is not malfunctioning — it is faithfully returning the transcript this acoustic model most prefers, and on audio this degraded that transcript is further from the truth than the argmax path happened to be. Searching harder for the wrong objective finds a worse answer."
              : "Every point of that came from decoding, not from a better model — and the errors it removed had different causes, which WER alone would never tell you."}
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i === S_BLANK)
      return (
        <>
          <GuidedLegend color={VIZ.brand}>emitted character</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>blank</GuidedLegend>
        </>
      );
    if (i === S_SUM)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>forward probability α(t, s)</GuidedLegend>
          <GuidedLegend color={VIZ.brandLight}>per-frame posterior</GuidedLegend>
        </>
      );
    if (i === S_WER)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>word matches the reference</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>substitution, deletion or insertion</GuidedLegend>
        </>
      );
    return (
      <>
        <GuidedLegend color={VIZ.brandLight}>per-frame posterior</GuidedLegend>
        <GuidedLegend color={VIZ.rose}>barely-voiced frames</GuidedLegend>
        {i >= S_GREEDY && <GuidedLegend color={VIZ.orange}>the greedy path</GuidedLegend>}
      </>
    );
  };

  return (
    <GuidedViz
      className={className}
      title="From frames to Word Error Rate, step by step"
      caption="One utterance — 102 frames of character posteriors for six words — run through the whole CTC pipeline in the browser: the forward DP (checked against brute-force enumeration), greedy decoding, prefix beam search, and a lexicon language model, scored with a real Levenshtein alignment. Two characters are deliberately barely voiced, and the two errors that causes have completely different fixes. The articulation and beam-width controls re-run everything."
      phases={PHASES}
      steps={STEPS}
      controls={controls}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
    />
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-200">{children}</span>;
}
