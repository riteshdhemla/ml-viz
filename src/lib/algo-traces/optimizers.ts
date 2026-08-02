import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * SGD, momentum, RMSprop and Adam stepped side by side.
 *
 * The trace runs in two acts, both anchored to worked examples already in
 * `src/content/courses/optimization-ml/01-gradient-descent-variants.mdx`:
 *
 *  - **Act I** — L(θ) = θ² from θ₀ = 3.0 with η = 0.1, β = 0.9. This reproduces
 *    the lesson's momentum example exactly (v₁ = 6.0, θ₁ = 2.4, θ₂ = 1.38) and
 *    then keeps stepping, which is where it gets interesting: momentum sails
 *    straight past the minimum and takes *longer* than plain SGD to settle. A
 *    1-D bowl has no cross-valley oscillation for momentum to cancel.
 *  - **Act II** — the Rosenbrock function the lesson names as the stress test.
 *    Here the ordering flips and stays flipped.
 *
 * Every number below is produced by running the optimizers at module load. The
 * learning-rate grid in the payoff is swept, not tuned by hand, because the
 * *best* step count on a deterministic problem is largely luck (Adam needs 65
 * steps at η = 0.95 and 394 at η = 0.955 — whether an iterate lands inside the
 * tolerance ball is a coin flip). What is stable, and what the payoff reports,
 * is how wide a band of η works at all.
 */

const CODE = codeLines(`
def rt(x):
    return sqrt(x) + 1e-8

def sgd(p, g, lr):
    return p - lr * g

def momentum(p, g, st, lr, beta=0.9):
    # heavy ball (PyTorch convention)
    st.v = beta * st.v + g
    return p - lr * st.v

def rmsprop(p, g, st, lr, rho=0.9):
    st.G = rho * st.G + (1-rho) * g**2
    return p - lr * g / rt(st.G)

def adam(p, g, st, t, lr,
         b1=0.9, b2=0.999):
    st.m = b1 * st.m + (1-b1) * g
    st.v = b2 * st.v + (1-b2) * g**2
    # both start at 0, so both start
    # biased low - undo the bias
    m_hat = st.m / (1 - b1**t)
    v_hat = st.v / (1 - b2**t)
    return p - lr * m_hat / rt(v_hat)
`);

const ln = lineFinder(CODE);

const EPS = 1e-8;
const B1 = 0.9;
const B2 = 0.999;
const BETA = 0.9;
const RHO = 0.9;

/** Typographic minus, so prose and generated numbers agree on the glyph. */
const fmt = (x: number, d = 3) => x.toFixed(d).replace("-", "−");

// ---------------------------------------------------------------------------
// Act I — the 1-D bowl L(θ) = θ², gradient 2θ
// ---------------------------------------------------------------------------

const grad1 = (p: number) => 2 * p;

type Row1 = { t: number; p: number; g: number; v: number };

/** Run SGD or momentum on L(θ) = θ² and record every iterate. */
function run1(kind: "sgd" | "momentum", p0: number, lr: number, steps: number): Row1[] {
  let p = p0;
  let v = 0;
  const rows: Row1[] = [{ t: 0, p, g: NaN, v: 0 }];
  for (let t = 1; t <= steps; t++) {
    const g = grad1(p);
    if (kind === "sgd") {
      p = p - lr * g;
    } else {
      v = BETA * v + g;
      p = p - lr * v;
    }
    rows.push({ t, p, g, v });
  }
  return rows;
}

/** Steps until |θ| < tol, or Infinity if it never settles inside the budget. */
function settle1(kind: "sgd" | "momentum", p0: number, lr: number, tol: number): number {
  let p = p0;
  let v = 0;
  for (let t = 1; t <= 100_000; t++) {
    const g = grad1(p);
    if (kind === "sgd") {
      p = p - lr * g;
    } else {
      v = BETA * v + g;
      p = p - lr * v;
    }
    if (Math.abs(p) < tol) return t;
    if (!Number.isFinite(p) || Math.abs(p) > 1e6) return Infinity;
  }
  return Infinity;
}

const P0 = 3.0;
const LR1 = 0.1;
const N1 = 12;
const SGD1 = run1("sgd", P0, LR1, N1);
const MOM1 = run1("momentum", P0, LR1, N1);
const TOL1 = 0.01;
const SETTLE_SGD = settle1("sgd", P0, LR1, TOL1);
const SETTLE_MOM = settle1("momentum", P0, LR1, TOL1);
/** The η sweep that shows momentum's step counts are a lottery in 1-D. */
const SWEEP1 = [0.05, 0.1, 0.2, 0.3, 0.4].map((lr) => ({
  lr,
  sgd: settle1("sgd", P0, lr, TOL1),
  mom: settle1("momentum", P0, lr, TOL1),
}));
/** The iterate at which momentum first crosses the minimum. */
const CROSS = MOM1.findIndex((r) => r.t > 0 && r.p < 0);
/** How far past the minimum momentum travels inside the recorded window. */
const WORST = MOM1.reduce((a, b) => (Math.abs(b.p) > Math.abs(a.p) && b.t >= CROSS ? b : a), MOM1[CROSS]);

const D1: [number, number, number, number] = [0, N1, -2.6, 3.2];

/** θ against step number — the view that makes the overshoot obvious. */
function trace1(label: string, upTo: number, opts: { momentum?: boolean } = {}): TraceComponent {
  const pts = (rows: Row1[]) => rows.slice(0, upTo + 1).map((r) => ({ x: r.t, y: r.p }));
  const last = (rows: Row1[], cls: TraceCls) => {
    const r = rows[Math.min(upTo, rows.length - 1)];
    return { x: r.t, y: r.p, cls, shape: "dot" as const };
  };
  return {
    t: "plot",
    label,
    domain: D1,
    xLabel: "step",
    yLabel: "θ",
    segments: [{ x1: 0, y1: 0, x2: N1, y2: 0, cls: "good", dashed: true }],
    curves: [
      { pts: pts(SGD1), cls: "warn" },
      ...(opts.momentum === false ? [] : [{ pts: pts(MOM1), cls: "active" as TraceCls }]),
    ],
    points: [
      last(SGD1, "warn"),
      ...(opts.momentum === false ? [] : [last(MOM1, "active")]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Act I(b) — Adam's two moments, the lesson's worked example
// ---------------------------------------------------------------------------

type AdamRow = { t: number; g: number; m: number; v: number; mh: number; vh: number; step: number; p: number };

/** Adam on L(θ) = θ², optionally with the bias correction switched off. */
function runAdam1(p0: number, lr: number, steps: number, correct: boolean): AdamRow[] {
  let p = p0;
  let m = 0;
  let v = 0;
  const rows: AdamRow[] = [];
  for (let t = 1; t <= steps; t++) {
    const g = grad1(p);
    m = B1 * m + (1 - B1) * g;
    v = B2 * v + (1 - B2) * g * g;
    const mh = correct ? m / (1 - B1 ** t) : m;
    const vh = correct ? v / (1 - B2 ** t) : v;
    const step = (lr * mh) / (Math.sqrt(vh) + EPS);
    p = p - step;
    rows.push({ t, g, m, v, mh, vh, step, p });
  }
  return rows;
}

const ADAM_P0 = 1.0;
const ADAM_LR = 0.001;
const ADAM_ON = runAdam1(ADAM_P0, ADAM_LR, 8, true);
const ADAM_OFF = runAdam1(ADAM_P0, ADAM_LR, 8, false);

// ---------------------------------------------------------------------------
// Act II — Rosenbrock, f(x, y) = (1 − x)² + 100(y − x²)²
// ---------------------------------------------------------------------------

type Vec = [number, number];

const rosen = (p: Vec) => (1 - p[0]) ** 2 + 100 * (p[1] - p[0] * p[0]) ** 2;
const rosenGrad = (p: Vec): Vec => [
  -2 * (1 - p[0]) - 400 * p[0] * (p[1] - p[0] * p[0]),
  200 * (p[1] - p[0] * p[0]),
];

const R_START: Vec = [-1.2, 1.0];
const R_OPT: Vec = [1, 1];
/** Target is on f, not on distance — scale-free and far less knife-edge. */
const F_TOL = 1e-3;
const R_BUDGET = 20_000;

type Kind = "sgd" | "momentum" | "rmsprop" | "adam";

function runRosen(kind: Kind, lr: number, cap = R_BUDGET) {
  const p: Vec = [...R_START];
  const v: Vec = [0, 0];
  const G: Vec = [0, 0];
  const m: Vec = [0, 0];
  const vv: Vec = [0, 0];
  const path: Vec[] = [[...p]];
  for (let t = 1; t <= cap; t++) {
    const g = rosenGrad(p);
    for (let i = 0; i < 2; i++) {
      if (kind === "sgd") {
        p[i] -= lr * g[i];
      } else if (kind === "momentum") {
        v[i] = BETA * v[i] + g[i];
        p[i] -= lr * v[i];
      } else if (kind === "rmsprop") {
        G[i] = RHO * G[i] + (1 - RHO) * g[i] * g[i];
        p[i] -= (lr * g[i]) / (Math.sqrt(G[i]) + EPS);
      } else {
        m[i] = B1 * m[i] + (1 - B1) * g[i];
        vv[i] = B2 * vv[i] + (1 - B2) * g[i] * g[i];
        p[i] -= (lr * (m[i] / (1 - B1 ** t))) / (Math.sqrt(vv[i] / (1 - B2 ** t)) + EPS);
      }
    }
    path.push([...p]);
    if (!Number.isFinite(p[0]) || Math.abs(p[0]) > 1e4 || Math.abs(p[1]) > 1e4) {
      return { steps: Infinity, diverged: true, path };
    }
    if (rosen(p) < F_TOL) return { steps: t, diverged: false, path };
  }
  return { steps: Infinity, diverged: false, path };
}

/** Path length divided by net displacement — how much of the travel is wasted. */
function zigzag(path: Vec[], n: number) {
  const p = path.slice(0, n + 1);
  let len = 0;
  for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  const net = Math.hypot(p[p.length - 1][0] - p[0][0], p[p.length - 1][1] - p[0][1]);
  return { len, net, ratio: len / net, end: p[p.length - 1] };
}

/** η values chosen as round decades, so nothing here is a tuned cherry-pick. */
const R_ETAS = [1e-4, 1e-3, 1e-2, 1e-1, 1];
const R_TABLE: Record<Kind, { steps: number; diverged: boolean }[]> = {
  sgd: R_ETAS.map((e) => runRosen("sgd", e)),
  momentum: R_ETAS.map((e) => runRosen("momentum", e)),
  rmsprop: R_ETAS.map((e) => runRosen("rmsprop", e)),
  adam: R_ETAS.map((e) => runRosen("adam", e)),
};

/** Sweep a log grid and count how much of it converges — the stable statistic. */
const R_GRID: number[] = [];
for (let e = -5; e <= 0.4; e += 0.05) R_GRID.push(10 ** e);
const BANDS = (["sgd", "momentum", "rmsprop", "adam"] as Kind[]).map((k) => {
  const ok = R_GRID.filter((lr) => Number.isFinite(runRosen(k, lr).steps));
  return {
    k,
    hits: ok.length,
    total: R_GRID.length,
    lo: Math.min(...ok),
    hi: Math.max(...ok),
    decades: Math.log10(Math.max(...ok) / Math.min(...ok)),
  };
});
const band = (k: Kind) => BANDS.find((b) => b.k === k)!;
/** Smallest swept η at which an optimizer blows up rather than merely crawling. */
const firstDiverge = (k: Kind) => R_GRID.find((lr) => runRosen(k, lr).diverged) ?? Infinity;

/**
 * The largest step-count jump between *adjacent* η on a fine grid — evidence
 * that best-case step counts are luck, measured under this trace's own
 * convergence test rather than quoted from somewhere else.
 */
const LUCK = (() => {
  const grid: number[] = [];
  for (let e = -0.2; e <= 0.1; e += 0.005) grid.push(10 ** e);
  // A short budget: this looks for spikes among the *fast* runs, and keeps the
  // scan cheap enough to sit at module load.
  const runs = grid.map((lr) => ({ lr, steps: runRosen("adam", lr, 2000).steps }));
  let worst = { ratio: 1, lo: NaN, hi: NaN, a: 0, b: 0 };
  for (let i = 1; i < runs.length; i++) {
    const a = runs[i - 1];
    const b = runs[i];
    if (!Number.isFinite(a.steps) || !Number.isFinite(b.steps)) continue;
    const ratio = Math.max(a.steps, b.steps) / Math.min(a.steps, b.steps);
    if (ratio > worst.ratio) worst = { ratio, lo: a.lr, hi: b.lr, a: a.steps, b: b.steps };
  }
  return worst;
})();

const R_SHOW: { k: Kind; lr: number }[] = [
  { k: "sgd", lr: 0.002 },
  { k: "momentum", lr: 0.002 },
  { k: "adam", lr: 0.1 },
];
const R_RUNS = Object.fromEntries(R_SHOW.map(({ k, lr }) => [k, runRosen(k, lr)])) as Record<
  Kind,
  ReturnType<typeof runRosen>
>;
const ZIG = 40;
const Z = Object.fromEntries(R_SHOW.map(({ k }) => [k, zigzag(R_RUNS[k].path, ZIG)])) as Record<
  Kind,
  ReturnType<typeof zigzag>
>;

const D2: [number, number, number, number] = [-1.4, 1.45, -0.45, 1.8];

/** Closed level set f = c: y = x² ± √((c − (1 − x)²)/100) over its valid x range. */
function level(c: number) {
  const lo = Math.max(D2[0] - 0.1, 1 - Math.sqrt(c));
  const hi = Math.min(D2[1] + 0.1, 1 + Math.sqrt(c));
  const top: { x: number; y: number }[] = [];
  const bot: { x: number; y: number }[] = [];
  for (let i = 0; i <= 160; i++) {
    const x = lo + ((hi - lo) * i) / 160;
    const inner = (c - (1 - x) ** 2) / 100;
    if (inner < 0) continue;
    const d = Math.sqrt(inner);
    top.push({ x, y: x * x + d });
    bot.push({ x, y: x * x - d });
  }
  return [...top, ...bot.reverse()];
}

const VALLEY = Array.from({ length: 121 }, (_, i) => {
  const x = D2[0] + ((D2[1] - D2[0]) * i) / 120;
  return { x, y: x * x };
});

function surface(
  label: string,
  paths: { k: Kind; upTo: number; cls: TraceCls }[],
  opts: { showValley?: boolean } = {}
): TraceComponent {
  return {
    t: "plot",
    label,
    domain: D2,
    xLabel: "x",
    yLabel: "y",
    curves: [
      { pts: level(0.5), cls: "dim" },
      { pts: level(4), cls: "dim" },
      { pts: level(16), cls: "dim" },
      ...(opts.showValley ? [{ pts: VALLEY, cls: "good" as TraceCls, dashed: true }] : []),
      ...paths.map((p) => ({
        pts: R_RUNS[p.k].path.slice(0, p.upTo + 1).map(([x, y]) => ({ x, y })),
        cls: p.cls,
      })),
    ],
    points: [
      { x: R_OPT[0], y: R_OPT[1], id: "min", cls: "good", shape: "cross" },
      { x: R_START[0], y: R_START[1], id: "start", cls: "dim", shape: "ring" },
      ...paths.map((p) => {
        const path = R_RUNS[p.k].path;
        const [x, y] = path[Math.min(p.upTo, path.length - 1)];
        return { x, y, cls: p.cls, shape: "dot" as const };
      }),
    ],
  };
}

/**
 * SGD's two coordinates against step number. The 2-D view cannot show this —
 * the whole zig-zag lives inside 15% of the x-domain — but plotted against the
 * step index the sawtooth in x and the slow drift in y are unmistakable.
 */
function coords(label: string, k: Kind, n: number): TraceComponent {
  const path = R_RUNS[k].path.slice(0, n + 1);
  return {
    t: "plot",
    label,
    domain: [0, n, -1.35, 1.35],
    xLabel: "step",
    yLabel: "coordinate",
    curves: [
      { pts: path.map((p, i) => ({ x: i, y: p[0] })), cls: "bad" },
      { pts: path.map((p, i) => ({ x: i, y: p[1] })), cls: "warn" },
    ],
    points: [
      { x: n, y: path[path.length - 1][0], id: "x", cls: "bad", shape: "dot" },
      { x: n, y: path[path.length - 1][1], id: "y", cls: "warn", shape: "dot" },
    ],
  };
}

const showSteps = (r: { steps: number; diverged: boolean }) =>
  r.diverged ? "diverges" : Number.isFinite(r.steps) ? String(r.steps) : "—";
/** Compact form for the η × optimizer grid, which has no room for words. */
const cell = (r: { steps: number; diverged: boolean }) =>
  r.diverged ? "✗" : Number.isFinite(r.steps) ? String(r.steps) : "—";

// ---------------------------------------------------------------------------

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    "Four optimizers, one loop. Every one of them computes the same gradient at the same point — the only thing that separates them is what they *remember* between steps. SGD remembers nothing. Momentum carries one velocity vector. RMSprop carries a per-parameter average of squared gradients. Adam carries both, plus the step counter t it needs for bias correction. Watch that state column, not the parameter.",
    ln("def sgd", "def momentum", "def rmsprop", "def adam"),
    {
      t: "table",
      label: "what each one carries",
      head: ["optimizer", "state per parameter", "why"],
      v: [
        { cells: ["SGD", "—", "follow the gradient, nothing else"] },
        { cells: ["momentum", "v", "average away oscillation"], cls: "active" },
        { cells: ["RMSprop", "G", "rescale by recent gradient size"], cls: "warn" },
        { cells: ["Adam", "m, v, t", "both, with the t=0 bias undone"], cls: "good" },
      ],
    },
    {
      t: "note",
      text: "Act I runs the first two on L(θ) = θ² from θ₀ = 3.0 with η = 0.1 — the worked example above. Act II moves to Rosenbrock, where the answer changes.",
    }
  );

  push(
    `SGD, step 1. The gradient of θ² is 2θ, so g₁ = 2(${fmt(P0, 1)}) = ${fmt(SGD1[1].g, 1)}, and θ₁ = ${fmt(P0, 1)} − 0.1 · ${fmt(SGD1[1].g, 1)} = ${fmt(SGD1[1].p, 1)}. There is no state to update; the whole optimizer is one line.`,
    ln("return p - lr * g"),
    trace1("θ against step", 1, { momentum: false }),
    {
      t: "kv",
      label: "SGD",
      v: [
        { k: "θ₀", v: fmt(P0, 1) },
        { k: "g₁", v: fmt(SGD1[1].g, 1), cls: "warn" },
        { k: "θ₁", v: fmt(SGD1[1].p, 1), cls: "active" },
      ],
    }
  );

  push(
    `Momentum, step 1, from the same θ₀ with the same gradient. v₁ = 0.9 · 0 + ${fmt(MOM1[1].g, 1)} = ${fmt(MOM1[1].v, 1)}, so θ₁ = ${fmt(P0, 1)} − 0.1 · ${fmt(MOM1[1].v, 1)} = ${fmt(MOM1[1].p, 1)} — **identical to SGD**. It has to be: the velocity started at zero, so on the first step there is nothing accumulated to differ by. Momentum can only diverge from SGD once it has history.`,
    ln("st.v = beta * st.v + g"),
    trace1("θ against step", 1),
    {
      t: "kv",
      label: "momentum vs SGD after 1 step",
      v: [
        { k: "v₁", v: fmt(MOM1[1].v, 1), cls: "active" },
        { k: "θ₁ momentum", v: fmt(MOM1[1].p, 1), cls: "active" },
        { k: "θ₁ SGD", v: fmt(SGD1[1].p, 1), cls: "warn" },
      ],
    }
  );

  push(
    `Step 2 is where they part. g₂ = 2(${fmt(MOM1[1].p, 1)}) = ${fmt(MOM1[2].g, 1)}. SGD takes θ₂ = ${fmt(SGD1[1].p, 1)} − 0.1 · ${fmt(SGD1[2].g, 2)} = ${fmt(SGD1[2].p, 2)}. Momentum first folds the old velocity in: v₂ = 0.9 · ${fmt(MOM1[1].v, 1)} + ${fmt(MOM1[2].g, 1)} = ${fmt(MOM1[2].v, 1)}, which is more than double the current gradient, so θ₂ = ${fmt(MOM1[2].p, 2)}. Momentum is closer to zero. This is exactly the comparison the worked example above makes, and at step 2 momentum wins.`,
    ln("return p - lr * st.v"),
    trace1("θ against step", 2),
    {
      t: "table",
      label: "step 2",
      head: ["", "g₂", "update", "θ₂"],
      v: [
        { cells: ["SGD", fmt(SGD1[2].g, 2), `−0.1 · ${fmt(SGD1[2].g, 2)}`, fmt(SGD1[2].p, 2)], cls: "warn" },
        {
          cells: ["momentum", fmt(MOM1[2].g, 2), `v₂ = ${fmt(MOM1[2].v, 1)}`, fmt(MOM1[2].p, 2)],
          cls: "good",
        },
      ],
    }
  );

  push(
    `Keep stepping and the picture inverts. At step ${CROSS} momentum is at θ = ${fmt(MOM1[CROSS].p, 3)} — it has **crossed the minimum**, because the velocity was still ${fmt(MOM1[CROSS - 1].v, 1)} when the gradient reversed sign, and one step cannot cancel that. By step ${WORST.t} it reaches ${fmt(WORST.p, 3)}, which is *further* from zero than where SGD was at step 2. Meanwhile SGD is quietly at ${fmt(SGD1[WORST.t].p, 3)}, halving its distance every couple of steps and never once going the wrong way.`,
    ln("st.v = beta * st.v + g"),
    trace1("θ against step", N1),
    {
      t: "bars",
      label: "distance from the minimum — bar is |θ|, number is signed θ",
      v: [3, 4, 6, 8, 10, 12].flatMap((t) => [
        { k: `mom t=${t}`, val: Math.abs(MOM1[t].p), show: fmt(MOM1[t].p, 3), cls: "bad" as TraceCls },
        { k: `sgd t=${t}`, val: Math.abs(SGD1[t].p), show: fmt(SGD1[t].p, 3), cls: "warn" as TraceCls },
      ]),
    }
  );

  push(
    `Counted properly: at η = ${LR1}, SGD reaches |θ| < ${TOL1} in **${SETTLE_SGD} steps** and momentum needs **${SETTLE_MOM}** — nearly twice as many. Sweep η and momentum's counts do not even move monotonically (${SWEEP1.map((s) => `${s.lr} → ${s.mom}`).join(", ")}); the ${SWEEP1.find((s) => s.lr === 0.2)!.mom}-step result at η = 0.2 is a coincidence, the iterate happening to land on 0 exactly. None of this is momentum being bad. It is that a 1-D bowl has **no cross-valley oscillation to cancel**, so momentum's one job does not apply and all it contributes is overshoot. To see it earn its keep you need a valley, which is why the lesson reaches for Rosenbrock next.`,
    ln("st.v = beta * st.v + g"),
    {
      t: "table",
      label: `steps to |θ| < ${TOL1} on L(θ) = θ²`,
      head: ["η", "SGD", "momentum"],
      v: SWEEP1.map((s) => ({
        cells: [String(s.lr), String(s.sgd), String(s.mom)],
        cls: (s.lr === LR1 ? "active" : s.mom < s.sgd ? "good" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The worked example above stops at step 2, where momentum is ahead. Read one line further than the algebra and the ordering flips — a good reminder that two steps of a trajectory tell you almost nothing about convergence.",
      cls: "warn",
    }
  );

  const a1 = ADAM_ON[0];
  push(
    `Now Adam, on the lesson's second worked example: θ₀ = ${fmt(ADAM_P0, 1)}, η = ${ADAM_LR}, defaults β₁ = ${B1}, β₂ = ${B2}. At t = 1 with g = ${fmt(a1.g, 1)}: m₁ = 0.1 · ${fmt(a1.g, 1)} = ${fmt(a1.m, 3)} and v₁ = 0.001 · ${fmt(a1.g * a1.g, 1)} = ${fmt(a1.v, 4)}. Both are far below the quantities they estimate, because both started at zero. Dividing by (1 − β₁¹) = 0.1 and (1 − β₂¹) = 0.001 recovers m̂₁ = ${fmt(a1.mh, 1)} and v̂₁ = ${fmt(a1.vh, 1)} — exactly g and g². The step is then η · m̂/√v̂ = ${fmt(ADAM_LR, 3)} · ${fmt(a1.mh, 1)}/${fmt(Math.sqrt(a1.vh), 1)} = ${fmt(a1.step, 6)}, i.e. **exactly η**. That is Adam's signature: the update size is set by η, not by how big the gradient happens to be.`,
    ln("m_hat = st.m", "v_hat = st.v"),
    {
      t: "table",
      label: "Adam's state, first 4 steps",
      head: ["t", "g", "m", "v", "m̂", "v̂", "θ"],
      v: ADAM_ON.slice(0, 4).map((r) => ({
        cells: [
          String(r.t),
          fmt(r.g, 4),
          fmt(r.m, 4),
          fmt(r.v, 6),
          fmt(r.mh, 4),
          fmt(r.vh, 4),
          fmt(r.p, 6),
        ],
        cls: (r.t === 1 ? "active" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "m̂ and v̂ sit at ≈ 2 and ≈ 4 from the very first step — the true gradient and its square. Without correction they would have to grow into those values over dozens of steps.",
    }
  );

  const ratios = ADAM_OFF.map((r, i) => r.step / ADAM_ON[i].step);
  push(
    `Delete the two bias-correction lines and run it again. The uncorrected first step comes out ${fmt(ratios[0], 2)}× **larger**, not smaller — the opposite of what "m₁ is ten times too small" suggests. Both moments are biased low, but by different amounts, and only their *ratio* reaches the update. m₁ = 0.1g understates the gradient by ${fmt(1 / (1 - B1), 0)}×; √v₁ = ${fmt(Math.sqrt(1 - B2), 4)}·|g| understates it by ${fmt(1 / Math.sqrt(1 - B2), 1)}×. The denominator is understated harder, so m/√v comes out ${fmt(1 / Math.sqrt(1 - B2) / (1 / (1 - B1)), 2)}× too big. The error does not fade quickly either: it is still ${fmt(ratios[7], 2)}× at t = 8, and it grows before it shrinks.`,
    ln("m_hat = st.m", "v_hat = st.v"),
    {
      t: "bars",
      label: "step size, bias correction off ÷ on",
      v: ADAM_OFF.map((r, i) => ({
        k: `t=${r.t}`,
        val: ratios[i],
        show: `${fmt(ratios[i], 2)}×`,
        cls: (i === 0 ? "active" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "This is why Adam without correction wants a warm-up schedule and Adam with it usually does not: the correction is doing the same job the warm-up would, analytically instead of by hand.",
      cls: "warn",
    }
  );

  const g0 = rosenGrad(R_START);
  push(
    `Act II. The Rosenbrock function f(x, y) = (1 − x)² + 100(y − x²)², whose minimum at (1, 1) lies at the end of a long curved valley — the dashed line is the valley floor y = x². Start at (${fmt(R_START[0], 1)}, ${fmt(R_START[1], 1)}), where f = ${fmt(rosen(R_START), 1)}. The gradient there is (${fmt(g0[0], 1)}, ${fmt(g0[1], 1)}): enormous, and pointing mostly across the valley rather than along it. The contours are the packed ellipses; the walls are steep and the floor is nearly flat, which is the entire difficulty.`,
    ln("def sgd"),
    surface("Rosenbrock, and the valley floor", [], { showValley: true }),
    {
      t: "kv",
      label: "at the start",
      v: [
        { k: "f", v: fmt(rosen(R_START), 2), cls: "warn" },
        { k: "∂f/∂x", v: fmt(g0[0], 1), cls: "bad" },
        { k: "∂f/∂y", v: fmt(g0[1], 1) },
        { k: "‖∇f‖", v: fmt(Math.hypot(g0[0], g0[1]), 1) },
      ],
    }
  );

  const zs = Z.sgd;
  push(
    `SGD at η = 0.002, close to the best value a sweep of this problem finds. In ${ZIG} steps it travels **${fmt(zs.len, 2)}** of arc length to achieve **${fmt(zs.net, 3)}** of net progress — a ratio of ${fmt(zs.ratio, 1)}:1, so roughly ${Math.round(100 - 100 / zs.ratio)}% of the motion is wasted bouncing between the walls. Look at x in the first few iterates: −1.20, ${fmt(R_RUNS.sgd.path[1][0], 2)}, ${fmt(R_RUNS.sgd.path[2][0], 2)}, ${fmt(R_RUNS.sgd.path[3][0], 2)}, ${fmt(R_RUNS.sgd.path[4][0], 2)} — it reverses direction every single step, while y drifts by hundredths. Raising η does not rescue it: past about ${fmt(band("sgd").hi, 4)} it stops reaching the target at all, and by η = ${fmt(firstDiverge("sgd"), 3)} it diverges. The zig-zag is not a tuning failure, it is the shape of the problem.`,
    ln("return p - lr * g"),
    coords(`SGD's x (red) and y (yellow) over ${ZIG} steps`, "sgd", ZIG),
    {
      t: "kv",
      label: `SGD after ${ZIG} steps`,
      v: [
        { k: "arc length", v: fmt(zs.len, 3), cls: "bad" },
        { k: "net displacement", v: fmt(zs.net, 3), cls: "bad" },
        { k: "wasted", v: `${fmt(zs.ratio, 1)}:1` },
        { k: "position", v: `(${fmt(zs.end[0], 3)}, ${fmt(zs.end[1], 3)})` },
      ],
    }
  );

  const zm = Z.momentum;
  push(
    `Momentum, identical η, identical start. The cross-valley components of successive gradients point in opposite directions, so they cancel inside v; the along-valley component points the same way every step, so it accumulates. After the same ${ZIG} steps the ratio has fallen from ${fmt(zs.ratio, 1)}:1 to **${fmt(zm.ratio, 1)}:1** and it is at (${fmt(zm.end[0], 2)}, ${fmt(zm.end[1], 2)}) — already past the minimum, ${fmt(zm.net / zs.net, 1)}× further along than SGD got. This is the same overshoot that cost it in Act I, except here the valley curves, so overshooting *along* the valley is progress rather than error.`,
    ln("st.v = beta * st.v + g"),
    surface("momentum (bright) against SGD (dim), 40 steps", [
      { k: "sgd", upTo: ZIG, cls: "dim" },
      { k: "momentum", upTo: ZIG, cls: "good" },
    ]),
    {
      t: "table",
      label: `after ${ZIG} steps at η = 0.002`,
      head: ["", "arc length", "net", "wasted", "steps to f < 10⁻³"],
      v: [
        {
          cells: ["SGD", fmt(zs.len, 2), fmt(zs.net, 3), `${fmt(zs.ratio, 1)}:1`, showSteps(R_RUNS.sgd)],
          cls: "bad",
        },
        {
          cells: [
            "momentum",
            fmt(zm.len, 2),
            fmt(zm.net, 3),
            `${fmt(zm.ratio, 1)}:1`,
            showSteps(R_RUNS.momentum),
          ],
          cls: "good",
        },
      ],
    }
  );

  const bSgd = band("sgd");
  const bAdam = band("adam");
  const bMom = band("momentum");
  push(
    `The payoff, and it is not the one you would expect. Run all four at round decade learning rates — no tuning, no cherry-picking — and count steps to f < 10⁻³. SGD converges at **one** of the five. Momentum at two. Adam at four, and its step count falls monotonically the whole way. Swept over a ${R_GRID.length}-point log grid, SGD converges at ${bSgd.hits} of them, spanning ${fmt(bSgd.decades, 1)} decades of η; momentum at ${bMom.hits}, over ${fmt(bMom.decades, 1)}; Adam at ${bAdam.hits}, over ${fmt(bAdam.decades, 1)}. **That** is Adam's real advantage: not that its best run is fastest — momentum's best here is ${showSteps(R_RUNS.momentum)} steps against Adam's ${showSteps(R_RUNS.adam)}, and after the 200 steps plotted it is momentum that is nearly home while Adam is still crossing the valley floor — but that ${fmt(bAdam.decades - bSgd.decades, 1)} extra decades of η work at all. Note RMSprop: it spans the widest range of any of them, yet converges at only ${band("rmsprop").hits} grid points, so its band is full of holes. Adam's first moment is what fills them in, and that combination is why Adam is the default and RMSprop is not.`,
    ln("return p - lr * m_hat / rt(v_hat)"),
    surface("after 200 steps — SGD (dim) · momentum (teal) · Adam (violet)", [
      { k: "sgd", upTo: 200, cls: "dim" },
      { k: "momentum", upTo: 200, cls: "good" },
      { k: "adam", upTo: 200, cls: "active" },
    ]),
    {
      t: "table",
      label: "steps to f < 10⁻³ · — never got there · ✗ diverged",
      head: ["η", "SGD", "mom.", "RMSp.", "Adam"],
      v: R_ETAS.map((e, i) => ({
        cells: [
          String(e),
          cell(R_TABLE.sgd[i]),
          cell(R_TABLE.momentum[i]),
          cell(R_TABLE.rmsprop[i]),
          cell(R_TABLE.adam[i]),
        ],
        cls: (R_TABLE.adam[i].diverged || !Number.isFinite(R_TABLE.adam[i].steps)
          ? "dim"
          : "good") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "decades of η that converge at all",
      v: BANDS.map((b) => ({
        k: b.k === "sgd" ? "SGD" : b.k === "adam" ? "Adam" : b.k,
        val: b.decades,
        show: `${fmt(b.decades, 1)} (${b.hits}/${b.total})`,
        cls: (b.k === "adam" || b.k === "rmsprop" ? "good" : b.k === "sgd" ? "bad" : "warn") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `Best-case step counts on a deterministic problem are largely luck: Adam finishes in ${LUCK.a} steps at η = ${fmt(LUCK.lo, 3)} and ${LUCK.b} at η = ${fmt(LUCK.hi, 3)} — a ${fmt(LUCK.ratio, 0)}× difference from a ${fmt(100 * (LUCK.hi / LUCK.lo - 1), 0)}% change in η, because whether an iterate happens to land inside the tolerance is a coin flip. The width of the working band is what survives re-measurement, so that is what is reported here.`,
      cls: "warn",
    }
  );

  return {
    id: "optimizer-comparison",
    title: "SGD, momentum and Adam side by side — and what each one remembers",
    caption:
      "The same four update rules stepped over two problems. Act I is the 1-D bowl worked above: momentum is ahead at step 2, exactly as the algebra says, and then sails past the minimum and takes nearly twice as long as plain SGD to settle — a 1-D bowl has no cross-valley oscillation for it to cancel. Act I(b) shows Adam's two moments and what deleting the bias correction actually does (the first step gets 3× bigger, not smaller). Act II moves to Rosenbrock, where the ordering flips and stays flipped, and ends by measuring the thing that actually distinguishes Adam in practice: not its best-case step count, but how wide a range of learning rates works at all.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const optimizersTrace = build();
