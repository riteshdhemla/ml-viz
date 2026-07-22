"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, useAnimationLoop } from "../viz-kit";
import { getSpine } from "@/lib/spine";

/**
 * ProjectLoopViz — the image of the whole curriculum spine: the six stages of a
 * project loop arranged as a cycle, with a pulse travelling stage → stage and
 * the closing "feedback" segment (stage 6 → stage 1) drawn emphatically so the
 * loop reads as a loop, not a pipeline. Click any stage to read what it means.
 *
 * Data comes from the spine registry (`src/lib/spine.ts`) via the string prop
 * `variant` ("ml" | "agentic") — blockJS-safe, so it can be embedded in MDX.
 */

// Wide viewBox with negative-x headroom so the left-hand stage labels aren't
// clipped; the detail panel lives out past the ring on the right.
const VB_X = -150;
const VB_W = 980;
const H = 420;
const CX = 220;
const CY = 210;
const R = 150;
const NODE_R = 30;
const PANEL_X = 548;
const SPEED = 0.16; // laps per second

function pos(angleDeg: number, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

// Six nodes, starting at the top (-90°) and going clockwise.
const nodeAngle = (i: number) => -90 + i * 60;

export function ProjectLoopViz({
  variant = "ml",
  className,
}: {
  variant?: string;
  className?: string;
}) {
  const spine = getSpine(variant);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState(0);
  const [, force] = useState(0);
  const t = useRef(0);

  const advance = useCallback((dt: number) => {
    t.current = (t.current + SPEED * dt) % 1;
    force((x) => x + 1);
  }, []);

  useAnimationLoop((dt) => advance(Math.min(dt, 0.05)), running && !!spine);

  // Full-circle track path (near-closed arc), drawn once.
  const track = useMemo(() => {
    const s = pos(nodeAngle(0));
    return `M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${s.x - 0.01} ${s.y}`;
  }, []);

  if (!spine) {
    return (
      <VizFrame className={className} title="Project loop">
        <p className="text-sm text-slate-400">Unknown loop variant: {String(variant)}.</p>
      </VizFrame>
    );
  }

  const n = spine.stages.length;
  // Which segment is the pulse on, and where along it?
  const seg = Math.floor(t.current * n) % n;
  const local = t.current * n - seg;
  const fromA = nodeAngle(seg);
  const toA = nodeAngle(seg + 1); // wraps naturally via angle arithmetic
  const token = pos(fromA + (toA - fromA) * local);

  // The closing segment: last stage back to the first (the feedback edge).
  const closeFrom = pos(nodeAngle(n - 1));
  const closeTo = pos(nodeAngle(n));
  const closeMid = pos(nodeAngle(n - 1) + 30);
  const sel = spine.stages[selected];

  return (
    <VizFrame
      className={className}
      title={`${spine.label} — every technique changes one or two of these slots`}
      caption={`The recurring shape of a project on this track. A new method almost never touches all six stages — it modifies one or two. The question for anything you learn: which slot does it change, and what was breaking before? Click a stage to read it. The bold edge is the feedback that closes the loop back to the start.`}
    >
      <svg
        viewBox={`${VB_X} 0 ${VB_W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${spine.label}: ${spine.stages.map((s) => s.label).join(" → ")}, closing back to the start.`}
      >
        {/* Loop track. */}
        <path d={track} fill="none" stroke={VIZ.grid} strokeWidth={2} />

        {/* Emphasised closing (feedback) segment. */}
        <path
          d={`M ${closeFrom.x} ${closeFrom.y} A ${R} ${R} 0 0 1 ${closeTo.x} ${closeTo.y}`}
          fill="none"
          stroke={VIZ.brand}
          strokeWidth={3}
          strokeDasharray="6 5"
          opacity={0.9}
        />
        <text
          x={closeMid.x - 118}
          y={closeMid.y + 20}
          fill={VIZ.brandLight}
          fontSize={11}
          fontFamily="monospace"
        >
          feedback closes the loop
        </text>

        {/* Travelling pulse. */}
        <circle cx={token.x} cy={token.y} r={7} fill={VIZ.brandLight} />
        <circle cx={token.x} cy={token.y} r={12} fill="none" stroke={VIZ.brandLight} strokeWidth={1} opacity={0.5} />

        {/* Stage nodes. */}
        {spine.stages.map((stage, i) => {
          const c = pos(nodeAngle(i));
          const isSel = i === selected;
          const nearPulse = i === seg || (local > 0.7 && (i === (seg + 1) % n));
          // Label placement: outside the ring, aligned by side.
          const out = pos(nodeAngle(i), R + NODE_R + 12);
          const anchor = out.x > CX + 6 ? "start" : out.x < CX - 6 ? "end" : "middle";
          return (
            <g key={stage.id} className="cursor-pointer" onClick={() => setSelected(i)}>
              <circle
                cx={c.x}
                cy={c.y}
                r={NODE_R}
                fill={VIZ.card}
                stroke={stage.color}
                strokeWidth={isSel ? 3.5 : nearPulse ? 2.5 : 1.5}
                opacity={isSel || nearPulse ? 1 : 0.75}
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
                {stage.label}
              </text>
            </g>
          );
        })}

        {/* Detail panel for the selected stage. */}
        <rect x={PANEL_X} y={40} width={266} height={340} rx={12} fill={VIZ.card} stroke={VIZ.grid} strokeWidth={1} />
        <text x={PANEL_X + 22} y={78} fill={VIZ.text} fontSize={11} fontFamily="monospace">
          stage {selected + 1} / {n}
        </text>
        <text x={PANEL_X + 22} y={108} fill={sel.color} fontSize={18} fontWeight={700}>
          {sel.label}
        </text>
        <foreignObject x={PANEL_X + 20} y={124} width={228} height={210}>
          <div
            style={{
              color: VIZ.textBright,
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {sel.blurb}
          </div>
        </foreignObject>
        <text x={PANEL_X + 22} y={360} fill={VIZ.axis} fontSize={10} fontFamily="monospace">
          click a numbered stage →
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-2">
        <VizButton onClick={() => setRunning((r) => !r)} active={running}>
          {running ? "Pause" : "Play"}
        </VizButton>
        {spine.stages.map((stage, i) => (
          <VizButton key={stage.id} onClick={() => setSelected(i)} active={i === selected}>
            {i + 1}. {stage.label}
          </VizButton>
        ))}
      </div>
    </VizFrame>
  );
}
