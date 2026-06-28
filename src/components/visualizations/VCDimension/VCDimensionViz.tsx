"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat, scale } from "../viz-kit";

/**
 * VC dimension by shattering. A linear classifier in 2D can *shatter* 3 points
 * — realise all 2³ = 8 ways of labelling them with +/− using a single straight
 * line — but it cannot shatter 4 points in convex position (the XOR-style
 * diagonal labelling has no separating line). Hence VC dimension = 3.
 *
 * Click a point to flip its label; step through every labelling to see which
 * ones a line can separate. The running tally shows whether the set is
 * shattered (all 2ⁿ labellings separable).
 */

const W = 360;
const H = 300;
const LO = 0;
const HI = 10;

// Fixed point layouts. 3 points form a triangle (general position → shatterable).
// 4 points sit in convex position (a square) → the diagonal labelling fails.
const LAYOUTS: Record<number, { x: number; y: number }[]> = {
  3: [
    { x: 2.4, y: 3 },
    { x: 5, y: 7.6 },
    { x: 7.6, y: 3 },
  ],
  4: [
    { x: 2.6, y: 2.6 },
    { x: 7.4, y: 2.6 },
    { x: 7.4, y: 7.4 },
    { x: 2.6, y: 7.4 },
  ],
};

const ANGLES = 240; // resolution of the normal-direction sweep

type Pt = { x: number; y: number };

/**
 * Max-margin linear separator for a given labelling, found by sweeping the
 * separating line's normal direction. Returns null when no line separates the
 * two classes (the labelling is not linearly realisable).
 */
function separator(points: Pt[], labels: boolean[]) {
  let best: { wx: number; wy: number; thresh: number; posSide: number } | null = null;
  let bestGap = -Infinity;

  for (let a = 0; a < ANGLES; a++) {
    const th = (a / ANGLES) * Math.PI;
    const wx = Math.cos(th);
    const wy = Math.sin(th);

    let posMin = Infinity;
    let posMax = -Infinity;
    let negMin = Infinity;
    let negMax = -Infinity;
    points.forEach((p, i) => {
      const proj = p.x * wx + p.y * wy;
      if (labels[i]) {
        posMin = Math.min(posMin, proj);
        posMax = Math.max(posMax, proj);
      } else {
        negMin = Math.min(negMin, proj);
        negMax = Math.max(negMax, proj);
      }
    });

    // Trivial labellings (one class empty) — any line on the far side works.
    if (posMin === Infinity || negMin === Infinity) {
      if (!best) {
        const all = points.map((p) => p.x * wx + p.y * wy);
        const thresh = Math.min(...all) - 1;
        best = { wx, wy, thresh, posSide: posMin === Infinity ? -1 : 1 };
      }
      continue;
    }

    if (posMax < negMin) {
      const gap = negMin - posMax;
      if (gap > bestGap) {
        bestGap = gap;
        best = { wx, wy, thresh: (posMax + negMin) / 2, posSide: -1 };
      }
    } else if (negMax < posMin) {
      const gap = posMin - negMax;
      if (gap > bestGap) {
        bestGap = gap;
        best = { wx, wy, thresh: (negMax + posMin) / 2, posSide: 1 };
      }
    }
  }
  // `best` is the max-margin line, or a trivial line for one-class labellings,
  // or null when the two classes cannot be linearly separated.
  return best;
}

/** Whether *all* 2ⁿ labellings of a point set are linearly separable. */
function countSeparable(points: Pt[]) {
  const n = points.length;
  let sep = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const labels = points.map((_, i) => (mask & (1 << i)) !== 0);
    if (separator(points, labels)) sep++;
  }
  return { sep, total: 1 << n };
}

/** Intersections of the line w·x = thresh with the [LO,HI]² box. */
function lineEndpoints(wx: number, wy: number, thresh: number): Pt[] {
  const pts: Pt[] = [];
  if (Math.abs(wy) > 1e-9) {
    for (const x of [LO, HI]) {
      const y = (thresh - wx * x) / wy;
      if (y >= LO - 1e-6 && y <= HI + 1e-6) pts.push({ x, y });
    }
  }
  if (Math.abs(wx) > 1e-9) {
    for (const y of [LO, HI]) {
      const x = (thresh - wy * y) / wx;
      if (x >= LO - 1e-6 && x <= HI + 1e-6) pts.push({ x, y });
    }
  }
  const uniq: Pt[] = [];
  for (const p of pts) {
    if (!uniq.some((q) => Math.abs(q.x - p.x) < 1e-4 && Math.abs(q.y - p.y) < 1e-4)) uniq.push(p);
  }
  return uniq.slice(0, 2);
}

/** Split the box into the two half-plane polygons either side of the line. */
function halfPlanes(wx: number, wy: number, thresh: number, posSide: number) {
  const corners: Pt[] = [
    { x: LO, y: LO },
    { x: HI, y: LO },
    { x: HI, y: HI },
    { x: LO, y: HI },
  ];
  const ends = lineEndpoints(wx, wy, thresh);
  const side = (p: Pt) => (wx * p.x + wy * p.y - thresh) * posSide;
  const order = (pts: Pt[]) => {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  };
  const pos = order([...corners.filter((c) => side(c) > 0), ...ends]);
  const neg = order([...corners.filter((c) => side(c) < 0), ...ends]);
  return { pos, neg };
}

export function VCDimensionViz({ className }: { className?: string }) {
  const [n, setN] = useState(3);
  const [idx, setIdx] = useState(0);

  const sx = scale(LO, HI, 14, W - 14);
  const sy = scale(LO, HI, H - 14, 14);

  const points = LAYOUTS[n];
  const labels = useMemo(
    () => points.map((_, i) => (idx & (1 << i)) !== 0),
    [points, idx]
  );

  const sep = useMemo(() => separator(points, labels), [points, labels]);
  const tally = useMemo(() => countSeparable(points), [points]);
  const shattered = tally.sep === tally.total;

  const regions = sep ? halfPlanes(sep.wx, sep.wy, sep.thresh, sep.posSide) : null;
  const ends = sep ? lineEndpoints(sep.wx, sep.wy, sep.thresh) : [];
  const poly = (pts: Pt[]) => pts.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  const setPoints = (count: number) => {
    setN(count);
    setIdx(0);
  };
  const toggle = (i: number) => setIdx((m) => m ^ (1 << i));
  const total = 1 << n;

  return (
    <VizFrame
      className={className}
      title="Can a straight line shatter these points?"
      caption="A linear classifier shatters a point set if it can realise every +/− labelling. Three points in general position give 8 labellings — all separable. Four points in convex position fail on the diagonal (XOR) labelling, so no line works. The largest set that can always be shattered is the VC dimension: 3 for a 2D linear classifier."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-md mx-auto block"
        role="img"
        aria-label="VC dimension shattering visualization"
      >
        {/* half-plane shading when a separator exists */}
        {regions && (
          <>
            <polygon points={poly(regions.pos)} fill={VIZ.teal} opacity={0.1} />
            <polygon points={poly(regions.neg)} fill={VIZ.rose} opacity={0.1} />
          </>
        )}

        {/* separating line, or a "no line" marker */}
        {sep && ends.length === 2 ? (
          <line
            x1={sx(ends[0].x)}
            y1={sy(ends[0].y)}
            x2={sx(ends[1].x)}
            y2={sy(ends[1].y)}
            stroke={VIZ.textBright}
            strokeWidth={2}
          />
        ) : (
          <text x={W / 2} y={24} fill={VIZ.rose} fontSize={12} fontWeight={600} textAnchor="middle">
            ✗ no line separates this labelling
          </text>
        )}

        {/* the points, coloured by current label */}
        {points.map((p, i) => (
          <g key={i} onClick={() => toggle(i)} className="cursor-pointer">
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={11}
              fill={labels[i] ? VIZ.teal : VIZ.rose}
              stroke={VIZ.card}
              strokeWidth={2}
            />
            <text
              x={sx(p.x)}
              y={sy(p.y) + 4}
              fill="#0f1117"
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
              style={{ pointerEvents: "none" }}
            >
              {labels[i] ? "+" : "−"}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-slate-400 mr-1">Points:</span>
        <VizButton active={n === 3} onClick={() => setPoints(3)}>
          3 points
        </VizButton>
        <VizButton active={n === 4} onClick={() => setPoints(4)}>
          4 points
        </VizButton>
        <span className="text-xs text-slate-400 ml-2 mr-1">Labelling:</span>
        <VizButton onClick={() => setIdx((m) => (m - 1 + total) % total)}>‹ prev</VizButton>
        <VizButton onClick={() => setIdx((m) => (m + 1) % total)}>next ›</VizButton>
        <span className="font-mono text-xs text-white">
          {idx + 1} / {total}
        </span>
      </div>

      <p className="text-[11px] text-slate-500 mt-2">
        Tip: click any point to flip its label.
      </p>

      <div className="flex gap-6 mt-3">
        <VizStat
          label="separable labellings"
          value={`${tally.sep} / ${tally.total}`}
          color={shattered ? VIZ.teal : VIZ.yellow}
        />
        <VizStat
          label="this labelling"
          value={sep ? "separable" : "not separable"}
          color={sep ? VIZ.teal : VIZ.rose}
        />
        <VizStat
          label="shattered?"
          value={shattered ? "yes — VC ≥ " + n : "no"}
          color={shattered ? VIZ.teal : VIZ.rose}
        />
      </div>
    </VizFrame>
  );
}
