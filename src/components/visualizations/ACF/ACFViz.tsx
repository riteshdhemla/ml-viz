"use client";

import { useState } from "react";
import { VizFrame, VizButton, VizStat, scale, seededRandom, VIZ } from "../viz-kit";

type Pattern = "AR(1)" | "MA(1)" | "White Noise";

const LAGS = 16;
const SIG = 0.179; // ±1.96/√120

/** Theoretical ACF values for each pattern */
function acfValues(pattern: Pattern): number[] {
  const rng = seededRandom(42);
  return Array.from({ length: LAGS }, (_, k) => {
    const lag = k + 1;
    if (pattern === "AR(1)") return Math.pow(0.8, lag);
    if (pattern === "MA(1)") return lag === 1 ? 0.7 / (1 + 0.7 * 0.7) : 0;
    // White noise: small noise within ±SIG * 0.8
    return (rng() - 0.5) * SIG * 1.2;
  });
}

const W = 560;
const H = 240;
const ML = 42;
const MR = 12;
const MT = 16;
const MB = 36;
const BAR_W = 14;

export default function ACFViz({ className }: { className?: string }) {
  const [pattern, setPattern] = useState<Pattern>("AR(1)");

  const vals = acfValues(pattern);
  const yS = scale(-1, 1, H - MB, MT);
  const xS = scale(0, LAGS + 1, ML, W - MR);
  const zeroY = yS(0);
  const sigPosY = yS(SIG);
  const sigNegY = yS(-SIG);

  const patternLabels: { p: Pattern; label: string }[] = [
    { p: "AR(1)", label: "AR(1) φ=0.8" },
    { p: "MA(1)", label: "MA(1) θ=0.7" },
    { p: "White Noise", label: "White Noise" },
  ];

  return (
    <VizFrame
      title="Autocorrelation Function (ACF)"
      caption="Bars show autocorrelation at each lag. Dashed lines are the ±1.96/√T significance bounds — bars outside them are statistically significant. AR(1) shows exponential decay; MA(1) cuts off after lag 1; white noise stays within bounds throughout."
      className={className}
    >
      <div className="flex gap-2 mb-3 flex-wrap">
        {patternLabels.map(({ p, label }) => (
          <VizButton key={p} onClick={() => setPattern(p)} active={pattern === p}>
            {label}
          </VizButton>
        ))}
        <div className="ml-auto">
          <VizStat label="sig. bound" value={`±${SIG.toFixed(3)}`} color={VIZ.yellow} />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="ACF plot">
        {/* Background */}
        <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB}
          fill={VIZ.card} rx={3} opacity={0.6} />

        {/* Grid lines */}
        {[-0.5, 0.5].map((v) => (
          <line key={`grid-${v}`} x1={ML} y1={yS(v)} x2={W - MR} y2={yS(v)}
            stroke={VIZ.grid} strokeWidth={0.6} />
        ))}

        {/* Significance bands */}
        <rect x={ML} y={sigPosY} width={W - ML - MR} height={sigNegY - sigPosY}
          fill={VIZ.yellow} opacity={0.07} />
        <line x1={ML} y1={sigPosY} x2={W - MR} y2={sigPosY}
          stroke={VIZ.yellow} strokeWidth={1} strokeDasharray="5,3" />
        <line x1={ML} y1={sigNegY} x2={W - MR} y2={sigNegY}
          stroke={VIZ.yellow} strokeWidth={1} strokeDasharray="5,3" />

        {/* Zero line */}
        <line x1={ML} y1={zeroY} x2={W - MR} y2={zeroY}
          stroke={VIZ.axis} strokeWidth={1} />

        {/* Bars */}
        {vals.map((v, k) => {
          const x = xS(k + 1);
          const isSignificant = Math.abs(v) > SIG;
          const color = isSignificant
            ? v > 0 ? VIZ.teal : VIZ.rose
            : VIZ.text;
          const barTop = v >= 0 ? yS(v) : zeroY;
          const barH = Math.abs(yS(v) - zeroY);
          return (
            <g key={k}>
              <rect
                x={x - BAR_W / 2}
                y={barTop}
                width={BAR_W}
                height={Math.max(barH, 1)}
                fill={color}
                opacity={0.85}
                rx={2}
              />
            </g>
          );
        })}

        {/* X axis labels */}
        {Array.from({ length: LAGS }, (_, k) => {
          const x = xS(k + 1);
          const showLabel = k % 2 === 0 || k === LAGS - 1;
          return showLabel ? (
            <text key={`xl-${k}`} x={x} y={H - MB + 14} textAnchor="middle"
              fontSize={9} fill={VIZ.text}>
              {k + 1}
            </text>
          ) : null;
        })}
        <text x={ML + (W - ML - MR) / 2} y={H - 4} textAnchor="middle"
          fontSize={9} fill={VIZ.text}>
          Lag
        </text>

        {/* Y axis labels */}
        {[-1, -0.5, 0, 0.5, 1].map((v) => (
          <text key={`yl-${v}`} x={ML - 5} y={yS(v) + 4} textAnchor="end"
            fontSize={9} fill={VIZ.text}>
            {v.toFixed(1)}
          </text>
        ))}

        {/* Legend */}
        <circle cx={W - MR - 60} cy={MT + 10} r={4} fill={VIZ.teal} />
        <text x={W - MR - 54} y={MT + 14} fontSize={9} fill={VIZ.text}>
          significant +
        </text>
        <circle cx={W - MR - 60} cy={MT + 24} r={4} fill={VIZ.rose} />
        <text x={W - MR - 54} y={MT + 28} fontSize={9} fill={VIZ.text}>
          significant −
        </text>
      </svg>
    </VizFrame>
  );
}
