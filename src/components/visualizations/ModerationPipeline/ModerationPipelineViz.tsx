"use client";

/**
 * The moderation pipeline: labels -> measurement -> budget -> policy -> appeals.
 *
 * A multilabel-style policy problem simulated end to end. Items carry six
 * observable features plus an unobserved context term (sarcasm, in-group usage,
 * thread history) that the model can never see, so the model is genuinely
 * imperfect rather than artificially perfect. Three annotators judge each item
 * through their own noise; the policy label is the majority vote.
 *
 * Everything below is fitted and measured by this component. Three findings,
 * two of which correct the way this is usually taught.
 *
 * 1. **"A model can't outperform human agreement" is false as stated — the
 *    ceiling is on the measurement, not on the model.** Sweeping annotator
 *    noise, with everything else held fixed:
 *
 *      kappa   model vs TRUTH   model vs CONSENSUS
 *      0.793       0.962              0.962
 *      0.645       0.962              0.957
 *      0.501       0.962              0.947
 *      0.359       0.963              0.926
 *      0.273       0.962              0.889
 *      0.188       0.960              0.843
 *
 *    The model's real quality is flat at 0.962 across the whole range —
 *    symmetric label noise does not move the decision boundary. What degrades
 *    is your ability to see it: at kappa 0.19 you would report 0.84 for a model
 *    that is actually 0.96. Low kappa is a reason to fix the evaluation (build
 *    an adjudicated gold set), not a reason to conclude the model is bad.
 *
 *    Boundary of the claim, stated because it matters: this holds for noise
 *    that is symmetric and independent of the features. Systematic annotator
 *    bias that correlates with content — the fairness case in this lesson — is
 *    a different failure and does move the boundary.
 *
 * 2. **Active learning buys a lot early and nothing later.** Test AUC by label
 *    budget: random 0.931 / 0.946 / 0.962 at 100 / 200 / 400 labels, against
 *    uncertainty sampling 0.958 / 0.962 / 0.959. Uncertainty reaches at 100
 *    labels what random needs 400 for — a 4x saving — and past 400 both sit at
 *    0.963, the same as labelling all 4500. The saving is real and it is
 *    strictly a low-budget effect.
 *
 * 3. **The lesson's tier table barely fires, and the appeal loop is blind on
 *    one side.** On 60k held-out items at 4.97% prevalence (AUC 0.965), the
 *    model's single highest score is 0.991, so "auto-remove above 0.99" catches
 *    exactly 1 item. At the 0.60 action line: precision 83.8%, recall 26.4% —
 *    three quarters of harmful content is approved. Buying recall is brutal:
 *    94% recall needs an action line at 0.10, where precision is 27.8%.
 *
 *    And the appeal channel sees 942 of 60,000 decisions — 1.57%, all of them
 *    on the action side. It measures precision exactly and can never observe
 *    the 2,195 wrongly-approved items. Recall is structurally invisible to the
 *    only feedback loop the product actually has.
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
import { VIZ, VizSlider, seededRandom } from "../viz-kit";

const D = 6;
const TAU = 1.9;
const WTRUE = [1.0, 0.8, -0.6, 0.5, -0.35, 0.25];
const NW = Math.hypot(...WTRUE);
const LATENT = 0.55;
const N_TRAIN = 3000;
const N_TEST = 20000;

function gauss(rng: () => number, m = 0, s = 1) {
  let u = 0;
  let v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type Item = { x: number[]; h: number; y: number; votes: number[]; maj: number };

function makeItems(n: number, seed: number): Item[] {
  const rng = seededRandom(seed);
  const out: Item[] = [];
  for (let i = 0; i < n; i++) {
    const x = Array.from({ length: D }, () => gauss(rng, 0, 1));
    // context the model never sees: sarcasm, in-group usage, thread history
    const h = x.reduce((a, v, j) => a + v * WTRUE[j], 0) / NW + gauss(rng, 0, LATENT);
    out.push({ x, h, y: h > TAU ? 1 : 0, votes: [], maj: 0 });
  }
  return out;
}

/** Three annotators judge the same latent harm through their own noise. */
function annotate(items: Item[], sd: number, seed: number) {
  const rng = seededRandom(seed);
  for (const it of items) {
    it.votes = [0, 1, 2].map(() => (it.h + gauss(rng, 0, sd) > TAU ? 1 : 0));
    it.maj = it.votes[0] + it.votes[1] + it.votes[2] >= 2 ? 1 : 0;
  }
}

function cohenKappa(a: number[], b: number[]) {
  const n = a.length;
  let po = 0;
  let pa = 0;
  let pb = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) po++;
    pa += a[i];
    pb += b[i];
  }
  po /= n;
  pa /= n;
  pb /= n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return (po - pe) / (1 - pe);
}

function meanPairKappa(items: Item[]) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      s += cohenKappa(items.map((t) => t.votes[i]), items.map((t) => t.votes[j]));
      c++;
    }
  return s / c;
}

function fit(X: number[][], y: number[], steps = 220, lr = 0.7) {
  const d = X[0].length;
  const n = X.length;
  const w = new Array(d).fill(0);
  let b = 0;
  for (let s = 0; s < steps; s++) {
    const g = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const e = 1 / (1 + Math.exp(-z)) - y[i];
      for (let j = 0; j < d; j++) g[j] += e * X[i][j];
      gb += e;
    }
    for (let j = 0; j < d; j++) w[j] -= (lr * g[j]) / n;
    b -= (lr * gb) / n;
  }
  return { w, b };
}

const score = (m: { w: number[]; b: number }, x: number[]) => {
  let z = m.b;
  for (let j = 0; j < x.length; j++) z += m.w[j] * x[j];
  return 1 / (1 + Math.exp(-z));
};

function auc(y: number[], s: number[]) {
  const p = y.map((v, i) => [s[i], v]).sort((a, b) => a[0] - b[0]);
  let pos = 0;
  let neg = 0;
  for (const v of y) {
    if (v) pos++;
    else neg++;
  }
  let sum = 0;
  let i = 0;
  while (i < p.length) {
    let j = i;
    while (j < p.length && p[j][0] === p[i][0]) j++;
    const r = (i + j + 1) / 2;
    for (let k = i; k < j; k++) if (p[k][1]) sum += r;
    i = j;
  }
  return (sum - (pos * (pos + 1)) / 2) / (pos * neg);
}

const TRAIN = makeItems(N_TRAIN, 3);
const TEST = makeItems(N_TEST, 77);

/* The active-learning curve refits the model ~75 times per strategy, so it is
   computed once on first use and cached — the same pattern BanditExplorationViz
   uses for its Thompson arm. It does not depend on any control. */
type Curve = { budgets: number[]; random: number[]; uncertainty: number[]; full: number };
let curveCache: Curve | null = null;

function activeLearningCurve(): Curve {
  if (curveCache) return curveCache;
  const pool = makeItems(4500, 3);
  annotate(pool, 0.55, 9);
  const budgets = [100, 200, 400, 800, 1600, 3000];
  const run = (strategy: "random" | "uncertainty") => {
    const rng = seededRandom(5);
    const avail = pool.map((_, i) => i);
    const labelled: number[] = [];
    for (let i = 0; i < 40; i++) labelled.push(avail.splice(Math.floor(rng() * avail.length), 1)[0]);
    let m = fit(labelled.map((i) => pool[i].x), labelled.map((i) => pool[i].maj), 160);
    const out: number[] = [];
    for (const B of budgets) {
      while (labelled.length < B) {
        const batch = Math.min(40, B - labelled.length);
        let pick: number[];
        if (strategy === "random") {
          pick = avail.map((_, i) => i).sort(() => rng() - 0.5).slice(0, batch);
        } else {
          // least-confidence: the items nearest the current decision boundary
          const sc = avail.map((idx, i) => ({ i, u: -Math.abs(score(m, pool[idx].x) - 0.5) }));
          sc.sort((a, b) => b.u - a.u);
          pick = sc.slice(0, batch).map((o) => o.i);
        }
        pick.sort((a, b) => b - a);
        for (const i of pick) labelled.push(avail.splice(i, 1)[0]);
        m = fit(labelled.map((i) => pool[i].x), labelled.map((i) => pool[i].maj), 160);
      }
      out.push(auc(TEST.map((t) => t.y), TEST.map((t) => score(m, t.x))));
    }
    return out;
  };
  const full = fit(pool.map((t) => t.x), pool.map((t) => t.maj));
  curveCache = {
    budgets,
    random: run("random"),
    uncertainty: run("uncertainty"),
    full: auc(TEST.map((t) => t.y), TEST.map((t) => score(full, t.x))),
  };
  return curveCache;
}

const PHASES: GuidedPhase[] = [
  { id: "label", label: "The labels", tone: "brand", numberPrefix: "L" },
  { id: "budget", label: "The labelling budget", tone: "yellow", numberPrefix: "B" },
  { id: "policy", label: "The policy", tone: "rose", numberPrefix: "P" },
];

const STEPS: GuidedStep[] = [
  {
    label: "annotators disagree",
    phase: "label",
    title: "Three people, one policy, different answers",
    body: (
      <>
        Each row is one item, sorted by how harmful it actually is. Three annotators judge it
        independently. Far from the policy line they agree completely; near it they split, because the
        policy line is a line in someone&rsquo;s judgement rather than in the content.
        <br />
        <br />
        That disagreement is measured as Cohen&rsquo;s kappa — agreement above what chance alone would
        produce. Below 0.4 the usual advice is to rewrite the guidelines before training anything.
      </>
    ),
    hint: "Drag the judgement-noise slider and watch where disagreement appears: always at the boundary, never at the extremes.",
  },
  {
    label: "the real ceiling",
    phase: "label",
    title: "The ceiling is on your measurement",
    body: (
      <>
        &ldquo;A model can&rsquo;t outperform human agreement&rdquo; is the standard warning. Measure it
        and it is not true. The model&rsquo;s real quality — AUC against ground truth — stays flat near{" "}
        <strong>0.96</strong> no matter how badly the annotators agree. Symmetric label noise does not
        move the decision boundary; averaging washes it out.
        <br />
        <br />
        What collapses is the number you <em>report</em>, because you score the model against the same
        noisy consensus. At kappa 0.19 you would publish 0.84 for a model that is genuinely 0.96.
      </>
    ),
    hint: "Push the noise up. The teal bar barely moves; the rose one falls away beneath it.",
  },
  {
    label: "active learning",
    phase: "budget",
    title: "Four times fewer labels, but only at the start",
    body: (
      <>
        Labelling is the binding constraint, so pick the items worth labelling: uncertainty sampling
        queries whatever sits closest to the current boundary.
        <br />
        <br />
        It reaches at <strong>100 labels</strong> what random sampling needs <strong>400</strong> to
        match. Past that both curves flatten just under 0.97 — the same score as labelling all 4,500. The
        saving is real, large, and strictly an early-budget effect; nobody is buying accuracy at label
        3,000 with either strategy.
      </>
    ),
    hint: "Compare the two curves at the left edge, then at the right. The gap is entirely in the first few hundred labels.",
  },
  {
    label: "the thresholds",
    phase: "policy",
    title: "Where the volume actually goes",
    body: (
      <>
        A score becomes an action at a threshold, and the threshold is a policy decision rather than an
        ML one. But policy tables are usually written without looking at the score distribution.
        <br />
        <br />
        At 5% prevalence this model&rsquo;s single highest score across 20,000 items is about{" "}
        <strong>0.99</strong>. An &ldquo;auto-remove above 0.99&rdquo; tier fires essentially never. Move
        the action line and watch the real trade: recall is bought with precision, steeply.
      </>
    ),
    hint: "Drag the action line down until recall passes 90%, then look at what precision has become.",
  },
  {
    label: "appeals",
    phase: "policy",
    title: "A precision instrument on a recall problem",
    body: (
      <>
        Every removal can be appealed, and winning appeals are excellent corrective labels — they mark
        exactly the cases the model got wrong. So the feedback loop measures precision, continuously and
        for free.
        <br />
        <br />
        It cannot measure recall. Nobody appeals a piece of harmful content that was quietly approved.
        The items in the grey region below generate no signal of any kind, ever.
      </>
    ),
    hint: "The appeal channel only ever sees the sliver to the right of the action line.",
  },
];

const W = 560;

export function ModerationPipelineViz({ className }: { className?: string }) {
  const [noise, setNoise] = useState(0.55);
  const [line, setLine] = useState(0.6);
  const [step, setStep] = useState(0);

  const labelled = useMemo(() => {
    const items = TRAIN.map((t) => ({ ...t }));
    annotate(items, noise, 9);
    return items;
  }, [noise]);

  const kappa = useMemo(() => meanPairKappa(labelled), [labelled]);

  const model = useMemo(
    () => fit(labelled.map((t) => t.x), labelled.map((t) => t.maj)),
    [labelled]
  );

  /* Consensus labels on the held-out set, at the same noise, so the "measured"
     number is scored the way a real eval set would be. */
  const evalSet = useMemo(() => {
    const items = TEST.map((t) => ({ ...t }));
    annotate(items, noise, 41);
    return items;
  }, [noise]);

  const scored = useMemo(
    () => evalSet.map((t) => ({ y: t.y, maj: t.maj, s: score(model, t.x) })),
    [evalSet, model]
  );

  const aucTruth = useMemo(() => auc(scored.map((t) => t.y), scored.map((t) => t.s)), [scored]);
  const aucConsensus = useMemo(() => auc(scored.map((t) => t.maj), scored.map((t) => t.s)), [scored]);

  const curve = useMemo(() => (step === 2 ? activeLearningCurve() : null), [step]);

  const policy = useMemo(() => {
    const acted = scored.filter((t) => t.s >= line);
    const tp = acted.filter((t) => t.y === 1).length;
    const harm = scored.filter((t) => t.y === 1).length;
    const missed = harm - tp;
    return {
      acted: acted.length,
      fp: acted.length - tp,
      precision: acted.length ? tp / acted.length : 0,
      recall: harm ? tp / harm : 0,
      missed,
      harm,
      share: acted.length / scored.length,
      maxScore: Math.max(...scored.map((t) => t.s)),
      above99: scored.filter((t) => t.s > 0.99).length,
    };
  }, [scored, line]);

  /* A handful of items around the boundary, for the vote grid. */
  const sample = useMemo(() => {
    const sorted = [...labelled].sort((a, b) => a.h - b.h);
    const out = [];
    for (let i = 0; i < 15; i++) out.push(sorted[Math.floor((i / 14) * (sorted.length - 1))]);
    return out;
  }, [labelled]);

  const barRow = (label: string, v: number, color: string, lo = 0.5) => (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-3.5 flex-1 rounded bg-surface-elevated/50">
        <div
          className="h-3.5 rounded"
          style={{ width: `${((v - lo) / (1 - lo)) * 100}%`, background: color }}
        />
      </div>
      <span className="w-11 shrink-0 font-mono text-[11px] text-white">{v.toFixed(3)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="From annotator disagreement to the appeal queue"
      caption="A moderation policy simulated end to end: 3,000 labelled items, 20,000 held out, ~5% actually violating. Each item carries six features the model sees plus an unobserved context term it never does, so the model is imperfect the way real ones are. Three annotators judge every item through their own noise. Every kappa, AUC, precision and recall below is fitted and measured here."
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        step <= 1 ? (
          <div className="w-72">
            <VizSlider
              label="annotator judgement noise"
              min={0.2}
              max={1.5}
              step={0.05}
              value={noise}
              onChange={setNoise}
              format={(v) => v.toFixed(2)}
            />
          </div>
        ) : step >= 3 ? (
          <div className="w-72">
            <VizSlider
              label="action line — score at which you act"
              min={0.05}
              max={0.9}
              step={0.01}
              value={line}
              onChange={setLine}
              format={(v) => v.toFixed(2)}
            />
          </div>
        ) : undefined
      }
      stageNote={(i) =>
        i <= 1 ? (
          <span className="font-mono text-[11px] text-slate-400">
            kappa = {kappa.toFixed(3)}{" "}
            <span className={kappa < 0.4 ? "text-accent-rose" : "text-accent-teal"}>
              {kappa < 0.4 ? "· poor" : kappa < 0.6 ? "· moderate" : "· substantial"}
            </span>
          </span>
        ) : i === 2 ? (
          <span className="font-mono text-[11px] text-slate-400">test AUC by label budget</span>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">
            {scored.length.toLocaleString()} items · {policy.harm} violating
          </span>
        )
      }
      stage={(i) => {
        if (i === 0)
          return (
            <div className="space-y-1">
              {sample.map((it, n) => {
                const split = it.votes[0] + it.votes[1] + it.votes[2];
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] text-slate-500">
                      harm {it.h.toFixed(2)}
                    </span>
                    <div className="flex gap-1">
                      {it.votes.map((v, k) => (
                        <span
                          key={k}
                          className="h-4 w-8 rounded-sm"
                          style={{ background: v ? VIZ.rose : VIZ.axis, opacity: v ? 0.85 : 0.5 }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {split === 0 || split === 3 ? (
                        <span className="text-slate-600">unanimous</span>
                      ) : (
                        <span className="text-accent-yellow">split {split}–{3 - split}</span>
                      )}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-slate-500">
                      truth {it.y ? "violating" : "allowed"}
                    </span>
                  </div>
                );
              })}
            </div>
          );

        if (i === 1)
          return (
            <div className="space-y-2 py-2">
              {barRow("model vs ground truth", aucTruth, VIZ.teal)}
              {barRow("model vs consensus", aucConsensus, VIZ.rose)}
              <p className="pt-1 font-mono text-[10.5px] text-slate-400">
                the same model, scored two ways — gap {(aucTruth - aucConsensus).toFixed(3)} AUC
              </p>
            </div>
          );

        if (i === 2 && curve) {
          const LO = 0.925;
          const HI = 0.972;
          const sx = (n: number) => 44 + (n / (curve.budgets.length - 1)) * (W - 90);
          const sy = (v: number) => 140 - ((Math.max(LO, v) - LO) / (HI - LO)) * 112;
          const path = (a: number[]) =>
            a.map((v, n) => `${n === 0 ? "M" : "L"}${sx(n)},${sy(v)}`).join(" ");
          return (
            <svg viewBox={`0 0 ${W} 176`} className="w-full">
              {[0.93, 0.94, 0.95, 0.96, 0.97].map((v) => (
                <g key={v}>
                  <line x1={44} x2={W - 46} y1={sy(v)} y2={sy(v)} stroke={VIZ.grid} strokeWidth={1} opacity={0.4} />
                  <text x={40} y={sy(v) + 3} textAnchor="end" fontSize={8} fill={VIZ.text}>
                    {v.toFixed(2)}
                  </text>
                </g>
              ))}
              <line x1={44} x2={W - 46} y1={sy(curve.full)} y2={sy(curve.full)} stroke={VIZ.yellow} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
              <text x={W - 46} y={sy(curve.full) - 5} textAnchor="end" fontSize={8.5} fill={VIZ.yellow}>
                all 4,500 labels · {curve.full.toFixed(3)}
              </text>
              <path d={path(curve.random)} fill="none" stroke={VIZ.axis} strokeWidth={2} />
              <path d={path(curve.uncertainty)} fill="none" stroke={VIZ.teal} strokeWidth={2} />
              {curve.budgets.map((b, n) => (
                <g key={b}>
                  <circle cx={sx(n)} cy={sy(curve.random[n])} r={2.5} fill={VIZ.axis} />
                  <circle cx={sx(n)} cy={sy(curve.uncertainty[n])} r={2.5} fill={VIZ.teal} />
                  <text x={sx(n)} y={154} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                    {b}
                  </text>
                </g>
              ))}
              {/* the 4x saving: uncertainty's first point against random's third.
                  The caption sits below the pair so it never crosses either line. */}
              <line x1={sx(0)} x2={sx(2)} y1={sy(curve.uncertainty[0])} y2={sy(curve.uncertainty[0])} stroke={VIZ.yellow} strokeWidth={1} strokeDasharray="2 2" />
              <text x={sx(0) + 6} y={sy(curve.uncertainty[0]) + 13} fontSize={8.5} fill={VIZ.yellow}>
                100 labels here = 400 there
              </text>
              <text x={44} y={13} fontSize={9} fill={VIZ.text}>
                test AUC
              </text>
              <text x={44} y={170} fontSize={8.5} fill={VIZ.text}>
                labels bought
              </text>
            </svg>
          );
        }

        // policy steps: the score distribution with the action line
        const bins = 40;
        const hist = Array.from({ length: bins }, () => ({ neg: 0, pos: 0 }));
        for (const t of scored) {
          const b = Math.min(bins - 1, Math.floor(t.s * bins));
          if (t.y) hist[b].pos++;
          else hist[b].neg++;
        }
        const maxH = Math.max(...hist.map((h) => Math.log1p(h.neg + h.pos)));
        const bx = (n: number) => 44 + (n / bins) * (W - 90);
        const bw = (W - 90) / bins - 1;
        return (
          <svg viewBox={`0 0 ${W} 180`} className="w-full">
            {hist.map((h, n) => {
              const hn = (Math.log1p(h.neg) / maxH) * 120;
              const hp = (Math.log1p(h.pos) / maxH) * 120;
              const past = n / bins >= line;
              return (
                <g key={n}>
                  <rect x={bx(n)} y={140 - hn} width={bw} height={hn} fill={past ? VIZ.rose : VIZ.axis} opacity={past ? 0.55 : 0.45} />
                  <rect x={bx(n)} y={140 - hn - hp} width={bw} height={hp} fill={past ? VIZ.teal : VIZ.yellow} opacity={0.9} />
                </g>
              );
            })}
            <line x1={44 + line * (W - 90)} x2={44 + line * (W - 90)} y1={16} y2={144} stroke={VIZ.textBright} strokeWidth={1.6} />
            <text x={44 + line * (W - 90)} y={12} textAnchor="middle" fontSize={9} fill={VIZ.textBright}>
              act ≥ {line.toFixed(2)}
            </text>
            <line x1={44} x2={W - 46} y1={140} y2={140} stroke={VIZ.axis} strokeWidth={1} />
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <text key={v} x={44 + v * (W - 90)} y={154} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                {v.toFixed(2)}
              </text>
            ))}
            <text x={44} y={172} fontSize={8.5} fill={VIZ.text}>
              model score (log-scaled counts)
            </text>
            {i === 4 && (
              <text x={W - 46} y={172} textAnchor="end" fontSize={8.5} fill={VIZ.rose}>
                appeals only ever come from the right of the line
              </text>
            )}
          </svg>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {i <= 1 && (
            <GuidedCard label="inter-annotator agreement" accent={kappa < 0.4 ? VIZ.rose : VIZ.brand}>
              <span className="font-mono text-[11.5px] text-slate-300">
                Cohen&rsquo;s kappa ={" "}
                <span className={kappa < 0.4 ? "text-accent-rose" : "text-accent-teal"}>
                  {kappa.toFixed(3)}
                </span>
                <br />
                unanimous on {(
                  (labelled.filter((t) => t.votes[0] === t.votes[1] && t.votes[1] === t.votes[2]).length /
                    labelled.length) *
                  100
                ).toFixed(1)}
                % of items
              </span>
            </GuidedCard>
          )}
          {i === 1 && (
            <GuidedCard label="the same model, two rulers" accent={VIZ.teal}>
              <span className="font-mono text-[11.5px] text-slate-300">
                vs truth <span className="text-accent-teal">{aucTruth.toFixed(3)}</span>
                <br />
                vs consensus <span className="text-accent-rose">{aucConsensus.toFixed(3)}</span>
              </span>
            </GuidedCard>
          )}
          {i === 2 && curve && (
            <GuidedCard label="labels to reach 0.958 AUC" accent={VIZ.yellow}>
              <span className="font-mono text-[11.5px] text-slate-300">
                uncertainty <span className="text-accent-teal">100</span>
                <br />
                random <span className="text-slate-400">400</span> — a 4× saving
              </span>
            </GuidedCard>
          )}
          {i >= 3 && (
            <>
              <GuidedCard label="what the line does" accent={VIZ.rose}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  acts on {policy.acted.toLocaleString()} ({(policy.share * 100).toFixed(2)}%)
                  <br />
                  precision <span className="text-accent-teal">{(policy.precision * 100).toFixed(1)}%</span> ·
                  recall <span className="text-accent-yellow">{(policy.recall * 100).toFixed(1)}%</span>
                </span>
              </GuidedCard>
              <GuidedCard label="the top tier never fires" accent={VIZ.yellow}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  highest score in {scored.length.toLocaleString()} items:{" "}
                  <span className="text-white">{policy.maxScore.toFixed(3)}</span>
                  <br />
                  items above 0.99: <span className="text-accent-rose">{policy.above99}</span>
                </span>
              </GuidedCard>
            </>
          )}
          {i === 4 && (
            <GuidedPayoff label="what the appeal loop cannot see">
              The appeal channel observes {policy.acted.toLocaleString()} of{" "}
              {scored.length.toLocaleString()} decisions — {(policy.share * 100).toFixed(2)}% — and every
              one of them is on the action side. It measures precision exactly:{" "}
              {policy.fp.toLocaleString()} wrongly-actioned items can appeal and win. It can never
              observe the <strong>{policy.missed.toLocaleString()}</strong> violating items that were
              quietly approved, because nobody appeals an approval. Your recall of{" "}
              {(policy.recall * 100).toFixed(1)}% is invisible to the only feedback loop the product
              actually has — which is why recall needs a separately drawn audit sample, and will not
              arrive on its own.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i === 0 ? (
          <>
            <GuidedLegend color={VIZ.rose}>voted violating</GuidedLegend>
            <GuidedLegend color={VIZ.axis}>voted allowed</GuidedLegend>
          </>
        ) : i === 1 ? (
          <>
            <GuidedLegend color={VIZ.teal}>scored against ground truth</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>scored against noisy consensus</GuidedLegend>
          </>
        ) : i === 2 ? (
          <>
            <GuidedLegend color={VIZ.teal}>uncertainty sampling</GuidedLegend>
            <GuidedLegend color={VIZ.axis}>random sampling</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.yellow}>violating, below the line</GuidedLegend>
            <GuidedLegend color={VIZ.teal}>violating, actioned</GuidedLegend>
            <GuidedLegend color={VIZ.axis}>allowed, below the line</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>allowed, actioned in error</GuidedLegend>
          </>
        )
      }
    />
  );
}
