"use client";

import { useMemo, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  scale,
  seededRandom,
  gaussian,
} from "../viz-kit";

/** Bagging visualization: bootstrap resampling + majority-vote ensemble boundary. */

const N = 30;
const N_TREES = 5;
const GRID = 20; // 20×20 grid for ensemble background
const DOM: [number, number] = [-3, 3];
const W = 220;
const H = 220;
const M = 20; // margin

type Point = { x: number; y: number; label: 1 | -1 };
type Stump = { axis: "x" | "y"; threshold: number; polarity: 1 | -1 };

// ── Data generation ──────────────────────────────────────────────────────────

function generatePoints(): Point[] {
  const rng = seededRandom(53);
  const pts: Point[] = [];
  // 15 class +1 (top half, y > 0 with noise)
  for (let i = 0; i < 15; i++) {
    pts.push({ x: gaussian(rng, 0, 1.2), y: gaussian(rng, 1.2, 0.7), label: 1 });
  }
  // 15 class -1 (bottom half, y < 0 with noise)
  for (let i = 0; i < 15; i++) {
    pts.push({ x: gaussian(rng, 0, 1.2), y: gaussian(rng, -1.2, 0.7), label: -1 });
  }
  // Clamp to domain
  return pts.map((p) => ({
    x: Math.max(DOM[0] + 0.1, Math.min(DOM[1] - 0.1, p.x)),
    y: Math.max(DOM[0] + 0.1, Math.min(DOM[1] - 0.1, p.y)),
    label: p.label,
  }));
}

// ── Stump fitting ─────────────────────────────────────────────────────────────

function predictStump(stump: Stump, x: number, y: number): 1 | -1 {
  const val = stump.axis === "x" ? x : y;
  return ((val >= stump.threshold ? 1 : -1) * stump.polarity) as 1 | -1;
}

function fitStump(pts: Point[]): Stump {
  let bestErr = Infinity;
  let bestStump: Stump = { axis: "y", threshold: 0, polarity: 1 };

  for (const axis of ["x", "y"] as const) {
    const vals = pts.map((p) => (axis === "x" ? p.x : p.y));
    const sorted = [...new Set(vals)].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const threshold = (sorted[i] + sorted[i + 1]) / 2;
      for (const polarity of [1, -1] as const) {
        const stump: Stump = { axis, threshold, polarity };
        let err = 0;
        for (const p of pts) {
          if (predictStump(stump, p.x, p.y) !== p.label) err++;
        }
        if (err < bestErr) {
          bestErr = err;
          bestStump = stump;
        }
      }
    }
  }
  return bestStump;
}

// ── Bootstrap sampling ────────────────────────────────────────────────────────

interface BootstrapResult {
  indices: number[]; // which original indices were drawn (with repetition)
  counts: number[];  // how many times each original point appears
  stump: Stump;
}

function buildBootstraps(pts: Point[]): BootstrapResult[] {
  return Array.from({ length: N_TREES }, (_, treeIdx) => {
    const rng = seededRandom(53 + (treeIdx + 1) * 100);
    const indices: number[] = [];
    const counts = Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const idx = Math.floor(rng() * N);
      indices.push(idx);
      counts[idx]++;
    }
    const sample = indices.map((i) => pts[i]);
    const stump = fitStump(sample);
    return { indices, counts, stump };
  });
}

// ── Grid ensemble predictions ─────────────────────────────────────────────────

interface GridCell {
  cx: number; // data-space center
  cy: number;
  vote: 1 | -1;
}

function computeGrid(stumps: Stump[], nTrees: number): GridCell[] {
  const step = (DOM[1] - DOM[0]) / GRID;
  const cells: GridCell[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const cx = DOM[0] + (col + 0.5) * step;
      const cy = DOM[0] + (row + 0.5) * step;
      let votes = 0;
      for (let t = 0; t < nTrees; t++) {
        votes += predictStump(stumps[t], cx, cy);
      }
      cells.push({ cx, cy, vote: votes >= 0 ? 1 : -1 });
    }
  }
  return cells;
}

// ── Main component ────────────────────────────────────────────────────────────

export function BaggingViz({ className }: { className?: string }) {
  const [nTrees, setNTrees] = useState(3);
  const [sampleIdx, setSampleIdx] = useState(0);

  const pts = useMemo(() => generatePoints(), []);
  const bootstraps = useMemo(() => buildBootstraps(pts), [pts]);

  const stumps = useMemo(
    () => bootstraps.map((b) => b.stump),
    [bootstraps]
  );

  const gridCells = useMemo(
    () => computeGrid(stumps, nTrees),
    [stumps, nTrees]
  );

  const sx = scale(DOM[0], DOM[1], M, W - M);
  const sy = scale(DOM[0], DOM[1], H - M, M); // y flipped

  const current = bootstraps[sampleIdx];

  // OOB count: points with count === 0
  const oobCount = current.counts.filter((c) => c === 0).length;

  // Pixel cell size for grid background
  const cellPx = (W - 2 * M) / GRID;
  const step = (DOM[1] - DOM[0]) / GRID;

  return (
    <VizFrame
      className={className}
      title="Bagging: bootstrap resampling & majority-vote boundary"
      caption="Left: each tree sees a bootstrap resample (faint = not sampled, bold = included). Right: the majority-vote boundary smooths out as more trees are added — high-variance individual stumps average into a stable ensemble."
    >
      <div className="flex gap-3 justify-center flex-wrap">
        {/* ── Left panel: bootstrap sample ── */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400">
            Bootstrap sample {sampleIdx + 1}
          </span>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            role="img"
            aria-label="Bootstrap sample scatter plot"
          >
            <rect x={0} y={0} width={W} height={H} fill={VIZ.card} rx={4} />
            {/* axes */}
            <line x1={M} y1={H - M} x2={W - M} y2={H - M} stroke={VIZ.axis} strokeWidth={1} />
            <line x1={M} y1={M} x2={M} y2={H - M} stroke={VIZ.axis} strokeWidth={1} />
            {/* zero guide */}
            <line
              x1={M} y1={sy(0)} x2={W - M} y2={sy(0)}
              stroke={VIZ.grid} strokeWidth={1} strokeDasharray="3 3"
            />

            {/* stump boundary */}
            {current.stump.axis === "x" ? (
              <line
                x1={sx(current.stump.threshold)} y1={M}
                x2={sx(current.stump.threshold)} y2={H - M}
                stroke={VIZ.orange} strokeWidth={1.5} strokeDasharray="5 3"
              />
            ) : (
              <line
                x1={M} y1={sy(current.stump.threshold)}
                x2={W - M} y2={sy(current.stump.threshold)}
                stroke={VIZ.orange} strokeWidth={1.5} strokeDasharray="5 3"
              />
            )}

            {/* original points — faded or bold by presence */}
            {pts.map((p, i) => {
              const cnt = current.counts[i];
              const inSample = cnt > 0;
              const baseR = 4;
              const r = inSample ? baseR + Math.min(cnt - 1, 2) * 1.5 : baseR;
              const fill = p.label === 1 ? VIZ.brand : VIZ.rose;
              return (
                <circle
                  key={i}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r={r}
                  fill={fill}
                  fillOpacity={inSample ? 0.85 : 0.2}
                  stroke={inSample ? "#0f1117" : "none"}
                  strokeWidth={0.8}
                />
              );
            })}

            <text x={M + 2} y={M - 6} fontSize={9} fill={VIZ.text}>
              stump split (orange dashed)
            </text>
          </svg>
        </div>

        {/* ── Right panel: ensemble boundary ── */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400">
            Ensemble boundary (trees 1–{nTrees})
          </span>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            role="img"
            aria-label="Ensemble majority-vote boundary"
          >
            <rect x={0} y={0} width={W} height={H} fill={VIZ.card} rx={4} />

            {/* grid background */}
            {gridCells.map((cell, i) => {
              const col = i % GRID;
              const row = Math.floor(i / GRID);
              // pixel coords of cell top-left corner in SVG space
              const px = sx(DOM[0] + col * step);
              const py = sy(DOM[0] + (row + 1) * step); // y flipped
              return (
                <rect
                  key={i}
                  x={px}
                  y={py}
                  width={cellPx}
                  height={cellPx}
                  fill={cell.vote === 1 ? VIZ.brand : VIZ.rose}
                  fillOpacity={0.12}
                />
              );
            })}

            {/* axes */}
            <line x1={M} y1={H - M} x2={W - M} y2={H - M} stroke={VIZ.axis} strokeWidth={1} />
            <line x1={M} y1={M} x2={M} y2={H - M} stroke={VIZ.axis} strokeWidth={1} />
            {/* zero guide */}
            <line
              x1={M} y1={sy(0)} x2={W - M} y2={sy(0)}
              stroke={VIZ.grid} strokeWidth={1} strokeDasharray="3 3"
            />

            {/* all 30 original points */}
            {pts.map((p, i) => {
              const fill = p.label === 1 ? VIZ.brand : VIZ.rose;
              return (
                <circle
                  key={i}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r={4}
                  fill={fill}
                  fillOpacity={0.85}
                  stroke="#0f1117"
                  strokeWidth={0.8}
                />
              );
            })}

            <text x={M + 2} y={M - 6} fontSize={9} fill={VIZ.text}>
              majority vote shading
            </text>
          </svg>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="mt-3 flex flex-col gap-3">
        <VizSlider
          label="n_trees in ensemble"
          min={1}
          max={5}
          step={1}
          value={nTrees}
          onChange={(v) => setNTrees(v)}
          format={(v) => String(v)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <VizButton
            onClick={() => setSampleIdx((s) => (s - 1 + N_TREES) % N_TREES)}
          >
            ← Prev sample
          </VizButton>
          <VizButton
            onClick={() => setSampleIdx((s) => (s + 1) % N_TREES)}
          >
            Next sample →
          </VizButton>
          <div className="flex gap-4 ml-auto flex-wrap">
            <VizStat label="trees in ensemble" value={String(nTrees)} />
            <VizStat
              label="current sample"
              value={`${sampleIdx + 1} / ${N_TREES}`}
            />
            <VizStat
              label="OOB size"
              value={`~${oobCount} OOB`}
              color={VIZ.teal}
            />
          </div>
        </div>
      </div>
    </VizFrame>
  );
}
