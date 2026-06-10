"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat } from "../viz-kit";

/**
 * Viterbi algorithm on a small weather/ice-cream HMM.
 *
 * 3 hidden states: Hot / Cold / Neutral
 * 3 observations: 1 scoop / 2 scoops / 3 scoops
 * 4 timesteps  (observations: 3, 1, 3, 2)
 *
 * Step button fills the trellis column by column.
 * Back-pointer arrows appear after each column is filled.
 * After all columns are filled the optimal path is highlighted in teal.
 */

// ── HMM parameters ──────────────────────────────────────────────────────────

const STATES = ["Hot", "Cold", "Neutral"] as const;
type State = (typeof STATES)[number];

// Observations: 0 = 1 scoop, 1 = 2 scoops, 2 = 3 scoops
const OBSERVATIONS = [2, 0, 2, 1] as const; // 3, 1, 3, 2 scoops
const OBS_LABELS = ["1", "2", "3"] as const;
const T = OBSERVATIONS.length;

// Initial state distribution π
const PI: Record<State, number> = { Hot: 0.5, Cold: 0.2, Neutral: 0.3 };

// Transition matrix A[from][to]
const A: Record<State, Record<State, number>> = {
  Hot:     { Hot: 0.6, Cold: 0.1, Neutral: 0.3 },
  Cold:    { Hot: 0.1, Cold: 0.7, Neutral: 0.2 },
  Neutral: { Hot: 0.3, Cold: 0.3, Neutral: 0.4 },
};

// Emission matrix B[state][obs]
const B: Record<State, [number, number, number]> = {
  Hot:     [0.1, 0.3, 0.6],
  Cold:    [0.5, 0.4, 0.1],
  Neutral: [0.3, 0.4, 0.3],
};

// ── Viterbi computation (fully deterministic) ────────────────────────────────

type ViterbiCell = { prob: number; backptr: number | null }; // backptr = prev state index

function runViterbi(): { trellis: ViterbiCell[][]; bestPath: number[] } {
  // trellis[t][s] = { prob, backptr }
  const trellis: ViterbiCell[][] = [];

  // t = 0: initialisation
  trellis[0] = STATES.map((s) => ({
    prob: PI[s] * B[s][OBSERVATIONS[0]],
    backptr: null,
  }));

  // t = 1..T-1: recursion
  for (let t = 1; t < T; t++) {
    trellis[t] = STATES.map((s) => {
      let bestProb = -Infinity;
      let bestPrev = 0;
      STATES.forEach((sPrev, i) => {
        const p = trellis[t - 1][i].prob * A[sPrev][s] * B[s][OBSERVATIONS[t]];
        if (p > bestProb) {
          bestProb = p;
          bestPrev = i;
        }
      });
      return { prob: bestProb, backptr: bestPrev };
    });
  }

  // Backtrack
  let last = 0;
  trellis[T - 1].forEach((cell, i) => {
    if (cell.prob > trellis[T - 1][last].prob) last = i;
  });
  const bestPath: number[] = new Array(T).fill(0);
  bestPath[T - 1] = last;
  for (let t = T - 2; t >= 0; t--) {
    bestPath[t] = trellis[t + 1][bestPath[t + 1]].backptr!;
  }

  return { trellis, bestPath };
}

// ── Layout constants ─────────────────────────────────────────────────────────

const W = 520;
const H = 320;

// Column x positions for timesteps 0..T-1
const COL_X = [80, 200, 320, 440];
// Row y positions for states 0..K-1
const ROW_Y = [70, 170, 260];
const NODE_R = 26;

// State colours
const STATE_COLORS: Record<State, string> = {
  Hot:     VIZ.orange,
  Cold:    VIZ.brand,
  Neutral: VIZ.yellow,
};

// ── Arrow helper ─────────────────────────────────────────────────────────────

function arrowPath(
  x1: number, y1: number, x2: number, y2: number
): { d: string; tipX: number; tipY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist;
  const uy = dy / dist;
  const sx = x1 + ux * (NODE_R + 2);
  const sy = y1 + uy * (NODE_R + 2);
  const ex = x2 - ux * (NODE_R + 8);
  const ey = y2 - uy * (NODE_R + 8);
  return {
    d: `M${sx},${sy} L${ex},${ey}`,
    tipX: x2 - ux * (NODE_R + 8),
    tipY: y2 - uy * (NODE_R + 8),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function HMMViterbiViz({ className }: { className?: string }) {
  const [step, setStep] = useState(0); // 0 = nothing filled; 1..T = columns filled up to t=step-1

  const { trellis, bestPath } = useMemo(() => runViterbi(), []);

  const filledCols = step; // 0..T
  const done = filledCols >= T;

  const handleStep = () => {
    if (step < T) setStep((s) => s + 1);
  };
  const handleReset = () => setStep(0);

  // Best-path prob (displayed after done)
  const bestProb = done ? trellis[T - 1][bestPath[T - 1]].prob : null;

  return (
    <VizFrame
      className={className}
      title="Viterbi Algorithm — Weather / Ice Cream HMM"
      caption="States: Hot (orange), Cold (indigo), Neutral (yellow). Click Step to fill one column. Back-pointer arrows (→) show which previous state maximised the probability. The teal path is the optimal decoded sequence."
    >
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <VizButton onClick={handleStep} active={!done}>
          {done ? "Done" : `Step (t=${step + 1})`}
        </VizButton>
        <VizButton onClick={handleReset}>Reset</VizButton>
        {done && bestPath.length > 0 && (
          <span className="text-xs font-semibold ml-2" style={{ color: VIZ.teal }}>
            Best path: {bestPath.map((i) => STATES[i]).join(" → ")}
          </span>
        )}
      </div>

      {/* Trellis SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Viterbi trellis diagram">
        <defs>
          {/* Arrow marker for back-pointers */}
          <marker id="hmm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={VIZ.text} />
          </marker>
          <marker id="hmm-arrow-path" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={VIZ.teal} />
          </marker>
        </defs>

        {/* Column headers: observation at each timestep */}
        {COL_X.map((cx, t) => (
          <g key={`obs-${t}`}>
            <text x={cx} y={22} fill={VIZ.textBright} fontSize={11} textAnchor="middle" fontWeight="600">
              t={t + 1}
            </text>
            <text x={cx} y={38} fill={VIZ.text} fontSize={10} textAnchor="middle">
              obs={OBS_LABELS[OBSERVATIONS[t]]}
            </text>
          </g>
        ))}

        {/* State labels on left */}
        {STATES.map((s, i) => (
          <text key={s} x={16} y={ROW_Y[i] + 4} fill={STATE_COLORS[s]} fontSize={10} textAnchor="start" fontWeight="600">
            {s}
          </text>
        ))}

        {/* Back-pointer arrows — drawn before nodes so nodes sit on top */}
        {Array.from({ length: filledCols }).map((_, t) => {
          if (t === 0) return null;
          return STATES.map((_, j) => {
            const bp = trellis[t][j].backptr!;
            const x1 = COL_X[t - 1];
            const y1 = ROW_Y[bp];
            const x2 = COL_X[t];
            const y2 = ROW_Y[j];

            // Is this arrow on the optimal path?
            const onPath = done && bestPath[t] === j && bestPath[t - 1] === bp;
            const color = onPath ? VIZ.teal : VIZ.axis;
            const markerId = onPath ? "hmm-arrow-path" : "hmm-arrow";
            const { d } = arrowPath(x1, y1, x2, y2);

            return (
              <path
                key={`arrow-${t}-${j}`}
                d={d}
                stroke={color}
                strokeWidth={onPath ? 2.5 : 1.5}
                fill="none"
                markerEnd={`url(#${markerId})`}
                opacity={onPath ? 1 : 0.55}
              />
            );
          });
        })}

        {/* Trellis nodes */}
        {STATES.map((s, i) => {
          const color = STATE_COLORS[s];
          return COL_X.map((cx, t) => {
            const filled = t < filledCols;
            const cell = trellis[t][i];
            const onPath = done && bestPath[t] === i;

            return (
              <g key={`node-${t}-${i}`}>
                {/* Highlight ring for best path */}
                {onPath && (
                  <circle
                    cx={cx}
                    cy={ROW_Y[i]}
                    r={NODE_R + 6}
                    fill="none"
                    stroke={VIZ.teal}
                    strokeWidth={2.5}
                    opacity={0.85}
                  />
                )}
                {/* Node circle */}
                <circle
                  cx={cx}
                  cy={ROW_Y[i]}
                  r={NODE_R}
                  fill={filled ? (onPath ? "rgba(20,184,166,0.15)" : VIZ.card) : "#0f1117"}
                  stroke={filled ? (onPath ? VIZ.teal : color) : VIZ.grid}
                  strokeWidth={filled ? (onPath ? 2.5 : 2) : 1}
                  opacity={filled ? 1 : 0.4}
                />
                {/* Probability value */}
                {filled && (
                  <text
                    x={cx}
                    y={ROW_Y[i] + 4}
                    fill={onPath ? VIZ.teal : VIZ.textBright}
                    fontSize={9.5}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {cell.prob < 1e-4
                      ? cell.prob.toExponential(1)
                      : cell.prob.toFixed(4)}
                  </text>
                )}
                {/* Unfilled placeholder label */}
                {!filled && (
                  <text
                    x={cx}
                    y={ROW_Y[i] + 4}
                    fill={VIZ.axis}
                    fontSize={9}
                    textAnchor="middle"
                  >
                    —
                  </text>
                )}
              </g>
            );
          });
        })}
      </svg>

      {/* Stats row */}
      <div className="flex gap-6 mt-3 flex-wrap">
        <VizStat label="columns filled" value={`${filledCols} / ${T}`} />
        <VizStat
          label="best path"
          value={done ? bestPath.map((i) => STATES[i]).join("→") : "—"}
          color={done ? VIZ.teal : VIZ.text}
        />
        <VizStat
          label="P(best path)"
          value={bestProb !== null ? bestProb.toExponential(3) : "—"}
          color={done ? VIZ.teal : VIZ.text}
        />
      </div>
    </VizFrame>
  );
}
