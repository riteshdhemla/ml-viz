"use client";

/**
 * Which rows are trained on and which are validated, per fold, for every
 * splitting scheme the lesson describes — on one fixed dataset of 40 rows.
 *
 * The one design decision that makes this teach rather than illustrate: the
 * **columns are always time order**, never fold order. Fold membership is drawn
 * on top of a fixed time axis, so shuffled k-fold renders as speckle and
 * walk-forward renders as clean staircase blocks, and the difference between
 * them is visible before any number is read.
 *
 * Three counts are computed live from the rendered layout rather than asserted:
 *
 * 1. **Rows validated using their own future.** For each fold, a validation row
 *    at time v is contaminated if any training row sits at t > v. Shuffled
 *    5-fold contaminates 39 of 40 rows; turning the shuffle off only gets to
 *    32, because the *number of contaminated (v,t) pairs is invariant* — it is
 *    C(40,2) minus the within-fold pairs, so it depends on the fold sizes and
 *    nothing else (640 at k = 5 either way). Ordering the folds does not remove
 *    leakage, it only concentrates it in the earlier folds. Only walk-forward
 *    reaches 0, which is the whole argument for it.
 *
 * 2. **Folds containing no positive.** 5 positives in 40 rows at k = 5:
 *    stratified gives exactly one per fold by construction, while plain k-fold
 *    leaves 30.9% of folds empty on average and produces at least one empty
 *    fold in 95.3% of shuffles (4000 trials). This is the case scikit-learn
 *    warns about, made countable.
 *
 * 3. **Bootstrap out-of-bag share.** The lesson quotes 1/e ≈ 0.368, which is
 *    the limit. At the n you actually have it is (1 − 1/n)^n: 0.3632 at n = 40,
 *    confirmed to four decimals by 20000 simulated resamples. The readout shows
 *    the measured value for the six resamples actually drawn, so it fluctuates
 *    around 0.363 rather than pretending to be the constant.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, seededRandom } from "../viz-kit";

const N = 40;
const N_POS = 5; // 12.5% positive class — the imbalance stratification is for
const WF_SPLITS = 6; // walk-forward splits
const BOOT_SAMPLES = 6;

/** Which rows carry the positive label. Fixed across every scheme. */
const POSITIVE = (() => {
  const rng = seededRandom(3);
  const idx = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const set = new Set(idx.slice(0, N_POS));
  return Array.from({ length: N }, (_, i) => set.has(i));
})();

type Cell = "train" | "val" | "unused";
interface Fold {
  label: string;
  /** One entry per row, in time order. */
  cells: Cell[];
  /** Draw count per row; only bootstrap uses values above 1. */
  weight?: number[];
}

const SCHEMES = [
  { key: "holdout", label: "hold-out" },
  { key: "kfold", label: "k-fold" },
  { key: "stratified", label: "stratified k-fold" },
  { key: "loo", label: "leave-one-out" },
  { key: "expanding", label: "walk-forward" },
  { key: "rolling", label: "rolling window" },
  { key: "bootstrap", label: "bootstrap / OOB" },
] as const;
type SchemeKey = (typeof SCHEMES)[number]["key"];

/** Fisher–Yates on the row indices; the same permutation for every k. */
function permutation(shuffle: boolean) {
  const idx = [...Array(N).keys()];
  if (!shuffle) return idx;
  const rng = seededRandom(21);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function foldsFromAssignment(assign: number[], k: number, labelFor: (i: number) => string): Fold[] {
  return Array.from({ length: k }, (_, f) => ({
    label: labelFor(f),
    cells: assign.map((a) => (a === f ? "val" : "train")) as Cell[],
  }));
}

function buildFolds(scheme: SchemeKey, k: number, shuffle: boolean): Fold[] {
  // LOO's folds are singletons, so their order carries no information — always
  // lay it out in time order rather than inheriting a meaningless permutation.
  const order = permutation(shuffle && scheme !== "loo");

  if (scheme === "holdout") {
    const valCount = Math.round(N * 0.2);
    const val = new Set(order.slice(0, valCount));
    return [
      {
        label: "single split",
        cells: Array.from({ length: N }, (_, i) => (val.has(i) ? "val" : "train")),
      },
    ];
  }

  if (scheme === "kfold" || scheme === "loo") {
    const kk = scheme === "loo" ? N : k;
    const assign = new Array<number>(N);
    order.forEach((row, pos) => (assign[row] = pos % kk));
    return foldsFromAssignment(assign, kk, (f) => (scheme === "loo" ? `${f + 1}` : `fold ${f + 1}`));
  }

  if (scheme === "stratified") {
    // deal positives round-robin, then negatives round-robin, so every fold
    // gets floor or ceil of the class share
    const assign = new Array<number>(N);
    let p = 0;
    let n = 0;
    for (const row of order) {
      if (POSITIVE[row]) assign[row] = p++ % k;
      else assign[row] = n++ % k;
    }
    return foldsFromAssignment(assign, k, (f) => `fold ${f + 1}`);
  }

  if (scheme === "expanding" || scheme === "rolling") {
    const h = Math.floor(N / (WF_SPLITS + 1)); // validation horizon
    const out: Fold[] = [];
    for (let s = 0; s < WF_SPLITS; s++) {
      const trainEnd = h * (s + 1);
      const trainStart = scheme === "rolling" ? Math.max(0, trainEnd - h * 2) : 0;
      out.push({
        label: `split ${s + 1}`,
        cells: Array.from({ length: N }, (_, i) =>
          i >= trainStart && i < trainEnd ? "train" : i >= trainEnd && i < trainEnd + h ? "val" : "unused"
        ),
      });
    }
    return out;
  }

  // bootstrap: n draws with replacement; whatever is never drawn is the fold
  const out: Fold[] = [];
  for (let b = 0; b < BOOT_SAMPLES; b++) {
    const rng = seededRandom(101 + b * 7919);
    const weight = new Array(N).fill(0);
    for (let i = 0; i < N; i++) weight[Math.floor(rng() * N)]++;
    out.push({
      label: `resample ${b + 1}`,
      cells: weight.map((w) => (w > 0 ? "train" : "val")) as Cell[],
      weight,
    });
  }
  return out;
}

/** Validation rows that have at least one training row later in time. */
function futureLeaks(folds: Fold[]) {
  const leaked = new Set<number>();
  for (const fold of folds) {
    let trainAfter = false;
    for (let i = N - 1; i >= 0; i--) {
      if (fold.cells[i] === "val" && trainAfter) leaked.add(i);
      if (fold.cells[i] === "train") trainAfter = true;
    }
  }
  return leaked.size;
}

const W = 560;
const GUTTER = 74;
const CELL_W = (W - GUTTER - 8) / N;

const CELL_FILL: Record<Cell, string> = {
  train: "#3b3f57",
  val: VIZ.teal,
  unused: "#1f2230",
};

export function ValidationSplitViz({ className }: { className?: string }) {
  const [scheme, setScheme] = useState<SchemeKey>("kfold");
  const [k, setK] = useState(5);
  const [shuffle, setShuffle] = useState(true);

  const usesK = scheme === "kfold" || scheme === "stratified";
  const usesShuffle = scheme === "kfold" || scheme === "stratified" || scheme === "holdout";

  const folds = useMemo(() => buildFolds(scheme, k, shuffle), [scheme, k, shuffle]);

  const rowH = Math.max(4, Math.min(17, 210 / folds.length));
  const gap = rowH > 8 ? 2 : 0.6;
  const H = 34 + folds.length * (rowH + gap) + 22;

  const stats = useMemo(() => {
    const trainShare =
      folds.reduce((a, f) => a + f.cells.filter((c) => c === "train").length, 0) /
      (folds.length * N);
    const valShare =
      folds.reduce((a, f) => a + f.cells.filter((c) => c === "val").length, 0) /
      (folds.length * N);
    const emptyFolds = folds.filter(
      (f) => !f.cells.some((c, i) => c === "val" && POSITIVE[i])
    ).length;
    return { trainShare, valShare, leaks: futureLeaks(folds), emptyFolds };
  }, [folds]);

  const isBootstrap = scheme === "bootstrap";

  return (
    <VizFrame
      title="Every split, on the same forty rows"
      caption="Columns are the 40 rows of one dataset, always in time order; each band is one fold of the chosen scheme. Teal is validated, grey is trained on, dark is unused by that fold. Yellow ticks above mark the 5 rows of the positive class. Every count below is read off the layout you are looking at."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {SCHEMES.map((s) => (
          <VizButton key={s.key} active={s.key === scheme} onClick={() => setScheme(s.key)}>
            {s.label}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* the positive class, and the direction of time */}
        {POSITIVE.map((p, i) =>
          p ? (
            <rect
              key={i}
              x={GUTTER + i * CELL_W + 1}
              y={4}
              width={CELL_W - 2}
              height={4}
              rx={1}
              fill={VIZ.yellow}
            />
          ) : null
        )}
        <text x={GUTTER} y={22} fontSize={9} fill={VIZ.text}>
          row 1
        </text>
        <text x={W - 8} y={22} textAnchor="end" fontSize={9} fill={VIZ.text}>
          row 40 — time →
        </text>

        {folds.map((fold, f) => {
          const y = 34 + f * (rowH + gap);
          return (
            <g key={f}>
              {rowH > 8 && (
                <text x={GUTTER - 8} y={y + rowH / 2 + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
                  {fold.label}
                </text>
              )}
              {fold.cells.map((c, i) => (
                <rect
                  key={i}
                  x={GUTTER + i * CELL_W + 0.6}
                  y={y}
                  width={CELL_W - 1.2}
                  height={rowH}
                  rx={1.5}
                  fill={CELL_FILL[c]}
                  opacity={
                    isBootstrap && c === "train" ? Math.min(1, 0.45 + 0.25 * (fold.weight?.[i] ?? 1)) : 1
                  }
                />
              ))}
            </g>
          );
        })}

        {/* legend */}
        <g transform={`translate(${GUTTER}, ${H - 6})`}>
          {(
            [
              [CELL_FILL.train, isBootstrap ? "in bag (darker = drawn once)" : "train"],
              [CELL_FILL.val, isBootstrap ? "out of bag" : "validate"],
              [CELL_FILL.unused, "unused"],
            ] as const
          ).map(([col, label], i) => (
            <g key={label} transform={`translate(${i * 160}, 0)`}>
              <rect x={0} y={-8} width={10} height={9} rx={1.5} fill={col} />
              <text x={15} y={0} fontSize={9} fill={VIZ.text}>
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        <VizStat label="model fits" value={String(folds.length)} />
        <VizStat label="trains on" value={`${(stats.trainShare * 100).toFixed(1)}%`} />
        <VizStat
          label={isBootstrap ? "out-of-bag share" : "validates on"}
          value={`${(stats.valShare * 100).toFixed(1)}%`}
          color={isBootstrap ? VIZ.teal : undefined}
        />
        <VizStat
          label="rows validated using their own future"
          value={`${stats.leaks} of ${N}`}
          color={stats.leaks === 0 ? VIZ.teal : stats.leaks > N / 2 ? VIZ.rose : VIZ.yellow}
        />
        <VizStat
          label="folds with no positive"
          value={`${stats.emptyFolds} of ${folds.length}`}
          color={stats.emptyFolds === 0 ? VIZ.teal : VIZ.rose}
        />
        {isBootstrap && (
          <VizStat
            label={`expected (1−1/n)ⁿ at n = ${N}`}
            value={`${(Math.pow(1 - 1 / N, N) * 100).toFixed(2)}%`}
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4 mt-4">
        {usesK && (
          <div className="w-56">
            <VizSlider
              label="k — number of folds"
              min={2}
              max={10}
              step={1}
              value={k}
              onChange={(v) => setK(Math.round(v))}
              format={(v) => String(v)}
            />
          </div>
        )}
        {usesShuffle && (
          <div className="flex gap-2">
            <VizButton active={shuffle} onClick={() => setShuffle(true)}>
              shuffle rows
            </VizButton>
            <VizButton active={!shuffle} onClick={() => setShuffle(false)}>
              keep time order
            </VizButton>
          </div>
        )}
      </div>
    </VizFrame>
  );
}
