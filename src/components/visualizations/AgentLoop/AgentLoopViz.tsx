"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  useAnimationLoop,
} from "../viz-kit";

/**
 * AgentLoopViz — animate the ReAct control loop (Thought → Action → Observation)
 * and make the compounding-reliability problem visceral.
 *
 * Three nodes sit on a circle. A token travels Thought → Action → Observation →
 * Thought …; each full lap is one agent "step". A slider sets the per-step
 * success probability p, and a stat reports the end-to-end reliability p^n where
 * n is the number of completed steps — so the learner watches a 95%-reliable
 * step decay to ~60% over ten laps. A running trajectory log mirrors the trace
 * an observability tool would capture.
 */

const W = 720;
const H = 360;
const CX = 196;
const CY = 180;
const R = 118;

type Phase = "Thought" | "Action" | "Observation";
const PHASES: Phase[] = ["Thought", "Action", "Observation"];

// Node angles (degrees), starting at the top and going clockwise.
const NODE_ANGLE: Record<Phase, number> = {
  Thought: -90,
  Action: 30,
  Observation: 150,
};

const PHASE_COLOR: Record<Phase, string> = {
  Thought: VIZ.brandLight,
  Action: VIZ.teal,
  Observation: VIZ.yellow,
};

const PHASE_BLURB: Record<Phase, string> = {
  Thought: "reason about state",
  Action: "call a tool",
  Observation: "read the result",
};

function pos(angleDeg: number, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

const SPEED = 0.55; // laps per second

export function AgentLoopViz({ className }: { className?: string }) {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState(0.95);
  const [, force] = useState(0);

  // `t` in [0,1) is the token's position along the loop; 0 = Thought node.
  const t = useRef(0);
  const steps = useRef(0);
  const log = useRef<string[]>([]);

  const reset = useCallback(() => {
    t.current = 0;
    steps.current = 0;
    log.current = [];
    force((x) => x + 1);
  }, []);

  const advance = useCallback((dt: number) => {
    const prev = t.current;
    t.current = (t.current + SPEED * dt) % 1;
    // Completed a lap when we wrap past 1.
    if (t.current < prev) {
      steps.current += 1;
      const n = steps.current;
      log.current = [
        `${String(n).padStart(2, "0")}  Thought → Action → Observation`,
        ...log.current,
      ].slice(0, 7);
    }
    force((x) => x + 1);
  }, []);

  useAnimationLoop((dt) => advance(Math.min(dt, 0.05)), running);

  // Which segment of the loop is the token on? Each phase owns a third of [0,1).
  const seg = Math.floor(t.current * 3) % 3;
  const activePhase = PHASES[seg];
  // Interpolate the token position between the current node and the next.
  const fromAngle = NODE_ANGLE[PHASES[seg]];
  let toAngle = NODE_ANGLE[PHASES[(seg + 1) % 3]];
  // Keep the interpolation going clockwise.
  if (toAngle < fromAngle) toAngle += 360;
  const local = t.current * 3 - seg;
  const token = pos(fromAngle + (toAngle - fromAngle) * local);

  const n = steps.current;
  const reliability = Math.pow(p, n);
  const relColor =
    reliability > 0.8 ? VIZ.teal : reliability > 0.5 ? VIZ.yellow : VIZ.rose;

  const arc = useMemo(() => {
    // A near-full circle arc to draw the loop track.
    const start = pos(NODE_ANGLE.Thought);
    return `M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${start.x - 0.01} ${start.y}`;
  }, []);

  return (
    <VizFrame
      className={className}
      title="The ReAct loop — and why agents compound errors"
      caption="An agent cycles Thought → Action → Observation, each Observation conditioning the next Thought. But errors multiply across steps: if a single step is p reliable, an n-step trajectory is only pⁿ reliable. Drag p and watch a 95%-per-step agent fall below 60% end-to-end over ten steps — the case for bounded loops, validation, and human-in-the-loop."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="ReAct agent loop with Thought, Action, and Observation nodes and a compounding-reliability readout."
      >
        {/* Loop track. */}
        <path d={arc} fill="none" stroke={VIZ.grid} strokeWidth={2} />

        {/* Direction arrowhead near the top. */}
        {(() => {
          const a = pos(NODE_ANGLE.Thought + 24);
          return (
            <polygon
              points={`${a.x - 5},${a.y - 7} ${a.x + 7},${a.y} ${a.x - 5},${a.y + 7}`}
              fill={VIZ.axis}
              transform={`rotate(110 ${a.x} ${a.y})`}
            />
          );
        })()}

        {/* Nodes. */}
        {PHASES.map((phase) => {
          const c = pos(NODE_ANGLE[phase]);
          const active = phase === activePhase;
          return (
            <g key={phase}>
              <circle
                cx={c.x}
                cy={c.y}
                r={active ? 40 : 36}
                fill={VIZ.card}
                stroke={PHASE_COLOR[phase]}
                strokeWidth={active ? 3 : 1.5}
                opacity={active ? 1 : 0.7}
              />
              <text
                x={c.x}
                y={c.y - 2}
                fill={PHASE_COLOR[phase]}
                fontSize={12}
                fontFamily="monospace"
                fontWeight={600}
                textAnchor="middle"
              >
                {phase}
              </text>
              <text
                x={c.x}
                y={c.y + 13}
                fill={VIZ.text}
                fontSize={8}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {PHASE_BLURB[phase]}
              </text>
            </g>
          );
        })}

        {/* Travelling token. */}
        <circle cx={token.x} cy={token.y} r={7} fill={PHASE_COLOR[activePhase]} />
        <circle cx={token.x} cy={token.y} r={11} fill="none" stroke={PHASE_COLOR[activePhase]} strokeWidth={1} opacity={0.5} />

        {/* Centre readout. */}
        <text x={CX} y={CY - 4} fill={VIZ.textBright} fontSize={13} fontFamily="monospace" textAnchor="middle">
          step {n}
        </text>
        <text x={CX} y={CY + 14} fill={relColor} fontSize={12} fontFamily="monospace" textAnchor="middle">
          {(reliability * 100).toFixed(0)}% ok
        </text>

        {/* Trajectory log panel. */}
        <rect x={400} y={28} width={304} height={304} rx={10} fill={VIZ.card} stroke={VIZ.grid} strokeWidth={1} />
        <text x={416} y={50} fill={VIZ.text} fontSize={10} fontFamily="monospace">
          trajectory (most recent first)
        </text>
        {log.current.length === 0 && (
          <text x={416} y={78} fill={VIZ.axis} fontSize={10} fontFamily="monospace">
            running…
          </text>
        )}
        {log.current.map((line, i) => (
          <text
            key={`${line}-${i}`}
            x={416}
            y={78 + i * 30}
            fill={i === 0 ? VIZ.textBright : VIZ.text}
            fontSize={11}
            fontFamily="monospace"
            opacity={1 - i * 0.1}
          >
            {line}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => setRunning((r) => !r)} active={running}>
          {running ? "Pause" : "Play"}
        </VizButton>
        <VizButton onClick={() => advance(0.34)}>Step</VizButton>
        <VizButton onClick={reset}>Reset</VizButton>
      </div>

      <div className="mt-3">
        <VizSlider
          label="per-step reliability p"
          min={0.5}
          max={0.99}
          step={0.01}
          value={p}
          onChange={setP}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="steps so far (n)" value={`${n}`} color={VIZ.textBright} />
        <VizStat label="per-step p" value={`${(p * 100).toFixed(0)}%`} color={VIZ.brandLight} />
        <VizStat label="end-to-end pⁿ" value={`${(reliability * 100).toFixed(0)}%`} color={relColor} />
      </div>
    </VizFrame>
  );
}
