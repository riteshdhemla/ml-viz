import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Power iteration, run on the same **A = [[4, 1], [2, 3]]** the wiki page works
 * by hand — so the trace lands on λ₁ = 5 and v₁ = (1, 1), the answer the reader
 * just derived from the characteristic polynomial.
 *
 * The payoff is the page's one-line claim about the convergence rate, checked
 * three ways. Every variant is built as **V Λ V⁻¹ with the same V**, so the
 * eigenvectors — and therefore the target — never change; only the spectrum
 * does. That isolates the ratio |λ₂/λ₁| as the single cause:
 *
 *  - λ = (5, 2), ratio 0.4 — the angle error shrinks by exactly 0.4 per step.
 *  - λ = (5, 4.5), ratio 0.9 — same answer, 129 steps instead of 15.
 *  - λ = (5, −5), ratio 1.0 — a period-2 cycle that never converges, and which
 *    the page's `norm(b_new - b) < tol` test never detects.
 */

const CODE = codeLines(`
def power_iteration(A, n_iter=100,
                    tol=1e-10):
    b = random_unit_vector(A.shape[1])
    for k in range(1, n_iter + 1):
        Ab = A @ b
        # Rayleigh quotient, ||b|| = 1
        lam = b @ Ab
        b_new = Ab / norm(Ab)
        if norm(b_new - b) < tol:
            return lam, b_new
        b = b_new
    return lam, b
`);

const ln = lineFinder(CODE);

type Vec = [number, number];
type Mat = [[number, number], [number, number]];

const mul = (A: Mat, v: Vec): Vec => [
  A[0][0] * v[0] + A[0][1] * v[1],
  A[1][0] * v[0] + A[1][1] * v[1],
];
const norm = (v: Vec) => Math.hypot(v[0], v[1]);
const unit = (v: Vec): Vec => {
  const n = norm(v);
  return [v[0] / n, v[1] / n];
};
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];

const fmt = (x: number, d = 3) => x.toFixed(d).replace("-", "−");

/**
 * A = V Λ V⁻¹ for the fixed eigenvector basis V = [v₁ | v₂], v₁ = (1, 1),
 * v₂ = (1, −2). With λ = (5, 2) this reconstructs the page's own matrix.
 */
const V1: Vec = [1, 1];
const V2: Vec = [1, -2];
function build(l1: number, l2: number): Mat {
  const det = V1[0] * V2[1] - V2[0] * V1[1]; // −3
  const inv = [
    [V2[1] / det, -V2[0] / det],
    [-V1[1] / det, V1[0] / det],
  ];
  const VL = [
    [V1[0] * l1, V2[0] * l2],
    [V1[1] * l1, V2[1] * l2],
  ];
  // Round away the 1e-16 reconstruction noise so λ = (5, 2) prints as integers.
  const r = (x: number) => Math.round(x * 1e10) / 1e10;
  return [
    [r(VL[0][0] * inv[0][0] + VL[0][1] * inv[1][0]), r(VL[0][0] * inv[0][1] + VL[0][1] * inv[1][1])],
    [r(VL[1][0] * inv[0][0] + VL[1][1] * inv[1][0]), r(VL[1][0] * inv[0][1] + VL[1][1] * inv[1][1])],
  ];
}

const U1 = unit(V1);
/** Angle between b and the true dominant eigenvector, insensitive to sign. */
const angleErr = (b: Vec) => Math.acos(Math.min(1, Math.abs(dot(b, U1))));

type Step = { k: number; b: Vec; Ab: Vec; lam: number; bNew: Vec; ang: number };

/** The listing above, executed literally, recording one row per iteration. */
function run(A: Mat, b0: Vec, n: number): Step[] {
  let b = unit(b0);
  const rows: Step[] = [];
  for (let k = 1; k <= n; k++) {
    const Ab = mul(A, b);
    const lam = dot(b, Ab);
    const bNew = unit(Ab);
    rows.push({ k, b, Ab, lam, bNew, ang: angleErr(bNew) });
    b = bNew;
  }
  return rows;
}

/** First iteration whose angle error is under `tol`, or Infinity. */
function stepsTo(rows: Step[], tol: number) {
  const i = rows.findIndex((r) => r.ang < tol);
  return i < 0 ? Infinity : i + 1;
}

/** Where the listing's own `norm(b_new - b) < tol` early exit fires. */
function exitsAt(A: Mat, b0: Vec, tol: number, cap = 100_000) {
  let b = unit(b0);
  for (let k = 1; k <= cap; k++) {
    const bNew = unit(mul(A, b));
    if (norm([bNew[0] - b[0], bNew[1] - b[1]]) < tol) return k;
    b = bNew;
  }
  return Infinity;
}

/** A deterministic start, in place of the listing's random draw. */
const B0: Vec = [1, 0];
const TOL = 1e-10;

const A_MAIN = build(5, 2);
const A_GAP = build(5, 4.5);
const A_EQUAL = build(5, -5);

const MAIN = run(A_MAIN, B0, 40);
const GAP = run(A_GAP, B0, 400);
const EQUAL = run(A_EQUAL, B0, 200);

const MAIN_EXIT = exitsAt(A_MAIN, B0, TOL);
const GAP_EXIT = exitsAt(A_GAP, B0, TOL);
const EQUAL_EXIT = exitsAt(A_EQUAL, B0, TOL);

/** Successive angle-error ratios — the quantity the page's claim predicts. */
const ratios = (rows: Step[], n: number) =>
  rows.slice(1, n + 1).map((r, i) => r.ang / rows[i].ang);
const MAIN_RATIOS = ratios(MAIN, 8);
/** The gap case approaches its asymptotic rate more slowly — read it later. */
const GAP_RATE = ratios(GAP, 80)[79];

const ACC = 1e-6;
const MAIN_STEPS = stepsTo(MAIN, ACC);
const GAP_STEPS = stepsTo(GAP, ACC);
const predict = (rows: Step[], ratio: number) => Math.log(ACC / rows[0].ang) / Math.log(ratio);

/** The two values the Rayleigh quotient cycles between when λ₂ = −λ₁. */
const EQUAL_LAMS = [...new Set(EQUAL.map((r) => r.lam.toFixed(9)))].map(Number);
const EQUAL_BEST = Math.min(...EQUAL.map((r) => r.ang));

// ---------------------------------------------------------------------------
// The vector picture. x- and y-spans are matched to the renderer's 420×290
// drawing area so the unit circle renders round rather than as an ellipse.
// ---------------------------------------------------------------------------

const D: [number, number, number, number] = [-1.85, 1.85, -1.25, 1.25];
const CIRCLE = Array.from({ length: 97 }, (_, i) => {
  const t = (2 * Math.PI * i) / 96;
  return { x: Math.cos(t), y: Math.sin(t) };
});

/** A line through the origin along `v`, clipped roughly to the view. */
function axis(v: Vec, cls: TraceCls) {
  const u = unit(v);
  const s = 1.24 / Math.max(Math.abs(u[0]) * (D[1] / 1.24), Math.abs(u[1]));
  return { x1: -u[0] * s, y1: -u[1] * s, x2: u[0] * s, y2: u[1] * s, cls, dashed: true };
}

function vectors(label: string, rows: Step[], upTo: number): TraceComponent {
  const shown = rows.slice(0, upTo);
  return {
    t: "plot",
    label,
    domain: D,
    xLabel: "x",
    yLabel: "y",
    curves: [{ pts: CIRCLE, cls: "dim" }],
    segments: [
      axis(V1, "good"),
      axis(V2, "dim"),
      ...shown.map((r, i) => ({
        x1: 0,
        y1: 0,
        x2: r.b[0],
        y2: r.b[1],
        cls: (i === shown.length - 1 ? "active" : "warn") as TraceCls,
      })),
    ],
    points: [
      { x: U1[0], y: U1[1], id: "v₁", cls: "good", shape: "cross" },
      ...shown.slice(-1).map((r) => ({
        x: r.bNew[0],
        y: r.bNew[1],
        cls: "active" as TraceCls,
        shape: "dot" as const,
      })),
    ],
  };
}

const matrixOf = (label: string, A: Mat, cls?: Record<string, TraceCls>): TraceComponent => ({
  t: "matrix",
  label,
  rows: ["", ""],
  cols: ["", ""],
  v: A.map((r) => [...r]),
  digits: 3,
  cls,
});

// ---------------------------------------------------------------------------

function build_(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Power iteration on the page's own matrix A = [[4, 1], [2, 3]], whose eigenvalues we already know are ${fmt(5, 0)} and ${fmt(2, 0)} with eigenvectors (1, 1) and (1, −2). The whole algorithm is: multiply by A, normalise, repeat. Nothing is solved and no polynomial is factored — the matrix is simply applied over and over, and the dominant direction wins by attrition. Starting from b = (1, 0), which is nothing special; the dashed teal line is the answer we are heading for.`,
    ln("def power_iteration", "b = random_unit_vector"),
    matrixOf("A", A_MAIN),
    vectors("b on the unit circle; teal dashed = v₁, grey dashed = v₂", MAIN, 0),
    {
      t: "note",
      text: "Written in the eigenbasis, b₀ = ⅔(1, 1) + ⅓(1, −2). Every multiplication by A scales the first part by 5 and the second by 2, so their ratio grows by 5/2 each step. Normalising just keeps the vector on the circle.",
    }
  );

  for (const k of [1, 2, 3]) {
    const s = MAIN[k - 1];
    push(
      `Iteration ${k}. Ab = (${fmt(s.Ab[0], 4)}, ${fmt(s.Ab[1], 4)}), and the Rayleigh quotient bᵀ(Ab) = **${fmt(s.lam, 6)}** is the current estimate of λ₁${k === 1 ? " — a poor one, because b is still the arbitrary start vector" : `, up from ${fmt(MAIN[k - 2].lam, 6)}`}. Normalising gives b = (${fmt(s.bNew[0], 5)}, ${fmt(s.bNew[1], 5)}), which is ${fmt(s.ang, 4)} radians off v₁${k === 1 ? "" : ` — down from ${fmt(MAIN[k - 2].ang, 4)}, a factor of ${fmt(s.ang / MAIN[k - 2].ang, 3)}`}.`,
      ln("Ab = A @ b", "lam = b @ Ab", "b_new = Ab / norm(Ab)"),
      vectors("each iteration swings b toward v₁", MAIN, k),
      {
        t: "kv",
        label: `iteration ${k}`,
        v: [
          { k: "b", v: `(${fmt(s.b[0], 5)}, ${fmt(s.b[1], 5)})` },
          { k: "Ab", v: `(${fmt(s.Ab[0], 4)}, ${fmt(s.Ab[1], 4)})`, cls: "warn" },
          { k: "λ estimate", v: fmt(s.lam, 6), cls: "active" },
          { k: "‖Ab‖", v: fmt(norm(s.Ab), 4) },
          { k: "angle to v₁", v: `${fmt(s.ang, 5)} rad`, cls: "good" },
        ],
      }
    );
  }

  push(
    `Iterations 4 through 10, drawn together. The vectors bunch up against v₁ and the estimate of λ₁ walks in: ${MAIN.slice(3, 10).map((s) => fmt(s.lam, 4)).join(" → ")}. It approaches 5 from **above** — worth a glance, because for a symmetric matrix the Rayleigh quotient can never exceed λ₁, and this A is not symmetric. More importantly, the swings are not merely shrinking, they are shrinking **geometrically**: each one is a fixed fraction of the last. That fraction is the whole story of this algorithm's speed.`,
    ln("b = b_new"),
    vectors("iterations 1–10", MAIN, 10),
    {
      t: "bars",
      label: "angle to v₁, per iteration",
      v: MAIN.slice(0, 10).map((s) => ({
        k: `k=${s.k}`,
        val: s.ang,
        show: s.ang.toExponential(2),
        cls: (s.k === 10 ? "good" : "warn") as TraceCls,
      })),
    }
  );

  push(
    `Divide each angle error by the one before it. The ratios settle on **${fmt(MAIN_RATIOS[MAIN_RATIOS.length - 1], 4)}** — and |λ₂/λ₁| = 2/5 = 0.4 exactly. This is the page's closing claim, measured rather than asserted: the error is multiplied by |λ₂/λ₁| every iteration, so reaching a tolerance takes log(tol)/log|λ₂/λ₁| steps. Here that predicts ${predict(MAIN, 0.4).toFixed(1)} iterations to get within 10⁻⁶ radians, and it actually takes **${MAIN_STEPS}**. The listing's own stopping test, ‖b_new − b‖ < 10⁻¹⁰, fires at k = ${MAIN_EXIT}.`,
    ln("b_new = Ab / norm(Ab)"),
    {
      t: "bars",
      label: "angle error ratio, step over previous",
      v: MAIN_RATIOS.map((r, i) => ({
        k: `${i + 2}/${i + 1}`,
        val: r,
        show: fmt(r, 4),
        cls: (i === MAIN_RATIOS.length - 1 ? "good" : "warn") as TraceCls,
      })),
      max: 0.5,
    },
    {
      t: "note",
      text: "The ratio is the convergence rate, and it does not depend on the start vector — only on the spectrum. So the next two frames change nothing but the eigenvalues.",
    }
  );

  push(
    `Payoff one: keep the eigenvectors identical and move λ₂ from 2 to 4.5. A is rebuilt as VΛV⁻¹ with the same V, so the target v₁ = (1, 1) has not moved a millimetre — only the ratio has, from 0.4 to **0.9**, and the measured rate follows it to ${fmt(GAP_RATE, 4)}. Compare the same 10 iterations: the original A was ${MAIN[9].ang.toExponential(1)} radians from v₁, this one is still **${fmt(GAP[9].ang, 3)}**, a factor of ${Math.round(GAP[9].ang / MAIN[9].ang).toLocaleString("en-US")} worse. Reaching 10⁻⁶ takes **${GAP_STEPS}** iterations against ${MAIN_STEPS}, ${fmt(GAP_STEPS / MAIN_STEPS, 1)}× as many, and the log(tol)/log(ratio) formula predicts ${predict(GAP, 0.9).toFixed(0)}. Nothing about the matrix looks harder; the eigenvalues are simply closer together.`,
    ln("for k in range"),
    matrixOf("A rebuilt with λ = (5, 4.5)", A_GAP),
    vectors("same 10 iterations, λ₂ = 4.5 — barely moved", GAP, 10),
    {
      t: "table",
      label: "same eigenvectors, different spectrum",
      head: ["λ₂", "|λ₂/λ₁|", "measured ratio", "steps to 10⁻⁶", "test fires"],
      v: [
        { cells: ["2", "0.4", fmt(MAIN_RATIOS[MAIN_RATIOS.length - 1], 4), String(MAIN_STEPS), `k=${MAIN_EXIT}`], cls: "good" },
        { cells: ["4.5", "0.9", fmt(GAP_RATE, 4), String(GAP_STEPS), `k=${GAP_EXIT}`], cls: "warn" },
      ],
    }
  );

  push(
    `Payoff two, and this one is a failure rather than a slowdown. Set λ₂ = −5. Now |λ₂/λ₁| = 1, and the two eigenvalues are equally dominant — "the largest" is not a well-defined thing to converge to. The iteration falls into an exact **period-2 cycle**: b returns to (${fmt(EQUAL[0].b[0], 3)}, ${fmt(EQUAL[0].b[1], 3)}) at every odd k, still exactly there at k = 199, and the Rayleigh quotient only ever takes the two values ${EQUAL_LAMS.map((l) => fmt(l, 4)).join(" and ")} — neither of which is 5 or −5. Over 200 iterations the closest b ever comes to v₁ is ${fmt(EQUAL_BEST, 3)} radians.`,
    ln("b = b_new"),
    matrixOf("A rebuilt with λ = (5, −5)", A_EQUAL),
    vectors("6 iterations — but only two distinct positions", EQUAL, 6),
    {
      t: "table",
      label: "b over the first 6 iterations",
      head: ["k", "b", "λ estimate", "angle to v₁"],
      v: EQUAL.slice(0, 6).map((s) => ({
        cells: [
          String(s.k),
          `(${fmt(s.b[0], 5)}, ${fmt(s.b[1], 5)})`,
          fmt(s.lam, 6),
          fmt(s.ang, 4),
        ],
        cls: (s.k % 2 === 1 ? "bad" : "warn") as TraceCls,
      })),
    }
  );

  push(
    `The part worth taking away: the listing **does not notice**. Its only stopping test is ‖b_new − b‖ < tol, and in a period-2 cycle consecutive iterates are always far apart, so the test never fires — it runs the full n_iter and returns whatever λ it happened to compute last, with no indication anything went wrong. On the first matrix that test fires at k = ${MAIN_EXIT} and on the second at k = ${GAP_EXIT}; here it never does at any n_iter. A convergence test that can only report success is not a convergence test. Real implementations either check ‖Ab − λb‖ (the actual residual), or shift the spectrum so that no two eigenvalues share a magnitude.`,
    ln("if norm(b_new - b) < tol", "return lam, b"),
    {
      t: "table",
      label: "does the stopping test fire?",
      head: ["λ", "|λ₂/λ₁|", "outcome", "test fires at"],
      v: [
        { cells: ["(5, 2)", "0.4", `converges in ${MAIN_STEPS}`, `k=${MAIN_EXIT}`], cls: "good" },
        { cells: ["(5, 4.5)", "0.9", `converges in ${GAP_STEPS}`, `k=${GAP_EXIT}`], cls: "warn" },
        {
          cells: ["(5, −5)", "1.0", "cycles forever", Number.isFinite(EQUAL_EXIT) ? `k=${EQUAL_EXIT}` : "never"],
          cls: "bad",
        },
      ],
    },
    {
      t: "note",
      text: "The same ratio governs every method built on repeated multiplication — PageRank's mixing time, the spectral radius that decides whether an RNN's gradients vanish or explode, and how many Lanczos steps a large eigensolver needs.",
      cls: "warn",
    }
  );

  return {
    id: "power-iteration",
    title: "Power iteration — the dominant eigenvector by attrition",
    caption:
      "Run on the same A = [[4, 1], [2, 3]] worked by hand above, so it converges on the λ₁ = 5, v₁ = (1, 1) you already derived. Watch the angle error: it is multiplied by the same constant every iteration, and that constant turns out to be exactly |λ₂/λ₁| = 0.4. The last three frames change only the spectrum — the eigenvectors are held fixed — to show what that constant buys you: at |λ₂/λ₁| = 0.9 the same accuracy costs 129 iterations instead of 15, and at 1.0 the iteration cycles forever while the listing's stopping test never notices.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const powerIterationTrace = build_();
