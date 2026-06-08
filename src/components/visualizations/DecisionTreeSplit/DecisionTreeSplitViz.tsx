"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom, gaussian, useAnimationLoop } from "../viz-kit";

/**
 * How a decision tree chooses a split. Points of two classes lie on a line;
 * move the threshold and watch the weighted impurity (Gini or entropy) of the
 * resulting two groups. The best split is the threshold that minimizes it.
 */

const W = 480;
const H = 220;
const M = { left: 30, right: 30, top: 20, bottom: 40 };
const XD: [number, number] = [0, 10];

const DATA = (() => {
  const rng = seededRandom(8);
  const pts: { x: number; label: number }[] = [];
  for (let i = 0; i < 12; i++) pts.push({ x: Math.max(0.2, Math.min(9.8, gaussian(rng, 3, 1.2))), label: 0 });
  for (let i = 0; i < 12; i++) pts.push({ x: Math.max(0.2, Math.min(9.8, gaussian(rng, 7, 1.2))), label: 1 });
  return pts;
})();

function impurity(labels: number[], metric: "gini" | "entropy") {
  const n = labels.length;
  if (n === 0) return 0;
  const p1 = labels.reduce((s, l) => s + l, 0) / n;
  const p0 = 1 - p1;
  if (metric === "gini") return 1 - p0 * p0 - p1 * p1;
  const h = (p: number) => (p <= 0 ? 0 : -p * Math.log2(p));
  return h(p0) + h(p1);
}

function weightedImpurity(t: number, metric: "gini" | "entropy") {
  const left = DATA.filter((p) => p.x <= t).map((p) => p.label);
  const right = DATA.filter((p) => p.x > t).map((p) => p.label);
  const n = DATA.length;
  return (left.length / n) * impurity(left, metric) + (right.length / n) * impurity(right, metric);
}

export function DecisionTreeSplitViz({ className }: { className?: string }) {
  const [t, setT] = useState(5);
  const [metric, setMetric] = useState<"gini" | "entropy">("gini");
  const target = useRef<number | null>(null);

  useAnimationLoop((dt) => {
    if (target.current === null) return;
    const goal = target.current;
    setT((cur) => {
      const nt = cur + (goal - cur) * Math.min(1, dt * 4);
      if (Math.abs(goal - nt) < 0.02) { target.current = null; return goal; }
      return nt;
    });
  }, target.current !== null);

  const sx = scale(XD[0], XD[1], M.left, W - M.right);
  const yMid = H - M.bottom - 30;

  const best = useMemo(() => {
    let bt = 0;
    let bi = Infinity;
    for (let x = 0.5; x <= 9.5; x += 0.05) {
      const imp = weightedImpurity(x, metric);
      if (imp < bi) { bi = imp; bt = x; }
    }
    return { bt, bi };
  }, [metric]);

  const cur = weightedImpurity(t, metric);

  return (
    <VizFrame
      className={className}
      title="Choosing a decision-tree split"
      caption="A tree tries every threshold and keeps the one that makes the two sides purest — lowest weighted impurity. A pure group (all one class) has impurity 0."
    >
      <div className="flex gap-2 mb-3">
        <VizButton onClick={() => setMetric("gini")} active={metric === "gini"}>Gini</VizButton>
        <VizButton onClick={() => setMetric("entropy")} active={metric === "entropy"}>Entropy</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Decision tree split">
        <line x1={M.left} y1={yMid} x2={W - M.right} y2={yMid} stroke={VIZ.axis} strokeWidth={1} />

        {/* best split marker */}
        <line x1={sx(best.bt)} y1={M.top} x2={sx(best.bt)} y2={yMid + 10} stroke={VIZ.teal} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
        <text x={sx(best.bt)} y={M.top - 4} fill={VIZ.teal} fontSize={10} textAnchor="middle">best</text>

        {/* current threshold */}
        <line x1={sx(t)} y1={M.top} x2={sx(t)} y2={yMid + 16} stroke={VIZ.yellow} strokeWidth={2.5} />

        {/* points (jittered vertically by class for clarity) */}
        {DATA.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={yMid + (p.label === 0 ? -10 : 10)} r={5} fill={p.label === 1 ? VIZ.brand : VIZ.teal} stroke="#0f1117" strokeWidth={1} />
        ))}

        <text x={sx(2)} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="middle">≤ threshold</text>
        <text x={sx(8)} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="middle">&gt; threshold</text>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="threshold" min={0.5} max={9.5} step={0.05} value={t} onChange={(v) => { target.current = null; setT(v); }} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex items-center gap-4">
        <VizButton onClick={() => { target.current = best.bt; }}>Best split</VizButton>
        <div className="flex gap-4 ml-auto">
          <VizStat label={`${metric} impurity`} value={cur.toFixed(3)} color={cur <= best.bi + 0.005 ? VIZ.teal : VIZ.yellow} />
          <VizStat label="min impurity" value={best.bi.toFixed(3)} color={VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
