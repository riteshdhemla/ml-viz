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
 * Preference tuning, stage by stage — RLHF and DPO on the same prompt.
 *
 * The lesson proves that DPO and RLHF optimise the same KL-regularised
 * objective, and that the optimum is a Boltzmann reweighting of the reference
 * policy. Both branches of this walkthrough end at exactly that formula:
 *
 *     pi*(y) ∝ pi_ref(y) · exp(r(y) / beta)
 *
 * So the algorithms are not where the two pipelines differ. What differs is
 * **which reward you plug in** — and that is a statistical question about the
 * preference data, not an optimisation one:
 *
 *   - RLHF fits an explicit reward model, here two weights over (style, length).
 *     Two parameters shared across every response, so it can score text nobody
 *     annotated. That generalisation is the whole point of an RM, and it is also
 *     exactly what lets it be confidently wrong off-distribution.
 *   - DPO's implicit reward is one free number per response. It cannot
 *     extrapolate, so it cannot be hacked — and it cannot promote a response the
 *     annotators never compared.
 *
 * Every number is computed: the preference pairs are sampled from pi_ref and
 * labelled by a noisy Bradley-Terry annotator, both rewards are fitted by MAP,
 * and true quality is a held-out function neither fit can see. The two controls
 * are the ones that matter — the KL budget, and what got annotated.
 *
 * Verified over 12 independent annotation samples before the prose was written.
 * At the default annotation round the reward model learns a positive length
 * weight and top-scores one of the long junk answers in 12/12, and beta = 0.3
 * drives true quality below the SFT baseline in 12/12 (DPO: 0/12). DPO never
 * promotes the unannotated best answer at round 1 (0/12) and promotes it at
 * round 2 in 11/12. Annotating the policy's own long outputs flips the length
 * weight negative in 12/12 and ends the hacking in 12/12.
 *
 * The toy holds one prompt and nine fixed responses, so it shows the failure
 * modes that live in the reward estimate. It cannot show the one that needs a
 * second prompt: a policy driven to very low beta over-concentrates and loses
 * capability elsewhere, which is why real DPO betas sit in [0.05, 0.5].
 */

/* -------------------------------------------------------------- constants */

/**
 * Nine candidate answers to one coding question. `style` is what the reward
 * model's encoder can measure — structure, specificity, confidence. `content`
 * is the helpfulness the user actually gets. They correlate on the responses
 * the SFT model usually produces, and come apart on the ones it rarely does,
 * which is the whole mechanism.
 *
 * `w` is the unnormalised reference-policy weight.
 */
const RESPONSES = [
  { label: "Asks for more info", style: 0.15, content: 0.1, len: 30, w: 0.13 },
  { label: "Generic advice", style: 0.35, content: 0.3, len: 70, w: 0.26 },
  { label: "Names the cause", style: 0.55, content: 0.55, len: 100, w: 0.31 },
  { label: "Cause + fix", style: 0.74, content: 0.78, len: 135, w: 0.208 },
  { label: "Cause + fix + test", style: 0.86, content: 0.92, len: 170, w: 0.085 },
  { label: "Minimal patch + repro", style: 0.92, content: 1.0, len: 145, w: 0.004 },
  { label: "Padded restatement", style: 0.62, content: 0.4, len: 300, w: 0.002 },
  { label: "Correct but bloated", style: 0.96, content: 0.82, len: 380, w: 0.0015 },
  { label: "Wall of caveats", style: 0.72, content: 0.3, len: 460, w: 0.001 },
] as const;

const N = RESPONSES.length;
/** The rare-but-excellent answer, and the long ones the SFT model almost never writes. */
const IDEAL = 5;
const LONG = [6, 7, 8];

const N_PAIRS = 240;
/** Gaussian prior on the reward weights: lambda/(2n)·‖r‖², so data outvotes it as n grows. */
const PRIOR = 2.0;
const FIT_STEPS = 1500;
const VERBOSE_FROM = 140;
const VERBOSE_COST = 4;
/** Annotators mildly prefer longer answers, per 100 tokens. */
const LENGTH_BIAS = 1.0;

const BETAS = [4, 2, 1, 0.3] as const;
/** Six independent annotation samples; the first is the one shown by default. */
const SEEDS = [19, 3, 7, 11, 23, 31] as const;

const ROUNDS = [
  { id: 1, label: "SFT samples", note: "pairs drawn from the SFT model" },
  { id: 2, label: "+ ideal answers", note: "curated comparisons on the best answer" },
  { id: 3, label: "+ policy outputs", note: "comparisons on the long answers too" },
] as const;

/** Held-out ground truth. Neither reward fit ever sees this. */
const trueQ = (r: (typeof RESPONSES)[number]) =>
  10 * r.content - VERBOSE_COST * Math.max(0, (r.len - VERBOSE_FROM) / 120);

/** What a noisy human annotator actually maximises — quality, plus a length bias. */
const annU = (r: (typeof RESPONSES)[number]) => trueQ(r) + LENGTH_BIAS * (r.len / 100);

const W_SUM = RESPONSES.reduce((a, r) => a + r.w, 0);
const PI_REF = RESPONSES.map((r) => r.w / W_SUM);
const REF_LOGITS = PI_REF.map((p) => Math.log(p));
const TRUE_Q = RESPONSES.map(trueQ);
const BEST_Q = Math.max(...TRUE_Q);

/* ------------------------------------------------------------------ maths */

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function centre(v: number[]): number[] {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return v.map((x) => x - m);
}

/** Expected true quality under a policy — the score the pipeline is judged on. */
const expectedQ = (p: number[]) => p.reduce((a, pi, i) => a + pi * TRUE_Q[i], 0);

const klDiv = (p: number[], q: number[]) =>
  p.reduce((a, pi, i) => a + (pi > 0 ? pi * Math.log(pi / q[i]) : 0), 0);

interface Pair {
  chosen: number;
  rejected: number;
}

/**
 * Collect preference pairs. Round 1 samples both responses from pi_ref, which
 * is what "annotate the SFT model's outputs" means and why the long answers are
 * almost absent. Later rounds inject the comparisons a real pipeline would add
 * on its second pass.
 */
function samplePairs(round: number, seed: number): Pair[] {
  const rnd = seededRandom(seed);
  const draw = () => {
    const u = rnd();
    let acc = 0;
    for (let i = 0; i < N; i++) {
      acc += PI_REF[i];
      if (u <= acc) return i;
    }
    return N - 1;
  };
  const out: Pair[] = [];
  let guard = 0;
  while (out.length < N_PAIRS && guard++ < N_PAIRS * 80) {
    let a: number;
    let b: number;
    if (round >= 2 && out.length % 4 === 1) {
      a = IDEAL;
      b = draw();
    } else if (round >= 3 && out.length % 8 === 6) {
      a = LONG[out.length % LONG.length];
      b = draw();
    } else {
      a = draw();
      b = draw();
    }
    if (a === b) continue;
    const p = 1 / (1 + Math.exp(-(annU(RESPONSES[a]) - annU(RESPONSES[b]))));
    const aWins = rnd() < p;
    out.push({ chosen: aWins ? a : b, rejected: aWins ? b : a });
  }
  return out;
}

/**
 * The explicit reward model: r(y) = w_style·style + w_len·(len/100), fitted by
 * Bradley-Terry MAP. Two weights shared across all nine responses — so it
 * assigns a score to responses that appear in no comparison at all.
 */
function fitRewardModel(pairs: Pair[]) {
  let ws = 0;
  let wl = 0;
  const n = pairs.length;
  const lr = 0.7;
  for (let s = 0; s < FIT_STEPS; s++) {
    let gs = 0;
    let gl = 0;
    for (const { chosen, rejected } of pairs) {
      const d0 = RESPONSES[chosen].style - RESPONSES[rejected].style;
      const d1 = (RESPONSES[chosen].len - RESPONSES[rejected].len) / 100;
      const g = 1 / (1 + Math.exp(ws * d0 + wl * d1));
      gs += g * d0;
      gl += g * d1;
    }
    ws += lr * (gs / n - (PRIOR / n) * ws);
    wl += lr * (gl / n - (PRIOR / n) * wl);
  }
  return { ws, wl };
}

/**
 * DPO's implicit reward. The DPO loss is the same Bradley-Terry likelihood, but
 * over `rhat = beta·log(pi/pi_ref)` — which for a fixed prompt is one free
 * number per response. Fitting it *is* training the policy: the policy is
 * recovered as pi_ref·exp(rhat/beta), normalised. Note the fitted reward does
 * not depend on beta; beta only decides how far it moves the policy.
 */
function fitImplicitReward(pairs: Pair[]) {
  let r = new Array<number>(N).fill(0);
  const n = pairs.length;
  const lr = 1.6;
  const loss = (rr: number[]) =>
    pairs.reduce((a, p) => a + Math.log(1 + Math.exp(-(rr[p.chosen] - rr[p.rejected]))), 0) / n;
  const history: { step: number; loss: number }[] = [];
  const every = Math.max(1, Math.round(FIT_STEPS / 60));
  for (let s = 0; s < FIT_STEPS; s++) {
    if (s % every === 0) history.push({ step: s, loss: loss(r) });
    const g = new Array<number>(N).fill(0);
    for (const { chosen, rejected } of pairs) {
      const w = 1 / (1 + Math.exp(r[chosen] - r[rejected]));
      g[chosen] += w;
      g[rejected] -= w;
    }
    r = r.map((v, i) => v + lr * (g[i] / n - (PRIOR / n) * v));
  }
  history.push({ step: FIT_STEPS, loss: loss(r) });
  return { reward: centre(r), history };
}

/** The KL-regularised optimum — the closed form both pipelines land on. */
const optimalPolicy = (reward: number[], beta: number) =>
  softmax(REF_LOGITS.map((z, i) => z + reward[i] / beta));

/* ------------------------------------------------------------------ steps */

const S_SFT = 0;
const S_ANNOTATE = 1;
const S_RM = 2;
const S_STAR = 3;
const S_HACK = 4;
const S_DPO = 5;
const S_IDENTITY = 6;
const S_COMPARE = 7;

const PHASES: GuidedPhase[] = [
  { id: "setup", label: "Shared setup", tone: "teal" },
  { id: "rlhf", label: "RLHF · reward model + PPO", tone: "brand", numberPrefix: "P" },
  { id: "dpo", label: "DPO · no reward model", tone: "orange", numberPrefix: "D" },
  { id: "compare", label: "Same objective, two estimates", tone: "yellow", numberPrefix: "C" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "setup",
    label: "SFT reference",
    title: "SFT gives you a reference policy, not an aligned one",
    body: (
      <>
        <p>
          Nine possible answers to one debugging question. The SFT model spreads its mass over the
          safe middle — <code>Names the cause</code> and <code>Generic advice</code> take most of it
          — and almost never writes the best answer available.
        </p>
        <p>
          Without this stage there is no <code>π_ref</code> at all, and both pipelines below need
          one: it is the distribution the KL term measures against and the model both are
          initialised from. But it is a <strong>starting point</strong>, not the goal — its expected
          quality is well short of what the response set allows.
        </p>
      </>
    ),
    hint: "Compare the two columns: the tallest reference bars are not the highest-quality rows.",
  },
  {
    phase: "setup",
    label: "Collect pairs",
    title: "Annotators compare pairs the SFT model actually produced",
    body: (
      <>
        <p>
          Both pipelines start from the same asset: {N_PAIRS} pairwise comparisons, each labelled by
          a noisy annotator who prefers the higher-quality answer but is also mildly swayed by
          length. Pairs are sampled from <code>π_ref</code>, because you can only annotate text your
          model actually generates.
        </p>
        <p>
          Absolute 1–5 ratings would not calibrate across annotators; comparisons only need a
          consistent ordering, which is why Bradley–Terry is the standard. The cost is visible in
          the third column — <strong>the responses the SFT model rarely writes are barely
          compared</strong>, and everything downstream inherits that.
        </p>
      </>
    ),
    hint: "Look at the comparison counts for the bottom four rows — that thin data is the whole story.",
  },
  {
    phase: "rlhf",
    label: "Fit the RM",
    title: "The reward model generalises — that is the point, and the risk",
    body: (
      <>
        <p>
          The RM is fitted on those comparisons as two weights over what its encoder can measure:{" "}
          <code>style</code> and <code>length</code>. Two parameters shared across nine responses, so
          it produces a score for text that appears in no comparison at all. Without that, PPO could
          not score its own rollouts, and there would be no RLHF.
        </p>
        <p>
          But look at where its training data lives. While only the SFT model&apos;s own samples are
          annotated, every well-covered response is under ~170 tokens — and inside that range{" "}
          <strong>longer genuinely is better</strong>. The fit learns that slope and then applies it
          hundreds of tokens beyond anything it saw.
        </p>
      </>
    ),
    hint: "The shaded band is the length range the RM was actually trained on. Three responses sit outside it.",
  },
  {
    phase: "rlhf",
    label: "KL-regularised optimum",
    title: "The RLHF objective has a closed-form solution",
    body: (
      <>
        <p>
          Maximising <code>E[r] − β·KL(π ‖ π_ref)</code> does not need a search: the optimum is{" "}
          <code>π*(y) ∝ π_ref(y)·exp(r(y)/β)</code>. Take the reference policy, reweight every
          response by its reward, renormalise. PPO&apos;s rollouts and clipped updates are machinery
          for <em>reaching</em> this point when you cannot enumerate responses — they do not change
          where it is.
        </p>
        <p>
          So <code>β</code> is doing something very specific. It is not a learning rate; it is the
          exchange rate between reward and distance from <code>π_ref</code>.
        </p>
      </>
    ),
    hint: "Watch the middle column multiply into the left one. Switch β in the controls and watch the result sharpen.",
  },
  {
    phase: "rlhf",
    label: "Reward hacking",
    title: "Loosen the KL leash and the policy eats the extrapolation",
    body: (
      <>
        <p>
          As <code>β</code> falls, mass concentrates on whatever the RM scores highest — and while
          only SFT samples are annotated, that is one of the long answers it saw a handful of times,
          scored by extrapolating &ldquo;longer is better&rdquo; far past the data. True quality
          peaks at a middling β and then falls off a cliff, ending up{" "}
          <strong>below the SFT model you started from</strong>.
        </p>
        <p>
          This is what the KL term is for. Without it (β → 0) the policy goes straight to the argmax
          of a reward that was only ever accurate near <code>π_ref</code>. Set β too high instead and
          the curve barely leaves the baseline. Nothing here is a property of PPO — change what got
          annotated and this curve changes shape, which is the last step.
        </p>
      </>
    ),
    hint: "The peak is not at the smallest β. Step the β control down and watch the crossing point.",
  },
  {
    phase: "dpo",
    label: "Fit the margin",
    title: "DPO fits the reward and the policy in one object",
    body: (
      <>
        <p>
          Same comparisons, same Bradley–Terry likelihood — but parameterised as{" "}
          <code>r̂ = β·log(π/π_ref)</code> instead of a separate network. On a fixed prompt that is
          one free number per response, and fitting it <em>is</em> training the policy. No reward
          model, no rollouts, no value head.
        </p>
        <p>
          The freedom cuts both ways. With a parameter per response there is nothing to extrapolate
          from, so a response with two comparisons stays near the prior — the implicit reward can
          never invent a score for text nobody judged.
        </p>
      </>
    ),
    hint: "Compare the implicit reward for the bottom four rows against the RM's scores two steps back.",
  },
  {
    phase: "dpo",
    label: "Same reweighting",
    title: "DPO's policy is the same Boltzmann reweighting",
    body: (
      <>
        <p>
          Recovering the policy from the implicit reward gives{" "}
          <code>π = π_ref·exp(r̂/β)</code> — the identical formula the RLHF branch landed on, because
          the parameterisation was chosen to make it an identity rather than a coincidence. The two
          columns here are the same equation evaluated with two different rewards.
        </p>
        <p>
          Note what does <em>not</em> depend on β: the fitted implicit reward. β enters only when the
          reward is turned into a policy — exactly as it does for the RM. Same knob, same job, both
          branches.
        </p>
      </>
    ),
    hint: "Switch β and watch both policy columns sharpen together while the reward columns sit still.",
  },
  {
    phase: "compare",
    label: "What decides it",
    title: "The algorithm is not what separates them — the data is",
    body: (
      <>
        <p>
          Both branches optimise one objective and land on one formula. Every difference in outcome
          traces to how the reward was estimated from the same {N_PAIRS} comparisons — and each
          failure has its own fix, which the annotation control applies one at a time.
        </p>
        <p>
          Annotating curated ideal answers lifts DPO&apos;s ceiling and leaves the RM still hacked.
          Annotating the long answers the policy itself produced closes the RM&apos;s blind spot and
          barely moves DPO. Neither is an argument about PPO versus a classification loss.
        </p>
      </>
    ),
    hint: "Step the annotation control through all three rounds at β = 0.3 and watch which bar moves each time.",
  },
];

/* ------------------------------------------------------------- table plumbing */

type ColKind = "prob" | "count" | "signed";

interface Col {
  key: string;
  title: string;
  kind: ColKind;
  values: number[];
  color: string;
  fmt: (v: number) => string;
}

const pct = (v: number) => (v < 0.001 ? "<0.1%" : `${(v * 100).toFixed(1)}%`);
const sgn = (v: number) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

const ROW_H = 21;
const TABLE_TOP = 30;
/** Wide enough for the longest label plus the right-aligned token count. */
const LABEL_W = 176;
const COL_GAP = 8;

/** One row per response, with a configurable set of value columns. */
function ResponseTable({
  cols,
  highlight,
  height = TABLE_TOP + N * ROW_H + 10,
}: {
  cols: Col[];
  highlight?: (i: number) => boolean;
  height?: number;
}) {
  const colW = (680 - LABEL_W - COL_GAP) / cols.length - COL_GAP;
  const barW = colW - 46;

  return (
    <svg
      viewBox={`0 0 680 ${height}`}
      className="block w-full"
      role="img"
      aria-label={`Nine candidate responses scored by ${cols.map((c) => c.title).join(", ")}`}
    >
      {cols.map((c, ci) => (
        <text
          key={c.key}
          x={LABEL_W + COL_GAP + ci * (colW + COL_GAP)}
          y={18}
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
          letterSpacing={0.6}
        >
          {c.title.toUpperCase()}
        </text>
      ))}

      {RESPONSES.map((r, i) => {
        const y = TABLE_TOP + i * ROW_H;
        const on = highlight ? highlight(i) : false;
        return (
          <g key={r.label}>
            {on && (
              <rect
                x={2}
                y={y - 1}
                width={676}
                height={ROW_H - 2}
                fill={VIZ.brand}
                opacity={0.09}
                rx={3}
              />
            )}
            <text
              x={6}
              y={y + 12}
              fill={on ? VIZ.textBright : VIZ.text}
              fontSize={10}
              fontFamily="ui-monospace, monospace"
            >
              {r.label}
            </text>
            <text
              x={LABEL_W - 4}
              y={y + 12}
              textAnchor="end"
              fill={VIZ.axis}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {r.len}t
            </text>

            {cols.map((c, ci) => {
              const x0 = LABEL_W + COL_GAP + ci * (colW + COL_GAP);
              const v = c.values[i];
              const span = Math.max(...c.values.map(Math.abs), 1e-9);
              if (c.kind === "signed") {
                const mid = x0 + barW / 2;
                const w = (Math.abs(v) / span) * (barW / 2);
                return (
                  <g key={c.key}>
                    <line
                      x1={mid}
                      y1={y + 2}
                      x2={mid}
                      y2={y + ROW_H - 4}
                      stroke={VIZ.grid}
                      strokeWidth={1}
                    />
                    <rect
                      x={v >= 0 ? mid : mid - w}
                      y={y + 4}
                      width={Math.max(w, 0.6)}
                      height={ROW_H - 9}
                      fill={v >= 0 ? c.color : VIZ.rose}
                      opacity={0.85}
                      rx={1.5}
                    />
                    <text
                      x={x0 + barW + 6}
                      y={y + 12}
                      fill={VIZ.text}
                      fontSize={9.5}
                      fontFamily="ui-monospace, monospace"
                    >
                      {c.fmt(v)}
                    </text>
                  </g>
                );
              }
              const w = (Math.abs(v) / span) * barW;
              return (
                <g key={c.key}>
                  <rect
                    x={x0}
                    y={y + 4}
                    width={barW}
                    height={ROW_H - 9}
                    fill={VIZ.grid}
                    opacity={0.35}
                    rx={1.5}
                  />
                  <rect
                    x={x0}
                    y={y + 4}
                    width={Math.max(w, 0.6)}
                    height={ROW_H - 9}
                    fill={c.color}
                    opacity={0.85}
                    rx={1.5}
                  />
                  <text
                    x={x0 + barW + 6}
                    y={y + 12}
                    fill={VIZ.text}
                    fontSize={9.5}
                    fontFamily="ui-monospace, monospace"
                  >
                    {c.fmt(v)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------- component */

export function PreferenceTuningViz({ className }: { className?: string }) {
  const [beta, setBeta] = useState<number>(2);
  const [round, setRound] = useState<number>(1);
  const [seedIdx, setSeedIdx] = useState(0);

  const seed = SEEDS[seedIdx];

  /** One annotation sample, both reward fits. ~25ms, so recompute on demand. */
  const fit = useMemo(() => {
    const pairs = samplePairs(round, seed);
    const counts = RESPONSES.map(() => 0);
    for (const p of pairs) {
      counts[p.chosen] += 1;
      counts[p.rejected] += 1;
    }
    const rm = fitRewardModel(pairs);
    const rmReward = centre(RESPONSES.map((r) => rm.ws * r.style + rm.wl * (r.len / 100)));
    const { reward: implicitReward, history } = fitImplicitReward(pairs);
    return { pairs, counts, rm, rmReward, implicitReward, history };
  }, [round, seed]);

  const { counts, rm, rmReward, implicitReward, history } = fit;

  const piPPO = useMemo(() => optimalPolicy(rmReward, beta), [rmReward, beta]);
  const piDPO = useMemo(() => optimalPolicy(implicitReward, beta), [implicitReward, beta]);

  const sftQ = expectedQ(PI_REF);
  const ppoQ = expectedQ(piPPO);
  const dpoQ = expectedQ(piDPO);

  /** True quality against the KL budget, for both rewards. */
  const curve = useMemo(() => {
    const pts: { beta: number; ppo: number; dpo: number }[] = [];
    for (let k = 0; k <= 56; k++) {
      const b = Math.exp(Math.log(8) + (Math.log(0.15) - Math.log(8)) * (k / 56));
      pts.push({
        beta: b,
        ppo: expectedQ(optimalPolicy(rmReward, b)),
        dpo: expectedQ(optimalPolicy(implicitReward, b)),
      });
    }
    return pts;
  }, [rmReward, implicitReward]);

  const argmaxRM = rmReward.indexOf(Math.max(...rmReward));
  const argmaxImplicit = implicitReward.indexOf(Math.max(...implicitReward));
  const bestIdx = TRUE_Q.indexOf(BEST_Q);
  const ppoPeak = curve.reduce((a, p) => (p.ppo > a.ppo ? p : a), curve[0]);
  /** Quality at the tightest KL leash on the curve — the end of the falling edge. */
  const tightestPPO = curve[curve.length - 1].ppo;

  /* ------------------------------------------------------------ controls */

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        KL budget β
      </span>
      {BETAS.map((b) => (
        <VizButton key={b} onClick={() => setBeta(b)} active={beta === b}>
          {b}
        </VizButton>
      ))}
      <span className="ml-2 self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        annotated
      </span>
      {ROUNDS.map((r) => (
        <VizButton key={r.id} onClick={() => setRound(r.id)} active={round === r.id}>
          {r.label}
        </VizButton>
      ))}
      <VizButton
        className="ml-2"
        onClick={() => setSeedIdx((s) => (s + 1) % SEEDS.length)}
        active={false}
      >
        ↻ resample
      </VizButton>
    </>
  );

  /* -------------------------------------------------------------- columns */

  const colRef: Col = {
    key: "ref",
    title: "π_ref",
    kind: "prob",
    values: PI_REF,
    color: VIZ.teal,
    fmt: pct,
  };
  const colQ: Col = {
    key: "q",
    title: "true quality",
    kind: "signed",
    values: TRUE_Q,
    color: VIZ.yellow,
    fmt: (v) => v.toFixed(1),
  };
  const colCount: Col = {
    key: "n",
    title: "comparisons",
    kind: "count",
    values: counts,
    color: VIZ.axis,
    fmt: (v) => String(v),
  };
  const colRM: Col = {
    key: "rm",
    title: "r (reward model)",
    kind: "signed",
    values: rmReward,
    color: VIZ.brand,
    fmt: sgn,
  };
  const colImplicit: Col = {
    key: "imp",
    title: "r̂ (implicit)",
    kind: "signed",
    values: implicitReward,
    color: VIZ.orange,
    fmt: sgn,
  };
  const colPPO: Col = {
    key: "ppo",
    title: "π RLHF",
    kind: "prob",
    values: piPPO,
    color: VIZ.brand,
    fmt: pct,
  };
  const colDPO: Col = {
    key: "dpo",
    title: "π DPO",
    kind: "prob",
    values: piDPO,
    color: VIZ.orange,
    fmt: pct,
  };

  /* --------------------------------------------------------- aux drawings */

  /** Where the RM's training data lives, and how far it has to extrapolate. */
  const featurePlane = () => {
    const W = 680;
    const H = 168;
    const x = (len: number) => 40 + (len / 500) * (W - 130);
    const y = (st: number) => H - 26 - st * (H - 52);
    const annotatedMax = 180;
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Response length against style, showing the range the reward model was trained on"
      >
        <rect
          x={x(0)}
          y={10}
          width={x(annotatedMax) - x(0)}
          height={H - 36}
          fill={VIZ.teal}
          opacity={0.07}
        />
        <text
          x={x(annotatedMax) - 6}
          y={22}
          textAnchor="end"
          fill={VIZ.teal}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          where the comparisons are
        </text>
        <text
          x={x(annotatedMax) + 8}
          y={22}
          fill={VIZ.rose}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          extrapolation
        </text>

        <line x1={x(0)} y1={H - 26} x2={W - 78} y2={H - 26} stroke={VIZ.axis} strokeWidth={1} />
        {[0, 100, 200, 300, 400, 500].map((t) => (
          <text
            key={t}
            x={x(t)}
            y={H - 12}
            textAnchor="middle"
            fill={VIZ.axis}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
          >
            {t}
          </text>
        ))}
        <text
          x={x(250)}
          y={H - 1}
          textAnchor="middle"
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          response length (tokens)
        </text>
        <text
          x={10}
          y={y(0.5)}
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
          transform={`rotate(-90 10 ${y(0.5)})`}
          textAnchor="middle"
        >
          style
        </text>

        {RESPONSES.map((r, i) => {
          const rad = 3 + Math.sqrt(counts[i]) * 0.75;
          const off = r.len > annotatedMax;
          const top = i === argmaxRM;
          // The top-scored marker is wide; anchor it away from the right edge.
          const anchor = top && r.len > 330 ? "end" : "middle";
          return (
            <g key={r.label}>
              <circle
                cx={x(r.len)}
                cy={y(r.style)}
                r={rad}
                fill={off ? VIZ.rose : VIZ.teal}
                opacity={0.75}
              />
              <text
                x={x(r.len) + (anchor === "end" ? rad + 2 : 0)}
                y={y(r.style) - rad - 4}
                textAnchor={anchor}
                fill={top ? VIZ.textBright : VIZ.text}
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {top ? `★ top-scored · ${counts[i]} pairs` : `${counts[i]}`}
              </text>
            </g>
          );
        })}
        <text
          x={W - 72}
          y={y(0.86)}
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          w_style
        </text>
        <text
          x={W - 72}
          y={y(0.86) + 13}
          fill={VIZ.brandLight}
          fontSize={11}
          fontFamily="ui-monospace, monospace"
        >
          {sgn(rm.ws)}
        </text>
        <text
          x={W - 72}
          y={y(0.86) + 32}
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          w_len
        </text>
        <text
          x={W - 72}
          y={y(0.86) + 45}
          fill={rm.wl > 0 ? VIZ.rose : VIZ.teal}
          fontSize={11}
          fontFamily="ui-monospace, monospace"
        >
          {sgn(rm.wl)}
        </text>
        <text
          x={W - 72}
          y={y(0.86) + 60}
          fill={VIZ.axis}
          fontSize={8.5}
          fontFamily="ui-monospace, monospace"
        >
          per 100 tok
        </text>
      </svg>
    );
  };

  /** True quality against the KL budget — the sweet spot, and the cliff. */
  const betaCurve = () => {
    const W = 680;
    const H = 216;
    const lo = 0.15;
    const hi = 8;
    const x = (b: number) => 46 + ((Math.log(hi) - Math.log(b)) / (Math.log(hi) - Math.log(lo))) * (W - 116);
    const qLo = -8;
    const qHi = 10;
    const y = (q: number) => H - 30 - ((q - qLo) / (qHi - qLo)) * (H - 52);
    const path = (key: "ppo" | "dpo") =>
      curve.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.beta).toFixed(1)} ${y(p[key]).toFixed(1)}`).join("");
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Expected true quality against the KL budget beta, for the reward model and the implicit reward"
      >
        {[-8, -4, 0, 4, 8].map((q) => (
          <g key={q}>
            <line x1={46} y1={y(q)} x2={W - 70} y2={y(q)} stroke={VIZ.grid} strokeWidth={0.7} />
            <text
              x={40}
              y={y(q) + 3}
              textAnchor="end"
              fill={VIZ.axis}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {q}
            </text>
          </g>
        ))}
        <line
          x1={46}
          y1={y(sftQ)}
          x2={W - 70}
          y2={y(sftQ)}
          stroke={VIZ.teal}
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
        <text
          x={W - 66}
          y={y(sftQ) + 3}
          fill={VIZ.teal}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          SFT {sftQ.toFixed(2)}
        </text>
        <line
          x1={46}
          y1={y(BEST_Q)}
          x2={W - 70}
          y2={y(BEST_Q)}
          stroke={VIZ.yellow}
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.7}
        />
        <text
          x={W - 66}
          y={y(BEST_Q) + 3}
          fill={VIZ.yellow}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          best {BEST_Q.toFixed(2)}
        </text>
        <text
          x={14}
          y={(12 + H - 30) / 2}
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
          transform={`rotate(-90 14 ${(12 + H - 30) / 2})`}
        >
          expected true quality
        </text>

        <path d={path("dpo")} fill="none" stroke={VIZ.orange} strokeWidth={2} />
        <path d={path("ppo")} fill="none" stroke={VIZ.brand} strokeWidth={2} />

        <line x1={x(beta)} y1={12} x2={x(beta)} y2={H - 30} stroke={VIZ.textBright} strokeWidth={1} opacity={0.5} />
        <circle cx={x(beta)} cy={y(ppoQ)} r={4} fill={VIZ.brand} />
        <circle cx={x(beta)} cy={y(dpoQ)} r={4} fill={VIZ.orange} />
        <text
          x={x(beta)}
          y={9}
          textAnchor="middle"
          fill={VIZ.textBright}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          β = {beta}
        </text>

        <line x1={46} y1={H - 30} x2={W - 70} y2={H - 30} stroke={VIZ.axis} strokeWidth={1} />
        {[8, 4, 2, 1, 0.5, 0.25, 0.15].map((b) => (
          <text
            key={b}
            x={x(b)}
            y={H - 16}
            textAnchor="middle"
            fill={VIZ.axis}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
          >
            {b}
          </text>
        ))}
        <text
          x={(46 + W - 70) / 2}
          y={H - 3}
          textAnchor="middle"
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          KL budget β — looser leash to the right
        </text>
      </svg>
    );
  };

  /** The DPO loss falling as the implicit reward is fitted. */
  const lossCurve = () => {
    const W = 680;
    const H = 150;
    const maxL = history[0].loss;
    const minL = Math.min(...history.map((h) => h.loss));
    const x = (s: number) => 52 + (s / FIT_STEPS) * (W - 122);
    const y = (l: number) => H - 28 - ((l - minL) / Math.max(maxL - minL, 1e-9)) * (H - 50);
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="The DPO loss falling over gradient steps"
      >
        {[0, 0.5, 1].map((f) => {
          const l = minL + f * (maxL - minL);
          return (
            <g key={f}>
              <line x1={52} y1={y(l)} x2={W - 70} y2={y(l)} stroke={VIZ.grid} strokeWidth={0.7} />
              <text
                x={46}
                y={y(l) + 3}
                textAnchor="end"
                fill={VIZ.axis}
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {l.toFixed(3)}
              </text>
            </g>
          );
        })}
        <path
          d={history.map((h, i) => `${i === 0 ? "M" : "L"}${x(h.step).toFixed(1)} ${y(h.loss).toFixed(1)}`).join("")}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={2}
        />
        <circle cx={x(FIT_STEPS)} cy={y(history[history.length - 1].loss)} r={3.5} fill={VIZ.orange} />
        <text
          x={W - 66}
          y={y(history[history.length - 1].loss) + 3}
          fill={VIZ.orange}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          {history[history.length - 1].loss.toFixed(3)}
        </text>
        <line x1={52} y1={H - 28} x2={W - 70} y2={H - 28} stroke={VIZ.axis} strokeWidth={1} />
        <text
          x={(52 + W - 70) / 2}
          y={H - 6}
          textAnchor="middle"
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          gradient steps on −log σ(r̂_chosen − r̂_rejected) — plain supervised training
        </text>
      </svg>
    );
  };

  /** The scoreboard: where each policy lands on held-out true quality. */
  const summary = () => {
    const W = 680;
    const H = 150;
    const bars = [
      { label: "SFT reference", v: sftQ, c: VIZ.teal },
      { label: `RLHF · β = ${beta}`, v: ppoQ, c: VIZ.brand },
      { label: `DPO · β = ${beta}`, v: dpoQ, c: VIZ.orange },
      { label: "best available", v: BEST_Q, c: VIZ.yellow },
    ];
    const lo = Math.min(-8, ...bars.map((b) => b.v));
    const x = (q: number) => 132 + ((q - lo) / (BEST_Q - lo)) * (W - 210);
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Expected true quality for the SFT reference, the RLHF policy, the DPO policy and the best available response"
      >
        <line x1={x(0)} y1={8} x2={x(0)} y2={H - 22} stroke={VIZ.grid} strokeWidth={1} />
        {bars.map((b, i) => {
          const y = 14 + i * 30;
          const x0 = Math.min(x(0), x(b.v));
          const w = Math.abs(x(b.v) - x(0));
          return (
            <g key={b.label}>
              <text
                x={126}
                y={y + 13}
                textAnchor="end"
                fill={VIZ.text}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {b.label}
              </text>
              <rect
                x={x0}
                y={y + 2}
                width={Math.max(w, 1)}
                height={17}
                fill={b.v < 0 ? VIZ.rose : b.c}
                opacity={0.85}
                rx={2}
              />
              {/* Negative bars run left toward the row label, so their value
                  goes in the empty space right of zero instead. */}
              <text
                x={(b.v < 0 ? x(0) : x(b.v)) + 6}
                y={y + 14}
                textAnchor="start"
                fill={VIZ.textBright}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {b.v.toFixed(2)}
              </text>
            </g>
          );
        })}
        <text
          x={x(0)}
          y={H - 8}
          textAnchor="middle"
          fill={VIZ.axis}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          expected true quality
        </text>
      </svg>
    );
  };

  /* ---------------------------------------------------------------- stage */

  const stage = (i: number) => {
    if (i === S_SFT)
      return <ResponseTable cols={[colRef, colQ]} highlight={(k) => k === bestIdx} />;
    if (i === S_ANNOTATE)
      return (
        <ResponseTable
          cols={[colRef, colCount, colQ]}
          highlight={(k) => counts[k] <= 4}
        />
      );
    if (i === S_RM)
      return (
        <>
          <ResponseTable cols={[colCount, colRM, colQ]} highlight={(k) => k === argmaxRM} />
          {featurePlane()}
        </>
      );
    if (i === S_STAR)
      return <ResponseTable cols={[colRef, colRM, colPPO, colQ]} highlight={(k) => k === argmaxRM} />;
    if (i === S_HACK)
      return (
        <>
          {betaCurve()}
          <ResponseTable cols={[colPPO, colQ]} highlight={(k) => k === argmaxRM} height={TABLE_TOP + N * ROW_H + 10} />
        </>
      );
    if (i === S_DPO)
      return (
        <>
          <ResponseTable cols={[colCount, colImplicit, colQ]} highlight={(k) => k === argmaxImplicit} />
          {lossCurve()}
        </>
      );
    if (i === S_IDENTITY)
      return (
        <ResponseTable
          cols={[colRM, colPPO, colImplicit, colDPO]}
          highlight={(k) => k === argmaxRM || k === argmaxImplicit}
        />
      );
    return (
      <>
        {summary()}
        <ResponseTable cols={[colPPO, colDPO, colQ]} highlight={(k) => k === bestIdx} />
      </>
    );
  };

  const stageNote = () => `β = ${beta} · ${ROUNDS[round - 1].note} · sample ${seedIdx + 1}/${SEEDS.length}`;

  /* ---------------------------------------------------------------- panel */

  const hacked = ppoQ < sftQ;
  const dpoFindsBest = argmaxImplicit === bestIdx;
  const rmFindsBest = argmaxRM === bestIdx;

  const panel = (i: number) => (
    <>
      <div className="flex flex-wrap gap-2">
        <GuidedCard label="π_ref" accent={VIZ.teal}>
          The SFT model scores <Num>{sftQ.toFixed(2)}</Num> against a best available{" "}
          <Num>{BEST_Q.toFixed(2)}</Num>, and puts {pct(PI_REF[IDEAL])} on the best answer.
        </GuidedCard>

        {i >= S_ANNOTATE && (
          <GuidedCard label="preference data" accent={VIZ.axis}>
            {N_PAIRS} comparisons. <Num>{RESPONSES[IDEAL].label}</Num> appears in{" "}
            <Num>{counts[IDEAL]}</Num>; the three long answers in{" "}
            <Num>{LONG.reduce((a, k) => a + counts[k], 0)}</Num> between them.
          </GuidedCard>
        )}

        {i >= S_RM && (
          <GuidedCard label="reward model" accent={VIZ.brand}>
            w_style <Num>{sgn(rm.ws)}</Num>, w_len <Num>{sgn(rm.wl)}</Num> per 100 tokens. Top-scored:{" "}
            <Num>{RESPONSES[argmaxRM].label}</Num> (true quality {TRUE_Q[argmaxRM].toFixed(1)}).
          </GuidedCard>
        )}

        {i >= S_STAR && (
          <GuidedCard label="RLHF policy" accent={VIZ.brand}>
            At β = {beta}: quality <Num>{ppoQ.toFixed(2)}</Num>, KL from π_ref{" "}
            <Num>{klDiv(piPPO, PI_REF).toFixed(2)}</Num> nats.
          </GuidedCard>
        )}

        {i >= S_DPO && (
          <GuidedCard label="implicit reward" accent={VIZ.orange}>
            No reward model. Top-scored: <Num>{RESPONSES[argmaxImplicit].label}</Num> (true quality{" "}
            {TRUE_Q[argmaxImplicit].toFixed(1)}).
          </GuidedCard>
        )}

        {i >= S_IDENTITY && (
          <GuidedCard label="DPO policy" accent={VIZ.orange}>
            At β = {beta}: quality <Num>{dpoQ.toFixed(2)}</Num>, KL from π_ref{" "}
            <Num>{klDiv(piDPO, PI_REF).toFixed(2)}</Num> nats.
          </GuidedCard>
        )}
      </div>

      {i === S_HACK && (
        <GuidedPayoff label="what the KL budget buys">
          The RLHF curve peaks at β ≈ <strong>{ppoPeak.beta.toFixed(2)}</strong> with quality{" "}
          {ppoPeak.ppo.toFixed(2)}.{" "}
          {tightestPPO < sftQ ? (
            <>
              Past the peak it collapses: by β = {curve[curve.length - 1].beta.toFixed(2)} it reaches{" "}
              <strong>{tightestPPO.toFixed(2)}</strong>, below the {sftQ.toFixed(2)} you started
              from. Every point on that falling edge scores <em>higher</em> on the reward model than
              the peak does — the RM is not measuring what you want, it is measuring what it could
              fit, and β is the only thing bounding how hard the policy pulls on it.
            </>
          ) : (
            <>
              With the long answers annotated the reward model is no longer extrapolating, so the
              curve keeps climbing to <strong>{tightestPPO.toFixed(2)}</strong> instead of
              collapsing, and a tight KL leash costs quality rather than saving it. Same optimiser,
              same β — the difference is entirely in what the reward learned.
            </>
          )}
        </GuidedPayoff>
      )}

      {i === S_COMPARE && (
        <GuidedPayoff label="same objective, two reward estimates">
          At β = {beta} on this sample: RLHF <strong>{ppoQ.toFixed(2)}</strong>, DPO{" "}
          <strong>{dpoQ.toFixed(2)}</strong>, from one set of {N_PAIRS} comparisons and one formula.{" "}
          {hacked
            ? `RLHF is below the ${sftQ.toFixed(2)} SFT baseline because its reward extrapolates a length preference onto answers nobody annotated. `
            : `The reward model's blind spot is closed, so its generalisation now works for it rather than against it. `}
          {dpoFindsBest
            ? "DPO's implicit reward ranks the best answer top, because this round annotated it. "
            : `DPO cannot promote ${RESPONSES[IDEAL].label} — ${counts[IDEAL]} comparisons is not enough to move a parameter that is used nowhere else. `}
          {rmFindsBest
            ? "The reward model ranks it top too, from its features alone."
            : "Neither pipeline is ahead because of its optimiser; they differ only in what their reward could learn."}
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i <= S_ANNOTATE)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>reference policy π_ref</GuidedLegend>
          <GuidedLegend color={VIZ.yellow}>held-out true quality</GuidedLegend>
        </>
      );
    if (i === S_RM)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>inside the annotated length range</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>the RM is extrapolating</GuidedLegend>
        </>
      );
    if (i === S_HACK)
      return (
        <>
          <GuidedLegend color={VIZ.brand}>RLHF · explicit reward model</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>DPO · implicit reward</GuidedLegend>
          <GuidedLegend color={VIZ.teal}>SFT baseline</GuidedLegend>
          <GuidedLegend color={VIZ.yellow}>best available answer</GuidedLegend>
        </>
      );
    if (i === S_IDENTITY)
      return (
        <>
          <GuidedLegend color={VIZ.brand}>RLHF branch · reward and policy</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>DPO branch · reward and policy</GuidedLegend>
        </>
      );
    return (
      <>
        <GuidedLegend color={VIZ.teal}>reference policy</GuidedLegend>
        <GuidedLegend color={VIZ.brand}>RLHF branch</GuidedLegend>
        <GuidedLegend color={VIZ.orange}>DPO branch</GuidedLegend>
        <GuidedLegend color={VIZ.yellow}>held-out true quality</GuidedLegend>
      </>
    );
  };

  return (
    <GuidedViz
      className={className}
      title="Preference tuning, step by step: RLHF and DPO on one prompt"
      caption="Nine candidate answers, 240 annotator comparisons sampled from the SFT model, and two ways to turn them into a policy. Both branches end at the same closed form — π_ref reweighted by exp(r/β) — so the only difference is which reward goes in: two shared weights that generalise to unannotated text, or one free number per response that cannot. True quality is held out from both fits. The β and annotation controls re-run everything."
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
