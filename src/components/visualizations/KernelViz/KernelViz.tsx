"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom } from "../viz-kit";

/**
 * KernelViz — shows why kernel functions make non-linearly separable data
 * separable. Left panel: original 2D space with decision boundary overlay.
 * Right panel: implicit feature space after the chosen kernel mapping.
 * Kernels: Linear, Polynomial (d=2), RBF. RBF bandwidth controlled by γ slider.
 */

const W = 220;
const H = 200;
const M = { top: 16, right: 10, bottom: 20, left: 20 };
// Data domain: [-3, 3] × [-3, 3]
const D: [number, number] = [-3, 3];

type Kernel = "linear" | "poly" | "rbf";

// --- Generate data once (seeded, deterministic) ---
function generateData() {
  const rng = seededRandom(42);
  const inner: { x: number; y: number }[] = [];
  const outer: { x: number; y: number }[] = [];

  // Inner ring: r ∈ [0, 1.2]
  for (let i = 0; i < 12; i++) {
    const r = 0.3 + rng() * 0.9; // [0.3, 1.2]
    const theta = rng() * 2 * Math.PI;
    inner.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
  }
  // Outer ring: r ∈ [1.8, 2.8]
  for (let i = 0; i < 18; i++) {
    const r = 1.8 + rng() * 1.0; // [1.8, 2.8]
    const theta = rng() * 2 * Math.PI;
    outer.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
  }
  return { inner, outer };
}

const DATA = generateData();

// Inner-class centroid (used for RBF reference point)
const CENTROID = {
  x: DATA.inner.reduce((s, p) => s + p.x, 0) / DATA.inner.length,
  y: DATA.inner.reduce((s, p) => s + p.y, 0) / DATA.inner.length,
};

// Heatmap grid dimensions
const GRID_COLS = 22;
const GRID_ROWS = 20;
const CELL_W = (W - M.left - M.right) / GRID_COLS;
const CELL_H = (H - M.top - M.bottom) / GRID_ROWS;

// RBF kernel K(x, c) for a point vs the centroid
function rbfKernel(px: number, py: number, cx: number, cy: number, gamma: number) {
  const dist2 = (px - cx) ** 2 + (py - cy) ** 2;
  return Math.exp(-gamma * dist2);
}

// Decision value for RBF: sign of sum over inner support vectors minus outer
// We approximate via class centroid difference
function rbfDecision(px: number, py: number, gamma: number) {
  const kInner = DATA.inner.reduce(
    (s, p) => s + rbfKernel(px, py, p.x, p.y, gamma),
    0
  );
  const kOuter = DATA.outer.reduce(
    (s, p) => s + rbfKernel(px, py, p.x, p.y, gamma),
    0
  );
  return kInner / DATA.inner.length - kOuter / DATA.outer.length;
}

// Polynomial decision: in the mapped space, the boundary is r^2 = threshold
// threshold = midpoint between mean r^2 of inner vs outer
const INNER_R2 = DATA.inner.reduce((s, p) => s + p.x ** 2 + p.y ** 2, 0) / DATA.inner.length;
const OUTER_R2 = DATA.outer.reduce((s, p) => s + p.x ** 2 + p.y ** 2, 0) / DATA.outer.length;
const POLY_THRESHOLD = (INNER_R2 + OUTER_R2) / 2;

function polyDecision(px: number, py: number) {
  return POLY_THRESHOLD - (px ** 2 + py ** 2); // positive = inner class
}

export function KernelViz({ className }: { className?: string }) {
  const [kernel, setKernel] = useState<Kernel>("rbf");
  const [gamma, setGamma] = useState(0.5);

  const sx = scale(D[0], D[1], M.left, W - M.right);
  const sy = scale(D[0], D[1], H - M.bottom, M.top);

  // --- Left-panel heatmap: decision boundary in original 2D space ---
  const leftCells = useMemo(() => {
    const cells: { col: number; row: number; fill: string }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const px = D[0] + ((col + 0.5) / GRID_COLS) * (D[1] - D[0]);
        const py = D[1] - ((row + 0.5) / GRID_ROWS) * (D[1] - D[0]);

        let val = 0;
        if (kernel === "rbf") {
          val = rbfDecision(px, py, gamma);
        } else if (kernel === "poly") {
          val = polyDecision(px, py);
        }
        // linear: no heatmap, just a line — leave val=0 so cells are neutral

        let fill = "transparent";
        if (kernel !== "linear") {
          const alpha = Math.min(0.35, Math.abs(val) * 0.8);
          fill = val > 0 ? `rgba(99,102,241,${alpha})` : `rgba(244,63,94,${alpha})`;
        }
        cells.push({ col, row, fill });
      }
    }
    return cells;
  }, [kernel, gamma]);

  // --- Right-panel: feature space ---
  // For RBF: heatmap of K(x, centroid) — shows similarity to inner class
  // For Poly: project (x1^2, x2^2) — the two classes become separable
  // For Linear: same as left (no transformation)

  // RBF right panel: K value as colour (blue = high similarity to centroid)
  const rbfRightCells = useMemo(() => {
    if (kernel !== "rbf") return [];
    const cells: { col: number; row: number; fill: string }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const px = D[0] + ((col + 0.5) / GRID_COLS) * (D[1] - D[0]);
        const py = D[1] - ((row + 0.5) / GRID_ROWS) * (D[1] - D[0]);
        const k = rbfKernel(px, py, CENTROID.x, CENTROID.y, gamma);
        const alpha = k * 0.55;
        cells.push({ col, row, fill: `rgba(99,102,241,${alpha})` });
      }
    }
    return cells;
  }, [kernel, gamma]);

  // Polynomial projection: (x1^2, x2^2) domain: [0, ~8] for outer, [0, ~1.5] for inner
  const polyDomain: [number, number] = [0, 9];
  const sxPoly = scale(polyDomain[0], polyDomain[1], M.left, W - M.right);
  const syPoly = scale(polyDomain[0], polyDomain[1], H - M.bottom, M.top);
  // Separator line in poly space: x1^2 + x2^2 = POLY_THRESHOLD => diagonal line
  const polyThreshPx = POLY_THRESHOLD; // threshold value used for line

  // Kernel names for display
  const KERNEL_LABELS: Record<Kernel, string> = {
    linear: "Linear",
    poly: "Poly (d=2)",
    rbf: "RBF",
  };

  const panelStyle = { background: VIZ.card, borderRadius: 8 };

  return (
    <VizFrame
      className={className}
      title="Kernel Trick: Original Space vs Feature Space"
      caption="Left: original 2D data with kernel decision boundary. Right: implicit feature mapping. Switch kernels to see how RBF and Polynomial can separate concentric rings that no linear boundary can split."
    >
      {/* Kernel selector */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(["linear", "poly", "rbf"] as Kernel[]).map((k) => (
          <VizButton key={k} onClick={() => setKernel(k)} active={kernel === k}>
            {KERNEL_LABELS[k]}
          </VizButton>
        ))}
      </div>

      {/* Two SVG panels side by side */}
      <div className="flex gap-3 flex-wrap">
        {/* LEFT: Original 2D space */}
        <div className="flex-1 min-w-[180px]">
          <p className="text-[10px] text-slate-400 mb-1 text-center">Original 2D Space</p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={panelStyle}
            role="img"
            aria-label="Original 2D space"
          >
            {/* Grid */}
            <line x1={M.left} y1={sy(0)} x2={W - M.right} y2={sy(0)} stroke={VIZ.axis} strokeWidth={0.8} />
            <line x1={sx(0)} y1={M.top} x2={sx(0)} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={0.8} />

            {/* Decision region heatmap */}
            {leftCells.map(({ col, row, fill }) => (
              <rect
                key={`l-${col}-${row}`}
                x={M.left + col * CELL_W}
                y={M.top + row * CELL_H}
                width={CELL_W}
                height={CELL_H}
                fill={fill}
              />
            ))}

            {/* Linear: draw the "no separator" horizontal line */}
            {kernel === "linear" && (
              <>
                <line
                  x1={M.left}
                  y1={sy(0)}
                  x2={W - M.right}
                  y2={sy(0)}
                  stroke={VIZ.yellow}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                <text
                  x={W / 2}
                  y={sy(0) - 6}
                  fill={VIZ.yellow}
                  fontSize={9}
                  textAnchor="middle"
                >
                  No linear separator
                </text>
              </>
            )}

            {/* Data points */}
            {DATA.inner.map((p, i) => (
              <circle
                key={`li-${i}`}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={4}
                fill={VIZ.brand}
                stroke="#fff"
                strokeWidth={0.8}
                opacity={0.9}
              />
            ))}
            {DATA.outer.map((p, i) => (
              <circle
                key={`lo-${i}`}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={4}
                fill={VIZ.rose}
                stroke="#fff"
                strokeWidth={0.8}
                opacity={0.9}
              />
            ))}

            {/* Axis labels */}
            <text x={W - M.right} y={sy(0) + 12} fill={VIZ.text} fontSize={9} textAnchor="end">x₁</text>
            <text x={sx(0) + 3} y={M.top + 8} fill={VIZ.text} fontSize={9}>x₂</text>
          </svg>
        </div>

        {/* RIGHT: Feature / kernel space */}
        <div className="flex-1 min-w-[180px]">
          <p className="text-[10px] text-slate-400 mb-1 text-center">
            {kernel === "rbf"
              ? "RBF Similarity to Inner Class"
              : kernel === "poly"
              ? "Polynomial Feature Space (x₁², x₂²)"
              : "Linear Kernel — No Mapping"}
          </p>

          {/* RBF right panel: K(x, centroid) heatmap */}
          {kernel === "rbf" && (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={panelStyle}
              role="img"
              aria-label="RBF kernel similarity"
            >
              <line x1={M.left} y1={sy(0)} x2={W - M.right} y2={sy(0)} stroke={VIZ.axis} strokeWidth={0.8} />
              <line x1={sx(0)} y1={M.top} x2={sx(0)} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={0.8} />

              {rbfRightCells.map(({ col, row, fill }) => (
                <rect
                  key={`r-${col}-${row}`}
                  x={M.left + col * CELL_W}
                  y={M.top + row * CELL_H}
                  width={CELL_W}
                  height={CELL_H}
                  fill={fill}
                />
              ))}

              {/* Centroid marker */}
              <circle cx={sx(CENTROID.x)} cy={sy(CENTROID.y)} r={5} fill={VIZ.teal} stroke="#fff" strokeWidth={1} />
              <text x={sx(CENTROID.x) + 7} y={sy(CENTROID.y) + 4} fill={VIZ.teal} fontSize={8}>c</text>

              {/* Data points */}
              {DATA.inner.map((p, i) => (
                <circle key={`ri-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={VIZ.brand} stroke="#fff" strokeWidth={0.8} opacity={0.85} />
              ))}
              {DATA.outer.map((p, i) => (
                <circle key={`ro-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={VIZ.rose} stroke="#fff" strokeWidth={0.8} opacity={0.85} />
              ))}

              <text x={W / 2} y={H - 4} fill={VIZ.text} fontSize={8} textAnchor="middle">
                High similarity (blue) = inner class region
              </text>
            </svg>
          )}

          {/* Polynomial right panel: projected (x1^2, x2^2) space */}
          {kernel === "poly" && (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={panelStyle}
              role="img"
              aria-label="Polynomial feature space"
            >
              {/* Axes */}
              <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={0.8} />
              <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={0.8} />

              {/* Separator line: x1^2 + x2^2 = POLY_THRESHOLD  => x2^2 = thresh - x1^2
                  Draw as diagonal in the (x1^2, x2^2) plane */}
              {(() => {
                // Line from (0, thresh) to (thresh, 0) clipped to domain
                const x0 = sxPoly(0);
                const y0 = syPoly(Math.min(polyDomain[1], polyThreshPx));
                const x1 = sxPoly(Math.min(polyDomain[1], polyThreshPx));
                const y1 = syPoly(0);
                return (
                  <line
                    x1={x0} y1={y0} x2={x1} y2={y1}
                    stroke={VIZ.teal}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                  />
                );
              })()}

              {/* Inner class points projected */}
              {DATA.inner.map((p, i) => (
                <circle
                  key={`pi-${i}`}
                  cx={sxPoly(p.x ** 2)}
                  cy={syPoly(p.y ** 2)}
                  r={4}
                  fill={VIZ.brand}
                  stroke="#fff"
                  strokeWidth={0.8}
                  opacity={0.9}
                />
              ))}
              {/* Outer class points projected */}
              {DATA.outer.map((p, i) => (
                <circle
                  key={`po-${i}`}
                  cx={sxPoly(p.x ** 2)}
                  cy={syPoly(p.y ** 2)}
                  r={4}
                  fill={VIZ.rose}
                  stroke="#fff"
                  strokeWidth={0.8}
                  opacity={0.9}
                />
              ))}

              <text x={W - M.right} y={H - M.bottom + 12} fill={VIZ.text} fontSize={9} textAnchor="end">x₁²</text>
              <text x={M.left + 3} y={M.top + 8} fill={VIZ.text} fontSize={9}>x₂²</text>
              <text x={W / 2} y={H - 4} fill={VIZ.teal} fontSize={8} textAnchor="middle">
                Separator line (now linear!)
              </text>
            </svg>
          )}

          {/* Linear right panel: same 2D space, labelled */}
          {kernel === "linear" && (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={panelStyle}
              role="img"
              aria-label="Linear kernel: no mapping"
            >
              <line x1={M.left} y1={sy(0)} x2={W - M.right} y2={sy(0)} stroke={VIZ.axis} strokeWidth={0.8} />
              <line x1={sx(0)} y1={M.top} x2={sx(0)} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={0.8} />

              {DATA.inner.map((p, i) => (
                <circle key={`li2-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={VIZ.brand} stroke="#fff" strokeWidth={0.8} opacity={0.9} />
              ))}
              {DATA.outer.map((p, i) => (
                <circle key={`lo2-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={VIZ.rose} stroke="#fff" strokeWidth={0.8} opacity={0.9} />
              ))}

              <text x={W / 2} y={H / 2 - 10} fill={VIZ.text} fontSize={9} textAnchor="middle">Linear kernel =</text>
              <text x={W / 2} y={H / 2 + 4} fill={VIZ.text} fontSize={9} textAnchor="middle">no mapping applied</text>
            </svg>
          )}
        </div>
      </div>

      {/* Gamma slider — only for RBF */}
      {kernel === "rbf" && (
        <div className="mt-3">
          <VizSlider
            label="γ (RBF bandwidth)"
            min={0.1}
            max={2.0}
            step={0.1}
            value={gamma}
            onChange={setGamma}
            format={(v) => v.toFixed(1)}
          />
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-5 mt-3">
        <VizStat label="kernel" value={KERNEL_LABELS[kernel]} color={VIZ.brand} />
        {kernel === "rbf" && <VizStat label="γ" value={gamma.toFixed(1)} color={VIZ.teal} />}
        <VizStat label="inner pts" value="12" color={VIZ.brandLight} />
        <VizStat label="outer pts" value="18" color={VIZ.rose} />
      </div>
    </VizFrame>
  );
}
