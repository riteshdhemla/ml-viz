"use client";

/**
 * Why mini-batch noise acts as a regularizer, run rather than asserted.
 *
 * The lesson could previously only *state* that SGD's gradient noise helps
 * generalization, and the reason lived in the explanation text of a single
 * multiple-choice answer. The claim has two halves, and both are testable:
 *
 *   1. Noise lets SGD escape sharp minima. The escape rate out of a basin goes
 *      as exp(−2ΔL / ησ²), so shrinking the batch (raising σ) turns a basin the
 *      optimizer could never leave into one it leaves routinely.
 *   2. Flat minima generalize better. Test loss is not the training loss, it is
 *      *a slightly shifted copy of it* — a different finite sample puts the
 *      valley in a slightly different place. A shift costs you almost nothing
 *      in a wide basin and a great deal in a narrow one.
 *
 * The landscape is a two-well loss with the wells deliberately arranged so the
 * greedy answer is the wrong one:
 *
 *                    train loss   test loss   gap     L″ (curvature)
 *   sharp  θ ≈ −1.20   −0.2429     −0.0196   0.2233      10.17
 *   flat   θ ≈ +1.15   −0.2134     −0.1880   0.0254       0.62
 *
 * The sharp minimum is **deeper on the training loss** and 16× more curved, and
 * its generalization gap is 8.8× larger. Any optimizer that just wants low
 * training loss should prefer it, and full-batch gradient descent does.
 *
 * Gradient noise is tied to batch size the way it actually scales, σ_B = σ₁/√B
 * with σ₁ = 9.0. Every run starts inside the sharp basin, explores for 1800
 * steps at η = 0.02, then cosine-anneals the noise to zero over 900 more so it
 * settles instead of being scored mid-bounce. Over 240 seeds per batch size:
 *
 *   B = 1024…32   0% escape    train −0.2429   test −0.0195
 *   B = 16        5% escape    train −0.2405   test −0.0268
 *   B = 8        47% escape    train −0.2197   test −0.0955
 *   B = 4        65% escape    train −0.2077   test −0.1222   ← best test loss
 *   B = 1        61% escape    train −0.1903   test −0.1082
 *
 * Read the two loss columns against each other: large batches achieve the
 * *lowest training loss of any setting here* and the worst test loss of any
 * setting here. That inversion is the entire argument, and it is why the
 * effect deserves the name "implicit regularization" rather than "helpful
 * jitter".
 *
 * The last row is the honest limit, and the reason the sweep is a curve rather
 * than an arrow: past B ≈ 4 more noise stops helping. The escape fraction
 * plateaus around 61–66% while the training loss keeps degrading, because a run
 * that never stops bouncing cannot settle anywhere. Noise buys exploration, and
 * exploration has a price.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat, scale, useAnimationLoop } from "../viz-kit";

// --- the loss landscape -----------------------------------------------------
const SHARP = { c: -1.2, w: 0.16, a: 0.26 };
const FLAT = { c: 1.2, w: 0.62, a: 0.23 };
const TILT = 0.012;
/** How far the test loss is displaced from the training loss. */
const SHIFT = 0.3;

const well = (t: number, W: { c: number; w: number; a: number }) => {
  const d = t - W.c;
  return -W.a * Math.exp(-(d * d) / (2 * W.w * W.w));
};

/** Training loss: the surface the optimizer can actually see. */
const lossTrain = (t: number) => well(t, SHARP) + well(t, FLAT) + TILT * t * t;
/** Test loss: the same surface, displaced — a different sample of the world. */
const lossTest = (t: number) => lossTrain(t - SHIFT);

const gradTrain = (t: number) => {
  const g = (W: { c: number; w: number; a: number }) => {
    const d = t - W.c;
    return W.a * (d / (W.w * W.w)) * Math.exp(-(d * d) / (2 * W.w * W.w));
  };
  return g(SHARP) + g(FLAT) + 2 * TILT * t;
};

// Located by dense scan at build time; see the doc comment.
const SHARP_MIN = -1.197;
const FLAT_MIN = 1.154;
/** Ridge between the basins — which side a run ends on is decided here. */
const BARRIER = -0.682;

/** Second derivative by central difference, for the curvature readout. */
const curvature = (t: number) => (lossTrain(t + 1e-3) - 2 * lossTrain(t) + lossTrain(t - 1e-3)) / 1e-6;

// --- optimizer --------------------------------------------------------------
const SIGMA1 = 9.0; // gradient noise of a single-sample estimate
const ETA = 0.02;
const EXPLORE = 1800;
const ANNEAL = 900;
const TOTAL = EXPLORE + ANNEAL;
const SWEEP_RUNS = 240;
const BATCHES = [1024, 256, 64, 32, 16, 8, 4, 2, 1];
const LIVE_PARTICLES = 28;
const STEPS_PER_FRAME = 6;

const sigmaFor = (B: number) => SIGMA1 / Math.sqrt(B);

function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number, mean = 0, sd = 1) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Noise multiplier at step s: full strength while exploring, cosine to 0 after. */
function anneal(step: number) {
  if (step < EXPLORE) return 1;
  const f = (step - EXPLORE) / ANNEAL;
  return 0.5 * (1 + Math.cos(Math.PI * f));
}

/** One SGD step on the *training* loss. The optimizer never sees the test loss. */
function sgdStep(theta: number, rng: () => number, sigma: number, step: number) {
  const next = theta - ETA * (gradTrain(theta) + gaussian(rng, 0, sigma * anneal(step)));
  return next < -3 ? -3 : next > 3 ? 3 : next;
}

interface SweepRow {
  B: number;
  sigma: number;
  flat: number;
  train: number;
  test: number;
}

/** Full explore-then-anneal runs, all starting inside the sharp basin. */
function sweepBatch(B: number): SweepRow {
  const sigma = sigmaFor(B);
  let flat = 0;
  let train = 0;
  let test = 0;
  for (let r = 0; r < SWEEP_RUNS; r++) {
    const rng = seededRandom(2000 + r * 7);
    let t = SHARP_MIN + gaussian(rng, 0, 0.05);
    for (let s = 0; s < TOTAL; s++) t = sgdStep(t, rng, sigma, s);
    if (t > BARRIER) flat++;
    train += lossTrain(t);
    test += lossTest(t);
  }
  return { B, sigma, flat: flat / SWEEP_RUNS, train: train / SWEEP_RUNS, test: test / SWEEP_RUNS };
}

// --- geometry ---------------------------------------------------------------
const W = 620;
const H_LAND = 250;
const H_SWEEP = 150;
const PAD = { l: 52, r: 16, t: 16, b: 30 };
const T_LO = -2.4;
const T_HI = 2.4;
const L_LO = -0.3;
const L_HI = 0.12;

const fmt = (v: number) => v.toFixed(4).replace("-", "−");

export function SGDNoiseViz({ className }: { className?: string }) {
  const [batch, setBatch] = useState(8);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [thetas, setThetas] = useState<number[]>([]);

  const rngs = useRef<(() => number)[]>([]);

  const reset = useCallback(() => {
    const next: number[] = [];
    rngs.current = [];
    for (let i = 0; i < LIVE_PARTICLES; i++) {
      const rng = seededRandom(7000 + i * 31 + batch);
      rngs.current.push(rng);
      next.push(SHARP_MIN + gaussian(rng, 0, 0.05));
    }
    setThetas(next);
    setStep(0);
  }, [batch]);

  useEffect(reset, [reset]);

  const sigma = sigmaFor(batch);

  useAnimationLoop(() => {
    setThetas((prev) => {
      const next = prev.slice();
      for (let k = 0; k < STEPS_PER_FRAME; k++) {
        const s = step + k;
        if (s >= TOTAL) break;
        for (let i = 0; i < next.length; i++) next[i] = sgdStep(next[i], rngs.current[i], sigma, s);
      }
      return next;
    });
    setStep((s) => Math.min(s + STEPS_PER_FRAME, TOTAL));
  }, running && step < TOTAL);

  // The batch-size sweep is expensive (~70 ms each) and λ-independent, so each
  // row is computed on first use and kept.
  const cache = useRef(new Map<number, SweepRow>());
  const sweep = useMemo(() => {
    return BATCHES.map((B) => {
      const hit = cache.current.get(B);
      if (hit) return hit;
      const row = sweepBatch(B);
      cache.current.set(B, row);
      return row;
    });
  }, []);

  const current = sweep.find((r) => r.B === batch)!;
  const best = sweep.reduce((a, b) => (b.test < a.test ? b : a));
  const worst = sweep.reduce((a, b) => (b.test > a.test ? b : a));

  const liveFlat = thetas.filter((t) => t > BARRIER).length;

  const sx = scale(T_LO, T_HI, PAD.l, W - PAD.r);
  const sy = scale(L_LO, L_HI, H_LAND - PAD.b, PAD.t);

  const curveOf = (f: (t: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 320; i++) {
      const t = T_LO + (i / 320) * (T_HI - T_LO);
      pts.push(`${i === 0 ? "M" : "L"}${sx(t).toFixed(1)},${sy(f(t)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  // sweep panel scales: batch size on a log axis, descending left → right
  const sbx = scale(Math.log2(BATCHES[0]), 0, PAD.l, W - PAD.r);
  const testLo = Math.min(...sweep.map((r) => r.test)) - 0.02;
  const testHi = Math.max(...sweep.map((r) => r.test)) + 0.02;
  const sby = scale(testLo, testHi, H_SWEEP - PAD.b, PAD.t);
  const sbyFrac = scale(0, 1, H_SWEEP - PAD.b, PAD.t);

  const phase = step >= TOTAL ? "settled" : step < EXPLORE ? "exploring" : "annealing";

  return (
    <VizFrame
      title="What the noise is actually for"
      caption={`Two minima. The sharp one on the left has the LOWER training loss (${fmt(lossTrain(SHARP_MIN))} against ${fmt(lossTrain(FLAT_MIN))}) and is 16× more curved. But the test loss is the training loss displaced slightly — a different sample puts the valley somewhere slightly different — and a displacement barely moves you in a wide basin while it throws you up the wall of a narrow one. Every run starts in the sharp basin. Shrink the batch, and the gradient noise σ = σ₁/√B grows until runs start escaping to the flat basin, which is worse on training loss and much better on test loss.`}
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs text-slate-400">batch size</span>
        {BATCHES.map((B) => (
          <VizButton key={B} active={B === batch} onClick={() => setBatch(B)}>
            {B}
          </VizButton>
        ))}
        <VizButton className="ml-auto" onClick={() => setRunning((r) => !r)} active={running}>
          {running ? "pause" : step >= TOTAL ? "run again" : "run"}
        </VizButton>
        <VizButton
          onClick={() => {
            setRunning(false);
            reset();
          }}
        >
          reset
        </VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H_LAND}`} className="w-full">
        {/* basin shading, split at the ridge */}
        <rect x={PAD.l} y={PAD.t} width={sx(BARRIER) - PAD.l} height={H_LAND - PAD.b - PAD.t} fill={VIZ.rose} opacity={0.06} />
        <rect x={sx(BARRIER)} y={PAD.t} width={W - PAD.r - sx(BARRIER)} height={H_LAND - PAD.b - PAD.t} fill={VIZ.teal} opacity={0.06} />

        <path d={curveOf(lossTest)} fill="none" stroke={VIZ.rose} strokeWidth={1.8} strokeDasharray="5 3" opacity={0.85} />
        <path d={curveOf(lossTrain)} fill="none" stroke={VIZ.teal} strokeWidth={2.2} />

        {/* the two minima, each labelled with what it costs on both losses */}
        {[
          { t: SHARP_MIN, name: "sharp", col: VIZ.rose, dx: 6 },
          { t: FLAT_MIN, name: "flat", col: VIZ.teal, dx: -6 },
        ].map((m) => (
          <g key={m.name}>
            <line x1={sx(m.t)} y1={sy(lossTrain(m.t))} x2={sx(m.t)} y2={sy(lossTest(m.t))} stroke={m.col} strokeWidth={2.5} />
            <circle cx={sx(m.t)} cy={sy(lossTrain(m.t))} r={4} fill={VIZ.teal} />
            <circle cx={sx(m.t)} cy={sy(lossTest(m.t))} r={4} fill={VIZ.rose} />
            <text
              x={sx(m.t) + m.dx}
              y={sy(lossTest(m.t)) - 8}
              textAnchor={m.dx > 0 ? "start" : "end"}
              fontSize={9.5}
              fill={m.col}
              stroke={VIZ.card}
              strokeWidth={3}
              paintOrder="stroke"
            >
              {m.name}: gap {fmt(lossTest(m.t) - lossTrain(m.t))}
            </text>
            <text
              x={sx(m.t) + m.dx}
              y={sy(lossTest(m.t)) + 3}
              textAnchor={m.dx > 0 ? "start" : "end"}
              fontSize={8.5}
              fill={VIZ.text}
              stroke={VIZ.card}
              strokeWidth={3}
              paintOrder="stroke"
            >
              L″ = {curvature(m.t).toFixed(2)}
            </text>
          </g>
        ))}

        {/* live optimizer particles */}
        {thetas.map((t, i) => (
          <circle
            key={i}
            cx={sx(t)}
            cy={sy(lossTrain(t)) - 6}
            r={3}
            fill={t > BARRIER ? VIZ.teal : VIZ.yellow}
            opacity={0.85}
          />
        ))}

        <line x1={PAD.l} x2={W - PAD.r} y1={H_LAND - PAD.b} y2={H_LAND - PAD.b} stroke={VIZ.axis} strokeWidth={1} />
        <text x={(PAD.l + W - PAD.r) / 2} y={H_LAND - 4} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          θ — parameter
        </text>
        <text x={PAD.l - 6} y={sy(L_LO) + 2} textAnchor="end" fontSize={9} fill={VIZ.text}>
          {L_LO}
        </text>
        <text x={PAD.l - 6} y={sy(0) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
          0
        </text>

        <g transform={`translate(${W - PAD.r - 150}, ${PAD.t + 2})`}>
          <line x1={0} x2={16} y1={0} y2={0} stroke={VIZ.teal} strokeWidth={2.2} />
          <text x={21} y={3} fontSize={9.5} fill={VIZ.textBright}>
            train loss (what SGD sees)
          </text>
          <line x1={0} x2={16} y1={13} y2={13} stroke={VIZ.rose} strokeWidth={1.8} strokeDasharray="5 3" />
          <text x={21} y={16} fontSize={9.5} fill={VIZ.textBright}>
            test loss (displaced)
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1 mb-3">
        <VizStat label="σ = σ₁/√B" value={sigma.toFixed(2)} color={VIZ.yellow} />
        {/* Any escape at all is the phenomenon; zero escapes is the large-batch
            trap. Colouring by a majority threshold called 12/28 a failure. */}
        <VizStat
          label="live runs in flat basin"
          value={`${liveFlat} / ${thetas.length}`}
          color={liveFlat > 0 ? VIZ.teal : VIZ.rose}
        />
        <VizStat label="phase" value={`${phase} (${step}/${TOTAL})`} />
        <VizStat label={`escape rate over ${SWEEP_RUNS} seeds`} value={`${(current.flat * 100).toFixed(0)}%`} color={VIZ.teal} />
        <VizStat label="final train loss" value={fmt(current.train)} color={VIZ.teal} />
        <VizStat label="final test loss" value={fmt(current.test)} color={VIZ.rose} />
      </div>

      <svg viewBox={`0 0 ${W} ${H_SWEEP}`} className="w-full">
        <text x={PAD.l} y={PAD.t - 4} fontSize={9.5} fill={VIZ.textBright}>
          every batch size, {SWEEP_RUNS} seeds each
        </text>
        {/* test-loss scale, so the curve can be read and not just compared */}
        {[worst.test, best.test].map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={sby(v)}
              y2={sby(v)}
              stroke={VIZ.grid}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text x={PAD.l - 6} y={sby(v) + 3} textAnchor="end" fontSize={8.5} fill={VIZ.text}>
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* escape fraction */}
        <path
          d={sweep.map((r, i) => `${i === 0 ? "M" : "L"}${sbx(Math.log2(r.B)).toFixed(1)},${sbyFrac(r.flat).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={VIZ.brandLight}
          strokeWidth={1.8}
          strokeDasharray="4 3"
        />
        {/* final test loss */}
        <path
          d={sweep.map((r, i) => `${i === 0 ? "M" : "L"}${sbx(Math.log2(r.B)).toFixed(1)},${sby(r.test).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={VIZ.rose}
          strokeWidth={2.2}
        />
        {sweep.map((r) => (
          <circle
            key={r.B}
            cx={sbx(Math.log2(r.B))}
            cy={sby(r.test)}
            r={r.B === batch ? 5 : 3}
            fill={r.B === batch ? VIZ.yellow : VIZ.rose}
          />
        ))}
        <circle cx={sbx(Math.log2(best.B))} cy={sby(best.test)} r={7} fill="none" stroke={VIZ.teal} strokeWidth={1.5} />
        <text x={sbx(Math.log2(best.B))} y={sby(best.test) - 11} textAnchor="middle" fontSize={9} fill={VIZ.teal}>
          best
        </text>

        <line x1={PAD.l} x2={W - PAD.r} y1={H_SWEEP - PAD.b} y2={H_SWEEP - PAD.b} stroke={VIZ.axis} strokeWidth={1} />
        {sweep.map((r) => (
          <text key={r.B} x={sbx(Math.log2(r.B))} y={H_SWEEP - PAD.b + 13} textAnchor="middle" fontSize={8.5} fill={r.B === batch ? VIZ.yellow : VIZ.text}>
            {r.B}
          </text>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H_SWEEP - 3} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          batch size (large ← → small, i.e. more noise to the right)
        </text>
        <g transform={`translate(${PAD.l + 6}, ${PAD.t + 8})`}>
          <line x1={0} x2={16} y1={0} y2={0} stroke={VIZ.rose} strokeWidth={2.2} />
          <text x={21} y={3} fontSize={9} fill={VIZ.textBright}>
            final test loss
          </text>
          <line x1={0} x2={16} y1={12} y2={12} stroke={VIZ.brandLight} strokeWidth={1.8} strokeDasharray="4 3" />
          <text x={21} y={15} fontSize={9} fill={VIZ.textBright}>
            fraction escaping to the flat basin (0 → 1)
          </text>
        </g>
      </svg>

      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
        Large batches never leave: at B = {worst.B} every one of the {SWEEP_RUNS} runs finishes in the
        sharp basin with the best training loss on the chart ({fmt(worst.train)}) and the worst test
        loss ({fmt(worst.test)}). The best test loss is at B = {best.B} ({fmt(best.test)}). Past that
        the curve turns back up: noise buys exploration, and beyond a point the run simply never
        settles.
      </p>
    </VizFrame>
  );
}
