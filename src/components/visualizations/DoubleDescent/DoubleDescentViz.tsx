"use client";

/**
 * Double descent, run for real in the browser rather than drawn from memory.
 *
 * The lesson states the curve and sketches it in ASCII. That is the one place a
 * reader is asked to take the modern half of the story on faith, so this
 * component computes it: random-ReLU-feature ridge regression on a fixed
 * training set of n = 40 noisy samples, sweeping the feature count p from 1 to
 * 160 and measuring train and test MSE at every p. Nothing here is a
 * hand-drawn curve.
 *
 * Why random features rather than a neural network: the min-norm interpolant
 * has a closed form, so the sweep is exact and deterministic instead of being
 * confounded by an optimizer's own path. The solve is done in the dual,
 *
 *     w = Φᵀ(ΦΦᵀ + λI)⁻¹ y
 *
 * which is an n × n system (40 × 40) for every p, and — this is the part that
 * makes the whole picture work — converges to the *minimum-norm* least-squares
 * solution as λ → 0 in **both** regimes. Under-parameterized (p < n) it gives
 * ordinary least squares; over-parameterized (p > n) it picks the smallest-norm
 * interpolant out of the infinitely many that fit the data exactly. That is
 * precisely the solution gradient descent from zero initialization converges
 * to, which is why this toy is a fair model of the deep-learning phenomenon.
 *
 * Measured at λ = 10⁻³, averaged over 6 independent draws (seeds 101…166):
 *
 *   classical dip   p = 14   test 1.184      ← the classical "sweet spot"
 *   peak            p = 39   test 13.86      ← 11.7× the dip, at p ≈ n
 *   second descent  p = 160  test 0.867      ← 27% BELOW the classical dip
 *
 * The last line is the entire point and the reason the ASCII sketch was not
 * enough: the overparameterized regime does not merely recover, it *wins*.
 *
 * ‖w‖ is plotted underneath because it is the mechanism, not a decoration. It
 * peaks at p = 39–40 (14.4 at λ = 10⁻³, 88.8 at λ = 10⁻⁶) and decays to 1.55 by
 * p = 160. At p ≈ n there is exactly one interpolant and the model is forced to
 * take it however wild it is; past the threshold there are many, and the extra
 * features buy the freedom to choose a smooth one. Test error and ‖w‖ peak at
 * the same p in every configuration tried, which is the claim the panel lets a
 * reader check rather than believe.
 *
 * The λ buttons are the payoff. The spike is a near-singular ΦΦᵀ, so ridge
 * removes it directly: peak test error falls 747.7 → 13.9 → 5.7 (λ = 10⁻⁶,
 * 10⁻³, 10⁻²) and at λ = 0.1 the interior peak is gone entirely — the curve is
 * the ordinary monotone one classical theory predicts. Double descent is a
 * phenomenon of *unregularized* interpolation, and that is testable here in one
 * click rather than asserted.
 *
 * The panels are split rather than stacked on one axis because the two series
 * need eleven decades between them: training error reaches 10⁻⁸ while the whole
 * test story (1.18 → 13.9 → 0.87) lives inside 1.4. Sharing an axis made the
 * part the lesson is about almost flat.
 *
 * Cost note: each λ curve is ~115 ms of dense linear algebra, so curves are
 * computed lazily on first selection and cached; the shared feature draws are
 * built once.
 */

import { useMemo, useRef, useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat, scale } from "../viz-kit";

// --- experiment configuration (fixed; every number in the doc comment assumes it) ---
const D = 12; // input dimension
const N = 40; // training samples — the interpolation threshold
const N_TEST = 150; // fresh points for the test estimate
const NOISE = 0.4; // label noise sd on the training set only
const P_MAX = 160; // widest model in the sweep (4× n)
const TRIALS = 6; // independent draws averaged at each p
const SEED0 = 101;
const SEED_STEP = 13;

const LAMBDAS = [1e-6, 1e-3, 1e-2, 1e-1, 1] as const;
const LAMBDA_LABELS: Record<number, string> = {
  1e-6: "≈ 0",
  1e-3: "10⁻³",
  1e-2: "10⁻²",
  1e-1: "10⁻¹",
  1: "1",
};

/** mulberry32 — same generator as viz-kit, inlined so the sweep stays pure. */
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

interface Trial {
  ytr: number[];
  yte: number[];
  /** Ftr[j][i] — random feature j evaluated at training point i. Nested: the
   *  first p of them are the model at width p, so widening only *adds* columns. */
  ftr: Float64Array[];
  fte: Float64Array[];
}

/** One independent draw: teacher, data, label noise, and the P_MAX feature bank. */
function makeTrial(seed: number): Trial {
  const rng = seededRandom(seed);

  const beta = Array.from({ length: D }, () => gaussian(rng, 0, 1 / Math.sqrt(D)));
  // A teacher that is not exactly representable by finitely many ReLU features,
  // so the fit never becomes trivial.
  const teacher = (x: number[]) => {
    let s = 0;
    for (let j = 0; j < D; j++) s += beta[j] * x[j];
    return 2 * Math.tanh(1.5 * s);
  };

  const sample = (n: number, noisy: boolean) => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = Array.from({ length: D }, () => gaussian(rng, 0, 1));
      X.push(x);
      y.push(teacher(x) + (noisy ? gaussian(rng, 0, NOISE) : 0));
    }
    return { X, y };
  };

  // Test labels are clean: we are measuring how well the model recovers the
  // teacher, not how well it reproduces a second batch of noise.
  const tr = sample(N, true);
  const te = sample(N_TEST, false);

  const ftr: Float64Array[] = [];
  const fte: Float64Array[] = [];
  for (let j = 0; j < P_MAX; j++) {
    const v = Array.from({ length: D }, () => gaussian(rng, 0, 1 / Math.sqrt(D)));
    const b = gaussian(rng, 0, 0.5);
    const relu = (x: number[]) => {
      let s = b;
      for (let k = 0; k < D; k++) s += v[k] * x[k];
      return Math.max(0, s);
    };
    ftr.push(Float64Array.from(tr.X.map(relu)));
    fte.push(Float64Array.from(te.X.map(relu)));
  }

  return { ytr: tr.y, yte: te.y, ftr, fte };
}

/** Cholesky of (M + λI), lower triangular, row-major n × n. */
function cholesky(M: Float64Array, n: number, lam: number) {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = M[i * n + j] + (i === j ? lam : 0);
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) {
        // λ > 0 keeps this positive; the guard only catches float underflow at
        // the smallest λ, where the matrix is genuinely near-singular.
        L[i * n + i] = Math.sqrt(s > 0 ? s : 1e-300);
      } else {
        L[i * n + j] = s / L[j * n + j];
      }
    }
  }
  return L;
}

function cholSolve(L: Float64Array, y: number[], n: number) {
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = y[i];
    for (let k = 0; k < i; k++) s -= L[i * n + k] * z[k];
    z[i] = s / L[i * n + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = z[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * z[k];
    z[i] = s / L[i * n + i];
  }
  return z;
}

export interface SweepPoint {
  p: number;
  train: number;
  test: number;
  norm: number;
}

/**
 * Sweep p = 1…P_MAX for one trial at one λ.
 *
 * Both Gram matrices are accumulated incrementally — widening the model by one
 * feature is a rank-1 update, K ← K + φφᵀ — so the whole sweep costs one pass
 * rather than P_MAX independent O(n²p) rebuilds.
 */
function sweepTrial(T: Trial, lam: number): SweepPoint[] {
  const K = new Float64Array(N * N); // ΦΦᵀ over training points
  const Kte = new Float64Array(N_TEST * N); // Φ_test Φᵀ
  const out: SweepPoint[] = [];

  for (let p = 0; p < P_MAX; p++) {
    const f = T.ftr[p];
    const g = T.fte[p];
    for (let i = 0; i < N; i++) {
      const fi = f[i];
      for (let j = 0; j < N; j++) K[i * N + j] += fi * f[j];
    }
    for (let i = 0; i < N_TEST; i++) {
      const gi = g[i];
      for (let j = 0; j < N; j++) Kte[i * N + j] += gi * f[j];
    }

    const alpha = cholSolve(cholesky(K, N, lam), T.ytr, N);

    let train = 0;
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let j = 0; j < N; j++) s += K[i * N + j] * alpha[j];
      const e = s - T.ytr[i];
      train += e * e;
    }
    let test = 0;
    for (let i = 0; i < N_TEST; i++) {
      let s = 0;
      for (let j = 0; j < N; j++) s += Kte[i * N + j] * alpha[j];
      const e = s - T.yte[i];
      test += e * e;
    }

    // ‖w‖² = Σ_j (Σ_i α_i φ_j(x_i))². Computed from the feature columns rather
    // than as αᵀKα, which loses its sign near the threshold where K is close to
    // singular and can round to a negative number.
    let nw = 0;
    for (let j = 0; j <= p; j++) {
      const fj = T.ftr[j];
      let c = 0;
      for (let i = 0; i < N; i++) c += alpha[i] * fj[i];
      nw += c * c;
    }

    out.push({ p: p + 1, train: train / N, test: test / N_TEST, norm: Math.sqrt(nw) });
  }
  return out;
}

function averageSweep(trials: Trial[], lam: number): SweepPoint[] {
  const all = trials.map((T) => sweepTrial(T, lam));
  return Array.from({ length: P_MAX }, (_, i) => ({
    p: i + 1,
    train: all.reduce((s, r) => s + r[i].train, 0) / all.length,
    test: all.reduce((s, r) => s + r[i].test, 0) / all.length,
    norm: all.reduce((s, r) => s + r[i].norm, 0) / all.length,
  }));
}

// --- geometry ---------------------------------------------------------------
const W = 620;
const H_ERR = 232;
const H_TRAIN = 86;
const H_NORM = 90;
const PAD = { l: 52, r: 16, t: 14, b: 26 };

/**
 * Test error gets its own axis rather than sharing one with the training curve.
 * Sharing meant spanning eleven decades to accommodate a training error that
 * reaches 10⁻⁸, which squeezed the entire test story — a classical dip of 1.18,
 * a peak of 13.9, a second descent to 0.87 — into about a tenth of the height.
 * Three decades here, so the shape that matters is the shape you can see.
 *
 * All bounds are fixed across λ so switching compares like with like.
 */
const TEST_LO = 0.6;
const TEST_HI = 1e3;
const TRAIN_LO = 1e-9;
const TRAIN_HI = 10;
const NORM_LO = 0.3;
const NORM_HI = 150;

const TEST_DECADES = [0, 1, 2, 3];
const TEST_LABEL: Record<number, string> = { 0: "1", 1: "10", 2: "100", 3: "1000" };
const TRAIN_DECADES = [-8, -4, 0];
const TRAIN_LABEL: Record<number, string> = { [-8]: "10⁻⁸", [-4]: "10⁻⁴", [0]: "1" };

const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(3));

export function DoubleDescentViz({ className }: { className?: string }) {
  const [lam, setLam] = useState<number>(1e-3);
  const [showNorm, setShowNorm] = useState(true);

  // The feature banks and data are λ-independent, so they are drawn once.
  const trials = useMemo(
    () => Array.from({ length: TRIALS }, (_, t) => makeTrial(SEED0 + t * SEED_STEP)),
    []
  );

  // Each λ curve is ~115 ms, so compute on first request and keep it.
  const cache = useRef(new Map<number, SweepPoint[]>());
  const curve = useMemo(() => {
    const hit = cache.current.get(lam);
    if (hit) return hit;
    const computed = averageSweep(trials, lam);
    cache.current.set(lam, computed);
    return computed;
  }, [trials, lam]);

  const stats = useMemo(() => {
    // "Classical" region: everything comfortably below the threshold.
    const classical = curve.slice(0, N - 4);
    const dip = classical.reduce((a, b) => (b.test < a.test ? b : a));
    const peak = curve.reduce((a, b) => (b.test > a.test ? b : a));
    const normPeak = curve.reduce((a, b) => (b.norm > a.norm ? b : a));
    const end = curve[curve.length - 1];
    // Is there an interior peak at all, or has ridge flattened it to monotone?
    const spikeGone = peak.p < 8;
    // Whether the model actually interpolates at this λ. At λ = 1 it never does,
    // so the training panel must not claim it reaches zero.
    const interpolates = end.train < 1e-6;
    return { dip, peak, normPeak, end, spikeGone, interpolates, gain: 1 - end.test / dip.test };
  }, [curve]);

  const sx = scale(1, P_MAX, PAD.l, W - PAD.r);
  const syTest = scale(Math.log10(TEST_LO), Math.log10(TEST_HI), H_ERR - PAD.b, PAD.t);
  const syTrain = scale(Math.log10(TRAIN_LO), Math.log10(TRAIN_HI), H_TRAIN - PAD.b, PAD.t);
  const syNorm = scale(Math.log10(NORM_LO), Math.log10(NORM_HI), H_NORM - PAD.b, PAD.t);

  /** Clamped to the panel's own bounds so a spike past the top still draws. */
  const pathFor = (
    pick: (d: SweepPoint) => number,
    sy: (v: number) => number,
    lo: number,
    hi: number
  ) =>
    curve
      .map((d, i) => {
        const v = Math.min(Math.max(pick(d), lo), hi);
        return `${i === 0 ? "M" : "L"}${sx(d.p).toFixed(1)},${sy(Math.log10(v)).toFixed(1)}`;
      })
      .join(" ");

  const testPath = pathFor((d) => d.test, syTest, TEST_LO, TEST_HI);
  const trainPath = pathFor((d) => d.train, syTrain, TRAIN_LO, TRAIN_HI);
  const normPath = pathFor((d) => d.norm, syNorm, NORM_LO, NORM_HI);

  const thresholdX = sx(N);

  return (
    <VizFrame
      title="Double descent, computed live"
      caption={`Random-ReLU-feature ridge regression: n = ${N} noisy training points, sweeping the model width p from 1 to ${P_MAX}. Below p = n the familiar U appears. At p ≈ n there is exactly one function that fits the training data, the model is forced to take it, and test error spikes. Past the threshold there are many interpolating functions and the minimum-norm solve can pick a smooth one, so test error falls again — here to ${fmt(stats.end.test)}, below the classical best of ${fmt(stats.dip.test)}. The ‖w‖ panel is the mechanism: it peaks at exactly the p where test error does. Raise λ and the spike disappears, because it was a near-singular matrix all along.`}
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-xs text-slate-400 mr-1">ridge λ</span>
        {LAMBDAS.map((l) => (
          <VizButton key={l} active={l === lam} onClick={() => setLam(l)}>
            {LAMBDA_LABELS[l]}
          </VizButton>
        ))}
        <VizButton className="ml-auto" active={showNorm} onClick={() => setShowNorm((s) => !s)}>
          ‖w‖ panel
        </VizButton>
      </div>

      {/* test error, on an axis scaled to the test error */}
      <svg viewBox={`0 0 ${W} ${H_ERR}`} className="w-full">
        {TEST_DECADES.map((d) => (
          <g key={d}>
            <line x1={PAD.l} x2={W - PAD.r} y1={syTest(d)} y2={syTest(d)} stroke={VIZ.grid} strokeWidth={1} />
            <text x={PAD.l - 6} y={syTest(d) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
              {TEST_LABEL[d]}
            </text>
          </g>
        ))}

        {/* the interpolation threshold — the whole point of the picture */}
        <line
          x1={thresholdX}
          x2={thresholdX}
          y1={PAD.t}
          y2={H_ERR - PAD.b}
          stroke={VIZ.yellow}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text x={thresholdX + 5} y={PAD.t + 10} fontSize={9.5} fill={VIZ.yellow}>
          p = n = {N}
        </text>
        <text x={thresholdX + 5} y={PAD.t + 21} fontSize={8.5} fill={VIZ.text}>
          interpolation threshold
        </text>

        {/* Regime labels live in the empty band above the curve: at the bottom
            they collided with both the curve and the classical-best line. */}
        <text x={PAD.l + 6} y={syTest(Math.log10(300))} fontSize={9} fill={VIZ.text}>
          under-parameterized
        </text>
        <text x={W - PAD.r - 6} y={syTest(Math.log10(300))} textAnchor="end" fontSize={9} fill={VIZ.text}>
          over-parameterized
        </text>

        {/* the classical best, drawn first so the curve sits on top of it */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={syTest(Math.log10(stats.dip.test))}
          y2={syTest(Math.log10(stats.dip.test))}
          stroke={VIZ.brandLight}
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.75}
        />
        <text
          x={W - PAD.r - 6}
          y={syTest(Math.log10(stats.dip.test)) - 5}
          textAnchor="end"
          fontSize={9}
          fill={VIZ.brandLight}
          stroke={VIZ.card}
          strokeWidth={3}
          paintOrder="stroke"
        >
          best a classical model can do: {fmt(stats.dip.test)}
        </text>

        <path d={testPath} fill="none" stroke={VIZ.rose} strokeWidth={2.4} />

        {/* the three moments worth naming */}
        <circle cx={sx(stats.dip.p)} cy={syTest(Math.log10(stats.dip.test))} r={4} fill={VIZ.brandLight} />
        {!stats.spikeGone && (
          <circle cx={sx(stats.peak.p)} cy={syTest(Math.log10(Math.min(stats.peak.test, TEST_HI)))} r={4} fill={VIZ.rose} />
        )}
        <circle
          cx={sx(stats.end.p)}
          cy={syTest(Math.log10(stats.end.test))}
          r={4.5}
          fill={VIZ.teal}
          stroke={VIZ.card}
          strokeWidth={1.5}
        />

        <line x1={PAD.l} x2={W - PAD.r} y1={H_ERR - PAD.b} y2={H_ERR - PAD.b} stroke={VIZ.axis} strokeWidth={1} />
        <text x={PAD.l + 6} y={PAD.t + 8} fontSize={9.5} fill={VIZ.rose}>
          test MSE
        </text>
      </svg>

      {/* training error, which has to span its own eight decades to show interpolation */}
      <svg viewBox={`0 0 ${W} ${H_TRAIN}`} className="w-full -mt-1">
        {TRAIN_DECADES.map((d) => (
          <g key={d}>
            <line x1={PAD.l} x2={W - PAD.r} y1={syTrain(d)} y2={syTrain(d)} stroke={VIZ.grid} strokeWidth={1} />
            <text x={PAD.l - 6} y={syTrain(d) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
              {TRAIN_LABEL[d]}
            </text>
          </g>
        ))}
        <line
          x1={thresholdX}
          x2={thresholdX}
          y1={PAD.t}
          y2={H_TRAIN - PAD.b}
          stroke={VIZ.yellow}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <path d={trainPath} fill="none" stroke={VIZ.teal} strokeWidth={2} />
        <text x={W - PAD.r - 6} y={PAD.t + 8} textAnchor="end" fontSize={9.5} fill={VIZ.teal}>
          {stats.interpolates
            ? "train MSE — reaches zero at the threshold and stays there"
            : "train MSE — λ is large enough that it never interpolates"}
        </text>
        <line x1={PAD.l} x2={W - PAD.r} y1={H_TRAIN - PAD.b} y2={H_TRAIN - PAD.b} stroke={VIZ.axis} strokeWidth={1} />
        {[1, 40, 80, 120, 160].map((p) => (
          <text key={p} x={sx(p)} y={H_TRAIN - PAD.b + 13} textAnchor="middle" fontSize={9} fill={VIZ.text}>
            {p}
          </text>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H_TRAIN - 2} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          p — number of random features (model width)
        </text>
      </svg>

      {showNorm && (
        <svg viewBox={`0 0 ${W} ${H_NORM}`} className="w-full -mt-1">
          {[0, 1, 2].map((d) => (
            <g key={d}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={syNorm(d)}
                y2={syNorm(d)}
                stroke={VIZ.grid}
                strokeWidth={1}
              />
              <text x={PAD.l - 6} y={syNorm(d) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
                {d === 0 ? "1" : d === 1 ? "10" : "100"}
              </text>
            </g>
          ))}
          <line
            x1={thresholdX}
            x2={thresholdX}
            y1={PAD.t}
            y2={H_NORM - PAD.b}
            stroke={VIZ.yellow}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <path d={normPath} fill="none" stroke={VIZ.orange} strokeWidth={2} />
          <circle
            cx={sx(stats.normPeak.p)}
            cy={syNorm(Math.log10(Math.min(stats.normPeak.norm, NORM_HI)))}
            r={4}
            fill={VIZ.orange}
          />
          <text x={W - PAD.r - 6} y={PAD.t + 8} textAnchor="end" fontSize={9.5} fill={VIZ.orange}>
            ‖w‖ — size of the fitted weights
          </text>
        </svg>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        <VizStat
          label="classical best (p < n)"
          value={`${fmt(stats.dip.test)} at p = ${stats.dip.p}`}
          color={VIZ.brandLight}
        />
        <VizStat
          label="peak test error"
          value={stats.spikeGone ? "no interior peak" : `${fmt(stats.peak.test)} at p = ${stats.peak.p}`}
          color={stats.spikeGone ? VIZ.teal : VIZ.rose}
        />
        <VizStat label={`test at p = ${P_MAX}`} value={fmt(stats.end.test)} color={VIZ.teal} />
        <VizStat
          label="overparameterized vs classical best"
          value={stats.gain > 0 ? `${(stats.gain * 100).toFixed(0)}% better` : `${(-stats.gain * 100).toFixed(0)}% worse`}
          color={stats.gain > 0 ? VIZ.teal : VIZ.rose}
        />
        <VizStat label="‖w‖ peaks at" value={`p = ${stats.normPeak.p}`} color={VIZ.orange} />
      </div>
    </VizFrame>
  );
}
