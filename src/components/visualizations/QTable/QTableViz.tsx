"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  useAnimationLoop,
  seededRandom,
} from "../viz-kit";

/**
 * Q-learning on a 4×4 gridworld.
 * S = (0,0), G = (3,3), # = wall (1,1).
 * Actions: Up=0, Down=1, Left=2, Right=3.
 * ε-greedy updates; precomputes 200 episodes with snapshots every 10.
 */

const COLS = 4;
const ROWS = 4;
const N_STATES = ROWS * COLS; // 16
const N_ACTIONS = 4;
const CELL = 44;
const PAD = 8;
const GRID_W = COLS * CELL + PAD * 2; // 192
const GRID_H = ROWS * CELL + PAD * 2; // 192

// Actions: [dr, dc] for Up, Down, Left, Right
const ACTIONS: [number, number][] = [
  [-1, 0], // Up
  [1, 0],  // Down
  [0, -1], // Left
  [0, 1],  // Right
];
const ACTION_LABELS = ["↑", "↓", "←", "→"];

// Arrow tip offsets (dx, dy) from cell center
const ARROW_DIRS = [
  [0, -14], // Up
  [0, 14],  // Down
  [-14, 0], // Left
  [14, 0],  // Right
];

const STEP_COST = -0.04;
const MAX_EPISODE_STEPS = 50;
const TOTAL_EPISODES = 200;
const SNAPSHOT_EVERY = 10;

function idx(r: number, c: number) {
  return r * COLS + c;
}

type CellKind = "wall" | "goal" | "start" | "normal";

function cellKind(r: number, c: number): CellKind {
  if (r === 1 && c === 1) return "wall";
  if (r === 3 && c === 3) return "goal";
  if (r === 0 && c === 0) return "start";
  return "normal";
}

function step(r: number, c: number, a: number): [number, number] {
  const [dr, dc] = ACTIONS[a];
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || (nr === 1 && nc === 1)) {
    return [r, c];
  }
  return [nr, nc];
}

function argmax(q: Float64Array, s: number): number {
  let best = -Infinity;
  let bestA = 0;
  for (let a = 0; a < N_ACTIONS; a++) {
    const v = q[s * N_ACTIONS + a];
    if (v > best) { best = v; bestA = a; }
  }
  return bestA;
}

function maxQ(q: Float64Array, s: number): number {
  let best = -Infinity;
  for (let a = 0; a < N_ACTIONS; a++) {
    const v = q[s * N_ACTIONS + a];
    if (v > best) best = v;
  }
  return best;
}

function runQLearning(
  epsilon: number,
  alpha: number
): Float64Array[] {
  const rng = seededRandom(99);
  const q = new Float64Array(N_STATES * N_ACTIONS); // init to 0

  // snapshots[i] corresponds to episode i*10 (snapshots[0] = ep 0 baseline)
  const snapshots: Float64Array[] = [new Float64Array(q)];

  const gamma = 0.9;

  for (let ep = 1; ep <= TOTAL_EPISODES; ep++) {
    let r = 0, c = 0; // start state S

    for (let t = 0; t < MAX_EPISODE_STEPS; t++) {
      const s = idx(r, c);

      // ε-greedy action
      let a: number;
      if (rng() < epsilon) {
        a = Math.floor(rng() * N_ACTIONS);
      } else {
        a = argmax(q, s);
      }

      const [nr, nc] = step(r, c, a);
      const sp = idx(nr, nc);
      const kind = cellKind(nr, nc);
      const reward = kind === "goal" ? 1.0 : STEP_COST;
      const terminal = kind === "goal";

      // Q update
      const target = terminal ? reward : reward + gamma * maxQ(q, sp);
      q[s * N_ACTIONS + a] += alpha * (target - q[s * N_ACTIONS + a]);

      r = nr;
      c = nc;
      if (terminal) break;
    }

    if (ep % SNAPSHOT_EVERY === 0) {
      snapshots.push(new Float64Array(q));
    }
  }

  return snapshots; // length = 21 (ep 0, 10, 20, …, 200)
}

// Interpolate between two hex colours
function lerpColor(t: number, cNeg: string, cZero: string, cPos: string): string {
  // t in [-1, 1]: negative→rose, zero→card, positive→brand
  const hexToRgb = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lerp3 = (a: number[], b: number[], t: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * t));

  if (t >= 0) {
    const [r0, g0, b0] = hexToRgb(cZero);
    const [r1, g1, b1] = hexToRgb(cPos);
    const t2 = Math.min(1, t);
    const [r, g, b] = lerp3([r0, g0, b0], [r1, g1, b1], t2);
    return `rgb(${r},${g},${b})`;
  } else {
    const [r0, g0, b0] = hexToRgb(cNeg);
    const [r1, g1, b1] = hexToRgb(cZero);
    const t2 = Math.min(1, -t);
    const [r, g, b] = lerp3([r1, g1, b1], [r0, g0, b0], t2);
    return `rgb(${r},${g},${b})`;
  }
}

export function QTableViz({ className }: { className?: string }) {
  const [episodeIdx, setEpisodeIdx] = useState(0); // 0..20
  const [epsilon, setEpsilon] = useState(0.1);
  const [alpha, setAlpha] = useState(0.5);
  const [running, setRunning] = useState(false);
  const accumRef = useRef(0);

  const snapshots = useMemo(
    () => runQLearning(epsilon, alpha),
    [epsilon, alpha]
  );

  // Reset episode index when params change
  useEffect(() => {
    setEpisodeIdx(0);
    setRunning(false);
    accumRef.current = 0;
  }, [epsilon, alpha]);

  useAnimationLoop((dt) => {
    if (!running) return;
    accumRef.current += dt;
    if (accumRef.current >= 0.2) { // 5 episodes/sec (each step = 10 episodes)
      accumRef.current = 0;
      setEpisodeIdx((i) => {
        const maxIdx = snapshots.length - 1;
        if (i >= maxIdx) { setRunning(false); return i; }
        return i + 1;
      });
    }
  }, running);

  function handleRunPause() {
    if (episodeIdx >= snapshots.length - 1) {
      setEpisodeIdx(0);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }

  const q = snapshots[episodeIdx];
  const currentEpisode = episodeIdx * SNAPSHOT_EVERY;

  // Compute max Q across non-wall states
  let globalMaxQ = -Infinity;
  let globalMinQ = Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cellKind(r, c) === "wall") continue;
      for (let a = 0; a < N_ACTIONS; a++) {
        const v = q[idx(r, c) * N_ACTIONS + a];
        if (v > globalMaxQ) globalMaxQ = v;
        if (v < globalMinQ) globalMinQ = v;
      }
    }
  }
  const qRange = Math.max(Math.abs(globalMaxQ), Math.abs(globalMinQ), 0.01);

  return (
    <VizFrame
      className={className}
      title="Q-Table — ε-greedy Q-Learning"
      caption="Each episode runs ε-greedy Q-learning from S to G. Watch Q-values propagate from the goal outward, and the policy arrows converge to the optimal path. Adjust ε and α to see their effect on convergence speed."
    >
      <div className="flex flex-col gap-4">
        {/* Two SVG panels */}
        <div className="flex flex-wrap gap-4 items-start">
          {/* Left: 4×4 gridworld with max-Q heatmap + policy arrows */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Policy &amp; Value</span>
            <svg
              viewBox={`0 0 ${GRID_W} ${GRID_H}`}
              width={GRID_W}
              height={GRID_H}
              className="shrink-0"
              role="img"
              aria-label="Gridworld Q-value heatmap"
            >
              <defs>
                <marker id="qt-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill={VIZ.textBright} opacity={0.9} />
                </marker>
              </defs>
              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => {
                  const kind = cellKind(r, c);
                  const x = PAD + c * CELL;
                  const y = PAD + r * CELL;
                  const cx = x + CELL / 2;
                  const cy = y + CELL / 2;
                  const s = idx(r, c);

                  let fill: string;
                  if (kind === "wall") fill = VIZ.grid;
                  else if (kind === "goal") fill = VIZ.teal;
                  else {
                    const mq = maxQ(q, s);
                    const t = Math.max(-1, Math.min(1, mq / qRange));
                    fill = lerpColor(t, VIZ.rose, VIZ.card, VIZ.brand);
                  }

                  // Policy arrow
                  let arrowEl: React.ReactNode = null;
                  if (kind !== "wall" && kind !== "goal" && currentEpisode > 0) {
                    const bestA = argmax(q, s);
                    const [adx, ady] = ARROW_DIRS[bestA];
                    const x1 = cx - adx * 0.3;
                    const y1 = cy - ady * 0.3;
                    const x2 = cx + adx * 0.55;
                    const y2 = cy + ady * 0.55;
                    arrowEl = (
                      <line
                        key={`arr-${r}-${c}`}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={VIZ.textBright}
                        strokeWidth={1.5}
                        opacity={0.85}
                        markerEnd="url(#qt-arrow)"
                      />
                    );
                  }

                  return (
                    <g key={`${r}-${c}`}>
                      <rect
                        x={x + 1} y={y + 1}
                        width={CELL - 2} height={CELL - 2}
                        rx={3}
                        fill={fill}
                        stroke={VIZ.grid}
                        strokeWidth={1}
                      />
                      {kind === "wall" && (
                        <text x={cx} y={cy + 4} textAnchor="middle" fill={VIZ.text} fontSize={12} fontWeight="bold">#</text>
                      )}
                      {kind === "goal" && (
                        <>
                          <text x={cx} y={cy - 3} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">G</text>
                          <text x={cx} y={cy + 11} textAnchor="middle" fill="#fff" fontSize={9}>+1</text>
                        </>
                      )}
                      {kind === "start" && (
                        <text x={cx} y={y + 11} textAnchor="middle" fill={VIZ.text} fontSize={9}>S</text>
                      )}
                      {arrowEl}
                    </g>
                  );
                })
              )}
            </svg>
          </div>

          {/* Right: 16×4 Q-table heatmap */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Q-Table (state × action)</span>
            <svg
              viewBox="0 0 200 200"
              width={200}
              height={200}
              className="shrink-0"
              role="img"
              aria-label="Q-table heatmap"
            >
              {/* Action column headers */}
              {ACTION_LABELS.map((lbl, a) => (
                <text
                  key={`hdr-${a}`}
                  x={14 + a * 46 + 23}
                  y={11}
                  textAnchor="middle"
                  fill={VIZ.text}
                  fontSize={10}
                >
                  {lbl}
                </text>
              ))}
              {/* Cells */}
              {Array.from({ length: N_STATES }, (_, s) => {
                const r = Math.floor(s / COLS);
                const c = s % COLS;
                const kind = cellKind(r, c);
                return Array.from({ length: N_ACTIONS }, (_, a) => {
                  const val = q[s * N_ACTIONS + a];
                  const t = Math.max(-1, Math.min(1, val / qRange));
                  const fill = kind === "wall"
                    ? VIZ.grid
                    : lerpColor(t, VIZ.rose, VIZ.card, VIZ.brand);
                  const cx = 14 + a * 46 + 23;
                  const cy = 16 + s * 11 + 5.5;
                  return (
                    <g key={`qt-${s}-${a}`}>
                      <rect
                        x={14 + a * 46}
                        y={16 + s * 11}
                        width={44}
                        height={10}
                        fill={fill}
                        stroke={VIZ.grid}
                        strokeWidth={0.5}
                      />
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        fill={VIZ.textBright}
                        fontSize={7}
                        fontFamily="monospace"
                      >
                        {kind === "wall" ? "" : val.toFixed(2)}
                      </text>
                    </g>
                  );
                });
              })}
              {/* State labels on left */}
              {Array.from({ length: N_STATES }, (_, s) => {
                const r = Math.floor(s / COLS);
                const c = s % COLS;
                const kind = cellKind(r, c);
                const label = kind === "wall" ? "#" : kind === "goal" ? "G" : kind === "start" ? "S" : `${r},${c}`;
                return (
                  <text
                    key={`sl-${s}`}
                    x={12}
                    y={16 + s * 11 + 8}
                    textAnchor="end"
                    fill={VIZ.text}
                    fontSize={7}
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            <VizStat label="episode" value={`${currentEpisode}`} />
            <VizStat label="ε" value={epsilon.toFixed(2)} color={VIZ.yellow} />
            <VizStat label="α" value={alpha.toFixed(1)} color={VIZ.orange} />
            <VizStat label="max Q" value={globalMaxQ > -Infinity ? globalMaxQ.toFixed(3) : "—"} color={VIZ.brand} />
          </div>

          {/* Run/Pause button */}
          <div className="flex gap-2">
            <VizButton onClick={handleRunPause} active={running}>
              {running ? "Pause" : "Run"}
            </VizButton>
          </div>

          {/* Episode slider */}
          <VizSlider
            label="Episode"
            min={0}
            max={snapshots.length - 1}
            step={1}
            value={episodeIdx}
            onChange={(v) => { setEpisodeIdx(Math.round(v)); setRunning(false); }}
            format={(v) => `${Math.round(v) * SNAPSHOT_EVERY}`}
          />

          {/* ε slider */}
          <VizSlider
            label="ε (exploration)"
            min={0.05}
            max={0.5}
            step={0.05}
            value={epsilon}
            onChange={setEpsilon}
            format={(v) => v.toFixed(2)}
          />

          {/* α slider */}
          <VizSlider
            label="α (learning rate)"
            min={0.1}
            max={0.9}
            step={0.1}
            value={alpha}
            onChange={setAlpha}
            format={(v) => v.toFixed(1)}
          />
        </div>
      </div>
    </VizFrame>
  );
}
