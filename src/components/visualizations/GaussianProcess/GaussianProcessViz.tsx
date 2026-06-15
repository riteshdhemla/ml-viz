"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Gaussian process regression in 1-D. A handful of observed points pin down a
 * posterior over functions: the mean curve passes near the data and the ±2σ
 * band collapses at observations and widens between/beyond them. The RBF
 * length-scale slider controls how wiggly vs. smooth the inferred functions are.
 */

const OBS: [number, number][] = [
  [-3.0, -1.2],
  [-1.8, 0.9],
  [-0.5, 0.4],
  [1.2, -0.8],
  [2.6, 1.1],
];

const NOISE = 0.04;
const SIGNAL = 1.0;
const W = 480;
const H = 280;
const M = { top: 16, right: 14, bottom: 30, left: 32 };
const XLO = -5;
const XHI = 5;
const T = 70; // test grid points

function rbf(a: number, b: number, ell: number): number {
  return SIGNAL * Math.exp(-((a - b) ** 2) / (2 * ell * ell));
}

/** Solve K X = B for X (K n×n, B n×m) via Gaussian elimination with partial pivoting. */
function solve(K: number[][], B: number[][]): number[][] {
  const n = K.length;
  const m = B[0].length;
  // augmented copy
  const A = K.map((row, i) => [...row, ...B[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    const d = A[col][col] || 1e-9;
    for (let j = col; j < n + m; j++) A[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col];
      for (let j = col; j < n + m; j++) A[r][j] -= f * A[col][j];
    }
  }
  return A.map((row) => row.slice(n));
}

export function GaussianProcessViz({ className }: { className?: string }) {
  const [ell, setEll] = useState(1.0);

  const Xobs = OBS.map((o) => o[0]);
  const yobs = OBS.map((o) => o[1]);
  const n = OBS.length;

  // K = k(X,X) + noise·I
  const K = Xobs.map((a, i) => Xobs.map((b, j) => rbf(a, b, ell) + (i === j ? NOISE : 0)));
  const alpha = solve(K, yobs.map((v) => [v])).map((r) => r[0]); // K^{-1} y

  const xs = Array.from({ length: T }, (_, i) => XLO + ((XHI - XLO) * i) / (T - 1));
  // posterior mean and variance at each test point
  const mean: number[] = [];
  const sd: number[] = [];
  // precompute K^{-1} applied to each test point's cross-cov via a single solve
  const Ks = xs.map((xt) => Xobs.map((xo) => rbf(xt, xo, ell))); // T×n
  const Kinv_Ks = solve(K, transpose(Ks)); // n×T  (K^{-1} k_*)
  for (let t = 0; t < T; t++) {
    let mu = 0;
    for (let i = 0; i < n; i++) mu += Ks[t][i] * alpha[i];
    let v = SIGNAL;
    for (let i = 0; i < n; i++) v -= Ks[t][i] * Kinv_Ks[i][t];
    mean.push(mu);
    sd.push(Math.sqrt(Math.max(v, 1e-6)));
  }

  const yvals = [...yobs, ...mean.map((m, i) => m + 2 * sd[i]), ...mean.map((m, i) => m - 2 * sd[i])];
  const x = scale(XLO, XHI, M.left, W - M.right);
  const y = scale(Math.min(...yvals) - 0.3, Math.max(...yvals) + 0.3, H - M.bottom, M.top);

  const bandPath =
    "M" +
    xs.map((xt, i) => `${x(xt).toFixed(1)},${y(mean[i] + 2 * sd[i]).toFixed(1)}`).join(" L") +
    " L" +
    xs
      .map((xt, i) => `${x(xt).toFixed(1)},${y(mean[i] - 2 * sd[i]).toFixed(1)}`)
      .reverse()
      .join(" L") +
    " Z";
  const meanPath = "M" + xs.map((xt, i) => `${x(xt).toFixed(1)},${y(mean[i]).toFixed(1)}`).join(" L");

  const avgSd = sd.reduce((a, b) => a + b, 0) / sd.length;

  return (
    <VizFrame
      className={className}
      title="Gaussian process regression"
      caption="Five observations pin down a distribution over functions. The blue band is the ±2σ posterior: it pinches to zero at each data point and balloons where there's no data. The length-scale controls smoothness — small values let the function wiggle to hit every point (and stay uncertain between them); large values force a smooth, confident fit."
    >
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="gaussian process regression">
          <path d={bandPath} fill={VIZ.brand} opacity={0.25} />
          <path d={meanPath} fill="none" stroke={VIZ.brandLight} strokeWidth={2} />
          {OBS.map(([ox, oy], i) => (
            <circle key={i} cx={x(ox)} cy={y(oy)} r={4.5} fill={VIZ.teal} stroke={VIZ.textBright} strokeWidth={1} />
          ))}
          <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} />
          {[-4, -2, 0, 2, 4].map((t) => (
            <text key={t} x={x(t)} y={H - M.bottom + 16} fill={VIZ.text} fontSize={9} textAnchor="middle" fontFamily="monospace">
              {t}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 max-w-sm">
        <VizSlider
          label="RBF length-scale ℓ"
          min={0.3}
          max={3}
          step={0.1}
          value={ell}
          onChange={setEll}
          format={(v) => v.toFixed(1)}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="observations" value={String(n)} color={VIZ.teal} />
        <VizStat label="length-scale" value={ell.toFixed(1)} color={VIZ.brandLight} />
        <VizStat label="avg ±σ width" value={avgSd.toFixed(2)} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}

function transpose(M: number[][]): number[][] {
  return M[0].map((_, j) => M.map((row) => row[j]));
}
