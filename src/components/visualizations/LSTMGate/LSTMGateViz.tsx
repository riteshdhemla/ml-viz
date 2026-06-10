"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, seededRandom, scale } from "../viz-kit";

/**
 * Animates a scalar LSTM cell over an 8-step input sequence.
 * Shows cell state "highway", three gate bars (forget/input/output),
 * candidate value, and hidden state. A forget-bias slider demonstrates
 * long-term memory vs. rapid forgetting.
 */

const W = 560;
const H = 260;

// Fixed LSTM weights — deterministic, produces interesting dynamics.
const Wf = 0.5, Wi = 0.3, Wo = 0.4, Wc = 0.6;
const Uf = 0.2, Ui = 0.15, Uo = 0.25, Uc = 0.3;

function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }

interface LSTMStep {
  x: number;
  f: number;
  i: number;
  o: number;
  cTilde: number;
  c: number;
  h: number;
}

/** Generate all 8 LSTM timesteps given an optional forget-gate bias offset. */
function computeSteps(xs: number[], forgeBias: number): LSTMStep[] {
  const steps: LSTMStep[] = [];
  let h = 0, c = 0;
  for (const x of xs) {
    const f = sigmoid(Wf * x + Uf * h + forgeBias);
    const i = sigmoid(Wi * x + Ui * h);
    const o = sigmoid(Wo * x + Uo * h);
    const cTilde = Math.tanh(Wc * x + Uc * h);
    c = f * c + i * cTilde;
    h = o * Math.tanh(c);
    steps.push({ x, f, i, o, cTilde, c, h });
  }
  return steps;
}

// SVG layout constants
const LABEL_X = 10;
const BAR_X = 80;
const MAX_BAR_W = 300;
const ROW_H = 42;
const ROWS_Y = 85;   // first gate row top-y
const HW_Y = 230;    // hidden-state row y-center

const CELL_BAR_Y = 20;
const CELL_BAR_H = 28;

export function LSTMGateViz({ className }: { className?: string }) {
  const [step, setStep] = useState(0);        // 0-indexed
  const [forgeBias, setForgeBias] = useState(0);

  // Generate fixed 8-step input sequence using seededRandom(7)
  const xs = useMemo(() => {
    const rng = seededRandom(7);
    return Array.from({ length: 8 }, () => rng() * 2 - 1);
  }, []);

  // Recompute all steps when forgeBias changes
  const allSteps = useMemo(() => computeSteps(xs, forgeBias), [xs, forgeBias]);

  const cur = allSteps[step];

  // Cell state color intensity: brighter fill = stronger |C_t|
  const cellOpacity = Math.min(0.9, 0.1 + 0.8 * Math.min(1, Math.abs(cur.c) / 1.5));

  // Bar widths for each gate
  const barW = (v: number) => v * MAX_BAR_W;

  // Hidden-state circle radius (min 4, max 22)
  const hRadius = 4 + 18 * Math.min(1, Math.abs(cur.h));

  // Scale for VizStat display values
  const fmt = (v: number) => v.toFixed(3);

  // Step labels for the timeline dots
  const timelineX = scale(0, 7, BAR_X, BAR_X + MAX_BAR_W);

  return (
    <VizFrame
      className={className}
      caption="Step through the sequence to see how the forget gate (red) erases memory, the input gate (purple) writes new content, and the output gate (teal) controls what the hidden state reads. Drag the forget-bias slider to see long-term memory in action."
    >
      {/* Timeline step selector */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <VizButton onClick={() => setStep((s) => Math.max(0, s - 1))}>← Prev</VizButton>
        <div className="flex gap-1">
          {allSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors ${
                idx === step
                  ? "bg-brand-500 text-white"
                  : "bg-surface-elevated text-slate-400 hover:bg-surface-border"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <VizButton onClick={() => setStep((s) => Math.min(7, s + 1))}>Next →</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="LSTM cell gate visualization">

        {/* ── Cell state highway ── */}
        {/* Background rail */}
        <rect x={BAR_X} y={CELL_BAR_Y} width={MAX_BAR_W} height={CELL_BAR_H}
          fill={VIZ.grid} rx={4} />
        {/* Filled portion: maps |C_t| to width */}
        <rect
          x={BAR_X}
          y={CELL_BAR_Y}
          width={Math.min(MAX_BAR_W, Math.abs(cur.c) / 1.5 * MAX_BAR_W)}
          height={CELL_BAR_H}
          fill={VIZ.teal}
          fillOpacity={cellOpacity}
          rx={4}
        />
        {/* Highway border */}
        <rect x={BAR_X} y={CELL_BAR_Y} width={MAX_BAR_W} height={CELL_BAR_H}
          fill="none" stroke={VIZ.teal} strokeWidth={1.5} rx={4} />
        {/* Label */}
        <text x={LABEL_X} y={CELL_BAR_Y + CELL_BAR_H / 2 + 4} fill={VIZ.textBright}
          fontSize={11} fontWeight="600">Cell C_t</text>
        {/* Value */}
        <text x={BAR_X + MAX_BAR_W + 8} y={CELL_BAR_Y + CELL_BAR_H / 2 + 4}
          fill={VIZ.teal} fontSize={11} fontFamily="monospace">{fmt(cur.c)}</text>

        {/* ── Gate rows ── */}
        {([
          { label: "Forget f_t", value: cur.f, color: VIZ.rose },
          { label: "Input  i_t", value: cur.i, color: VIZ.brand },
          { label: "Output o_t", value: cur.o, color: VIZ.teal },
        ] as const).map(({ label, value, color }, rowIdx) => {
          const y = ROWS_Y + rowIdx * ROW_H;
          const bw = barW(value);
          return (
            <g key={label}>
              {/* row label */}
              <text x={LABEL_X} y={y + 16} fill={VIZ.text} fontSize={11}>{label}</text>
              {/* background bar */}
              <rect x={BAR_X} y={y} width={MAX_BAR_W} height={28} fill={VIZ.grid} rx={3} />
              {/* filled bar */}
              <rect x={BAR_X} y={y} width={bw} height={28}
                fill={color} fillOpacity={0.85} rx={3} />
              {/* gate value label at right of bar */}
              <text x={BAR_X + MAX_BAR_W + 8} y={y + 18}
                fill={color} fontSize={11} fontFamily="monospace">{value.toFixed(3)}</text>
            </g>
          );
        })}

        {/* ── Candidate row ── */}
        {(() => {
          const y = ROWS_Y + 3 * ROW_H;
          const absV = Math.abs(cur.cTilde);
          const bw = absV * MAX_BAR_W;
          // center at BAR_X + MAX_BAR_W/2, direction indicates sign
          return (
            <g>
              <text x={LABEL_X} y={y + 16} fill={VIZ.text} fontSize={11}>~C  cand.</text>
              <rect x={BAR_X} y={y} width={MAX_BAR_W} height={28} fill={VIZ.grid} rx={3} />
              {cur.cTilde >= 0
                ? <rect x={BAR_X} y={y} width={bw} height={28}
                    fill={VIZ.teal} fillOpacity={0.55} rx={3} />
                : <rect x={BAR_X + MAX_BAR_W - bw} y={y} width={bw} height={28}
                    fill={VIZ.rose} fillOpacity={0.55} rx={3} />
              }
              <text x={BAR_X + MAX_BAR_W + 8} y={y + 18}
                fill={VIZ.yellow} fontSize={11} fontFamily="monospace">{fmt(cur.cTilde)}</text>
            </g>
          );
        })()}

        {/* ── Hidden state circle ── */}
        <text x={LABEL_X} y={HW_Y + 4} fill={VIZ.text} fontSize={11}>Hidden h_t</text>
        <circle
          cx={BAR_X + 40}
          cy={HW_Y}
          r={hRadius}
          fill={VIZ.yellow}
          fillOpacity={0.85}
        />
        <text x={BAR_X + 40 + hRadius + 6} y={HW_Y + 4}
          fill={VIZ.yellow} fontSize={11} fontFamily="monospace">{fmt(cur.h)}</text>

        {/* ── Input x_t label ── */}
        <text x={BAR_X + MAX_BAR_W - 60} y={HW_Y + 4}
          fill={VIZ.text} fontSize={11}>x_t =</text>
        <text x={BAR_X + MAX_BAR_W - 20} y={HW_Y + 4}
          fill={VIZ.orange} fontSize={11} fontFamily="monospace">{cur.x.toFixed(3)}</text>

        {/* ── Timeline dots at bottom ── */}
        {allSteps.map((s, idx) => (
          <circle
            key={idx}
            cx={timelineX(idx)}
            cy={H - 10}
            r={idx === step ? 5 : 3}
            fill={idx === step ? VIZ.brand : VIZ.axis}
            style={{ cursor: "pointer" }}
            onClick={() => setStep(idx)}
          />
        ))}
        <text x={BAR_X} y={H - 16} fill={VIZ.text} fontSize={9}>t=1</text>
        <text x={BAR_X + MAX_BAR_W} y={H - 16} fill={VIZ.text} fontSize={9} textAnchor="end">t=8</text>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider
          label="Forget-gate bias"
          min={-2}
          max={2}
          step={0.1}
          value={forgeBias}
          onChange={setForgeBias}
          format={(v) => (v >= 0 ? "+" : "") + v.toFixed(1)}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <VizStat label="step t" value={String(step + 1)} />
        <VizStat label="f_t forget" value={fmt(cur.f)} color={VIZ.rose} />
        <VizStat label="i_t input" value={fmt(cur.i)} color={VIZ.brand} />
        <VizStat label="o_t output" value={fmt(cur.o)} color={VIZ.teal} />
        <VizStat label="C_t cell" value={fmt(cur.c)} color={VIZ.teal} />
        <VizStat label="h_t hidden" value={fmt(cur.h)} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
