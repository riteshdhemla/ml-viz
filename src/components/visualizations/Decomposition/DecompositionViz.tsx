"use client";

import { useState } from "react";
import { VizFrame, VizButton, VizStat, scale, seededRandom, gaussian, VIZ } from "../viz-kit";

type Mode = "additive" | "multiplicative";

interface Point {
  t: number;
  y: number;
  trend: number;
  seasonal: number;
  residual: number;
}

function buildSeries(mode: Mode): Point[] {
  const rng = seededRandom(77);
  const n = 48;
  return Array.from({ length: n }, (_, t) => {
    const T = 100 + t * 2.1;
    const S = Math.sin((2 * Math.PI * t) / 12) * 25;
    const R = gaussian(rng, 0, 7);
    if (mode === "additive") {
      return { t, y: T + S + R, trend: T, seasonal: S, residual: R };
    } else {
      const sfrac = 1 + S / 100;
      const rfrac = 1 + R / 100;
      return { t, y: T * sfrac * rfrac, trend: T, seasonal: sfrac - 1, residual: rfrac - 1 };
    }
  });
}

const W = 580;
const H = 340;
const ML = 56;
const MR = 12;
const MT = 10;
const PANEL_H = 62;
const PANEL_GAP = 14;
const LABELS = ["Original", "Trend", "Seasonal", "Residual"] as const;

function miniLine(
  pts: number[],
  yMin: number,
  yMax: number,
  top: number,
  color: string
): string {
  const xS = scale(0, pts.length - 1, ML, W - MR);
  const yS = scale(yMin, yMax, top + PANEL_H - 4, top + 4);
  return pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`)
    .join(" ");
}

function zeroY(yMin: number, yMax: number, top: number) {
  return scale(yMin, yMax, top + PANEL_H - 4, top + 4)(0);
}

export default function DecompositionViz({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("additive");
  const pts = buildSeries(mode);

  const series = [
    pts.map((p) => p.y),
    pts.map((p) => p.trend),
    pts.map((p) => p.seasonal),
    pts.map((p) => p.residual),
  ];

  const ranges = series.map((s) => {
    const mn = Math.min(...s);
    const mx = Math.max(...s);
    const pad = (mx - mn) * 0.12;
    return [mn - pad, mx + pad] as [number, number];
  });

  const colors = [VIZ.teal, VIZ.brand, VIZ.orange, VIZ.rose];

  const panelTops = LABELS.map((_, i) => MT + i * (PANEL_H + PANEL_GAP));

  const totalH = MT + 4 * (PANEL_H + PANEL_GAP) - PANEL_GAP + 10;

  return (
    <VizFrame
      title="Time Series Decomposition"
      caption="Decompose a 48-month series into trend, seasonality, and residual. Switch between additive (y = T + S + R) and multiplicative (y = T × S × R) models."
      className={className}
    >
      <div className="flex gap-2 mb-3 flex-wrap">
        <VizButton onClick={() => setMode("additive")} active={mode === "additive"}>
          Additive
        </VizButton>
        <VizButton onClick={() => setMode("multiplicative")} active={mode === "multiplicative"}>
          Multiplicative
        </VizButton>
        <div className="ml-auto flex gap-4">
          <VizStat label="model" value={mode === "additive" ? "T + S + R" : "T × S × R"} />
          <VizStat label="observations" value="48 months" />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" aria-label="Decomposition panels">
        {/* Panel backgrounds + labels */}
        {LABELS.map((label, i) => {
          const top = panelTops[i];
          return (
            <g key={label}>
              <rect x={ML} y={top} width={W - ML - MR} height={PANEL_H} rx={3}
                fill={VIZ.card} opacity={0.6} />
              <text x={ML - 6} y={top + PANEL_H / 2 + 4} textAnchor="end"
                fontSize={10} fill={VIZ.text} fontFamily="monospace">
                {label}
              </text>
            </g>
          );
        })}

        {/* Zero lines for seasonal + residual panels */}
        {[2, 3].map((i) => {
          const top = panelTops[i];
          const [yMin, yMax] = ranges[i];
          const zy = zeroY(yMin, yMax, top);
          return (
            <line key={`zero-${i}`} x1={ML} y1={zy} x2={W - MR} y2={zy}
              stroke={VIZ.axis} strokeWidth={0.8} strokeDasharray="3,2" />
          );
        })}

        {/* Series lines */}
        {series.map((s, i) => {
          const [yMin, yMax] = ranges[i];
          const top = panelTops[i];
          const d = miniLine(s, yMin, yMax, top, colors[i]);
          return (
            <path key={`line-${i}`} d={d} stroke={colors[i]} strokeWidth={1.6}
              fill="none" strokeLinejoin="round" />
          );
        })}

        {/* X axis labels (months) */}
        {[0, 12, 24, 36, 47].map((t) => {
          const x = scale(0, 47, ML, W - MR)(t);
          const bottom = panelTops[3] + PANEL_H + 4;
          return (
            <text key={`xt-${t}`} x={x} y={bottom + 10} textAnchor="middle"
              fontSize={9} fill={VIZ.text}>
              m{t + 1}
            </text>
          );
        })}
      </svg>
    </VizFrame>
  );
}
