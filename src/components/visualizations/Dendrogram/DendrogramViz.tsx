"use client";

import { useState, useMemo } from "react";
import { VIZ, CLASS_COLORS, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom } from "../viz-kit";

/**
 * Dendrogram visualization for hierarchical clustering.
 * Shows a complete dendrogram tree with single/complete/average linkage,
 * a draggable cut-height slider, and a scatter plot colored by resulting clusters.
 */

// ── Data ──────────────────────────────────────────────────────────────────────
const N = 8;
const DATA_W = 200;
const DATA_H = 180;

function generatePoints(): { x: number; y: number }[] {
  const rng = seededRandom(41);
  return Array.from({ length: N }, () => ({
    x: rng() * DATA_W,
    y: rng() * DATA_H,
  }));
}

const POINTS = generatePoints();

// ── Hierarchical Clustering (precomputed) ─────────────────────────────────────
type MergeStep = {
  a: number;   // cluster index (leaf = point index, merged = N + step index)
  b: number;
  height: number;
  // leaves covered
  leavesA: number[];
  leavesB: number[];
};

function euclidean(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function buildDistMatrix(pts: { x: number; y: number }[]): number[][] {
  const n = pts.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : euclidean(pts[i], pts[j])))
  );
}

type LinkageType = "single" | "complete" | "average";

function clusterDist(
  leavesA: number[],
  leavesB: number[],
  distMat: number[][],
  linkage: LinkageType
): number {
  const pairs: number[] = [];
  for (const a of leavesA) {
    for (const b of leavesB) {
      pairs.push(distMat[a][b]);
    }
  }
  if (linkage === "single") return Math.min(...pairs);
  if (linkage === "complete") return Math.max(...pairs);
  // average
  return pairs.reduce((s, v) => s + v, 0) / pairs.length;
}

function computeMerges(pts: { x: number; y: number }[], linkage: LinkageType): MergeStep[] {
  const distMat = buildDistMatrix(pts);
  const n = pts.length;

  // clusters: index => list of leaf indices
  const clusters: Map<number, number[]> = new Map();
  for (let i = 0; i < n; i++) clusters.set(i, [i]);

  const steps: MergeStep[] = [];
  let nextId = n;

  while (clusters.size > 1) {
    const ids = Array.from(clusters.keys());
    let bestDist = Infinity;
    let bestA = -1;
    let bestB = -1;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const d = clusterDist(clusters.get(ids[i])!, clusters.get(ids[j])!, distMat, linkage);
        if (d < bestDist) {
          bestDist = d;
          bestA = ids[i];
          bestB = ids[j];
        }
      }
    }

    const leavesA = clusters.get(bestA)!;
    const leavesB = clusters.get(bestB)!;

    steps.push({ a: bestA, b: bestB, height: bestDist, leavesA: [...leavesA], leavesB: [...leavesB] });

    clusters.set(nextId, [...leavesA, ...leavesB]);
    clusters.delete(bestA);
    clusters.delete(bestB);
    nextId++;
  }

  return steps;
}

// Precompute all 3 merge trees at module level
const ALL_MERGES: Record<LinkageType, MergeStep[]> = {
  single: computeMerges(POINTS, "single"),
  complete: computeMerges(POINTS, "complete"),
  average: computeMerges(POINTS, "average"),
};

// ── Cluster assignment from cut height ────────────────────────────────────────
function getClusters(merges: MergeStep[], cutHeight: number): number[] {
  // Build point → cluster mapping by replaying merges
  const clusterOf: number[] = Array.from({ length: N }, (_, i) => i);
  let nextId = N;

  for (const step of merges) {
    if (step.height <= cutHeight) {
      // merge: all leaves of a and b get newId
      const newId = nextId++;
      const allLeaves = [...step.leavesA, ...step.leavesB];
      for (const leaf of allLeaves) {
        clusterOf[leaf] = newId;
      }
    } else {
      nextId++; // keep id numbering consistent
    }
  }

  // Remap cluster ids to 0-based sequential
  const unique = Array.from(new Set(clusterOf));
  const remap = new Map(unique.map((id, i) => [id, i]));
  return clusterOf.map((id) => remap.get(id)!);
}

// ── Dendrogram layout ─────────────────────────────────────────────────────────
/**
 * Assign an x position to each leaf in the dendrogram based on merge order.
 * Returns positions for leaves (0..N-1) ordered by the merge tree.
 */
function getDendrogramLeafOrder(merges: MergeStep[]): number[] {
  // Build tree structure to determine left-to-right leaf order
  type Node = { id: number; leaves: number[]; left?: Node; right?: Node };

  const nodes: Map<number, Node> = new Map();
  for (let i = 0; i < N; i++) nodes.set(i, { id: i, leaves: [i] });
  let nextId = N;

  for (const step of merges) {
    const nodeA = nodes.get(step.a)!;
    const nodeB = nodes.get(step.b)!;
    const merged: Node = {
      id: nextId++,
      leaves: [...step.leavesA, ...step.leavesB],
      left: nodeA,
      right: nodeB,
    };
    nodes.set(merged.id, merged);
  }

  // In-order traversal to get leaf order
  const order: number[] = [];
  function traverse(node: Node) {
    if (!node.left && !node.right) {
      order.push(node.id);
      return;
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
  }

  const root = nodes.get(N + merges.length - 1);
  if (root) traverse(root);

  return order;
}

// ── SVG layout constants ──────────────────────────────────────────────────────
const DEND_W = 300;
const DEND_H = 280;
const DEND_M = { top: 20, right: 20, bottom: 40, left: 40 };

const SCATTER_W = 200;
const SCATTER_H = 200;
const SCATTER_M = { top: 10, right: 10, bottom: 20, left: 20 };

// ── Component ─────────────────────────────────────────────────────────────────
export function DendrogramViz({ className }: { className?: string }) {
  const [linkage, setLinkage] = useState<LinkageType>("single");
  const [cutHeight, setCutHeight] = useState<number>(0);

  const merges = ALL_MERGES[linkage];
  const maxHeight = merges[merges.length - 1]?.height ?? 1;

  // Clamp cutHeight to [0, maxHeight] when linkage changes
  const clampedCut = Math.min(cutHeight, maxHeight);

  const clusters = useMemo(() => getClusters(merges, clampedCut), [merges, clampedCut]);
  const numClusters = new Set(clusters).size;

  const leafOrder = useMemo(() => getDendrogramLeafOrder(merges), [merges]);

  // Leaf x positions in dendrogram
  const leafPos: number[] = useMemo(() => {
    const pos = new Array<number>(N);
    const xInner = DEND_W - DEND_M.left - DEND_M.right;
    for (let rank = 0; rank < leafOrder.length; rank++) {
      const leaf = leafOrder[rank];
      pos[leaf] = DEND_M.left + ((rank + 0.5) / N) * xInner;
    }
    return pos;
  }, [leafOrder]);

  // Y scale: height 0 at bottom, maxHeight at top
  const sy = useMemo(
    () => scale(0, maxHeight, DEND_H - DEND_M.bottom, DEND_M.top),
    [maxHeight]
  );

  // Build dendrogram SVG paths
  // Each merge: horizontal bar at step.height connecting leftmost and rightmost leaf of each sub-cluster,
  // plus vertical lines down from each sub-cluster's highest merge (or 0 for leaves)
  const dendPaths = useMemo(() => {
    // Track the "top" y of each cluster node (by cluster id used in merges)
    const topHeight = new Map<number, number>();
    for (let i = 0; i < N; i++) topHeight.set(i, 0);
    let nextNodeId = N;

    const paths: Array<{
      x1: number; x2: number; y: number; // horizontal bar
      lx: number; ly1: number; ly2: number; // left vertical
      rx: number; ry1: number; ry2: number; // right vertical
      height: number;
    }> = [];

    for (const step of merges) {
      const leavesA = step.leavesA;
      const leavesB = step.leavesB;

      const xA = leavesA.map((l) => leafPos[l]);
      const xB = leavesB.map((l) => leafPos[l]);

      const minXA = Math.min(...xA);
      const maxXA = Math.max(...xA);
      const minXB = Math.min(...xB);
      const maxXB = Math.max(...xB);

      // Midpoints for vertical stems
      const midA = (minXA + maxXA) / 2;
      const midB = (minXB + maxXB) / 2;

      const hA = topHeight.get(step.a) ?? 0;
      const hB = topHeight.get(step.b) ?? 0;

      paths.push({
        x1: midA,
        x2: midB,
        y: sy(step.height),
        lx: midA,
        ly1: sy(hA),
        ly2: sy(step.height),
        rx: midB,
        ry1: sy(hB),
        ry2: sy(step.height),
        height: step.height,
      });

      topHeight.set(nextNodeId, step.height);
      nextNodeId++;
    }

    return paths;
  }, [merges, leafPos, sy]);

  // Scatter scale
  const scatterX = scale(0, DATA_W, SCATTER_M.left, SCATTER_W - SCATTER_M.right);
  const scatterY = scale(0, DATA_H, SCATTER_H - SCATTER_M.bottom, SCATTER_M.top);

  const linkageOptions: { key: LinkageType; label: string }[] = [
    { key: "single", label: "Single" },
    { key: "complete", label: "Complete" },
    { key: "average", label: "Average" },
  ];

  const cutY = sy(clampedCut);

  return (
    <VizFrame
      className={className}
      title="Hierarchical Clustering — Dendrogram"
      caption="Left: dendrogram tree — horizontal lines are merge events, height = distance. Drag the cut-height slider to slice the tree and reveal clusters. Right: scatter plot colored by resulting cluster assignment."
    >
      {/* Linkage toggle */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-slate-400 self-center mr-1">Linkage:</span>
        {linkageOptions.map(({ key, label }) => (
          <VizButton
            key={key}
            onClick={() => {
              setLinkage(key);
              setCutHeight(0);
            }}
            active={linkage === key}
          >
            {label}
          </VizButton>
        ))}
      </div>

      {/* Main SVG area: dendrogram + scatter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Dendrogram panel */}
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">Dendrogram</p>
          <svg
            viewBox={`0 0 ${DEND_W} ${DEND_H}`}
            className="w-full"
            role="img"
            aria-label="Dendrogram tree"
          >
            {/* Y-axis */}
            <line
              x1={DEND_M.left}
              y1={DEND_M.top}
              x2={DEND_M.left}
              y2={DEND_H - DEND_M.bottom}
              stroke={VIZ.axis}
              strokeWidth={1}
            />
            {/* Y-axis tick labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const val = frac * maxHeight;
              const yy = sy(val);
              return (
                <g key={frac}>
                  <line x1={DEND_M.left - 4} y1={yy} x2={DEND_M.left} y2={yy} stroke={VIZ.axis} strokeWidth={1} />
                  <text x={DEND_M.left - 6} y={yy + 4} fill={VIZ.text} fontSize={9} textAnchor="end">
                    {val.toFixed(0)}
                  </text>
                </g>
              );
            })}
            {/* Y-axis label */}
            <text
              x={10}
              y={DEND_H / 2}
              fill={VIZ.text}
              fontSize={9}
              textAnchor="middle"
              transform={`rotate(-90, 10, ${DEND_H / 2})`}
            >
              distance
            </text>

            {/* Dendrogram branches */}
            {dendPaths.map((p, i) => {
              const belowCut = p.height <= clampedCut;
              const color = belowCut ? VIZ.axis : VIZ.brandLight;
              const opacity = belowCut ? 0.35 : 0.85;
              return (
                <g key={i} stroke={color} strokeWidth={1.5} fill="none" opacity={opacity}>
                  {/* Left vertical */}
                  <line x1={p.lx} y1={p.ly1} x2={p.lx} y2={p.ly2} />
                  {/* Right vertical */}
                  <line x1={p.rx} y1={p.ry1} x2={p.rx} y2={p.ry2} />
                  {/* Horizontal bar */}
                  <line x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} />
                </g>
              );
            })}

            {/* Leaf dots colored by cluster */}
            {leafOrder.map((leafIdx) => {
              const cx = leafPos[leafIdx];
              const cy = sy(0);
              const clr = CLASS_COLORS[clusters[leafIdx] % CLASS_COLORS.length];
              return (
                <g key={leafIdx}>
                  <circle cx={cx} cy={cy} r={5} fill={clr} stroke="#fff" strokeWidth={1} />
                  <text x={cx} y={cy + 14} fill={VIZ.text} fontSize={9} textAnchor="middle">
                    {leafIdx + 1}
                  </text>
                </g>
              );
            })}

            {/* Cut-height dashed line */}
            {clampedCut > 0 && (
              <line
                x1={DEND_M.left}
                y1={cutY}
                x2={DEND_W - DEND_M.right}
                y2={cutY}
                stroke={VIZ.orange}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.9}
              />
            )}
          </svg>
        </div>

        {/* Scatter panel */}
        <div className="flex-shrink-0">
          <p className="text-xs text-slate-500 mb-1">Scatter</p>
          <svg
            viewBox={`0 0 ${SCATTER_W} ${SCATTER_H}`}
            className="w-full max-w-[200px]"
            role="img"
            aria-label="Scatter plot colored by cluster"
          >
            {POINTS.map((pt, i) => {
              const clr = CLASS_COLORS[clusters[i] % CLASS_COLORS.length];
              return (
                <circle
                  key={i}
                  cx={scatterX(pt.x)}
                  cy={scatterY(pt.y)}
                  r={6}
                  fill={clr}
                  stroke="#fff"
                  strokeWidth={1.2}
                  opacity={0.9}
                />
              );
            })}
            {/* Point labels */}
            {POINTS.map((pt, i) => (
              <text
                key={i}
                x={scatterX(pt.x) + 9}
                y={scatterY(pt.y) + 4}
                fill={VIZ.text}
                fontSize={9}
              >
                {i + 1}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Cut-height slider */}
      <div className="mt-3">
        <VizSlider
          label="cut height"
          min={0}
          max={maxHeight}
          step={maxHeight / 200}
          value={clampedCut}
          onChange={(v) => setCutHeight(v)}
          format={(v) => v.toFixed(1)}
        />
      </div>

      {/* Stats */}
      <div className="flex gap-6 mt-3">
        <VizStat label="linkage" value={linkage} />
        <VizStat label="cut height" value={clampedCut.toFixed(1)} color={VIZ.orange} />
        <VizStat label="clusters" value={String(numClusters)} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
