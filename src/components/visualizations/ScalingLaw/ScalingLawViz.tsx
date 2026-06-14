"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Chinchilla-style loss law plotted on a log-log axis.
 *
 *   L(N, D) = A / N^alpha + B / D^beta + E
 *
 * x-axis: training compute  C = 6·N·D  (FLOPs, log scale)
 * y-axis: loss  L  (log scale)
 *
 * We draw three model-size curves (1B / 7B / 70B parameters), each sweeping D
 * from a small token budget up to a large one, and mark the compute-optimal
 * point per curve under the Chinchilla rule  D ≈ 20·N. A slider sets the total
 * compute budget; the viz reports the matching compute-optimal (N*, D*) and
 * the predicted loss at that budget.
 */

// Chinchilla-paper-style rough constants. Exponents pinned to the values
// quoted in the lesson body so the surface behaves as expected.
const A = 406.4;
const B = 410.7;
const E = 1.69;
const ALPHA = 0.34;
const BETA = 0.28;

/** Chinchilla loss law. */
function chinchillaLoss(N: number, D: number): number {
  return A / Math.pow(N, ALPHA) + B / Math.pow(D, BETA) + E;
}

/**
 * Compute-optimal (N*, D*) under D = 20·N for a given compute budget C = 6ND.
 *   C = 6 · N · (20·N) = 120 · N²   ⇒   N* = sqrt(C / 120),  D* = 20·N*.
 */
function chinchillaOptimal(C: number): { N: number; D: number } {
  const N = Math.sqrt(C / 120);
  return { N, D: 20 * N };
}

/** Compute FLOPs for a given (N, D). */
function flops(N: number, D: number): number {
  return 6 * N * D;
}

/** Pretty-print a big number with one significant decimal in scientific form. */
function fmtSci(x: number): string {
  if (!isFinite(x) || x <= 0) return "—";
  const exp = Math.floor(Math.log10(x));
  const mant = x / Math.pow(10, exp);
  return `${mant.toFixed(1)}e${exp}`;
}

/** Pretty-print a parameter count as e.g. "7.2B" or "340M". */
function fmtParams(N: number): string {
  if (N >= 1e12) return `${(N / 1e12).toFixed(1)}T`;
  if (N >= 1e9) return `${(N / 1e9).toFixed(1)}B`;
  if (N >= 1e6) return `${(N / 1e6).toFixed(0)}M`;
  if (N >= 1e3) return `${(N / 1e3).toFixed(0)}K`;
  return N.toFixed(0);
}

/** Pretty-print a token count. */
function fmtTokens(D: number): string {
  if (D >= 1e12) return `${(D / 1e12).toFixed(1)}T tok`;
  if (D >= 1e9) return `${(D / 1e9).toFixed(0)}B tok`;
  if (D >= 1e6) return `${(D / 1e6).toFixed(0)}M tok`;
  return `${D.toFixed(0)} tok`;
}

// Viewport.
const W = 560;
const H = 320;
const PAD_L = 60;
const PAD_R = 14;
const PAD_T = 24;
const PAD_B = 40;

// Compute axis bounds (log10 of FLOPs). 1e18 ... 1e26 spans ~GPT-2 → frontier.
const LOG_C_MIN = 18;
const LOG_C_MAX = 26;
// Loss axis (log10). Lower bound ~ E (irreducible); upper bound for tiny models.
const LOG_L_MIN = Math.log10(E + 0.05);
const LOG_L_MAX = Math.log10(60);

const CURVES = [
  { N: 1e9, label: "1B params", color: VIZ.teal },
  { N: 7e9, label: "7B params", color: VIZ.brand },
  { N: 7e10, label: "70B params", color: VIZ.orange },
] as const;

type CurvePoint = { logC: number; logL: number };

function buildCurve(N: number): CurvePoint[] {
  // Sweep D over a wide range and record (C, L) at each D.
  const pts: CurvePoint[] = [];
  const logDmin = 8; // 100M tokens
  const logDmax = 13; // 10T tokens
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const logD = logDmin + ((logDmax - logDmin) * i) / steps;
    const D = Math.pow(10, logD);
    const C = flops(N, D);
    const L = chinchillaLoss(N, D);
    const logC = Math.log10(C);
    const logL = Math.log10(L);
    if (logC < LOG_C_MIN - 0.5 || logC > LOG_C_MAX + 0.5) continue;
    pts.push({ logC, logL });
  }
  return pts;
}

export function ScalingLawViz({ className }: { className?: string }) {
  // Slider value is log10(C). Start near a 7B-scale Chinchilla budget.
  const [logC, setLogC] = useState(22.5);

  const sx = scale(LOG_C_MIN, LOG_C_MAX, PAD_L, W - PAD_R);
  const sy = scale(LOG_L_MIN, LOG_L_MAX, H - PAD_B, PAD_T);

  const curves = useMemo(() => CURVES.map((c) => ({ ...c, pts: buildCurve(c.N) })), []);

  // Compute-optimal point for the currently selected budget.
  const C = Math.pow(10, logC);
  const opt = chinchillaOptimal(C);
  const optLoss = chinchillaLoss(opt.N, opt.D);

  // x grid: every integer power of 10 in [LOG_C_MIN, LOG_C_MAX].
  const xTicks = [];
  for (let p = LOG_C_MIN; p <= LOG_C_MAX; p++) xTicks.push(p);
  // y grid: every 0.1 in log space — but only label a few.
  const yLabelTicks = [2, 3, 5, 10, 20, 50];

  return (
    <VizFrame
      className={className}
      title="Chinchilla scaling law: loss vs compute (log-log)"
      caption="Each curve sweeps training tokens D for a fixed model size N, plotting predicted loss L(N, D) against compute C = 6ND. The compute-optimal point per curve (★) follows the Chinchilla rule D ≈ 20·N. Slide the compute budget to see the matching optimal (N*, D*)."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Loss versus compute, log-log">
        {/* Axes */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={VIZ.axis} />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={VIZ.axis} />

        {/* X ticks + labels */}
        {xTicks.map((p) => (
          <g key={`x-${p}`}>
            <line x1={sx(p)} y1={H - PAD_B} x2={sx(p)} y2={H - PAD_B + 4} stroke={VIZ.axis} />
            <line x1={sx(p)} y1={PAD_T} x2={sx(p)} y2={H - PAD_B} stroke={VIZ.grid} strokeDasharray="2 4" />
            {p % 2 === 0 && (
              <text x={sx(p)} y={H - PAD_B + 16} fill={VIZ.text} fontSize={10} textAnchor="middle" fontFamily="monospace">
                1e{p}
              </text>
            )}
          </g>
        ))}
        <text x={(PAD_L + W - PAD_R) / 2} y={H - 6} fill={VIZ.textBright} fontSize={11} textAnchor="middle">
          Compute C = 6·N·D (FLOPs, log)
        </text>

        {/* Y ticks + labels */}
        {yLabelTicks.map((v) => {
          const lv = Math.log10(v);
          if (lv < LOG_L_MIN || lv > LOG_L_MAX) return null;
          return (
            <g key={`y-${v}`}>
              <line x1={PAD_L - 4} y1={sy(lv)} x2={PAD_L} y2={sy(lv)} stroke={VIZ.axis} />
              <line x1={PAD_L} y1={sy(lv)} x2={W - PAD_R} y2={sy(lv)} stroke={VIZ.grid} strokeDasharray="2 4" />
              <text x={PAD_L - 6} y={sy(lv) + 3} fill={VIZ.text} fontSize={10} textAnchor="end" fontFamily="monospace">
                {v}
              </text>
            </g>
          );
        })}
        <text
          x={14}
          y={(PAD_T + H - PAD_B) / 2}
          fill={VIZ.textBright}
          fontSize={11}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(PAD_T + H - PAD_B) / 2})`}
        >
          Loss L (log)
        </text>

        {/* Curves */}
        {curves.map((c) => {
          const d = c.pts
            .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.logC).toFixed(2)} ${sy(p.logL).toFixed(2)}`)
            .join(" ");
          // Compute-optimal point for THIS N: D* = 20N, plot (6·N·D*, L*).
          const Dstar = 20 * c.N;
          const Cstar = flops(c.N, Dstar);
          const Lstar = chinchillaLoss(c.N, Dstar);
          const cx = sx(Math.log10(Cstar));
          const cy = sy(Math.log10(Lstar));
          return (
            <g key={c.label}>
              <path d={d} stroke={c.color} strokeWidth={2} fill="none" />
              <polygon
                points={`${cx},${cy - 6} ${cx + 5.5},${cy + 4} ${cx - 5.5},${cy + 4}`}
                fill={c.color}
                stroke={VIZ.textBright}
                strokeWidth={0.8}
              />
            </g>
          );
        })}

        {/* Vertical line at selected compute budget. */}
        <line
          x1={sx(logC)}
          y1={PAD_T}
          x2={sx(logC)}
          y2={H - PAD_B}
          stroke={VIZ.yellow}
          strokeWidth={1.2}
          strokeDasharray="4 4"
        />
        {/* Compute-optimal marker for the selected budget. */}
        <circle
          cx={sx(logC)}
          cy={sy(Math.log10(optLoss))}
          r={5}
          fill={VIZ.yellow}
          stroke={VIZ.textBright}
          strokeWidth={1}
        />

        {/* Legend */}
        <g transform={`translate(${W - PAD_R - 110}, ${PAD_T + 4})`}>
          {curves.map((c, i) => (
            <g key={c.label} transform={`translate(0, ${i * 14})`}>
              <line x1={0} y1={6} x2={18} y2={6} stroke={c.color} strokeWidth={2} />
              <text x={24} y={9} fill={VIZ.textBright} fontSize={10} fontFamily="monospace">
                {c.label}
              </text>
            </g>
          ))}
          <g transform={`translate(0, ${CURVES.length * 14})`}>
            <circle cx={9} cy={6} r={4} fill={VIZ.yellow} stroke={VIZ.textBright} strokeWidth={0.8} />
            <text x={24} y={9} fill={VIZ.textBright} fontSize={10} fontFamily="monospace">
              budget C
            </text>
          </g>
          <g transform={`translate(0, ${(CURVES.length + 1) * 14})`}>
            <polygon points="9,2 14,10 4,10" fill={VIZ.text} stroke={VIZ.textBright} strokeWidth={0.6} />
            <text x={24} y={9} fill={VIZ.textBright} fontSize={10} fontFamily="monospace">
              D = 20·N
            </text>
          </g>
        </g>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider
          label="compute budget log₁₀(C) [FLOPs]"
          min={LOG_C_MIN}
          max={LOG_C_MAX}
          step={0.1}
          value={logC}
          onChange={setLogC}
          format={(v) => `1e${v.toFixed(1)}`}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <VizStat label="compute C" value={`${fmtSci(C)} FLOPs`} color={VIZ.yellow} />
        <VizStat label="optimal N*" value={fmtParams(opt.N)} color={VIZ.brand} />
        <VizStat label="optimal D*" value={fmtTokens(opt.D)} color={VIZ.teal} />
        <VizStat label="predicted loss" value={optLoss.toFixed(2)} color={VIZ.orange} />
      </div>
    </VizFrame>
  );
}
