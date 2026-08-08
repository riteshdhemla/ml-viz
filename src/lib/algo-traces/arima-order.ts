import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * ARIMA order selection from `wiki/arima-order-selection.mdx` — the Box-Jenkins
 * identify → estimate → diagnose loop, run as an AIC grid search.
 *
 * **This trace replaced the page's worked example, because building it showed
 * that almost every number in the old one was fabricated.** The old series was
 * exactly periodic with period 6 rather than a realisation of an ARIMA process,
 * and running the page's own Python against it gave: ACF ρ₂ = −0.479 and
 * ρ₃ = +0.875 where the page claimed 0.08 and 0.04 and asserted "cuts off after
 * lag 1"; an ADF statistic of −8.3e13 (numerically degenerate, because a
 * deterministic series has no unit root to test); a PACF with |φ₄₄| = 1.31,
 * which is impossible for a genuine autocorrelation structure; AIC 190.8 for
 * ARIMA(0,1,1) rather than the claimed 142.3; and a grid winner of ARIMA(2,1,2)
 * at 138.3 — the page's declared winner was one of the *worst* models on the
 * grid. The forecast was wrong in a more interesting way: statsmodels returns a
 * flat 109.49 for every horizon because `ARIMA(order=(0,1,1))` carries no drift
 * term by default, while the page reported a series rising by 2.0 a step.
 *
 * The series here is drawn from an actual ARIMA(0,1,1)-with-drift process
 * (θ = −0.6, drift 2.0, σ = 3.0) and then screened, out of 400 seeds, for the
 * textbook signature the page teaches: raw series non-stationary, first
 * difference stationary, ACF cutting off after lag 1, PACF tailing off, AIC
 * grid selecting (0,1,1), and Ljung-Box passing. Every number below is computed
 * by this file.
 *
 * The estimator is conditional sum of squares rather than exact MLE, which is
 * what makes a from-scratch implementation feasible. It was validated against
 * statsmodels on all nine candidates: identical ranking across the whole grid,
 * and AIC agreeing to within 0.9 everywhere (172.43 vs 173.30 for the winner).
 */

const CODE = codeLines(`
# 1. identification: choose d
d = 0
while not stationary(diff(y, d)):
    d += 1
z = diff(y, d)

# 2. estimation: grid search by AIC
best = None
for p, q in product(range(3), range(3)):
    fit = css_arma(z, p, q)
    k = p + q + 2
    aic = -2 * fit.loglike + 2 * k
    if best is None or aic < best.aic:
        best = fit

# 3. diagnostics: white-noise residuals
ljung_box(best.resid, lags=10)
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------- data */

/**
 * Simulated monthly sales, 36 observations, drawn from ARIMA(0,1,1) with drift
 * and rounded to integers. See the module comment for how it was selected.
 */
const Y = [
  50, 51, 54, 55, 60, 56, 64, 63, 65, 64, 63, 67, 72, 73, 77, 77, 80, 81, 80, 84, 85, 90, 90, 92,
  96, 99, 99, 101, 104, 109, 106, 106, 119, 115, 118, 114,
];

const MAXPQ = 2;
const LB_LAGS = 10;

/* -------------------------------------------------------------- statistics */

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

const variance = (a: number[]) => {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
};

function difference(y: number[], d: number) {
  let z = y.slice();
  for (let i = 0; i < d; i++) z = z.slice(1).map((v, j) => v - z[j]);
  return z;
}

/** Sample autocorrelation, the same normalisation statsmodels' `acf` uses. */
function autocorr(z: number[], maxLag: number) {
  const m = mean(z);
  const n = z.length;
  const c0 = z.reduce((s, x) => s + (x - m) ** 2, 0) / n;
  const out: number[] = [1];
  for (let k = 1; k <= maxLag; k++) {
    let c = 0;
    for (let t = k; t < n; t++) c += (z[t] - m) * (z[t - k] - m);
    out.push(c / n / c0);
  }
  return out;
}

/** Partial autocorrelation by Durbin–Levinson. */
function partialAutocorr(z: number[], maxLag: number) {
  const r = autocorr(z, maxLag);
  const out: number[] = [1];
  let phi: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    let num = r[k];
    for (let j = 1; j < k; j++) num -= phi[j - 1] * r[k - j];
    let den = 1;
    for (let j = 1; j < k; j++) den -= phi[j - 1] * r[j];
    const pk = num / den;
    const next = new Array(k).fill(0);
    for (let j = 1; j < k; j++) next[j - 1] = phi[j - 1] - pk * phi[k - j - 1];
    next[k - 1] = pk;
    phi = next;
    out.push(pk);
  }
  return out;
}

/* --------------------------------------------- chi-square upper tail (Q) */

function lnGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Regularised upper incomplete gamma Q(a, x) — Numerical Recipes gser/gcf. */
function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 300; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

const chiSqUpper = (q: number, df: number) => gammaQ(df / 2, q / 2);

/** Ljung–Box Q over `lags`, and its p-value against χ²(lags − p − q). */
function ljungBox(resid: number[], lags: number, df: number) {
  const n = resid.length;
  const r = autocorr(resid, lags);
  let q = 0;
  for (let k = 1; k <= lags; k++) q += (r[k] * r[k]) / (n - k);
  q *= n * (n + 2);
  return { q, df, p: chiSqUpper(q, df) };
}

/* ------------------------------------------------- conditional sum of squares */

interface Fit {
  p: number;
  q: number;
  par: number[];
  sigma2: number;
  loglike: number;
  aic: number;
  bic: number;
  resid: number[];
}

/**
 * ARMA(p, q) by conditional sum of squares, minimised by coordinate descent
 * with a halving step. Validated against statsmodels — see the module comment.
 */
function cssArma(z: number[], p: number, q: number): Fit {
  const n = z.length;
  const residuals = (par: number[]) => {
    const mu = par[0];
    const e = new Array<number>(n).fill(0);
    for (let t = 0; t < n; t++) {
      let pred = mu;
      for (let i = 0; i < p; i++) pred += par[1 + i] * (t - 1 - i >= 0 ? z[t - 1 - i] - mu : 0);
      for (let j = 0; j < q; j++) pred += par[1 + p + j] * (t - 1 - j >= 0 ? e[t - 1 - j] : 0);
      e[t] = z[t] - pred;
    }
    return e;
  };
  const sse = (par: number[]) => residuals(par).reduce((s, x) => s + x * x, 0);

  let best = new Array<number>(1 + p + q).fill(0);
  best[0] = mean(z);
  let bestS = sse(best);
  let step = 0.5;
  for (let it = 0; it < 200; it++) {
    let improved = false;
    for (let k = 0; k < best.length; k++) {
      for (const s of [step, -step]) {
        const cand = best.slice();
        cand[k] += s;
        if (cand.length > 1 && Math.max(...cand.slice(1).map(Math.abs)) > 0.995) continue;
        const S = sse(cand);
        if (S < bestS - 1e-12) {
          bestS = S;
          best = cand;
          improved = true;
        }
      }
    }
    if (!improved) {
      step *= 0.5;
      if (step < 1e-6) break;
    }
  }
  const sigma2 = bestS / n;
  const loglike = -0.5 * n * (Math.log(2 * Math.PI * sigma2) + 1);
  const k = p + q + 2; // mu, phi's, theta's, sigma²
  return {
    p,
    q,
    par: best,
    sigma2,
    loglike,
    aic: -2 * loglike + 2 * k,
    bic: -2 * loglike + k * Math.log(n),
    resid: residuals(best),
  };
}

const fmt = (x: number, d = 2) => x.toFixed(d);

/* ------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  const rawAcf = autocorr(Y, 6);
  const varByD = [0, 1, 2, 3].map((d) => ({ d, v: variance(difference(Y, d)), n: Y.length - d }));
  const bestD = varByD.reduce((a, b) => (b.v < a.v ? b : a)).d;
  const z = difference(Y, bestD);
  const band = 1.96 / Math.sqrt(z.length);
  const zAcf = autocorr(z, 5);
  const zPacf = partialAutocorr(z, 5);

  // ---- 1. the series ------------------------------------------------------
  push(
    `${Y.length} monthly observations, rising from ${Y[0]} to ${
      Y[Y.length - 1]
    }. Before fitting anything, the identification phase has to answer one question: is this stationary? The autocorrelations of the raw series answer it — ${rawAcf
      .slice(1, 5)
      .map((x) => fmt(x))
      .join(
        ", "
      )} — decaying slowly and staying positive for many lags rather than dying out. That slow decay is the signature of a **unit root**: the series has no level it returns to, so its mean depends on where you start looking.`,
    ln("d = 0"),
    {
      t: "plot",
      label: `the series (T = ${Y.length})`,
      domain: [1, Y.length, 40, 125],
      xLabel: "month",
      yLabel: "sales",
      curves: [{ pts: Y.map((v, i) => ({ x: i + 1, y: v })), cls: "active" }],
    },
    {
      t: "bars",
      label: "ACF of the raw series — persistent, not decaying to zero",
      max: 1,
      v: rawAcf.slice(1, 7).map((v, i) => ({
        k: `ρ${i + 1}`,
        val: v,
        show: fmt(v),
        cls: "warn" as TraceCls,
      })),
    }
  );

  // ---- 2. choosing d ------------------------------------------------------
  push(
    `Difference until the series stops wandering — but not further. The variance of Δᵈy is the cheapest diagnostic there is, and it is **U-shaped**: ${varByD
      .map((r) => `d=${r.d}: ${fmt(r.v, 1)}`)
      .join(", ")}. It bottoms out at **d = ${bestD}**. Under-differencing leaves the trend in and the variance stays huge; over-differencing *adds* variance rather than removing it, because differencing an already-stationary series injects an extra moving-average root. The ADF test agrees (statistic ${fmt(
      2.551,
      2
    )} on the raw series, p = 0.999, against ${fmt(
      -3.86,
      2
    )} and p = 0.002 after one difference), but the variance curve shows *why* in a way a p-value cannot.`,
    ln("while not stationary(diff(y, d)):"),
    {
      t: "bars",
      label: "variance of Δᵈy — the U that identifies d",
      v: varByD.map((r) => ({
        k: `d = ${r.d}`,
        val: r.v,
        show: fmt(r.v, 1),
        cls: (r.d === bestD ? "good" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The ADF statistics quoted here come from statsmodels; everything else in this trace is computed by the trace itself. A from-scratch ADF needs MacKinnon's response-surface tables for its p-values, which is a lookup rather than an algorithm.",
    }
  );

  // ---- 3. reading ACF and PACF -------------------------------------------
  const acfCut = zAcf.findIndex((v, i) => i > 0 && Math.abs(v) < band);
  push(
    `Now read the correlogram of Δy against the ±1.96/√T band (±${fmt(
      band,
      3
    )}). The **ACF cuts off**: ρ₁ = ${fmt(zAcf[1])} is well outside the band and ρ₂ = ${fmt(
      zAcf[2]
    )} onward are all inside it. The **PACF tails off**: ${zPacf
      .slice(1, 5)
      .map((x) => fmt(x))
      .join(
        ", "
      )}, shrinking gradually rather than dropping to zero. By the identification table that pattern is MA(${
      acfCut - 1
    }), so the tentative order is **ARIMA(${bestD > 0 ? 0 : 0}, ${bestD}, ${acfCut - 1})**. Note this is a *hypothesis*, read off two plots by eye — which is exactly why the next phase does not trust it.`,
    ln("z = diff(y, d)"),
    {
      t: "bars",
      label: `ACF of Δy — cuts off after lag ${acfCut - 1} (band ±${fmt(band, 3)})`,
      max: 1,
      v: zAcf.slice(1, 6).map((v, i) => ({
        k: `ρ${i + 1}`,
        val: v,
        show: fmt(v),
        cls: (Math.abs(v) > band ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "PACF of Δy — tails off",
      max: 1,
      v: zPacf.slice(1, 6).map((v, i) => ({
        k: `φ${i + 1}${i + 1}`,
        val: v,
        show: fmt(v),
        cls: (Math.abs(v) > band ? "warn" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 4. the grid --------------------------------------------------------
  const grid: Fit[] = [];
  for (let p = 0; p <= MAXPQ; p++) {
    for (let q = 0; q <= MAXPQ; q++) grid.push(cssArma(z, p, q));
  }
  const ranked = grid.slice().sort((a, b) => a.aic - b.aic);
  const winner = ranked[0];
  const runnerUp = ranked[1];

  push(
    `Estimation: fit all ${grid.length} combinations of p, q ≤ ${MAXPQ} by conditional sum of squares and score each with AIC = −2·ln L̂ + 2k. The grid agrees with the correlogram — **ARIMA(${
      winner.p
    }, ${bestD}, ${winner.q}) wins at AIC ${fmt(
      winner.aic
    )}** — but notice how *little* it wins by. The runner-up, ARIMA(${runnerUp.p}, ${bestD}, ${
      runnerUp.q
    }), scores ${fmt(runnerUp.aic)}, a margin of only ${fmt(
      runnerUp.aic - winner.aic
    )}. Both runners-up nest the winner: they contain it as the special case where the extra coefficient is zero, and the estimator duly drives that coefficient to about zero.`,
    ln("for p, q in product(range(3), range(3)):"),
    {
      t: "table",
      label: `AIC grid over (p, ${bestD}, q), conditional sum of squares`,
      head: ["model", "AIC", "BIC", "σ̂"],
      v: ranked.map((f) => ({
        cells: [
          `ARIMA(${f.p},${bestD},${f.q})`,
          fmt(f.aic),
          fmt(f.bic),
          fmt(Math.sqrt(f.sigma2)),
        ],
        cls: (f === winner ? "good" : f === runnerUp ? "warn" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 5. the fitted model ------------------------------------------------
  push(
    `The winning model, in full: Δy_t = ${fmt(winner.par[0])} + ε_t ${
      winner.par[1] < 0 ? "−" : "+"
    } ${fmt(Math.abs(winner.par[1]))}·ε_{t−1}. The drift term ${fmt(
      winner.par[0]
    )} is the average monthly growth, and θ̂₁ = ${fmt(
      winner.par[1]
    )} says each month's shock is partly *undone* the following month — a negative θ is mean reversion in the increments, which is what makes a jump like the ${
      Y[Y.length - 4]
    } → ${Y[Y.length - 3]} spike get walked back rather than carried forward.`,
    ln("fit = css_arma(z, p, q)"),
    {
      t: "kv",
      label: `ARIMA(${winner.p}, ${bestD}, ${winner.q})`,
      v: [
        { k: "drift μ̂", v: fmt(winner.par[0]), cls: "good" },
        { k: "θ̂₁", v: fmt(winner.par[1]), cls: "good" },
        { k: "σ̂", v: fmt(Math.sqrt(winner.sigma2)) },
        { k: "ln L̂", v: fmt(winner.loglike, 1) },
        { k: "AIC", v: fmt(winner.aic) },
      ],
    },
    {
      t: "note",
      text: "Cross-checked against statsmodels' exact-likelihood MLE on all nine candidates: the ranking is identical across the whole grid and the AIC values agree to within 0.9 (172.43 here against 173.30). Conditional sum of squares is the approximation that makes this implementable from scratch, and on this series it costs nothing that changes a decision.",
    }
  );

  // ---- 6. diagnostics -----------------------------------------------------
  const lb = ljungBox(winner.resid, LB_LAGS, LB_LAGS - winner.p - winner.q);
  const rAcf = autocorr(winner.resid, 8);
  const rBand = 1.96 / Math.sqrt(winner.resid.length);
  push(
    `Diagnostics: are the residuals white noise, or is there structure the model failed to absorb? Ljung–Box over ${LB_LAGS} lags gives Q = ${fmt(
      lb.q,
      3
    )} against χ²(${lb.df}), so p = ${fmt(
      lb.p,
      3
    )} — nowhere near rejection, and every residual autocorrelation sits inside the ±${fmt(
      rBand,
      3
    )} band. The model has extracted what there was to extract. **This is the step that licenses the AIC comparison**: AIC ranks models, it does not check whether the best of a bad set is any good, and a grid of nine misspecified models still returns a winner.`,
    ln("ljung_box(best.resid, lags=10)"),
    {
      t: "bars",
      label: `ACF of residuals (band ±${fmt(rBand, 3)}) — all inside`,
      max: 1,
      v: rAcf.slice(1, 9).map((v, i) => ({
        k: `ρ${i + 1}`,
        val: v,
        show: fmt(v),
        cls: (Math.abs(v) > rBand ? "bad" : "good") as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "Ljung–Box",
      v: [
        { k: "Q", v: fmt(lb.q, 3) },
        { k: "df", v: String(lb.df) },
        { k: "p", v: fmt(lb.p, 3), cls: "good" },
        { k: "verdict", v: "white noise", cls: "good" },
      ],
    }
  );

  // ---- 7. payoff A: over-differencing ------------------------------------
  const z2 = difference(Y, 2);
  const grid2: Fit[] = [];
  for (let q = 0; q <= MAXPQ; q++) grid2.push(cssArma(z2, 0, q));
  const best2 = grid2.slice().sort((a, b) => a.aic - b.aic)[0];

  push(
    `**Payoff — what over-differencing actually does.** The page warns that differencing past stationarity "inflates MA terms and makes estimation harder"; here is the cost, measured. Differencing twice raises the variance from ${fmt(
      varByD[1].v,
      2
    )} to ${fmt(varByD[2].v, 2)} — **${fmt(
      varByD[2].v / varByD[1].v,
      1
    )}× worse** — and the best model on the over-differenced series scores AIC ${fmt(
      best2.aic
    )} against ${fmt(winner.aic)} at d = ${bestD}. The mechanism is not subtle: Δ applied to an already-stationary series is itself an MA(1) filter with a **unit root** in the MA polynomial, θ = −1. The estimator then has to spend a parameter cancelling a root that differencing put there, and a unit MA root sits exactly on the boundary of the parameter space where optimisation is worst behaved. You pay twice — once in variance, once in an estimate that is hard to pin down.`,
    ln("while not stationary(diff(y, d)):"),
    {
      t: "table",
      label: "d = 1 against d = 2, same data, same estimator",
      head: ["", `d = ${bestD}`, "d = 2"],
      v: [
        { cells: ["variance of Δᵈy", fmt(varByD[1].v, 2), fmt(varByD[2].v, 2)], cls: "warn" as TraceCls },
        { cells: ["best AIC", fmt(winner.aic), fmt(best2.aic)], cls: "bad" as TraceCls },
        {
          cells: [
            "θ̂₁ of best model",
            fmt(winner.par[1]),
            fmt(best2.par[1] ?? NaN),
          ],
          cls: "dim" as TraceCls,
        },
      ],
    },
    {
      t: "note",
      text: `θ̂₁ moves to ${fmt(
        best2.par[1] ?? NaN
      )} at d = 2 — pushed toward the −1 boundary, which is precisely the unit MA root the extra difference introduced. That is what "inflates MA terms" means concretely.`,
      cls: "bad",
    }
  );

  // ---- 8. payoff B: what an AIC margin can and cannot be -----------------
  const nested = ranked.filter(
    (f) => f !== winner && f.p >= winner.p && f.q >= winner.q
  );
  const aicMargin = runnerUp.aic - winner.aic;
  const bicMargin = runnerUp.bic - winner.bic;
  const lnT = Math.log(z.length);

  push(
    `**Payoff — the margin is bounded, and by exactly the penalty constant.** ARIMA(${
      winner.p
    },${bestD},${winner.q}) beats its nesting rival by ${fmt(
      aicMargin
    )} on AIC. That is not a coincidence and it is not a close call in disguise: when the extra parameter is genuinely useless, the log-likelihood barely moves, so the whole difference is the penalty term — **2 per parameter for AIC**. The most AIC can ever prefer a simpler nested model by is 2, no matter how redundant the extra coefficient is. Switch to BIC, whose penalty is ln T = ln ${
      z.length
    } = ${fmt(
      lnT
    )}, and the same comparison widens to ${fmt(
      bicMargin
    )}. Same data, same fits, same ordering — a ${fmt(
      bicMargin / aicMargin,
      2
    )}× more decisive verdict, purely from the penalty constant. This is the whole content of "BIC prefers simpler models", and it is why a 2-point AIC win should never be read as strong evidence.`,
    ln("aic = -2 * fit.loglike + 2 * k"),
    {
      t: "bars",
      label: "margin over the nesting runner-up, against each criterion's penalty",
      v: [
        { k: "AIC margin", val: aicMargin, show: fmt(aicMargin), cls: "warn" },
        { k: "AIC penalty (2)", val: 2, show: "2.00", cls: "dim" },
        { k: "BIC margin", val: bicMargin, show: fmt(bicMargin), cls: "good" },
        { k: `BIC penalty (ln ${z.length})`, val: lnT, show: fmt(lnT), cls: "dim" },
      ],
    },
    {
      t: "table",
      label: `every model that nests the winner (extra parameters driven to ~0)`,
      head: ["model", "AIC", "− winner", "BIC", "− winner"],
      v: nested.map((f) => ({
        cells: [
          `ARIMA(${f.p},${bestD},${f.q})`,
          fmt(f.aic),
          `+${fmt(f.aic - winner.aic)}`,
          fmt(f.bic),
          `+${fmt(f.bic - winner.bic)}`,
        ],
        cls: "dim" as TraceCls,
      })),
    }
  );

  return {
    id: "arima-order-selection",
    title: "ARIMA order selection — the AIC grid, and how little it wins by",
    caption:
      "Box-Jenkins end to end on 36 observations: the raw ACF's slow decay identifies a unit root, the variance of the differenced series picks d by a visible U-shape, the correlogram of Δy proposes MA(1), and a 9-model AIC grid confirms it. Then two measured payoffs. Over-differencing raises the variance 3x and pushes θ̂ toward the −1 boundary — the unit MA root the extra difference itself created. And the winner's AIC margin over its nesting rival is 1.96, which is not a near-miss but a ceiling: when the extra parameter is useless the entire difference is the penalty constant, so AIC can never prefer the simpler nested model by more than 2. BIC's ln T = 3.56 makes the same call twice as decisively.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const arimaOrderTrace = build();
