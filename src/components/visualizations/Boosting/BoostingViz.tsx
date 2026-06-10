"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/** AdaBoost visualization: weight evolution across 5 rounds of decision stumps. */

const N = 20;
const ROUNDS = 5;

type Point = { x: number; y: number; label: 1 | -1 };
type Stump = { axis: "x" | "y"; threshold: number; polarity: 1 | -1 };
type RoundData = {
  stump: Stump;
  alpha: number;
  epsilon: number;
  weights: number[];
  misclassified: boolean[];
};

function generatePoints(): Point[] {
  const rng = seededRandom(17);
  const pts: Point[] = [];
  // 10 class +1 around (1.5, 1.5)
  for (let i = 0; i < 10; i++) {
    pts.push({ x: gaussian(rng, 1.5, 0.5), y: gaussian(rng, 1.5, 0.5), label: 1 });
  }
  // 10 class -1 around (-1.5, -1.5)
  for (let i = 0; i < 10; i++) {
    pts.push({ x: gaussian(rng, -1.5, 0.5), y: gaussian(rng, -1.5, 0.5), label: -1 });
  }
  // Intentional outliers: swap a +1 into -1 territory and vice versa
  pts[0] = { x: -1.2, y: -1.3, label: 1 };   // +1 outlier in -1 region
  pts[10] = { x: 1.1, y: 1.2, label: -1 };    // -1 outlier in +1 region
  return pts;
}

function predictStump(stump: Stump, pt: Point): 1 | -1 {
  const val = stump.axis === "x" ? pt.x : pt.y;
  return ((val >= stump.threshold ? 1 : -1) * stump.polarity) as 1 | -1;
}

function findBestStump(pts: Point[], weights: number[]): { stump: Stump; epsilon: number } {
  let bestEps = Infinity;
  let bestStump: Stump = { axis: "x", threshold: 0, polarity: 1 };

  for (const axis of ["x", "y"] as const) {
    const vals = pts.map((p) => (axis === "x" ? p.x : p.y));
    const sorted = [...vals].sort((a, b) => a - b);
    // Try each midpoint between consecutive sorted values
    for (let i = 0; i < sorted.length - 1; i++) {
      const threshold = (sorted[i] + sorted[i + 1]) / 2;
      for (const polarity of [1, -1] as const) {
        const stump: Stump = { axis, threshold, polarity };
        let eps = 0;
        for (let j = 0; j < pts.length; j++) {
          if (predictStump(stump, pts[j]) !== pts[j].label) eps += weights[j];
        }
        if (eps < bestEps) {
          bestEps = eps;
          bestStump = stump;
        }
      }
    }
  }
  return { stump: bestStump, epsilon: bestEps };
}

function runAdaBoost(pts: Point[]): RoundData[] {
  const rounds: RoundData[] = [];
  let weights = Array(N).fill(1 / N);

  for (let r = 0; r < ROUNDS; r++) {
    const { stump, epsilon } = findBestStump(pts, weights);
    const eps = Math.max(epsilon, 1e-10);
    const alpha = 0.5 * Math.log((1 - eps) / eps);
    const misclassified = pts.map((p) => predictStump(stump, p) !== p.label);

    // Update weights
    const newWeights = weights.map((w, i) => {
      const yi = pts[i].label;
      const hi = predictStump(stump, pts[i]);
      return w * Math.exp(-alpha * yi * hi);
    });
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map((w) => w / sum);

    rounds.push({ stump, alpha, epsilon: eps, weights: [...weights], misclassified });
  }
  return rounds;
}

// SVG dimensions
const LW = 220, LH = 220; // left panel
const RW = 180, RH = 220; // right panel
const LM = 24;
const RM = 12;
const DOM: [number, number] = [-3, 3];

export function BoostingViz({ className }: { className?: string }) {
  const [round, setRound] = useState(0);

  const pts = useMemo(() => generatePoints(), []);
  const rounds = useMemo(() => runAdaBoost(pts), [pts]);

  // Weights *before* this round = uniform for round 0, previous round's output otherwise
  const displayWeights =
    round === 0 ? Array(N).fill(1 / N) : rounds[round - 1].weights;
  const currentRound = rounds[round];

  const sx = scale(DOM[0], DOM[1], LM, LW - LM);
  const sy = scale(DOM[0], DOM[1], LH - LM, LM);

  const maxW = Math.max(...displayWeights);

  // Bar chart: right panel
  const barW = (RW - 2 * RM) / N;
  const maxBarH = RH - 2 * RM - 16;
  const maxWt = Math.max(...rounds[ROUNDS - 1].weights, ...displayWeights);

  return (
    <VizFrame
      className={className}
      title="AdaBoost: weight rebalancing across rounds"
      caption="Each round focuses on the mistakes of previous rounds — misclassified points grow larger (higher weight). The stump's α controls how much it votes in the final ensemble."
    >
      {/* Two SVG panels */}
      <div className="flex gap-2 justify-center flex-wrap">
        {/* Left: scatter plot */}
        <svg
          viewBox={`0 0 ${LW} ${LH}`}
          width={LW}
          height={LH}
          role="img"
          aria-label="Scatter plot with AdaBoost weights"
        >
          <rect x={0} y={0} width={LW} height={LH} fill={VIZ.card} rx={4} />
          {/* axes */}
          <line x1={LM} y1={LH - LM} x2={LW - LM} y2={LH - LM} stroke={VIZ.axis} strokeWidth={1} />
          <line x1={LM} y1={LM} x2={LM} y2={LH - LM} stroke={VIZ.axis} strokeWidth={1} />
          {/* stump boundary line */}
          {currentRound.stump.axis === "x" ? (
            <line
              x1={sx(currentRound.stump.threshold)}
              y1={LM}
              x2={sx(currentRound.stump.threshold)}
              y2={LH - LM}
              stroke={VIZ.orange}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ) : (
            <line
              x1={LM}
              y1={sy(currentRound.stump.threshold)}
              x2={LW - LM}
              y2={sy(currentRound.stump.threshold)}
              stroke={VIZ.orange}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          {/* points */}
          {pts.map((p, i) => {
            const r = 4 + displayWeights[i] * 60;
            const fill = p.label === 1 ? VIZ.brand : VIZ.rose;
            const isMisclassified = currentRound.misclassified[i];
            return (
              <circle
                key={i}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={r}
                fill={fill}
                fillOpacity={0.8}
                stroke={isMisclassified ? VIZ.yellow : "#0f1117"}
                strokeWidth={isMisclassified ? 2 : 0.8}
              />
            );
          })}
          {/* panel label */}
          <text x={LM + 2} y={LM - 6} fontSize={9} fill={VIZ.text}>
            Scatter (size = weight)
          </text>
        </svg>

        {/* Right: weight bar chart */}
        <svg
          viewBox={`0 0 ${RW} ${RH}`}
          width={RW}
          height={RH}
          role="img"
          aria-label="Per-point weight bar chart"
        >
          <rect x={0} y={0} width={RW} height={RH} fill={VIZ.card} rx={4} />
          <text x={RM} y={RM - 2} fontSize={9} fill={VIZ.text}>
            Weights by point
          </text>
          {pts.map((p, i) => {
            const barH = (displayWeights[i] / maxWt) * maxBarH;
            const bx = RM + i * barW;
            const by = RH - RM - barH - 12;
            const fill = p.label === 1 ? VIZ.brand : VIZ.rose;
            return (
              <rect
                key={i}
                x={bx + 1}
                y={by}
                width={barW - 2}
                height={barH}
                fill={fill}
                fillOpacity={0.85}
              />
            );
          })}
          {/* baseline */}
          <line
            x1={RM}
            y1={RH - RM - 12}
            x2={RW - RM}
            y2={RH - RM - 12}
            stroke={VIZ.axis}
            strokeWidth={1}
          />
          {/* uniform weight reference */}
          <line
            x1={RM}
            y1={RH - RM - 12 - (1 / N / maxWt) * maxBarH}
            x2={RW - RM}
            y2={RH - RM - 12 - (1 / N / maxWt) * maxBarH}
            stroke={VIZ.grid}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        </svg>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <VizButton onClick={() => setRound((r) => Math.max(0, r - 1))}>← Prev</VizButton>
        <VizButton onClick={() => setRound((r) => Math.min(ROUNDS - 1, r + 1))}>Next →</VizButton>
        <span className="text-xs text-slate-400 font-mono">Round {round + 1} / {ROUNDS}</span>
        <div className="flex gap-4 ml-auto flex-wrap">
          <VizStat label="round" value={String(round + 1)} />
          <VizStat label="ε (error)" value={currentRound.epsilon.toFixed(3)} color={VIZ.rose} />
          <VizStat label="α" value={currentRound.alpha.toFixed(3)} color={VIZ.teal} />
          <VizStat label="max weight" value={maxW.toFixed(3)} color={VIZ.yellow} />
        </div>
      </div>
    </VizFrame>
  );
}
