"use client";

/**
 * The preprocessing pipeline, and what each stage destroys on the way through.
 *
 * Twelve matched sentence pairs: every negated sentence has a twin that differs
 * only by the negation. That turns "preprocessing loses information" from an
 * anecdote into a count — either a pair survives the pipeline distinguishable
 * or it does not.
 *
 *   stage                    collided pairs   vocab   tokens/doc
 *   lowercase + tokenize          0 / 12        44        5.2
 *   + stopword removal           10 / 12        28        2.2
 *   + stemming                   12 / 12        26        2.2
 *   stemming alone                0 / 12        42        5.2
 *
 * The cause is one entry on a list nobody reads: **"not" is a stopword** on
 * every standard English list, along with "no", "nor" and "cannot". Remove
 * stopwords from "the food was not good" and you get `[food good]` — byte
 * identical to what "the food was good" produces.
 *
 * The consequence is stronger than "accuracy drops". The two classes now have
 * *identical feature vectors*, so no classifier of any architecture can do
 * better than chance on those pairs. The information was destroyed upstream, in
 * a utility function, before any model was involved. Stemming alone destroys
 * nothing here (0/12) — it only closes the last two pairs that stopword removal
 * left open, by collapsing "does not work" / "works" onto the same stem.
 *
 * And the benefit is real too, which is why this is a trade rather than a bug:
 * vocabulary falls 44 → 26 and documents shrink from 5.2 tokens to 2.2. For the
 * task these lists were built for — keyword retrieval, where "not" genuinely is
 * noise that matches everything — that is exactly what you want. The failure is
 * carrying a list across tasks, not the list itself.
 */

import { useMemo, useState } from "react";
import {
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  GuidedViz,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { VIZ } from "../viz-kit";

const PAIRS: [string, string][] = [
  ["the food was good", "the food was not good"],
  ["i would recommend this place", "i would not recommend this place"],
  ["the staff were helpful", "the staff were not helpful"],
  ["this is worth the money", "this is not worth the money"],
  ["the room was clean", "the room was not clean"],
  ["i was happy with the service", "i was not happy with the service"],
  ["the delivery was on time", "the delivery was not on time"],
  ["it works as described", "it does not work as described"],
  ["the screen is bright", "the screen is not bright"],
  ["i can hear it clearly", "i cannot hear it clearly"],
  ["the battery lasts all day", "the battery does not last all day"],
  ["this was a great experience", "this was not a great experience"],
];

/* A standard English stopword list, of the kind shipped with NLTK/sklearn.
   The negation words are in it — that is the entire point of this component. */
const STOP = new Set(
  (
    "i me my myself we our ours you your yours he him his she her it its they them their " +
    "what which who this that these those am is are was were be been being have has had having do does did doing " +
    "a an the and but if or because as until while of at by for with about against between into through during " +
    "before after above below to from up down in out on off over under again further then once here there when " +
    "where why how all any both each few more most other some such no nor not only own same so than too very " +
    "s t can will just don should now cannot"
  ).split(/\s+/)
);

const tok = (s: string): string[] => s.toLowerCase().match(/[a-z']+/g) ?? [];

/** Crude suffix stripping, of the kind the lesson describes as "stemming". */
function stem(w: string) {
  for (const suf of ["ing", "edly", "ed", "ly", "es", "s"])
    if (w.length > 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
  return w;
}

type Cfg = { stop: boolean; doStem: boolean };

function pipeline(s: string, cfg: Cfg) {
  let ts: string[] = tok(s);
  if (cfg.stop) ts = ts.filter((w) => !STOP.has(w));
  if (cfg.doStem) ts = ts.map(stem);
  return ts;
}

function measure(cfg: Cfg) {
  let collided = 0;
  const vocab = new Set<string>();
  let tot = 0;
  for (const [pos, neg] of PAIRS) {
    const a = pipeline(pos, cfg);
    const b = pipeline(neg, cfg);
    if (a.join(" ") === b.join(" ")) collided++;
    for (const w of a.concat(b)) vocab.add(w);
    tot += a.length + b.length;
  }
  return { collided, vocab: vocab.size, perDoc: tot / (PAIRS.length * 2) };
}

const STAGES: { label: string; cfg: Cfg }[] = [
  { label: "lowercase + tokenize", cfg: { stop: false, doStem: false } },
  { label: "+ remove stopwords", cfg: { stop: true, doStem: false } },
  { label: "+ stem", cfg: { stop: true, doStem: true } },
];

const M = STAGES.map((s) => measure(s.cfg));
const STEM_ONLY = measure({ stop: false, doStem: true });

const PHASES: GuidedPhase[] = [
  { id: "pipe", label: "The pipeline", tone: "brand", numberPrefix: "P" },
  { id: "cost", label: "What it cost", tone: "rose", numberPrefix: "C" },
];

const STEPS: GuidedStep[] = [
  {
    label: "tokenize",
    phase: "pipe",
    title: "Twelve pairs that differ by one word",
    body: (
      <>
        Each row is a matched pair: the same sentence with and without a negation. Lowercasing and
        tokenising changes nothing that matters — all <strong>{PAIRS.length}</strong> pairs stay
        distinguishable, and the vocabulary is {M[0].vocab} types over {M[0].perDoc.toFixed(1)} tokens
        per document.
        <br />
        <br />
        This is the state every preprocessing tutorial starts from, and the last point at which the
        corpus still contains what it started with.
      </>
    ),
    hint: "Note that the only difference within each pair is the negation word itself.",
  },
  {
    label: "remove stopwords",
    phase: "pipe",
    title: "One entry on a list nobody reads",
    body: (
      <>
        Stopword removal does what it advertises: vocabulary falls from {M[0].vocab} to{" "}
        {M[1].vocab} and documents shrink from {M[0].perDoc.toFixed(1)} tokens to{" "}
        {M[1].perDoc.toFixed(1)}.
        <br />
        <br />
        It also collapses <strong>{M[1].collided} of {PAIRS.length}</strong> pairs into byte-identical
        token lists, because <span className="font-mono">not</span> is on the standard English stopword
        list — as are <span className="font-mono">no</span>, <span className="font-mono">nor</span> and{" "}
        <span className="font-mono">cannot</span>.
      </>
    ),
    hint: "The rose rows are pairs whose two sentences are now exactly the same list of tokens.",
  },
  {
    label: "stem",
    phase: "pipe",
    title: "Stemming closes the last two",
    body: (
      <>
        Stemming takes the count to <strong>{M[2].collided} of {PAIRS.length}</strong>, collapsing the
        remaining pairs by mapping <span className="font-mono">works</span> and{" "}
        <span className="font-mono">work</span> onto one stem.
        <br />
        <br />
        But stemming is not the culprit. Applied on its own, without stopword removal, it collapses{" "}
        <strong>{STEM_ONLY.collided} of {PAIRS.length}</strong> — it only finishes what the stopword list
        started.
      </>
    ),
    hint: "Compare the stem-only figure in the panel against the combined one.",
  },
  {
    label: "what it cost",
    phase: "cost",
    title: "Not lower accuracy — impossible accuracy",
    body: (
      <>
        The usual way to say this is that preprocessing &ldquo;hurts performance&rdquo;. That
        understates it. Two sentences with opposite labels now have <em>identical feature vectors</em>.
        <br />
        <br />
        No classifier — logistic regression, gradient boosting, a transformer over these tokens — can
        exceed chance on those pairs, because there is nothing left to separate them. The information
        was destroyed in a utility function, upstream of every model you will try.
      </>
    ),
    hint: "The fix is not a better model. It is a stopword list chosen for the task you actually have.",
  },
];

export function PreprocessingPipelineViz({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const stageIdx = Math.min(step, STAGES.length - 1);
  const cfg = STAGES[stageIdx].cfg;
  const m = M[stageIdx];

  const rows = useMemo(
    () =>
      PAIRS.map(([pos, neg]) => {
        const a = pipeline(pos, cfg);
        const b = pipeline(neg, cfg);
        return { pos, neg, a, b, same: a.join(" ") === b.join(" ") };
      }),
    [cfg]
  );

  const token = (w: string, dropped: boolean) => (
    <span
      key={w + Math.random()}
      className="rounded px-1 py-0.5 font-mono text-[10.5px]"
      style={{
        background: dropped ? "transparent" : `${VIZ.brand}1f`,
        color: dropped ? VIZ.axis : VIZ.textBright,
        textDecoration: dropped ? "line-through" : "none",
      }}
    >
      {w}
    </span>
  );

  return (
    <GuidedViz
      title="What each preprocessing stage throws away"
      caption={`Twelve matched pairs — the same sentence with and without a negation — pushed through a standard pipeline. Because the pairs differ by exactly one word, "preprocessing loses information" becomes a count: either a pair survives distinguishable or it does not. The stopword list is a standard English one of the kind shipped with NLTK and scikit-learn.`}
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      stageNote={() => (
        <span className="font-mono text-[11px] text-slate-400">
          {STAGES[stageIdx].label} · vocab {m.vocab} · {m.perDoc.toFixed(1)} tokens/doc
        </span>
      )}
      stage={() => (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div
              key={i}
              className="rounded-md px-2 py-1.5"
              style={{
                background: r.same ? `${VIZ.rose}14` : "transparent",
                border: `1px solid ${r.same ? `${VIZ.rose}44` : "transparent"}`,
              }}
            >
              <div className="flex flex-wrap items-center gap-1">
                <span className="w-4 shrink-0 font-mono text-[10px] text-slate-600">+</span>
                {tok(r.pos).map((w) => token(w, cfg.stop && STOP.has(w)))}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <span className="w-4 shrink-0 font-mono text-[10px] text-slate-600">−</span>
                {tok(r.neg).map((w) =>
                  token(w, cfg.stop && STOP.has(w))
                )}
                {r.same && (
                  <span className="ml-1 font-mono text-[10px] text-accent-rose">
                    → identical to the row above
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      panel={() => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <GuidedCard
            label="pairs collapsed"
            accent={m.collided === 0 ? VIZ.teal : VIZ.rose}
          >
            <span className="font-mono text-[11.5px] text-slate-300">
              <span style={{ color: m.collided === 0 ? VIZ.teal : VIZ.rose }}>
                {m.collided} of {PAIRS.length}
              </span>{" "}
              now indistinguishable
              <br />
              stemming alone would collapse {STEM_ONLY.collided}
            </span>
          </GuidedCard>
          <GuidedCard label="what it bought" accent={VIZ.teal}>
            <span className="font-mono text-[11.5px] text-slate-300">
              vocab {M[0].vocab} → <span className="text-accent-teal">{m.vocab}</span>
              <br />
              tokens/doc {M[0].perDoc.toFixed(1)} → {m.perDoc.toFixed(1)}
            </span>
          </GuidedCard>
          {step === 3 && (
            <GuidedPayoff label="why the list contains &ldquo;not&rdquo;">
              These lists were built for <em>keyword retrieval</em>, where a term appearing in almost
              every document genuinely is noise — matching &ldquo;not&rdquo; retrieves the whole corpus,
              so dropping it is exactly right, and the {M[0].vocab} → {M[2].vocab} vocabulary reduction
              is the payoff. The failure is carrying that list into a task where the same word is the
              entire label. Nothing warns you: the pipeline runs clean, the vocabulary shrinks as
              promised, and {M[2].collided} of {PAIRS.length} sentence pairs quietly become the same
              input with opposite targets. Choose the stopword list per task, or for anything
              sentiment-shaped, keep negations and let the model decide what is noise.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={() => (
        <>
          <GuidedLegend color={VIZ.brand}>token kept</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>token dropped</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>pair now identical</GuidedLegend>
        </>
      )}
    />
  );
}
