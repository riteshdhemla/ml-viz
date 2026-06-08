"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, useAnimationLoop, scale } from "../viz-kit";

/**
 * A 2×2 matrix as a linear transformation of 2D space. Four sliders set the
 * matrix; the original grid + unit square (faint) deform into the transformed
 * grid + square (bright). The columns are where the basis vectors î, ĵ land,
 * and the determinant is the signed area scaling factor.
 */

const W = 380;
const H = 380;
const DOM: [number, number] = [-3, 3];
const GRID = [-2, -1, 0, 1, 2];

export function MatrixTransformViz({ className }: { className?: string }) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [d, setD] = useState(1);
  // morph factor 0 = identity, 1 = full matrix (for the Apply animation)
  const [t, setT] = useState(1);
  const target = useRef<number | null>(null);

  const sx = scale(DOM[0], DOM[1], 10, W - 10);
  const sy = scale(DOM[0], DOM[1], H - 10, 10);

  useAnimationLoop((dt) => {
    if (target.current === null) return;
    const goal = target.current;
    setT((cur) => {
      const nt = cur + (goal - cur) * Math.min(1, dt * 4);
      if (Math.abs(goal - nt) < 0.01) {
        target.current = null;
        return goal;
      }
      return nt;
    });
  }, target.current !== null);

  // interpolate between identity and M by factor t
  const m = useMemo(() => {
    const ia = 1 + (a - 1) * t;
    const ib = b * t;
    const ic = c * t;
    const id = 1 + (d - 1) * t;
    return { a: ia, b: ib, c: ic, d: id };
  }, [a, b, c, d, t]);

  const tf = (x: number, y: number): [number, number] => [m.a * x + m.b * y, m.c * x + m.d * y];
  const det = a * d - b * c;

  const transformedGrid: string[] = [];
  for (const g of GRID) {
    const [x0, y0] = tf(g, DOM[0]);
    const [x1, y1] = tf(g, DOM[1]);
    transformedGrid.push(`M${sx(x0)},${sy(y0)} L${sx(x1)},${sy(y1)}`);
    const [x2, y2] = tf(DOM[0], g);
    const [x3, y3] = tf(DOM[1], g);
    transformedGrid.push(`M${sx(x2)},${sy(y2)} L${sx(x3)},${sy(y3)}`);
  }

  const sq = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const sqPath = `M${sq.map(([x, y]) => { const [tx, ty] = tf(x, y); return `${sx(tx)},${sy(ty)}`; }).join("L")}Z`;

  const [ihx, ihy] = tf(1, 0);
  const [jhx, jhy] = tf(0, 1);

  return (
    <VizFrame
      className={className}
      title="A matrix transforms space"
      caption="Each matrix column shows where a basis vector lands: î → (a, c), ĵ → (b, d). The determinant is the area-scaling factor — negative means space was flipped, zero means it was squashed to a line."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto block" role="img" aria-label="Matrix transformation of a grid">
        {/* original faint grid */}
        {GRID.map((g) => (
          <g key={`o${g}`} stroke={VIZ.grid} strokeWidth={0.5} opacity={0.4}>
            <line x1={sx(g)} y1={sy(DOM[0])} x2={sx(g)} y2={sy(DOM[1])} />
            <line x1={sx(DOM[0])} y1={sy(g)} x2={sx(DOM[1])} y2={sy(g)} />
          </g>
        ))}
        <path d={`M${sq.map(([x, y]) => `${sx(x)},${sy(y)}`).join("L")}Z`} fill="none" stroke={VIZ.grid} strokeWidth={1} strokeDasharray="3 3" />

        {/* transformed grid */}
        {transformedGrid.map((p, i) => (
          <path key={i} d={p} stroke={VIZ.brand} strokeWidth={0.6} opacity={0.35} fill="none" />
        ))}
        <path d={sqPath} fill={VIZ.brand} opacity={0.15} stroke={VIZ.brand} strokeWidth={1.5} />

        {/* basis vectors */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(ihx)} y2={sy(ihy)} stroke={VIZ.teal} strokeWidth={3} />
        <line x1={sx(0)} y1={sy(0)} x2={sx(jhx)} y2={sy(jhy)} stroke={VIZ.orange} strokeWidth={3} />
        <text x={sx(ihx) + 4} y={sy(ihy)} fill={VIZ.teal} fontSize={12} fontWeight="bold">î</text>
        <text x={sx(jhx) + 4} y={sy(jhy)} fill={VIZ.orange} fontSize={12} fontWeight="bold">ĵ</text>
      </svg>

      <div className="grid grid-cols-4 gap-3 mt-3 mb-3">
        <VizSlider label="a" min={-2} max={2} step={0.1} value={a} onChange={(v) => { target.current = null; setT(1); setA(v); }} format={(v) => v.toFixed(1)} />
        <VizSlider label="b" min={-2} max={2} step={0.1} value={b} onChange={(v) => { target.current = null; setT(1); setB(v); }} format={(v) => v.toFixed(1)} />
        <VizSlider label="c" min={-2} max={2} step={0.1} value={c} onChange={(v) => { target.current = null; setT(1); setC(v); }} format={(v) => v.toFixed(1)} />
        <VizSlider label="d" min={-2} max={2} step={0.1} value={d} onChange={(v) => { target.current = null; setT(1); setD(v); }} format={(v) => v.toFixed(1)} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <VizButton onClick={() => { setT(0); target.current = 1; }}>Animate</VizButton>
          <VizButton onClick={() => { target.current = null; setA(1); setB(0); setC(0); setD(1); setT(1); }}>Identity</VizButton>
        </div>
        <div className="ml-auto">
          <VizStat label="det (area scale)" value={det.toFixed(2)} color={det < 0 ? VIZ.rose : Math.abs(det) < 0.05 ? VIZ.yellow : VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
