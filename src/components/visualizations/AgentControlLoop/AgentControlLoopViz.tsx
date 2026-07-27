"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, useAnimationLoop } from "../viz-kit";

/**
 * AgentControlLoopViz — the runtime control loop of a functioning agent:
 * Perceive → Recall → Reason → Act → Store, drawn as a cycle with a pulse
 * travelling around it. It is the *runtime* companion to ProjectLoopViz's
 * *build-time* spine: this one shows what happens on every turn.
 *
 * The three memory layers (short-term, long-term, external/knowledge) sit to
 * the right and light up in sync with the pulse — read during Recall, written
 * during Store — so the reader sees exactly *where* memory touches the loop.
 *
 * Pure SVG + React state (no D3). Click a stage to read it; the pulse pauses
 * nothing — selection and animation are independent.
 */

// Negative-x headroom so the upper-left "Store & learn" label isn't clipped.
const VB_X = -72;
const VB_W = 892;
const H = 470;
const CX = 195;
const CY = 205;
const R = 125;
const NODE_R = 30;
const SPEED = 0.13; // laps per second

// Right-hand memory column.
const MEM_X = 430;
const MEM_W = 372;
const MEM_Y0 = 250;
const MEM_H = 62;
const MEM_GAP = 14;

type Access = "read" | "write" | null;

interface Stage {
  id: string;
  label: string;
  /** Compact label for the ring node (keeps left-side labels from clipping). */
  short: string;
  color: string;
  blurb: string;
  /** How this stage touches memory, keyed by layer index (0/1/2). */
  access: Record<number, Access>;
}

const STAGES: Stage[] = [
  {
    id: "perceive",
    label: "Perceive",
    short: "Perceive",
    color: VIZ.teal,
    blurb:
      "Sense the environment — a user message, a tool result, a file, a sensor reading. Raw input is turned into signals the model can use: speech→text, OCR on an image, JSON parsed from an API, intent extracted from natural language.",
    access: {},
  },
  {
    id: "recall",
    label: "Recall",
    short: "Recall",
    color: VIZ.brand,
    blurb:
      "Before reasoning, retrieve what's relevant: recent turns from short-term memory, preferences and past outcomes from long-term memory, and matching documents from the external knowledge base. Retrieval happens first — it grounds the decision.",
    access: { 0: "read", 1: "read", 2: "read" },
  },
  {
    id: "reason",
    label: "Reason & plan",
    short: "Reason",
    color: VIZ.yellow,
    blurb:
      "The model, guided by its instructions, interprets intent, decomposes the task into steps, and decides which tool or action to use — all conditioned on the recalled context so it stays grounded and avoids repetition.",
    access: {},
  },
  {
    id: "act",
    label: "Act",
    short: "Act",
    color: VIZ.orange,
    blurb:
      "Execute one or more actions: call an API, fetch a document, send a response, update a file, or trigger a real-world effect. The action changes the environment, which becomes the next input — closing the loop.",
    access: {},
  },
  {
    id: "store",
    label: "Store & learn",
    short: "Store",
    color: VIZ.rose,
    blurb:
      "Persist what just happened: the latest turn into short-term memory, and durable facts or outcomes into long-term memory. This becomes retrievable on the next loop, so experience carries forward.",
    access: { 0: "write", 1: "write" },
  },
];

interface MemLayer {
  label: string;
  detail: string;
  persistence: string;
}

const MEMORY: MemLayer[] = [
  {
    label: "Short-term memory",
    detail: "In-session context window — the recent turns of this chat.",
    persistence: "fleeting · one session",
  },
  {
    label: "Long-term memory",
    detail: "Persistent store (a DB) — preferences, ticket history.",
    persistence: "durable · across sessions",
  },
  {
    label: "External / knowledge memory",
    detail: "Vector DB / knowledge base — semantic search.",
    persistence: "read-mostly · retrieved on demand",
  },
];

const n = STAGES.length;
const nodeAngle = (i: number) => -90 + i * (360 / n);

function pos(angleDeg: number, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

export function AgentControlLoopViz({ className }: { className?: string }) {
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState(1);
  const [, force] = useState(0);
  const t = useRef(0);

  const advance = useCallback((dt: number) => {
    t.current = (t.current + SPEED * dt) % 1;
    force((x) => x + 1);
  }, []);

  useAnimationLoop((dt) => advance(Math.min(dt, 0.05)), running);

  const track = useMemo(() => {
    const s = pos(nodeAngle(0));
    return `M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${s.x - 0.01} ${s.y}`;
  }, []);

  // Pulse position along the ring.
  const seg = Math.floor(t.current * n) % n;
  const local = t.current * n - seg;
  const fromA = nodeAngle(seg);
  const toA = nodeAngle(seg + 1);
  const token = pos(fromA + (toA - fromA) * local);

  // The stage the pulse is currently "at" (nearest node) drives memory glow.
  const activeStage = Math.round(t.current * n) % n;
  const active = STAGES[activeStage];
  const sel = STAGES[selected];

  return (
    <VizFrame
      className={className}
      title="The agent control loop — perceive, recall, reason, act, store"
      caption="Every turn, a functioning agent runs this loop. Memory is not one step: it is read during Recall (before reasoning) and written during Store (after acting), so experience carries into the next turn. Watch the memory layers glow in sync with the pulse; click a stage to read what it does."
    >
      <svg
        viewBox={`${VB_X} 0 ${VB_W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Agent control loop: Perceive, Recall, Reason, Act, Store, arranged as a cycle, with short-term, long-term, and external memory layers read on Recall and written on Store."
      >
        {/* Environment band feeding Perceive and receiving from Act. */}
        <rect x={18} y={18} width={150} height={30} rx={8} fill={VIZ.card} stroke={VIZ.grid} />
        <text x={93} y={38} fill={VIZ.text} fontSize={11} fontFamily="monospace" textAnchor="middle">
          environment / user
        </text>

        {/* Loop track. */}
        <path d={track} fill="none" stroke={VIZ.grid} strokeWidth={2} />

        {/* Travelling pulse. */}
        <circle cx={token.x} cy={token.y} r={7} fill={VIZ.brandLight} />
        <circle cx={token.x} cy={token.y} r={12} fill="none" stroke={VIZ.brandLight} strokeWidth={1} opacity={0.5} />

        {/* Stage nodes. */}
        {STAGES.map((stage, i) => {
          const c = pos(nodeAngle(i));
          const isSel = i === selected;
          const isActive = i === activeStage;
          const out = pos(nodeAngle(i), R + NODE_R + 10);
          const anchor = out.x > CX + 6 ? "start" : out.x < CX - 6 ? "end" : "middle";
          return (
            <g key={stage.id} className="cursor-pointer" onClick={() => setSelected(i)}>
              <circle
                cx={c.x}
                cy={c.y}
                r={NODE_R}
                fill={VIZ.card}
                stroke={stage.color}
                strokeWidth={isSel ? 3.5 : isActive ? 2.5 : 1.5}
                opacity={isSel || isActive ? 1 : 0.72}
              />
              <text
                x={c.x}
                y={c.y + 5}
                fill={stage.color}
                fontSize={15}
                fontFamily="monospace"
                fontWeight={700}
                textAnchor="middle"
              >
                {i + 1}
              </text>
              <text
                x={out.x}
                y={out.y + 4}
                fill={isSel ? VIZ.textBright : VIZ.text}
                fontSize={12}
                fontWeight={isSel ? 700 : 500}
                textAnchor={anchor}
              >
                {stage.short}
              </text>
            </g>
          );
        })}

        {/* Selected-stage detail panel (top-right). */}
        <text x={MEM_X} y={40} fill={VIZ.text} fontSize={11} fontFamily="monospace">
          step {selected + 1} / {n}
        </text>
        <text x={MEM_X} y={66} fill={sel.color} fontSize={18} fontWeight={700}>
          {sel.label}
        </text>
        <foreignObject x={MEM_X} y={80} width={MEM_W} height={150}>
          <div style={{ color: VIZ.textBright, fontSize: "12.5px", lineHeight: 1.5 }}>
            {sel.blurb}
          </div>
        </foreignObject>

        {/* Memory layers with read/write glow synced to the pulse. */}
        <text x={MEM_X} y={MEM_Y0 - 8} fill={VIZ.text} fontSize={11} fontFamily="monospace">
          memory layers
        </text>
        {MEMORY.map((m, i) => {
          const y = MEM_Y0 + i * (MEM_H + MEM_GAP);
          const acc = active.access[i] ?? null;
          const glow = acc === "read" ? VIZ.brandLight : acc === "write" ? VIZ.rose : null;
          return (
            <g key={m.label}>
              <rect
                x={MEM_X}
                y={y}
                width={MEM_W}
                height={MEM_H}
                rx={10}
                fill={VIZ.card}
                stroke={glow ?? VIZ.grid}
                strokeWidth={glow ? 2.5 : 1}
              />
              <text x={MEM_X + 14} y={y + 22} fill={VIZ.textBright} fontSize={13} fontWeight={700}>
                {m.label}
              </text>
              <text x={MEM_X + 14} y={y + 40} fill={VIZ.text} fontSize={11}>
                {m.detail}
              </text>
              <text x={MEM_X + 14} y={y + 55} fill={VIZ.axis} fontSize={10} fontFamily="monospace">
                {m.persistence}
              </text>
              {acc && (
                <g>
                  <rect
                    x={MEM_X + MEM_W - 66}
                    y={y + 10}
                    width={54}
                    height={20}
                    rx={6}
                    fill={acc === "read" ? VIZ.brand : VIZ.rose}
                    opacity={0.9}
                  />
                  <text
                    x={MEM_X + MEM_W - 39}
                    y={y + 24}
                    fill="#fff"
                    fontSize={11}
                    fontFamily="monospace"
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    {acc}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Live status line under the ring. */}
        <text x={CX} y={CY - 4} fill={VIZ.text} fontSize={10} fontFamily="monospace" textAnchor="middle">
          now
        </text>
        <text x={CX} y={CY + 14} fill={active.color} fontSize={14} fontWeight={700} textAnchor="middle">
          {active.label}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-2">
        <VizButton onClick={() => setRunning((r) => !r)} active={running}>
          {running ? "Pause" : "Play"}
        </VizButton>
        {STAGES.map((stage, i) => (
          <VizButton key={stage.id} onClick={() => setSelected(i)} active={i === selected}>
            {i + 1}. {stage.label}
          </VizButton>
        ))}
      </div>
    </VizFrame>
  );
}
