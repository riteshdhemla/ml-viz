"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Why gradients vanish or explode through time. Backprop multiplies the same
 * factor (weight × activation-derivative) once per timestep, so the gradient
 * reaching an early step scales like factorᵏ. Below 1 it decays to nothing;
 * above 1 it blows up.
 */

const W = 480;
const H = 260;
const M = { top: 16, right: 16, bottom: 32, left: 48 };
const T = 20;

export function VanishingGradientViz({ className }: { className?: string }) {
  const [factor, setFactor] = useState(0.7);

  // gradient magnitude reaching step t (t=0 earliest .. T-1 latest/output)
  // distance back from output = (T-1 - t); magnitude = factor^distance
  const mags = Array.from({ length: T }, (_, t) => Math.pow(factor, T - 1 - t));
  const exploding = factor > 1;
  const ratio = mags[T - 1] / (mags[0] || 1e-9); // latest / earliest

  // log scale for height to keep bars visible across orders of magnitude
  const logMin = -9;
  const logMax = Math.max(0, Math.log10(Math.max(...mags)));
  const sy = scale(logMin, logMax, H - M.bottom, M.top);
  const barW = (W - M.left - M.right) / T;

  const color = exploding ? VIZ.orange : factor < 0.95 ? VIZ.rose : VIZ.teal;

  return (
    <VizFrame
      className={className}
      title="Vanishing & exploding gradients through time"
      caption="Each timestep multiplies the gradient by the same factor (weight × activation slope). Reaching an early step means multiplying it ~20 times — factor < 1 vanishes toward zero, factor > 1 explodes. This is why long-range learning is hard, and why LSTMs/GRUs exist."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gradient magnitude across timesteps">
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <text x={(M.left + W - M.right) / 2} y={H - 6} fill={VIZ.text} fontSize={11} textAnchor="middle">timestep (← earlier · output →)</text>
        <text x={12} y={M.top + 40} fill={VIZ.text} fontSize={10} transform={`rotate(-90 12 ${M.top + 40})`}>grad magnitude (log)</text>

        {/* reference gridlines at powers of ten */}
        {[0, -3, -6, -9].map((p) => (
          <g key={p}>
            <line x1={M.left} y1={sy(p)} x2={W - M.right} y2={sy(p)} stroke={VIZ.grid} strokeWidth={0.5} opacity={0.5} strokeDasharray="2 3" />
            <text x={M.left - 4} y={sy(p) + 3} fill={VIZ.text} fontSize={9} textAnchor="end">1e{p}</text>
          </g>
        ))}

        {mags.map((m, t) => {
          const logv = Math.log10(Math.max(m, 1e-9));
          const y = sy(logv);
          return <rect key={t} x={M.left + t * barW + 1} y={y} width={barW - 2} height={H - M.bottom - y} fill={color} rx={1} opacity={0.85} />;
        })}
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="factor (weight × activation slope)" min={0.1} max={1.5} step={0.05} value={factor} onChange={setFactor} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="regime" value={exploding ? "exploding" : factor < 0.95 ? "vanishing" : "stable"} color={color} />
        <VizStat label="earliest grad" value={mags[0].toExponential(1)} color={color} />
        <VizStat label="ratio (latest/earliest)" value={ratio > 1e4 || ratio < 1e-4 ? ratio.toExponential(1) : ratio.toFixed(2)} color={VIZ.text} />
      </div>
    </VizFrame>
  );
}
