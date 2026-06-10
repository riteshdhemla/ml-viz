"use client";

import { useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom, gaussian, useAnimationLoop } from "../viz-kit";

/**
 * PCA as variance maximisation. Rotate the projection axis and watch how much
 * of the data's spread it captures; "Find PC1" snaps to the angle that captures
 * the most — the first principal component, the eigenvector of the covariance
 * matrix with the largest eigenvalue.
 */

const W = 420;
const H = 320;
const M = 30;
const DOM: [number, number] = [-4, 4];

// correlated 2D cloud, centred at origin
const DATA = (() => {
  const rng = seededRandom(11);
  return Array.from({ length: 60 }, () => {
    const a = gaussian(rng, 0, 1.8); // along main direction
    const b = gaussian(rng, 0, 0.6); // orthogonal spread
    // rotate by ~30°
    const t = Math.PI / 6;
    return { x: a * Math.cos(t) - b * Math.sin(t), y: a * Math.sin(t) + b * Math.cos(t) };
  });
})();

// total variance + PC1 angle (closed form via covariance eigenvector)
const TOTAL_VAR = DATA.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0) / DATA.length;
const PC1_ANGLE = (() => {
  let cxx = 0, cyy = 0, cxy = 0;
  for (const p of DATA) { cxx += p.x * p.x; cyy += p.y * p.y; cxy += p.x * p.y; }
  const n = DATA.length;
  cxx /= n; cyy /= n; cxy /= n;
  // angle of leading eigenvector of [[cxx,cxy],[cxy,cyy]]
  return 0.5 * Math.atan2(2 * cxy, cxx - cyy);
})();

function varianceAlong(angleRad: number) {
  const ux = Math.cos(angleRad), uy = Math.sin(angleRad);
  return DATA.reduce((s, p) => s + (p.x * ux + p.y * uy) ** 2, 0) / DATA.length;
}

export function PCAViz({ className }: { className?: string }) {
  const [deg, setDeg] = useState(-10);
  const target = useRef<number | null>(null);

  const sx = scale(DOM[0], DOM[1], M, W - M);
  const sy = scale(DOM[0], DOM[1], H - M, M);

  useAnimationLoop((dt) => {
    if (target.current === null) return;
    const t = Math.min(1, dt * 4);
    setDeg((d) => {
      const goal = target.current!;
      const nd = d + (goal - d) * t;
      if (Math.abs(goal - nd) < 0.1) {
        target.current = null;
        return goal;
      }
      return nd;
    });
  }, target.current !== null);

  const rad = (deg * Math.PI) / 180;
  const ux = Math.cos(rad), uy = Math.sin(rad);
  const captured = varianceAlong(rad);
  const pct = (captured / TOTAL_VAR) * 100;
  const isPC1 = Math.abs(((rad - PC1_ANGLE) % Math.PI)) < 0.04 || Math.abs(((rad - PC1_ANGLE) % Math.PI) - Math.PI) < 0.04;

  // axis line endpoints (long, through origin)
  const L = 4;
  const axis = { x0: sx(-L * ux), y0: sy(-L * uy), x1: sx(L * ux), y1: sy(L * uy) };

  return (
    <VizFrame
      className={className}
      title="PCA: the axis of maximum variance"
      caption="Each grey segment is a point's projection onto the axis. PC1 is the direction that captures the most variance — rotate the axis or hit 'Find PC1' to land on it."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="PCA projection">
        <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} fill={VIZ.card} stroke={VIZ.axis} />
        {/* origin crosshair */}
        <line x1={sx(DOM[0])} y1={sy(0)} x2={sx(DOM[1])} y2={sy(0)} stroke={VIZ.axis} strokeWidth={0.5} opacity={0.5} />
        <line x1={sx(0)} y1={sy(DOM[0])} x2={sx(0)} y2={sy(DOM[1])} stroke={VIZ.axis} strokeWidth={0.5} opacity={0.5} />

        {/* projection axis */}
        <line x1={axis.x0} y1={axis.y0} x2={axis.x1} y2={axis.y1} stroke={isPC1 ? VIZ.yellow : VIZ.brandLight} strokeWidth={2.5} />

        {/* projection segments + projected points */}
        {DATA.map((p, i) => {
          const t = p.x * ux + p.y * uy; // scalar projection
          const px = t * ux, py = t * uy;
          return (
            <g key={i}>
              <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(px)} y2={sy(py)} stroke={VIZ.text} strokeWidth={0.5} opacity={0.3} />
              <circle cx={sx(px)} cy={sy(py)} r={2} fill={isPC1 ? VIZ.yellow : VIZ.brandLight} opacity={0.8} />
              <circle cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={VIZ.teal} stroke="#0f1117" strokeWidth={0.5} />
            </g>
          );
        })}
        <text x={W - 8} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>feature x₁</text>
        <text x={8} y={16} fill={VIZ.text} fontSize={10} opacity={0.85}>feature x₂</text>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="axis angle" min={-90} max={90} step={1} value={Math.round(deg)} onChange={(v) => { target.current = null; setDeg(v); }} format={(v) => `${v}°`} />
      </div>

      <div className="flex items-center gap-4">
        <VizButton onClick={() => { target.current = (PC1_ANGLE * 180) / Math.PI; }}>Find PC1</VizButton>
        <div className="flex gap-5 ml-auto">
          <VizStat label="variance captured" value={`${pct.toFixed(1)}%`} color={isPC1 ? VIZ.yellow : VIZ.brand} />
          <VizStat label="status" value={isPC1 ? "PC1 ✓" : "—"} color={isPC1 ? VIZ.yellow : VIZ.text} />
        </div>
      </div>
    </VizFrame>
  );
}
