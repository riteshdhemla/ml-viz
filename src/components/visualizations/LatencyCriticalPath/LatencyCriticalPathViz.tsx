"use client";

import { useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, scale, seededRandom } from "../viz-kit";

/**
 * Latency & cost scaling for an agent trajectory.
 *
 * Each step is an inherently-sequential LLM call followed by a tool call.
 * Some tool calls are *independent* (their result isn't needed by the next
 * reasoning step) — firing those asynchronously lets them overlap the
 * following LLM call, so they drop off the **critical path**. The user drags
 * the step count and toggles parallelism to see two things at once:
 *
 *   • latency tracks the *critical-path depth*, not the total number of steps,
 *   • token cost grows *super-linearly* in steps (each step re-sends the
 *     growing transcript), so it barely moves when you parallelise.
 *
 * This is the "why alert on step count / critical-path depth" lesson from the
 * agent-metrics taxonomy, made draggable. Distinct from TraceWaterfall, which
 * shows one fixed request; here the trajectory is generated from S.
 */

const LLM_MS = 800; // one reasoning call — always on the critical path
const C0 = 1500; // fixed context tokens re-sent every step (system + tools)
const M_BAR = 350; // avg tokens appended per step (transcript growth)
const PRICE_PER_MTOK = 5; // blended $/1M tokens

interface Seg {
  step: number;
  kind: "llm" | "tool";
  start: number;
  dur: number;
  independent: boolean;
}

function buildTrajectory(steps: number) {
  const rng = seededRandom(42);
  // Deterministic per-step tool latency + independence flag.
  const tools = Array.from({ length: steps }, (_, i) => ({
    dur: Math.round(120 + rng() * 320), // 120–440 ms
    // step 0 always depends on nothing prior but its tool feeds step 1's reasoning;
    // treat ~half of later steps as independent (batchable / async).
    independent: i > 0 && rng() < 0.5,
  }));

  function place(parallel: boolean) {
    let t = 0;
    const segs: Seg[] = [];
    for (let i = 0; i < steps; i++) {
      segs.push({ step: i, kind: "llm", start: t, dur: LLM_MS, independent: false });
      t += LLM_MS;
      const tool = tools[i];
      const overlaps = parallel && tool.independent && i < steps - 1;
      segs.push({ step: i, kind: "tool", start: t, dur: tool.dur, independent: tool.independent });
      // An independent tool overlaps the *next* LLM call: it only extends the
      // critical path by however much it outlasts that call.
      t += overlaps ? Math.max(0, tool.dur - LLM_MS) : tool.dur;
    }
    return { segs, total: t };
  }

  const seq = place(false);
  const par = place(true);
  // Tokens are independent of parallelism — cost never moves.
  let tokens = 0;
  for (let s = 1; s <= steps; s++) tokens += C0 + s * M_BAR;
  const cost = (tokens / 1_000_000) * PRICE_PER_MTOK;
  return { seq, par, tokens, cost, tools };
}

export function LatencyCriticalPathViz({ className }: { className?: string }) {
  const [steps, setSteps] = useState(8);
  const [parallel, setParallel] = useState(false);

  const { seq, par, tokens, cost } = buildTrajectory(steps);
  const active = parallel ? par : seq;
  const seqTotal = seq.total;

  const W = 640;
  const LABEL_W = 40;
  const ROW_H = 20;
  const TOP = 20;
  const H = TOP + steps * ROW_H + 30;
  const x = scale(0, seqTotal, LABEL_W, W - 12);

  const tickStep = seqTotal > 8000 ? 2000 : 1000;
  const ticks: number[] = [];
  for (let v = 0; v <= seqTotal; v += tickStep) ticks.push(v);

  const savedMs = seqTotal - par.total;

  return (
    <VizFrame
      title="Latency & cost scaling — critical-path depth vs. total steps"
      caption="Indigo = the sequential LLM reasoning chain (never parallelisable); teal = tool calls. Solid teal calls block the next step; hollow teal calls are independent, so in parallel mode they overlap the following LLM call and leave the critical path. Latency follows the critical-path depth — but token cost grows super-linearly in steps (each step re-sends the transcript) and doesn't move when you parallelise. Parallelism buys latency, never dollars."
      className={className}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
        <div className="w-52">
          <VizSlider
            label="steps in trajectory"
            min={3}
            max={16}
            step={1}
            value={steps}
            onChange={(v) => setSteps(Math.round(v))}
          />
        </div>
        <div className="flex gap-2">
          <VizButton active={!parallel} onClick={() => setParallel(false)}>
            Sequential
          </VizButton>
          <VizButton active={parallel} onClick={() => setParallel(true)}>
            Parallel independent tools
          </VizButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 mb-3">
        <VizStat
          label="end-to-end latency"
          value={`${(active.total / 1000).toFixed(2)} s`}
          color={parallel ? VIZ.teal : VIZ.textBright}
        />
        <VizStat label="saved by parallelism" value={`${(savedMs / 1000).toFixed(2)} s`} color={parallel ? VIZ.teal : VIZ.text} />
        <VizStat label="tokens / task" value={tokens.toLocaleString()} color={VIZ.yellow} />
        <VizStat label="cost / task" value={`$${cost.toFixed(4)}`} color={VIZ.yellow} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Agent trajectory latency by step">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={TOP - 8} x2={x(v)} y2={H - 22} stroke={VIZ.grid} strokeWidth={1} />
            <text x={x(v)} y={H - 8} fill={VIZ.text} fontSize={9} textAnchor="middle">
              {(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}s
            </text>
          </g>
        ))}

        {active.segs.map((s, i) => {
          const y = TOP + s.step * ROW_H;
          const w = Math.max(2, x(s.start + s.dur) - x(s.start));
          const isLlm = s.kind === "llm";
          const fill = isLlm ? VIZ.brand : s.independent ? "transparent" : VIZ.teal;
          return (
            <g key={i}>
              {s.kind === "llm" && (
                <text x={4} y={y + ROW_H / 2 + 3} fill={VIZ.text} fontSize={9} fontFamily="monospace">
                  {s.step + 1}
                </text>
              )}
              <rect
                x={x(s.start)}
                y={y + 3}
                width={w}
                height={ROW_H - 7}
                rx={2}
                fill={fill}
                stroke={s.independent ? VIZ.teal : "none"}
                strokeWidth={s.independent ? 1.4 : 0}
                strokeDasharray={s.independent ? "3 2" : undefined}
                opacity={isLlm ? 0.9 : 1}
              />
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: VIZ.brand }} /> LLM call (sequential)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: VIZ.teal }} /> tool call (blocking)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm border border-dashed" style={{ borderColor: VIZ.teal }} /> tool call (independent)
        </span>
      </div>
    </VizFrame>
  );
}
