import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * FastICA from `wiki/independent-component-analysis.mdx`, unmixing two sources
 * from two microphones.
 *
 * The page states the central claim — mixtures are more Gaussian than sources,
 * so maximising non-Gaussianity recovers them, and **Gaussian sources cannot be
 * separated at all**. Both halves are measured here rather than asserted. On
 * Gaussian sources the identical pipeline converges confidently to a different
 * direction on every run (spread 82.7 degrees of an available 90, against 0.36
 * degrees for the non-Gaussian case), because there is no maximum to find.
 *
 * **Two metric choices in that payoff were wrong on the first attempt and both
 * failures are instructive.** Comparing raw recovered angles conflated
 * instability with the permutation indeterminacy — the two components sit 90
 * degrees apart, so returning them in either order looked like a 90-degree
 * "spread". Folding into [0, 90) isolates the thing being measured. And any
 * "how well did it match the right source" score is useless here: a recovered
 * basis is *some* rotation of the true one, so the matched correlation is
 * |cos t| and cannot fall below 0.71 however arbitrary t is — a random rotation
 * scores ~0.92 and looks like success. Cross-talk (the leakage of the *other*
 * source, |sin t|) is the metric that discriminates: 0.011 against 0.328.
 *
 * The second payoff measures the indeterminacies the page lists as limitations.
 * Across seeds the components match the true sources with |correlation| 1.000
 * every time while the sign and the order wander freely — so the limitation is
 * exactly and only bookkeeping, not a quality problem.
 */

const CODE = codeLines(`
X = X - X.mean(axis=1, keepdims=True)

# whiten: decorrelate, unit variance
E, D = eig(cov(X))
X = D**-0.5 @ E.T @ X

w = random_unit_vector()
for it in range(max_iter):
    s = w @ X

    # fixed point of the negentropy
    # approximation, G = log cosh
    g, gp = tanh(s), 1 - tanh(s)**2
    w_new = (X * g).mean(1) - gp.mean() * w

    w_new /= norm(w_new)
    if abs(abs(w_new @ w) - 1) < tol:
        break
    w = w_new
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const N = 800;
const SEED = 5;
const TOL = 1e-8;
const MAX_ITER = 60;
/** The unknown mixing matrix. */
const A: [number, number][] = [
  [0.8, 0.55],
  [0.35, 0.9],
];

type Vec2 = [number, number];

/* ------------------------------------------------------------------ sources */

/** Two independent, strongly non-Gaussian sources: a sawtooth and a sign wave. */
function sources(n: number, seedOffset = 0, gaussianSources = false, seed = SEED) {
  const rng = seededRng(seed + seedOffset);
  const s1: number[] = [];
  const s2: number[] = [];
  for (let t = 0; t < n; t++) {
    if (gaussianSources) {
      s1.push(gaussian(rng));
      s2.push(gaussian(rng));
    } else {
      s1.push(((t % 37) / 37) * 2 - 1); // sawtooth: sub-Gaussian
      s2.push(Math.sin(t * 0.31) > 0 ? 1 : -1); // square wave: sub-Gaussian
    }
  }
  return [standardise(s1), standardise(s2)];
}

function standardise(a: number[]) {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
  return a.map((x) => (x - m) / sd);
}

const mix = (S: number[][]): number[][] => [
  S[0].map((_, i) => A[0][0] * S[0][i] + A[0][1] * S[1][i]),
  S[0].map((_, i) => A[1][0] * S[0][i] + A[1][1] * S[1][i]),
];

/** Excess kurtosis — 0 for a Gaussian. */
function kurtosis(a: number[]) {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  const m2 = a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length;
  const m4 = a.reduce((s, x) => s + (x - m) ** 4, 0) / a.length;
  return m4 / (m2 * m2) - 3;
}

function correlation(a: number[], b: number[]) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

/* ----------------------------------------------------------------- whitening */

/** Centre, then decorrelate to unit covariance via the eigendecomposition. */
function whiten(X: number[][]) {
  const n = X[0].length;
  const centred = X.map((row) => {
    const m = row.reduce((s, x) => s + x, 0) / n;
    return row.map((x) => x - m);
  });
  const c00 = centred[0].reduce((s, x) => s + x * x, 0) / n;
  const c11 = centred[1].reduce((s, x) => s + x * x, 0) / n;
  const c01 = centred[0].reduce((s, x, i) => s + x * centred[1][i], 0) / n;

  // 2x2 symmetric eigendecomposition, in closed form
  const tr = c00 + c11;
  const det = c00 * c11 - c01 * c01;
  const disc = Math.sqrt(Math.max(0, (tr / 2) ** 2 - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const ev = (l: number): Vec2 => {
    const v: Vec2 = Math.abs(c01) > 1e-12 ? [l - c11, c01] : [l === c00 ? 1 : 0, l === c00 ? 0 : 1];
    const nrm = Math.hypot(v[0], v[1]);
    return [v[0] / nrm, v[1] / nrm];
  };
  const e1 = ev(l1);
  const e2 = ev(l2);
  // W = D^{-1/2} E^T
  const W: [number, number][] = [
    [e1[0] / Math.sqrt(l1), e1[1] / Math.sqrt(l1)],
    [e2[0] / Math.sqrt(l2), e2[1] / Math.sqrt(l2)],
  ];
  const Z = [
    centred[0].map((_, i) => W[0][0] * centred[0][i] + W[0][1] * centred[1][i]),
    centred[0].map((_, i) => W[1][0] * centred[0][i] + W[1][1] * centred[1][i]),
  ];
  return { Z, eigen: [l1, l2], cov: [c00, c01, c11] };
}

/* ------------------------------------------------------------------ FastICA */

interface IcaStep {
  it: number;
  w: Vec2;
  angle: number;
  change: number;
  kurt: number;
}

/** One component by the fixed-point iteration, optionally deflated against `prev`. */
function fastIcaComponent(Z: number[][], w0: Vec2, prev?: Vec2) {
  const n = Z[0].length;
  let w: Vec2 = [...w0];
  const proj0 = Z[0].map((_, i) => w[0] * Z[0][i] + w[1] * Z[1][i]);
  const steps: IcaStep[] = [
    {
      it: 0,
      w: [...w],
      angle: (Math.atan2(w[1], w[0]) * 180) / Math.PI,
      change: NaN,
      kurt: kurtosis(proj0),
    },
  ];
  for (let it = 0; it < MAX_ITER; it++) {
    const s = Z[0].map((_, i) => w[0] * Z[0][i] + w[1] * Z[1][i]);
    const g = s.map(Math.tanh);
    const gp = g.reduce((acc, t) => acc + (1 - t * t), 0) / n;
    let wn: Vec2 = [
      Z[0].reduce((acc, x, i) => acc + x * g[i], 0) / n - gp * w[0],
      Z[1].reduce((acc, x, i) => acc + x * g[i], 0) / n - gp * w[1],
    ];
    // Gram-Schmidt deflation: the second component must be orthogonal
    if (prev) {
      const d = wn[0] * prev[0] + wn[1] * prev[1];
      wn = [wn[0] - d * prev[0], wn[1] - d * prev[1]];
    }
    const nrm = Math.hypot(wn[0], wn[1]);
    wn = [wn[0] / nrm, wn[1] / nrm];
    const change = Math.abs(Math.abs(wn[0] * w[0] + wn[1] * w[1]) - 1);
    w = wn;
    steps.push({
      it: it + 1,
      w: [...w],
      angle: (Math.atan2(w[1], w[0]) * 180) / Math.PI,
      change,
      kurt: kurtosis(Z[0].map((_, i) => w[0] * Z[0][i] + w[1] * Z[1][i])),
    });
    if (change < TOL) break;
  }
  return { w, steps };
}

function runIca(S: number[][], w0: Vec2) {
  const X = mix(S);
  const { Z, cov } = whiten(X);
  const c1 = fastIcaComponent(Z, w0);
  const c2 = fastIcaComponent(Z, [-w0[1], w0[0]], c1.w);
  const proj = (w: Vec2) => Z[0].map((_, i) => w[0] * Z[0][i] + w[1] * Z[1][i]);
  return { X, Z, cov, c1, c2, rec: [proj(c1.w), proj(c2.w)] };
}

const fmt = (x: number, d = 3) => x.toFixed(d);

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const S = sources(N);
  // 85 degrees: far from the 38.1 deg solution, so the swing is visible.
  const W0: Vec2 = [Math.cos((85 * Math.PI) / 180), Math.sin((85 * Math.PI) / 180)];
  const r = runIca(S, W0);

  const scatter = (
    label: string,
    a: number[],
    b: number[],
    dom: [number, number, number, number],
    dirs: { w: Vec2; cls: TraceCls }[] = []
  ) => ({
    t: "plot" as const,
    label,
    domain: dom,
    xLabel: "channel 1",
    yLabel: "channel 2",
    points: a
      .filter((_, i) => i % 4 === 0)
      .map((x, i) => ({ x, y: b[i * 4], cls: "dim" as TraceCls })),
    segments: dirs.map((d) => ({
      x1: -d.w[0] * dom[1],
      y1: -d.w[1] * dom[1],
      x2: d.w[0] * dom[1],
      y2: d.w[1] * dom[1],
      cls: d.cls,
    })),
  });

  // ---- 1. the problem ------------------------------------------------------
  push(
    `Two independent sources — a sawtooth and a square wave — reach two microphones through an unknown mixing matrix. The mixtures are what you get; the sources are what you want. The kurtosis column is the whole strategy in one number: each **source** has excess kurtosis ${fmt(
      kurtosis(S[0]),
      2
    )} and ${fmt(kurtosis(S[1]), 2)}, far from Gaussian, while the **mixtures** sit at ${fmt(
      kurtosis(r.X[0]),
      2
    )} and ${fmt(
      kurtosis(r.X[1]),
      2
    )} — measurably closer to zero. Adding independent things Gaussianises them, exactly as the central limit theorem promises, so *un*mixing means searching for the most non-Gaussian direction.`,
    ln("X = X - X.mean(axis=1, keepdims=True)"),
    scatter("the two mixtures — a sheared, correlated cloud", r.X[0], r.X[1], [-3, 3, -3, 3]),
    {
      t: "table",
      label: "excess kurtosis (0 = Gaussian)",
      head: ["signal", "kurtosis"],
      v: [
        { cells: ["source 1 (sawtooth)", fmt(kurtosis(S[0]), 3)], cls: "good" as TraceCls },
        { cells: ["source 2 (square)", fmt(kurtosis(S[1]), 3)], cls: "good" as TraceCls },
        { cells: ["mixture 1", fmt(kurtosis(r.X[0]), 3)], cls: "bad" as TraceCls },
        { cells: ["mixture 2", fmt(kurtosis(r.X[1]), 3)], cls: "bad" as TraceCls },
      ],
    }
  );

  // ---- 2. whitening --------------------------------------------------------
  const zc = whiten(r.X);
  const zcov = [
    zc.Z[0].reduce((s, x) => s + x * x, 0) / N,
    zc.Z[0].reduce((s, x, i) => s + x * zc.Z[1][i], 0) / N,
    zc.Z[1].reduce((s, x) => s + x * x, 0) / N,
  ];
  push(
    `Whitening first: centre, then apply D^(−1/2)Eᵀ so the data has identity covariance. The mixture's covariance was [${fmt(
      r.cov[0],
      2
    )}, ${fmt(r.cov[1], 2)}; ${fmt(r.cov[1], 2)}, ${fmt(
      r.cov[2],
      2
    )}] — visibly correlated — and afterwards it is [${fmt(zcov[0], 2)}, ${fmt(
      zcov[1],
      2
    )}; ${fmt(zcov[1], 2)}, ${fmt(
      zcov[2],
      2
    )}]. This is PCA's step, and it does **not** solve the problem: whitening removes second-order dependence only, and independence is a statement about *all* orders. What it buys is that the remaining unmixing is a pure rotation, so the search is over one angle instead of four matrix entries.`,
    ln("X = D**-0.5 @ E.T @ X"),
    scatter("after whitening — round, but still mixed", zc.Z[0], zc.Z[1], [-3, 3, -3, 3]),
    {
      t: "kv",
      label: "covariance",
      v: [
        { k: "before (off-diag)", v: fmt(r.cov[1], 3), cls: "bad" },
        { k: "after (off-diag)", v: fmt(zcov[1], 4), cls: "good" },
        { k: "after (var 1, var 2)", v: `${fmt(zcov[0], 3)}, ${fmt(zcov[2], 3)}` },
        { k: "search space now", v: "1 rotation angle", cls: "good" },
      ],
    }
  );

  // ---- 3. the fixed point iterating ---------------------------------------
  const st = r.c1.steps;
  push(
    `The fixed-point iteration, from a starting direction of ${fmt(
      st[0].angle,
      1
    )}°. Each step replaces w by E[x·g(wᵀx)] − E[g′(wᵀx)]·w and renormalises, where g = tanh is the derivative of the log-cosh contrast — a robust stand-in for kurtosis. Watch the two columns move together: the direction swings to ${fmt(
      st[st.length - 1].angle,
      1
    )}° while |kurtosis| of the projection climbs from ${fmt(
      Math.abs(st[0].kurt),
      3
    )} to ${fmt(
      Math.abs(st[st.length - 1].kurt),
      3
    )}. It converges in ${st.length - 1} iterations, and the convergence is **cubic** — that is what puts the "Fast" in FastICA, against gradient ascent's linear rate.`,
    ln("w_new = (X * g).mean(1) - gp.mean() * w"),
    {
      t: "table",
      label: "fixed-point iterations for component 1",
      head: ["it", "angle°", "|kurtosis|", "1 − |wᵀw_prev|"],
      v: st.map((s) => ({
        cells: [
          s.it === 0 ? "start" : String(s.it),
          fmt(s.angle, 1),
          fmt(Math.abs(s.kurt), 4),
          Number.isNaN(s.change) ? "—" : s.change.toExponential(1),
        ],
        cls: (s.it === st.length - 1 ? "good" : s.it === 0 ? "warn" : "dim") as TraceCls,
      })),
    },
    scatter(
      "whitened data with the direction found",
      zc.Z[0],
      zc.Z[1],
      [-3, 3, -3, 3],
      [{ w: r.c1.w, cls: "good" }]
    )
  );

  // ---- 4. deflation --------------------------------------------------------
  push(
    `The second component runs the same loop with one addition: after each update, subtract off the projection onto w₁ (Gram–Schmidt) so the search cannot rediscover the direction it already has. It converges in ${
      r.c2.steps.length - 1
    } iterations to ${fmt(
      r.c2.steps[r.c2.steps.length - 1].angle,
      1
    )}°, exactly ${fmt(
      Math.abs(
        Math.abs(r.c1.steps[r.c1.steps.length - 1].angle - r.c2.steps[r.c2.steps.length - 1].angle)
      ),
      1
    )}° from the first. In two dimensions the deflation step fully determines it — which is worth noticing, because it means the second component is not independently *found* here, it is forced by orthogonality in the whitened space.`,
    ln("w_new /= norm(w_new)"),
    scatter(
      "both recovered directions",
      zc.Z[0],
      zc.Z[1],
      [-3, 3, -3, 3],
      [
        { w: r.c1.w, cls: "good" },
        { w: r.c2.w, cls: "warn" },
      ]
    ),
    {
      t: "bars",
      label: "|correlation| of each recovered signal with each true source",
      max: 1,
      v: [
        { k: "rec 1 ↔ src 1", val: Math.abs(correlation(r.rec[0], S[0])), show: fmt(Math.abs(correlation(r.rec[0], S[0]))), cls: "good" },
        { k: "rec 1 ↔ src 2", val: Math.abs(correlation(r.rec[0], S[1])), show: fmt(Math.abs(correlation(r.rec[0], S[1]))), cls: "dim" },
        { k: "rec 2 ↔ src 1", val: Math.abs(correlation(r.rec[1], S[0])), show: fmt(Math.abs(correlation(r.rec[1], S[0]))), cls: "dim" },
        { k: "rec 2 ↔ src 2", val: Math.abs(correlation(r.rec[1], S[1])), show: fmt(Math.abs(correlation(r.rec[1], S[1]))), cls: "good" },
      ],
    }
  );

  // ---- 5. payoff A: Gaussian sources cannot be separated ------------------
  const REPS = 12;
  const angles = { nong: [] as number[], gauss: [] as number[] };
  const quality = { nong: [] as number[], gauss: [] as number[] };
  for (let s = 0; s < REPS; s++) {
    for (const isGauss of [false, true]) {
      const Ss = sources(N, s * 17, isGauss);
      const start = (s / REPS) * Math.PI;
      const rr = runIca(Ss, [Math.cos(start), Math.sin(start)]);
      // Fold to [0, 90). A recovered basis is the same answer whether the
      // algorithm returns component 1 or component 2 first, and those are 90
      // degrees apart in the whitened plane — so folding isolates *instability*
      // from the permutation indeterminacy, which frame 6 measures separately.
      let a = (Math.atan2(rr.c1.w[1], rr.c1.w[0]) * 180) / Math.PI;
      a = ((a % 90) + 90) % 90;
      // Measure CROSS-TALK: how much of the other source leaks into the
      // recovered component. Any "how well did it match" score is useless here
      // — a recovered basis is some rotation of the true one, so the matched
      // correlation is |cos t| and can never fall below 0.71 however arbitrary
      // t is. The leaked correlation is |sin t|, which is 0 for a clean
      // separation and large for an arbitrary direction.
      const m11 = Math.abs(correlation(rr.rec[0], Ss[0]));
      const m12 = Math.abs(correlation(rr.rec[0], Ss[1]));
      const best = Math.min(m11, m12);
      (isGauss ? angles.gauss : angles.nong).push(a);
      (isGauss ? quality.gauss : quality.nong).push(best);
    }
  }
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a);

  push(
    `**Payoff — Gaussian sources cannot be separated, and here is what that failure looks like.** Run the identical pipeline ${REPS} times, varying the sources and the starting direction, once with the non-Gaussian sources and once with Gaussian ones. Comparing recovered directions folded into [0°, 90°) — so that returning the two components in either order counts as the same answer — the non-Gaussian runs land in a band ${fmt(
      spread(angles.nong),
      1
    )}° wide, the same answer regardless of where the search started. The Gaussian runs scatter across ${fmt(
      spread(angles.gauss),
      1
    )}° of the available 90°, essentially wherever they were pushed. The algorithm does not error or fail to converge; it converges confidently to a **different arbitrary answer every time**, because for Gaussian data every direction is equally non-Gaussian and there is no maximum to find. Separation quality follows, measured as **cross-talk** — how much of the *other* source leaks into a recovered component: ${fmt(
      quality.nong.reduce((s, x) => s + x, 0) / REPS,
      3
    )} for non-Gaussian sources against ${fmt(
      quality.gauss.reduce((s, x) => s + x, 0) / REPS,
      3
    )} for Gaussian ones, the latter ranging ${fmt(
      Math.min(...quality.gauss),
      3
    )}–${fmt(
      Math.max(...quality.gauss),
      3
    )}. Cross-talk is the only honest score here: any "how well did it match the right source" metric reports at least 0.71 even for a completely arbitrary direction, because a recovered basis is *some* rotation of the true one and max(|cos θ|, |sin θ|) has that floor.`,
    ln("g, gp = tanh(s), 1 - tanh(s)**2"),
    {
      t: "plot",
      label: `recovered direction across ${REPS} runs, folded into [0°, 90°)`,
      domain: [0, REPS - 1, 0, 90],
      xLabel: "run",
      yLabel: "recovered angle°",
      points: [
        ...angles.nong.map((a, i) => ({ x: i, y: a, cls: "good" as TraceCls })),
        ...angles.gauss.map((a, i) => ({ x: i, y: a, cls: "bad" as TraceCls, shape: "cross" as const })),
      ],
    },
    {
      t: "kv",
      label: "stability of the answer",
      v: [
        { k: "non-Gaussian spread", v: `${fmt(spread(angles.nong), 2)}°`, cls: "good" },
        { k: "Gaussian spread", v: `${fmt(spread(angles.gauss), 1)}°`, cls: "bad" },
        {
          k: "cross-talk, non-Gaussian",
          v: fmt(quality.nong.reduce((s, x) => s + x, 0) / REPS, 3),
          cls: "good",
        },
        {
          k: "cross-talk, Gaussian",
          v: fmt(quality.gauss.reduce((s, x) => s + x, 0) / REPS, 3),
          cls: "bad",
        },
      ],
    }
  );

  // ---- 6. payoff B: what the indeterminacies actually cost ----------------
  const perms: { signs: string; order: string; q1: number; q2: number }[] = [];
  for (let s = 0; s < REPS; s++) {
    const Ss = sources(N, s * 17);
    const start = (s / REPS) * Math.PI;
    const rr = runIca(Ss, [Math.cos(start), Math.sin(start)]);
    const c11 = correlation(rr.rec[0], Ss[0]);
    const c12 = correlation(rr.rec[0], Ss[1]);
    const matchesFirst = Math.abs(c11) > Math.abs(c12);
    const primary = matchesFirst ? c11 : c12;
    const secondary = matchesFirst
      ? correlation(rr.rec[1], Ss[1])
      : correlation(rr.rec[1], Ss[0]);
    perms.push({
      signs: `${primary > 0 ? "+" : "−"}${secondary > 0 ? "+" : "−"}`,
      order: matchesFirst ? "1,2" : "2,1",
      q1: Math.abs(primary),
      q2: Math.abs(secondary),
    });
  }
  const orders = new Set(perms.map((p) => p.order));
  const signs = new Set(perms.map((p) => p.signs));
  const worst = Math.min(...perms.flatMap((p) => [p.q1, p.q2]));

  push(
    `**Payoff — the two indeterminacies, and how much they actually cost.** The page lists sign and permutation ambiguity as limitations. Measured across the same ${REPS} runs: the recovered components match the true sources with |correlation| of at least ${fmt(
      worst,
      3
    )} **every time**, so nothing about the *signals* is uncertain. What varies is bookkeeping — ${
      orders.size
    } different output orderings appeared (${[...orders].join(
      ", "
    )}) and ${signs.size} different sign patterns (${[...signs].join(
      ", "
    )}). This is why it is a limitation and not a defect: the mixing model x = As is unchanged if you scale a column of A by −1 and the matching source by −1, or permute both, so those degrees of freedom are **not in the data at all**. No algorithm can resolve them, and any downstream code must match components by correlation rather than by index.`,
    ln("if abs(abs(w_new @ w) - 1) < tol:"),
    {
      t: "table",
      label: `${REPS} runs, non-Gaussian sources`,
      head: ["run", "output order", "signs", "|corr| 1", "|corr| 2"],
      v: perms.map((p, i) => ({
        cells: [String(i + 1), p.order, p.signs, fmt(p.q1), fmt(p.q2)],
        cls: "dim" as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The same argument explains why the source *variances* are unrecoverable too: scaling a column of A by c and its source by 1/c leaves every observation identical. That is why implementations return unit-variance components — not a normalisation convenience, but the only scale the data determines.",
      cls: "good",
    }
  );

  return {
    id: "fastica",
    title: "FastICA — and what happens when the sources are Gaussian",
    caption:
      "Two sources through an unknown 2x2 mixer. The kurtosis table shows the mixtures measurably closer to Gaussian than the sources, which is the whole strategy; whitening then reduces unmixing to a search over one rotation angle. Watch the fixed-point iteration swing the direction while the projection's kurtosis climbs. Then two measured payoffs: with Gaussian sources the identical pipeline converges confidently to a different arbitrary direction on every run, because there is no maximum to find; and across 12 runs the recovered signals match the true sources every time while their sign and order wander freely, which is exactly what the mixing model leaves undetermined.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const fastIcaTrace = build();
