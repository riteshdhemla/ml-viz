"use client";

import { useCallback, useMemo, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  seededRandom,
  gaussian,
  scale,
} from "../viz-kit";

/**
 * Sampling strategies visualisation.
 *
 * A fixed imbalanced 2D scatter (~99% majority, ~1% minority) is drawn at the
 * top of the canvas. A control panel selects one of three sampling strategies:
 *
 *   - Uniform random sampling — pick `batchSize` indices from the population
 *     uniformly. Minority is rare in the batch.
 *   - Stratified (1:1)        — pick half the batch from the majority class
 *     and half from the minority class. Minority is over-represented.
 *   - Oversampled minority    — sample uniformly from a *modified*
 *     distribution where each minority example is duplicated 50× so the
 *     batch is well-balanced without explicit per-class selection.
 *
 * Selected points get a thick brand stroke; un-selected points stay greyed.
 * Below the readouts we show the *minority fraction in the batch* compared to
 * the population's natural rate — the central pedagogical quantity for an
 * imbalanced-data lesson.
 */

const W = 560;
const H = 320;
const PAD = 24;

const N_MAJORITY = 200;
const N_MINORITY = 20;

type Strategy = "uniform" | "stratified" | "oversampled";

interface Pt {
  x: number;
  y: number;
  cls: 0 | 1; // 0 = majority, 1 = minority
}

function buildPopulation(): Pt[] {
  const rng = seededRandom(11);
  const pts: Pt[] = [];
  // Majority class: broad blob centred slightly left.
  for (let i = 0; i < N_MAJORITY; i++) {
    pts.push({
      x: gaussian(rng, -0.5, 1.0),
      y: gaussian(rng, 0.0, 0.9),
      cls: 0,
    });
  }
  // Minority class: smaller tighter blob overlapping a bit on the right.
  for (let i = 0; i < N_MINORITY; i++) {
    pts.push({
      x: gaussian(rng, 1.6, 0.55),
      y: gaussian(rng, 0.4, 0.55),
      cls: 1,
    });
  }
  return pts;
}

/** Draw uniform sample of `batchSize` indices from the population. */
function sampleUniform(
  population: Pt[],
  batchSize: number,
  rng: () => number
): Set<number> {
  const n = population.length;
  const picked = new Set<number>();
  // Simple with-replacement is fine for a viz; visually we want a set of
  // distinct indices so we re-roll on collision (population >> batchSize).
  let safety = 0;
  while (picked.size < Math.min(batchSize, n) && safety < batchSize * 20) {
    picked.add(Math.floor(rng() * n));
    safety++;
  }
  return picked;
}

/** 1:1 stratified — half from each class. */
function sampleStratified(
  population: Pt[],
  batchSize: number,
  rng: () => number
): Set<number> {
  const majIdx: number[] = [];
  const minIdx: number[] = [];
  population.forEach((p, i) => (p.cls === 0 ? majIdx.push(i) : minIdx.push(i)));
  const half = Math.floor(batchSize / 2);
  const picked = new Set<number>();
  const pickFrom = (pool: number[], k: number) => {
    let safety = 0;
    while (picked.size < picked.size + k && safety < k * 20) {
      picked.add(pool[Math.floor(rng() * pool.length)]);
      safety++;
    }
  };
  // Pick `half` majority, then `batchSize - half` minority. With replacement
  // within a class is acceptable; we want at least that many distinct picks
  // when the pool allows.
  const pickK = (pool: number[], k: number) => {
    let count = 0;
    let safety = 0;
    while (count < k && safety < k * 30) {
      const before = picked.size;
      picked.add(pool[Math.floor(rng() * pool.length)]);
      if (picked.size > before) count++;
      safety++;
      if (count >= pool.length) break;
    }
  };
  pickK(majIdx, half);
  pickK(minIdx, batchSize - half);
  // suppress unused warning
  void pickFrom;
  return picked;
}

/** Sample uniformly from a distribution where each minority sample is
 *  replicated 50×. With replacement; we expose the *unique* selected
 *  indices so the highlighted points still look like a normal scatter. */
function sampleOversampled(
  population: Pt[],
  batchSize: number,
  rng: () => number
): Set<number> {
  const REPLICATION = 50;
  // Construct a virtual index pool with replicated minority.
  const pool: number[] = [];
  population.forEach((p, i) => {
    if (p.cls === 1) {
      for (let r = 0; r < REPLICATION; r++) pool.push(i);
    } else {
      pool.push(i);
    }
  });
  const picked = new Set<number>();
  for (let k = 0; k < batchSize; k++) {
    picked.add(pool[Math.floor(rng() * pool.length)]);
  }
  return picked;
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  uniform: "Uniform",
  stratified: "Stratified (1:1)",
  oversampled: "Oversampled minority",
};

const STRATEGY_CAPTIONS: Record<Strategy, string> = {
  uniform:
    "Each example has equal probability. The batch mirrors the population — minority points are rare and a small batch may contain none at all.",
  stratified:
    "Force exactly half the batch from each class. Minority is heavily over-represented relative to the population; great for training, but never evaluate on this distribution.",
  oversampled:
    "Sample uniformly from a distribution where each minority example is duplicated 50×. Distinct minority points are revisited many times; majority class is downweighted naturally.",
};

export function SamplingStrategiesViz({ className }: { className?: string }) {
  const population = useMemo(() => buildPopulation(), []);
  const popMinorityFrac = useMemo(
    () => population.filter((p) => p.cls === 1).length / population.length,
    [population]
  );
  const [strategy, setStrategy] = useState<Strategy>("uniform");
  const [batchSize, setBatchSize] = useState<number>(48);
  // A nonce that bumps when "Re-sample" is pressed (or strategy/batchSize change)
  const [reseedTick, setReseedTick] = useState<number>(0);

  const picked = useMemo(() => {
    const rng = seededRandom(reseedTick * 7919 + batchSize * 31 + strategy.length * 13);
    if (strategy === "uniform") return sampleUniform(population, batchSize, rng);
    if (strategy === "stratified") return sampleStratified(population, batchSize, rng);
    return sampleOversampled(population, batchSize, rng);
  }, [population, strategy, batchSize, reseedTick]);

  const reseed = useCallback(() => setReseedTick((t) => t + 1), []);

  // Scales — full population in upper panel, sampled batch panel below.
  const popX = useMemo(() => scale(-3.5, 3.5, PAD, W - PAD), []);
  const popY = useMemo(() => scale(-3.0, 3.0, PAD, H / 2 - 6), []);
  const batchY = useMemo(() => scale(-3.0, 3.0, H / 2 + 22, H - PAD), []);

  // Minority fraction inside the batch.
  let nMinBatch = 0;
  let nBatch = 0;
  picked.forEach((i) => {
    nBatch++;
    if (population[i].cls === 1) nMinBatch++;
  });
  const minorityFrac = nBatch === 0 ? 0 : nMinBatch / nBatch;

  return (
    <VizFrame
      className={className}
      title="Sampling strategies on an imbalanced dataset"
      caption="Top panel: the full population (majority in indigo, minority in rose). Bottom panel: the same population, but only the points selected by the current sampling strategy are highlighted; the rest fade out. The minority fraction in the batch is the headline number — change strategy or batch size and watch it move relative to the population's natural minority rate."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="2D scatter of an imbalanced dataset with the sampled batch highlighted in a lower panel"
      >
        {/* Divider line between population and sampled panels. */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={H / 2 + 8}
          y2={H / 2 + 8}
          stroke={VIZ.grid}
          strokeWidth={0.8}
          strokeDasharray="3 4"
        />

        {/* Panel labels. */}
        <text x={PAD} y={PAD - 8} fill={VIZ.text} fontSize={10} fontFamily="monospace">
          full population (n = {population.length}, minority {(popMinorityFrac * 100).toFixed(1)}%)
        </text>
        <text
          x={PAD}
          y={H / 2 + 20}
          fill={VIZ.text}
          fontSize={10}
          fontFamily="monospace"
        >
          sampled batch ({STRATEGY_LABELS[strategy]}, n = {nBatch})
        </text>

        {/* Top panel — population. */}
        {population.map((p, i) => (
          <circle
            key={`pop-${i}`}
            cx={popX(p.x)}
            cy={popY(p.y)}
            r={p.cls === 1 ? 4.5 : 3.5}
            fill={p.cls === 1 ? VIZ.rose : VIZ.brand}
            opacity={0.85}
          />
        ))}

        {/* Bottom panel — sample. Unselected = grey; selected = strong stroke. */}
        {population.map((p, i) => {
          const isPicked = picked.has(i);
          return (
            <circle
              key={`batch-${i}`}
              cx={popX(p.x)}
              cy={batchY(p.y)}
              r={isPicked ? (p.cls === 1 ? 5.5 : 4.5) : 2.5}
              fill={isPicked ? (p.cls === 1 ? VIZ.rose : VIZ.brand) : VIZ.grid}
              stroke={isPicked ? VIZ.textBright : "none"}
              strokeWidth={isPicked ? 1.3 : 0}
              opacity={isPicked ? 1 : 0.35}
            />
          );
        })}
      </svg>

      {/* Strategy selector. */}
      <div className="flex flex-wrap gap-2 mt-3">
        {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((s) => (
          <VizButton
            key={s}
            onClick={() => {
              setStrategy(s);
              setReseedTick((t) => t + 1);
            }}
            active={strategy === s}
          >
            {STRATEGY_LABELS[s]}
          </VizButton>
        ))}
        <VizButton onClick={reseed}>Re-sample</VizButton>
      </div>

      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
        {STRATEGY_CAPTIONS[strategy]}
      </p>

      <div className="mt-3">
        <VizSlider
          label="batch size"
          min={16}
          max={128}
          step={4}
          value={batchSize}
          onChange={(v) => {
            setBatchSize(v);
            setReseedTick((t) => t + 1);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="strategy" value={STRATEGY_LABELS[strategy]} color={VIZ.brand} />
        <VizStat label="batch size" value={`${nBatch}`} color={VIZ.textBright} />
        <VizStat
          label="minority in batch"
          value={`${(minorityFrac * 100).toFixed(1)}%`}
          color={
            minorityFrac >= 0.4
              ? VIZ.teal
              : minorityFrac >= 0.15
              ? VIZ.yellow
              : VIZ.rose
          }
        />
        <VizStat
          label="minority in population"
          value={`${(popMinorityFrac * 100).toFixed(1)}%`}
          color={VIZ.text}
        />
      </div>
    </VizFrame>
  );
}
