"use client";

import { useMemo, useState } from "react";
import { VIZ, gaussian, seededRandom } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { cn } from "@/lib/utils";

/**
 * The Box–Jenkins procedure, stage by stage.
 *
 * ARIMA is usually taught as a formula and then a call to `ARIMA(order=…)`,
 * which hides the part that actually takes judgement: *how you arrived at that
 * order*. The procedure is a pipeline — test for a unit root, difference, read
 * the correlograms, fit a grid, check the residuals, only then forecast — and
 * each stage is only interpretable once you've seen what the previous one
 * produced. Hence a walkthrough rather than a picture.
 *
 * Everything is computed here: the ADF regression and its t-statistic, the ACF
 * and the Durbin–Levinson PACF, a Hannan–Rissanen ARMA fit for every candidate
 * order, Gaussian AIC/BIC on a **common estimation sample** so the numbers are
 * comparable, a Ljung–Box statistic with a real chi-square tail probability,
 * and ψ-weight forecast intervals. The candidate grid is clickable and the
 * choice flows into the diagnostics and the forecast, so the reader can fit the
 * wrong model on purpose and watch the residual check catch it.
 *
 * The series is simulated from a known ARIMA(1,1,1), which turns the whole
 * walkthrough into a test the reader can grade: the procedure should recover
 * the order and the coefficients it was generated with.
 */

/* -------------------------------------------------------------- constants */

const T = 200; // observations in the toy daily-demand series
const PHI = 0.65; // true AR(1) coefficient
const THETA = 0.45; // true MA(1) coefficient
const SIGMA = 2.0; // true innovation sd
const LEVEL = 380; // starting level, units/day
const SEED = 345;
const MAX_LAG = 18; // lags shown in the correlograms
const LB_LAGS = 12; // lags in the Ljung–Box portmanteau test
const HORIZON = 12; // forecast horizon, days

/** Asymptotic 5% critical value for the ADF t-statistic, constant and no trend. */
const ADF_CRIT_5 = -2.86;
/** Order of the long AR used for Hannan–Rissanen's residual proxies. */
const KAR = 8;

interface Order {
  p: number;
  d: number;
  q: number;
}

/** Candidate orders. `PMAX`/`QMAX` fix the estimation sample across all of them. */
const CANDIDATES: Order[] = [
  { p: 0, d: 1, q: 0 },
  { p: 1, d: 1, q: 0 },
  { p: 0, d: 1, q: 1 },
  { p: 1, d: 1, q: 1 },
  { p: 2, d: 1, q: 1 },
  { p: 1, d: 1, q: 2 },
];
const PMAX = Math.max(...CANDIDATES.map((o) => o.p));
const QMAX = Math.max(...CANDIDATES.map((o) => o.q));

/* ------------------------------------------------------------ linear algebra */

/** Gauss–Jordan inverse of a small square matrix; null if singular. */
function invert(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < 1e-12) return null;
    for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (!f) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((row) => row.slice(n));
}

interface Ols {
  beta: number[];
  res: number[];
  /** Standard errors of the coefficients — needed for the ADF t-statistic. */
  se: number[];
}

/** Ordinary least squares by normal equations. */
function ols(X: number[][], y: number[]): Ols | null {
  const k = X[0].length;
  const n = X.length;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0) as number[]);
  const Xty = Array(k).fill(0) as number[];
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  const inv = invert(XtX);
  if (!inv) return null;
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  const res = y.map((v, i) => v - X[i].reduce((s, x, j) => s + x * beta[j], 0));
  const s2 = res.reduce((s, r) => s + r * r, 0) / Math.max(1, n - k);
  const se = inv.map((row, j) => Math.sqrt(Math.max(s2 * row[j], 0)));
  return { beta, res, se };
}

/* ------------------------------------------------------------- statistics */

/**
 * Augmented Dickey–Fuller: regress Δy_t on a constant, y_{t−1} and `lags`
 * lagged differences. The t-statistic on y_{t−1} is the test statistic; more
 * negative than the critical value rejects the unit root.
 */
function adf(y: number[], lags = 1): number {
  const d = y.slice(1).map((v, i) => v - y[i]);
  const X: number[][] = [];
  const Y: number[] = [];
  for (let t = lags; t < d.length; t++) {
    const row = [1, y[t]];
    for (let i = 1; i <= lags; i++) row.push(d[t - i]);
    X.push(row);
    Y.push(d[t]);
  }
  const r = ols(X, Y);
  return r ? r.beta[1] / r.se[1] : NaN;
}

/** Sample autocorrelations r_1 … r_maxLag. */
function acf(x: number[], maxLag: number): number[] {
  const n = x.length;
  const m = x.reduce((s, v) => s + v, 0) / n;
  const d0 = x.reduce((s, v) => s + (v - m) ** 2, 0);
  const out: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    let s = 0;
    for (let t = k; t < n; t++) s += (x[t] - m) * (x[t - k] - m);
    out.push(s / d0);
  }
  return out;
}

/** Partial autocorrelations from the ACF by the Durbin–Levinson recursion. */
function pacf(r: number[]): number[] {
  const out: number[] = [];
  let prev: number[] = [];
  for (let k = 1; k <= r.length; k++) {
    let num = r[k - 1];
    for (let j = 1; j < k; j++) num -= prev[j - 1] * r[k - j - 1];
    let den = 1;
    for (let j = 1; j < k; j++) den -= prev[j - 1] * r[j - 1];
    const pkk = den === 0 ? 0 : num / den;
    const cur: number[] = [];
    for (let j = 1; j < k; j++) cur.push(prev[j - 1] - pkk * prev[k - j - 1]);
    cur.push(pkk);
    out.push(pkk);
    prev = cur;
  }
  return out;
}

const LN_GAMMA_C = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Lanczos log-gamma — only needed to turn a Ljung–Box Q into a p-value. */
function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = 0.99999999999980993;
  const t = z + 7.5;
  for (let i = 0; i < 8; i++) a += LN_GAMMA_C[i] / (z + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularised upper incomplete gamma Q(s, x) — series below s+1, CF above. */
function gammaQ(s: number, x: number): number {
  if (x <= 0) return 1;
  if (x < s + 1) {
    let sum = 1 / s;
    let term = sum;
    for (let k = 1; k < 300; k++) {
      term *= x / (s + k);
      sum += term;
      if (Math.abs(term) < 1e-15 * Math.abs(sum)) break;
    }
    return 1 - sum * Math.exp(-x + s * Math.log(x) - lnGamma(s));
  }
  let b = x + 1 - s;
  let c = 1e30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h * Math.exp(-x + s * Math.log(x) - lnGamma(s));
}

/** Upper-tail probability of a chi-square with `df` degrees of freedom. */
const chiSf = (x: number, df: number) => (df <= 0 ? NaN : gammaQ(df / 2, x / 2));

/* ------------------------------------------------------------- the series */

/** ARIMA(1,1,1): an ARMA(1,1) on the daily change, integrated once. */
function simulate(): { y: number[]; dy: number[] } {
  const rng = seededRandom(SEED);
  const eps = Array.from({ length: T }, () => gaussian(rng, 0, SIGMA));
  const w = Array(T).fill(0) as number[];
  for (let t = 1; t < T; t++) w[t] = PHI * w[t - 1] + eps[t] + THETA * eps[t - 1];
  const y: number[] = [];
  let acc = LEVEL;
  for (let t = 0; t < T; t++) {
    acc += w[t];
    y.push(acc);
  }
  return { y, dy: y.slice(1).map((v, i) => v - y[i]) };
}

const { y: SERIES, dy: DIFFS } = simulate();

/* ------------------------------------------------------------ ARMA fitting */

interface Fit {
  order: Order;
  label: string;
  c: number;
  phi: number[];
  theta: number[];
  sigma: number;
  aic: number;
  bic: number;
  /** Residuals over the common estimation sample. */
  resid: number[];
  k: number;
  n: number;
  /**
   * A fit is unusable when the estimated MA polynomial is non-invertible or the
   * AR part is explosive — the recursion that produces the residuals diverges,
   * and the model has no stationary interpretation.
   */
  unstable: boolean;
  unstableReason: string;
}

/**
 * Hannan–Rissanen two-stage ARMA estimation: fit a long AR to get residual
 * proxies, then regress on lagged values *and* lagged proxies. Residuals are
 * then recomputed recursively with the fitted coefficients, over a sample that
 * is identical for every candidate order — otherwise AIC would be comparing
 * likelihoods computed on different data.
 */
function fitArma(w: number[], order: Order): Fit {
  const n = w.length;
  const { p, q } = order;

  const X1: number[][] = [];
  const Y1: number[] = [];
  for (let t = KAR; t < n; t++) {
    const row = [1];
    for (let i = 1; i <= KAR; i++) row.push(w[t - i]);
    X1.push(row);
    Y1.push(w[t]);
  }
  const stage1 = ols(X1, Y1);
  const proxy = Array(n).fill(0) as number[];
  if (stage1) for (let t = KAR; t < n; t++) proxy[t] = stage1.res[t - KAR];

  const start = KAR + QMAX;
  const X: number[][] = [];
  const Y: number[] = [];
  for (let t = start; t < n; t++) {
    const row = [1];
    for (let i = 1; i <= p; i++) row.push(w[t - i]);
    for (let j = 1; j <= q; j++) row.push(proxy[t - j]);
    X.push(row);
    Y.push(w[t]);
  }
  const stage2 = ols(X, Y);
  const beta = stage2?.beta ?? [w.reduce((s, v) => s + v, 0) / n];
  const c = beta[0];
  const phi = beta.slice(1, 1 + p);
  const theta = beta.slice(1 + p);

  // Recursive residuals with the fitted coefficients, on the common sample.
  const e = Array(n).fill(0) as number[];
  let sse = 0;
  let count = 0;
  for (let t = PMAX; t < n; t++) {
    let pred = c;
    for (let i = 1; i <= p; i++) pred += phi[i - 1] * w[t - i];
    for (let j = 1; j <= q; j++) pred += theta[j - 1] * e[t - j];
    e[t] = w[t] - pred;
    sse += e[t] * e[t];
    count++;
  }

  const s2 = sse / count;
  const k = p + q + 2; // coefficients, the constant, and σ²
  const logL = -0.5 * count * (Math.log(2 * Math.PI * s2) + 1);

  const badMa = theta.findIndex((v) => Math.abs(v) >= 1);
  const badAr = phi.findIndex((v) => Math.abs(v) >= 1);
  const unstableReason =
    badMa >= 0
      ? `non-invertible — theta${badMa + 1} = ${theta[badMa].toFixed(2)}, |theta| >= 1`
      : badAr >= 0
        ? `explosive — phi${badAr + 1} = ${phi[badAr].toFixed(2)}, |phi| >= 1`
        : !Number.isFinite(s2)
          ? "the residual recursion diverges"
          : "";

  return {
    order,
    label: `(${p},${order.d},${q})`,
    c,
    phi,
    theta,
    sigma: Math.sqrt(s2),
    aic: -2 * logL + 2 * k,
    bic: -2 * logL + k * Math.log(count),
    resid: e.slice(PMAX),
    k,
    n: count,
    unstable: unstableReason !== "",
    unstableReason,
  };
}

/** ψ-weights of the ARMA, then of the integrated process (their running sum). */
function psiWeights(fit: Fit, h: number): number[] {
  const psi = [1];
  for (let j = 1; j < h; j++) {
    let v = j <= fit.theta.length ? fit.theta[j - 1] : 0;
    for (let i = 1; i <= Math.min(fit.phi.length, j); i++) v += fit.phi[i - 1] * psi[j - i];
    psi.push(v);
  }
  let cum = 0;
  return psi.map((v) => (cum += v));
}

interface Forecast {
  point: number[];
  lo: number[];
  hi: number[];
  half: number[];
}

/** Recursive point forecasts on the differences, integrated back to levels. */
function forecast(fit: Fit, w: number[], last: number, h: number): Forecast {
  const { p, q } = fit.order;
  const hist = [...w];
  const errs = [...fit.resid];
  const psiStar = psiWeights(fit, h);
  const point: number[] = [];
  const lo: number[] = [];
  const hi: number[] = [];
  const half: number[] = [];
  let level = last;
  let varSum = 0;

  for (let step = 1; step <= h; step++) {
    let wf = fit.c;
    for (let i = 1; i <= p; i++) wf += fit.phi[i - 1] * hist[hist.length - i];
    for (let j = 1; j <= q; j++) {
      // Future innovations have expectation zero; only observed errors count.
      const idx = errs.length - j + (step - 1);
      wf += fit.theta[j - 1] * (idx < errs.length ? errs[idx] : 0);
    }
    hist.push(wf);
    level += wf;
    varSum += psiStar[step - 1] ** 2;
    const hw = 1.96 * fit.sigma * Math.sqrt(varSum);
    point.push(level);
    half.push(hw);
    lo.push(level - hw);
    hi.push(level + hw);
  }
  return { point, lo, hi, half };
}

/* ------------------------------------------------------- derived quantities */

const ADF_LEVELS = adf(SERIES, 1);
const ADF_DIFFS = adf(DIFFS, 1);
const ACF_LEVELS = acf(SERIES, MAX_LAG);
const ACF_DIFFS = acf(DIFFS, MAX_LAG);
const PACF_DIFFS = pacf(ACF_DIFFS);
const BAND = 1.96 / Math.sqrt(DIFFS.length);
const FITS = CANDIDATES.map((o) => fitArma(DIFFS, o));
const BEST = [...FITS].filter((f) => !f.unstable).sort((a, b) => a.aic - b.aic)[0];
/** The fit at the order the series was actually generated from. */
const TRUE_FIT = FITS.find((f) => f.order.p === 1 && f.order.q === 1)!;

/**
 * An MA(1) can only produce |ρ₁| ≤ 0.5, whatever θ is. When the sample ρ₁
 * exceeds that, no invertible MA(1) exists — which is why the (0,1,1) fit comes
 * back non-invertible rather than merely bad.
 */
const MA1_CEILING = 0.5;

/* ------------------------------------------------------------ svg helpers */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Map a value series into a path inside `box`, given the value range. */
function seriesPath(v: number[], box: Box, lo: number, hi: number, from = 0): string {
  const n = v.length - from;
  return v
    .slice(from)
    .map((val, i) => {
      const x = box.x + (i / Math.max(1, n - 1)) * box.w;
      const yy = box.y + box.h - ((val - lo) / (hi - lo || 1)) * box.h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`;
    })
    .join("");
}

const extent = (v: number[], pad = 0.06): [number, number] => {
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const m = (hi - lo) * pad || 1;
  return [lo - m, hi + m];
};

const fmt1 = (n: number) => n.toFixed(1);
const fmt2 = (n: number) => n.toFixed(2);
/** p-values below the resolution of the test are reported as an upper bound. */
const fmtP = (p: number) => (p < 1e-4 ? "p < 0.0001" : `p = ${p.toFixed(4)}`);

/** A correlogram: stems, the ±1.96/√n band, and a zero line. */
function Correlogram({
  values,
  box,
  title,
  color,
  band,
}: {
  values: number[];
  box: Box;
  title: string;
  color: string;
  band: number;
}) {
  const mid = box.y + box.h / 2;
  const scale = box.h / 2 / 1.05;
  const step = box.w / values.length;
  return (
    <g>
      <text x={box.x} y={box.y - 8} fill={VIZ.textBright} className="font-mono text-[10px]">
        {title}
      </text>
      <rect
        x={box.x}
        y={mid - band * scale}
        width={box.w}
        height={band * scale * 2}
        fill={VIZ.brand}
        opacity={0.12}
      />
      <line x1={box.x} y1={mid} x2={box.x + box.w} y2={mid} stroke={VIZ.axis} strokeWidth={0.6} />
      {values.map((v, k) => {
        const x = box.x + (k + 0.5) * step;
        const sig = Math.abs(v) > band;
        return (
          <g key={k}>
            <line
              x1={x}
              y1={mid}
              x2={x}
              y2={mid - v * scale}
              stroke={sig ? color : VIZ.axis}
              strokeWidth={step > 12 ? 5 : 3.5}
              opacity={sig ? 1 : 0.55}
            />
            {(k + 1) % 4 === 0 && (
              <text
                x={x}
                y={box.y + box.h + 12}
                textAnchor="middle"
                fill={VIZ.text}
                className="font-mono text-[8px]"
              >
                {k + 1}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/* ---------------------------------------------------------------- phases */

const PHASES: GuidedPhase[] = [
  { id: "identify", label: "Identification · which model?", tone: "teal" },
  { id: "estimate", label: "Estimation & checking", tone: "brand", numberPrefix: "F" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "identify",
    label: "The series",
    title: "You cannot fit this series as it stands",
    body: (
      <>
        <p>
          {T} days of the running <code>daily-demand</code> series. It wanders: the level at the end
          has nothing to do with the level at the start, and there is no mean it returns to. ARIMA&rsquo;s
          AR and MA parts are defined only for a <strong>stationary</strong> series, so none of the
          machinery applies yet.
        </p>
        <p>
          Fitting anyway is the classic failure. Regress a wandering series on its own lag and you
          get a coefficient pinned near 1 with a standard error that is not what it claims to be —
          the textbook <strong>spurious regression</strong>. The model looks superb in-sample and
          forecasts nothing.
        </p>
      </>
    ),
    hint: `The autocorrelation at lag 1 is ${fmt2(ACF_LEVELS[0])} and still ${fmt2(ACF_LEVELS[MAX_LAG - 1])} at lag ${MAX_LAG} — barely decaying. That is a unit root, not memory.`,
  },
  {
    phase: "identify",
    label: "Difference",
    title: "Difference until a test says stop — do not eyeball it",
    body: (
      <>
        <p>
          The <strong>Augmented Dickey–Fuller</strong> test asks whether the series has a unit root.
          On the levels the statistic is <code>{fmt2(ADF_LEVELS)}</code>, nowhere near the 5%
          critical value of <code>{ADF_CRIT_5}</code>, so the null of a unit root stands. Take first
          differences — day-over-day change — and the statistic falls to{" "}
          <code>{fmt2(ADF_DIFFS)}</code>, well past it. One difference is enough: <strong>d = 1</strong>.
        </p>
        <p>
          Guessing <em>d</em> by eye is where this goes wrong in both directions. Under-difference
          and every later stage inherits a trend it will mistake for structure; over-difference and
          you inject a spurious MA term and inflate the forecast variance for nothing.
        </p>
      </>
    ),
    hint: "Compare the two panels: the top one goes somewhere, the bottom one goes nowhere. Only the bottom one has a mean to model.",
  },
  {
    phase: "identify",
    label: "Read ACF/PACF",
    title: "Read the correlograms of the differenced series",
    body: (
      <>
        <p>
          Now the shape of the memory tells you the orders. <strong>AR(p)</strong>: the PACF cuts off
          sharply after lag <em>p</em> while the ACF decays. <strong>MA(q)</strong>: the mirror image
          — the ACF cuts off after <em>q</em>, the PACF decays. When <em>both</em> tail off, as they
          do here, neither pure family fits and you are looking at a mixed <strong>ARMA</strong>.
        </p>
        <p>
          This is identification, not estimation: it narrows an infinite space of orders to a handful
          worth fitting. Skip it and you are searching blind — and a wide automatic grid search will
          happily hand you an over-parameterised model that fits the noise.
        </p>
      </>
    ),
    hint: `The shaded band is ±1.96/√n = ±${fmt2(BAND)}; stems inside it are indistinguishable from zero. Both plots decay rather than cut off — so try small p and q together.`,
  },
  {
    phase: "estimate",
    label: "Fit & rank",
    title: "Fit the shortlist, rank by AIC and BIC",
    body: (
      <>
        <p>
          Every candidate is fitted on the same estimation sample and scored by{" "}
          <strong>AIC</strong> and <strong>BIC</strong>, which add a penalty per parameter to the
          fit. Without that penalty the comparison is meaningless: residual variance can only fall as
          you add terms, so &ldquo;best fit&rdquo; always names the biggest model.
        </p>
        <p>
          Note what happens to <code>(0,1,1)</code>. An MA(1) can produce a lag-1 autocorrelation of
          at most {MA1_CEILING} whatever θ you choose, and the sample value here is{" "}
          <code>{fmt2(ACF_DIFFS[0])}</code> — so no invertible MA(1) exists. It is not a slightly
          worse model, it is not a model.
        </p>
      </>
    ),
    hint: "Click any order to select it — your choice carries into the diagnostics and the forecast, so you can fit the wrong model deliberately.",
  },
  {
    phase: "estimate",
    label: "Diagnostics",
    title: "The residuals decide whether the winner is adequate",
    body: (
      <>
        <p>
          AIC only ranks candidates <em>against each other</em>; the whole shortlist could be
          inadequate. The check is the residuals: if the model has captured the structure, what is
          left must be indistinguishable from white noise. The{" "}
          <strong>Ljung–Box</strong> statistic tests exactly that, pooling the first {LB_LAGS}{" "}
          residual autocorrelations into one number.
        </p>
        <p>
          A large <em>p</em> means no detectable structure left, so the model is adequate. A small
          one means the residuals still contain a pattern the model failed to use — and the fix is to
          go back to the correlograms, not to forecast anyway.
        </p>
      </>
    ),
    hint: "Select (0,1,0) above — a plain random walk — and watch the residual stems climb out of the band and the p-value collapse.",
  },
  {
    phase: "estimate",
    label: "Forecast",
    title: "Only now, forecast — and mind the widening band",
    body: (
      <>
        <p>
          Point forecasts come from running the fitted recursion forward, with future shocks set to
          their expectation of zero. The interval comes from the ψ-weights: the variance at horizon{" "}
          <em>h</em> accumulates every innovation between now and then, so it grows with the
          horizon and never stops growing.
        </p>
        <p>
          That widening is the honest part of the output. A forecast is not a line — it is a
          distribution, and for an integrated series the uncertainty compounds rather than settling
          down to a constant.
        </p>
      </>
    ),
    hint: "The band is the deliverable. Try (0,1,0) and compare: a wrong model can give a similar-looking line with a badly-calibrated interval.",
  },
];

const S_SERIES = 0;
const S_DIFF = 1;
const S_ACF = 2;
const S_FIT = 3;
const S_DIAG = 4;
const S_FORECAST = 5;

/* ------------------------------------------------------------------ view */

export function BoxJenkinsViz({ className }: { className?: string }) {
  const [orderIdx, setOrderIdx] = useState(CANDIDATES.findIndex((o) => o.p === 1 && o.q === 1));

  const fit = FITS[orderIdx];
  const diagnostics = useMemo(() => {
    const r = acf(fit.resid, MAX_LAG);
    const n = fit.resid.length;
    let Q = 0;
    for (let k = 1; k <= LB_LAGS; k++) Q += r[k - 1] ** 2 / (n - k);
    Q *= n * (n + 2);
    const df = LB_LAGS - fit.order.p - fit.order.q;
    return { r, Q, df, p: chiSf(Q, df), band: 1.96 / Math.sqrt(n) };
  }, [fit]);

  const fc = useMemo(
    () => forecast(fit, DIFFS, SERIES[SERIES.length - 1], HORIZON),
    [fit],
  );

  /* -------------------------------------------------------------- stages */

  /** A row of clickable candidate orders, shared by the estimation steps. */
  const orderChips = (
    <div className="flex flex-wrap gap-1.5 border-b border-surface-border px-3 py-2">
      <span className="self-center font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
        order
      </span>
      {FITS.map((f, i) => (
        <button
          key={f.label}
          type="button"
          onClick={() => setOrderIdx(i)}
          disabled={f.unstable}
          title={f.unstable ? f.unstableReason : undefined}
          aria-pressed={i === orderIdx}
          className={cn(
            "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
            i === orderIdx
              ? "border-brand-500 bg-brand-500/15 text-white"
              : f.unstable
                ? "cursor-not-allowed border-transparent text-slate-600 line-through decoration-accent-rose/70"
                : "border-transparent text-slate-400 hover:bg-surface-elevated/60 hover:text-slate-200",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  /** Step 01 — the raw series. */
  const seriesStage = () => {
    const [lo, hi] = extent(SERIES);
    const box: Box = { x: 52, y: 26, w: 600, h: 190 };
    return (
      <svg viewBox="0 0 680 260" className="block w-full" role="img" aria-label="The daily-demand series in levels — a wandering, non-stationary series">
        <path d={seriesPath(SERIES, box, lo, hi)} fill="none" stroke={VIZ.teal} strokeWidth={1.2} />
        <line x1={box.x} y1={box.y + box.h} x2={box.x + box.w} y2={box.y + box.h} stroke={VIZ.axis} strokeWidth={0.6} />
        {[0, 50, 100, 150, 199].map((d) => (
          <text key={d} x={box.x + (d / (T - 1)) * box.w} y={box.y + box.h + 16} textAnchor="middle" fill={VIZ.text} className="font-mono text-[9px]">
            {d}
          </text>
        ))}
        {[lo, (lo + hi) / 2, hi].map((v, i) => (
          <text key={i} x={box.x - 6} y={box.y + box.h - (i / 2) * box.h + 3} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
            {Math.round(v)}
          </text>
        ))}
        <text x={box.x} y={18} fill={VIZ.textBright} className="font-mono text-[10px]">
          daily demand, units · {T} days
        </text>
        <text x={box.x + box.w} y={18} textAnchor="end" fill={VIZ.text} className="font-mono text-[10px]">
          no fixed mean · no fixed variance
        </text>
      </svg>
    );
  };

  /** Step 02 — levels vs differences, each with its ADF statistic. */
  const diffStage = () => {
    const [lo1, hi1] = extent(SERIES);
    const [lo2, hi2] = extent(DIFFS);
    const top: Box = { x: 52, y: 30, w: 600, h: 96 };
    const bot: Box = { x: 52, y: 176, w: 600, h: 96 };
    const zero = bot.y + bot.h - ((0 - lo2) / (hi2 - lo2)) * bot.h;
    return (
      <svg viewBox="0 0 680 300" className="block w-full" role="img" aria-label="The series in levels and in first differences, each with its Augmented Dickey-Fuller statistic">
        <path d={seriesPath(SERIES, top, lo1, hi1)} fill="none" stroke={VIZ.text} strokeWidth={1} opacity={0.7} />
        <text x={top.x} y={22} fill={VIZ.textBright} className="font-mono text-[10px]">
          levels y_t
        </text>
        <text x={top.x + top.w} y={22} textAnchor="end" fill={VIZ.rose} className="font-mono text-[10px]">
          ADF {fmt2(ADF_LEVELS)} &gt; {ADF_CRIT_5} → unit root stands
        </text>

        <path d={seriesPath(DIFFS, bot, lo2, hi2)} fill="none" stroke={VIZ.teal} strokeWidth={1} />
        <line x1={bot.x} y1={zero} x2={bot.x + bot.w} y2={zero} stroke={VIZ.axis} strokeWidth={0.6} strokeDasharray="3 3" />
        <text x={bot.x} y={168} fill={VIZ.textBright} className="font-mono text-[10px]">
          first differences Δy_t
        </text>
        <text x={bot.x + bot.w} y={168} textAnchor="end" fill={VIZ.teal} className="font-mono text-[10px]">
          ADF {fmt2(ADF_DIFFS)} &lt; {ADF_CRIT_5} → stationary
        </text>
        <text x={bot.x} y={bot.y + bot.h + 18} fill={VIZ.text} className="font-mono text-[9px]">
          d = 1 · {DIFFS.length} usable observations
        </text>
      </svg>
    );
  };

  /** Step 03 — ACF and PACF of the differenced series. */
  const acfStage = () => (
    <svg viewBox="0 0 680 300" className="block w-full" role="img" aria-label="ACF and PACF of the differenced series, with significance bands">
      <Correlogram values={ACF_DIFFS} box={{ x: 52, y: 34, w: 600, h: 96 }} title={`ACF of Δy_t — decays, does not cut off`} color={VIZ.brand} band={BAND} />
      <Correlogram values={PACF_DIFFS} box={{ x: 52, y: 176, w: 600, h: 96 }} title="PACF of Δy_t — also decays" color={VIZ.teal} band={BAND} />
      <text x={652} y={26} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
        band ±{fmt2(BAND)}
      </text>
      <text x={52} y={290} fill={VIZ.text} className="font-mono text-[9px]">
        both tail off → mixed ARMA, not pure AR and not pure MA
      </text>
    </svg>
  );

  /** Step F1 — the candidate grid. */
  const fitStage = () => {
    const rowH = 30;
    const finite = FITS.filter((f) => !f.unstable);
    const aicLo = Math.min(...finite.map((f) => f.aic));
    const aicHi = Math.max(...finite.map((f) => f.aic));
    return (
      <svg viewBox={`0 0 680 ${44 + FITS.length * rowH + 34}`} className="block w-full" role="img" aria-label="Candidate ARIMA orders ranked by AIC and BIC">
        {["order", "σ", "AIC", "BIC", "ΔAIC"].map((h, i) => (
          <text key={h} x={[62, 168, 250, 336, 424][i]} y={26} fill={VIZ.text} className="font-mono text-[9px] uppercase tracking-[0.1em]">
            {h}
          </text>
        ))}
        {FITS.map((f, i) => {
          const yy = 40 + i * rowH;
          const on = i === orderIdx;
          const best = !f.unstable && f === BEST;
          return (
            <g
              key={f.label}
              className={f.unstable ? undefined : "cursor-pointer"}
              onClick={f.unstable ? undefined : () => setOrderIdx(i)}
            >
              <rect x={52} y={yy} width={600} height={rowH - 4} rx={5} fill={on ? VIZ.brand : VIZ.card} opacity={on ? 0.18 : 0.55} stroke={on ? VIZ.brand : "transparent"} strokeWidth={1} />
              <text x={62} y={yy + 18} fill={f.unstable ? VIZ.text : VIZ.textBright} className="font-mono text-[11px]">
                {f.label}
              </text>
              {f.unstable ? (
                <text x={168} y={yy + 18} fill={VIZ.rose} className="font-mono text-[10px]">
                  {f.unstableReason} — rejected, not ranked
                </text>
              ) : (
                <>
                  <text x={168} y={yy + 18} fill={VIZ.text} className="font-mono text-[10px]">
                    {fmt2(f.sigma)}
                  </text>
                  <text x={250} y={yy + 18} fill={best ? VIZ.teal : VIZ.textBright} className="font-mono text-[10px]">
                    {fmt1(f.aic)}
                  </text>
                  <text x={336} y={yy + 18} fill={VIZ.text} className="font-mono text-[10px]">
                    {fmt1(f.bic)}
                  </text>
                  <text x={424} y={yy + 18} fill={VIZ.text} className="font-mono text-[10px]">
                    +{fmt1(f.aic - aicLo)}
                  </text>
                  <rect x={470} y={yy + 7} width={Math.max(2, (1 - (f.aic - aicLo) / (aicHi - aicLo || 1)) * 132)} height={9} rx={2} fill={best ? VIZ.teal : VIZ.brand} opacity={best ? 0.9 : 0.45} />
                  {best && (
                    <text x={648} y={yy + 18} textAnchor="end" fill={VIZ.teal} className="font-mono text-[9px]">
                      best
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
        <text x={52} y={44 + FITS.length * rowH + 20} fill={VIZ.text} className="font-mono text-[9px]">
          {`selected ${fit.label}: ${fit.phi.map((v, i) => `phi${i + 1} = ${fmt2(v)}`).join(", ")}${fit.phi.length && fit.theta.length ? " · " : ""}${fit.theta.map((v, i) => `theta${i + 1} = ${fmt2(v)}`).join(", ")}${fit.phi.length || fit.theta.length ? " · " : "no ARMA terms · "}sigma = ${fmt2(fit.sigma)}`}
        </text>
      </svg>
    );
  };

  /** Step F2 — residual series, residual ACF and Ljung–Box. */
  const diagStage = () => {
    const [lo, hi] = extent(fit.resid);
    const box: Box = { x: 52, y: 32, w: 600, h: 82 };
    const zero = box.y + box.h - ((0 - lo) / (hi - lo)) * box.h;
    const ok = diagnostics.p >= 0.05;
    return (
      <svg viewBox="0 0 680 300" className="block w-full" role="img" aria-label="Residuals of the selected model, their autocorrelations, and the Ljung-Box test">
        <text x={box.x} y={22} fill={VIZ.textBright} className="font-mono text-[10px]">
          residuals of {fit.label}
        </text>
        <path d={seriesPath(fit.resid, box, lo, hi)} fill="none" stroke={ok ? VIZ.teal : VIZ.rose} strokeWidth={0.9} />
        <line x1={box.x} y1={zero} x2={box.x + box.w} y2={zero} stroke={VIZ.axis} strokeWidth={0.6} strokeDasharray="3 3" />

        <Correlogram values={diagnostics.r} box={{ x: 52, y: 160, w: 600, h: 90 }} title="residual ACF — every stem should sit inside the band" color={ok ? VIZ.brand : VIZ.rose} band={diagnostics.band} />

        <text x={52} y={288} fill={ok ? VIZ.teal : VIZ.rose} className="font-mono text-[10px]">
          Ljung–Box Q({LB_LAGS}) = {fmt1(diagnostics.Q)} on {diagnostics.df} df · {fmtP(diagnostics.p)} —{" "}
          {ok ? "no structure left; adequate" : "structure remains; inadequate"}
        </text>
      </svg>
    );
  };

  /** Step F3 — the forecast with its widening interval. */
  const forecastStage = () => {
    const tail = 60;
    const shown = SERIES.slice(-tail);
    const lo = Math.min(...shown, ...fc.lo);
    const hi = Math.max(...shown, ...fc.hi);
    const pad = (hi - lo) * 0.08;
    const box: Box = { x: 52, y: 30, w: 600, h: 200 };
    const total = tail + HORIZON;
    const px = (i: number) => box.x + (i / (total - 1)) * box.w;
    const py = (v: number) => box.y + box.h - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * box.h;

    const histPath = shown.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join("");
    const fcPath = [`M${px(tail - 1).toFixed(1)} ${py(shown[tail - 1]).toFixed(1)}`]
      .concat(fc.point.map((v, i) => `L${px(tail + i).toFixed(1)} ${py(v).toFixed(1)}`))
      .join("");
    const upper = fc.hi.map((v, i) => `L${px(tail + i).toFixed(1)} ${py(v).toFixed(1)}`).join("");
    const lower = [...fc.lo]
      .map((v, i) => ({ v, i }))
      .reverse()
      .map(({ v, i }) => `L${px(tail + i).toFixed(1)} ${py(v).toFixed(1)}`)
      .join("");
    const bandPath = `M${px(tail - 1).toFixed(1)} ${py(shown[tail - 1]).toFixed(1)}${upper}${lower}Z`;

    return (
      <svg viewBox="0 0 680 270" className="block w-full" role="img" aria-label="Forecast of the selected model with a 95% prediction interval that widens with the horizon">
        <path d={bandPath} fill={VIZ.orange} opacity={0.16} />
        <path d={histPath} fill="none" stroke={VIZ.teal} strokeWidth={1.2} />
        <path d={fcPath} fill="none" stroke={VIZ.orange} strokeWidth={1.5} strokeDasharray="5 3" />
        <line x1={px(tail - 1)} y1={box.y} x2={px(tail - 1)} y2={box.y + box.h} stroke={VIZ.axis} strokeWidth={0.6} strokeDasharray="2 3" />
        <text x={px(tail - 1) + 5} y={box.y + 12} fill={VIZ.text} className="font-mono text-[9px]">
          today
        </text>
        {[lo - pad, (lo + hi) / 2, hi + pad].map((v, i) => (
          <text
            key={i}
            x={box.x - 6}
            y={py(v) + 3}
            textAnchor="end"
            fill={VIZ.text}
            className="font-mono text-[9px]"
          >
            {Math.round(v)}
          </text>
        ))}
        <text x={box.x} y={20} fill={VIZ.textBright} className="font-mono text-[10px]">
          {fit.label} · {HORIZON}-day forecast with 95% interval
        </text>
        <text x={box.x + box.w} y={20} textAnchor="end" fill={VIZ.orange} className="font-mono text-[10px]">
          half-width {fmt1(fc.half[0])} at h=1 → {fmt1(fc.half[HORIZON - 1])} at h={HORIZON}
        </text>
        <text x={box.x} y={box.y + box.h + 24} fill={VIZ.text} className="font-mono text-[9px]">
          the interval grows by √(accumulated ψ-weights) — every future shock is still ahead of you
        </text>
      </svg>
    );
  };

  const stage = (i: number) => {
    if (i === S_SERIES) return seriesStage();
    if (i === S_DIFF) return diffStage();
    if (i === S_ACF) return acfStage();
    return (
      <div>
        {orderChips}
        {i === S_FIT ? fitStage() : i === S_DIAG ? diagStage() : forecastStage()}
      </div>
    );
  };

  /* --------------------------------------------------------------- panel */

  const panel = (i: number) => (
    <>
      <PanelTitle>What the procedure has established so far</PanelTitle>
      <div className="flex flex-wrap gap-2.5">
        <GuidedCard label="series" accent={VIZ.teal}>
          {T} daily observations · non-stationary in levels (ACF at lag 1 = {fmt2(ACF_LEVELS[0])}).
        </GuidedCard>

        {i >= S_DIFF && (
          <GuidedCard label="d" accent={VIZ.brandLight}>
            ADF {fmt2(ADF_LEVELS)} → {fmt2(ADF_DIFFS)} after one difference. <Num>d = 1</Num>.
          </GuidedCard>
        )}

        {i >= S_ACF && (
          <GuidedCard label="candidate orders" accent={VIZ.brand}>
            Both correlograms decay → mixed ARMA. Shortlist: {CANDIDATES.map((o) => `(${o.p},${o.d},${o.q})`).join(", ")}.
          </GuidedCard>
        )}

        {i >= S_FIT && (
          <GuidedCard label="selected" accent={VIZ.orange}>
            <Num>{fit.label}</Num>
            {fit.unstable
              ? " — non-invertible, no usable fit."
              : ` · AIC ${fmt1(fit.aic)} (best ${BEST.label} at ${fmt1(BEST.aic)}).`}
          </GuidedCard>
        )}

        {i >= S_DIAG && (
          <GuidedCard label="diagnostics" accent={diagnostics.p >= 0.05 ? VIZ.teal : VIZ.rose}>
            Ljung–Box <Num>{fmtP(diagnostics.p)}</Num> —{" "}
            {diagnostics.p >= 0.05 ? "residuals pass as white noise." : "structure left in the residuals."}
          </GuidedCard>
        )}

        {i >= S_FORECAST && (
          <GuidedCard label="forecast" accent={VIZ.yellow}>
            {HORIZON} days ahead · interval half-width {fmt1(fc.half[0])} → <Num>{fmt1(fc.half[HORIZON - 1])}</Num>.
          </GuidedCard>
        )}
      </div>

      {i === S_ACF && (
        <GuidedPayoff label="what identification bought">
          Two plots have cut an unbounded search over (p, q) down to a shortlist of{" "}
          <strong className="font-semibold text-white">{CANDIDATES.length} orders</strong> — and told
          you the answer is a <em>mixed</em> model before a single one was fitted. That is the step
          `auto_arima` does for you and the step you should still do yourself.
        </GuidedPayoff>
      )}

      {i === S_FORECAST && (
        <GuidedPayoff label="grade the procedure">
          The series was simulated from a known{" "}
          <strong className="font-semibold text-white">ARIMA(1,1,1)</strong> with φ = {PHI}, θ ={" "}
          {THETA}, σ = {SIGMA}. Box–Jenkins picked{" "}
          <strong className="font-semibold text-white">{BEST.label}</strong> by both AIC and BIC and
          estimated φ̂ = {fmt2(TRUE_FIT.phi[0])}, θ̂ = {fmt2(TRUE_FIT.theta[0])}, σ̂ ={" "}
          {fmt2(TRUE_FIT.sigma)} — the right model and the right coefficients, recovered from the data
          alone. That is the argument for running the procedure instead of reaching straight for a
          grid search.
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i === S_DIFF)
      return (
        <>
          <GuidedLegend color={VIZ.text}>levels (non-stationary)</GuidedLegend>
          <GuidedLegend color={VIZ.teal}>differences (stationary)</GuidedLegend>
        </>
      );
    if (i === S_ACF || i === S_DIAG)
      return (
        <>
          <GuidedLegend color={VIZ.brand}>significant stem</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>inside the band</GuidedLegend>
        </>
      );
    if (i === S_FORECAST)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>observed</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>forecast · 95% interval</GuidedLegend>
        </>
      );
    return <GuidedLegend color={VIZ.teal}>daily demand</GuidedLegend>;
  };

  const stageNote = (i: number) => {
    if (i === S_SERIES) return `${T} days · levels`;
    if (i === S_DIFF) return `5% critical value ${ADF_CRIT_5}`;
    if (i === S_ACF) return `${MAX_LAG} lags · band ±${fmt2(BAND)}`;
    return `selected ${fit.label}`;
  };

  return (
    <GuidedViz
      className={className}
      title="Box–Jenkins, step by step"
      caption="The Box–Jenkins procedure applied to a simulated daily-demand series: test for a unit root, difference, read the correlograms, fit a shortlist, check the residuals, then forecast. Every statistic is computed in the browser — the ADF regression, the Durbin–Levinson PACF, a Hannan–Rissanen fit per candidate, Ljung–Box with a real chi-square tail, and ψ-weight prediction intervals. The series was generated from a known ARIMA(1,1,1), so you can check whether the procedure recovers it."
      phases={PHASES}
      steps={STEPS}
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
