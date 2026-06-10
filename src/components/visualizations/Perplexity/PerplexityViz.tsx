"use client";

import { useMemo, useState } from "react";
import { VIZ, CLASS_COLORS, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * t-SNE Perplexity Visualization.
 *
 * Precomputes 4 t-SNE-style 2D embeddings of the same 50-point dataset at
 * perplexity values 5, 15, 30, 50. The slider interpolates between adjacent
 * snapshots so you can see how fragmented (low perplexity) vs merged (high
 * perplexity) the clusters look.
 *
 * Data: 50 points from 5 clusters, generated with seededRandom(53).
 * Each perplexity level has hand-designed centroids that qualitatively show:
 *   - perplexity=5:  very fragmented, each class split into multiple tiny blobs
 *   - perplexity=15: moderate clustering, some structure visible
 *   - perplexity=30: clean well-separated clusters (the "sweet spot")
 *   - perplexity=50: clusters start merging, global geometry distorted
 */

const W = 480;
const H = 360;
const M = { top: 12, right: 12, bottom: 12, left: 12 };

const N_POINTS = 50;
const N_CLASSES = 5;
const PERPLEXITIES = [5, 15, 30, 50] as const;

/** Slider range [0, 3] maps across the 4 perplexity snapshots. */
const SLIDER_MAX = 3;

// ── Raw data: 5-class clusters in "high-dimensional" space ─────────────────
// We generate 50 points with class labels using seededRandom(53).
function generateRawData() {
  const rng = seededRandom(53);
  // High-dim cluster centers (we only need labels + relative structure for the sim)
  const classCenters = [
    [0, 0],
    [4, 1],
    [2, 4],
    [-2, 3],
    [-3, -1],
  ] as [number, number][];

  const points: { cls: number; rawX: number; rawY: number }[] = [];
  for (let i = 0; i < N_POINTS; i++) {
    const cls = i % N_CLASSES;
    const [cx, cy] = classCenters[cls];
    const x = cx + gaussian(rng, 0, 0.7);
    const y = cy + gaussian(rng, 0, 0.7);
    points.push({ cls, rawX: x, rawY: y });
  }
  return points;
}

const RAW_DATA = generateRawData();

// ── Simulated t-SNE embeddings at each perplexity level ────────────────────
// For each class at each perplexity level, we define how many sub-blobs the
// class fractures into (low perplexity → more fragmentation) and where those
// sub-blobs land in 2D space. The actual per-point positions are then
// jittered deterministically around those sub-blob centers.

type Snapshot = { x: number; y: number }[];

function buildSnapshot(
  rng: () => number,
  subBlobCenters: [number, number][][],  // [class][blob] → [cx, cy]
  blobSd: number,
): Snapshot {
  const snap: Snapshot = [];
  const classCounts = Array(N_CLASSES).fill(0);

  for (const pt of RAW_DATA) {
    const { cls } = pt;
    const blobs = subBlobCenters[cls];
    // Distribute points round-robin to blobs within the class
    const blobIdx = classCounts[cls] % blobs.length;
    classCounts[cls]++;
    const [bx, by] = blobs[blobIdx];
    snap.push({
      x: bx + gaussian(rng, 0, blobSd),
      y: by + gaussian(rng, 0, blobSd),
    });
  }
  return snap;
}

function buildAllSnapshots(): Snapshot[] {
  const rng = seededRandom(53);

  // perplexity=5: very fragmented — each class splits into 3 sub-blobs
  const snap5 = buildSnapshot(rng, [
    [[-6, -5], [-4, -7], [-6, -9]],          // class 0
    [[2, -8], [5, -6], [3, -10]],             // class 1
    [[-1, -2], [1, -4], [-3, -3]],            // class 2
    [[4, -2], [7, -3], [5, 0]],               // class 3
    [[-5, 1], [-8, -1], [-6, 3]],             // class 4
  ], 0.55);

  // perplexity=15: moderate — 2 sub-blobs per class, slightly closer
  const snap15 = buildSnapshot(rng, [
    [[-5, -4], [-3, -6]],                     // class 0
    [[3, -5], [5, -3]],                       // class 1
    [[0, -1], [-2, -3]],                      // class 2
    [[5, -1], [6, 2]],                        // class 3
    [[-6, 2], [-4, 4]],                       // class 4
  ], 0.7);

  // perplexity=30: clean clusters (sweet spot) — 1 coherent blob per class
  const snap30 = buildSnapshot(rng, [
    [[-4, -3]],
    [[4, -3]],
    [[-0.5, -0.5]],
    [[5, 2]],
    [[-5, 3]],
  ], 0.75);

  // perplexity=50: merging / distorted — blobs expand toward each other
  const snap50 = buildSnapshot(rng, [
    [[-2.5, -2]],
    [[2.5, -2]],
    [[0, 0.5]],
    [[3, 1.5]],
    [[-3, 1.5]],
  ], 1.4);

  return [snap5, snap15, snap30, snap50];
}

const SNAPSHOTS = buildAllSnapshots();

// ── Linear interpolation between adjacent snapshots ───────────────────────
function interpolateSnapshots(snapA: Snapshot, snapB: Snapshot, t: number): Snapshot {
  return snapA.map((a, i) => ({
    x: a.x + (snapB[i].x - a.x) * t,
    y: a.y + (snapB[i].y - a.y) * t,
  }));
}

function getInterpolatedSnapshot(sliderVal: number): { snap: Snapshot; perplexity: number } {
  const clamped = Math.max(0, Math.min(SLIDER_MAX, sliderVal));
  const idx = Math.min(Math.floor(clamped), PERPLEXITIES.length - 2);
  const t = clamped - idx;
  const snap = interpolateSnapshots(SNAPSHOTS[idx], SNAPSHOTS[idx + 1], t);
  // Interpolated perplexity value for display
  const perp = PERPLEXITIES[idx] + (PERPLEXITIES[idx + 1] - PERPLEXITIES[idx]) * t;
  return { snap, perplexity: perp };
}

// ── Compute 2D extent from a snapshot ─────────────────────────────────────
function getExtent(snap: Snapshot): { xMin: number; xMax: number; yMin: number; yMax: number } {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const { x, y } of snap) {
    xMin = Math.min(xMin, x);
    xMax = Math.max(xMax, x);
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  const padX = (xMax - xMin) * 0.12 + 0.5;
  const padY = (yMax - yMin) * 0.12 + 0.5;
  return { xMin: xMin - padX, xMax: xMax + padX, yMin: yMin - padY, yMax: yMax + padY };
}

// ── Component ──────────────────────────────────────────────────────────────
export function PerplexityViz({ className }: { className?: string }) {
  const [sliderVal, setSliderVal] = useState(2); // default near perplexity=30

  const { snap, perplexity } = useMemo(() => getInterpolatedSnapshot(sliderVal), [sliderVal]);

  // Compute scale dynamically based on current snapshot extents
  const { xMin, xMax, yMin, yMax } = useMemo(() => getExtent(snap), [snap]);

  const sx = scale(xMin, xMax, M.left, W - M.right);
  const sy = scale(yMin, yMax, H - M.bottom, M.top);

  // Perplexity label for current tick
  const perpLabel = perplexity.toFixed(0);

  // Description of the current state
  const description = useMemo(() => {
    if (perplexity <= 7) return "Fragmented — many tiny disconnected blobs";
    if (perplexity <= 18) return "Moderate structure — classes partially split";
    if (perplexity <= 35) return "Clean clusters — the typical sweet spot";
    return "Merging — global structure starts to distort";
  }, [perplexity]);

  return (
    <VizFrame
      className={className}
      title="t-SNE Perplexity: Effect on Embedding"
      caption="⚠ t-SNE cluster sizes and inter-cluster distances are NOT meaningful — only topology (which points are neighbors) matters. The same data produces drastically different-looking plots at different perplexity values."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`t-SNE embedding at perplexity ${perpLabel}`}
      >
        {/* Background grid */}
        {[-8, -4, 0, 4, 8].map((v) => (
          <line
            key={`gx-${v}`}
            x1={sx(v)}
            y1={M.top}
            x2={sx(v)}
            y2={H - M.bottom}
            stroke={VIZ.grid}
            strokeWidth={1}
            opacity={0.4}
          />
        ))}
        {[-8, -4, 0, 4, 8].map((v) => (
          <line
            key={`gy-${v}`}
            x1={M.left}
            y1={sy(v)}
            x2={W - M.right}
            y2={sy(v)}
            stroke={VIZ.grid}
            strokeWidth={1}
            opacity={0.4}
          />
        ))}

        {/* Data points */}
        {snap.map((pt, i) => {
          const cls = RAW_DATA[i].cls;
          const color = CLASS_COLORS[cls];
          return (
            <circle
              key={i}
              cx={sx(pt.x)}
              cy={sy(pt.y)}
              r={5}
              fill={color}
              fillOpacity={0.85}
              stroke="#fff"
              strokeWidth={0.8}
            />
          );
        })}

        {/* Legend */}
        {CLASS_COLORS.slice(0, N_CLASSES).map((color, i) => (
          <g key={`legend-${i}`} transform={`translate(${W - M.right - 80}, ${M.top + 6 + i * 18})`}>
            <circle cx={6} cy={6} r={5} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={0.8} />
            <text x={16} y={10} fill={VIZ.text} fontSize={10}>
              Class {i + 1}
            </text>
          </g>
        ))}
        <text x={W - 8} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>embedding dim 1 (arbitrary units)</text>
        <text x={8} y={14} fill={VIZ.text} fontSize={10} opacity={0.85}>embedding dim 2</text>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider
          label="Perplexity"
          min={0}
          max={SLIDER_MAX}
          step={0.01}
          value={sliderVal}
          onChange={setSliderVal}
          format={() => perpLabel}
        />
      </div>

      <div className="flex gap-6 flex-wrap">
        <VizStat label="perplexity" value={perpLabel} color={VIZ.brand} />
        <VizStat label="effective neighbors" value={`~${perpLabel}`} color={VIZ.teal} />
        <VizStat label="structure" value={description} />
      </div>
    </VizFrame>
  );
}
