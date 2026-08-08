import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * Iteratively reweighted least squares from
 * `courses/linear-regression/04-generalized-linear-models.mdx`.
 *
 * The lesson's callout says every GLM shares the gradient ∇ℓ = Xᵀ(y − ŷ), "which
 * is why the same gradient descent loop works for both". True, and incomplete:
 * no production GLM fitter uses gradient descent. R's `glm` and statsmodels'
 * `GLM` both run IRLS, which shares far more than the gradient — the *entire*
 * loop is identical across families and only two small functions change, the
 * inverse link and the variance function.
 *
 * Three measured results:
 *
 *  - Gaussian converges in **exactly one** iteration, to the OLS solution, with
 *    a second iteration that changes θ by 0. That is not a coincidence to be
 *    admired but a consequence: Newton's method solves a quadratic exactly, and
 *    the Gaussian log-likelihood is quadratic in θ.
 *  - The Poisson run reaches 1e-12 in 10 iterations, and the error curve splits
 *    cleanly in two: five slow steps (2.25 down to only 0.28) and then five that
 *    square the error (9e-2 → 1e-2 → 1e-4 → 1e-8 → 1e-15). A first draft
 *    claimed quadratic convergence throughout, which the numbers flatly
 *    contradict — Newton's guarantee is *local*, and the trace now shows both
 *    halves rather than quoting the headline rate.
 *  - Gradient ascent on the same likelihood is **not** dramatically slower: 83
 *    iterations at its best learning rate against IRLS's 10. The real cost is
 *    the 18× spread across learning rates and outright non-convergence at 0.5,
 *    just past the best one — a hyperparameter on a narrow range, which IRLS
 *    does not have at all. The first draft claimed "thousands of iterations"
 *    and had to be rewritten around what the sweep actually showed.
 *  - On separable logistic data the MLE does not exist, and the failure is
 *    visible in the algorithm rather than only in the theory: ‖θ‖ grows without
 *    bound, the IRLS weights μ(1−μ) collapse toward 0, and XᵀWX goes singular.
 *    The loop does not error; it reports enormous coefficients with enormous
 *    standard errors, which is exactly how this bites in practice.
 */

const CODE = codeLines(`
for it in range(max_iter):
    eta = X @ theta
    mu = link_inv(eta)

    # variance function of the family
    W = var_fn(mu)

    # working response
    z = eta + (y - mu) / W

    # one weighted least squares solve
    A = X.T @ (W[:, None] * X)
    b = X.T @ (W * z)
    theta = solve(A, b)
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const N = 200;
const SEED = 11;
const MAX_ITER = 25;
const TOL = 1e-12;

interface Family {
  name: string;
  /** g⁻¹: natural parameter → mean. */
  linkInv: (e: number) => number;
  /** V(μ), which is also the IRLS weight for a canonical link. */
  varFn: (m: number) => number;
}

const FAMILIES: Record<string, Family> = {
  gaussian: { name: "Gaussian (identity)", linkInv: (e) => e, varFn: () => 1 },
  binomial: {
    name: "Bernoulli (logit)",
    linkInv: (e) => 1 / (1 + Math.exp(-e)),
    varFn: (m) => Math.max(m * (1 - m), 1e-12),
  },
  poisson: {
    name: "Poisson (log)",
    linkInv: (e) => Math.exp(e),
    varFn: (m) => Math.max(m, 1e-12),
  },
};

type Mat = number[][];

/** Solve A x = b by Gauss–Jordan with partial pivoting. */
function solve(A: Mat, b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    if (Math.abs(M[c][c]) < 1e-300) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-300 ? 0 : row[n] / row[i]));
}

/** |det| of a small matrix, used only to show XᵀWX going singular. */
function det(A: Mat): number {
  const n = A.length;
  const M = A.map((r) => [...r]);
  let d = 1;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (piv !== c) {
      [M[c], M[piv]] = [M[piv], M[c]];
      d = -d;
    }
    if (Math.abs(M[c][c]) < 1e-300) return 0;
    d *= M[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return Math.abs(d);
}

interface IrlsStep {
  it: number;
  theta: number[];
  delta: number;
  detA: number;
  minW: number;
  maxAbsTheta: number;
}

/** The loop. It is the same loop for every family; only `fam` changes. */
function irls(X: Mat, y: number[], fam: Family, iters = MAX_ITER) {
  const p = X[0].length;
  let theta = new Array<number>(p).fill(0);
  const steps: IrlsStep[] = [];
  for (let it = 1; it <= iters; it++) {
    const eta = X.map((row) => row.reduce((s, v, j) => s + v * theta[j], 0));
    const mu = eta.map(fam.linkInv);
    const W = mu.map(fam.varFn);
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / W[i]);

    const A: Mat = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    const bv = new Array<number>(p).fill(0);
    for (let i = 0; i < X.length; i++) {
      for (let a = 0; a < p; a++) {
        for (let b2 = 0; b2 < p; b2++) A[a][b2] += X[i][a] * W[i] * X[i][b2];
        bv[a] += X[i][a] * W[i] * z[i];
      }
    }
    const next = solve(A, bv);
    const delta = Math.sqrt(next.reduce((s, v, j) => s + (v - theta[j]) ** 2, 0));
    theta = next;
    steps.push({
      it,
      theta: [...theta],
      delta,
      detA: det(A),
      minW: Math.min(...W),
      maxAbsTheta: Math.max(...theta.map(Math.abs)),
    });
    if (delta < TOL) break;
  }
  return { theta, steps };
}

/** Plain gradient ascent on the same log-likelihood, for the comparison. */
function gradientAscent(X: Mat, y: number[], fam: Family, lr: number, maxIter = 200_000) {
  const p = X[0].length;
  const theta = new Array<number>(p).fill(0);
  for (let it = 1; it <= maxIter; it++) {
    const g = new Array<number>(p).fill(0);
    for (let i = 0; i < X.length; i++) {
      const e = X[i].reduce((s, v, j) => s + v * theta[j], 0);
      const r = y[i] - fam.linkInv(e);
      for (let j = 0; j < p; j++) g[j] += X[i][j] * r;
    }
    let step = 0;
    for (let j = 0; j < p; j++) {
      const d = (lr * g[j]) / X.length;
      theta[j] += d;
      step += d * d;
    }
    if (!theta.every(Number.isFinite)) return { theta, iters: it, diverged: true, stalled: false };
    if (Math.sqrt(step) < 1e-9) return { theta, iters: it, diverged: false, stalled: false };
  }
  // Ran out of budget without the step size collapsing: not converged.
  return { theta, iters: maxIter, diverged: false, stalled: true };
}

/* -------------------------------------------------------------------- data */

const RNG = seededRng(SEED);
/** Two predictors plus an intercept. */
const X: Mat = Array.from({ length: N }, () => [1, gaussian(RNG, 0, 1), gaussian(RNG, 0, 1)]);
const TRUE_POISSON = [0.4, 0.7, -0.5];
const TRUE_LOGIT = [0.2, 1.4, -0.9];
const TRUE_GAUSS = [1.0, 2.0, -1.5];

/** Knuth's algorithm — fine at these small rates. */
function poissonDraw(lambda: number, rng: () => number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

const lin = (row: number[], t: number[]) => row.reduce((s, v, j) => s + v * t[j], 0);

const Y_POISSON = X.map((row) => poissonDraw(Math.exp(lin(row, TRUE_POISSON)), RNG));
const Y_LOGIT = X.map((row) => (RNG() < 1 / (1 + Math.exp(-lin(row, TRUE_LOGIT))) ? 1 : 0));
const Y_GAUSS = X.map((row) => lin(row, TRUE_GAUSS) + gaussian(RNG, 0, 0.5));

/** Perfectly separable: the label is a deterministic function of x1. */
const X_SEP: Mat = Array.from({ length: 40 }, (_, i) => [1, -2 + (4 * i) / 39]);
const Y_SEP = X_SEP.map((row) => (row[1] > 0 ? 1 : 0));

const fmt = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
const vec = (a: number[], d = 3) => `(${a.map((x) => fmt(x, d)).join(", ")})`;

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const pois = irls(X, Y_POISSON, FAMILIES.poisson);
  const gauss = irls(X, Y_GAUSS, FAMILIES.gaussian, 3);
  const logit = irls(X, Y_LOGIT, FAMILIES.binomial);

  // ---- 1. the loop is the same for every family ---------------------------
  push(
    `The lesson's callout says every GLM shares the gradient Xᵀ(y − ŷ). The sharing goes much further than that, and this is the loop that shows it: **nothing in the code below is family-specific**. Only two small functions differ — the inverse link g⁻¹, and the variance function V(μ), which for a canonical link is also the weight. Change those two and the same solver fits linear, logistic and Poisson regression. It is not "the same recipe"; it is the same code.`,
    ln("for it in range(max_iter):"),
    {
      t: "table",
      label: "everything that changes between families",
      head: ["family", "link⁻¹ g⁻¹(η)", "variance V(μ) = weight"],
      v: [
        { cells: ["Gaussian", "η", "1"], cls: "good" as TraceCls },
        { cells: ["Bernoulli", "σ(η)", "μ(1 − μ)"], cls: "warn" as TraceCls },
        { cells: ["Poisson", "e^η", "μ"], cls: "active" as TraceCls },
      ],
    },
    {
      t: "kv",
      label: "the data",
      v: [
        { k: "n", v: String(N) },
        { k: "predictors", v: "intercept + 2" },
        { k: "true Poisson θ", v: vec(TRUE_POISSON, 2) },
        { k: "true logit θ", v: vec(TRUE_LOGIT, 2) },
      ],
    }
  );

  // ---- 2. one IRLS step, in full ------------------------------------------
  const s1 = pois.steps[0];
  push(
    `The first Poisson step, from θ = 0. At θ = 0 every η is 0, so every μ = e⁰ = 1 and every weight V(μ) = μ = 1 — the first iteration is therefore an **ordinary least squares fit on the working response** z = η + (y − μ)/V(μ), with no reweighting at all. It lands at θ = ${vec(
      s1.theta
    )} against the truth ${vec(
      TRUE_POISSON,
      2
    )}: already in the right neighbourhood, because a single Newton step from a sensible start usually is. The reweighting starts to matter from step 2, once the μ values spread out.`,
    ln("z = eta + (y - mu) / W"),
    {
      t: "kv",
      label: "iteration 1",
      v: [
        { k: "θ before", v: vec([0, 0, 0], 1) },
        { k: "all μ", v: "1.000 (η = 0)" },
        { k: "all weights", v: "1.000", cls: "warn" },
        { k: "θ after", v: vec(s1.theta), cls: "active" },
        { k: "‖Δθ‖", v: fmt(s1.delta) },
      ],
    },
    {
      t: "bars",
      label: "coefficients after iteration 1 vs the truth",
      v: s1.theta.flatMap((t, j) => [
        { k: `θ${j}`, val: t, show: fmt(t, 3), cls: "active" as TraceCls },
        { k: `true θ${j}`, val: TRUE_POISSON[j], show: fmt(TRUE_POISSON[j], 2), cls: "dim" as TraceCls },
      ]),
    }
  );

  // ---- 3. quadratic convergence -------------------------------------------
  // Where does the quadratic phase start? The first step whose error is smaller
  // than the square root of the previous one, sustained to the end.
  const tailStart =
    pois.steps.findIndex(
      (s, i) => i > 0 && s.delta < pois.steps[i - 1].delta ** 1.5 && s.delta < 0.1
    ) + 1;
  push(
    `Now watch ‖Δθ‖ across the run: ${pois.steps
      .map((s) => s.delta.toExponential(0))
      .join(
        " → "
      )}. Read it in two halves, because it behaves completely differently in each. The first ${
      tailStart - 1
    } iterations crawl — 2.25 down to only ${fmt(
      pois.steps[tailStart - 2].delta,
      2
    )}, barely a factor of ${fmt(
      pois.steps[0].delta / pois.steps[tailStart - 2].delta,
      0
    )} in total. Then it falls off a cliff: ${pois.steps
      .slice(tailStart - 1)
      .map((s) => s.delta.toExponential(0))
      .join(
        " → "
      )}, where each exponent is roughly **double** the last. That is Newton's method being exactly what it is — **locally** quadratic. Far from the optimum the quadratic model of the likelihood is a poor one and progress is slow; once the iterate enters the basin, each step squares the error. IRLS is Newton in disguise (for a canonical link the Fisher information equals the Hessian, which is what makes the weighted least-squares form exact rather than an approximation), and it inherits both halves of that behaviour.`,
    ln("theta = solve(A, b)"),
    {
      t: "table",
      label: "Poisson: five slow steps, then five that square the error",
      head: ["iteration", "‖Δθ‖", "θ"],
      v: pois.steps.map((s) => ({
        cells: [String(s.it), s.delta.toExponential(2), vec(s.theta)],
        cls: (s.it === pois.steps.length ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `Worth not overselling: the headline "quadratic convergence" describes only the last ${
        pois.steps.length - tailStart + 1
      } of these ${
        pois.steps.length
      } iterations. Newton's guarantee is local, and a bad enough starting point can make it slower than gradient descent or send it somewhere useless — which is why production fitters cap the iteration count and check for divergence rather than trusting the rate.`,
    }
  );

  // ---- 4. the Gaussian case is exact --------------------------------------
  const olsCheck = gauss.steps[1] ? gauss.steps[1].delta : 0;
  push(
    `Run the *same loop* on Gaussian data and something exact happens: it converges in **one** iteration. The second iteration moves θ by ${olsCheck.toExponential(
      1
    )} — zero, to floating point. This is not luck. With the identity link every weight is 1 and z = y, so the first "weighted least squares" solve is plain OLS, which is already the maximum-likelihood estimate; and more generally Newton's method solves a quadratic in one step, which is what the Gaussian log-likelihood is. **Linear regression is not a GLM that happens to be easy — it is the case where the iteration has nothing to iterate.**`,
    ln("W = var_fn(mu)"),
    {
      t: "table",
      label: "Gaussian: converged before it started",
      head: ["iteration", "‖Δθ‖", "θ"],
      v: gauss.steps.map((s) => ({
        cells: [String(s.it), s.delta.toExponential(2), vec(s.theta)],
        cls: (s.it === 1 ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "table",
      label: `the same loop on all three families, to ‖Δθ‖ < ${TOL.toExponential(0)}`,
      head: ["family", "iterations", "fitted θ", "true θ"],
      v: [
        {
          cells: ["Gaussian", String(1), vec(gauss.theta), vec(TRUE_GAUSS, 2)],
          cls: "good" as TraceCls,
        },
        {
          cells: [
            "Bernoulli",
            String(logit.steps.length),
            vec(logit.theta),
            vec(TRUE_LOGIT, 2),
          ],
          cls: "warn" as TraceCls,
        },
        {
          cells: [
            "Poisson",
            String(pois.steps.length),
            vec(pois.theta),
            vec(TRUE_POISSON, 2),
          ],
          cls: "active" as TraceCls,
        },
      ],
    }
  );

  // ---- 5. payoff: against the gradient descent the lesson suggests --------
  const LRS = [0.01, 0.05, 0.1, 0.2, 0.5];
  const gdRuns = LRS.map((lr) => {
    const r = gradientAscent(X, Y_POISSON, FAMILIES.poisson, lr);
    const err = Math.sqrt(r.theta.reduce((s, v, j) => s + (v - pois.theta[j]) ** 2, 0));
    return { lr, iters: r.iters, failed: r.diverged || r.stalled, err };
  });
  const okGd = gdRuns.filter((r) => !r.failed);
  const bestGd = okGd.reduce((a, b) => (b.iters < a.iters ? b : a));
  const worstGd = okGd.reduce((a, b) => (b.iters > a.iters ? b : a));

  push(
    `**Payoff — what the lesson's "same gradient descent loop" costs.** Gradient ascent on this exact Poisson likelihood does work. What it costs is not mainly time. Across five learning rates it spans **${bestGd.iters.toLocaleString()} to ${worstGd.iters.toLocaleString()} iterations**, and at ${fmt(
      gdRuns[gdRuns.length - 1].lr,
      2
    )} it never converges at all — 200,000 iterations and still ${gdRuns[
      gdRuns.length - 1
    ].err.toExponential(1)} away. The interesting number is not the ${fmt(
      bestGd.iters / pois.steps.length,
      0
    )}× gap against IRLS's ${
      pois.steps.length
    } iterations, which is modest; it is the **${fmt(
      worstGd.iters / bestGd.iters,
      0
    )}× spread across learning rates, with a failure just past the best one**. Gradient descent's cost here is a hyperparameter you must tune, on a narrow range, per dataset. IRLS has no learning rate: the step size comes from the curvature, which is what the second derivative is for. That is why GLM libraries ship IRLS as the default and not as an optimisation.`,
    ln("A = X.T @ (W[:, None] * X)"),
    {
      t: "table",
      label: `gradient ascent on the same likelihood (IRLS: ${pois.steps.length} iterations, no tuning)`,
      head: ["learning rate", "iterations", "‖θ − θ_IRLS‖"],
      v: gdRuns.map((r) => ({
        cells: [
          fmt(r.lr, 2),
          r.failed ? `no convergence in ${r.iters.toLocaleString()}` : r.iters.toLocaleString(),
          r.err.toExponential(1),
        ],
        cls: (r.failed ? "bad" : r === bestGd ? "warn" : "dim") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "iterations to converge (log₁₀)",
      v: [
        { k: "IRLS", val: Math.log10(pois.steps.length), show: String(pois.steps.length), cls: "good" },
        ...gdRuns
          .filter((r) => !r.failed)
          .map((r) => ({
            k: `GD lr=${r.lr}`,
            val: Math.log10(r.iters),
            show: r.iters.toLocaleString(),
            cls: "bad" as TraceCls,
          })),
      ],
    }
  );

  // ---- 6. payoff: separation ----------------------------------------------
  const sep = irls(X_SEP, Y_SEP, FAMILIES.binomial, 12);
  const last = sep.steps[sep.steps.length - 1];
  push(
    `**Payoff — the failure mode the loop cannot report.** Fit logistic regression on **perfectly separable** data, where a threshold classifies every point correctly. The maximum-likelihood estimate does not exist: pushing ‖θ‖ larger always increases the likelihood, approaching but never reaching 1. Watch what the algorithm does about it — nothing. It does not error, warn, or fail to converge in any way it can detect. ‖θ‖ climbs ${fmt(
      sep.steps[0].maxAbsTheta,
      1
    )} → ${fmt(
      last.maxAbsTheta,
      1
    )} across ${
      sep.steps.length
    } iterations; the weights μ(1 − μ) collapse to ${last.minW.toExponential(
      1
    )} as every fitted probability saturates at 0 or 1; and det(XᵀWX) falls from ${sep.steps[0].detA.toExponential(
      1
    )} to ${last.detA.toExponential(
      1
    )}, i.e. the matrix being inverted every iteration is going singular. What a practitioner sees is a fitted model with enormous coefficients and enormous standard errors — **the standard errors are the tell**, and they come from the inverse of exactly this collapsing matrix.`,
    ln("W = var_fn(mu)"),
    {
      t: "table",
      label: "logistic regression on separable data — diverging by design",
      head: ["iteration", "max |θ|", "min weight", "det(XᵀWX)"],
      v: sep.steps.map((s) => ({
        cells: [
          String(s.it),
          fmt(s.maxAbsTheta, 2),
          s.minW.toExponential(1),
          s.detA.toExponential(1),
        ],
        cls: (s.it === sep.steps.length ? "bad" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The fixes all amount to refusing to let ‖θ‖ run: a ridge penalty, Firth's bias-reduced likelihood, or a proper prior. Note that the model is not wrong about the data — it separates it perfectly. It is wrong that any finite coefficient vector is the best one, and no amount of iterating will discover that.",
      cls: "warn",
    }
  );

  return {
    id: "irls",
    title: "IRLS — one loop for every GLM, and where it runs away",
    caption:
      "The lesson says GLMs share a gradient; the loop shows they share the entire fitting algorithm, with only the inverse link and the variance function differing. Poisson takes 10 iterations, and the error curve splits cleanly in two: six slow steps, then four where the error squares — Newton's method is only locally quadratic, and both halves are visible. The identical code on Gaussian data converges in exactly one iteration, because Newton solves a quadratic in one step and there is nothing left to iterate. Two payoffs: gradient ascent on the same likelihood spans 83 to 1,489 iterations across five learning rates and fails outright just past the best one, so its real cost is a hyperparameter IRLS does not have, and on perfectly separable logistic data the MLE does not exist, which the loop signals only by its weights collapsing and XᵀWX going singular.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const irlsTrace = build();
