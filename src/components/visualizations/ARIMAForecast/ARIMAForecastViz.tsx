"use client";

import { useState } from "react";
import { VizFrame, VizButton, VizStat, scale, seededRandom, gaussian, VIZ } from "../viz-kit";

const N_HIST = 36;
const N_FORE = 12;
const PHI = 0.72;
const SIGMA = 8;
const W = 580;
const H = 240;
const ML = 44;
const MR = 14;
const MT = 16;
const MB = 32;

function buildHistory(): number[] {
  const rng = seededRandom(99);
  const pts: number[] = [100];
  for (let t = 1; t < N_HIST; t++) {
    const drift = 0.6;
    pts.push(pts[t - 1] * PHI + (1 - PHI) * (100 + t * drift) + gaussian(rng, 0, SIGMA));
  }
  return pts;
}

function buildForecast(last: number): { mean: number; lo80: number; hi80: number; lo95: number; hi95: number }[] {
  let val = last;
  let cumVar = 0;
  return Array.from({ length: N_FORE }, (_, h) => {
    val = val * PHI + (1 - PHI) * (100 + (N_HIST + h) * 0.6);
    cumVar += Math.pow(PHI, 2 * h) * SIGMA * SIGMA;
    const se = Math.sqrt(cumVar + SIGMA * SIGMA);
    return {
      mean: val,
      lo80: val - 1.28 * se,
      hi80: val + 1.28 * se,
      lo95: val - 1.96 * se,
      hi95: val + 1.96 * se,
    };
  });
}

export default function ARIMAForecastViz({ className }: { className?: string }) {
  const hist = buildHistory();
  const fore = buildForecast(hist[hist.length - 1]);
  const [horizon, setHorizon] = useState(N_FORE);

  const allVals = [
    ...hist,
    ...fore.slice(0, horizon).flatMap((f) => [f.lo95, f.hi95]),
  ];
  const yMin = Math.min(...allVals) - 5;
  const yMax = Math.max(...allVals) + 5;
  const totalT = N_HIST + N_FORE;

  const xS = scale(0, totalT - 1, ML, W - MR);
  const yS = scale(yMin, yMax, H - MB, MT);

  // Historical line
  const histPath = hist
    .map((v, i) => `${i === 0 ? "M" : "L"}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`)
    .join(" ");

  // Forecast mean line
  const forePath = fore
    .slice(0, horizon)
    .map((f, h) => `${h === 0 ? `M${xS(N_HIST - 1).toFixed(1)},${yS(hist[N_HIST - 1]).toFixed(1)} L` : "L"}${xS(N_HIST + h).toFixed(1)},${yS(f.mean).toFixed(1)}`)
    .join(" ");

  // 95% CI polygon
  const ci95Top = fore
    .slice(0, horizon)
    .map((f, h) => `${xS(N_HIST + h).toFixed(1)},${yS(f.hi95).toFixed(1)}`)
    .join(" ");
  const ci95Bot = fore
    .slice(0, horizon)
    .reverse()
    .map((f, h) => `${xS(N_HIST + (horizon - 1 - h)).toFixed(1)},${yS(f.lo95).toFixed(1)}`)
    .join(" ");

  // 80% CI polygon
  const ci80Top = fore
    .slice(0, horizon)
    .map((f, h) => `${xS(N_HIST + h).toFixed(1)},${yS(f.hi80).toFixed(1)}`)
    .join(" ");
  const ci80Bot = fore
    .slice(0, horizon)
    .reverse()
    .map((f, h) => `${xS(N_HIST + (horizon - 1 - h)).toFixed(1)},${yS(f.lo80).toFixed(1)}`)
    .join(" ");

  const sepX = xS(N_HIST - 0.5);

  // Y axis ticks
  const yTickStep = Math.ceil((yMax - yMin) / 5 / 10) * 10;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yTickStep) * yTickStep; v <= yMax; v += yTickStep) {
    yTicks.push(v);
  }

  return (
    <VizFrame
      title="ARIMA Forecast with Confidence Intervals"
      caption="Observed data (left) and multi-step ahead forecast (right). The dark band is the 80% prediction interval; the lighter band is 95%. Intervals widen as the forecast horizon increases because uncertainty compounds."
      className={className}
    >
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <VizButton onClick={() => setHorizon(Math.max(1, horizon - 1))} active={false}>
          ← Shorter
        </VizButton>
        <VizButton onClick={() => setHorizon(Math.min(N_FORE, horizon + 1))} active={false}>
          Longer →
        </VizButton>
        <VizButton onClick={() => setHorizon(N_FORE)} active={horizon === N_FORE}>
          Full 12-step
        </VizButton>
        <div className="ml-auto flex gap-4">
          <VizStat label="horizon" value={`${horizon} step${horizon > 1 ? "s" : ""}`} color={VIZ.teal} />
          <VizStat label="model" value="ARIMA(1,1,0)" />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="ARIMA forecast">
        {/* Background regions */}
        <rect x={ML} y={MT} width={sepX - ML} height={H - MT - MB}
          fill={VIZ.card} rx={3} opacity={0.5} />
        <rect x={sepX} y={MT} width={W - MR - sepX} height={H - MT - MB}
          fill="#14293a" rx={3} opacity={0.6} />

        {/* 95% CI band */}
        {horizon > 0 && (
          <polygon
            points={`${xS(N_HIST - 1).toFixed(1)},${yS(hist[N_HIST - 1]).toFixed(1)} ${ci95Top} ${ci95Bot}`}
            fill={VIZ.teal}
            opacity={0.12}
          />
        )}

        {/* 80% CI band */}
        {horizon > 0 && (
          <polygon
            points={`${xS(N_HIST - 1).toFixed(1)},${yS(hist[N_HIST - 1]).toFixed(1)} ${ci80Top} ${ci80Bot}`}
            fill={VIZ.teal}
            opacity={0.22}
          />
        )}

        {/* Historical line */}
        <path d={histPath} stroke={VIZ.teal} strokeWidth={2} fill="none" strokeLinejoin="round" />

        {/* Forecast mean line */}
        {horizon > 0 && (
          <path d={forePath} stroke={VIZ.brand} strokeWidth={2} fill="none"
            strokeLinejoin="round" strokeDasharray="6,3" />
        )}

        {/* Separator line */}
        <line x1={sepX} y1={MT} x2={sepX} y2={H - MB}
          stroke={VIZ.axis} strokeWidth={1} strokeDasharray="4,3" />

        {/* Labels on chart */}
        <text x={(ML + sepX) / 2} y={MT + 12} textAnchor="middle"
          fontSize={9} fill={VIZ.text}>
          Observed
        </text>
        {horizon > 0 && (
          <text x={(sepX + W - MR) / 2} y={MT + 12} textAnchor="middle"
            fontSize={9} fill={VIZ.text}>
            Forecast
          </text>
        )}

        {/* Y axis */}
        {yTicks.map((v) => (
          <g key={`yt-${v}`}>
            <line x1={ML - 4} y1={yS(v)} x2={W - MR} y2={yS(v)}
              stroke={VIZ.grid} strokeWidth={0.5} />
            <text x={ML - 6} y={yS(v) + 4} textAnchor="end" fontSize={9} fill={VIZ.text}>
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* X axis ticks */}
        {[0, 12, 24, 35].map((t) => (
          <text key={`xt-${t}`} x={xS(t)} y={H - MB + 14} textAnchor="middle"
            fontSize={9} fill={VIZ.text}>
            t={t + 1}
          </text>
        ))}
        {horizon > 0 && (
          <text x={xS(N_HIST + horizon - 1)} y={H - MB + 14} textAnchor="middle"
            fontSize={9} fill={VIZ.brand}>
            t={N_HIST + horizon}
          </text>
        )}

        {/* Legend */}
        <line x1={W - 130} y1={H - 14} x2={W - 116} y2={H - 14}
          stroke={VIZ.teal} strokeWidth={2} />
        <text x={W - 112} y={H - 10} fontSize={9} fill={VIZ.text}>observed</text>
        <line x1={W - 60} y1={H - 14} x2={W - 46} y2={H - 14}
          stroke={VIZ.brand} strokeWidth={2} strokeDasharray="4,2" />
        <text x={W - 42} y={H - 10} fontSize={9} fill={VIZ.text}>forecast</text>
      </svg>
    </VizFrame>
  );
}
