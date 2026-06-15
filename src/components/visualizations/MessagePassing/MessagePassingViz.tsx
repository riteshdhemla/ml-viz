"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat } from "../viz-kit";

/**
 * Message passing on a small graph. Each node holds a scalar feature (shown as
 * colour). One "step" replaces every node's value with the mean of its
 * neighbours (including itself) — one GCN-style round. Stepping repeatedly shows
 * information spreading and, eventually, all nodes converging to the same value
 * (over-smoothing). The selected node's incoming messages are highlighted.
 */

const NODES = [
  { id: 0, x: 70, y: 60 },
  { id: 1, x: 180, y: 40 },
  { id: 2, x: 300, y: 70 },
  { id: 3, x: 130, y: 160 },
  { id: 4, x: 260, y: 170 },
  { id: 5, x: 380, y: 140 },
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [2, 4],
  [3, 4],
  [2, 5],
  [4, 5],
];

const INIT = [0.05, 0.95, 0.5, 0.2, 0.8, 0.35];

// adjacency with self-loops
const ADJ: number[][] = (() => {
  const a = NODES.map(() => NODES.map(() => 0));
  for (const [u, v] of EDGES) {
    a[u][v] = 1;
    a[v][u] = 1;
  }
  for (let i = 0; i < NODES.length; i++) a[i][i] = 1;
  return a;
})();

function step(feats: number[]): number[] {
  return feats.map((_, v) => {
    const nb = ADJ[v].map((e, u) => (e ? u : -1)).filter((u) => u >= 0);
    return nb.reduce((s, u) => s + feats[u], 0) / nb.length;
  });
}

/** value 0–1 → dark→indigo colour. */
function color(t: number): string {
  const r = Math.round(0x1a + t * (0x6b - 0x1a));
  const g = Math.round(0x1d + t * (0x72 - 0x1d));
  const b = Math.round(0x27 + t * (0xf1 - 0x27));
  return `rgb(${r},${g},${b})`;
}

export function MessagePassingViz({ className }: { className?: string }) {
  const [feats, setFeats] = useState<number[]>(INIT);
  const [round, setRound] = useState(0);
  const [sel, setSel] = useState(4);

  const spread = Math.max(...feats) - Math.min(...feats);
  const selNeighbors = ADJ[sel]
    .map((e, u) => (e && u !== sel ? u : -1))
    .filter((u) => u >= 0);

  function doStep() {
    setFeats((f) => step(f));
    setRound((r) => r + 1);
  }
  function reset() {
    setFeats(INIT);
    setRound(0);
  }

  return (
    <VizFrame
      className={className}
      title="Message passing on a graph"
      caption="Each node's colour is its feature value. One step replaces every node's value with the mean of itself and its neighbours — a single GCN-style round. Click a node to highlight its incoming messages; keep stepping and watch all nodes converge to the same colour (over-smoothing)."
    >
      <div className="overflow-x-auto">
        <svg viewBox="0 0 440 210" width="100%" role="img" aria-label="message passing on a graph">
          {/* edges */}
          {EDGES.map(([u, v], i) => {
            const active = u === sel || v === sel;
            return (
              <line
                key={i}
                x1={NODES[u].x}
                y1={NODES[u].y}
                x2={NODES[v].x}
                y2={NODES[v].y}
                stroke={active ? VIZ.yellow : VIZ.grid}
                strokeWidth={active ? 2.5 : 1.5}
              />
            );
          })}
          {/* nodes */}
          {NODES.map((n) => {
            const isSel = n.id === sel;
            const isNb = selNeighbors.includes(n.id);
            return (
              <g key={n.id} onClick={() => setSel(n.id)} style={{ cursor: "pointer" }}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={18}
                  fill={color(feats[n.id])}
                  stroke={isSel ? VIZ.yellow : isNb ? VIZ.brandLight : VIZ.axis}
                  strokeWidth={isSel ? 3 : isNb ? 2 : 1}
                />
                <text x={n.x} y={n.y + 4} fill={VIZ.textBright} fontSize={10} textAnchor="middle" fontFamily="monospace">
                  {feats[n.id].toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <VizButton onClick={doStep}>Step (aggregate)</VizButton>
        <VizButton onClick={reset}>Reset</VizButton>
        <VizStat label="round" value={String(round)} color={VIZ.yellow} />
        <VizStat label="spread" value={spread.toFixed(3)} color={spread < 0.1 ? VIZ.rose : VIZ.teal} />
        <VizStat label="selected" value={`node ${sel}`} color={VIZ.brandLight} />
      </div>
    </VizFrame>
  );
}
