"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * Bias–variance tradeoff, made visible. We draw many training sets from the
 * same noisy sine curve and fit a k-NN regressor to each one. The thin rose
 * curves are the individual fits (their spread = variance); the bold teal
 * curve is their average (its gap to the true function = bias). Moving k
 * trades one error for the other.
 */

const W = 360;
const H = 260;
const X_DOM: [number, number] = [0, 1];
const Y_DOM: [number, number] = [-1.9, 1.9];

const N_DATASETS = 24;
const N_POINTS = 28;
const NOISE_SD = 0.35;
const GRID = 80; // x-resolution of fitted curves

const trueFn = (x: number) => Math.sin(2 * Math.PI * x) * 1.1;

/** Resampled training sets, fixed across renders so only k changes the picture. */
const DATASETS = (() => {
  const rng = seededRandom(42);
  return Array.from({ length: N_DATASETS }, () =>
    Array.from({ length: N_POINTS }, () => {
      const x = rng();
      return { x, y: trueFn(x) + gaussian(rng, 0, NOISE_SD) };
    }).sort((a, b) => a.x - b.x)
  );
})();

const GRID_X = Array.from({ length: GRID + 1 }, (_, i) => i / GRID);

/** k-NN regression: predict the mean y of the k nearest training points. */
function knnFit(data: { x: number; y: number }[], k: number): number[] {
  return GRID_X.map((gx) => {
    const byDist = data
      .map((p) => ({ y: p.y, dist: Math.abs(p.x - gx) }))
      .sort((a, b) => a.dist - b.dist);
    let sum = 0;
    for (let i = 0; i < k; i++) sum += byDist[i].y;
    return sum / k;
  });
}

export function BiasVarianceViz({ className }: { className?: string }) {
  const [k, setK] = useState(1);

  const sx = scale(X_DOM[0], X_DOM[1], 8, W - 8);
  const sy = scale(Y_DOM[0], Y_DOM[1], H - 8, 8);

  const { fits, avgFit, bias2, variance } = useMemo(() => {
    const fits = DATASETS.map((d) => knnFit(d, k));
    const avgFit = GRID_X.map((_, i) => fits.reduce((s, f) => s + f[i], 0) / fits.length);
    let bias2 = 0;
    let variance = 0;
    for (let i = 0; i <= GRID; i++) {
      bias2 += (avgFit[i] - trueFn(GRID_X[i])) ** 2;
      variance += fits.reduce((s, f) => s + (f[i] - avgFit[i]) ** 2, 0) / fits.length;
    }
    return { fits, avgFit, bias2: bias2 / (GRID + 1), variance: variance / (GRID + 1) };
  }, [k]);

  const path = (ys: number[]) =>
    ys.map((y, i) => `${i === 0 ? "M" : "L"}${sx(GRID_X[i]).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  return (
    <VizFrame
      className={className}
      title="One model, many training sets"
      caption="Each thin rose curve is a k-NN regressor fit to a fresh resample of the same noisy sine data. Their spread is variance; the gap between their average (teal) and the truth (dashed) is bias. Small k: the cloud is wild but centered on the truth. Large k: the cloud collapses, but onto the wrong, over-smoothed curve."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="Bias-variance fit cloud">
        {/* zero line */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} stroke={VIZ.grid} strokeWidth={1} />

        {/* fit cloud (variance) */}
        {fits.map((f, i) => (
          <path key={i} d={path(f)} fill="none" stroke={VIZ.rose} strokeWidth={1} opacity={0.22} />
        ))}

        {/* true function */}
        <path d={path(GRID_X.map(trueFn))} fill="none" stroke={VIZ.text} strokeWidth={1.5} strokeDasharray="5 4" />

        {/* average fit (bias) */}
        <path d={path(avgFit)} fill="none" stroke={VIZ.teal} strokeWidth={2.5} />

        {/* one example training set, faint */}
        {DATASETS[0].map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill={VIZ.brandLight} opacity={0.45} />
        ))}
        <text x={W - 8} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>x (input)</text>
        <text x={8} y={16} fill={VIZ.text} fontSize={10} opacity={0.85}>y</text>
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-slate-400">
        <span><span style={{ color: VIZ.rose }}>—</span> individual fits ({N_DATASETS} resamples)</span>
        <span><span style={{ color: VIZ.teal }}>—</span> average fit</span>
        <span><span style={{ color: VIZ.text }}>- -</span> true function</span>
      </div>

      <div className="mt-3 mb-3">
        <VizSlider label="k (neighbors averaged)" min={1} max={27} step={2} value={k} onChange={setK} format={(v) => String(v)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="bias²" value={bias2.toFixed(3)} color={VIZ.teal} />
        <VizStat label="variance" value={variance.toFixed(3)} color={VIZ.rose} />
        <VizStat label="bias² + variance" value={(bias2 + variance).toFixed(3)} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
