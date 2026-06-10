"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * PCA as lossy compression. Correlated 2D points are reconstructed from
 * their first principal component alone (m=1) or both components (m=2).
 * The rose segments are the per-point reconstruction errors; their mean
 * square equals exactly the discarded eigenvalue λ₂.
 */

const W = 420;
const H = 340;
const DOM: [number, number] = [-4, 4];

const DATA = (() => {
  const rng = seededRandom(23);
  return Array.from({ length: 40 }, () => {
    const t = gaussian(rng, 0, 1.6);
    const n = gaussian(rng, 0, 0.55);
    // points spread along a slanted direction (angle ~30°) with small noise across it
    return { x: t * Math.cos(0.52) - n * Math.sin(0.52), y: t * Math.sin(0.52) + n * Math.cos(0.52) };
  });
})();

/** Closed-form PCA of the 2x2 covariance matrix. */
const PCA = (() => {
  const n = DATA.length;
  const mx = DATA.reduce((s, p) => s + p.x, 0) / n;
  const my = DATA.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of DATA) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  sxx /= n; syy /= n; sxy /= n;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det);
  const l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
  const v1 = (() => {
    const v = Math.abs(sxy) > 1e-9 ? { x: l1 - syy, y: sxy } : { x: 1, y: 0 };
    const len = Math.hypot(v.x, v.y);
    return { x: v.x / len, y: v.y / len };
  })();
  const v2 = { x: -v1.y, y: v1.x };
  return { mean: { x: mx, y: my }, l1, l2, v1, v2 };
})();

export function PCAReconstructionViz({ className }: { className?: string }) {
  const [m, setM] = useState<1 | 2>(1);

  const sx = scale(DOM[0], DOM[1], 8, W - 8);
  const sy = scale(DOM[0], DOM[1], H - 8, 8);

  const recon = useMemo(
    () =>
      DATA.map((p) => {
        const dx = p.x - PCA.mean.x;
        const dy = p.y - PCA.mean.y;
        const c1 = dx * PCA.v1.x + dy * PCA.v1.y;
        const c2 = dx * PCA.v2.x + dy * PCA.v2.y;
        const keep2 = m === 2 ? c2 : 0;
        return {
          x: PCA.mean.x + c1 * PCA.v1.x + keep2 * PCA.v2.x,
          y: PCA.mean.y + c1 * PCA.v1.y + keep2 * PCA.v2.y,
        };
      }),
    [m]
  );

  const mse = DATA.reduce((s, p, i) => s + (p.x - recon[i].x) ** 2 + (p.y - recon[i].y) ** 2, 0) / DATA.length;
  const explained = m === 2 ? 1 : PCA.l1 / (PCA.l1 + PCA.l2);

  const axisLine = (v: { x: number; y: number }, len: number) => ({
    x1: sx(PCA.mean.x - v.x * len),
    y1: sy(PCA.mean.y - v.y * len),
    x2: sx(PCA.mean.x + v.x * len),
    y2: sy(PCA.mean.y + v.y * len),
  });

  return (
    <VizFrame
      className={className}
      title="Reconstruction from m components"
      caption="With m=1, every point is replaced by its shadow on PC1 (teal axis); the rose segments are the information thrown away, and their mean square equals exactly the discarded eigenvalue λ₂. With m=2, nothing is discarded and reconstruction is perfect — that's all of PCA's compression story in one picture."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <VizButton onClick={() => setM(1)} active={m === 1}>keep 1 component</VizButton>
        <VizButton onClick={() => setM(2)} active={m === 2}>keep 2 components</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="PCA reconstruction">
        {/* principal axes */}
        <line {...axisLine(PCA.v1, 4)} stroke={VIZ.teal} strokeWidth={2} opacity={0.8} />
        <line {...axisLine(PCA.v2, 1.4)} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />

        {/* reconstruction error segments */}
        {m === 1 &&
          DATA.map((p, i) => (
            <line key={`e${i}`} x1={sx(p.x)} y1={sy(p.y)} x2={sx(recon[i].x)} y2={sy(recon[i].y)} stroke={VIZ.rose} strokeWidth={1.2} opacity={0.6} />
          ))}

        {/* original points */}
        {DATA.map((p, i) => (
          <circle key={`p${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={VIZ.brandLight} opacity={m === 1 ? 0.45 : 0.9} />
        ))}

        {/* reconstructed points */}
        {m === 1 &&
          recon.map((p, i) => (
            <circle key={`r${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={VIZ.teal} stroke="#0f1117" strokeWidth={1} />
          ))}

        <text x={W - 8} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>feature x₁</text>
        <text x={8} y={16} fill={VIZ.text} fontSize={10} opacity={0.85}>feature x₂</text>
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-slate-400">
        <span><span style={{ color: VIZ.teal }}>—</span> PC1 axis</span>
        <span><span style={{ color: VIZ.yellow }}>- -</span> PC2 axis</span>
        {m === 1 && <span><span style={{ color: VIZ.rose }}>—</span> reconstruction error</span>}
        {m === 1 && <span><span style={{ color: VIZ.teal }}>●</span> reconstructed point</span>}
      </div>

      <div className="flex gap-6 mt-3 flex-wrap">
        <VizStat label="components kept" value={`${m} / 2`} color={VIZ.yellow} />
        <VizStat label="variance explained" value={`${(explained * 100).toFixed(1)}%`} color={VIZ.teal} />
        <VizStat label="reconstruction MSE" value={mse.toFixed(3)} color={m === 1 ? VIZ.rose : VIZ.teal} />
        <VizStat label="discarded λ₂" value={m === 1 ? PCA.l2.toFixed(3) : "0.000"} color={VIZ.text} />
      </div>
    </VizFrame>
  );
}
