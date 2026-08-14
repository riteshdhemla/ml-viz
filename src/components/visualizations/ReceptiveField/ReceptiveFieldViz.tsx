"use client";

/**
 * How far one message-passing layer reaches, and how fast that becomes
 * "everything".
 *
 * A 60-node ring plus a controllable number of random shortcuts. Nodes reached
 * within k hops of the highlighted node, measured by breadth-first search:
 *
 *   shortcuts   mean degree   reach after 1..6 hops
 *       0          2.00        3, 5, 7, 9, 11, 13
 *       4          2.13        3, 5, 7, 9, 11, 14
 *      12          2.40        4, 9, 15, 22, 33, 40
 *      30          2.97        5, 14, 27, 46, 59, 60
 *
 * On the pure ring the receptive field grows *linearly* — two new nodes per
 * layer — so a 3-layer GNN genuinely is local. Add thirty shortcut edges, less
 * than doubling the mean degree, and the same 3 layers reach 27 of 60 nodes
 * while 5 layers reach 59 of 60.
 *
 * That is the mechanism behind the depth limit, and it makes the tension in
 * this course concrete: depth is the only way to widen the receptive field, and
 * on any graph with small-world structure the field saturates at the whole
 * graph within a handful of layers — at which point every node aggregates the
 * same set and the embeddings collapse. Over-smoothing (lesson 03) is what this
 * plot looks like from the other side.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom } from "../viz-kit";

const N = 60;
const MAX_K = 6;

function buildGraph(shortcuts: number) {
  const rng = seededRandom(5);
  const adj: Set<number>[] = Array.from({ length: N }, () => new Set<number>());
  for (let i = 0; i < N; i++) {
    adj[i].add((i + 1) % N);
    adj[(i + 1) % N].add(i);
  }
  const extra: [number, number][] = [];
  for (let e = 0; e < shortcuts; e++) {
    const i = Math.floor(rng() * N);
    const j = Math.floor(rng() * N);
    if (i !== j) {
      adj[i].add(j);
      adj[j].add(i);
      extra.push([i, j]);
    }
  }
  return { adj, extra };
}

/** BFS layers from node 0 — the k-hop receptive field, measured not assumed. */
function hops(adj: Set<number>[]) {
  const dist = new Array<number>(N).fill(Infinity);
  dist[0] = 0;
  let frontier = [0];
  let d = 0;
  while (frontier.length) {
    const next: number[] = [];
    for (const v of frontier)
      for (const u of adj[v])
        if (dist[u] === Infinity) {
          dist[u] = d + 1;
          next.push(u);
        }
    frontier = next;
    d++;
  }
  return dist;
}

const W = 560;
const H = 250;
const CX = 150;
const CY = 122;
const R = 100;
const POS = Array.from({ length: N }, (_, i) => {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
});

const RING = [VIZ.textBright, VIZ.teal, "#0ea5a0", VIZ.brand, "#8b7ff5", VIZ.orange, VIZ.yellow];

export function ReceptiveFieldViz({ className }: { className?: string }) {
  const [shortcuts, setShortcuts] = useState(12);
  const [k, setK] = useState(3);

  const { adj, extra } = useMemo(() => buildGraph(shortcuts), [shortcuts]);
  const dist = useMemo(() => hops(adj), [adj]);

  const reach = useMemo(() => {
    const out: number[] = [];
    for (let kk = 1; kk <= MAX_K; kk++) out.push(dist.filter((d) => d <= kk).length);
    return out;
  }, [dist]);

  const meanDeg = adj.reduce((a, s) => a + s.size, 0) / N;
  const covered = reach[k - 1];

  const bx = (i: number) => 320 + (i / (MAX_K - 1)) * 210;
  const by = (v: number) => 200 - (v / N) * 150;

  return (
    <VizFrame
      title="How many layers until a node sees everything"
      caption="A 60-node ring plus random shortcut edges. Node colour is graph distance from the highlighted node, and the shaded nodes are those a k-layer GNN can reach. The plot is the measured k-hop reach — breadth-first search, not an estimate."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* ring edges then shortcuts, so shortcuts sit on top */}
        {POS.map((p, i) => {
          const q = POS[(i + 1) % N];
          return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={VIZ.grid} strokeWidth={1} />;
        })}
        {extra.map(([i, j], n) => (
          <line
            key={n}
            x1={POS[i].x}
            y1={POS[i].y}
            x2={POS[j].x}
            y2={POS[j].y}
            stroke={VIZ.yellow}
            strokeWidth={1}
            opacity={0.55}
          />
        ))}
        {POS.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === 0 ? 6 : dist[i] <= k ? 4.5 : 3}
            fill={dist[i] <= k ? RING[Math.min(dist[i], RING.length - 1)] : "#2a2f42"}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={10} fill={VIZ.text}>
          {covered} of {N}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          within {k} hop{k === 1 ? "" : "s"}
        </text>

        {/* reach curve */}
        <line x1={320} x2={530} y1={200} y2={200} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={320} x2={320} y1={44} y2={200} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={320} x2={530} y1={by(N)} y2={by(N)} stroke={VIZ.grid} strokeWidth={1} strokeDasharray="3 3" />
        <text x={534} y={by(N) + 3} fontSize={8} fill={VIZ.text}>
          all {N}
        </text>
        <path
          d={reach.map((v, i) => `${i === 0 ? "M" : "L"}${bx(i)},${by(v)}`).join(" ")}
          fill="none"
          stroke={VIZ.teal}
          strokeWidth={2}
        />
        {reach.map((v, i) => (
          <circle key={i} cx={bx(i)} cy={by(v)} r={i + 1 === k ? 4.5 : 2.5} fill={i + 1 === k ? VIZ.textBright : VIZ.teal} />
        ))}
        <text x={320} y={36} fontSize={9} fill={VIZ.text}>
          nodes reached
        </text>
        <text x={320} y={214} fontSize={9} fill={VIZ.text}>
          1 layer
        </text>
        <text x={530} y={214} textAnchor="end" fontSize={9} fill={VIZ.text}>
          {MAX_K} layers
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="mean degree" value={meanDeg.toFixed(2)} />
        <VizStat label={`reach at ${k} layers`} value={`${covered} of ${N}`} color={covered === N ? VIZ.rose : VIZ.teal} />
        <VizStat label="share of the graph" value={`${((covered / N) * 100).toFixed(0)}%`} />
        <VizStat
          label="layers to reach everything"
          value={reach.findIndex((v) => v === N) >= 0 ? String(reach.findIndex((v) => v === N) + 1) : `> ${MAX_K}`}
          color={VIZ.yellow}
        />
        <VizStat label="reach per layer" value={reach.join(", ")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <VizSlider label="message-passing layers" min={1} max={MAX_K} step={1} value={k} onChange={(v) => setK(Math.round(v))} format={(v) => String(v)} />
        <VizSlider label="shortcut edges added to the ring" min={0} max={30} step={1} value={shortcuts} onChange={(v) => setShortcuts(Math.round(v))} format={(v) => String(v)} />
      </div>
    </VizFrame>
  );
}
