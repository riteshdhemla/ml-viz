"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Two 2D vectors from the origin, controlled by sliders. Shows their sum
 * (parallelogram rule), the projection of b onto a, and the dot product /
 * angle between them — the geometric meaning of a·b = |a||b|cosθ.
 */

const W = 420;
const H = 360;
const DOM: [number, number] = [-5, 5];

function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2.5,
  dashed = false
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 10;
  const a1 = angle - Math.PI / 7;
  const a2 = angle + Math.PI / 7;
  return (
    <g stroke={color} fill={color}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={width}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      <path
        d={`M${x2},${y2} L${x2 - head * Math.cos(a1)},${y2 - head * Math.sin(a1)} L${x2 - head * Math.cos(a2)},${y2 - head * Math.sin(a2)} Z`}
        stroke="none"
      />
    </g>
  );
}

export function VectorViz({ className }: { className?: string }) {
  const [ax, setAx] = useState(3);
  const [ay, setAy] = useState(1);
  const [bx, setBx] = useState(1);
  const [by, setBy] = useState(2.5);

  const sx = scale(DOM[0], DOM[1], 10, W - 10);
  const sy = scale(DOM[0], DOM[1], H - 10, 10);
  const ox = sx(0);
  const oy = sy(0);

  const dot = ax * bx + ay * by;
  const magA = Math.hypot(ax, ay);
  const magB = Math.hypot(bx, by);
  const angle = magA > 0 && magB > 0 ? (Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * 180) / Math.PI : 0;

  // projection of b onto a: (a·b / |a|²) · a
  const k = magA > 0 ? dot / (magA * magA) : 0;
  const projX = k * ax;
  const projY = k * ay;

  return (
    <VizFrame
      className={className}
      title="Vectors and the dot product"
      caption="The dot product a·b = |a||b|cos θ. It's zero when the vectors are perpendicular (θ = 90°), positive when they point similarly, negative when opposed. The faint segment is b projected onto a."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="Two vectors and their dot product">
        {/* axes */}
        <line x1={sx(DOM[0])} y1={oy} x2={sx(DOM[1])} y2={oy} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={ox} y1={sy(DOM[0])} x2={ox} y2={sy(DOM[1])} stroke={VIZ.axis} strokeWidth={1} />

        {/* parallelogram */}
        <path
          d={`M${ox},${oy} L${sx(ax)},${sy(ay)} L${sx(ax + bx)},${sy(ay + by)} L${sx(bx)},${sy(by)} Z`}
          fill={VIZ.brand}
          opacity={0.08}
          stroke={VIZ.grid}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* projection of b onto a */}
        <line x1={ox} y1={oy} x2={sx(projX)} y2={sy(projY)} stroke={VIZ.yellow} strokeWidth={4} opacity={0.5} />
        <line x1={sx(bx)} y1={sy(by)} x2={sx(projX)} y2={sy(projY)} stroke={VIZ.text} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />

        {/* a + b */}
        {arrow(ox, oy, sx(ax + bx), sy(ay + by), VIZ.orange, 2, true)}

        {/* a and b */}
        {arrow(ox, oy, sx(ax), sy(ay), VIZ.brand)}
        {arrow(ox, oy, sx(bx), sy(by), VIZ.teal)}

        <text x={sx(ax)} y={sy(ay) - 8} fill={VIZ.brand} fontSize={13} fontWeight="bold">a</text>
        <text x={sx(bx)} y={sy(by) - 8} fill={VIZ.teal} fontSize={13} fontWeight="bold">b</text>
        <text x={sx(ax + bx) + 6} y={sy(ay + by)} fill={VIZ.orange} fontSize={12}>a+b</text>
      </svg>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 mb-3">
        <VizSlider label="aₓ" min={-4} max={4} step={0.1} value={ax} onChange={setAx} format={(v) => v.toFixed(1)} />
        <VizSlider label="aᵧ" min={-4} max={4} step={0.1} value={ay} onChange={setAy} format={(v) => v.toFixed(1)} />
        <VizSlider label="bₓ" min={-4} max={4} step={0.1} value={bx} onChange={setBx} format={(v) => v.toFixed(1)} />
        <VizSlider label="bᵧ" min={-4} max={4} step={0.1} value={by} onChange={setBy} format={(v) => v.toFixed(1)} />
      </div>

      <div className="flex gap-5 flex-wrap">
        <VizStat label="a · b" value={dot.toFixed(2)} color={dot > 0 ? VIZ.teal : dot < 0 ? VIZ.rose : VIZ.text} />
        <VizStat label="|a|" value={magA.toFixed(2)} color={VIZ.brand} />
        <VizStat label="|b|" value={magB.toFixed(2)} color={VIZ.teal} />
        <VizStat label="angle θ" value={`${angle.toFixed(0)}°`} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
