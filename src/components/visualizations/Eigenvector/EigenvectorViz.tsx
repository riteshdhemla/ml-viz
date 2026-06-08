"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Eigenvectors of a symmetric 2×2 matrix. Unit vectors around the circle (grey)
 * get mapped by M (blue) — most rotate, but along the eigenvector lines the
 * mapping only stretches by the eigenvalue λ (M·v = λv, no rotation). Symmetric
 * matrices always have real eigenvalues and perpendicular eigenvectors.
 */

const W = 380;
const H = 380;
const DOM: [number, number] = [-3, 3];
const N = 16;

export function EigenvectorViz({ className }: { className?: string }) {
  const [a, setA] = useState(2);
  const [b, setB] = useState(0.8);
  const [d, setD] = useState(1);

  const sx = scale(DOM[0], DOM[1], 12, W - 12);
  const sy = scale(DOM[0], DOM[1], H - 12, 12);

  const { l1, l2, v1, v2 } = useMemo(() => {
    const T = a + d;
    const D = a * d - b * b;
    const disc = Math.sqrt(Math.max(0, T * T - 4 * D));
    const e1 = (T + disc) / 2;
    const e2 = (T - disc) / 2;
    // eigenvector for eigenvalue e: (a-e)x + b y = 0  →  dir (b, e-a); if b≈0, axis-aligned
    const evec = (e: number): [number, number] => {
      if (Math.abs(b) < 1e-6) {
        // diagonal: eigenvectors are the axes; e matches a → x-axis, else y-axis
        return Math.abs(e - a) < Math.abs(e - d) ? [1, 0] : [0, 1];
      }
      const x = b;
      const y = e - a;
      const n = Math.hypot(x, y);
      return [x / n, y / n];
    };
    return { l1: e1, l2: e2, v1: evec(e1), v2: evec(e2) };
  }, [a, b, d]);

  const tf = (x: number, y: number): [number, number] => [a * x + b * y, b * x + d * y];

  const circleVecs = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * 2 * Math.PI;
    return [Math.cos(ang), Math.sin(ang)] as [number, number];
  });

  const eigenLine = (v: [number, number]) => ({
    x1: sx(-3 * v[0]),
    y1: sy(-3 * v[1]),
    x2: sx(3 * v[0]),
    y2: sy(3 * v[1]),
  });

  return (
    <VizFrame
      className={className}
      title="Eigenvectors: the directions a matrix only stretches"
      caption="Grey = unit vectors, blue = where M sends them. Most directions rotate. Along the bold eigenvector lines, M·v stays on the line — it only scales by the eigenvalue λ. Symmetric matrices have perpendicular eigenvectors."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto block" role="img" aria-label="Eigenvectors of a symmetric matrix">
        {/* axes + unit circle */}
        <line x1={sx(DOM[0])} y1={sy(0)} x2={sx(DOM[1])} y2={sy(0)} stroke={VIZ.axis} strokeWidth={0.7} />
        <line x1={sx(0)} y1={sy(DOM[0])} x2={sx(0)} y2={sy(DOM[1])} stroke={VIZ.axis} strokeWidth={0.7} />
        <circle cx={sx(0)} cy={sy(0)} r={sx(1) - sx(0)} fill="none" stroke={VIZ.grid} strokeWidth={1} strokeDasharray="3 3" />

        {/* eigenlines */}
        {[v1, v2].map((v, i) => {
          const l = eigenLine(v);
          return <line key={`el${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={i === 0 ? VIZ.yellow : VIZ.orange} strokeWidth={2} opacity={0.7} />;
        })}

        {/* unit vectors and their images */}
        {circleVecs.map((v, i) => {
          const [tx, ty] = tf(v[0], v[1]);
          return (
            <g key={i}>
              <line x1={sx(0)} y1={sy(0)} x2={sx(v[0])} y2={sy(v[1])} stroke={VIZ.text} strokeWidth={0.6} opacity={0.35} />
              <line x1={sx(0)} y1={sy(0)} x2={sx(tx)} y2={sy(ty)} stroke={VIZ.brandLight} strokeWidth={1} opacity={0.7} />
            </g>
          );
        })}

        {/* eigenvectors scaled by lambda */}
        {([[v1, l1, VIZ.yellow], [v2, l2, VIZ.orange]] as const).map(([v, lam, col], i) => {
          const [tx, ty] = [v[0] * lam, v[1] * lam];
          return (
            <g key={`ev${i}`}>
              <line x1={sx(0)} y1={sy(0)} x2={sx(tx)} y2={sy(ty)} stroke={col} strokeWidth={3} />
              <circle cx={sx(tx)} cy={sy(ty)} r={4} fill={col} />
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
        <VizSlider label="a" min={-2} max={2} step={0.1} value={a} onChange={setA} format={(v) => v.toFixed(1)} />
        <VizSlider label="b (=off-diag)" min={-2} max={2} step={0.1} value={b} onChange={setB} format={(v) => v.toFixed(1)} />
        <VizSlider label="d" min={-2} max={2} step={0.1} value={d} onChange={setD} format={(v) => v.toFixed(1)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="λ₁" value={l1.toFixed(2)} color={VIZ.yellow} />
        <VizStat label="λ₂" value={l2.toFixed(2)} color={VIZ.orange} />
      </div>
    </VizFrame>
  );
}
