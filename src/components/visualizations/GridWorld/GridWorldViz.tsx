"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, useAnimationLoop } from "../viz-kit";

/**
 * Value iteration on a 4×4 gridworld.
 * S = start (0,0), G = goal (3,3), # = wall (1,1).
 * Step cost −0.04 everywhere except the terminal goal (reward +1).
 * Policy arrows follow the greedy action argmax V(s').
 */

const COLS = 4;
const ROWS = 4;
const CELL = 65; // px per cell
const PAD = 10;
const W = COLS * CELL + PAD * 2;   // 280
const H = ROWS * CELL + PAD * 2;   // 280

// Grid metadata
const WALL = "wall";
const GOAL = "goal";
const START = "start";
const NORMAL = "normal";

type CellType = typeof WALL | typeof GOAL | typeof START | typeof NORMAL;

function cellType(r: number, c: number): CellType {
  if (r === 1 && c === 1) return WALL;
  if (r === 3 && c === 3) return GOAL;
  if (r === 0 && c === 0) return START;
  return NORMAL;
}

const ACTIONS: [number, number][] = [
  [-1, 0], // Up
  [1, 0],  // Down
  [0, -1], // Left
  [0, 1],  // Right
];

function idx(r: number, c: number) {
  return r * COLS + c;
}

function applyAction(r: number, c: number, dr: number, dc: number): [number, number] {
  const nr = r + dr;
  const nc = c + dc;
  // Bounce off walls (grid boundary or wall cell)
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || (nr === 1 && nc === 1)) {
    return [r, c];
  }
  return [nr, nc];
}

const STEP_COST = -0.04;
const MAX_SWEEPS = 50;

function runValueIteration(gamma: number): { tables: Float32Array[]; deltas: number[] } {
  const tables: Float32Array[] = [];
  const deltas: number[] = [];

  // Sweep 0: initial all-zero table (goal = 1)
  const v0 = new Float32Array(ROWS * COLS);
  v0[idx(3, 3)] = 1.0;
  tables.push(v0);
  deltas.push(0);

  for (let sweep = 1; sweep <= MAX_SWEEPS; sweep++) {
    const prev = tables[sweep - 1];
    const curr = new Float32Array(prev);
    let maxDelta = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ct = cellType(r, c);
        if (ct === WALL || ct === GOAL) continue;

        let best = -Infinity;
        for (const [dr, dc] of ACTIONS) {
          const [nr, nc] = applyAction(r, c, dr, dc);
          const reward = cellType(nr, nc) === GOAL ? 1.0 : STEP_COST;
          const val = reward + gamma * prev[idx(nr, nc)];
          if (val > best) best = val;
        }

        const delta = Math.abs(best - prev[idx(r, c)]);
        if (delta > maxDelta) maxDelta = delta;
        curr[idx(r, c)] = best;
      }
    }

    tables.push(curr);
    deltas.push(maxDelta);
  }

  return { tables, deltas };
}

function lerpColor(t: number): string {
  // t in [0,1], returns rgb from VIZ.card (#1a1d27) to VIZ.brand (#6366f1)
  const r0 = 26, g0 = 29, b0 = 39, r1 = 99, g1 = 102, b1 = 241;
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

function greedyAction(r: number, c: number, v: Float32Array, gamma: number): number {
  let best = -Infinity;
  let bestA = 0;
  ACTIONS.forEach(([dr, dc], a) => {
    const [nr, nc] = applyAction(r, c, dr, dc);
    const reward = cellType(nr, nc) === GOAL ? 1.0 : STEP_COST;
    const val = reward + gamma * v[idx(nr, nc)];
    if (val > best) { best = val; bestA = a; }
  });
  return bestA;
}

// Arrow shapes: Up, Down, Left, Right (dx, dy for tip offset from center)
const ARROW_DIRS = [
  [0, -18], // Up
  [0, 18],  // Down
  [-18, 0], // Left
  [18, 0],  // Right
];

export function GridWorldViz({ className }: { className?: string }) {
  const [gamma, setGamma] = useState(0.9);
  const [sweep, setSweep] = useState(0);
  const [running, setRunning] = useState(false);
  const accumRef = useRef(0);

  const { tables, deltas } = useMemo(() => runValueIteration(gamma), [gamma]);

  // Reset sweep when gamma changes
  useEffect(() => {
    setSweep(0);
    setRunning(false);
    accumRef.current = 0;
  }, [gamma]);

  useAnimationLoop((dt) => {
    if (!running) return;
    accumRef.current += dt;
    if (accumRef.current >= 0.3) {
      accumRef.current = 0;
      setSweep((s) => {
        if (s >= MAX_SWEEPS) { setRunning(false); return s; }
        return s + 1;
      });
    }
  }, running);

  function handleStep() {
    setSweep((s) => Math.min(s + 1, MAX_SWEEPS));
  }

  function handleRunPause() {
    if (sweep >= MAX_SWEEPS) { setSweep(0); setRunning(true); return; }
    setRunning((r) => !r);
  }

  function handleReset() {
    setRunning(false);
    setSweep(0);
    accumRef.current = 0;
  }

  const v = tables[sweep];
  const maxV = Math.max(...Array.from(v).filter((_, i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    return cellType(r, c) !== WALL;
  }));
  const minV = Math.min(...Array.from(v).filter((_, i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    return cellType(r, c) !== WALL;
  }));
  const range = maxV - minV || 1;

  const showArrows = sweep > 2;

  return (
    <VizFrame
      className={className}
      title="Value Iteration — 4×4 Gridworld"
      caption="Each sweep applies the Bellman optimality update to every cell. Arrows show the greedy policy: the action that maximises V(s′). Adjust γ to see how the agent's planning horizon changes."
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* SVG grid */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="shrink-0"
          role="img"
          aria-label="Gridworld value function"
        >
          {/* arrowhead marker */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={VIZ.textBright} opacity={0.85} />
            </marker>
          </defs>

          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const ct = cellType(r, c);
              const x = PAD + c * CELL;
              const y = PAD + r * CELL;
              const cx = x + CELL / 2;
              const cy = y + CELL / 2;

              // Background fill
              let fill: string = VIZ.card;
              if (ct === WALL) fill = VIZ.grid;
              else if (ct === GOAL) fill = VIZ.teal;
              else {
                const t = Math.max(0, Math.min(1, (v[idx(r, c)] - minV) / range));
                fill = lerpColor(t);
              }

              // V value label
              const vVal = v[idx(r, c)];
              const showVal = ct !== WALL && ct !== GOAL;

              // Arrow for greedy policy
              let arrowEl: React.ReactNode = null;
              if (showArrows && ct !== WALL && ct !== GOAL) {
                const a = greedyAction(r, c, v, gamma);
                const [adx, ady] = ARROW_DIRS[a];
                const x1 = cx - adx * 0.3;
                const y1 = cy - ady * 0.3;
                const x2 = cx + adx * 0.5;
                const y2 = cy + ady * 0.5;
                arrowEl = (
                  <line
                    key={`arr-${r}-${c}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={VIZ.textBright}
                    strokeWidth={1.5}
                    opacity={0.85}
                    markerEnd="url(#arrowhead)"
                  />
                );
              }

              return (
                <g key={`${r}-${c}`}>
                  {/* Cell background */}
                  <rect
                    x={x + 1} y={y + 1}
                    width={CELL - 2} height={CELL - 2}
                    rx={4}
                    fill={fill}
                    stroke={VIZ.grid}
                    strokeWidth={1}
                  />

                  {/* Wall label */}
                  {ct === WALL && (
                    <text x={cx} y={cy + 4} textAnchor="middle" fill={VIZ.text} fontSize={14} fontWeight="bold">
                      #
                    </text>
                  )}

                  {/* Goal label */}
                  {ct === GOAL && (
                    <>
                      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="bold">G</text>
                      <text x={cx} y={cy + 12} textAnchor="middle" fill="#fff" fontSize={10}>+1</text>
                    </>
                  )}

                  {/* Start label */}
                  {ct === START && (
                    <text x={cx} y={y + 13} textAnchor="middle" fill={VIZ.text} fontSize={10}>S</text>
                  )}

                  {/* V(s) value */}
                  {showVal && (
                    <text
                      x={cx} y={cy + (ct === START ? 8 : 5)}
                      textAnchor="middle"
                      fill={VIZ.textBright}
                      fontSize={12}
                      fontWeight="600"
                    >
                      {vVal.toFixed(2)}
                    </text>
                  )}

                  {/* Policy arrow */}
                  {arrowEl}
                </g>
              );
            })
          )}
        </svg>

        {/* Controls panel */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            <VizStat label="sweep" value={`${sweep}/${MAX_SWEEPS}`} />
            <VizStat
              label="max ΔV"
              value={sweep === 0 ? "—" : deltas[sweep].toExponential(2)}
              color={deltas[sweep] < 0.001 ? VIZ.teal : VIZ.yellow}
            />
            <VizStat label="γ" value={gamma.toFixed(2)} color={VIZ.brand} />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 flex-wrap">
            <VizButton onClick={handleStep} active={false}>Step</VizButton>
            <VizButton onClick={handleRunPause} active={running}>
              {running ? "Pause" : "Run"}
            </VizButton>
            <VizButton onClick={handleReset}>Reset</VizButton>
          </div>

          {/* Gamma slider */}
          <VizSlider
            label="γ (discount)"
            min={0.5}
            max={0.99}
            step={0.01}
            value={gamma}
            onChange={setGamma}
            format={(v) => v.toFixed(2)}
          />

          {/* Legend */}
          <div className="text-xs text-slate-400 space-y-1 mt-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: VIZ.teal }} />
              <span>Goal (reward +1)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: VIZ.grid }} />
              <span>Wall (blocked)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: "linear-gradient(to right, #1a1d27, #6366f1)" }}
              />
              <span>V(s): dark → blue = low → high</span>
            </div>
          </div>
        </div>
      </div>
    </VizFrame>
  );
}
