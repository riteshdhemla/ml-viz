"use client";

/**
 * Why the bottleneck is the point: reconstruction error against code size.
 *
 * A linear autoencoder trained to convergence *is* PCA, so the reconstruction
 * error at code size k is exactly the tail of the eigenvalue spectrum — no
 * training loop needed, and no question about whether it converged. The data
 * here is 3 latent directions embedded in 16 dimensions plus isotropic noise
 * (σ = 0.25), and the covariance is diagonalised live by Jacobi rotation.
 *
 *   code size   reconstruction MSE   variance kept
 *       1           0.35273             64.04%
 *       2           0.11667             88.11%
 *       3           0.05215             94.68%
 *       4           0.04708             95.20%
 *       8           0.02875             97.07%
 *
 * The elbow is not decoration. Going 2 → 3 more than halves the error; going
 * 3 → 4 improves it by 10%, and every unit after that buys a slice of noise.
 * The spectrum says the same thing more bluntly: 10.049, 3.777, 1.032, then
 * 0.081, 0.077, 0.076 — a cliff exactly at the intrinsic dimension.
 *
 * That is the argument for the bottleneck. Set the code size at or above the
 * data's real dimensionality and the autoencoder can afford to learn the
 * identity map, which reconstructs perfectly and represents nothing. Setting it
 * *below* forces a choice about what to keep, and where the error stops falling
 * tells you how many directions the data actually has.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

const D = 16;
const K_TRUE = 3;
const N = 600;
const NOISE = 0.25;

/** Eigenvalues of the sample covariance, by Jacobi rotation. */
function eigenvalues(Min: number[][]) {
  const n = Min.length;
  const M = Min.map((r) => [...r]);
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += M[i][j] ** 2;
    if (off < 1e-16) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(M[p][q]) < 1e-14) continue;
        const th = (M[q][q] - M[p][p]) / (2 * M[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const a = M[k][p];
          const b = M[k][q];
          M[k][p] = c * a - s * b;
          M[k][q] = s * a + c * b;
        }
        for (let k = 0; k < n; k++) {
          const a = M[p][k];
          const b = M[q][k];
          M[p][k] = c * a - s * b;
          M[q][k] = s * a + c * b;
        }
      }
  }
  return M.map((r, i) => r[i]).sort((a, b) => b - a);
}

function spectrum(noise: number) {
  const rng = seededRandom(13);
  const basis = Array.from({ length: K_TRUE }, () => {
    const v = Array.from({ length: D }, () => gaussian(rng));
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  });
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const z = Array.from({ length: K_TRUE }, (_, j) => gaussian(rng, 0, [3, 2, 1][j]));
    const x = new Array(D).fill(0);
    for (let j = 0; j < K_TRUE; j++) for (let d = 0; d < D; d++) x[d] += z[j] * basis[j][d];
    for (let d = 0; d < D; d++) x[d] += gaussian(rng, 0, noise);
    X.push(x);
  }
  const mean = new Array(D).fill(0);
  X.forEach((x) => x.forEach((v, d) => (mean[d] += v / N)));
  const C = Array.from({ length: D }, () => new Array(D).fill(0));
  X.forEach((x) => {
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) C[i][j] += ((x[i] - mean[i]) * (x[j] - mean[j])) / N;
  });
  return eigenvalues(C);
}

const W = 560;
const H = 220;
const PAD = { l: 48, r: 14, t: 16, b: 30 };

export function BottleneckViz({ className }: { className?: string }) {
  const [k, setK] = useState(3);
  const [noise, setNoise] = useState(NOISE);

  const ev = useMemo(() => spectrum(noise), [noise]);
  const total = ev.reduce((a, b) => a + b, 0);
  const mse = (kk: number) => ev.slice(kk).reduce((a, b) => a + b, 0) / D;
  const kept = (kk: number) => (total - ev.slice(kk).reduce((a, b) => a + b, 0)) / total;

  const curve = Array.from({ length: D + 1 }, (_, i) => mse(i));
  const sx = scale(0, D, PAD.l, W - PAD.r);
  const sy = scale(0, curve[0], H - PAD.b, PAD.t);

  return (
    <VizFrame
      title="Where the error stops falling is the intrinsic dimension"
      caption="Three latent directions embedded in 16 dimensions plus isotropic noise. A linear autoencoder trained to convergence is PCA, so reconstruction error at code size k is exactly the tail of the eigenvalue spectrum — computed here by diagonalising the sample covariance, not by training. Bars are the eigenvalues; the curve is reconstruction MSE."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.l} x2={W - PAD.r} y1={sy(f * curve[0])} y2={sy(f * curve[0])} stroke={VIZ.grid} strokeWidth={1} />
        ))}
        {/* eigenvalues, scaled to share the frame */}
        {ev.map((v, i) => {
          const h = (v / ev[0]) * (H - PAD.b - PAD.t) * 0.85;
          return (
            <rect
              key={i}
              x={sx(i + 0.5) - 7}
              y={H - PAD.b - h}
              width={14}
              height={h}
              rx={1.5}
              fill={i < k ? VIZ.teal : "#2e3347"}
            />
          );
        })}
        <path
          d={curve.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ")}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={2}
        />
        <circle cx={sx(k)} cy={sy(mse(k))} r={5} fill={VIZ.textBright} />
        <line x1={sx(k)} x2={sx(k)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.textBright} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        <text x={PAD.l - 6} y={sy(curve[0]) + 4} textAnchor="end" fontSize={9} fill={VIZ.text}>
          {curve[0].toFixed(2)}
        </text>
        <text x={PAD.l - 6} y={H - PAD.b} textAnchor="end" fontSize={9} fill={VIZ.text}>
          0
        </text>
        <text x={PAD.l} y={H - PAD.b + 13} fontSize={9} fill={VIZ.text}>
          0
        </text>
        <text x={W - PAD.r} y={H - PAD.b + 13} textAnchor="end" fontSize={9} fill={VIZ.text}>
          code size {D}
        </text>
        <text x={W - PAD.r - 6} y={PAD.t + 10} textAnchor="end" fontSize={9} fill={VIZ.orange}>
          reconstruction MSE
        </text>
        <text x={W - PAD.r - 6} y={PAD.t + 22} textAnchor="end" fontSize={9} fill={VIZ.teal}>
          eigenvalues (kept in teal)
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="code size" value={String(k)} />
        <VizStat label="reconstruction MSE" value={mse(k).toFixed(5)} color={VIZ.orange} />
        <VizStat label="variance kept" value={`${(kept(k) * 100).toFixed(2)}%`} color={VIZ.teal} />
        <VizStat
          label="improvement from the last unit"
          value={k > 0 ? `${(((mse(k - 1) - mse(k)) / Math.max(1e-9, mse(k - 1))) * 100).toFixed(1)}%` : "—"}
          color={k > 0 && (mse(k - 1) - mse(k)) / mse(k - 1) > 0.3 ? VIZ.teal : VIZ.text}
        />
        <VizStat label="noise floor σ²" value={(noise * noise).toFixed(5)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <VizSlider label="code size — the bottleneck" min={0} max={D} step={1} value={k} onChange={(v) => setK(Math.round(v))} format={(v) => String(v)} />
        <VizSlider label="noise added to every dimension" min={0.05} max={0.8} step={0.05} value={noise} onChange={setNoise} format={(v) => v.toFixed(2)} />
      </div>
    </VizFrame>
  );
}
