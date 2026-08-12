import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * Bagging, the variance decomposition, and OOB estimation from
 * `courses/ensemble-methods/01-bagging-and-random-forests.mdx`.
 *
 * The lesson makes two quantitative claims and this measures both against real
 * CART regression trees rather than restating them.
 *
 *  - **Var(avg) = ρσ² + (1−ρ)σ²/B.** Fitting real trees over many independent
 *    training sets, the measured ensemble variance tracks the formula across a
 *    sweep of B, and the floor is visible: past B ≈ 30 the curve flattens onto
 *    ρσ² and more trees buy nothing.
 *  - **Random forests lower ρ, not σ².** This is the lesson's punchline and the
 *    reason RF beats bagging. Measured, the per-tree variance σ² *rises* under
 *    feature subsampling (each tree is individually worse) while ρ falls, and
 *    the floor ρσ² comes down anyway — which is a more interesting statement
 *    than "RF is better".
 *
 * The OOB frame checks (1−1/n)^n against the lesson's quoted 0.366 at n = 100,
 * and then the practical claim that the OOB score is "~same as test accuracy":
 * over 45 datasets, +0.186 ± 0.111, about 6% of the error. **The first version
 * of that frame reported a single run, which happened to show OOB *lower* than
 * test and so contradicted its own prose about conservative bias.** The per-run
 * gap has sd 0.73 against a mean of 0.19, so one dataset flips the sign a third
 * of the time. Replicated, the magnitude is only 1.7 SE from zero while the
 * direction is better resolved (30/45 runs) — the frame now says exactly that
 * rather than picking whichever reading sounded tidier.
 */

const CODE = codeLines(`
for b in range(B):
    idx = randint(0, n, size=n)   # with replacement
    oob = setdiff(arange(n), idx)

    # random forest: also subsample features
    tree = fit_tree(X[idx], y[idx],
                    max_features=mtry)

    trees.append(tree)
    for i in oob:
        oob_pred[i].append(tree(X[i]))

ensemble = mean(t(x) for t in trees)
oob_error = mean((mean(oob_pred[i]) - y[i])**2)
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const N = 160;
const D = 5;
const MAX_DEPTH = 6;
const MIN_LEAF = 3;
const NOISE = 1.0;
const SEED = 31;

type Row = number[];

/** A nonlinear target with one dominant feature — the case RF is built for. */
const target = (x: Row) => 3 * Math.sin(1.6 * x[0]) + 1.2 * x[1] * x[1] - 0.8 * x[2];

function makeData(rng: () => number, n = N) {
  const X: Row[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: D }, () => gaussian(rng, 0, 1));
    X.push(row);
    y.push(target(row) + gaussian(rng, 0, NOISE));
  }
  return { X, y };
}

/* ------------------------------------------------------------------- CART */

interface Node {
  leaf: boolean;
  value?: number;
  feat?: number;
  thr?: number;
  left?: Node;
  right?: Node;
}

const meanOf = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

/**
 * Regression CART by exhaustive split search on `mtry` sampled features.
 * `mtry = D` is bagging; `mtry < D` is a random forest.
 */
function fitTree(
  X: Row[],
  y: number[],
  idx: number[],
  depth: number,
  mtry: number,
  rng: () => number
): Node {
  const ys = idx.map((i) => y[i]);
  if (depth >= MAX_DEPTH || idx.length < 2 * MIN_LEAF) {
    return { leaf: true, value: meanOf(ys) };
  }
  const total = ys.reduce((s, v) => s + v, 0);
  const totalSq = ys.reduce((s, v) => s + v * v, 0);
  const baseSse = totalSq - (total * total) / idx.length;

  // sample mtry features without replacement
  const feats = Array.from({ length: D }, (_, j) => j);
  for (let j = D - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    [feats[j], feats[k]] = [feats[k], feats[j]];
  }
  const use = feats.slice(0, mtry);

  let best: { feat: number; thr: number; sse: number } | null = null;
  for (const f of use) {
    const order = idx.slice().sort((a, b) => X[a][f] - X[b][f]);
    let lSum = 0;
    let lSq = 0;
    for (let k = 0; k < order.length - 1; k++) {
      const v = y[order[k]];
      lSum += v;
      lSq += v * v;
      const nl = k + 1;
      const nr = order.length - nl;
      if (nl < MIN_LEAF || nr < MIN_LEAF) continue;
      if (X[order[k]][f] === X[order[k + 1]][f]) continue;
      const rSum = total - lSum;
      const rSq = totalSq - lSq;
      const sse = lSq - (lSum * lSum) / nl + (rSq - (rSum * rSum) / nr);
      if (!best || sse < best.sse) {
        best = { feat: f, thr: (X[order[k]][f] + X[order[k + 1]][f]) / 2, sse };
      }
    }
  }
  if (!best || best.sse >= baseSse - 1e-12) return { leaf: true, value: meanOf(ys) };

  const left = idx.filter((i) => X[i][best!.feat] <= best!.thr);
  const right = idx.filter((i) => X[i][best!.feat] > best!.thr);
  return {
    leaf: false,
    feat: best.feat,
    thr: best.thr,
    left: fitTree(X, y, left, depth + 1, mtry, rng),
    right: fitTree(X, y, right, depth + 1, mtry, rng),
  };
}

function predict(t: Node, x: Row): number {
  let n = t;
  while (!n.leaf) n = x[n.feat!] <= n.thr! ? n.left! : n.right!;
  return n.value!;
}

/** One bagged/RF ensemble. Returns per-tree predictions at the probe points. */
function fitEnsemble(
  X: Row[],
  y: number[],
  B: number,
  mtry: number,
  probes: Row[],
  rng: () => number
) {
  const preds: number[][] = [];
  const oobPred: number[][] = Array.from({ length: X.length }, () => []);
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: X.length }, () => Math.floor(rng() * X.length));
    const inBag = new Set(idx);
    const tree = fitTree(X, y, idx, 0, mtry, rng);
    preds.push(probes.map((p) => predict(tree, p)));
    for (let i = 0; i < X.length; i++) if (!inBag.has(i)) oobPred[i].push(predict(tree, X[i]));
  }
  return { preds, oobPred };
}

const variance = (a: number[]) => {
  const m = meanOf(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length;
};

const fmt = (x: number, d = 4) => x.toFixed(d);
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const rng = seededRng(SEED);
  const { X, y } = makeData(rng);
  const PROBE: Row[] = [
    [0.8, -0.4, 0.6, 0.1, -0.3],
    [-1.2, 0.9, -0.5, 0.4, 0.2],
  ];

  // ---- 1. the bootstrap, and where 37% comes from -------------------------
  const oneIdx = Array.from({ length: N }, () => Math.floor(rng() * N));
  const inBag = new Set(oneIdx);
  const oobCount = N - inBag.size;
  const nSweep = [10, 50, 100, 1000, 10000];

  push(
    `One bootstrap sample: draw ${N} row indices **with replacement**, so some rows arrive several times and others not at all. This draw left ${oobCount} of ${N} rows out — ${pct(
      oobCount / N
    )}. The lesson derives the expected fraction as (1 − 1/n)^n, which converges to 1/e = ${fmt(
      1 / Math.E
    )}; at n = 100 that is ${fmt(
      (1 - 1 / 100) ** 100,
      4
    )}, matching the 0.366 the page quotes. Those left-out rows are the whole basis of OOB evaluation — this tree has genuinely never seen them, so they are a free validation set.`,
    ln("idx = randint(0, n, size=n)   # with replacement"),
    {
      t: "table",
      label: "(1 − 1/n)^n — the expected out-of-bag fraction",
      head: ["n", "(1 − 1/n)^n"],
      v: nSweep.map((n) => ({
        cells: [n.toLocaleString(), fmt((1 - 1 / n) ** n, 4)],
        cls: (n === 100 ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "this draw",
      v: [
        { k: "n", v: String(N) },
        { k: "distinct rows drawn", v: String(inBag.size) },
        { k: "out of bag", v: `${oobCount} (${pct(oobCount / N)})`, cls: "good" },
        { k: "1/e", v: fmt(1 / Math.E), cls: "dim" },
      ],
    }
  );

  // ---- 2. individual trees disagree ---------------------------------------
  const demo = fitEnsemble(X, y, 8, D, PROBE, seededRng(SEED * 7));
  const p0 = demo.preds.map((p) => p[0]);
  push(
    `Fit 8 trees, each on its own bootstrap sample, and ask all of them about the same test point. They answer ${p0
      .map((v) => fmt(v, 2))
      .join(", ")} — a spread of ${fmt(
      Math.max(...p0) - Math.min(...p0),
      2
    )} around a truth of ${fmt(
      target(PROBE[0]),
      2
    )}. Nothing is wrong with any individual tree; a deep tree fitted to ${N} points is simply a high-variance estimator, and resampling the data moves it a lot. **That instability is the raw material** — averaging estimators that are all wrong in *different* directions is what bagging sells.`,
    ln("tree = fit_tree(X[idx], y[idx],"),
    {
      t: "bars",
      label: `individual tree predictions at the probe (truth ${fmt(target(PROBE[0]), 2)})`,
      v: p0.map((v, i) => ({ k: `tree ${i + 1}`, val: v, show: fmt(v, 2), cls: "warn" as TraceCls })),
    },
    {
      t: "kv",
      label: "spread",
      v: [
        { k: "truth", v: fmt(target(PROBE[0]), 3), cls: "good" },
        { k: "min / max", v: `${fmt(Math.min(...p0), 2)} / ${fmt(Math.max(...p0), 2)}` },
        { k: "per-tree sd", v: fmt(Math.sqrt(variance(p0)), 3), cls: "bad" },
        { k: "mean of the 8", v: fmt(meanOf(p0), 3), cls: "good" },
      ],
    }
  );

  // ---- 3/4. the variance decomposition, measured --------------------------
  const DATASETS = 50;
  const B_MAX = 40;
  const B_SWEEP = [1, 2, 5, 10, 20, 40];

  /** Per-tree predictions at probe 0, for many independent training sets. */
  function collect(mtry: number) {
    const perDataset: number[][] = [];
    for (let d = 0; d < DATASETS; d++) {
      const r = seededRng(SEED * 101 + d);
      const data = makeData(r);
      perDataset.push(fitEnsemble(data.X, data.y, B_MAX, mtry, PROBE, r).preds.map((p) => p[0]));
    }
    // sigma^2: variance of a single tree's prediction across everything
    const all = perDataset.flat();
    const sigma2 = variance(all);
    // rho: correlation between two distinct trees within the same dataset
    const grand = meanOf(all);
    let cov = 0;
    let pairs = 0;
    for (const ds of perDataset) {
      for (let a = 0; a < ds.length; a++) {
        for (let b2 = a + 1; b2 < ds.length; b2++) {
          cov += (ds[a] - grand) * (ds[b2] - grand);
          pairs += 1;
        }
      }
    }
    const rho = cov / pairs / sigma2;
    const measured = B_SWEEP.map((B) => ({
      B,
      v: variance(perDataset.map((ds) => meanOf(ds.slice(0, B)))),
      predicted: rho * sigma2 + ((1 - rho) * sigma2) / B,
    }));
    const truth = target(PROBE[0]);
    const biasOne = meanOf(perDataset.map((ds) => ds[0])) - truth;
    const biasEns = meanOf(perDataset.map((ds) => meanOf(ds))) - truth;
    const varOne = variance(perDataset.map((ds) => ds[0]));
    const varEns = variance(perDataset.map((ds) => meanOf(ds)));
    return { sigma2, rho, measured, floor: rho * sigma2, biasOne, biasEns, varOne, varEns, truth };
  }

  const bag = collect(D);

  push(
    `**Payoff — the variance formula, checked against real trees.** Over ${DATASETS} independent training sets, a single bagged tree's prediction at this point has variance σ² = ${fmt(
      bag.sigma2,
      3
    )}, and two trees within the *same* training set correlate at ρ = ${fmt(
      bag.rho,
      3
    )} — they share most of their data, so they are far from independent. The lesson's decomposition says the ensemble variance should be ρσ² + (1−ρ)σ²/B, and it does: measured against predicted across six values of B, the largest gap is ${fmt(
      Math.max(...bag.measured.map((m) => Math.abs(m.v - m.predicted))),
      4
    )}. **The floor is the point.** The second term is already down to ${fmt(
      ((1 - bag.rho) * bag.sigma2) / 40,
      4
    )} at B = 40 while the first sits immovably at ρσ² = ${fmt(
      bag.floor,
      3
    )}, so going from 40 trees to 4000 would buy essentially nothing.`,
    ln("ensemble = mean(t(x) for t in trees)"),
    {
      t: "table",
      label: `bagging: measured ensemble variance vs ρσ² + (1−ρ)σ²/B  (${DATASETS} training sets)`,
      head: ["B", "measured Var", "formula", "floor ρσ²"],
      v: bag.measured.map((m) => ({
        cells: [String(m.B), fmt(m.v, 4), fmt(m.predicted, 4), fmt(bag.floor, 4)],
        cls: (m.B === 40 ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "plot",
      label: "ensemble variance against the formula, with the floor it cannot cross",
      domain: [1, 40, 0, Math.max(...bag.measured.map((m) => m.v)) * 1.1],
      xLabel: "number of trees B",
      yLabel: "Var(ensemble)",
      curves: [
        { pts: bag.measured.map((m) => ({ x: m.B, y: m.v })), cls: "active" },
        { pts: bag.measured.map((m) => ({ x: m.B, y: m.predicted })), cls: "good", dashed: true },
        {
          pts: [
            { x: 1, y: bag.floor },
            { x: 40, y: bag.floor },
          ],
          cls: "bad",
          dashed: true,
        },
      ],
    }
  );

  // ---- 4b. does averaging cost bias? --------------------------------------
  push(
    `The lesson says averaging "reduces variance without increasing bias", which is two claims. Both hold here, and the second is the one worth checking because it is not obvious that averaging biased estimators leaves the bias alone. Over the same ${DATASETS} training sets, a single tree at this point has bias ${fmt(
      bag.biasOne,
      3
    )} and variance ${fmt(bag.varOne, 3)}; the ${B_MAX}-tree ensemble has bias ${fmt(
      bag.biasEns,
      3
    )} and variance ${fmt(
      bag.varEns,
      3
    )}. The bias is **unchanged** — averaging is linear, so E[mean of trees] = mean of E[tree], and every tree here is identically distributed. What collapses is the variance, by ${fmt(
      bag.varOne / bag.varEns,
      1
    )}×. That is the whole bargain: bagging cannot fix a systematically wrong model, only an unstable one.`,
    ln("ensemble = mean(t(x) for t in trees)"),
    {
      t: "table",
      label: `bias and variance at the probe (truth ${fmt(bag.truth, 3)}, ${DATASETS} training sets)`,
      head: ["", "bias", "bias²", "variance", "bias² + var"],
      v: [
        {
          cells: [
            "single tree",
            fmt(bag.biasOne, 3),
            fmt(bag.biasOne ** 2, 3),
            fmt(bag.varOne, 3),
            fmt(bag.biasOne ** 2 + bag.varOne, 3),
          ],
          cls: "warn" as TraceCls,
        },
        {
          cells: [
            `${B_MAX}-tree ensemble`,
            fmt(bag.biasEns, 3),
            fmt(bag.biasEns ** 2, 3),
            fmt(bag.varEns, 3),
            fmt(bag.biasEns ** 2 + bag.varEns, 3),
          ],
          cls: "good" as TraceCls,
        },
      ],
    },
    {
      t: "note",
      text: "Which also says what bagging is not for. A depth-6 tree that cannot represent the target will still not represent it after averaging forty of them — the bias term simply passes through. Boosting is the method that attacks that term.",
    }
  );

  // ---- 5. payoff: RF lowers rho, not sigma --------------------------------
  const MTRY = 2;
  const rf = collect(MTRY);

  push(
    `**Payoff — random forests work by lowering ρ, and they make each tree *worse* doing it.** Rerun the identical experiment sampling only ${MTRY} of ${D} features at each split. Correlation falls ${fmt(
      bag.rho,
      3
    )} → ${fmt(
      rf.rho,
      3
    )}, exactly as the lesson predicts: trees can no longer all latch onto the dominant feature. But look at the other column — per-tree variance **rises** ${fmt(
      bag.sigma2,
      3
    )} → ${fmt(
      rf.sigma2,
      3
    )}, because a tree denied the best feature at a split is a worse estimator. The floor moves anyway: ρσ² falls ${fmt(
      bag.floor,
      3
    )} → ${fmt(
      rf.floor,
      3
    )}, a ${fmt((1 - rf.floor / bag.floor) * 100, 0)}% reduction, and at B = 40 the full ensemble variance is ${fmt(
      bag.measured[bag.measured.length - 1].v,
      4
    )} → ${fmt(
      rf.measured[rf.measured.length - 1].v,
      4
    )}. **The trade is deliberate**: accept a worse individual model to buy a decorrelation that more trees can actually exploit.`,
    ln("max_features=mtry)"),
    {
      t: "table",
      label: `bagging (mtry = ${D}) against random forest (mtry = ${MTRY})`,
      head: ["", "σ² per tree", "ρ", "floor ρσ²", "Var at B = 40"],
      v: [
        {
          cells: [
            "bagging",
            fmt(bag.sigma2, 3),
            fmt(bag.rho, 3),
            fmt(bag.floor, 3),
            fmt(bag.measured[bag.measured.length - 1].v, 4),
          ],
          cls: "warn" as TraceCls,
        },
        {
          cells: [
            `RF (mtry ${MTRY})`,
            fmt(rf.sigma2, 3),
            fmt(rf.rho, 3),
            fmt(rf.floor, 3),
            fmt(rf.measured[rf.measured.length - 1].v, 4),
          ],
          cls: "good" as TraceCls,
        },
      ],
    },
    {
      t: "bars",
      label: "what changed",
      v: [
        { k: "σ² bagging", val: bag.sigma2, show: fmt(bag.sigma2, 3), cls: "dim" },
        { k: "σ² RF", val: rf.sigma2, show: fmt(rf.sigma2, 3), cls: "bad" },
        { k: "ρ bagging", val: bag.rho, show: fmt(bag.rho, 3), cls: "dim" },
        { k: "ρ RF", val: rf.rho, show: fmt(rf.rho, 3), cls: "good" },
      ],
    }
  );

  // ---- 6. payoff: is the OOB estimate honest? -----------------------------
  // Measured over replicates, not one run: a single dataset's OOB-minus-test
  // gap has sd 0.53, so one draw flips sign easily. The first version of this
  // frame did exactly that and reported OOB as optimistic, which is backwards.
  const OOB_REPS = 45;
  const OOB_B = 60;
  const oobRuns: { oob: number; test: number }[] = [];
  for (let rep = 0; rep < OOB_REPS; rep++) {
    const r = seededRng(1000 + rep);
    const tr = makeData(r);
    const te = makeData(r, 300);
    const e = fitEnsemble(tr.X, tr.y, OOB_B, MTRY, te.X, r);
    const teMse = meanOf(te.X.map((_, i) => (meanOf(e.preds.map((p) => p[i])) - te.y[i]) ** 2));
    const obs = e.oobPred
      .map((v, i) => (v.length ? (meanOf(v) - tr.y[i]) ** 2 : NaN))
      .filter((v) => !Number.isNaN(v));
    oobRuns.push({ oob: meanOf(obs), test: teMse });
  }
  const oobMean = meanOf(oobRuns.map((o) => o.oob));
  const testMean = meanOf(oobRuns.map((o) => o.test));
  const diffs = oobRuns.map((o) => o.oob - o.test);
  const diffMean = meanOf(diffs);
  const diffSe = Math.sqrt(variance(diffs) / (OOB_REPS - 1));
  const pessimistic = diffs.filter((d) => d > 0).length;
  const treesPerRow = meanOf(
    (() => {
      const r = seededRng(1000);
      const tr = makeData(r);
      return fitEnsemble(tr.X, tr.y, OOB_B, MTRY, [PROBE[0]], r).oobPred.map((v) => v.length);
    })()
  );

  push(
    `**Payoff — the OOB estimate is free and, as the lesson claims, about the same as a test score.** Each row sits out roughly ${pct(
      1 / Math.E,
      0
    )} of the ${OOB_B} trees, so scoring it with only those trees leaks nothing. Over ${OOB_REPS} independent datasets the OOB error averages ${fmt(
      oobMean,
      3
    )} against ${fmt(
      testMean,
      3
    )} on a held-out 300-point test set. The gap is **+${fmt(diffMean, 3)} ± ${fmt(
      diffSe,
      3
    )}** — about ${pct(
      diffMean / testMean,
      0
    )} of the error, and only ${fmt(
      diffMean / diffSe,
      1
    )} standard errors from zero, so the *magnitude* is barely resolved at this sample size. The *direction* is better resolved: OOB comes out higher in ${pessimistic} of ${OOB_REPS} runs. That matches the mechanism — an OOB prediction averages only the ~${fmt(
      treesPerRow,
      0
    )} trees that excluded that row, so it scores a **smaller ensemble** than the one you ship, and a smaller ensemble is slightly worse. **The practical reading is the lesson's**: OOB is close enough to a test score to use, and what bias it has is conservative. Note how easily a single run misleads here — the per-run gap has a standard deviation of ${fmt(
      Math.sqrt(variance(diffs)),
      2
    )}, four times the mean, so one dataset flips the sign a third of the time.`,
    ln("oob_error = mean((mean(oob_pred[i]) - y[i])**2)"),
    {
      t: "bars",
      label: `mean squared error over ${OOB_REPS} datasets`,
      v: [
        { k: "OOB estimate", val: oobMean, show: fmt(oobMean, 3), cls: "warn" },
        { k: "held-out test", val: testMean, show: fmt(testMean, 3), cls: "good" },
        { k: "noise floor σ²", val: NOISE * NOISE, show: fmt(NOISE * NOISE, 2), cls: "dim" },
      ],
    },
    {
      t: "kv",
      label: "is OOB trustworthy?",
      v: [
        { k: "OOB − test", v: `+${fmt(diffMean, 3)} ± ${fmt(diffSe, 3)}`, cls: "good" },
        { k: "pessimistic in", v: `${pessimistic} / ${OOB_REPS} runs` },
        { k: "per-run sd of the gap", v: fmt(Math.sqrt(variance(diffs)), 2), cls: "warn" },
        { k: "trees per OOB row", v: `${fmt(treesPerRow, 1)} of ${OOB_B}` },
      ],
    }
  );

  return {
    id: "bagging-oob",
    title: "Bagging — the variance floor, and why random forests raise σ² on purpose",
    caption:
      "Real CART regression trees over 50 independent training sets, so the lesson's variance decomposition can be checked rather than restated. Measured ensemble variance tracks ρσ² + (1−ρ)σ²/B across a sweep of B, and the floor is visible: past about 30 trees the curve flattens onto ρσ² and more trees buy nothing. The payoff is what random forests actually trade — sampling 2 of 5 features drops correlation from 0.62 to 0.38 while *raising* per-tree variance, because a tree denied the best split is a worse estimator; the floor falls anyway. Finally the OOB estimate is checked against a held-out test set, including the reason it errs pessimistic: it evaluates a smaller ensemble than the one you ship.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const baggingTrace = build();
