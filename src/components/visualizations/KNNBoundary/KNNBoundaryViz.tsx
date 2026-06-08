"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * k-Nearest-Neighbors decision regions. The background is coloured by the
 * majority vote of the k nearest training points. Small k → jagged, noise-
 * sensitive boundaries; large k → smoother but blurrier ones.
 */

const W = 340;
const H = 340;
const DOM: [number, number] = [-3, 3];
const RES = 34; // background grid resolution

const DATA = (() => {
  const rng = seededRandom(17);
  const pts: { x: number; y: number; label: number }[] = [];
  for (let i = 0; i < 18; i++) pts.push({ x: gaussian(rng, -1.1, 0.85), y: gaussian(rng, -0.7, 0.85), label: 0 });
  for (let i = 0; i < 18; i++) pts.push({ x: gaussian(rng, 1.1, 0.85), y: gaussian(rng, 0.7, 0.85), label: 1 });
  // a couple of deliberate "noise" points to make small-k jaggedness visible
  pts.push({ x: -0.6, y: 1.2, label: 0 });
  pts.push({ x: 0.7, y: -1.3, label: 1 });
  return pts;
})();

function classify(x: number, y: number, k: number) {
  const d = DATA.map((p) => ({ label: p.label, dist: (p.x - x) ** 2 + (p.y - y) ** 2 }));
  d.sort((a, b) => a.dist - b.dist);
  let ones = 0;
  for (let i = 0; i < k; i++) ones += d[i].label;
  return ones * 2 > k ? 1 : 0;
}

export function KNNBoundaryViz({ className }: { className?: string }) {
  const [k, setK] = useState(1);

  const sx = scale(DOM[0], DOM[1], 0, W);
  const sy = scale(DOM[0], DOM[1], H, 0);
  const cw = W / RES;

  const grid = useMemo(() => {
    const cells: { i: number; j: number; label: number }[] = [];
    for (let i = 0; i < RES; i++) {
      for (let j = 0; j < RES; j++) {
        const x = DOM[0] + ((i + 0.5) / RES) * (DOM[1] - DOM[0]);
        const y = DOM[0] + ((j + 0.5) / RES) * (DOM[1] - DOM[0]);
        cells.push({ i, j, label: classify(x, y, k) });
      }
    }
    return cells;
  }, [k]);

  // training accuracy (leave-self-in for simplicity of illustration)
  const acc = useMemo(() => {
    let ok = 0;
    for (const p of DATA) if (classify(p.x, p.y, k) === p.label) ok++;
    return (ok / DATA.length) * 100;
  }, [k]);

  return (
    <VizFrame
      className={className}
      title="k-NN decision boundary"
      caption="Every background cell is labelled by majority vote of its k nearest training points. k=1 fits every point (even noise) with a jagged boundary; larger k averages over neighbours and smooths it."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto block" role="img" aria-label="k-NN regions">
        {grid.map((c, idx) => (
          <rect key={idx} x={c.i * cw} y={H - (c.j + 1) * cw} width={cw + 0.5} height={cw + 0.5} fill={c.label === 1 ? VIZ.brand : VIZ.teal} opacity={0.18} />
        ))}
        {DATA.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={5} fill={p.label === 1 ? VIZ.brand : VIZ.teal} stroke="#0f1117" strokeWidth={1} />
        ))}
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="k (neighbors)" min={1} max={15} step={2} value={k} onChange={setK} format={(v) => String(v)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="k" value={String(k)} color={VIZ.yellow} />
        <VizStat label="fit accuracy" value={`${acc.toFixed(0)}%`} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
