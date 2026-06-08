"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom, gaussian, useAnimationLoop } from "../viz-kit";

/**
 * The max-margin idea behind SVMs. For any boundary orientation, the best line
 * sits halfway between the two classes; its margin is the gap to the closest
 * points (the support vectors). "Maximize margin" rotates to the orientation
 * with the widest gap — the SVM solution.
 */

const W = 360;
const H = 360;
const DOM: [number, number] = [-3.5, 3.5];

const DATA = (() => {
  const rng = seededRandom(31);
  const pts: { x: number; y: number; label: number }[] = [];
  for (let i = 0; i < 12; i++) pts.push({ x: gaussian(rng, -1.3, 0.6), y: gaussian(rng, -1.1, 0.7), label: 0 });
  for (let i = 0; i < 12; i++) pts.push({ x: gaussian(rng, 1.4, 0.6), y: gaussian(rng, 1.2, 0.7), label: 1 });
  return pts;
})();

// for a normal direction at angle θ, compute the max-margin separation
function marginAt(angleRad: number) {
  const ux = Math.cos(angleRad);
  const uy = Math.sin(angleRad);
  let max0 = -Infinity;
  let min1 = Infinity;
  let sv0 = 0;
  let sv1 = 0;
  DATA.forEach((p, i) => {
    const proj = p.x * ux + p.y * uy;
    if (p.label === 0 && proj > max0) { max0 = proj; sv0 = i; }
    if (p.label === 1 && proj < min1) { min1 = proj; sv1 = i; }
  });
  const margin = (min1 - max0) / 2; // negative if not separable at this angle
  const offset = (min1 + max0) / 2;
  return { ux, uy, margin, offset, sv0, sv1 };
}

const BEST_ANGLE = (() => {
  let best = 0;
  let bestM = -Infinity;
  for (let d = 0; d < 180; d++) {
    const m = marginAt((d * Math.PI) / 180).margin;
    if (m > bestM) { bestM = m; best = d; }
  }
  return best;
})();

export function MarginViz({ className }: { className?: string }) {
  const [deg, setDeg] = useState(20);
  const target = useRef<number | null>(null);

  useAnimationLoop((dt) => {
    if (target.current === null) return;
    const goal = target.current;
    setDeg((d) => {
      const nd = d + (goal - d) * Math.min(1, dt * 4);
      if (Math.abs(goal - nd) < 0.2) { target.current = null; return goal; }
      return nd;
    });
  }, target.current !== null);

  const sx = scale(DOM[0], DOM[1], 12, W - 12);
  const sy = scale(DOM[0], DOM[1], H - 12, 12);

  const { ux, uy, margin, offset, sv0, sv1 } = useMemo(() => marginAt((deg * Math.PI) / 180), [deg]);
  const separable = margin > 0;

  // boundary: points x with x·u = offset. Direction along boundary = (-uy, ux).
  const bx = -uy;
  const by = ux;
  const cx0 = offset * ux;
  const cy0 = offset * uy;
  const lineFor = (o: number) => {
    const px = o * ux;
    const py = o * uy;
    return { x1: sx(px - 5 * bx), y1: sy(py - 5 * by), x2: sx(px + 5 * bx), y2: sy(py + 5 * by) };
  };
  const boundary = { x1: sx(cx0 - 5 * bx), y1: sy(cy0 - 5 * by), x2: sx(cx0 + 5 * bx), y2: sy(cy0 + 5 * by) };
  const m0 = lineFor(offset - margin);
  const m1 = lineFor(offset + margin);

  return (
    <VizFrame
      className={className}
      title="Maximum-margin classifier (SVM)"
      caption="Among all lines that separate the classes, the SVM picks the one with the widest margin to the nearest points — the support vectors (ringed). A wider margin generalizes better."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto block" role="img" aria-label="SVM max margin">
        <rect x={6} y={6} width={W - 12} height={H - 12} fill={VIZ.card} stroke={VIZ.axis} />

        {/* margin band */}
        {separable && (
          <>
            <line x1={m0.x1} y1={m0.y1} x2={m0.x2} y2={m0.y2} stroke={VIZ.text} strokeWidth={1} strokeDasharray="5 4" opacity={0.6} />
            <line x1={m1.x1} y1={m1.y1} x2={m1.x2} y2={m1.y2} stroke={VIZ.text} strokeWidth={1} strokeDasharray="5 4" opacity={0.6} />
          </>
        )}
        {/* boundary */}
        <line x1={boundary.x1} y1={boundary.y1} x2={boundary.x2} y2={boundary.y2} stroke={separable ? VIZ.yellow : VIZ.rose} strokeWidth={2.5} />

        {DATA.map((p, i) => {
          const isSV = separable && (i === sv0 || i === sv1);
          return (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={isSV ? 7 : 5} fill={p.label === 1 ? VIZ.brand : VIZ.teal} stroke={isSV ? VIZ.yellow : "#0f1117"} strokeWidth={isSV ? 2.5 : 1} />
          );
        })}
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="boundary angle" min={0} max={179} step={1} value={Math.round(deg)} onChange={(v) => { target.current = null; setDeg(v); }} format={(v) => `${v}°`} />
      </div>

      <div className="flex items-center gap-4">
        <VizButton onClick={() => { target.current = BEST_ANGLE; }}>Maximize margin</VizButton>
        <div className="flex gap-4 ml-auto">
          <VizStat label="margin" value={separable ? margin.toFixed(2) : "—"} color={separable ? VIZ.teal : VIZ.rose} />
          <VizStat label="status" value={separable ? "separates" : "not separable"} color={separable ? VIZ.teal : VIZ.rose} />
        </div>
      </div>
    </VizFrame>
  );
}
