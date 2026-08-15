"use client";

/**
 * Test-time compute, and the verifier that decides whether it is worth anything.
 *
 * A model answers a question correctly with probability p on any single attempt.
 * Sample N attempts; a verifier scores each one (correct answers ~ N(1, sv),
 * wrong ~ N(0, sv)) and best-of-N returns the argmax. pass@N — 1 - (1-p)^N — is
 * the oracle: what a *perfect* verifier would achieve, and a hard ceiling on any
 * selection strategy over the same samples.
 *
 * Measured at p = 0.35, 20,000 trials per point:
 *
 *     N     pass@N    sv=0.2   sv=0.5   sv=1.0   sv=2.0
 *     1      0.350     0.348    0.348    0.348    0.348
 *     4      0.821     0.817    0.736    0.582    0.471
 *    16      0.999     0.999    0.953    0.758    0.570
 *   128      1.000     1.000    0.996    0.888    0.666
 *
 * **The verifier sets how much of the ceiling you collect.** At N = 16 the
 * oracle reaches 0.999; a near-perfect verifier captures 100% of that, sv = 1.0
 * captures 75.9%, sv = 3.0 captures 50.0%. The samples containing a correct
 * answer are there either way — selection is the whole difference.
 *
 * **Which makes test-time compute a bet on the verifier, not on the sampler.**
 * Best-of-16 on a p = 0.35 model with a good verifier (sv = 0.5) reaches 0.953,
 * a score you would otherwise need a *95.3%-single-shot* model to match. With a
 * poor verifier (sv = 3.0) the same 16× spend reaches 0.500 — matched by a 50%
 * single-shot model. Same sampling, same compute, wildly different substitution
 * rate for training a better model.
 *
 * **And the returns to more compute are non-monotone in verifier quality.**
 * Going 16 → 128 samples (8× the spend) buys +0.001 at sv = 0.2 (already
 * saturated against the ceiling), +0.130 at sv = 1.0, and +0.096 at sv = 2.0 —
 * a good verifier has nothing left to gain and a bad one cannot exploit the
 * extra samples.
 *
 * Deliberately NOT modelled: the "best-of-N accuracy peaks then declines"
 * reward-hacking result. Here wrong answers sit at a fixed mean below correct
 * ones, so with enough samples the correct ones always win and the curve is
 * monotone. Producing a decline would require assuming that some wrong answers
 * are *systematically* over-scored by the verifier — which is real with learned
 * reward models, but is the conclusion rather than something this simulation
 * derives. It is left out rather than built in.
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

const TRIALS = 6000;
const NS = [1, 2, 4, 8, 16, 32, 64, 128];

function gauss(rng: () => number) {
  let u = 0;
  let v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Sample N answers, score each, take the argmax. */
function bestOfN(p: number, N: number, sv: number, seed = 3, trials = TRIALS) {
  const rng = seededRandom(seed);
  let ok = 0;
  for (let t = 0; t < trials; t++) {
    let bs = -1e9;
    let bc = 0;
    for (let i = 0; i < N; i++) {
      const c = rng() < p ? 1 : 0;
      const s = c + sv * gauss(rng);
      if (s > bs) {
        bs = s;
        bc = c;
      }
    }
    ok += bc;
  }
  return ok / trials;
}

const passAtN = (p: number, N: number) => 1 - Math.pow(1 - p, N);

const PHASES: GuidedPhase[] = [
  { id: "sample", label: "Sampling more", tone: "brand", numberPrefix: "S" },
  { id: "budget", label: "Spending the budget", tone: "teal", numberPrefix: "B" },
];

const STEPS: GuidedStep[] = [
  {
    label: "the oracle ceiling",
    phase: "sample",
    title: "How often is a correct answer even in there",
    body: (
      <>
        pass@N — <span className="font-mono">1 − (1−p)^N</span> — is the chance that at least one of your
        N samples is right. It is what a <em>perfect</em> verifier would score, and a hard ceiling on any
        way of picking among the same samples.
        <br />
        <br />
        A model right 35% of the time has a correct answer somewhere in 16 samples almost always. Whether
        you can <em>find</em> it is a different question.
      </>
    ),
    hint: "Move N and watch the ceiling saturate long before the compute does.",
  },
  {
    label: "the verifier",
    phase: "sample",
    title: "Selection is the whole difference",
    body: (
      <>
        Now score each sample with an imperfect verifier and take the best. The correct answers are still
        there — nothing about the sampling changed — but the gap between the two curves is everything the
        verifier failed to pick out.
        <br />
        <br />
        At N = 16 the ceiling is 0.999. A near-perfect verifier collects all of it; one with noise 1.0
        collects <strong>75.9%</strong>; one with noise 3.0 collects <strong>50.0%</strong>.
      </>
    ),
    hint: "Raise the verifier noise. The ceiling does not move at all — only what you collect from it.",
  },
  {
    label: "more compute",
    phase: "budget",
    title: "Returns depend on the verifier, not the budget",
    body: (
      <>
        Multiply the sample budget by 8 (N = 16 → 128) and the payoff is <em>non-monotone</em> in
        verifier quality: <strong>+0.001</strong> at noise 0.2, <strong>+0.130</strong> at noise 1.0,{" "}
        <strong>+0.096</strong> at noise 2.0.
        <br />
        <br />
        A good verifier has already collected the ceiling and has nothing left to buy. A bad one cannot
        exploit the extra samples it is given. The middle is where compute actually converts.
      </>
    ),
    hint: "Try the extremes first — both ends of verifier quality waste the extra spend, for opposite reasons.",
  },
  {
    label: "train or infer",
    phase: "budget",
    title: "A bet on the verifier, not on the sampler",
    body: (
      <>
        Best-of-16 on a 35% model with a good verifier scores <strong>0.953</strong> — a number you would
        otherwise need a 95.3%-single-shot model to reach. With a poor verifier the same 16× spend
        scores <strong>0.500</strong>, matched by a 50% model answering once.
        <br />
        <br />
        Same sampler, same compute, completely different substitution rate against just training a
        better model.
      </>
    ),
    hint: "The equivalent-model bar is what your test-time spend is really buying.",
  },
];

const W = 560;
const P_BASE = 0.35;

export function TestTimeComputeViz({ className }: { className?: string }) {
  const [N, setN] = useState(16);
  const [sv, setSv] = useState(0.5);
  const [step, setStep] = useState(0);

  const point = useMemo(() => bestOfN(P_BASE, N, sv), [N, sv]);
  const ceiling = passAtN(P_BASE, N);

  const curve = useMemo(
    () => ({
      oracle: NS.map((n) => passAtN(P_BASE, n)),
      actual: NS.map((n) => bestOfN(P_BASE, n, sv, 3, 3000)),
    }),
    [sv]
  );

  const big = useMemo(() => bestOfN(P_BASE, 128, sv, 3, 3000), [sv]);
  const at16 = useMemo(() => bestOfN(P_BASE, 16, sv, 3, 3000), [sv]);

  const sx = (i: number) => 50 + (i / (NS.length - 1)) * (W - 100);
  const sy = (v: number) => 142 - v * 120;

  const bar = (label: string, v: number, color: string) => (
    <div className="flex items-center gap-2">
      <span className="w-44 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-4 flex-1 rounded bg-surface-elevated/50">
        <div className="h-4 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      <span className="w-12 shrink-0 font-mono text-[11px] text-white">{v.toFixed(3)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="What test-time compute actually buys"
      caption={`A model answers correctly with probability ${P_BASE} on any single attempt. Sample N attempts, score each with a verifier (correct ~ N(1, σ), wrong ~ N(0, σ)) and return the best. pass@N is the oracle — what a perfect verifier would score, and a ceiling on any selection over the same samples. Every figure is simulated over thousands of trials here.`}
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        <div className="flex flex-wrap items-end gap-5">
          {step !== 2 && (
            <div className="w-56">
              <VizSlider
                label="N — samples drawn"
                min={1}
                max={128}
                step={1}
                value={N}
                onChange={(v) => setN(Math.round(v))}
                format={(v) => v.toFixed(0)}
              />
            </div>
          )}
          {step >= 1 && (
            <div className="w-56">
              <VizSlider
                label="verifier noise σ (0 = perfect)"
                min={0.1}
                max={3}
                step={0.1}
                value={sv}
                onChange={setSv}
                format={(v) => v.toFixed(1)}
              />
            </div>
          )}
        </div>
      }
      stageNote={() => (
        <span className="font-mono text-[11px] text-slate-400">
          base model {(P_BASE * 100).toFixed(0)}% · {step === 2 ? "N = 16 vs 128" : `N = ${N}`}
        </span>
      )}
      stage={(i) => {
        if (i === 3)
          return (
            <div className="space-y-2 py-3">
              {bar("single sample, base model", P_BASE, VIZ.axis)}
              {bar(`best-of-16, verifier σ=${sv.toFixed(1)}`, at16, VIZ.teal)}
              {bar("oracle verifier, best-of-16", passAtN(P_BASE, 16), VIZ.brand)}
              <p className="pt-1 font-mono text-[10.5px] text-slate-400">
                your 16× spend equals a single-shot model of{" "}
                <span className="text-accent-teal">{(at16 * 100).toFixed(1)}%</span> accuracy — against{" "}
                {(P_BASE * 100).toFixed(0)}% for the model you have
              </p>
            </div>
          );
        if (i === 2)
          return (
            <div className="space-y-2 py-3">
              {bar("N = 16", at16, VIZ.teal)}
              {bar("N = 128 (8× the compute)", big, VIZ.brand)}
              <p className="pt-1 font-mono text-[10.5px] text-slate-400">
                8× the samples buys{" "}
                <span style={{ color: big - at16 < 0.02 ? VIZ.rose : VIZ.teal }}>
                  +{(big - at16).toFixed(3)}
                </span>{" "}
                at verifier noise {sv.toFixed(1)}
                {big - at16 < 0.02 ? " — effectively nothing" : ""}
              </p>
            </div>
          );
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
            {i >= 1 && (
              <path
                d={`${curve.oracle.map((v, n) => `${n === 0 ? "M" : "L"}${sx(n)},${sy(v)}`).join(" ")} ${curve.actual
                  .map((v, n) => `L${sx(NS.length - 1 - n)},${sy(curve.actual[NS.length - 1 - n])}`)
                  .join(" ")} Z`}
                fill={VIZ.rose}
                opacity={0.12}
              />
            )}
            <path
              d={curve.oracle.map((v, n) => `${n === 0 ? "M" : "L"}${sx(n)},${sy(v)}`).join(" ")}
              fill="none"
              stroke={VIZ.brand}
              strokeWidth={2}
            />
            {i >= 1 && (
              <path
                d={curve.actual.map((v, n) => `${n === 0 ? "M" : "L"}${sx(n)},${sy(v)}`).join(" ")}
                fill="none"
                stroke={VIZ.teal}
                strokeWidth={2}
              />
            )}
            {/* where the current N sits */}
            {(() => {
              const idx = NS.reduce((b, n, j) => (Math.abs(n - N) < Math.abs(NS[b] - N) ? j : b), 0);
              return <line x1={sx(idx)} x2={sx(idx)} y1={18} y2={146} stroke={VIZ.textBright} strokeWidth={1} opacity={0.5} />;
            })()}
            {NS.map((n, j) => (
              <text key={n} x={sx(j)} y={158} textAnchor="middle" fontSize={8} fill={VIZ.text}>
                {n}
              </text>
            ))}
            <text x={W - 50} y={sy(curve.oracle[NS.length - 1]) - 6} textAnchor="end" fontSize={8.5} fill={VIZ.brand}>
              pass@N — the oracle ceiling
            </text>
            {i >= 1 && (
              <text x={W - 50} y={sy(curve.actual[NS.length - 1]) + 14} textAnchor="end" fontSize={8.5} fill={VIZ.teal}>
                best-of-N with your verifier
              </text>
            )}
            <text x={50} y={14} fontSize={9} fill={VIZ.text}>
              accuracy
            </text>
            <text x={50} y={172} fontSize={8.5} fill={VIZ.text}>
              N — samples drawn per question
            </text>
          </svg>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <GuidedCard label="the ceiling" accent={VIZ.brand}>
            <span className="font-mono text-[11.5px] text-slate-300">
              pass@{N} = <span className="text-brand-300">{ceiling.toFixed(3)}</span>
              <br />
              a correct answer is in the batch this often
            </span>
          </GuidedCard>
          {i >= 1 && (
            <GuidedCard
              label="what the verifier collects"
              accent={point / ceiling > 0.9 ? VIZ.teal : VIZ.rose}
            >
              <span className="font-mono text-[11.5px] text-slate-300">
                best-of-{N} = <span className="text-accent-teal">{point.toFixed(3)}</span>
                <br />
                <span style={{ color: point / ceiling > 0.9 ? VIZ.teal : VIZ.rose }}>
                  {((point / ceiling) * 100).toFixed(1)}%
                </span>{" "}
                of the achievable gain
              </span>
            </GuidedCard>
          )}
          {i === 3 && (
            <GuidedPayoff label="what you are actually betting on">
              The samples containing a correct answer are there regardless — pass@16 is{" "}
              {passAtN(P_BASE, 16).toFixed(3)} whatever verifier you own. What changes is how much of
              that you collect: with σ = 0.5 best-of-16 scores 0.953, equivalent to owning a
              95.3%-single-shot model instead of the 35% one you have; with σ = 3.0 the identical spend
              scores 0.500. So &ldquo;buy accuracy at inference instead of training a better model&rdquo;
              is a bet on <em>selection quality</em>, and the sampling side of the system tells you
              nothing about whether the bet is good. Measure the verifier against pass@N before you
              budget for the samples — that ratio, not the sample count, is the thing to improve.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i === 0 ? (
          <>
            <GuidedLegend color={VIZ.brand}>pass@N (oracle)</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.brand}>pass@N (oracle)</GuidedLegend>
            <GuidedLegend color={VIZ.teal}>best-of-N with your verifier</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>what selection lost</GuidedLegend>
          </>
        )
      }
    />
  );
}
