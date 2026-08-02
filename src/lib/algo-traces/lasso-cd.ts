import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * Lasso by coordinate descent — the procedure this page derives conditions for
 * but never actually runs.
 *
 * The page states the optimality conditions (|∂RSS/∂w_j| ≤ λ keeps w_j at zero)
 * and shows sklearn's paths, but the mechanism that *produces* an exact zero is
 * one line: `soft(ρ, λ) = sign(ρ)·max(|ρ| − λ, 0)`. The `max(·, 0)` is the whole
 * source of sparsity, and it is worth watching fire.
 *
 * Three things here were measured and contradict a plausible reading of the page:
 *
 *  1. Two noise features have **marginal** correlations with y of 0.51 and 0.70,
 *     both well above λ = 0.25. They survive on marginal correlation and die on
 *     the *partial* residual — which is exactly why the algorithm recomputes r.
 *  2. The page says features "drop in order of decreasing relevance". Mostly
 *     true, but the correlated echo x₅ has a true weight of **zero** and outlives
 *     both x₁ (true 1.2) and x₂ (true 0.4).
 *  3. Coordinate descent needs 267 sweeps on this data and 5 on the same data
 *     with the correlation removed — a 53× penalty from one correlated pair.
 */

const CODE = codeLines(`
def soft(z, lam):
    # max(-, 0) is the whole source
    # of sparsity - nothing else zeroes
    return sign(z) * max(abs(z)-lam, 0)

def lasso_cd(X, y, lam, tol=1e-9):
    n, p = X.shape
    w = np.zeros(p)
    while True:
        delta = 0.0
        for j in range(p):
            r = y - X @ w
            # partial-residual corr
            rho = X[:, j] @ r / n + w[j]
            new = soft(rho, lam)
            delta = max(delta,
                        abs(new-w[j]))
            w[j] = new
        if delta < tol:
            return w
`);

const ln = lineFinder(CODE);

const N = 40;
const P = 6;
const TRUE = [3, 1.2, 0.4, 0, 0, 0];
const NAMES = ["x₀", "x₁", "x₂", "x₃", "x₄", "x₅"];
const LAM = 0.25;

const fmt = (x: number, d = 3) => x.toFixed(d).replace("-", "−");
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

/**
 * Six standardized features and a centred target. x₅ is a near-copy of x₀ with
 * a true weight of zero — the "correlated echo" the page's own example builds.
 * The echo column is always drawn so the RNG state, and therefore y, is
 * identical between the two variants; only which column is installed differs.
 */
function makeData(echo: boolean) {
  const rng = seededRng(7);
  const raw: number[][] = [];
  for (let j = 0; j < P; j++) raw.push(Array.from({ length: N }, () => gaussian(rng)));
  const independent = [...raw[5]];
  const echoCol = raw[0].map((v) => v + 0.25 * gaussian(rng));
  raw[5] = echo ? echoCol : independent;
  let y = Array.from({ length: N }, (_, i) =>
    raw.reduce((s, c, j) => s + c[i] * TRUE[j], 0) + 0.5 * gaussian(rng)
  );
  // Standardize each column to mean 0 and (1/n)Σx² = 1, so the coordinate
  // update collapses to w_j = soft(ρ_j, λ) with no denominator.
  const cols = raw.map((c) => {
    const m = mean(c);
    const d = c.map((v) => v - m);
    const s = Math.sqrt(d.reduce((a, v) => a + v * v, 0) / N);
    return d.map((v) => v / s);
  });
  const ym = mean(y);
  y = y.map((v) => v - ym);
  return { cols, y };
}

const DATA = makeData(true);
const INDEP = makeData(false);

const dotN = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0) / N;
const soft = (z: number, l: number) => Math.sign(z) * Math.max(Math.abs(z) - l, 0);

type Data = { cols: number[][]; y: number[] };
const predict = (d: Data, w: number[]) =>
  Array.from({ length: N }, (_, i) => d.cols.reduce((s, c, j) => s + c[i] * w[j], 0));
const objective = (d: Data, w: number[], lam: number) => {
  const p = predict(d, w);
  return (
    d.y.reduce((s, v, i) => s + (v - p[i]) ** 2, 0) / (2 * N) +
    lam * w.reduce((s, v) => s + Math.abs(v), 0)
  );
};

/** Marginal correlation of each column with y — what ρ equals while w is still 0. */
const MARGINAL = DATA.cols.map((c) => dotN(c, DATA.y));

type Upd = { sweep: number; j: number; rho: number; before: number; after: number; obj: number };

/** Run the listing, recording every single-coordinate update. */
function cd(d: Data, lam: number, tol = 1e-9, cap = 100_000) {
  const w = new Array(P).fill(0);
  const trail: Upd[] = [];
  let sweeps = 0;
  for (let s = 1; s <= cap; s++) {
    sweeps = s;
    let delta = 0;
    for (let j = 0; j < P; j++) {
      const p = predict(d, w);
      const r = d.y.map((v, i) => v - p[i]);
      const rho = dotN(d.cols[j], r) + w[j];
      const before = w[j];
      const after = soft(rho, lam);
      delta = Math.max(delta, Math.abs(after - before));
      w[j] = after;
      if (s <= 3) trail.push({ sweep: s, j, rho, before, after, obj: objective(d, w, lam) });
    }
    if (delta < tol) break;
  }
  return { w: [...w], trail, sweeps };
}

const RUN = cd(DATA, LAM);
const SWEEP1 = RUN.trail.filter((t) => t.sweep === 1);
const RUN_INDEP = cd(INDEP, LAM);

/** Ridge on the same design, solved exactly, for the never-reaches-zero contrast. */
function ridge(d: Data, lam: number) {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < P; i++) {
    A.push(d.cols.map((c, j) => dotN(d.cols[i], c) + (i === j ? lam : 0)));
    b.push(dotN(d.cols[i], d.y));
  }
  for (let i = 0; i < P; i++) {
    let piv = i;
    for (let k = i + 1; k < P; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k;
    [A[i], A[piv]] = [A[piv], A[i]];
    [b[i], b[piv]] = [b[piv], b[i]];
    for (let k = i + 1; k < P; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < P; j++) A[k][j] -= f * A[i][j];
      b[k] -= f * b[i];
    }
  }
  const x = new Array(P).fill(0);
  for (let i = P - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < P; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}

/** Regularization paths on a log-λ grid. */
const GRID: number[] = [];
for (let e = -2.6; e <= 0.65; e += 0.05) GRID.push(10 ** e);
const LASSO_PATH = GRID.map((l) => cd(DATA, l, 1e-8).w);
const RIDGE_PATH = GRID.map((l) => ridge(DATA, l));
const RIDGE_ZEROS = RIDGE_PATH.flat().filter((v) => v === 0).length;
const RIDGE_MIN = Math.min(...RIDGE_PATH.flat().map(Math.abs));

/** The λ at which each coefficient first becomes exactly zero. */
const DEATH = Array.from({ length: P }, (_, j) => {
  const i = LASSO_PATH.findIndex((w) => w[j] === 0);
  return i < 0 ? Infinity : GRID[i];
});
const ORDER = [...Array(P).keys()].sort((a, b) => DEATH[a] - DEATH[b]);

const CORR_PAIR = dotN(DATA.cols[0], DATA.cols[5]);
const CORR_PAIR_INDEP = dotN(INDEP.cols[0], INDEP.cols[5]);

const SHOW_LAMS = [0.05, 0.2, 0.5, 1.0, 2.0];
const TABLE_ROWS = SHOW_LAMS.map((l) => ({ lam: l, w: cd(DATA, l, 1e-8).w, r: ridge(DATA, l) }));

// ---------------------------------------------------------------------------

/** soft(ρ, λ) against ρ, with the ridge shrink overlaid. */
const THRESH_PLOT: TraceComponent = {
  t: "plot",
  label: "soft(ρ, λ) in violet · ridge's ρ/(1+λ) in yellow",
  domain: [-1.5, 1.5, -1.3, 1.3],
  xLabel: "ρ",
  yLabel: "w",
  segments: [
    { x1: -1.5, y1: 0, x2: 1.5, y2: 0, cls: "dim" },
    { x1: -LAM, y1: -1.3, x2: -LAM, y2: 1.3, cls: "bad", dashed: true },
    { x1: LAM, y1: -1.3, x2: LAM, y2: 1.3, cls: "bad", dashed: true },
  ],
  curves: [
    {
      pts: Array.from({ length: 121 }, (_, i) => {
        const r = -1.5 + (3 * i) / 120;
        return { x: r, y: soft(r, LAM) };
      }),
      cls: "active",
    },
    {
      pts: Array.from({ length: 121 }, (_, i) => {
        const r = -1.5 + (3 * i) / 120;
        return { x: r, y: r / (1 + LAM) };
      }),
      cls: "warn",
    },
  ],
};

function pathPlot(label: string, path: number[][], cls: TraceCls): TraceComponent {
  return {
    t: "plot",
    label,
    domain: [-2.6, 0.65, -0.2, 3.1],
    xLabel: "log₁₀ λ",
    yLabel: "w",
    segments: [{ x1: -2.6, y1: 0, x2: 0.65, y2: 0, cls: "dim", dashed: true }],
    curves: Array.from({ length: P }, (_, j) => ({
      pts: GRID.map((l, i) => ({ x: Math.log10(l), y: path[i][j] })),
      cls: (j === 0 || j === 5 ? cls : "dim") as TraceCls,
    })),
  };
}

/** w partway through sweep 1: coordinates 0..j updated, the rest still zero. */
const wAfter = (j: number) =>
  Array.from({ length: P }, (_, k) => (k <= j ? SWEEP1[k].after : 0));

/**
 * `visited` is how far sweep 1 has got. Coordinates past it are still at their
 * initial zero and must not be labelled as *thresholded* to zero — only a
 * coordinate the loop has actually reached and clamped earns that annotation.
 */
const wTable = (label: string, w: number[], visited: number): TraceComponent => ({
  t: "bars",
  label,
  v: w.map((v, j) => {
    const seen = j <= visited;
    const zeroed = seen && v === 0;
    return {
      k: NAMES[j],
      val: Math.abs(v),
      show: zeroed ? `${fmt(v, 4)}  ← exactly zero` : seen ? fmt(v, 4) : `${fmt(v, 4)}  (not yet reached)`,
      cls: (zeroed ? "bad" : !seen ? "dim" : j === 5 ? "warn" : "good") as TraceCls,
    };
  }),
  max: 3.1,
});

// ---------------------------------------------------------------------------

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Six standardized features, forty rows, and the objective (1/2n)‖y − Xw‖² + λ‖w‖₁ with λ = ${LAM}. Standardizing so that (1/n)Σxⱼ² = 1 is what makes the coordinate update collapse to a single line later. Three features carry real signal (true weights ${TRUE.slice(0, 3).join(", ")}); x₃ and x₄ are pure noise; **x₅ is a near-copy of x₀** — correlation ${fmt(CORR_PAIR, 3)} — with a true weight of zero. Start from w = 0, so the residual is just y and every ρⱼ is the plain correlation of a column with the target.`,
    ln("def lasso_cd", "w = np.zeros(p)"),
    {
      t: "table",
      label: "the design",
      head: ["", "true w", "corr(xⱼ, y)", "role"],
      v: NAMES.map((n, j) => ({
        cells: [n, String(TRUE[j]), fmt(MARGINAL[j], 4), j < 3 ? "signal" : j === 5 ? "echo of x₀" : "noise"],
        cls: (j === 5 ? "warn" : j < 3 ? "good" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `Look at the noise rows before going on: x₃ and x₄ correlate ${fmt(MARGINAL[3], 2)} and ${fmt(MARGINAL[4], 2)} with y — both comfortably above λ = ${LAM}. On marginal correlation alone they would survive.`,
    }
  );

  push(
    `The one function that matters. soft(ρ, λ) = sign(ρ)·max(|ρ| − λ, 0) subtracts λ from the magnitude and **clamps at zero** — so for any ρ inside the dashed band [−λ, λ] the output is not merely small, it is exactly 0.0. In yellow is what Ridge's coordinate update does instead, ρ/(1+λ): a straight line through the origin that is never flat and never zero for nonzero ρ. This is the page's "constant force versus proportional force" in one picture: L1 subtracts a fixed λ, L2 multiplies by a fixed factor.`,
    ln("return sign(z) * max(abs(z)-lam, 0)"),
    THRESH_PLOT,
    {
      t: "table",
      label: `both updates at λ = ${LAM}`,
      head: ["ρ", "soft(ρ, λ)", "ρ/(1+λ)"],
      v: [1.0, 0.5, 0.25, 0.1, 0.01].map((r) => ({
        cells: [fmt(r, 2), fmt(soft(r, LAM), 4), fmt(r / (1 + LAM), 4)],
        cls: (soft(r, LAM) === 0 ? "bad" : "dim") as TraceCls,
      })),
    }
  );

  const u0 = SWEEP1[0];
  push(
    `First coordinate. With w still all zeros the residual is y, so ρ₀ = corr(x₀, y) = ${fmt(u0.rho, 5)}. Soft-thresholding subtracts exactly λ: w₀ = ${fmt(u0.rho, 5)} − ${LAM} = ${fmt(u0.after, 5)}. That subtraction is the *bias* Lasso pays for sparsity — even a feature this strong comes back shrunk by λ, every time. The objective falls to ${fmt(u0.obj, 5)}.`,
    ln("rho = X[:, j] @ r / n + w[j]", "new = soft(rho, lam)"),
    wTable("w after updating x₀", wAfter(0), 0),
    {
      t: "kv",
      label: "coordinate 0",
      v: [
        { k: "ρ₀", v: fmt(u0.rho, 5), cls: "active" },
        { k: "λ", v: String(LAM) },
        { k: "w₀ = soft(ρ₀, λ)", v: fmt(u0.after, 5), cls: "good" },
        { k: "objective", v: fmt(u0.obj, 5) },
      ],
    }
  );

  push(
    `Coordinates 1 and 2, and here is the part that makes this *coordinate* descent rather than six independent fits: before each update the residual is recomputed against the weights already set. x₁'s marginal correlation was ${fmt(MARGINAL[1], 4)}, but with x₀ now explaining part of y its partial-residual ρ is ${fmt(SWEEP1[1].rho, 4)} — and x₂ moves from ${fmt(MARGINAL[2], 4)} to ${fmt(SWEEP1[2].rho, 4)}. Each coordinate is solved exactly, given the others; the loop is what couples them.`,
    ln("r = y - X @ w", "rho = X[:, j] @ r / n + w[j]"),
    wTable("w after x₀, x₁, x₂", wAfter(2), 2),
    {
      t: "table",
      label: "marginal ρ versus partial-residual ρ",
      head: ["", "corr(xⱼ, y)", "ρ at update time", "w"],
      v: [1, 2].map((j) => ({
        cells: [NAMES[j], fmt(MARGINAL[j], 4), fmt(SWEEP1[j].rho, 4), fmt(SWEEP1[j].after, 4)],
        cls: "good" as TraceCls,
      })),
    }
  );

  push(
    `Now the two noise features, and this is the frame the whole trace exists for. Their **marginal** correlations were ${fmt(MARGINAL[3], 3)} and ${fmt(MARGINAL[4], 3)}, both above λ. But x₀, x₁ and x₂ have already absorbed the signal they were echoing, so by the time the loop reaches them their partial-residual ρ has collapsed to ${fmt(SWEEP1[3].rho, 5)} and ${fmt(SWEEP1[4].rho, 5)}. Both are inside [−λ, λ], so \`max(|ρ| − λ, 0)\` returns **0.0 exactly** — not 10⁻⁸, not "small", zero. And the objective does not move at all: ${fmt(SWEEP1[2].obj, 5)} → ${fmt(SWEEP1[4].obj, 5)}. A coefficient that is exactly zero costs nothing to keep zero.`,
    ln("return sign(z) * max(abs(z)-lam, 0)", "w[j] = new"),
    wTable("w after the noise features", wAfter(4), 4),
    {
      t: "table",
      label: "why they died",
      head: ["", "marginal ρ", "partial ρ", "|ρ| ≤ λ?", "w"],
      v: [3, 4].map((j) => ({
        cells: [
          NAMES[j],
          fmt(MARGINAL[j], 3),
          fmt(SWEEP1[j].rho, 5),
          Math.abs(SWEEP1[j].rho) <= LAM ? "yes" : "no",
          fmt(SWEEP1[j].after, 4),
        ],
        cls: "bad" as TraceCls,
      })),
    },
    {
      t: "note",
      text: "This is why the algorithm recomputes r inside the loop rather than ranking features by their correlation with y once. Marginal correlation would have kept both of these.",
      cls: "warn",
    }
  );

  const u5 = SWEEP1[5];
  push(
    `Last coordinate of sweep 1, and it is the interesting one. x₅ is the echo: its marginal correlation with y is ${fmt(MARGINAL[5], 4)}, almost as high as x₀'s ${fmt(MARGINAL[0], 4)}, because it is ${fmt(CORR_PAIR, 3)} correlated with it. With x₀ already fitted, its partial ρ falls to ${fmt(u5.rho, 5)} — a hair above λ, so it survives with w₅ = ${fmt(u5.after, 5)}. It is not zero, and over the following sweeps it will *grow*, because x₀ and x₅ take turns claiming the shared signal.`,
    ln("rho = X[:, j] @ r / n + w[j]"),
    wTable("w at the end of sweep 1", wAfter(5), 5),
    {
      t: "kv",
      label: "the echo",
      v: [
        { k: "corr(x₀, x₅)", v: fmt(CORR_PAIR, 4), cls: "warn" },
        { k: "marginal ρ₅", v: fmt(MARGINAL[5], 4) },
        { k: "partial ρ₅", v: fmt(u5.rho, 5), cls: "active" },
        { k: "w₅", v: fmt(u5.after, 5), cls: "warn" },
      ],
    }
  );

  push(
    `Sweep until nothing moves. On this data that takes **${RUN.sweeps} sweeps** — and the reason is the correlated pair. Watch w₀ and w₅ hand the shared signal back and forth: each update of x₀ changes the residual x₅ sees, and vice versa, so the pair converges along a narrow valley one small step at a time. Rebuild the identical dataset with x₅ replaced by an independent column — same y, same λ, same everything else — and it converges in **${RUN_INDEP.sweeps}**. That is a ${fmt(RUN.sweeps / RUN_INDEP.sweeps, 0)}× penalty from a single correlated pair, which is why real implementations ship active-set tricks and covariance caching.`,
    ln("while True", "if delta < tol"),
    {
      t: "table",
      label: "w₀ and w₅ over the first sweeps",
      head: ["sweep", "w₀", "w₅", "w₀+w₅", "objective"],
      v: [1, 2, 3].map((s) => {
        const a = RUN.trail.filter((t) => t.sweep === s);
        const w0 = a[0].after;
        const w5 = a[5].after;
        return {
          cells: [String(s), fmt(w0, 4), fmt(w5, 4), fmt(w0 + w5, 4), fmt(a[5].obj, 6)],
          cls: "warn" as TraceCls,
        };
      }),
    },
    {
      t: "bars",
      label: "sweeps to converge (tol 10⁻⁹)",
      v: [
        { k: `correlated (r=${fmt(CORR_PAIR, 2)})`, val: RUN.sweeps, show: String(RUN.sweeps), cls: "bad" },
        {
          k: `independent (r=${fmt(CORR_PAIR_INDEP, 2)})`,
          val: RUN_INDEP.sweeps,
          show: String(RUN_INDEP.sweeps),
          cls: "good",
        },
      ],
    }
  );

  push(
    `Payoff one: sweep λ and compare the two penalties on the identical design. Lasso's coefficients hit zero and **stay** there — by λ = 2 only ${TABLE_ROWS[4].w.filter((v) => v !== 0).length} of 6 survive. Ridge's, solved exactly by (XᵀX + λI)⁻¹Xᵀy, never reach zero: across all ${GRID.length} grid points and ${P} coefficients that is **${RIDGE_ZEROS} exact zeros out of ${GRID.length * P}**, with the smallest magnitude anywhere on the path being ${RIDGE_MIN.toExponential(1)}. Small, but not zero — and a feature with a coefficient of 10⁻³ is still a feature you have to collect, store and serve.`,
    ln("return sign(z) * max(abs(z)-lam, 0)"),
    pathPlot("Lasso paths (x₀, x₅ highlighted)", LASSO_PATH, "active"),
    pathPlot("Ridge paths — same design, no zeros", RIDGE_PATH, "warn"),
    {
      t: "table",
      label: "non-zero coefficients at each λ",
      head: ["λ", "Lasso nnz", "Ridge nnz"],
      v: TABLE_ROWS.map((r) => ({
        cells: [
          String(r.lam),
          `${r.w.filter((v) => v !== 0).length}/6`,
          `${r.r.filter((v) => v !== 0).length}/6`,
        ],
        cls: "dim" as TraceCls,
      })),
    }
  );

  const echoRank = ORDER.indexOf(5);
  push(
    `Payoff two, and it is a correction. The page says features "drop in order of decreasing relevance", and mostly they do — the two pure-noise columns die first, at λ = ${fmt(DEATH[ORDER[0]], 4)} and ${fmt(DEATH[ORDER[1]], 4)}. But **x₅ has a true weight of zero and is the ${echoRank === 4 ? "second-to-last" : `${echoRank + 1}th`} to die**, outliving x₂ (true ${TRUE[2]}) and x₁ (true ${TRUE[1]}). Lasso does not rank by relevance to the *target*; it ranks by correlation with the current *residual*, and an echo of the strongest feature correlates with that residual almost as well as the original does. The two of them split the shared signal roughly ${Math.round((100 * TABLE_ROWS[1].w[0]) / (TABLE_ROWS[1].w[0] + TABLE_ROWS[1].w[5]))}/${Math.round((100 * TABLE_ROWS[1].w[5]) / (TABLE_ROWS[1].w[0] + TABLE_ROWS[1].w[5]))} rather than one taking it all.`,
    ln("rho = X[:, j] @ r / n + w[j]"),
    {
      t: "table",
      label: "elimination order",
      head: ["order", "", "true w", "dies at λ"],
      v: ORDER.map((j, i) => ({
        cells: [
          String(i + 1),
          NAMES[j],
          String(TRUE[j]),
          Number.isFinite(DEATH[j]) ? fmt(DEATH[j], 4) : "—",
        ],
        cls: (j === 5 ? "bad" : TRUE[j] === 0 ? "warn" : "good") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "So a zero from Lasso means “this column added nothing given the others”, not “this column is irrelevant”. With correlated predictors the surviving one is partly an accident of the design matrix — which is the whole argument for elastic net, and the reason Lasso selections are unstable across bootstrap resamples.",
      cls: "warn",
    }
  );

  return {
    id: "lasso-coordinate-descent",
    title: "Lasso by coordinate descent — where the exact zeros come from",
    caption:
      "This page derives the condition that keeps a weight at zero but never runs the algorithm that enforces it. Coordinate descent does it in one line: w_j = soft(ρ_j, λ), where the max(·, 0) inside soft is the only thing on the page capable of producing an exact zero — watch it fire on the two noise features in sweep 1, and compare against Ridge's ρ/(1+λ), which is never flat. Three measured results complicate the page's summary: both noise features have marginal correlations above λ and are killed only by the partial residual; the correlated echo has a true weight of zero yet outlives two genuinely relevant features; and the same data with that correlation removed converges in 5 sweeps instead of 267.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const lassoCdTrace = build();
