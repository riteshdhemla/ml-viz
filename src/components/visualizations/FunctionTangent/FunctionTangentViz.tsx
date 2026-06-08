"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * The derivative as the slope of the tangent. Pick a function, drag the point
 * x₀, and the tangent line + slope readout update live. This is the geometric
 * meaning behind every gradient step in ML.
 */

const W = 480;
const H = 300;
const M = { top: 16, right: 16, bottom: 28, left: 36 };
const XD: [number, number] = [-4, 4];
const YD: [number, number] = [-4, 6];

type Fn = { name: string; f: (x: number) => number; d: (x: number) => number };
const FNS: Record<string, Fn> = {
  sq: { name: "x²", f: (x) => x * x, d: (x) => 2 * x },
  sin: { name: "sin x", f: (x) => Math.sin(x), d: (x) => Math.cos(x) },
  cubic: { name: "x³−3x", f: (x) => x ** 3 - 3 * x, d: (x) => 3 * x * x - 3 },
  exp: { name: "eˣ", f: (x) => Math.exp(x), d: (x) => Math.exp(x) },
};

const clampY = (y: number) => Math.max(YD[0], Math.min(YD[1], y));

export function FunctionTangentViz({ className }: { className?: string }) {
  const [key, setKey] = useState<keyof typeof FNS>("sq");
  const [x0, setX0] = useState(1.2);

  const fn = FNS[key];
  const sx = scale(XD[0], XD[1], M.left, W - M.right);
  const sy = scale(YD[0], YD[1], H - M.bottom, M.top);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = XD[0] + (i / 160) * (XD[1] - XD[0]);
      pts.push(`${sx(x)},${sy(clampY(fn.f(x)))}`);
    }
    return `M${pts.join("L")}`;
  }, [fn, sx, sy]);

  const y0 = fn.f(x0);
  const slope = fn.d(x0);
  const tx0 = x0 - 2;
  const tx1 = x0 + 2;
  const ty0 = y0 + slope * (tx0 - x0);
  const ty1 = y0 + slope * (tx1 - x0);

  return (
    <VizFrame
      className={className}
      title="The derivative is the slope of the tangent"
      caption="f′(x₀) measures how fast f changes at x₀ — the slope of the yellow tangent line. Gradient descent uses exactly this slope to decide which way is downhill."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(FNS).map(([k, v]) => (
          <VizButton key={k} onClick={() => setKey(k as keyof typeof FNS)} active={k === key}>
            {v.name}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Tangent to ${fn.name}`}>
        <line x1={M.left} y1={sy(0)} x2={W - M.right} y2={sy(0)} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={sx(0)} y1={M.top} x2={sx(0)} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />

        {/* tangent */}
        <line x1={sx(tx0)} y1={sy(clampY(ty0))} x2={sx(tx1)} y2={sy(clampY(ty1))} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
        {/* curve */}
        <path d={curve} fill="none" stroke={VIZ.brand} strokeWidth={2.5} />
        {/* marker */}
        <line x1={sx(x0)} y1={sy(0)} x2={sx(x0)} y2={sy(clampY(y0))} stroke={VIZ.text} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={sx(x0)} cy={sy(clampY(y0))} r={6} fill={VIZ.orange} stroke="#fff" strokeWidth={1.5} />
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="point x₀" min={-4} max={4} step={0.05} value={x0} onChange={setX0} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="x₀" value={x0.toFixed(2)} />
        <VizStat label="f(x₀)" value={y0.toFixed(3)} color={VIZ.brand} />
        <VizStat label="f′(x₀) slope" value={slope.toFixed(3)} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
