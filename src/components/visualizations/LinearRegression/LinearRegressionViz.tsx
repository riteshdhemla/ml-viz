"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom, gaussian, useAnimationLoop } from "../viz-kit";

/**
 * Interactive least-squares fit. Drag slope/intercept to move the line; vertical
 * red segments are the residuals and the MSE updates live. "Fit (OLS)" animates
 * the line to the closed-form optimum, so the minimum-MSE solution is felt, not
 * just stated.
 */

const W = 480;
const H = 300;
const M = { top: 16, right: 16, bottom: 30, left: 40 };
const XD: [number, number] = [0, 10];
const YD: [number, number] = [0, 10];

// deterministic data: y ≈ 0.7x + 1.5 + noise
const TRUE_W = 0.7;
const TRUE_B = 1.5;
const DATA = (() => {
  const rng = seededRandom(7);
  return Array.from({ length: 14 }, () => {
    const x = rng() * 9 + 0.5;
    const y = TRUE_W * x + TRUE_B + gaussian(rng, 0, 0.9);
    return { x, y: Math.max(0.2, Math.min(9.8, y)) };
  });
})();

// closed-form OLS
const OLS = (() => {
  const n = DATA.length;
  const mx = DATA.reduce((s, p) => s + p.x, 0) / n;
  const my = DATA.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of DATA) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  const w = num / den;
  return { w, b: my - w * mx };
})();

function mse(w: number, b: number) {
  return DATA.reduce((s, p) => s + (p.y - (w * p.x + b)) ** 2, 0) / DATA.length;
}

export function LinearRegressionViz({ className }: { className?: string }) {
  const [w, setW] = useState(0.2);
  const [b, setB] = useState(4);
  const target = useRef<{ w: number; b: number } | null>(null);

  const sx = scale(XD[0], XD[1], M.left, W - M.right);
  const sy = scale(YD[0], YD[1], H - M.bottom, M.top);

  useAnimationLoop((dt) => {
    if (!target.current) return;
    const t = Math.min(1, dt * 4);
    setW((cw) => cw + (target.current!.w - cw) * t);
    setB((cb) => cb + (target.current!.b - cb) * t);
    if (Math.abs(w - target.current.w) < 0.005 && Math.abs(b - target.current.b) < 0.005) {
      setW(target.current.w);
      setB(target.current.b);
      target.current = null;
    }
  }, target.current !== null);

  const line = useMemo(() => {
    const y0 = w * XD[0] + b;
    const y1 = w * XD[1] + b;
    return { x0: sx(XD[0]), y0: sy(y0), x1: sx(XD[1]), y1: sy(y1) };
  }, [w, b, sx, sy]);

  const currentMse = mse(w, b);
  const minMse = mse(OLS.w, OLS.b);

  return (
    <VizFrame
      className={className}
      title="Least squares: minimise the residuals"
      caption="MSE is the mean of the squared red segments. No setting of slope/intercept beats the OLS solution — that's what 'least squares' means."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Linear regression fit">
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <text x={W / 2} y={H - 6} fill={VIZ.text} fontSize={11} textAnchor="middle">x</text>
        <text x={10} y={M.top + 6} fill={VIZ.text} fontSize={11}>y</text>

        {/* residuals */}
        {DATA.map((p, i) => (
          <line key={`r${i}`} x1={sx(p.x)} y1={sy(p.y)} x2={sx(p.x)} y2={sy(w * p.x + b)} stroke={VIZ.rose} strokeWidth={1.5} opacity={0.55} />
        ))}

        {/* fit line */}
        <line x1={line.x0} y1={line.y0} x2={line.x1} y2={line.y1} stroke={VIZ.brand} strokeWidth={2.5} />

        {/* points */}
        {DATA.map((p, i) => (
          <circle key={`p${i}`} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={VIZ.teal} stroke="#0f1117" strokeWidth={1} />
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
        <VizSlider label="slope w" min={-1} max={2} step={0.01} value={w} onChange={(v) => { target.current = null; setW(v); }} format={(v) => v.toFixed(2)} />
        <VizSlider label="intercept b" min={0} max={8} step={0.05} value={b} onChange={(v) => { target.current = null; setB(v); }} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex items-center gap-4">
        <VizButton onClick={() => { target.current = { w: OLS.w, b: OLS.b }; }}>Fit (OLS)</VizButton>
        <div className="flex gap-5 ml-auto">
          <VizStat label="MSE" value={currentMse.toFixed(3)} color={currentMse <= minMse + 0.01 ? VIZ.teal : VIZ.rose} />
          <VizStat label="min MSE" value={minMse.toFixed(3)} color={VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
