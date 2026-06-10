"use client";

import { useMemo, useState } from "react";
import { CLASS_COLORS, VIZ, VizButton, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * Ridge vs Lasso regularization paths. Six regression weights are re-fit at
 * every λ on a log grid; each curve traces one weight as λ grows. Ridge
 * shrinks weights smoothly toward (but never exactly to) zero, while Lasso's
 * corner at zero snaps weights to exactly 0 one by one — feature selection.
 */

const W = 480;
const H = 300;
const M = { top: 16, right: 16, bottom: 40, left: 48 };

const N = 40; // samples
const D = 6; // features
const N_LAMBDA = 61;
const LOG_MIN = -2; // λ = 0.01
const LOG_MAX = 2; //  λ = 100

const LAMBDAS = Array.from({ length: N_LAMBDA }, (_, i) => 10 ** (LOG_MIN + (i / (N_LAMBDA - 1)) * (LOG_MAX - LOG_MIN)));

/** Deterministic standardized design matrix + targets. True weights: only
 *  features 0–2 matter; 3 is correlated with 0; 4–5 are pure noise. */
const { X, Y } = (() => {
  const rng = seededRandom(2024);
  const raw: number[][] = Array.from({ length: N }, () => {
    const x0 = gaussian(rng);
    return [x0, gaussian(rng), gaussian(rng), 0.7 * x0 + 0.5 * gaussian(rng), gaussian(rng), gaussian(rng)];
  });
  const trueW = [4, -3, 2, 0, 0, 0];
  const y = raw.map((row) => row.reduce((s, v, j) => s + v * trueW[j], 0) + gaussian(rng, 0, 1.5));
  // standardize columns, center y
  for (let j = 0; j < D; j++) {
    const mean = raw.reduce((s, r) => s + r[j], 0) / N;
    const sd = Math.sqrt(raw.reduce((s, r) => s + (r[j] - mean) ** 2, 0) / N) || 1;
    for (const r of raw) r[j] = (r[j] - mean) / sd;
  }
  const ym = y.reduce((s, v) => s + v, 0) / N;
  return { X: raw, Y: y.map((v) => v - ym) };
})();

/** Solve (XᵀX + λnI) w = Xᵀy by Gaussian elimination (ridge closed form). */
function ridgeWeights(lambda: number): number[] {
  const A: number[][] = Array.from({ length: D }, (_, i) =>
    Array.from({ length: D }, (_, j) => {
      let s = 0;
      for (let n = 0; n < N; n++) s += X[n][i] * X[n][j];
      return s + (i === j ? lambda * N : 0);
    })
  );
  const v = Array.from({ length: D }, (_, i) => {
    let s = 0;
    for (let n = 0; n < N; n++) s += X[n][i] * Y[n];
    return s;
  });
  for (let col = 0; col < D; col++) {
    let piv = col;
    for (let r = col + 1; r < D; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    [v[col], v[piv]] = [v[piv], v[col]];
    for (let r = col + 1; r < D; r++) {
      const f = A[r][col] / A[col][col];
      for (let c = col; c < D; c++) A[r][c] -= f * A[col][c];
      v[r] -= f * v[col];
    }
  }
  const w = new Array(D).fill(0);
  for (let r = D - 1; r >= 0; r--) {
    let s = v[r];
    for (let c = r + 1; c < D; c++) s -= A[r][c] * w[c];
    w[r] = s / A[r][r];
  }
  return w;
}

/** Lasso by cyclic coordinate descent with soft-thresholding. */
function lassoWeights(lambda: number, init: number[]): number[] {
  const w = [...init];
  const colSq = Array.from({ length: D }, (_, j) => X.reduce((s, r) => s + r[j] * r[j], 0));
  for (let it = 0; it < 120; it++) {
    for (let j = 0; j < D; j++) {
      let rho = 0;
      for (let n = 0; n < N; n++) {
        let pred = 0;
        for (let k = 0; k < D; k++) if (k !== j) pred += X[n][k] * w[k];
        rho += X[n][j] * (Y[n] - pred);
      }
      const t = lambda * N;
      w[j] = rho > t ? (rho - t) / colSq[j] : rho < -t ? (rho + t) / colSq[j] : 0;
    }
  }
  return w;
}

/** Both full paths, precomputed once at module load (warm-started lasso). */
const PATHS = (() => {
  const ridge = LAMBDAS.map((l) => ridgeWeights(l));
  const lasso: number[][] = [];
  let prev = ridgeWeights(0.01);
  for (const l of LAMBDAS) {
    prev = lassoWeights(l, prev);
    lasso.push([...prev]);
  }
  return { ridge, lasso };
})();

const FEATURE_LABELS = ["w₁ (signal +4)", "w₂ (signal −3)", "w₃ (signal +2)", "w₄ (corr. w/ x₁)", "w₅ (noise)", "w₆ (noise)"];

export function RegularizationPathViz({ className }: { className?: string }) {
  const [mode, setMode] = useState<"ridge" | "lasso">("lasso");
  const [li, setLi] = useState(30); // index into LAMBDAS

  const paths = PATHS[mode];
  const lambda = LAMBDAS[li];
  const weights = paths[li];
  const nonzero = weights.filter((w) => Math.abs(w) > 1e-6).length;

  const wmax = 4.6;
  const sx = scale(LOG_MIN, LOG_MAX, M.left, W - M.right);
  const sy = scale(-wmax, wmax, H - M.bottom, M.top);

  const lines = useMemo(
    () =>
      Array.from({ length: D }, (_, j) =>
        paths
          .map((w, i) => `${i === 0 ? "M" : "L"}${sx(Math.log10(LAMBDAS[i])).toFixed(1)},${sy(Math.max(-wmax, Math.min(wmax, w[j]))).toFixed(1)}`)
          .join(" ")
      ),
    [paths, sx, sy]
  );

  return (
    <VizFrame
      className={className}
      title="Regularization paths: how λ shrinks the weights"
      caption="Each curve is one weight, re-fit at every λ. Ridge (L2) shrinks all weights smoothly but they stay non-zero forever. Lasso (L1) snaps weights to exactly zero one at a time — the noise weights die first, then the weakest signals: built-in feature selection."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <VizButton onClick={() => setMode("ridge")} active={mode === "ridge"}>Ridge (L2)</VizButton>
        <VizButton onClick={() => setMode("lasso")} active={mode === "lasso"}>Lasso (L1)</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${mode} regularization path`}>
        {/* zero-weight line + axes */}
        <line x1={M.left} y1={sy(0)} x2={W - M.right} y2={sy(0)} stroke={VIZ.grid} strokeWidth={1} />
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />

        {/* x ticks: powers of ten */}
        {[-2, -1, 0, 1, 2].map((e) => (
          <g key={e}>
            <line x1={sx(e)} y1={H - M.bottom} x2={sx(e)} y2={H - M.bottom + 4} stroke={VIZ.axis} strokeWidth={1} />
            <text x={sx(e)} y={H - M.bottom + 15} fill={VIZ.text} fontSize={10} textAnchor="middle">
              {e === 0 ? "1" : e === 1 ? "10" : e === 2 ? "100" : e === -1 ? "0.1" : "0.01"}
            </text>
          </g>
        ))}
        {/* y ticks */}
        {[-4, -2, 0, 2, 4].map((t) => (
          <text key={t} x={M.left - 6} y={sy(t) + 3.5} fill={VIZ.text} fontSize={10} textAnchor="end">{t}</text>
        ))}

        {/* axis labels */}
        <text x={(M.left + W - M.right) / 2} y={H - 6} fill={VIZ.textBright} fontSize={11} textAnchor="middle">λ (log scale)</text>
        <text x={14} y={(M.top + H - M.bottom) / 2} fill={VIZ.textBright} fontSize={11} textAnchor="middle" transform={`rotate(-90 14 ${(M.top + H - M.bottom) / 2})`}>weight value</text>

        {/* weight paths */}
        {lines.map((d, j) => (
          <path key={j} d={d} fill="none" stroke={CLASS_COLORS[j % CLASS_COLORS.length]} strokeWidth={j < 3 ? 2.2 : 1.6} strokeDasharray={j < 3 ? undefined : "5 3"} opacity={0.9} />
        ))}

        {/* current λ marker */}
        <line x1={sx(Math.log10(lambda))} y1={M.top} x2={sx(Math.log10(lambda))} y2={H - M.bottom} stroke={VIZ.textBright} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
        {weights.map((w, j) => (
          <circle key={j} cx={sx(Math.log10(lambda))} cy={sy(Math.max(-wmax, Math.min(wmax, w)))} r={3.5} fill={CLASS_COLORS[j % CLASS_COLORS.length]} stroke="#0f1117" strokeWidth={1} />
        ))}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
        {FEATURE_LABELS.map((label, j) => (
          <span key={j}>
            <span style={{ color: CLASS_COLORS[j % CLASS_COLORS.length] }}>—</span> {label}
          </span>
        ))}
      </div>

      <div className="mt-3 mb-3">
        <VizSlider label="λ (regularization strength)" min={0} max={N_LAMBDA - 1} step={1} value={li} onChange={setLi} format={() => lambda.toPrecision(2)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="λ" value={lambda.toPrecision(3)} color={VIZ.yellow} />
        <VizStat label="non-zero weights" value={`${nonzero} / ${D}`} color={mode === "lasso" && nonzero < D ? VIZ.teal : VIZ.textBright} />
        <VizStat label="‖w‖₁" value={weights.reduce((s, w) => s + Math.abs(w), 0).toFixed(2)} color={VIZ.rose} />
      </div>
    </VizFrame>
  );
}
