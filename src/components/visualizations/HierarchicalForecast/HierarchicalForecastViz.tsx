"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, gaussian, seededRandom } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";

/**
 * Hierarchical forecasting and reconciliation, stage by stage.
 *
 * The lesson states the MinT projection as a formula. What the formula hides is
 * *why you would ever need it*: forecast every node of a business hierarchy
 * independently and the numbers you hand to operations contradict each other —
 * the warehouse plans for one total and the stores plan for another. Coherence
 * is not a mathematical nicety, it is the difference between a plan and a set of
 * conflicting opinions.
 *
 * Everything here is computed. A five-store hierarchy is simulated, a damped
 * Holt forecaster is fitted independently at all eight nodes with its own
 * grid-searched parameters (which is what makes the base forecasts genuinely
 * incoherent — a linear model with shared regressors would reconcile itself),
 * and bottom-up, top-down, OLS and MinT are all applied as the same projection
 * `S·G·ŷ` with different `G`. The accuracy table is a Monte-Carlo average over
 * many draws of the future rather than one lucky test window, because on a
 * single draw the ranking of these methods is mostly noise.
 */

/* -------------------------------------------------------------- constants */

const T = 120; // days of history
const H = 14; // forecast horizon, days
const REPLICATIONS = 200; // future paths averaged for the accuracy table
const SEED = 21;

interface Leaf {
  id: string;
  label: string;
  region: 0 | 1;
  level: number;
  /** Fractional drift per day — some stores grow, one is in decline. */
  drift: number;
  noise: number;
}

const LEAVES: Leaf[] = [
  { id: "a1", label: "Store A1", region: 0, level: 420, drift: 0.0016, noise: 26 },
  { id: "a2", label: "Store A2", region: 0, level: 265, drift: 0.0004, noise: 19 },
  { id: "a3", label: "Store A3", region: 0, level: 180, drift: -0.0011, noise: 21 },
  { id: "b1", label: "Store B1", region: 1, level: 345, drift: 0.0022, noise: 24 },
  { id: "b2", label: "Store B2", region: 1, level: 150, drift: 0.0008, noise: 17 },
];

const M = LEAVES.length; // leaf series
const REGIONS = ["Region A", "Region B"];
/** All nodes, aggregates first — the ordering the summing matrix assumes. */
const NODES = ["Total", ...REGIONS, ...LEAVES.map((l) => l.label)];
const N = NODES.length;
const LEVEL_OF = [0, 1, 1, 2, 2, 2, 2, 2]; // 0 total, 1 region, 2 store
const LEVEL_NAMES = ["total", "region", "store"];

/** Summing matrix S (N × M): every node as a sum of leaves. */
const S: number[][] = [
  LEAVES.map(() => 1),
  LEAVES.map((l) => (l.region === 0 ? 1 : 0)),
  LEAVES.map((l) => (l.region === 1 ? 1 : 0)),
  ...LEAVES.map((_, i) => LEAVES.map((__, j) => (i === j ? 1 : 0))),
];

/* ---------------------------------------------------------- linear algebra */

function invert(A: number[][]): number[][] {
  const n = A.length;
  const Mx = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(Mx[r][c]) > Math.abs(Mx[piv][c])) piv = r;
    [Mx[c], Mx[piv]] = [Mx[piv], Mx[c]];
    const d = Mx[c][c] || 1e-12;
    for (let j = 0; j < 2 * n; j++) Mx[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = Mx[r][c];
      if (!f) continue;
      for (let j = 0; j < 2 * n; j++) Mx[r][j] -= f * Mx[c][j];
    }
  }
  return Mx.map((row) => row.slice(n));
}

const matmul = (A: number[][], B: number[][]): number[][] =>
  A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
const transpose = (A: number[][]): number[][] => A[0].map((_, j) => A.map((row) => row[j]));
const matvec = (A: number[][], v: number[]): number[] =>
  A.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));

/* ----------------------------------------------------------------- the data */

/** One realisation of the leaf series, plus every aggregate implied by S. */
function simulate(seed: number, length: number, start = 0): number[][] {
  const rng = seededRandom(seed);
  return LEAVES.map((l) => {
    const out: number[] = [];
    for (let t = start; t < start + length; t++) {
      const trend = l.level * (1 + l.drift * t);
      out.push(Math.max(0, trend + gaussian(rng, 0, l.noise)));
    }
    return out;
  });
}

/** Lift leaf paths to all N nodes with the summing matrix. */
const aggregate = (leaves: number[][]): number[][] =>
  S.map((row) => leaves[0].map((_, t) => row.reduce((s, w, i) => s + w * leaves[i][t], 0)));

const HISTORY = aggregate(simulate(SEED, T));

/* ------------------------------------------------------------- forecasting */

interface Holt {
  alpha: number;
  beta: number;
  phi: number;
  level: number;
  trend: number;
  /** One-step in-sample error variance — the diagonal of W for MinT. */
  variance: number;
}

/** Damped-trend exponential smoothing, one pass. Returns state and SSE. */
function holtPass(y: number[], alpha: number, beta: number, phi: number) {
  let level = y[0];
  let trend = y[1] - y[0];
  let sse = 0;
  for (let t = 1; t < y.length; t++) {
    const pred = level + phi * trend;
    const err = y[t] - pred;
    sse += err * err;
    const newLevel = pred + alpha * err;
    trend = phi * trend + beta * alpha * err;
    level = newLevel;
  }
  return { level, trend, sse, n: y.length - 1 };
}

const ALPHAS = [0.1, 0.2, 0.3, 0.45, 0.6, 0.8];
const BETAS = [0.02, 0.05, 0.1, 0.2, 0.35];
const PHIS = [0.8, 0.9, 0.95, 1];

/**
 * Fit by grid search on one-step error. Each node gets its *own* parameters —
 * which is exactly why the base forecasts do not add up: the fitted parameters
 * are a nonlinear function of each series, so forecasting the sum is not the
 * sum of the forecasts.
 */
function fitHolt(y: number[]): Holt {
  let best = { alpha: ALPHAS[0], beta: BETAS[0], phi: PHIS[0], sse: Infinity, level: 0, trend: 0, n: 1 };
  for (const alpha of ALPHAS)
    for (const beta of BETAS)
      for (const phi of PHIS) {
        const r = holtPass(y, alpha, beta, phi);
        if (r.sse < best.sse) best = { alpha, beta, phi, sse: r.sse, level: r.level, trend: r.trend, n: r.n };
      }
  return {
    alpha: best.alpha,
    beta: best.beta,
    phi: best.phi,
    level: best.level,
    trend: best.trend,
    variance: best.sse / best.n,
  };
}

/** h-step forecast: the damped trend sums to a geometric series. */
function project(f: Holt, h: number): number {
  let damp = 0;
  for (let i = 1; i <= h; i++) damp += f.phi ** i;
  return f.level + damp * f.trend;
}

const FITS = HISTORY.map(fitHolt);
/** Base forecasts: one independent model per node, `N × H`. */
const BASE: number[][] = FITS.map((f) => Array.from({ length: H }, (_, i) => project(f, i + 1)));

/* --------------------------------------------------------- reconciliation */

type Method = "base" | "bu" | "td" | "ols" | "mint";

const METHOD_LABEL: Record<Method, string> = {
  base: "base (independent)",
  bu: "bottom-up",
  td: "top-down",
  ols: "OLS reconciliation",
  mint: "MinT (diagonal W)",
};

const St = transpose(S);

/** G for bottom-up: read the leaves, ignore every aggregate forecast. */
const G_BU: number[][] = LEAVES.map((_, i) => NODES.map((__, j) => (j === 3 + i ? 1 : 0)));

/** G for top-down: read the total, split it by historical leaf proportions. */
const PROPORTIONS = (() => {
  const totals = LEAVES.map((_, i) => HISTORY[3 + i].reduce((s, v) => s + v, 0));
  const sum = totals.reduce((s, v) => s + v, 0);
  return totals.map((v) => v / sum);
})();
const G_TD: number[][] = PROPORTIONS.map((p) => NODES.map((__, j) => (j === 0 ? p : 0)));

/** G for OLS: the orthogonal projection onto the coherent subspace. */
const G_OLS = matmul(invert(matmul(St, S)), St);

/** G for MinT with a diagonal W — generalised least squares by error variance. */
const G_MINT = (() => {
  const wInv = FITS.map((f) => 1 / Math.max(f.variance, 1e-6));
  const StWi = St.map((row) => row.map((v, j) => v * wInv[j]));
  return matmul(invert(matmul(StWi, S)), StWi);
})();

const G_OF: Record<Exclude<Method, "base">, number[][]> = {
  bu: G_BU,
  td: G_TD,
  ols: G_OLS,
  mint: G_MINT,
};

/** Every method is the same projection with a different G. */
function reconcile(method: Method, yhat: number[]): number[] {
  if (method === "base") return yhat;
  return matvec(S, matvec(G_OF[method], yhat));
}

/** Forecasts for every node at every horizon, under one method. */
function reconciledPath(method: Method): number[][] {
  const cols = Array.from({ length: H }, (_, h) => reconcile(method, BASE.map((row) => row[h])));
  return NODES.map((_, i) => cols.map((c) => c[i]));
}

const PATHS: Record<Method, number[][]> = {
  base: reconciledPath("base"),
  bu: reconciledPath("bu"),
  td: reconciledPath("td"),
  ols: reconciledPath("ols"),
  mint: reconciledPath("mint"),
};

/** Coherence gap at each horizon: total forecast minus the sum of the leaves. */
const GAP = Array.from({ length: H }, (_, h) => {
  const total = BASE[0][h];
  const leaves = LEAVES.reduce((s, _, i) => s + BASE[3 + i][h], 0);
  return { total, leaves, gap: total - leaves, pct: ((total - leaves) / leaves) * 100 };
});

/* ------------------------------------------------------------- evaluation */

/**
 * Average squared error per node over many independent draws of the future.
 * One test window cannot separate these methods — the differences are smaller
 * than the sampling noise — so the comparison is a Monte-Carlo expectation.
 */
const ACCURACY: Record<Method, number[]> = (() => {
  const methods: Method[] = ["base", "bu", "td", "ols", "mint"];
  const sse: Record<string, number[]> = Object.fromEntries(
    methods.map((m) => [m, Array(N).fill(0) as number[]]),
  );
  for (let r = 0; r < REPLICATIONS; r++) {
    const future = aggregate(simulate(SEED + 1000 + r, H, T));
    for (const m of methods)
      for (let i = 0; i < N; i++)
        for (let h = 0; h < H; h++) sse[m][i] += (PATHS[m][i][h] - future[i][h]) ** 2;
  }
  return Object.fromEntries(
    methods.map((m) => [m, sse[m].map((v) => Math.sqrt(v / (REPLICATIONS * H)))]),
  ) as Record<Method, number[]>;
})();

/** Mean RMSE within a level of the hierarchy. */
function levelRmse(method: Method, level: number): number {
  const idx = LEVEL_OF.map((l, i) => (l === level ? i : -1)).filter((i) => i >= 0);
  return idx.reduce((s, i) => s + ACCURACY[method][i], 0) / idx.length;
}

const BEST_OVERALL = (["base", "bu", "td", "ols", "mint"] as Method[])
  .map((m) => ({ m, score: [0, 1, 2].reduce((s, l) => s + levelRmse(m, l), 0) / 3 }))
  .sort((a, b) => a.score - b.score)[0];

/* ------------------------------------------------------------ svg helpers */

const fmt0 = (n: number) => Math.round(n).toLocaleString("en-US");
const fmt1 = (n: number) => n.toFixed(1);

interface NodePos {
  x: number;
  y: number;
}
/** Tree layout: total on top, regions, then the five stores. */
const TREE: NodePos[] = [
  { x: 340, y: 34 },
  { x: 200, y: 104 },
  { x: 500, y: 104 },
  { x: 90, y: 186 },
  { x: 200, y: 186 },
  { x: 310, y: 186 },
  { x: 450, y: 186 },
  { x: 560, y: 186 },
];
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 6],
  [2, 7],
];

/* ---------------------------------------------------------------- phases */

const PHASES: GuidedPhase[] = [
  { id: "problem", label: "The incoherence problem", tone: "teal" },
  { id: "fix", label: "Reconciliation", tone: "brand", numberPrefix: "R" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "problem",
    label: "The hierarchy",
    title: "Business forecasting is never one series",
    body: (
      <>
        <p>
          {M} stores roll up into {REGIONS.length} regions and one national total — {N} series in
          all, but only <strong>{M} of them are free</strong>. Every aggregate is a fixed sum of the
          leaves, encoded in the <strong>summing matrix S</strong>: {N} rows, {M} columns, one row
          per node.
        </p>
        <p>
          That constraint is not a modelling choice, it is arithmetic about the business. Any set of
          forecasts that violates it is describing a world that cannot happen — and that is
          precisely what independent models produce.
        </p>
      </>
    ),
    hint: "Click any node to follow it through the walkthrough. S is shown beside the tree; every row is one node written as a sum of stores.",
  },
  {
    phase: "problem",
    label: "Forecast each node",
    title: "Forecast every node with its own model",
    body: (
      <>
        <p>
          The obvious approach, and the one most organisations actually run: a separate model per
          node, each tuned on its own history. Here that is a damped-trend exponential smoother with
          its own <code>α</code>, <code>β</code> and <code>φ</code> grid-searched per series.
        </p>
        <p>
          Each forecast is individually defensible. The store team can explain theirs, the national
          team can explain theirs, and nobody has done anything wrong. The problem only appears when
          you put them in the same spreadsheet.
        </p>
      </>
    ),
    hint: "Note the fitted parameters differ per node — that difference is the whole cause of what happens next.",
  },
  {
    phase: "problem",
    label: "They disagree",
    title: "The forecasts do not add up",
    body: (
      <>
        <p>
          Sum the {M} store forecasts and compare with the national forecast. They differ by{" "}
          <strong>{fmt0(Math.abs(GAP[H - 1].gap))} units</strong> at day {H} —{" "}
          {Math.abs(GAP[H - 1].pct).toFixed(1)}% of the total. Nothing was misconfigured; fitting
          each series separately makes the parameters a <em>nonlinear</em> function of that series,
          and the forecast of a sum stops being the sum of the forecasts.
        </p>
        <p>
          Now the plan contradicts itself. The warehouse orders against the national number, the
          stores staff against theirs, and the difference shows up as either stockouts or waste. The
          reconciliation methods below all exist to remove this gap — the question is what each of
          them costs you to do it.
        </p>
      </>
    ),
    hint: "The shaded band is the disagreement. It grows with the horizon, because the trend terms diverge as they extrapolate.",
  },
  {
    phase: "fix",
    label: "Bottom-up / top-down",
    title: "The two cheap fixes, and what each throws away",
    body: (
      <>
        <p>
          <strong>Bottom-up</strong> keeps the leaf forecasts and adds them up. It preserves local
          detail and it ignores the aggregate model entirely — including the fact that the total is
          the easiest series to forecast, because noise cancels when you add stores together.
        </p>
        <p>
          <strong>Top-down</strong> does the reverse: forecast the total, split it by historical
          proportions. Stable, and it flattens every store into the average shape. Store A3 is in
          decline here; top-down cannot represent that, because its share of the total is a single
          fixed number.
        </p>
      </>
    ),
    hint: "Switch methods above and watch the declining store: top-down gives it the same growth as everyone else.",
  },
  {
    phase: "fix",
    label: "Optimal reconciliation",
    title: "Use every forecast, weighted by how much you trust it",
    body: (
      <>
        <p>
          Both cheap fixes discard information — one throws away the aggregate models, the other
          throws away the leaf models. <strong>Optimal reconciliation</strong> keeps all {N} and
          projects them onto the coherent subspace: <code>ỹ = S(SᵀW⁻¹S)⁻¹SᵀW⁻¹ŷ</code>. Every method
          on this page is that same expression with a different <code>G</code>; bottom-up and
          top-down are just very opinionated choices of it.
        </p>
        <p>
          With <code>W = I</code> this is the plain <strong>OLS</strong> projection — the nearest
          coherent point. <strong>MinT</strong> sets W from each model&rsquo;s own in-sample error
          variance, so a node that forecasts itself badly is pulled harder into line by the nodes
          that do not.
        </p>
      </>
    ),
    hint: "The variance column is where MinT differs from OLS: it is the trust weight each node gets in the projection.",
  },
  {
    phase: "fix",
    label: "Which one wins",
    title: "Judge it over many futures, not one",
    body: (
      <>
        <p>
          Accuracy is averaged over <strong>{REPLICATIONS} independent draws</strong> of the next{" "}
          {H} days. That matters: on any single test window the gap between these methods is
          smaller than the sampling noise, so one backtest will happily crown whichever method got
          lucky.
        </p>
        <p>
          Read the table by level rather than overall. The methods do not differ by a constant —
          each one is good at the level it takes its information from, which is the actual reason to
          prefer a projection that uses all of them.
        </p>
      </>
    ),
    hint: "Compare a method's column across the three rows: winning at the total and losing at the store level is the normal pattern, not a bug.",
  },
];

const S_TREE = 0;
const S_FORECAST = 1;
const S_GAP = 2;
const S_SIMPLE = 3;
const S_OPTIMAL = 4;
const S_COMPARE = 5;

/* ------------------------------------------------------------------ view */

export function HierarchicalForecastViz({ className }: { className?: string }) {
  const [method, setMethod] = useState<Method>("mint");
  const [node, setNode] = useState(0);

  const path = PATHS[method];
  const coherent = useMemo(() => {
    const leaves = LEAVES.reduce((s, _, i) => s + path[3 + i][H - 1], 0);
    return Math.abs(path[0][H - 1] - leaves) < 0.5;
  }, [path]);

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        method
      </span>
      {(["base", "bu", "td", "ols", "mint"] as Method[]).map((m) => (
        <VizButton key={m} onClick={() => setMethod(m)} active={method === m}>
          {m === "base" ? "base" : m === "bu" ? "bottom-up" : m === "td" ? "top-down" : m.toUpperCase()}
        </VizButton>
      ))}
    </>
  );

  /* -------------------------------------------------------------- stages */

  /** The hierarchy, with per-node numbers that follow the selected method. */
  const tree = (showForecast: boolean) => (
    <g>
      {EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={TREE[a].x}
          y1={TREE[a].y + 14}
          x2={TREE[b].x}
          y2={TREE[b].y - 14}
          stroke={VIZ.grid}
          strokeWidth={1}
        />
      ))}
      {NODES.map((label, i) => {
        const on = i === node;
        const w = i === 0 ? 104 : 96;
        return (
          <g key={label} className="cursor-pointer" onClick={() => setNode(i)}>
            <rect
              x={TREE[i].x - w / 2}
              y={TREE[i].y - 14}
              width={w}
              height={showForecast ? 34 : 28}
              rx={5}
              fill={on ? VIZ.brand : VIZ.card}
              opacity={on ? 0.25 : 0.9}
              stroke={on ? VIZ.brand : VIZ.grid}
            />
            <text
              x={TREE[i].x}
              y={TREE[i].y + 2}
              textAnchor="middle"
              fill={VIZ.textBright}
              className="font-mono text-[10px]"
            >
              {label}
            </text>
            {showForecast && (
              <text
                x={TREE[i].x}
                y={TREE[i].y + 15}
                textAnchor="middle"
                fill={LEVEL_OF[i] === 2 ? VIZ.teal : VIZ.brandLight}
                className="font-mono text-[9.5px]"
              >
                {fmt0(path[i][H - 1])}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );

  /** Step 01 — hierarchy plus the summing matrix. */
  const treeStage = () => (
    <svg viewBox="0 0 680 300" className="block w-full" role="img" aria-label="The store hierarchy and its summing matrix">
      {tree(false)}
      <text x={40} y={238} fill={VIZ.textBright} className="font-mono text-[10px]">
        summing matrix S · {N} × {M}
      </text>
      {S.map((row, i) => (
        <g key={i}>
          {row.map((v, j) => (
            <rect
              key={j}
              x={196 + j * 16}
              y={248 + i * 6}
              width={14}
              height={5}
              rx={1}
              fill={v ? VIZ.brand : VIZ.grid}
              opacity={v ? 0.9 : 0.5}
            />
          ))}
          <text x={190} y={253 + i * 6} textAnchor="end" fill={VIZ.text} className="font-mono text-[7px]">
            {NODES[i]}
          </text>
        </g>
      ))}
      <text x={330} y={266} fill={VIZ.text} className="font-mono text-[9px]">
        {N} series, but only {M} degrees of freedom —
      </text>
      <text x={330} y={280} fill={VIZ.text} className="font-mono text-[9px]">
        every aggregate is a fixed sum of the stores
      </text>
    </svg>
  );

  /** Step 02 — the tree with base forecasts and fitted parameters. */
  const forecastStage = () => (
    <svg viewBox="0 0 680 310" className="block w-full" role="img" aria-label="Independent forecasts at every node, with each node's fitted parameters">
      {tree(true)}
      <text x={40} y={238} fill={VIZ.textBright} className="font-mono text-[10px]">
        fitted independently · day {H} forecast
      </text>
      {NODES.map((label, i) => (
        <g key={label}>
          <text x={40} y={256 + i * 13} fill={i === node ? VIZ.brandLight : VIZ.text} className="font-mono text-[9px]">
            {label}
          </text>
          <text x={150} y={256 + i * 13} fill={VIZ.text} className="font-mono text-[9px]">
            α {FITS[i].alpha.toFixed(2)}
          </text>
          <text x={222} y={256 + i * 13} fill={VIZ.text} className="font-mono text-[9px]">
            β {FITS[i].beta.toFixed(2)}
          </text>
          <text x={294} y={256 + i * 13} fill={VIZ.text} className="font-mono text-[9px]">
            φ {FITS[i].phi.toFixed(2)}
          </text>
          <text x={392} y={256 + i * 13} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
            σ² {fmt0(FITS[i].variance)}
          </text>
        </g>
      ))}
      <text x={420} y={256} fill={VIZ.text} className="font-mono text-[9px]">
        every node picked different parameters,
      </text>
      <text x={420} y={270} fill={VIZ.text} className="font-mono text-[9px]">
        so the models are not linear in the data —
      </text>
      <text x={420} y={284} fill={VIZ.rose} className="font-mono text-[9px]">
        the forecast of a sum ≠ the sum of forecasts
      </text>
    </svg>
  );

  /** Step 03 — the coherence gap over the horizon. */
  const gapStage = () => {
    const lo = Math.min(...GAP.map((g) => Math.min(g.total, g.leaves)));
    const hi = Math.max(...GAP.map((g) => Math.max(g.total, g.leaves)));
    const pad = (hi - lo) * 0.6 + 1;
    const box = { x: 60, y: 34, w: 580, h: 190 };
    const px = (h: number) => box.x + (h / (H - 1)) * box.w;
    const py = (v: number) => box.y + box.h - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * box.h;
    const line = (get: (g: (typeof GAP)[number]) => number) =>
      GAP.map((g, h) => `${h === 0 ? "M" : "L"}${px(h).toFixed(1)} ${py(get(g)).toFixed(1)}`).join("");
    return (
      <svg viewBox="0 0 680 280" className="block w-full" role="img" aria-label="The national forecast against the sum of the store forecasts, and the gap between them">
        <path
          d={`${line((g) => g.total)}${GAP.map((g, h) => `L${px(H - 1 - h).toFixed(1)} ${py(GAP[H - 1 - h].leaves).toFixed(1)}`).join("")}Z`}
          fill={VIZ.rose}
          opacity={0.16}
        />
        <path d={line((g) => g.total)} fill="none" stroke={VIZ.brandLight} strokeWidth={1.6} />
        <path d={line((g) => g.leaves)} fill="none" stroke={VIZ.teal} strokeWidth={1.6} />
        <text x={box.x} y={22} fill={VIZ.brandLight} className="font-mono text-[10px]">
          national model
        </text>
        <text x={box.x + 130} y={22} fill={VIZ.teal} className="font-mono text-[10px]">
          sum of the {M} store models
        </text>
        <text x={box.x + box.w} y={22} textAnchor="end" fill={VIZ.rose} className="font-mono text-[10px]">
          gap {fmt0(GAP[H - 1].gap)} units ({GAP[H - 1].pct.toFixed(1)}%) at day {H}
        </text>
        {[1, 7, 14].map((d) => (
          <text key={d} x={px(d - 1)} y={box.y + box.h + 16} textAnchor="middle" fill={VIZ.text} className="font-mono text-[9px]">
            day {d}
          </text>
        ))}
        {[lo - pad, hi + pad].map((v, i) => (
          <text key={i} x={box.x - 8} y={py(v) + 3} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
            {fmt0(v)}
          </text>
        ))}
        <text x={box.x} y={box.y + box.h + 36} fill={VIZ.text} className="font-mono text-[9px]">
          both lines are defensible forecasts · only one of them can be the plan
        </text>
      </svg>
    );
  };

  /** Steps R1–R3 — the selected node's history and forecast under the method. */
  const methodStage = (withTable: boolean) => {
    const hist = HISTORY[node].slice(-40);
    const fc = path[node];
    const lo = Math.min(...hist, ...fc);
    const hi = Math.max(...hist, ...fc);
    const pad = (hi - lo) * 0.12 + 1;
    const box = { x: 60, y: 30, w: 580, h: withTable ? 120 : 190 };
    const total = hist.length + H;
    const px = (i: number) => box.x + (i / (total - 1)) * box.w;
    const py = (v: number) => box.y + box.h - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * box.h;
    return (
      <svg viewBox={`0 0 680 ${withTable ? 300 : 250}`} className="block w-full" role="img" aria-label={`Forecast for ${NODES[node]} under ${METHOD_LABEL[method]}`}>
        <path
          d={hist.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join("")}
          fill="none"
          stroke={VIZ.text}
          strokeWidth={1}
          opacity={0.75}
        />
        <path
          d={`M${px(hist.length - 1).toFixed(1)} ${py(hist[hist.length - 1]).toFixed(1)}${fc
            .map((v, h) => `L${px(hist.length + h).toFixed(1)} ${py(v).toFixed(1)}`)
            .join("")}`}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.8}
        />
        {method !== "base" && (
          <path
            d={`M${px(hist.length - 1).toFixed(1)} ${py(hist[hist.length - 1]).toFixed(1)}${PATHS.base[node]
              .map((v, h) => `L${px(hist.length + h).toFixed(1)} ${py(v).toFixed(1)}`)
              .join("")}`}
            fill="none"
            stroke={VIZ.axis}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
        <line x1={px(hist.length - 1)} y1={box.y} x2={px(hist.length - 1)} y2={box.y + box.h} stroke={VIZ.axis} strokeWidth={0.6} strokeDasharray="2 3" />
        <text x={box.x} y={20} fill={VIZ.textBright} className="font-mono text-[10px]">
          {NODES[node]} · {METHOD_LABEL[method]}
        </text>
        <text x={box.x + box.w} y={20} textAnchor="end" fill={coherent ? VIZ.teal : VIZ.rose} className="font-mono text-[10px]">
          {coherent ? "coherent ✓" : `incoherent · ${fmt0(GAP[H - 1].gap)} units adrift`}
        </text>

        {withTable && (
          <>
            <text x={60} y={186} fill={VIZ.textBright} className="font-mono text-[10px]">
              the same projection, four different G
            </text>
            {(["bu", "td", "ols", "mint"] as Method[]).map((m, i) => (
              <g key={m}>
                <rect
                  x={60}
                  y={196 + i * 24}
                  width={580}
                  height={20}
                  rx={4}
                  fill={m === method ? VIZ.brand : VIZ.card}
                  opacity={m === method ? 0.18 : 0.5}
                />
                <text x={70} y={210 + i * 24} fill={VIZ.textBright} className="font-mono text-[9.5px]">
                  {METHOD_LABEL[m]}
                </text>
                <text x={230} y={210 + i * 24} fill={VIZ.text} className="font-mono text-[9px]">
                  {m === "bu"
                    ? "G reads the leaves only"
                    : m === "td"
                      ? "G reads the total only"
                      : m === "ols"
                        ? "G = (SᵀS)⁻¹Sᵀ — all nodes, equal trust"
                        : "G = (SᵀW⁻¹S)⁻¹SᵀW⁻¹ — weighted by error variance"}
                </text>
                <text x={632} y={210 + i * 24} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
                  {fmt0(PATHS[m][node][H - 1])}
                </text>
              </g>
            ))}
          </>
        )}
      </svg>
    );
  };

  /** Step R3 — the accuracy table. */
  const compareStage = () => {
    const methods: Method[] = ["base", "bu", "td", "ols", "mint"];
    const cellW = 100;
    return (
      <svg viewBox="0 0 680 260" className="block w-full" role="img" aria-label="Forecast RMSE by hierarchy level for each reconciliation method">
        <text x={40} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          RMSE over {REPLICATIONS} draws of the next {H} days · lower is better
        </text>
        {methods.map((m, j) => (
          <text
            key={m}
            x={148 + j * cellW + cellW / 2}
            y={52}
            textAnchor="middle"
            fill={m === method ? VIZ.brandLight : VIZ.text}
            className="font-mono text-[9px]"
          >
            {m === "base" ? "base" : m === "bu" ? "bottom-up" : m === "td" ? "top-down" : m.toUpperCase()}
          </text>
        ))}
        {[0, 1, 2].map((lvl, i) => {
          const vals = methods.map((m) => levelRmse(m, lvl));
          const best = Math.min(...vals);
          const worst = Math.max(...vals);
          return (
            <g key={lvl}>
              <text x={40} y={80 + i * 42} fill={VIZ.textBright} className="font-mono text-[10px]">
                {LEVEL_NAMES[lvl]}
              </text>
              {vals.map((v, j) => {
                const isBest = Math.abs(v - best) < 1e-9;
                return (
                  <g key={j}>
                    <rect
                      x={148 + j * cellW + 4}
                      y={66 + i * 42}
                      width={cellW - 8}
                      height={30}
                      rx={4}
                      fill={isBest ? VIZ.teal : VIZ.card}
                      opacity={isBest ? 0.2 : 0.55}
                      stroke={isBest ? VIZ.teal : "transparent"}
                      strokeOpacity={0.5}
                    />
                    <rect
                      x={148 + j * cellW + 8}
                      y={88 + i * 42}
                      width={Math.max(
                        0,
                        (cellW - 16) * (1 - (v - best) / (worst - best || 1)) * 0.92,
                      )}
                      height={4}
                      rx={2}
                      fill={isBest ? VIZ.teal : VIZ.brand}
                      opacity={0.7}
                    />
                    <text
                      x={148 + j * cellW + cellW / 2}
                      y={84 + i * 42}
                      textAnchor="middle"
                      fill={isBest ? VIZ.teal : VIZ.textBright}
                      className="font-mono text-[10px]"
                    >
                      {fmt1(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <text x={40} y={214} fill={VIZ.text} className="font-mono text-[9px]">
          coherent: {methods.filter((m) => m !== "base").map((m) => METHOD_LABEL[m].split(" ")[0]).join(", ")} · incoherent: base
        </text>
        <text x={40} y={232} fill={VIZ.text} className="font-mono text-[9px]">
          best average across the three levels: {METHOD_LABEL[BEST_OVERALL.m]} at {fmt1(BEST_OVERALL.score)}
        </text>
      </svg>
    );
  };

  const stage = (i: number) => {
    if (i === S_TREE) return treeStage();
    if (i === S_FORECAST) return forecastStage();
    if (i === S_GAP) return gapStage();
    if (i === S_SIMPLE) return methodStage(false);
    if (i === S_OPTIMAL) return methodStage(true);
    return compareStage();
  };

  /* --------------------------------------------------------------- panel */

  const panel = (i: number) => (
    <>
      <PanelTitle>What the hierarchy has established so far</PanelTitle>
      <div className="flex flex-wrap gap-2.5">
        <GuidedCard label="structure" accent={VIZ.teal}>
          {N} nodes, <Num>{M}</Num> degrees of freedom · S is {N} × {M}.
        </GuidedCard>

        {i >= S_FORECAST && (
          <GuidedCard label="base forecasts" accent={VIZ.brandLight}>
            {N} independent damped-trend models, each with its own α, β, φ.
          </GuidedCard>
        )}

        {i >= S_GAP && (
          <GuidedCard label="incoherence" accent={VIZ.rose}>
            Total minus sum of stores = <Num>{fmt0(GAP[H - 1].gap)}</Num> units (
            {GAP[H - 1].pct.toFixed(1)}%) at day {H}.
          </GuidedCard>
        )}

        {i >= S_SIMPLE && (
          <GuidedCard label="method" accent={VIZ.orange}>
            <Num>{METHOD_LABEL[method]}</Num> · {coherent ? "coherent" : "not coherent"}.
          </GuidedCard>
        )}

        {i >= S_COMPARE && (
          <GuidedCard label="accuracy" accent={VIZ.yellow}>
            RMSE at store level <Num>{fmt1(levelRmse(method, 2))}</Num> · total{" "}
            {fmt1(levelRmse(method, 0))}.
          </GuidedCard>
        )}
      </div>

      {i === S_GAP && (
        <GuidedPayoff label="the size of the problem">
          <strong className="font-semibold text-white">
            {fmt0(Math.abs(GAP[H - 1].gap))} units, {Math.abs(GAP[H - 1].pct).toFixed(1)}%
          </strong>{" "}
          — and growing with the horizon, from {Math.abs(GAP[0].pct).toFixed(1)}% on day 1. On this
          small, well-behaved hierarchy that is a gap you could argue about in a review meeting,
          which is exactly what makes it dangerous: nobody escalates it, and the warehouse and the
          stores go on planning against different numbers. Add levels, add heterogeneous models,
          and it compounds. The gap is also{" "}
          <strong className="font-semibold text-white">not evidence that either model is wrong</strong>{" "}
          — both fit their own series well. It is evidence that {N} models fitted separately do not
          describe one business.
        </GuidedPayoff>
      )}

      {i === S_COMPARE && (
        <GuidedPayoff label="what reconciliation actually buys">
          Every method except <em>base</em> is coherent, so the choice between them is purely about
          accuracy — and they differ by level, because each takes its information from a different
          place. Bottom-up inherits the leaf noise at the top; top-down inherits the aggregate&rsquo;s
          smoothness at the bottom and cannot represent a store that moves against the group. The
          projection methods use every model at once, which is why they are hard to beat at any
          single level and{" "}
          <strong className="font-semibold text-white">
            best on average here ({METHOD_LABEL[BEST_OVERALL.m]})
          </strong>
          .
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i === S_GAP)
      return (
        <>
          <GuidedLegend color={VIZ.brandLight}>national model</GuidedLegend>
          <GuidedLegend color={VIZ.teal}>sum of stores</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>disagreement</GuidedLegend>
        </>
      );
    if (i === S_SIMPLE || i === S_OPTIMAL)
      return (
        <>
          <GuidedLegend color={VIZ.text}>history</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>{METHOD_LABEL[method]}</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>base forecast</GuidedLegend>
        </>
      );
    if (i === S_COMPARE) return <GuidedLegend color={VIZ.teal}>best at this level</GuidedLegend>;
    return (
      <>
        <GuidedLegend color={VIZ.brand}>selected node</GuidedLegend>
        <GuidedLegend color={VIZ.grid}>aggregation edge</GuidedLegend>
      </>
    );
  };

  const stageNote = (i: number) => {
    if (i <= S_GAP) return `${N} nodes · ${H}-day horizon`;
    return `${NODES[node]} · ${METHOD_LABEL[method]}`;
  };

  return (
    <GuidedViz
      className={className}
      title="Hierarchical forecasting: making the numbers add up"
      caption="Five stores, two regions and a national total, forecast independently and then reconciled. The hierarchy is simulated, a damped-trend smoother is fitted per node with its own grid-searched parameters, and bottom-up, top-down, OLS and MinT are applied as the same projection S·G·ŷ with different G. The accuracy table averages over 200 draws of the future rather than one test window, because on a single window the differences between these methods are smaller than the noise."
      phases={PHASES}
      steps={STEPS}
      controls={controls}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
    />
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
      {children}
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-200">{children}</span>;
}
