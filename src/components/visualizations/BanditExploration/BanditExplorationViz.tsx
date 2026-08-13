"use client";

/**
 * Three exploration strategies on one bandit — ε-greedy, UCB and Thompson
 * sampling — compared by cumulative regret.
 *
 * Everything on screen is simulated in the browser at render time; no number is
 * written down. 200 independent runs of 3000 pulls are averaged per strategy,
 * on the same five Bernoulli arms with the same seeds.
 *
 * Why cumulative regret and not average reward: regret makes the *shape* of the
 * difference legible. A strategy that never stops exploring at a fixed rate has
 * a regret curve that is asymptotically a straight line, and one that shrinks
 * its exploration has a curve that bends. Reward curves for all three look like
 * flat lines just under 0.70 and the distinction is invisible.
 *
 * The ε-greedy asymptote is exact and worth checking: once the greedy arm *is*
 * the best arm, ε-greedy pulls a uniformly random arm ε of the time, so it
 * spends ε · (ΣΔ)/K regret per step forever. With these arms that is
 * ε × 0.214. Measured over the last quarter of the run (200 runs) it comes out
 * at 0.0642 for ε = 0.30 against 0.0642 predicted, and 0.0429 for ε = 0.20
 * against 0.0428 — inside one standard error both times. Below about ε = 0.15
 * the measured slope sits *above* the prediction (z = 2.9 at ε = 0.10,
 * z = 4.3 at ε = 0.05) because the premise fails: at 3000 pulls the agent has
 * not reliably identified the best arm, and the excess is misidentification
 * rather than the exploration tax. Both halves of that are on screen.
 *
 * Arm means are spread wide enough (0.25 … 0.70) that 3000 pulls is long
 * enough to reach the asymptote at moderate ε. Closer arms are more realistic
 * but need ~10× the horizon before any of this is visible, which is a slow viz
 * that teaches nothing extra.
 */

import { useEffect, useMemo, useState } from "react";
import {
  VIZ,
  VizButton,
  VizFrame,
  VizSlider,
  VizStat,
  scale,
  seededRandom,
  gaussian,
} from "../viz-kit";

/** True success probabilities. Arm 4 is optimal; nothing tells the agent that. */
const MEANS = [0.25, 0.4, 0.5, 0.58, 0.7];
const K = MEANS.length;
const BEST_ARM = MEANS.indexOf(Math.max(...MEANS));
const BEST = MEANS[BEST_ARM];
/** Per-pull regret of each arm, and the mean gap that sets ε-greedy's slope. */
const GAPS = MEANS.map((m) => BEST - m);
const MEAN_GAP = GAPS.reduce((a, b) => a + b, 0) / K;

const T = 3000;
const RUNS = 200;
const STRIDE = 20; // curve is sampled every 20 pulls for the SVG path
const DECAY_TAU = 200; // ε_t = ε₀ / (1 + t/τ)

const COLORS = { eps: VIZ.brand, ucb: VIZ.orange, ts: VIZ.teal } as const;

type Strategy = "eps" | "ucb" | "ts";
interface Opts {
  eps?: number;
  decay?: boolean;
  c?: number;
}
interface Result {
  /** Mean cumulative regret, sampled every STRIDE pulls. */
  curve: number[];
  final: number;
  /** Mean regret per pull over the first and last quarter of the run. */
  earlySlope: number;
  lateSlope: number;
  /** Share of pulls given to each arm. */
  share: number[];
}

/** Marsaglia–Tsang gamma sampler; shape ≥ 1 only, which is all Beta(1+S,1+F) needs. */
function gammaSample(rng: () => number, k: number): number {
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = gaussian(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function betaSample(rng: () => number, a: number, b: number) {
  const x = gammaSample(rng, a);
  return x / (x + gammaSample(rng, b));
}

function argmax(x: Float64Array) {
  let best = -Infinity;
  let k = 0;
  for (let i = 0; i < x.length; i++)
    if (x[i] > best) {
      best = x[i];
      k = i;
    }
  return k;
}

/** One run of `T` pulls. Returns cumulative regret at every pull, and pull counts. */
function simulate(strategy: Strategy, opts: Opts, seed: number) {
  const rng = seededRandom(seed);
  const Q = new Float64Array(K); // running mean reward per arm
  const N = new Float64Array(K); // pull counts
  const S = new Float64Array(K); // Beta successes
  const F = new Float64Array(K); // Beta failures
  const regret = new Float64Array(T + 1);
  const pulls = new Float64Array(K);
  let cum = 0;

  for (let t = 0; t < T; t++) {
    let a: number;
    if (t < K) {
      a = t; // every strategy needs one pull of each arm before it can rank them
    } else if (strategy === "eps") {
      const eps = opts.decay ? opts.eps! / (1 + t / DECAY_TAU) : opts.eps!;
      a = rng() < eps ? Math.floor(rng() * K) : argmax(Q);
    } else if (strategy === "ucb") {
      let best = -Infinity;
      a = 0;
      for (let i = 0; i < K; i++) {
        const u = Q[i] + opts.c! * Math.sqrt(Math.log(t + 1) / N[i]);
        if (u > best) {
          best = u;
          a = i;
        }
      }
    } else {
      let best = -Infinity;
      a = 0;
      for (let i = 0; i < K; i++) {
        const draw = betaSample(rng, 1 + S[i], 1 + F[i]);
        if (draw > best) {
          best = draw;
          a = i;
        }
      }
    }

    const r = rng() < MEANS[a] ? 1 : 0;
    N[a] += 1;
    Q[a] += (r - Q[a]) / N[a];
    if (r) S[a] += 1;
    else F[a] += 1;
    pulls[a] += 1;
    cum += GAPS[a];
    regret[t + 1] = cum;
  }
  return { regret, pulls };
}

/** Average `RUNS` independent runs, all strategies sharing the same seed set. */
function average(strategy: Strategy, opts: Opts): Result {
  const mean = new Float64Array(T + 1);
  const share = new Float64Array(K);
  for (let r = 0; r < RUNS; r++) {
    const out = simulate(strategy, opts, 1000 + r * 7919);
    for (let t = 0; t <= T; t++) mean[t] += out.regret[t] / RUNS;
    for (let i = 0; i < K; i++) share[i] += out.pulls[i] / (RUNS * T);
  }
  const q = Math.floor(T / 4);
  const curve: number[] = [];
  for (let t = 0; t <= T; t += STRIDE) curve.push(mean[t]);
  return {
    curve,
    final: mean[T],
    earlySlope: (mean[2 * q] - mean[q]) / q,
    lateSlope: (mean[T] - mean[3 * q]) / (T - 3 * q),
    share: Array.from(share),
  };
}

/** Thompson has no hyperparameter, so its 200 runs are computed once per page. */
let thompsonCache: Result | null = null;

const W = 560;
const H = 250;
const PAD = { l: 46, r: 12, t: 12, b: 30 };
const Y_MAX = 265; // fixed so curves do not rescale under the slider

const sx = scale(0, T, PAD.l, W - PAD.r);
const sy = scale(0, Y_MAX, H - PAD.b, PAD.t);

function path(curve: number[]) {
  return curve
    .map((v, i) => `${i === 0 ? "M" : "L"}${sx(i * STRIDE).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");
}

function StrategyCard({
  name,
  color,
  result,
  detail,
}: {
  name: string;
  color: string;
  result: Result | null;
  detail: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-elevated/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold text-white">{name}</span>
      </div>
      {result ? (
        <>
          <div className="flex gap-4 mb-2">
            <VizStat label="regret" value={result.final.toFixed(1)} color={color} />
            <VizStat
              label="late slope"
              value={result.lateSlope.toFixed(4)}
              color={VIZ.textBright}
            />
          </div>
          <svg viewBox="0 0 150 36" className="w-full">
            {result.share.map((s, i) => {
              const x = 2 + i * 30;
              const h = Math.max(1, s * 24);
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={34 - h}
                    width={20}
                    height={h}
                    rx={1.5}
                    fill={i === BEST_ARM ? color : VIZ.axis}
                  />
                  <text
                    x={x + 10}
                    y={34 - h - 2}
                    textAnchor="middle"
                    fontSize={7}
                    fill={i === BEST_ARM ? VIZ.textBright : VIZ.text}
                  >
                    {(s * 100).toFixed(0)}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="text-[10px] text-slate-500 -mt-1 mb-2">% of pulls per arm</p>
          <p className="text-[11px] text-slate-400 leading-snug">{detail}</p>
        </>
      ) : (
        <p className="text-[11px] text-slate-500">simulating 200 runs…</p>
      )}
    </div>
  );
}

export function BanditExplorationViz({ className }: { className?: string }) {
  const [eps, setEps] = useState(0.1);
  const [decay, setDecay] = useState(false);
  const [c, setC] = useState(1);

  const epsResult = useMemo(() => average("eps", { eps, decay }), [eps, decay]);
  const ucbResult = useMemo(() => average("ucb", { c }), [c]);

  // Thompson needs ~1M Beta draws; run it after first paint, then reuse.
  const [tsResult, setTsResult] = useState<Result | null>(thompsonCache);
  useEffect(() => {
    if (thompsonCache) return;
    const id = setTimeout(() => {
      thompsonCache = average("ts", {});
      setTsResult(thompsonCache);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const predicted = eps * MEAN_GAP;
  const ratio = (r: Result) => (r.lateSlope / r.earlySlope).toFixed(2);

  return (
    <VizFrame
      title="Three ways to spend a pull"
      caption="Five Bernoulli arms with success rates 0.25 / 0.40 / 0.50 / 0.58 / 0.70. Each curve is the mean cumulative regret — reward given up against always pulling the best arm — over 200 independent runs of 3000 pulls, all strategies sharing the same seeds. Every number is simulated in your browser, not stored."
      className={className}
    >
      {/* the arms themselves */}
      <div className="flex items-end gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-wide text-slate-500 pb-1">arms</span>
        {MEANS.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span
              className="font-mono text-[10px]"
              style={{ color: i === BEST_ARM ? VIZ.teal : VIZ.text }}
            >
              {m.toFixed(2)}
            </span>
            <div
              className="w-8 rounded-sm"
              style={{
                height: `${m * 34}px`,
                background: i === BEST_ARM ? VIZ.teal : VIZ.axis,
              }}
            />
          </div>
        ))}
        <span className="text-[10px] text-slate-500 pb-1">
          the agent sees none of these — only 0/1 rewards
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 65, 130, 195, 260].map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={sy(v)}
              y2={sy(v)}
              stroke={VIZ.grid}
              strokeWidth={1}
            />
            <text x={PAD.l - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
              {v}
            </text>
          </g>
        ))}
        {[0, 1000, 2000, 3000].map((t) => (
          <text key={t} x={sx(t)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill={VIZ.text}>
            {t}
          </text>
        ))}
        <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          pulls
        </text>
        <text
          x={12}
          y={H / 2}
          textAnchor="middle"
          fontSize={9}
          fill={VIZ.text}
          transform={`rotate(-90 12 ${H / 2})`}
        >
          cumulative regret
        </text>

        {/* the exploration tax ε-greedy pays forever, drawn as a straight line
            through the curve's midpoint: slope ε · mean gap */}
        {!decay && eps > 0 && (
          <line
            x1={sx(T / 2)}
            y1={sy(epsResult.curve[Math.floor(epsResult.curve.length / 2)])}
            x2={sx(T)}
            y2={sy(
              epsResult.curve[Math.floor(epsResult.curve.length / 2)] + predicted * (T / 2)
            )}
            stroke={VIZ.brandLight}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        <path d={path(epsResult.curve)} fill="none" stroke={COLORS.eps} strokeWidth={2} />
        <path d={path(ucbResult.curve)} fill="none" stroke={COLORS.ucb} strokeWidth={2} />
        {tsResult && (
          <path d={path(tsResult.curve)} fill="none" stroke={COLORS.ts} strokeWidth={2} />
        )}

        {/* legend, top-left: cumulative regret starting at 0 cannot climb into
            that corner, whatever the sliders are set to */}
        <g transform={`translate(${PAD.l + 10}, ${PAD.t + 12})`}>
          {(
            [
              [COLORS.eps, decay ? `ε-greedy, ε decaying` : `ε-greedy, ε = ${eps.toFixed(2)}`],
              [COLORS.ucb, `UCB, c = ${c.toFixed(2)}`],
              [COLORS.ts, `Thompson (no knob)`],
            ] as const
          ).map(([col, label], i) => (
            <g key={label} transform={`translate(0, ${i * 13})`}>
              <line x1={0} x2={14} y1={0} y2={0} stroke={col} strokeWidth={2} />
              <text x={19} y={3} fontSize={9} fill={VIZ.textBright}>
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div className="grid gap-3 sm:grid-cols-3 mt-3">
        <StrategyCard
          name={decay ? "ε-greedy (decaying)" : "ε-greedy"}
          color={COLORS.eps}
          result={epsResult}
          detail={
            decay ? (
              <>ε shrinks as ε₀/(1 + t/{DECAY_TAU}), so the tax fades instead of accruing.</>
            ) : (
              <>
                predicted tax = ε × mean gap ={" "}
                <span className="font-mono text-slate-300">{predicted.toFixed(4)}</span> per pull
              </>
            )
          }
        />
        <StrategyCard
          name="UCB"
          color={COLORS.ucb}
          result={ucbResult}
          detail={
            <>
              late slope is {ratio(ucbResult)}× the early slope — exploration is winding down
            </>
          }
        />
        <StrategyCard
          name="Thompson sampling"
          color={COLORS.ts}
          result={tsResult}
          detail={
            tsResult ? (
              <>late slope is {ratio(tsResult)}× the early slope, with nothing to tune</>
            ) : null
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <VizSlider
          label="ε — exploration rate"
          min={0}
          max={0.3}
          step={0.01}
          value={eps}
          onChange={setEps}
          format={(v) => v.toFixed(2)}
        />
        <VizSlider
          label="c — UCB exploration constant"
          min={0.2}
          max={1.5}
          step={0.05}
          value={c}
          onChange={setC}
          format={(v) => v.toFixed(2)}
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton active={!decay} onClick={() => setDecay(false)}>
          fixed ε
        </VizButton>
        <VizButton active={decay} onClick={() => setDecay(true)}>
          decay ε as 1/t
        </VizButton>
      </div>
    </VizFrame>
  );
}
