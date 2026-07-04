"use client";

import { useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat, scale } from "../viz-kit";

/**
 * A trace waterfall for one LLM request: nested spans laid out on a shared
 * time axis. Toggling "parallel" runs the two independent branches
 * (retrieval and the order-lookup tool) concurrently — total latency drops
 * to the slower branch while cost stays identical, the core lesson of
 * trace-driven latency work.
 */

interface SpanDef {
  name: string;
  depth: number;
  dur: number; // ms
  kind: "gen" | "span" | "guard";
  cost?: number; // $ for generations
  branch?: "retrieval" | "tool"; // independent branches
}

const SPANS: SpanDef[] = [
  { name: "guardrail:input", depth: 1, dur: 12, kind: "guard" },
  { name: "embeddings text-embedding-3-s", depth: 2, dur: 95, kind: "gen", cost: 0.000004, branch: "retrieval" },
  { name: "retrieval: ANN search", depth: 1, dur: 85, kind: "span", branch: "retrieval" },
  { name: "tool: lookup_order", depth: 1, dur: 150, kind: "span", branch: "tool" },
  { name: "chat claude-sonnet-5", depth: 1, dur: 1650, kind: "gen", cost: 0.0100 },
  { name: "guardrail:output", depth: 1, dur: 3, kind: "guard" },
];

function layout(parallel: boolean) {
  // Returns spans with computed start times plus the trace duration.
  let t = 0;
  const placed: (SpanDef & { start: number })[] = [];
  const input = SPANS[0];
  placed.push({ ...input, start: t });
  t += input.dur;

  const retrieval = SPANS.filter((s) => s.branch === "retrieval");
  const tool = SPANS.filter((s) => s.branch === "tool");

  if (parallel) {
    let tr = t;
    for (const s of retrieval) {
      placed.push({ ...s, start: tr });
      tr += s.dur;
    }
    let tt = t;
    for (const s of tool) {
      placed.push({ ...s, start: tt });
      tt += s.dur;
    }
    t = Math.max(tr, tt);
  } else {
    for (const s of [...retrieval, ...tool]) {
      placed.push({ ...s, start: t });
      t += s.dur;
    }
  }

  for (const s of SPANS.slice(SPANS.length - 2)) {
    placed.push({ ...s, start: t });
    t += s.dur;
  }
  return { placed, total: t };
}

const COLORS = { gen: VIZ.brand, span: VIZ.teal, guard: VIZ.yellow } as const;

export function TraceWaterfallViz({ className }: { className?: string }) {
  const [parallel, setParallel] = useState(false);

  const { placed, total } = layout(parallel);
  const { total: seqTotal } = layout(false);
  const cost = SPANS.reduce((acc, s) => acc + (s.cost ?? 0), 0);

  const W = 640;
  const LABEL_W = 218;
  const ROW_H = 26;
  const TOP = 22;
  const H = TOP + placed.length * ROW_H + 26;
  const x = scale(0, seqTotal, LABEL_W, W - 12);

  const ticks = [0, 500, 1000, 1500, 2000].filter((v) => v <= seqTotal);

  return (
    <VizFrame
      title="Trace waterfall — one request, every span on a shared clock"
      caption="Indigo bars are LLM generations, teal are ordinary spans, yellow are guardrails. Retrieval and the order-lookup tool don't depend on each other — running them in parallel cuts the trace to its slowest branch, but the cost doesn't move: parallelism buys latency, never dollars."
      className={className}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div className="flex gap-2">
          <VizButton active={!parallel} onClick={() => setParallel(false)}>
            Sequential
          </VizButton>
          <VizButton active={parallel} onClick={() => setParallel(true)}>
            Parallel independent steps
          </VizButton>
        </div>
        <div className="flex gap-5">
          <VizStat label="trace duration" value={`${total.toLocaleString()} ms`} color={parallel ? VIZ.teal : VIZ.textBright} />
          <VizStat label="saved" value={`${(seqTotal - total).toLocaleString()} ms`} color={parallel ? VIZ.teal : VIZ.text} />
          <VizStat label="LLM cost" value={`$${cost.toFixed(4)}`} />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trace waterfall of spans over time">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={TOP - 8} x2={x(v)} y2={H - 20} stroke={VIZ.grid} strokeWidth={1} />
            <text x={x(v)} y={H - 6} fill={VIZ.text} fontSize={9} textAnchor="middle">
              {v} ms
            </text>
          </g>
        ))}

        {placed.map((s, i) => {
          const y = TOP + i * ROW_H;
          const w = Math.max(x(s.start + s.dur) - x(s.start), 2.5);
          return (
            <g key={`${s.name}-${i}`}>
              <text x={8 + (s.depth - 1) * 14} y={y + 13} fill={VIZ.textBright} fontSize={10} fontFamily="monospace">
                {s.name}
              </text>
              <rect x={x(s.start)} y={y + 2} width={w} height={ROW_H - 10} rx={3} fill={COLORS[s.kind]} opacity={0.9} />
              <text x={x(s.start) + w + 5} y={y + 13} fill={VIZ.text} fontSize={9} fontFamily="monospace">
                {s.dur} ms{s.cost ? ` · $${s.cost.toFixed(s.cost < 0.001 ? 6 : 4)}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </VizFrame>
  );
}
