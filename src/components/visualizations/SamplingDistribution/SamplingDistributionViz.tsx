"use client";

import { useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  seededRandom,
  scale,
} from "../viz-kit";

/**
 * Central Limit Theorem: draw many samples of size n from a deliberately skewed
 * population, take each sample's MEAN, and histogram those means. As n grows,
 * the distribution of sample means becomes bell-shaped and narrows — its spread
 * (the standard error) shrinks like 1/√n — no matter how non-normal the
 * population is. This is the engine behind confidence intervals and z/t-tests.
 */

const W = 480;
const H = 230;
const M = { top: 14, right: 14, bottom: 34, left: 36 };
const NUM_SAMPLES = 600;
const BINS = 28;

/** Skewed population on [0,1]: square of a uniform → piles up near 0. */
function drawPopulation(rng: () => number): number {
  const u = rng();
  return u * u;
}

// Population mean and SD for x = U², U~Uniform(0,1):
// E[x] = 1/3, Var[x] = E[x²]-E[x]² = 1/5 - 1/9 = 4/45 → SD ≈ 0.298.
const POP_MEAN = 1 / 3;
const POP_SD = Math.sqrt(4 / 45);

function sampleMeans(n: number, seed: number): number[] {
  const rng = seededRandom(seed);
  const means: number[] = [];
  for (let s = 0; s < NUM_SAMPLES; s++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += drawPopulation(rng);
    means.push(sum / n);
  }
  return means;
}

function histogram(values: number[], lo: number, hi: number, bins: number) {
  const counts = new Array(bins).fill(0);
  const w = (hi - lo) / bins;
  for (const v of values) {
    let b = Math.floor((v - lo) / w);
    if (b < 0) b = 0;
    if (b >= bins) b = bins - 1;
    counts[b]++;
  }
  return counts;
}

export function SamplingDistributionViz({ className }: { className?: string }) {
  const [n, setN] = useState(2);
  const [seed, setSeed] = useState(7);

  const means = sampleMeans(n, seed);
  const counts = histogram(means, 0, 1, BINS);
  const maxCount = Math.max(...counts, 1);

  const se = POP_SD / Math.sqrt(n); // theoretical standard error
  const observedSd = Math.sqrt(
    means.reduce((a, m) => a + (m - POP_MEAN) ** 2, 0) / means.length
  );

  const x = scale(0, 1, M.left, W - M.right);
  const y = scale(0, maxCount, H - M.bottom, M.top);
  const barW = (W - M.left - M.right) / BINS;

  // overlay the CLT-predicted normal N(POP_MEAN, se²), scaled to the histogram
  const normalPath = (() => {
    const pts: string[] = [];
    const binW = 1 / BINS;
    for (let i = 0; i <= 120; i++) {
      const xv = i / 120;
      const density =
        (1 / (se * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((xv - POP_MEAN) / se) ** 2);
      // expected count in a bin = density * binWidth * NUM_SAMPLES
      const expCount = density * binW * NUM_SAMPLES;
      pts.push(`${i === 0 ? "M" : "L"}${x(xv).toFixed(1)},${y(Math.min(expCount, maxCount)).toFixed(1)}`);
    }
    return pts.join(" ");
  })();

  return (
    <VizFrame
      className={className}
      title="Central Limit Theorem: the sampling distribution of the mean"
      caption="Each bar counts how often a sample of size n produced a given mean, over 600 samples drawn from a strongly skewed population. Increase n: the distribution of sample means becomes bell-shaped and narrows, hugging the predicted normal (teal). Its spread is the standard error, SE = σ/√n — the basis of confidence intervals and z-tests."
    >
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="sampling distribution of the mean">
          {/* population mean line */}
          <line x1={x(POP_MEAN)} y1={M.top} x2={x(POP_MEAN)} y2={H - M.bottom} stroke={VIZ.rose} strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={x(POP_MEAN)} y={M.top - 3} fill={VIZ.rose} fontSize={9} textAnchor="middle" fontFamily="monospace">
            μ = {POP_MEAN.toFixed(2)}
          </text>

          {/* histogram bars */}
          {counts.map((c, i) => {
            const xv = (i + 0.5) / BINS;
            return (
              <rect
                key={i}
                x={x(i / BINS) + 0.5}
                y={y(c)}
                width={barW - 1}
                height={H - M.bottom - y(c)}
                fill={VIZ.brand}
                opacity={0.8}
              />
            );
          })}

          {/* CLT-predicted normal overlay */}
          <path d={normalPath} fill="none" stroke={VIZ.teal} strokeWidth={2} />

          {/* x-axis */}
          <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={t} x={x(t)} y={H - M.bottom + 14} fill={VIZ.text} fontSize={9} textAnchor="middle" fontFamily="monospace">
              {t}
            </text>
          ))}
          <text x={(W) / 2} y={H - 4} fill={VIZ.text} fontSize={9} textAnchor="middle">
            sample mean
          </text>
        </svg>
      </div>

      <div className="mt-3 max-w-sm">
        <VizSlider
          label="Sample size n"
          min={1}
          max={50}
          step={1}
          value={n}
          onChange={(v) => setN(Math.round(v))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-3">
        <VizButton onClick={() => setSeed((s) => s + 1)}>Resample</VizButton>
        <VizStat label="pop. SD (σ)" value={POP_SD.toFixed(3)} />
        <VizStat label="SE = σ/√n" value={se.toFixed(3)} color={VIZ.teal} />
        <VizStat label="observed spread" value={observedSd.toFixed(3)} color={VIZ.brand} />
      </div>
    </VizFrame>
  );
}
