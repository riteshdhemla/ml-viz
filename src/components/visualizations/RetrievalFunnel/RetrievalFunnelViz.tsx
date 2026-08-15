"use client";

/**
 * Retrieve-then-rank, and which of the two stages is actually holding you back.
 *
 * 3,000 items per user, 120 users. Ground-truth relevance is drawn per
 * (user, item). The retriever is a cheap, noisy scorer applied to *all* items
 * and returns its top K; the ranker is an accurate, expensive scorer applied
 * *only to those K*, and returns the final top 10. Both stages see the same
 * truth through their own independent Gaussian noise, which is the whole model:
 * a first stage that is fast and approximate, a second that is slow and sharp.
 *
 * The one structural fact this makes concrete: **the ranker can only reorder
 * what retrieval handed it.** Anything retrieval dropped is gone, whatever the
 * ranker's quality.
 *
 * Sweeping K at a fixed ranker (noise 0.15):
 *
 *     K      retrieval ceiling   end-to-end recall@10
 *     10          0.205                0.205
 *     50          0.507                0.497
 *    100          0.665                0.630
 *    400          0.918                0.783
 *    800          0.978                0.807
 *   1800          1.000                0.809
 *   3000          1.000                0.810
 *
 * Two regimes, and the crossover is the actionable part. At small K end-to-end
 * sits right on the ceiling — retrieval is the binding constraint and the
 * ranker is idle capacity. Past roughly K = 800 the ceiling reaches 1.000 while
 * end-to-end **plateaus at about 0.81**: retrieval has stopped losing anything
 * and the ranker's own noise is now the entire limit. (Averaged over three
 * seeds; a single seed shows apparent bumps out here that are sampling noise,
 * not a real peak.)
 *
 * That predicts exactly which investment pays, and it is measured:
 *
 *   ranker noise    end-to-end @ K=100     end-to-end @ K=800
 *       0.80             0.333                  0.296
 *       0.40             0.491                  0.548
 *       0.20             0.604                  0.751
 *       0.05             0.662                  0.917
 *       0.00             0.665                  0.978
 *
 * At K = 100 the retrieval ceiling is 0.665, so going from a good ranker (0.20)
 * to a *perfect* one buys **+0.061 and then stops dead** — the ceiling is hard.
 * The identical ranker upgrade at K = 800 buys **+0.227**, nearly four times as
 * much. And with a perfect ranker held fixed at K = 100, halving the retriever's
 * noise from 1.0 to 0.4 moves end-to-end from 0.665 to 0.989.
 *
 * Which is the mechanical explanation for a very common experience: the ranker
 * got better in offline eval and the end-to-end metric did not move, because
 * the system was never ranker-bound in the first place.
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

const N_ITEMS = 3000;
const N_USERS = 120;
const TOP_N = 10;
const RET_NOISE = 1.0;

function gauss(rng: () => number) {
  let u = 0;
  let v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** One end-to-end pass of the funnel; returns the ceiling and the final recall. */
function run(retNoise: number, rankNoise: number, K: number, seed = 7, users = N_USERS) {
  const rng = seededRandom(seed);
  let recall = 0;
  let ceiling = 0;
  for (let u = 0; u < users; u++) {
    const truth = Array.from({ length: N_ITEMS }, () => gauss(rng));
    const idx = Array.from({ length: N_ITEMS }, (_, i) => i);
    const trueTop = [...idx].sort((a, b) => truth[b] - truth[a]).slice(0, TOP_N);
    const tset = new Set(trueTop);
    const rs = truth.map((v) => v + retNoise * gauss(rng));
    const retrieved = [...idx].sort((a, b) => rs[b] - rs[a]).slice(0, K);
    // the ceiling: how many of the true top-10 survived retrieval at all
    ceiling += retrieved.filter((i) => tset.has(i)).length / TOP_N;
    // the ranker reorders ONLY what it was handed
    const ks = new Map(retrieved.map((i) => [i, truth[i] + rankNoise * gauss(rng)]));
    const final = [...retrieved].sort((a, b) => ks.get(b)! - ks.get(a)!).slice(0, TOP_N);
    recall += final.filter((i) => tset.has(i)).length / TOP_N;
  }
  return { recall: recall / users, ceiling: ceiling / users };
}

const KS = [10, 25, 50, 100, 200, 400, 800, 1500, 3000];

/* The two curves are ~9 full passes, so they are computed once on first use and
   cached — the pattern BanditExplorationViz uses for its Thompson arm. */
type Curves = { ceiling: number[]; endToEnd: number[] };
let curveCache: Curves | null = null;
function curves(): Curves {
  if (curveCache) return curveCache;
  const ceiling: number[] = [];
  const endToEnd: number[] = [];
  for (const K of KS) {
    const r = run(RET_NOISE, 0.15, K, 7, 90);
    ceiling.push(r.ceiling);
    endToEnd.push(r.recall);
  }
  curveCache = { ceiling, endToEnd };
  return curveCache;
}

const PHASES: GuidedPhase[] = [
  { id: "funnel", label: "The funnel", tone: "brand", numberPrefix: "F" },
  { id: "invest", label: "Where to invest", tone: "teal", numberPrefix: "I" },
];

const STEPS: GuidedStep[] = [
  {
    label: "two stages",
    phase: "funnel",
    title: "Cheap over everything, expensive over a few",
    body: (
      <>
        Retrieval scores all {N_ITEMS.toLocaleString()} items with something cheap and approximate, and
        keeps its top <span className="font-mono">K</span>. The ranker then scores only those{" "}
        <span className="font-mono">K</span> with something slow and accurate, and returns the top{" "}
        {TOP_N}.
        <br />
        <br />
        That is the whole reason two-stage systems exist: you cannot afford the good model on the whole
        catalogue. But it introduces a constraint that is easy to forget.
      </>
    ),
    hint: "Move K and watch the second stage's workload — and its ceiling — move together.",
  },
  {
    label: "the hard ceiling",
    phase: "funnel",
    title: "The ranker can only reorder what it was handed",
    body: (
      <>
        Whatever retrieval dropped is gone. The teal bar is the share of the true top-{TOP_N} that
        survived retrieval at all — an upper bound no ranker can exceed.
        <br />
        <br />
        Set the ranker to <em>perfect</em> and end-to-end recall lands exactly on that bar and stops.
        Perfect judgement over the wrong shortlist is still the wrong answer.
      </>
    ),
    hint: "Drag ranker noise to 0. The two bars meet, and neither moves after that.",
  },
  {
    label: "where the bottleneck sits",
    phase: "invest",
    title: "Two regimes, and a crossover",
    body: (
      <>
        At small <span className="font-mono">K</span> end-to-end sits right on the ceiling: retrieval is
        the binding constraint and the ranker is idle capacity.
        <br />
        <br />
        Past roughly <span className="font-mono">K = 800</span> the ceiling reaches 1.000 while
        end-to-end <strong>plateaus near 0.81</strong>. Retrieval has stopped losing anything and the
        ranker&rsquo;s own noise is now the entire limit. The gap between the curves is how much of your
        loss belongs to each stage.
      </>
    ),
    hint: "Read the vertical gap between the two curves — that is retrieval's share of the loss.",
  },
  {
    label: "what an upgrade buys",
    phase: "invest",
    title: "The same ranker, worth four times as much",
    body: (
      <>
        Improving the ranker from noise 0.20 to perfect buys <strong>+0.061</strong> at{" "}
        <span className="font-mono">K = 100</span> and then stops dead against the ceiling. The identical
        upgrade at <span className="font-mono">K = 800</span> buys <strong>+0.227</strong>.
        <br />
        <br />
        And holding a perfect ranker at K = 100, halving retrieval noise instead takes end-to-end from
        0.665 to 0.989. Same effort, wildly different return, decided entirely by which stage binds.
      </>
    ),
    hint: "This is why a ranker that improved in offline eval can leave the end-to-end metric untouched.",
  },
];

const W = 560;

export function RetrievalFunnelViz({ className }: { className?: string }) {
  const [K, setK] = useState(100);
  const [rankNoise, setRankNoise] = useState(0.15);
  const [retNoise, setRetNoise] = useState(RET_NOISE);
  const [step, setStep] = useState(0);

  const point = useMemo(
    () => run(retNoise, rankNoise, K, 7, step === 0 ? 40 : 80),
    [retNoise, rankNoise, K, step]
  );
  const cv = useMemo(() => (step === 2 ? curves() : null), [step]);

  const bar = (label: string, v: number, color: string) => (
    <div className="flex items-center gap-2">
      <span className="w-40 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-4 flex-1 rounded bg-surface-elevated/50">
        <div className="h-4 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      <span className="w-12 shrink-0 font-mono text-[11px] text-white">{v.toFixed(3)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="Which stage of the funnel is actually holding you back"
      caption={`${N_ITEMS.toLocaleString()} items per user. Retrieval scores all of them cheaply and keeps its top K; the ranker scores only those K accurately and returns the top ${TOP_N}. Both see the same ground truth through their own independent noise. Every recall figure below is simulated and measured here.`}
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        step === 2 ? undefined : (
          <div className="flex flex-wrap items-end gap-5">
            <div className="w-56">
              <VizSlider
                label="K — items retrieval passes on"
                min={10}
                max={1500}
                step={10}
                value={K}
                onChange={(v) => setK(Math.round(v))}
                format={(v) => v.toFixed(0)}
              />
            </div>
            {step >= 1 && (
              <div className="w-56">
                <VizSlider
                  label="ranker noise (0 = perfect)"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={rankNoise}
                  onChange={setRankNoise}
                  format={(v) => v.toFixed(2)}
                />
              </div>
            )}
            {step === 3 && (
              <div className="w-56">
                <VizSlider
                  label="retrieval noise"
                  min={0.2}
                  max={1.6}
                  step={0.1}
                  value={retNoise}
                  onChange={setRetNoise}
                  format={(v) => v.toFixed(1)}
                />
              </div>
            )}
          </div>
        )
      }
      stageNote={() =>
        step === 2 ? (
          <span className="font-mono text-[11px] text-slate-400">ranker noise fixed at 0.15</span>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">
            ranker scores {K.toLocaleString()} of {N_ITEMS.toLocaleString()} ·{" "}
            {((K / N_ITEMS) * 100).toFixed(1)}%
          </span>
        )
      }
      stage={(i) => {
        if (i === 0) {
          const wAll = W - 92;
          const wK = Math.max(6, (K / N_ITEMS) * wAll);
          const wTop = Math.max(3, (TOP_N / N_ITEMS) * wAll);
          return (
            <svg viewBox={`0 0 ${W} 172`} className="w-full">
              <rect x={46} y={26} width={wAll} height={26} rx={3} fill={VIZ.axis} opacity={0.5} />
              <text x={46 + wAll / 2} y={44} textAnchor="middle" fontSize={10} fill={VIZ.textBright}>
                {N_ITEMS.toLocaleString()} items — scored by the cheap retriever
              </text>
              <path d={`M${46},52 L${46 + wK},94 M${46 + wAll},52 L${46 + wK},94`} stroke={VIZ.grid} strokeWidth={1} fill="none" />
              <rect x={46} y={94} width={wK} height={26} rx={3} fill={VIZ.brand} opacity={0.7} />
              <text x={46 + Math.max(wK, 60) + 10} y={112} fontSize={10} fill={VIZ.brand}>
                K = {K.toLocaleString()} — scored by the expensive ranker
              </text>
              <path d={`M${46},120 L${46 + wTop},150 M${46 + wK},120 L${46 + wTop},150`} stroke={VIZ.grid} strokeWidth={1} fill="none" />
              <rect x={46} y={150} width={wTop} height={16} rx={2} fill={VIZ.teal} />
              <text x={46 + wTop + 10} y={162} fontSize={10} fill={VIZ.teal}>
                top {TOP_N} shown to the user
              </text>
            </svg>
          );
        }
        if (i === 2 && cv) {
          const sx = (n: number) => 50 + (n / (KS.length - 1)) * (W - 100);
          const sy = (v: number) => 140 - v * 118;
          const path = (a: number[]) => a.map((v, n) => `${n === 0 ? "M" : "L"}${sx(n)},${sy(v)}`).join(" ");
          return (
            <svg viewBox={`0 0 ${W} 176`} className="w-full">
              {[0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={50} x2={W - 50} y1={sy(v)} y2={sy(v)} stroke={VIZ.grid} strokeWidth={1} opacity={0.4} />
                  <text x={46} y={sy(v) + 3} textAnchor="end" fontSize={8} fill={VIZ.text}>
                    {v.toFixed(2)}
                  </text>
                </g>
              ))}
              {/* the gap between the curves is retrieval's share of the loss */}
              <path
                d={`${path(cv.ceiling)} L${sx(KS.length - 1)},${sy(cv.endToEnd[KS.length - 1])} ${cv.endToEnd
                  .map((v, n) => `L${sx(KS.length - 1 - n)},${sy(cv.endToEnd[KS.length - 1 - n])}`)
                  .join(" ")} Z`}
                fill={VIZ.teal}
                opacity={0.12}
              />
              <path d={path(cv.ceiling)} fill="none" stroke={VIZ.teal} strokeWidth={2} />
              <path d={path(cv.endToEnd)} fill="none" stroke={VIZ.brand} strokeWidth={2} />
              {KS.map((k, n) => (
                <text key={k} x={sx(n)} y={156} textAnchor="middle" fontSize={8} fill={VIZ.text}>
                  {k}
                </text>
              ))}
              <text x={W - 50} y={sy(cv.ceiling[KS.length - 1]) - 6} textAnchor="end" fontSize={8.5} fill={VIZ.teal}>
                retrieval ceiling
              </text>
              <text x={W - 50} y={sy(cv.endToEnd[KS.length - 1]) + 14} textAnchor="end" fontSize={8.5} fill={VIZ.brand}>
                end-to-end recall@{TOP_N}
              </text>
              <text x={50} y={14} fontSize={9} fill={VIZ.text}>
                recall@{TOP_N}
              </text>
              <text x={50} y={170} fontSize={8.5} fill={VIZ.text}>
                K — how many items retrieval passes to the ranker
              </text>
            </svg>
          );
        }
        return (
          <div className="space-y-2 py-3">
            {bar("retrieval ceiling", point.ceiling, VIZ.teal)}
            {bar("end-to-end recall@10", point.recall, VIZ.brand)}
            <p className="pt-1 font-mono text-[10.5px] text-slate-400">
              retrieval discards{" "}
              <span className="text-accent-teal">{((1 - point.ceiling) * 100).toFixed(1)}%</span> of the
              true top-{TOP_N} before the ranker ever sees them; the ranker then loses a further{" "}
              <span className="text-brand-300">{((point.ceiling - point.recall) * 100).toFixed(1)}%</span>
            </p>
          </div>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <GuidedCard label="the funnel" accent={VIZ.brand}>
            <span className="font-mono text-[11.5px] text-slate-300">
              {N_ITEMS.toLocaleString()} → <span className="text-brand-300">{K.toLocaleString()}</span> →{" "}
              {TOP_N}
              <br />
              ranker does {((K / N_ITEMS) * 100).toFixed(1)}% of the scoring work
            </span>
          </GuidedCard>
          {i >= 1 && (
            <GuidedCard
              label="who is losing what"
              accent={point.ceiling - point.recall < 0.03 ? VIZ.teal : VIZ.brand}
            >
              <span className="font-mono text-[11.5px] text-slate-300">
                retrieval loses{" "}
                <span className="text-accent-teal">{((1 - point.ceiling) * 100).toFixed(1)}%</span> ·
                ranker loses{" "}
                <span className="text-brand-300">{((point.ceiling - point.recall) * 100).toFixed(1)}%</span>
                <br />
                {point.ceiling - point.recall < 0.03
                  ? "→ retrieval-bound: a better ranker buys nothing"
                  : "→ the ranker still has room here"}
              </span>
            </GuidedCard>
          )}
          {i === 3 && (
            <GuidedPayoff label="diagnose the stage before you fund it">
              The ranker upgrade from noise 0.20 to perfect is worth <strong>+0.061</strong> at K = 100
              and <strong>+0.227</strong> at K = 800 — the same engineering, nearly four times the
              return, decided entirely by whether retrieval was already throwing the answer away. At
              K = 100 the ceiling is 0.665, so a perfect ranker cannot reach 0.67 no matter what; halving
              retrieval&rsquo;s noise instead takes end-to-end to 0.989. This is the mechanical reason a
              ranker that clearly improved in offline eval can leave the end-to-end metric flat: the
              system was never ranker-bound, and nothing about the ranker&rsquo;s own metrics would have
              told you.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i === 0 ? (
          <>
            <GuidedLegend color={VIZ.axis}>full catalogue</GuidedLegend>
            <GuidedLegend color={VIZ.brand}>retrieved shortlist</GuidedLegend>
            <GuidedLegend color={VIZ.teal}>shown to the user</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.teal}>retrieval ceiling</GuidedLegend>
            <GuidedLegend color={VIZ.brand}>end-to-end recall</GuidedLegend>
          </>
        )
      }
    />
  );
}
