"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Bayesian updating with a Beta-Bernoulli model. A Beta(α, β) prior over a
 * coin's bias θ becomes Beta(α+heads, β+tails) after observing flips — the
 * posterior sharpens as data accumulates. Densities are normalized numerically
 * on a grid (no gamma function needed).
 */

const W = 480;
const H = 280;
const M = { top: 14, right: 14, bottom: 28, left: 40 };
const GRID = 200;

// unnormalized beta density θ^(a-1)(1-θ)^(b-1), normalized on the grid
function betaCurve(a: number, b: number) {
  const ys: number[] = [];
  let sum = 0;
  const dt = 1 / GRID;
  for (let i = 0; i <= GRID; i++) {
    const th = i / GRID;
    // guard endpoints to avoid 0^negative
    const t = Math.min(1 - 1e-6, Math.max(1e-6, th));
    const v = Math.pow(t, a - 1) * Math.pow(1 - t, b - 1);
    ys.push(v);
    sum += v * dt;
  }
  return ys.map((v) => v / sum);
}

export function BayesViz({ className }: { className?: string }) {
  const [alpha, setAlpha] = useState(2);
  const [beta, setBeta] = useState(2);
  const [heads, setHeads] = useState(0);
  const [tails, setTails] = useState(0);

  const pa = alpha + heads;
  const pb = beta + tails;

  const { prior, post, ymax } = useMemo(() => {
    const prior = betaCurve(alpha, beta);
    const post = betaCurve(pa, pb);
    const ymax = Math.max(...prior, ...post) * 1.1;
    return { prior, post, ymax };
  }, [alpha, beta, pa, pb]);

  const sx = scale(0, 1, M.left, W - M.right);
  const sy = scale(0, ymax, H - M.bottom, M.top);
  const toPath = (ys: number[]) => `M${ys.map((y, i) => `${sx(i / GRID)},${sy(y)}`).join("L")}`;

  const postMean = pa / (pa + pb);
  const postMap = pa > 1 && pb > 1 ? (pa - 1) / (pa + pb - 2) : postMean;

  return (
    <VizFrame
      className={className}
      title="Bayesian updating: Beta-Bernoulli"
      caption="The prior (faint) encodes belief about a coin's bias θ before data. Each observed flip updates it to the posterior (bold) = Beta(α+heads, β+tails). More data → a sharper, more confident posterior."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Beta prior and posterior">
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <text x={(M.left + W - M.right) / 2} y={H - 6} fill={VIZ.text} fontSize={11} textAnchor="middle">bias θ (0 → 1)</text>
        <text x={M.left + 6} y={M.top + 10} fill={VIZ.text} fontSize={11}>density</text>

        {/* prior */}
        <path d={toPath(prior)} fill="none" stroke={VIZ.brandLight} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
        {/* posterior */}
        <path d={`${toPath(post)}L${sx(1)},${sy(0)}L${sx(0)},${sy(0)}Z`} fill={VIZ.brand} opacity={0.15} />
        <path d={toPath(post)} fill="none" stroke={VIZ.brand} strokeWidth={2.5} />
        {/* posterior mean */}
        <line x1={sx(postMean)} y1={M.top} x2={sx(postMean)} y2={H - M.bottom} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      </svg>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 mb-3">
        <VizSlider label="prior α" min={0.5} max={10} step={0.5} value={alpha} onChange={setAlpha} format={(v) => v.toFixed(1)} />
        <VizSlider label="prior β" min={0.5} max={10} step={0.5} value={beta} onChange={setBeta} format={(v) => v.toFixed(1)} />
        <VizSlider label="heads" min={0} max={30} step={1} value={heads} onChange={setHeads} format={(v) => String(v)} />
        <VizSlider label="tails" min={0} max={30} step={1} value={tails} onChange={setTails} format={(v) => String(v)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="posterior" value={`Beta(${pa.toFixed(1)}, ${pb.toFixed(1)})`} color={VIZ.brand} />
        <VizStat label="post. mean" value={postMean.toFixed(3)} color={VIZ.yellow} />
        <VizStat label="MAP" value={postMap.toFixed(3)} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
