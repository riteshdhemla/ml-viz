"use client";

import { useMemo, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizStat,
  useAnimationLoop,
  seededRandom,
} from "../viz-kit";

/**
 * RNNUnrollViz — shows a simple RNN unrolled over 5 timesteps.
 * Architecture: 2 inputs, 3 hidden units, 1 output.
 * Key insight: the same W_h is reused at every step (weight sharing),
 * and the hidden state carries information forward.
 */

const W = 520;
const H = 240;
const T = 5;

// Layout constants
const COL_X = [52, 152, 252, 352, 452];
const INPUT_Y = 200;
const HIDDEN_Y = 130;
const OUTPUT_Y = 32;
const NODE_R = 12;
const HIDDEN_SPACING = 22;

// Fixed input sequence: 5 timesteps × 2 features
const INPUT_SEQ: [number, number][] = [
  [0.8, 0.2],
  [-0.3, 0.9],
  [0.5, -0.4],
  [0.1, 0.7],
  [-0.6, 0.3],
];

function buildWeights() {
  const rng = seededRandom(41);
  const rand = () => rng() - 0.5; // [-0.5, 0.5]

  // Wx: 3×2  (hidden_size × input_size)
  const Wx = Array.from({ length: 3 }, () => [rand(), rand()]);
  // Wh: 3×3  (hidden_size × hidden_size)
  const Wh = Array.from({ length: 3 }, () => [rand(), rand(), rand()]);
  // b:  3
  const b = Array.from({ length: 3 }, () => rand() * 0.2);
  // Wy: 1×3  (output_size × hidden_size)
  const Wy = [rand(), rand(), rand()];
  return { Wx, Wh, b, Wy };
}

function matVec3x2(M: number[][], v: [number, number]): number[] {
  return M.map((row) => row[0] * v[0] + row[1] * v[1]);
}
function matVec3x3(M: number[][], v: number[]): number[] {
  return M.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}
function add3(a: number[], b: number[]): number[] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function tanh3(v: number[]): number[] {
  return v.map(Math.tanh);
}

interface RNNState {
  h: number[]; // 3 hidden units
  y: number;
}

function computeSequence(): RNNState[] {
  const { Wx, Wh, b, Wy } = buildWeights();
  const states: RNNState[] = [];
  let h = [0, 0, 0];
  for (let t = 0; t < T; t++) {
    const wx_x = matVec3x2(Wx, INPUT_SEQ[t]);
    const wh_h = matVec3x3(Wh, h);
    h = tanh3(add3(add3(wx_x, wh_h), b));
    const y = Wy[0] * h[0] + Wy[1] * h[1] + Wy[2] * h[2];
    states.push({ h: [...h], y });
  }
  return states;
}

const ALL_STATES = computeSequence();

// ── helpers ────────────────────────────────────────────────────────────────

function hiddenNodeY(unitIdx: number): number {
  return HIDDEN_Y + (unitIdx - 1) * HIDDEN_SPACING;
}

function nodeOpacity(t: number, active: number): number {
  if (t === active) return 1;
  if (t < active) return 0.4;
  return 0.15;
}

export function RNNUnrollViz({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const accumRef = useRef(0);

  // Auto-advance at ~1 step per second
  useAnimationLoop(
    (dt) => {
      accumRef.current += dt;
      if (accumRef.current >= 1) {
        accumRef.current -= 1;
        setStep((s) => {
          const ns = s + 1;
          if (ns >= T) {
            setPlaying(false);
            return T - 1;
          }
          return ns;
        });
      }
    },
    playing
  );

  const cur = ALL_STATES[step];
  const xCur = INPUT_SEQ[step];

  // Precompute column opacities
  const colOp = useMemo(
    () => Array.from({ length: T }, (_, t) => nodeOpacity(t, step)),
    [step]
  );

  const fmt2 = (v: number) => v.toFixed(2);
  const hStr = `[${cur.h.map(fmt2).join(", ")}]`;

  return (
    <VizFrame
      className={className}
      title="RNN unrolled over 5 timesteps"
      caption="The same weight matrix $W_h$ connects every hidden state to the next — this is weight sharing. Step through the sequence to see the hidden state evolve, carrying context forward."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="RNN unrolled over 5 timesteps"
      >
        {/* ── Horizontal recurrent arrows (W_h) ───────────────────────── */}
        {Array.from({ length: T - 1 }, (_, t) => {
          const x1 = COL_X[t] + NODE_R + 2;
          const x2 = COL_X[t + 1] - NODE_R - 2;
          const y = HIDDEN_Y;
          const opacity = Math.max(colOp[t], colOp[t + 1]);
          return (
            <g key={`arr-${t}`} opacity={opacity}>
              {/* arrow line (central hidden unit row) */}
              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke={VIZ.yellow}
                strokeWidth={1.8}
                markerEnd="url(#arrowYellow)"
              />
              {/* also draw lines for upper/lower hidden rows */}
              {[hiddenNodeY(0), hiddenNodeY(2)].map((hy, ri) => (
                <line
                  key={ri}
                  x1={x1}
                  y1={hy}
                  x2={x2}
                  y2={hy}
                  stroke={VIZ.yellow}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  markerEnd="url(#arrowYellowThin)"
                />
              ))}
              {/* W_h label on first arrow only */}
              {t === 0 && (
                <text
                  x={(x1 + x2) / 2}
                  y={y - 7}
                  fill={VIZ.yellow}
                  fontSize={9}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  W_h
                </text>
              )}
            </g>
          );
        })}

        {/* "same W_h" spanning label above all recurrent arrows */}
        <text
          x={(COL_X[0] + COL_X[T - 1]) / 2}
          y={HIDDEN_Y - 22}
          fill={VIZ.yellow}
          fontSize={9}
          textAnchor="middle"
          opacity={0.7}
        >
          ← same W_h reused at every step →
        </text>

        {/* ── Per-column nodes ─────────────────────────────────────────── */}
        {Array.from({ length: T }, (_, t) => {
          const cx = COL_X[t];
          const op = colOp[t];
          const hVec = t <= step ? ALL_STATES[t].h : [0, 0, 0];
          const xVec = INPUT_SEQ[t];

          return (
            <g key={`col-${t}`} opacity={op}>
              {/* t label */}
              <text
                x={cx}
                y={H - 4}
                fill={VIZ.text}
                fontSize={9}
                textAnchor="middle"
              >
                t={t}
              </text>

              {/* Input node (orange circle) */}
              <circle
                cx={cx}
                cy={INPUT_Y}
                r={NODE_R}
                fill={VIZ.orange}
                fillOpacity={0.85}
                stroke={t === step ? VIZ.orange : "none"}
                strokeWidth={2}
              />
              {/* Input value below */}
              <text
                x={cx}
                y={INPUT_Y + NODE_R + 9}
                fill={VIZ.text}
                fontSize={7}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {xVec[0].toFixed(1)},{xVec[1].toFixed(1)}
              </text>

              {/* input → hidden arrows */}
              {[0, 1, 2].map((u) => (
                <line
                  key={`inp-h-${u}`}
                  x1={cx}
                  y1={INPUT_Y - NODE_R - 1}
                  x2={cx}
                  y2={hiddenNodeY(u) + NODE_R + 1}
                  stroke={VIZ.axis}
                  strokeWidth={0.8}
                  markerEnd="url(#arrowGray)"
                />
              ))}

              {/* Hidden nodes (brand color, brightness by activation) */}
              {[0, 1, 2].map((u) => {
                const hy = hiddenNodeY(u);
                const actAbs = Math.min(1, Math.abs(hVec[u]));
                const fillOp = t <= step ? 0.25 + 0.65 * actAbs : 0.2;
                return (
                  <g key={`h-${u}`}>
                    <circle
                      cx={cx}
                      cy={hy}
                      r={NODE_R}
                      fill={VIZ.brand}
                      fillOpacity={fillOp}
                      stroke={t === step ? VIZ.brandLight : VIZ.brand}
                      strokeWidth={t === step ? 1.5 : 0.5}
                      strokeOpacity={0.6}
                    />
                    {/* tiny bar showing activation magnitude */}
                    {t <= step && (
                      <rect
                        x={cx - NODE_R + 2}
                        y={hy - 2}
                        width={Math.max(0, (NODE_R * 2 - 4) * actAbs)}
                        height={4}
                        fill={VIZ.brandLight}
                        fillOpacity={0.7}
                        rx={1}
                      />
                    )}
                  </g>
                );
              })}

              {/* hidden → output arrows */}
              {[0, 1, 2].map((u) => (
                <line
                  key={`h-out-${u}`}
                  x1={cx}
                  y1={hiddenNodeY(u) - NODE_R - 1}
                  x2={cx}
                  y2={OUTPUT_Y + NODE_R + 1}
                  stroke={VIZ.axis}
                  strokeWidth={0.8}
                  markerEnd="url(#arrowGray)"
                />
              ))}

              {/* Output node (teal circle) */}
              <circle
                cx={cx}
                cy={OUTPUT_Y}
                r={NODE_R}
                fill={VIZ.teal}
                fillOpacity={t <= step ? 0.85 : 0.2}
                stroke={t === step ? VIZ.teal : "none"}
                strokeWidth={2}
              />
            </g>
          );
        })}

        {/* ── Arrow markers ─────────────────────────────────────────────── */}
        <defs>
          <marker
            id="arrowYellow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" fill={VIZ.yellow} />
          </marker>
          <marker
            id="arrowYellowThin"
            markerWidth="4"
            markerHeight="4"
            refX="3"
            refY="2"
            orient="auto"
          >
            <path d="M0,0 L0,4 L4,2 z" fill={VIZ.yellow} fillOpacity={0.5} />
          </marker>
          <marker
            id="arrowGray"
            markerWidth="4"
            markerHeight="4"
            refX="3"
            refY="2"
            orient="auto"
          >
            <path d="M0,0 L0,4 L4,2 z" fill={VIZ.axis} />
          </marker>
        </defs>

        {/* ── Legend ────────────────────────────────────────────────────── */}
        <circle cx={12} cy={OUTPUT_Y} r={5} fill={VIZ.teal} fillOpacity={0.8} />
        <text x={20} y={OUTPUT_Y + 4} fill={VIZ.text} fontSize={8}>output y_t</text>
        <circle cx={12} cy={HIDDEN_Y} r={5} fill={VIZ.brand} fillOpacity={0.8} />
        <text x={20} y={HIDDEN_Y + 4} fill={VIZ.text} fontSize={8}>hidden h_t</text>
        <circle cx={12} cy={INPUT_Y} r={5} fill={VIZ.orange} fillOpacity={0.8} />
        <text x={20} y={INPUT_Y + 4} fill={VIZ.text} fontSize={8}>input x_t</text>
      </svg>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <VizButton onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}>
          ← Prev
        </VizButton>
        <VizButton onClick={() => { setPlaying(false); setStep((s) => Math.min(T - 1, s + 1)); }}>
          Next →
        </VizButton>
        <VizButton
          active={playing}
          onClick={() => {
            if (step === T - 1) { setStep(0); accumRef.current = 0; }
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </VizButton>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="t" value={String(step)} />
        <VizStat
          label="x_t"
          value={`[${xCur[0].toFixed(1)}, ${xCur[1].toFixed(1)}]`}
          color={VIZ.orange}
        />
        <VizStat label="h_t" value={hStr} color={VIZ.brandLight} />
        <VizStat label="y_t" value={cur.y.toFixed(3)} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
