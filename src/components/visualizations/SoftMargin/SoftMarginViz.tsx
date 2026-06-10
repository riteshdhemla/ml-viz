"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * Soft-margin SVM. Two overlapping clusters; a linear SVM is retrained from
 * scratch (subgradient descent on the hinge objective) every time C moves.
 * Small C: wide margin, many tolerated violations. Large C: violations are
 * expensive, so the margin narrows to avoid them.
 */

const W = 420;
const H = 360;
const DOM: [number, number] = [-4, 4];

const DATA = (() => {
  const rng = seededRandom(31);
  const pts: { x: number; y: number; label: 1 | -1 }[] = [];
  for (let i = 0; i < 18; i++) pts.push({ x: gaussian(rng, -1.3, 1.0), y: gaussian(rng, -1.0, 1.0), label: -1 });
  for (let i = 0; i < 18; i++) pts.push({ x: gaussian(rng, 1.3, 1.0), y: gaussian(rng, 1.0, 1.0), label: 1 });
  return pts;
})();

/** Train linear soft-margin SVM: min ½‖w‖² + C·Σ max(0, 1 − yᵢ(w·xᵢ+b)). */
function trainSvm(C: number) {
  let w1 = 0.1, w2 = 0.1, b = 0;
  const n = DATA.length;
  for (let it = 0; it < 600; it++) {
    const lr = 0.05 / (1 + it * 0.01);
    let g1 = w1, g2 = w2, gb = 0;
    for (const p of DATA) {
      const m = p.label * (w1 * p.x + w2 * p.y + b);
      if (m < 1) {
        g1 -= C * p.label * p.x;
        g2 -= C * p.label * p.y;
        gb -= C * p.label;
      }
    }
    w1 -= (lr * g1) / n;
    w2 -= (lr * g2) / n;
    b -= (lr * gb) / n;
  }
  return { w1, w2, b };
}

/** Clip the line w·x + b = c to the plot box, returned as 2 endpoints. */
function clipLine(w1: number, w2: number, b: number, c: number): [number, number, number, number] | null {
  const pts: { x: number; y: number }[] = [];
  const [lo, hi] = DOM;
  if (Math.abs(w2) > 1e-9) {
    for (const x of [lo, hi]) {
      const y = (c - b - w1 * x) / w2;
      if (y >= lo - 1e-9 && y <= hi + 1e-9) pts.push({ x, y });
    }
  }
  if (Math.abs(w1) > 1e-9) {
    for (const y of [lo, hi]) {
      const x = (c - b - w2 * y) / w1;
      if (x > lo + 1e-9 && x < hi - 1e-9) pts.push({ x, y });
    }
  }
  if (pts.length < 2) return null;
  return [pts[0].x, pts[0].y, pts[1].x, pts[1].y];
}

export function SoftMarginViz({ className }: { className?: string }) {
  const [logC, setLogC] = useState(0); // C = 10^logC

  const C = 10 ** logC;
  const { w1, w2, b } = useMemo(() => trainSvm(C), [C]);

  const sx = scale(DOM[0], DOM[1], 8, W - 8);
  const sy = scale(DOM[0], DOM[1], H - 8, 8);

  const slacks = DATA.map((p) => Math.max(0, 1 - p.label * (w1 * p.x + w2 * p.y + b)));
  const violators = slacks.filter((s) => s > 1e-6 && s <= 1).length;
  const misclassified = slacks.filter((s) => s > 1).length;
  const marginWidth = 2 / Math.hypot(w1, w2);

  const boundary = clipLine(w1, w2, b, 0);
  const upper = clipLine(w1, w2, b, 1);
  const lower = clipLine(w1, w2, b, -1);

  const toPx = (l: [number, number, number, number]) => ({ x1: sx(l[0]), y1: sy(l[1]), x2: sx(l[2]), y2: sy(l[3]) });

  return (
    <VizFrame
      className={className}
      title="Soft margins: C sets the price of a violation"
      caption="Yellow rings mark margin violators (0 < ξ ≤ 1, inside the band but on the right side); rose rings mark misclassified points (ξ > 1, across the boundary). Small C buys a wide margin by tolerating violations; large C makes each violation expensive, so the margin narrows to exclude them."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="Soft-margin SVM">
        {/* margin band */}
        {upper && lower && (
          <polygon
            points={`${toPx(upper).x1},${toPx(upper).y1} ${toPx(upper).x2},${toPx(upper).y2} ${toPx(lower).x2},${toPx(lower).y2} ${toPx(lower).x1},${toPx(lower).y1}`}
            fill={VIZ.brand}
            opacity={0.08}
          />
        )}
        {upper && <line {...toPx(upper)} stroke={VIZ.brandLight} strokeWidth={1} strokeDasharray="5 4" opacity={0.7} />}
        {lower && <line {...toPx(lower)} stroke={VIZ.brandLight} strokeWidth={1} strokeDasharray="5 4" opacity={0.7} />}
        {boundary && <line {...toPx(boundary)} stroke={VIZ.brand} strokeWidth={2.5} />}

        {/* points: class color fill; ring color encodes slack status */}
        {DATA.map((p, i) => {
          const ring = slacks[i] > 1 ? VIZ.rose : slacks[i] > 1e-6 ? VIZ.yellow : "#0f1117";
          return (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={5}
              fill={p.label === 1 ? VIZ.teal : VIZ.orange}
              stroke={ring}
              strokeWidth={slacks[i] > 1e-6 ? 2.5 : 1}
            />
          );
        })}

        <text x={W - 8} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>feature x₁</text>
        <text x={8} y={16} fill={VIZ.text} fontSize={10} opacity={0.85}>feature x₂</text>
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-slate-400">
        <span><span style={{ color: VIZ.teal }}>●</span> class +1</span>
        <span><span style={{ color: VIZ.orange }}>●</span> class −1</span>
        <span><span style={{ color: VIZ.yellow }}>○</span> violator (0 &lt; ξ ≤ 1)</span>
        <span><span style={{ color: VIZ.rose }}>○</span> misclassified (ξ &gt; 1)</span>
      </div>

      <div className="mt-3 mb-3">
        <VizSlider label="C (violation cost, log scale)" min={-2} max={2} step={0.25} value={logC} onChange={setLogC} format={(v) => (10 ** v).toPrecision(2)} />
      </div>

      <div className="flex gap-6 flex-wrap">
        <VizStat label="C" value={C.toPrecision(3)} color={VIZ.yellow} />
        <VizStat label="margin width 2/‖w‖" value={marginWidth.toFixed(2)} color={VIZ.brandLight} />
        <VizStat label="violators" value={String(violators)} color={VIZ.yellow} />
        <VizStat label="misclassified" value={String(misclassified)} color={VIZ.rose} />
        <VizStat label="Σξ" value={slacks.reduce((s, v) => s + v, 0).toFixed(2)} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
