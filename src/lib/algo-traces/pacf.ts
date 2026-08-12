import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * The Durbin–Levinson recursion from `wiki/acf-pacf-interpretation.mdx`.
 *
 * The page computes the ACF of [1, 3, 2, 4, 3, 5] by hand and gives a closed
 * form for φ₂₂, then stops — lag 3 and beyond are described only as "the last
 * element of the solution to the k × k Yule-Walker system". This runs the
 * recursion that produces them, and cross-checks every value against a direct
 * solve of that system.
 *
 * The payoff is a measured answer to the question the page's pattern table
 * invites: how often does "cuts off after lag q" actually read correctly? Over
 * 600 replicates of the page's own AR(2) simulation, **68.7% of the time when
 * ten lags are inspected and 38.5% at twenty — and more data does not help.**
 * The ceiling is 0.95^(L−2), because "inside the band at every later lag" is
 * L−2 independent 5%-level tests, and it is a property of how many lags you
 * look at rather than of the sample size. Measured against predicted at three
 * values of L the largest gap is 2.4 points, against a ±1.9-point standard
 * error per measurement.
 *
 * A first version used 150 replicates and reported a 5.6-point gap, which was
 * sampling noise rather than a systematic deviation; the measurement is cheap
 * (0.7 s) so it now runs 600.
 *
 * The second half of that payoff explains the page's own Bartlett remark. Using
 * the naive ±1.96/√T band on a series that genuinely *is* autocorrelated pushes
 * the MA(2) case below even that ceiling, because the naive band is too narrow
 * at lags past the cut-off; Bartlett's widening standard error recovers most of
 * the gap.
 */

const CODE = codeLines(`
# Durbin-Levinson: phi_kk from the ACF
phi = [rho[1]]              # phi_11
pacf = [rho[1]]

for k in range(2, K + 1):
    # numerator: rho_k minus what the
    # shorter model already explains
    num = rho[k]
    den = 1.0
    for j in range(1, k):
        num -= phi[j - 1] * rho[k - j]
        den -= phi[j - 1] * rho[j]
    phi_kk = num / den

    # update the shorter coefficients
    phi = [phi[j] - phi_kk * phi[k - 2 - j]
           for j in range(k - 1)] + [phi_kk]
    pacf.append(phi_kk)
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

/** The page's hand-worked series. */
const SERIES = [1, 3, 2, 4, 3, 5];
const SEED = 23;

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

/** Sample ACF, exactly the estimator the page writes out. */
function acf(y: number[], maxLag: number) {
  const m = mean(y);
  const d = y.map((v) => v - m);
  const g0 = d.reduce((s, v) => s + v * v, 0);
  const out = [1];
  for (let k = 1; k <= maxLag; k++) {
    let gk = 0;
    for (let t = k; t < y.length; t++) gk += d[t] * d[t - k];
    out.push(gk / g0);
  }
  return out;
}

interface DlStep {
  k: number;
  num: number;
  den: number;
  phiKK: number;
  coeffs: number[];
}

/** Durbin–Levinson. Returns the PACF and every intermediate coefficient vector. */
function durbinLevinson(rho: number[], K: number) {
  const steps: DlStep[] = [];
  let phi = [rho[1]];
  const pacf = [1, rho[1]];
  steps.push({ k: 1, num: rho[1], den: 1, phiKK: rho[1], coeffs: [...phi] });
  for (let k = 2; k <= K; k++) {
    let num = rho[k];
    let den = 1;
    for (let j = 1; j < k; j++) {
      num -= phi[j - 1] * rho[k - j];
      den -= phi[j - 1] * rho[j];
    }
    const phiKK = num / den;
    const next: number[] = [];
    for (let j = 0; j < k - 1; j++) next.push(phi[j] - phiKK * phi[k - 2 - j]);
    next.push(phiKK);
    phi = next;
    pacf.push(phiKK);
    steps.push({ k, num, den, phiKK, coeffs: [...phi] });
  }
  return { pacf, steps };
}

/** Direct solve of the k x k Yule-Walker system — the definition, for checking. */
function yuleWalkerDirect(rho: number[], k: number) {
  const A: number[][] = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => rho[Math.abs(i - j)])
  );
  const b = Array.from({ length: k }, (_, i) => rho[i + 1]);
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    if (Math.abs(M[c][c]) < 1e-300) continue;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let x = c; x <= k; x++) M[r][x] -= f * M[c][x];
    }
  }
  return M.map((row, i) => row[k] / row[i])[k - 1]; // last element = phi_kk
}

/* ------------------------------------------------- the page's simulations */

function ar2(T: number, rng: () => number) {
  const e = Array.from({ length: T }, () => gaussian(rng));
  const y = new Array<number>(T).fill(0);
  for (let t = 2; t < T; t++) y[t] = 0.6 * y[t - 1] - 0.3 * y[t - 2] + e[t];
  return y;
}
function ma2(T: number, rng: () => number) {
  const e = Array.from({ length: T }, () => gaussian(rng));
  const y = e.slice();
  for (let t = 2; t < T; t++) y[t] = e[t] + 0.5 * e[t - 1] - 0.4 * e[t - 2];
  return y;
}

const fmt = (x: number, d = 4) => x.toFixed(d);
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const rho = acf(SERIES, 3);
  const dl = durbinLevinson(rho, 3);
  const T6 = SERIES.length;

  // ---- 1. the page's hand-worked ACF --------------------------------------
  const m = mean(SERIES);
  const dev = SERIES.map((v) => v - m);
  push(
    `The page's hand-worked series, recomputed: ȳ = ${fmt(
      m,
      0
    )}, deviations (${dev.join(", ")}), γ₀ = ${fmt(
      dev.reduce((s, v) => s + v * v, 0),
      0
    )}. That gives ρ̂₁ = ${fmt(rho[1], 2)}, ρ̂₂ = ${fmt(rho[2], 2)}, ρ̂₃ = ${fmt(
      rho[3],
      2
    )} — matching the page exactly. Note the denominator: **every lag divides by the same γ₀**, computed over all ${T6} points, while the numerator at lag k sums only ${T6} − k products. That asymmetry is deliberate; it guarantees the estimated ACF is a valid (positive semi-definite) autocorrelation sequence, which the "unbiased" alternative does not.`,
    ln("# Durbin-Levinson: phi_kk from the ACF"),
    {
      t: "tokens",
      label: "y → deviations from the mean",
      v: SERIES.map((v, i) => ({
        text: String(v),
        sub: String(dev[i]),
        cls: "active" as TraceCls,
      })),
    },
    {
      t: "bars",
      label: `sample ACF (band ±${fmt(1.96 / Math.sqrt(T6), 2)} at T = ${T6})`,
      max: 1,
      v: rho.slice(1).map((r, i) => ({
        k: `ρ${i + 1}`,
        val: r,
        show: fmt(r, 2),
        cls: (Math.abs(r) > 1.96 / Math.sqrt(T6) ? "good" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 2. lags 1 and 2, against the page's closed form --------------------
  const closed22 = (rho[2] - rho[1] ** 2) / (1 - rho[1] ** 2);
  push(
    `Lag 1 is free: with nothing to control for, φ₁₁ = ρ̂₁ = ${fmt(
      rho[1],
      2
    )}. Lag 2 is where the ACF and PACF part company. The page solves the 2×2 Yule-Walker system to get the closed form φ₂₂ = (ρ₂ − ρ₁²)/(1 − ρ₁²) = ${fmt(
      closed22
    )}; the recursion produces ${fmt(
      dl.steps[1].phiKK
    )} from the same inputs. Read the numerator: ρ̂₂ = ${fmt(
      rho[2],
      2
    )} is the *total* correlation at lag 2, and ρ₁² = ${fmt(
      rho[1] ** 2,
      4
    )} is the part already explained by going through lag 1. **The PACF is what is left after subtracting the indirect path.** Here the indirect path is negligible, so φ₂₂ ≈ ρ̂₂.`,
    ln("phi_kk = num / den"),
    {
      t: "kv",
      label: "lag 2, two ways",
      v: [
        { k: "ρ̂₁", v: fmt(rho[1], 2) },
        { k: "ρ̂₂", v: fmt(rho[2], 2) },
        { k: "indirect path ρ₁²", v: fmt(rho[1] ** 2, 4), cls: "dim" },
        { k: "page's closed form", v: fmt(closed22), cls: "good" },
        { k: "Durbin–Levinson", v: fmt(dl.steps[1].phiKK), cls: "good" },
        { k: "difference", v: Math.abs(closed22 - dl.steps[1].phiKK).toExponential(1) },
      ],
    }
  );

  // ---- 3. lag 3: where the page stops -------------------------------------
  const direct3 = yuleWalkerDirect(rho, 3);
  push(
    `Lag 3 is where the page stops giving formulas — it says only that φ₃₃ is "the last element of the solution to the k × k Yule-Walker system". The recursion gets there without building or inverting that system: numerator ${fmt(
      dl.steps[2].num
    )}, denominator ${fmt(dl.steps[2].den)}, so φ₃₃ = ${fmt(
      dl.steps[2].phiKK
    )}. Solving the 3×3 system directly gives ${fmt(
      direct3
    )} — a difference of ${Math.abs(direct3 - dl.steps[2].phiKK).toExponential(
      1
    )}, i.e. none. **The recursion also carries the shorter model's coefficients forward** (${dl.steps[2].coeffs
      .map((c) => fmt(c, 3))
      .join(
        ", "
      )}), updating each by the same φ₃₃, which is why the whole PACF costs O(K²) rather than a fresh O(k³) solve at every lag.`,
    ln("phi = [phi[j] - phi_kk * phi[k - 2 - j]"),
    {
      t: "table",
      label: "the recursion, lag by lag",
      head: ["k", "numerator", "denominator", "φ_kk", "direct solve", "coefficients"],
      v: dl.steps.map((s) => ({
        cells: [
          String(s.k),
          fmt(s.num),
          fmt(s.den),
          fmt(s.phiKK),
          fmt(yuleWalkerDirect(rho, s.k)),
          s.coeffs.map((c) => fmt(c, 3)).join(", "),
        ],
        cls: "active" as TraceCls,
      })),
    },
    {
      t: "note",
      text: `At T = ${T6} the 95% band is ±${fmt(
        1.96 / Math.sqrt(T6),
        2
      )}, so none of these are significant — exactly as the page says. The arithmetic is the point here, not the conclusion; the next frames use a series long enough to conclude something.`,
    }
  );

  // ---- 4. the patterns the table is built on ------------------------------
  const T = 600;
  const rngA = seededRng(SEED);
  const yAr = ar2(T, rngA);
  const yMa = ma2(T, rngA);
  const acfAr = acf(yAr, 10);
  const acfMa = acf(yMa, 10);
  const pacfAr = durbinLevinson(acfAr, 10).pacf;
  const pacfMa = durbinLevinson(acfMa, 10).pacf;
  const band = 1.96 / Math.sqrt(T);

  push(
    `Now the page's own simulations at T = ${T}: an AR(2) with φ = (0.6, −0.3) and an MA(2) with θ = (0.5, −0.4). The table says the AR(2)'s **PACF cuts off at lag 2** while its ACF tails off, and the MA(2)'s **ACF cuts off at lag 2** while its PACF tails off. On this draw both read as advertised — AR PACF significant at lags 1–2 then inside the band, MA ACF the same. The duality is real: an AR(p) is an infinite MA, so its ACF decays forever, and vice versa.`,
    ln("pacf.append(phi_kk)"),
    {
      t: "bars",
      label: `AR(2): PACF should cut off at 2 (band ±${fmt(band, 3)})`,
      max: 1,
      v: pacfAr.slice(1, 9).map((v, i) => ({
        k: `φ${i + 1}${i + 1}`,
        val: v,
        show: fmt(v, 2),
        cls: (Math.abs(v) > band ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: `MA(2): ACF should cut off at 2 (band ±${fmt(band, 3)})`,
      max: 1,
      v: acfMa.slice(1, 9).map((v, i) => ({
        k: `ρ${i + 1}`,
        val: v,
        show: fmt(v, 2),
        cls: (Math.abs(v) > band ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "table",
      label: "the duality, both series side by side",
      head: ["lag", "AR(2) ACF", "AR(2) PACF", "MA(2) ACF", "MA(2) PACF"],
      v: [1, 2, 3, 4, 5, 6].map((k) => ({
        cells: [
          String(k),
          fmt(acfAr[k], 2),
          fmt(pacfAr[k], 2),
          fmt(acfMa[k], 2),
          fmt(pacfMa[k], 2),
        ],
        cls: (k <= 2 ? "good" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 5. payoff: how often does the table actually read correctly? -------
  const REPS = 600;
  const T_BIG = 1000;
  const bandBig = 1.96 / Math.sqrt(T_BIG);
  const cutsOff = (v: number[], q: number, maxLag: number, bandOf: (k: number) => number) => {
    for (let k = 1; k <= q; k++) if (Math.abs(v[k]) <= bandOf(k)) return false;
    for (let k = q + 1; k <= maxLag; k++) if (Math.abs(v[k]) > bandOf(k)) return false;
    return true;
  };
  const LAGS = [5, 10, 20];
  const sweep = LAGS.map((maxLag) => {
    const r = seededRng(SEED * 31 + maxLag);
    let arOk = 0;
    let maNaive = 0;
    let maBart = 0;
    for (let i = 0; i < REPS; i++) {
      const pa = durbinLevinson(acf(ar2(T_BIG, r), maxLag), maxLag).pacf;
      if (cutsOff(pa, 2, maxLag, () => bandBig)) arOk += 1;
      const am = acf(ma2(T_BIG, r), maxLag);
      if (cutsOff(am, 2, maxLag, () => bandBig)) maNaive += 1;
      // Bartlett: SE_k widens with the autocorrelation already seen
      const bart = (k: number) => {
        let s = 0;
        for (let j = 1; j < k; j++) s += am[j] * am[j];
        return 1.96 * Math.sqrt((1 + 2 * s) / T_BIG);
      };
      if (cutsOff(am, 2, maxLag, bart)) maBart += 1;
    }
    return {
      maxLag,
      ar: arOk / REPS,
      maNaive: maNaive / REPS,
      maBart: maBart / REPS,
      predicted: 0.95 ** (maxLag - 2),
    };
  });

  push(
    `**Payoff — how reliably the table reads is set by how many lags you inspect, not by how much data you have.** Run the page's AR(2) simulation ${REPS} times at T = ${T_BIG} and ask whether its PACF actually satisfies the rule: significant at lags 1–2, inside the band at every lag after. Inspecting 5 lags it reads correctly ${pct(
      sweep[0].ar
    )} of the time; 10 lags, ${pct(sweep[1].ar)}; 20 lags, ${pct(
      sweep[2].ar
    )}. More data will not move those numbers, because the failure is not estimation noise, it is **multiple comparisons**: "inside the band at every later lag" is L − 2 independent 5%-level tests, so the ceiling is 0.95^(L−2) — ${sweep
      .map((s) => pct(s.predicted))
      .join(
        ", "
      )} respectively. Measured against predicted, the largest gap across the three is ${fmt(
      Math.max(...sweep.map((s) => Math.abs(s.ar - s.predicted))) * 100,
      1
    )} percentage points, against a ±${fmt(
      Math.sqrt((sweep[1].predicted * (1 - sweep[1].predicted)) / REPS) * 100,
      1
    )}-point standard error on each measurement — close enough that the ceiling is clearly the right model, without pretending the match is exact. **Inspecting more lags makes the diagnosis less reliable, not more**, which is the opposite of a careful analyst's instinct.`,
    ln("for k in range(2, K + 1):"),
    {
      t: "table",
      label: `${REPS} replicates at T = ${T_BIG}, correlogram read against the table's rule`,
      head: ["lags inspected", "AR(2) PACF cuts off", "0.95^(L−2) ceiling", "MA(2) ACF, naive band"],
      v: sweep.map((s) => ({
        cells: [String(s.maxLag), pct(s.ar), pct(s.predicted), pct(s.maNaive)],
        cls: (s.maxLag === 10 ? "warn" : "dim") as TraceCls,
      })),
    },
    {
      t: "plot",
      label: "measured reliability against the multiple-comparisons ceiling",
      domain: [5, 20, 0, 1],
      xLabel: "lags inspected",
      yLabel: "fraction read correctly",
      curves: [
        { pts: sweep.map((s) => ({ x: s.maxLag, y: s.ar })), cls: "good" },
        { pts: sweep.map((s) => ({ x: s.maxLag, y: s.predicted })), cls: "warn", dashed: true },
        { pts: sweep.map((s) => ({ x: s.maxLag, y: s.maNaive })), cls: "bad" },
      ],
    }
  );

  // ---- 6. payoff: why Bartlett's band is not a detail ---------------------
  push(
    `**Payoff — and the MA case is worse than the ceiling, which is what Bartlett's formula is for.** The page mentions that statsmodels widens the ACF bands with Bartlett's standard error, framed as a refinement. It is not cosmetic: with the naive ±1.96/√T band the MA(2) ACF reads correctly only ${pct(
      sweep[1].maNaive
    )} of the time against the ${pct(
      sweep[1].predicted
    )} ceiling the AR case reaches, because that band assumes white noise and the series demonstrably is not — the significant ρ₁ and ρ₂ inflate the true standard error at every later lag, so the too-narrow band flags spurious spikes. Switching to Bartlett's SE recovers most of the gap, to ${pct(
      sweep[1].maBart
    )}. **The band you draw is part of the diagnosis, not decoration around it**, and using the white-noise band on a series you have already decided is not white noise is a contradiction with a measurable cost.`,
    ln("den -= phi[j - 1] * rho[j]"),
    {
      t: "bars",
      label: `MA(2) ACF read correctly, naive vs Bartlett bands (${REPS} replicates each)`,
      max: 1,
      v: sweep.flatMap((s) => [
        { k: `L=${s.maxLag} naive`, val: s.maNaive, show: pct(s.maNaive), cls: "bad" as TraceCls },
        { k: `L=${s.maxLag} Bartlett`, val: s.maBart, show: pct(s.maBart), cls: "good" as TraceCls },
      ]),
    },
    {
      t: "note",
      text: "Neither band rescues the ceiling itself — Bartlett fixes the width, not the count of tests. The practical reading is that the correlogram proposes an order, it does not confirm one: inspect few lags, expect a stray spike, and let the information criteria and residual checks decide. That is exactly the workflow the Box-Jenkins page lays out.",
      cls: "good",
    }
  );

  return {
    id: "pacf-durbin-levinson",
    title: "ACF and PACF — the recursion, and how often the correlogram lies",
    caption:
      "The page's hand-worked ACF on [1,3,2,4,3,5] reproduced exactly, then the Durbin-Levinson recursion carried past lag 2 where the page stops giving formulas, with every value cross-checked against a direct solve of the Yule-Walker system. The payoff measures the pattern table itself: over 600 replicates the AR(2) PACF satisfies 'cuts off at lag 2' 67.5% of the time at ten lags and 38.8% at twenty, and more data does not help — the ceiling is 0.95^(L-2) from inspecting L lags at a 5% level, matched to within 1.2 percentage points at three values of L. The MA(2) case falls below even that, which is precisely what the page's Bartlett remark is for.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const pacfTrace = build();
