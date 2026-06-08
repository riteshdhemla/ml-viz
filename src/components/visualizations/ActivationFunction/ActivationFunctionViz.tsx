"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Interactive activation functions. Pick ReLU / sigmoid / tanh / leaky-ReLU /
 * linear, then drag the input z to see the output y = f(z) and the slope f'(z).
 * Mirrors the "interactive activation functions" demo on ml-visualized.com but
 * native to the lesson.
 */

const W = 480;
const H = 280;
const M = { top: 16, right: 16, bottom: 28, left: 36 };
const XD: [number, number] = [-6, 6];
const YD: [number, number] = [-1.5, 6];

type Fn = { name: string; f: (z: number) => number; d: (z: number) => number };

const FNS: Record<string, Fn> = {
  relu: { name: "ReLU", f: (z) => Math.max(0, z), d: (z) => (z > 0 ? 1 : 0) },
  sigmoid: {
    name: "Sigmoid",
    f: (z) => 1 / (1 + Math.exp(-z)),
    d: (z) => {
      const s = 1 / (1 + Math.exp(-z));
      return s * (1 - s);
    },
  },
  tanh: { name: "Tanh", f: (z) => Math.tanh(z), d: (z) => 1 - Math.tanh(z) ** 2 },
  leaky: { name: "Leaky ReLU", f: (z) => (z > 0 ? z : 0.1 * z), d: (z) => (z > 0 ? 1 : 0.1) },
  linear: { name: "Linear", f: (z) => z, d: () => 1 },
};

export function ActivationFunctionViz({ className }: { className?: string }) {
  const [key, setKey] = useState<keyof typeof FNS>("relu");
  const [z, setZ] = useState(1.5);

  const fn = FNS[key];
  const sx = scale(XD[0], XD[1], M.left, W - M.right);
  const sy = scale(YD[0], YD[1], H - M.bottom, M.top);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = XD[0] + (i / 120) * (XD[1] - XD[0]);
      const y = Math.max(YD[0], Math.min(YD[1], fn.f(x)));
      pts.push(`${sx(x)},${sy(y)}`);
    }
    return `M${pts.join("L")}`;
  }, [fn, sx, sy]);

  const y = fn.f(z);
  const slope = fn.d(z);
  // tangent line segment around z
  const tx0 = z - 1.5;
  const tx1 = z + 1.5;
  const ty0 = y + slope * (tx0 - z);
  const ty1 = y + slope * (tx1 - z);

  return (
    <VizFrame
      className={className}
      title="Activation functions f(z)"
      caption="The dashed line is the slope f′(z) at the marker — notice how sigmoid and tanh flatten (gradient → 0) at the extremes, while ReLU keeps a slope of 1 for positive z."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(FNS).map(([k, v]) => (
          <VizButton key={k} onClick={() => setKey(k as keyof typeof FNS)} active={k === key}>
            {v.name}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${fn.name} activation`}>
        {/* zero axes */}
        <line x1={M.left} y1={sy(0)} x2={W - M.right} y2={sy(0)} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={sx(0)} y1={M.top} x2={sx(0)} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <text x={W - M.right} y={sy(0) - 6} fill={VIZ.text} fontSize={11} textAnchor="end">z</text>

        {/* tangent (slope) */}
        <line
          x1={sx(tx0)}
          y1={sy(Math.max(YD[0], Math.min(YD[1], ty0)))}
          x2={sx(tx1)}
          y2={sy(Math.max(YD[0], Math.min(YD[1], ty1)))}
          stroke={VIZ.yellow}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />

        {/* activation curve */}
        <path d={curve} fill="none" stroke={VIZ.brand} strokeWidth={2.5} />

        {/* marker */}
        <line x1={sx(z)} y1={sy(0)} x2={sx(z)} y2={sy(Math.max(YD[0], Math.min(YD[1], y)))} stroke={VIZ.text} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={sx(z)} cy={sy(Math.max(YD[0], Math.min(YD[1], y)))} r={6} fill={VIZ.orange} stroke="#fff" strokeWidth={1.5} />
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="input z" min={-6} max={6} step={0.1} value={z} onChange={setZ} format={(v) => v.toFixed(1)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="input z" value={z.toFixed(2)} />
        <VizStat label="output f(z)" value={y.toFixed(3)} color={VIZ.brand} />
        <VizStat label="slope f′(z)" value={slope.toFixed(3)} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
