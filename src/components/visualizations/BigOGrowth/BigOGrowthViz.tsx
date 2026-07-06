"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Big-O growth curves — how the operation count of each complexity class
 * scales with input size n, on a log-y axis so all six classes fit at once.
 *
 * A slider sets n; a dashed vertical line marks it and the VizStat row reports
 * the exact operation count each class incurs at that n. The point is visceral:
 * at n = 40, O(n²) is ~1.6k operations while O(2ⁿ) is ~10¹² — the gap between a
 * feasible algorithm and an impossible one is entirely in the growth class.
 */

interface OrderClass {
  label: string;
  color: string;
  /** Operations as a function of input size n. */
  ops: (n: number) => number;
}

const CLASSES: OrderClass[] = [
  { label: "O(1)", color: VIZ.teal, ops: () => 1 },
  { label: "O(log n)", color: VIZ.brandLight, ops: (n) => Math.log2(Math.max(n, 1)) },
  { label: "O(n)", color: VIZ.brand, ops: (n) => n },
  { label: "O(n log n)", color: VIZ.yellow, ops: (n) => n * Math.log2(Math.max(n, 1)) },
  { label: "O(n²)", color: VIZ.orange, ops: (n) => n * n },
  { label: "O(2ⁿ)", color: VIZ.rose, ops: (n) => Math.pow(2, n) },
];

// Viewport.
const W = 560;
const H = 320;
const PAD_L = 54;
const PAD_R = 14;
const PAD_T = 20;
const PAD_B = 40;

const N_MIN = 1;
const N_MAX = 40;

// y-axis is log10(operations). 2^40 ≈ 1.1e12, so 12 decades covers every class.
const LOG_MIN = 0;
const LOG_MAX = 12;

/** log10 of an operation count, clamped into the visible band. */
function logOps(v: number): number {
  const l = Math.log10(Math.max(v, 1));
  return Math.min(Math.max(l, LOG_MIN), LOG_MAX);
}

/** Human-readable operation count: exact when small, scientific when large. */
function fmtOps(v: number): string {
  if (v < 1000) return v < 10 ? v.toFixed(v % 1 === 0 ? 0 : 1) : Math.round(v).toString();
  const exp = Math.floor(Math.log10(v));
  const mant = v / Math.pow(10, exp);
  return `${mant.toFixed(1)}e${exp}`;
}

export function BigOGrowthViz({ className }: { className?: string }) {
  const [n, setN] = useState(20);

  const sx = scale(N_MIN, N_MAX, PAD_L, W - PAD_R);
  const sy = scale(LOG_MIN, LOG_MAX, H - PAD_B, PAD_T);

  // Pre-sample each curve across the whole n range (static — no n dependency).
  const curves = useMemo(
    () =>
      CLASSES.map((c) => {
        const pts: { x: number; y: number }[] = [];
        for (let i = N_MIN; i <= N_MAX; i += 0.5) {
          pts.push({ x: sx(i), y: sy(logOps(c.ops(i))) });
        }
        return { ...c, d: pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") };
      }),
    // sx/sy are pure functions of module constants — safe to compute once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const xTicks = [1, 10, 20, 30, 40];
  const yTicks = [0, 2, 4, 6, 8, 10, 12]; // decades of operations

  return (
    <VizFrame
      className={className}
      title="Big-O growth: operations vs input size (log scale)"
      caption="Every curve is one complexity class' operation count as input size n grows, on a log-scaled y-axis. Slide n to read off the exact cost of each class. Notice how O(n log n) tracks O(n) closely while O(2ⁿ) leaves the chart almost immediately — that separation is the whole reason complexity classes matter."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Big-O complexity growth curves">
        {/* Axes */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={VIZ.axis} />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={VIZ.axis} />

        {/* X ticks */}
        {xTicks.map((t) => (
          <g key={`x-${t}`}>
            <line x1={sx(t)} y1={H - PAD_B} x2={sx(t)} y2={H - PAD_B + 4} stroke={VIZ.axis} />
            <text x={sx(t)} y={H - PAD_B + 16} fill={VIZ.text} fontSize={10} textAnchor="middle" fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}
        <text x={(PAD_L + W - PAD_R) / 2} y={H - 6} fill={VIZ.textBright} fontSize={11} textAnchor="middle">
          input size n
        </text>

        {/* Y ticks (decades) */}
        {yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line x1={PAD_L} y1={sy(t)} x2={W - PAD_R} y2={sy(t)} stroke={VIZ.grid} strokeDasharray="2 4" />
            <text x={PAD_L - 6} y={sy(t) + 3} fill={VIZ.text} fontSize={10} textAnchor="end" fontFamily="monospace">
              10{t === 0 ? "⁰" : `^${t}`}
            </text>
          </g>
        ))}
        <text
          x={14}
          y={(PAD_T + H - PAD_B) / 2}
          fill={VIZ.textBright}
          fontSize={11}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(PAD_T + H - PAD_B) / 2})`}
        >
          operations (log)
        </text>

        {/* Selected-n marker line */}
        <line x1={sx(n)} y1={PAD_T} x2={sx(n)} y2={H - PAD_B} stroke={VIZ.textBright} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />

        {/* Curves + intersection dot at selected n */}
        {curves.map((c) => {
          const oy = sy(logOps(c.ops(n)));
          const off = logOps(c.ops(n)) >= LOG_MAX; // curve has left the top of the chart
          return (
            <g key={c.label}>
              <path d={c.d} stroke={c.color} strokeWidth={2} fill="none" />
              {!off && <circle cx={sx(n)} cy={oy} r={3.5} fill={c.color} stroke={VIZ.card} strokeWidth={1} />}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${PAD_L + 8}, ${PAD_T + 2})`}>
          {CLASSES.map((c, i) => (
            <g key={c.label} transform={`translate(0, ${i * 13})`}>
              <line x1={0} y1={5} x2={16} y2={5} stroke={c.color} strokeWidth={2} />
              <text x={22} y={8} fill={VIZ.textBright} fontSize={10} fontFamily="monospace">
                {c.label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="input size n" min={N_MIN} max={N_MAX} step={1} value={n} onChange={(v) => setN(Math.round(v))} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {CLASSES.map((c) => (
          <VizStat key={c.label} label={c.label} value={fmtOps(c.ops(n))} color={c.color} />
        ))}
      </div>
    </VizFrame>
  );
}
