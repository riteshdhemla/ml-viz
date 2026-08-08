import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * DDIM sampling from `wiki/ddim-sampling.mdx`.
 *
 * A trace of a sampler needs a noise predictor, and training one is out of
 * scope — so the data distribution is chosen to be one whose **optimal**
 * predictor is available in closed form. For a Gaussian mixture, the marginal
 * at noise level ᾱ is itself a Gaussian mixture:
 *
 *     p_t = Σ_k w_k · N(√ᾱ·μ_k, (ᾱσ² + 1 − ᾱ)·I)
 *
 * so ε*(x, t) = −√(1−ᾱ)·∇ log p_t(x) is exact. Every number below therefore
 * comes from the real update rule driven by the *ideal* network, which isolates
 * the sampler's own discretisation error from any model error — the thing the
 * page's "~20× speedup, loses little quality" claim is actually about.
 *
 * Measured: DDIM's endpoint error against a 1000-step reference falls to 0.027
 * at 50 steps, monotonically — the ODE argument working. The determinism claim
 * is checked directly (bit-identical endpoints from the same seed) and the
 * interpolation claim as a path-length ratio.
 *
 * **The η payoff was rewritten after its first version measured something
 * meaningless.** It originally scored samples by distance to the nearest
 * mixture mode and concluded that η = 1 beat DDIM (0.166 against 0.228). That
 * is not a quality ranking at all: a correct draw from this mixture sits about
 * σ = 0.18 from a mode centre, so "closer" is simply "under-dispersed". With a
 * perfect ε both samplers target the right distribution, and the real cost of
 * η > 0 is elsewhere — two runs from the same start diverge (2.14 apart at 50
 * steps) instead of converging, so the endpoint is a draw rather than a
 * function of the input. That is what breaks interpolation and reproducible
 * seeds, and it is what the frame now measures.
 */

const CODE = codeLines(`
x = randn_like(x0)            # x_{tau_1}

for s in range(S - 1):
    t, t_next = tau[s], tau[s+1]

    # the only network call
    eps = model(x, t)

    # 1. guess the clean image
    x0 = (x - sqrt(1 - ab[t]) * eps)
    x0 = x0 / sqrt(ab[t])

    # 2. re-noise that guess to the
    #    next level, same direction
    x = (sqrt(ab[t_next]) * x0
         + sqrt(1 - ab[t_next]) * eps)

return x0
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const T = 1000;
const SEED = 3;
/** The data distribution: three tight, unequally weighted modes. */
const MODES: { w: number; m: [number, number] }[] = [
  { w: 0.5, m: [-1.6, -0.9] },
  { w: 0.3, m: [1.5, 1.1] },
  { w: 0.2, m: [0.2, -1.7] },
];
const SIGMA = 0.18;

/** Linear β schedule, the DDPM default. */
const ALPHA_BAR = (() => {
  const ab: number[] = [];
  let acc = 1;
  for (let t = 0; t < T; t++) {
    const beta = 1e-4 + (0.02 - 1e-4) * (t / (T - 1));
    acc *= 1 - beta;
    ab.push(acc);
  }
  return ab;
})();

type V2 = [number, number];

/**
 * The exact optimal noise prediction for a Gaussian-mixture data distribution.
 * This is what a perfectly trained network would output.
 */
function epsStar(x: V2, t: number): { eps: V2; resp: number[] } {
  const a = ALPHA_BAR[t];
  const v = a * SIGMA * SIGMA + (1 - a);
  const logs = MODES.map((k) => {
    const dx = x[0] - Math.sqrt(a) * k.m[0];
    const dy = x[1] - Math.sqrt(a) * k.m[1];
    return Math.log(k.w) - (dx * dx + dy * dy) / (2 * v);
  });
  const mx = Math.max(...logs);
  const ex = logs.map((l) => Math.exp(l - mx));
  const z = ex.reduce((s, e) => s + e, 0);
  const resp = ex.map((e) => e / z);

  let gx = 0;
  let gy = 0;
  MODES.forEach((k, i) => {
    gx += resp[i] * ((x[0] - Math.sqrt(a) * k.m[0]) / v);
    gy += resp[i] * ((x[1] - Math.sqrt(a) * k.m[1]) / v);
  });
  const c = Math.sqrt(1 - a);
  return { eps: [c * gx, c * gy], resp };
}

const x0Hat = (x: V2, eps: V2, t: number): V2 => {
  const a = ALPHA_BAR[t];
  return [
    (x[0] - Math.sqrt(1 - a) * eps[0]) / Math.sqrt(a),
    (x[1] - Math.sqrt(1 - a) * eps[1]) / Math.sqrt(a),
  ];
};

/** Evenly spaced subsequence of timesteps, descending. */
const schedule = (S: number) => {
  const tau: number[] = [];
  for (let i = 0; i < S; i++) tau.push(Math.round((T - 1) * (1 - i / (S - 1))));
  return tau;
};

interface DdimStep {
  t: number;
  tNext: number;
  x: V2;
  eps: V2;
  xhat: V2;
  resp: number[];
}

function sample(start: V2, S: number, eta = 0, rng?: () => number) {
  const tau = schedule(S);
  let x: V2 = [...start];
  const steps: DdimStep[] = [];
  for (let s = 0; s < tau.length - 1; s++) {
    const t = tau[s];
    const tNext = tau[s + 1];
    const { eps, resp } = epsStar(x, t);
    const xh = x0Hat(x, eps, t);
    steps.push({ t, tNext, x: [...x], eps, xhat: xh, resp });

    const aPrev = ALPHA_BAR[tNext];
    const a = ALPHA_BAR[t];
    // eta = 0 is the page's deterministic rule; eta = 1 recovers DDPM.
    const sigma =
      eta * Math.sqrt(((1 - aPrev) / (1 - a)) * Math.max(0, 1 - a / aPrev));
    const dirCoef = Math.sqrt(Math.max(0, 1 - aPrev - sigma * sigma));
    x = [
      Math.sqrt(aPrev) * xh[0] + dirCoef * eps[0] + (sigma && rng ? sigma * gaussian(rng) : 0),
      Math.sqrt(aPrev) * xh[1] + dirCoef * eps[1] + (sigma && rng ? sigma * gaussian(rng) : 0),
    ];
  }
  const last = tau[tau.length - 1];
  const { eps } = epsStar(x, last);
  const out = x0Hat(x, eps, last);
  return { steps, out };
}

const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nearestMode = (p: V2) => Math.min(...MODES.map((k) => dist(p, k.m)));
const fmt = (x: number, d = 3) => x.toFixed(d);

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const rng = seededRng(SEED);
  const start: V2 = [gaussian(rng), gaussian(rng)];
  const S_DEMO = 10;
  const demo = sample(start, S_DEMO);

  const DOM: [number, number, number, number] = [-3.2, 3.2, -3.2, 3.2];
  const modePts = MODES.map((k, i) => ({
    x: k.m[0],
    y: k.m[1],
    id: `μ${i + 1}`,
    cls: "good" as TraceCls,
    shape: "ring" as const,
  }));

  // ---- 1. setup -----------------------------------------------------------
  push(
    `The data is a three-mode Gaussian mixture, chosen because its **optimal noise predictor is available in closed form** — no network needs training, and the marginal at every noise level is itself a mixture. That matters for what follows: with the ideal ε in hand, everything measured below is the *sampler's* discretisation error, with no model error mixed in. Sampling starts from pure noise at t = ${
      T - 1
    }, where ᾱ = ${ALPHA_BAR[T - 1].toExponential(2)} — the signal is gone.`,
    ln("x = randn_like(x0)            # x_{tau_1}"),
    {
      t: "plot",
      label: "the data distribution, and the starting noise",
      domain: DOM,
      xLabel: "dim 0",
      yLabel: "dim 1",
      points: [...modePts, { x: start[0], y: start[1], id: "x_T", cls: "bad", shape: "cross" }],
    },
    {
      t: "kv",
      label: "schedule",
      v: [
        { k: "T", v: String(T) },
        { k: "ᾱ at t=0", v: fmt(ALPHA_BAR[0], 4) },
        { k: `ᾱ at t=${T - 1}`, v: ALPHA_BAR[T - 1].toExponential(2), cls: "bad" },
        { k: "steps this run", v: String(S_DEMO) },
      ],
    }
  );

  // ---- 2. where the visited steps actually land --------------------------
  const tau = schedule(S_DEMO);
  const sigDrop = tau.slice(0, -1).map((t, i) => ({
    t,
    from: Math.sqrt(ALPHA_BAR[t]),
    to: Math.sqrt(ALPHA_BAR[tau[i + 1]]),
  }));
  const biggest = sigDrop.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
  const firstHalf = sigDrop
    .slice(0, Math.floor(sigDrop.length / 2))
    .reduce((s2, d) => s2 + (d.to - d.from), 0);
  const total = sigDrop.reduce((s2, d) => s2 + (d.to - d.from), 0);

  push(
    `Before stepping, look at *where* the ${S_DEMO} visited timesteps land. τ is evenly spaced in t, but the quantity that matters is √ᾱ — the surviving signal — and that is emphatically **not** evenly spaced. The first half of the schedule moves √ᾱ by only ${fmt(
      (firstHalf / total) * 100,
      0
    )}% of the total, while the single step from t = ${biggest.t} to ${
      tau[sigDrop.indexOf(biggest) + 1]
    } moves it ${fmt(
      biggest.to - biggest.from,
      3
    )} on its own. Most of the image appears in a narrow band of t near the end. This is why production samplers use non-uniform τ, spending their budget where √ᾱ is actually changing rather than spreading it evenly over an index.`,
    ln("t, t_next = tau[s], tau[s+1]"),
    {
      t: "plot",
      label: "√ᾱ across the schedule — the surviving signal (dots = visited steps)",
      domain: [0, T, 0, 1],
      xLabel: "t",
      yLabel: "√ᾱ",
      curves: [
        {
          pts: Array.from({ length: 100 }, (_, i) => {
            const t = Math.round((i / 99) * (T - 1));
            return { x: t, y: Math.sqrt(ALPHA_BAR[t]) };
          }),
          cls: "dim",
        },
      ],
      points: tau.map((t) => ({ x: t, y: Math.sqrt(ALPHA_BAR[t]), cls: "active" as TraceCls })),
    },
    {
      t: "bars",
      label: "signal gained per visited step (Δ√ᾱ)",
      v: sigDrop.map((d) => ({
        k: `t=${d.t}`,
        val: d.to - d.from,
        show: fmt(d.to - d.from, 3),
        cls: (d === biggest ? "good" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 3. one step, in full ----------------------------------------------
  const s0 = demo.steps[0];
  push(
    `One step, in full. At t = ${s0.t} the network returns ε̂ = (${fmt(
      s0.eps[0],
      2
    )}, ${fmt(s0.eps[1], 2)}). Dividing it out of x gives the **clean-image guess** x̂₀ = (${fmt(
      s0.xhat[0],
      2
    )}, ${fmt(
      s0.xhat[1],
      2
    )}) — and at this noise level that guess is nearly worthless, sitting ${fmt(
      nearestMode(s0.xhat)
    )} from the nearest mode with responsibilities ${s0.resp
      .map((r) => fmt(r, 2))
      .join(" / ")} spread across all three. That is expected: from pure noise the best possible estimate of the clean image is close to the distribution's mean. The step then **re-noises that guess** to level ${
      s0.tNext
    } using the same ε̂ rather than a fresh draw, and it is that reuse — not the guess's quality — that makes the trajectory deterministic.`,
    ln("eps = model(x, t)"),
    {
      t: "kv",
      label: `step 1: t = ${s0.t} → ${s0.tNext}`,
      v: [
        { k: "x", v: `(${fmt(s0.x[0], 2)}, ${fmt(s0.x[1], 2)})` },
        { k: "ε̂", v: `(${fmt(s0.eps[0], 2)}, ${fmt(s0.eps[1], 2)})`, cls: "warn" },
        { k: "x̂₀", v: `(${fmt(s0.xhat[0], 2)}, ${fmt(s0.xhat[1], 2)})`, cls: "bad" },
        { k: "√ᾱ(t)", v: fmt(Math.sqrt(ALPHA_BAR[s0.t]), 4) },
        { k: "√ᾱ(t_next)", v: fmt(Math.sqrt(ALPHA_BAR[s0.tNext]), 4) },
      ],
    },
    {
      t: "bars",
      label: "responsibilities — which mode does the model think this is?",
      max: 1,
      v: s0.resp.map((r, i) => ({ k: `μ${i + 1}`, val: r, show: fmt(r, 3), cls: "dim" as TraceCls })),
    }
  );

  // ---- 3. the x̂₀ trajectory sharpening -----------------------------------
  push(
    `Now watch x̂₀ across all ${S_DEMO - 1} steps. This is the quantity worth following, and it is not the same as x: **x̂₀ is the model's running guess at the answer**, and it starts near the distribution mean and migrates onto one mode as the responsibilities collapse. Distance to the nearest mode falls ${fmt(
      nearestMode(demo.steps[0].xhat)
    )} → ${fmt(
      nearestMode(demo.steps[demo.steps.length - 1].xhat)
    )}, and the winning responsibility rises ${fmt(
      Math.max(...demo.steps[0].resp),
      3
    )} → ${fmt(
      Math.max(...demo.steps[demo.steps.length - 1].resp),
      3
    )}. The commitment to a mode is gradual, and it is made early — by the halfway point the outcome is effectively settled.`,
    ln("x0 = x0 / sqrt(ab[t])"),
    {
      t: "plot",
      label: "the x̂₀ trajectory (cross = start, ring = modes)",
      domain: DOM,
      xLabel: "dim 0",
      yLabel: "dim 1",
      points: modePts,
      curves: [{ pts: demo.steps.map((s) => ({ x: s.xhat[0], y: s.xhat[1] })), cls: "active" }],
    },
    {
      t: "table",
      label: "the guess sharpening",
      head: ["t", "x̂₀", "dist to mode", "max responsibility"],
      v: demo.steps.map((s) => ({
        cells: [
          String(s.t),
          `(${fmt(s.xhat[0], 2)}, ${fmt(s.xhat[1], 2)})`,
          fmt(nearestMode(s.xhat)),
          fmt(Math.max(...s.resp), 3),
        ],
        cls: "dim" as TraceCls,
      })),
    }
  );

  // ---- 4. determinism -----------------------------------------------------
  const again = sample(start, S_DEMO);
  const identical = dist(again.out, demo.out) === 0;
  // interpolation: does a straight line in noise space stay a line in output space?
  const rngB = seededRng(SEED + 11);
  const startB: V2 = [gaussian(rngB), gaussian(rngB)];
  const LERP = 9;
  const interp = Array.from({ length: LERP }, (_, i) => {
    const u = i / (LERP - 1);
    const s: V2 = [start[0] * (1 - u) + startB[0] * u, start[1] * (1 - u) + startB[1] * u];
    return sample(s, 50).out;
  });
  let outPath = 0;
  for (let i = 1; i < interp.length; i++) outPath += dist(interp[i], interp[i - 1]);
  const outDirect = dist(interp[0], interp[interp.length - 1]);

  push(
    `Determinism, checked rather than asserted: re-running the same start gives an endpoint ${
      identical ? "**bit-identical**" : `different by ${dist(again.out, demo.out).toExponential(1)}`
    } to the first. Nothing is drawn after x_T. That is what licenses semantic interpolation, so here is that measured too — walk a straight line between two starting noises in ${LERP} stages and the outputs trace a path of total length ${fmt(
      outPath
    )} against a direct distance of ${fmt(
      outDirect
    )}, a ratio of ${fmt(
      outPath / outDirect,
      2
    )}. A ratio near 1 means the output path is close to straight; the excess is the trajectory bending as it hands off between modes, which is exactly where interpolation looks most interesting.`,
    ln("return x0"),
    {
      t: "plot",
      label: "interpolating between two starting noises",
      domain: DOM,
      xLabel: "dim 0",
      yLabel: "dim 1",
      points: [
        ...modePts,
        ...interp.map((p, i) => ({
          x: p[0],
          y: p[1],
          cls: (i === 0 || i === interp.length - 1 ? "active" : "warn") as TraceCls,
        })),
      ],
      curves: [{ pts: interp.map((p) => ({ x: p[0], y: p[1] })), cls: "warn", dashed: true }],
    },
    {
      t: "kv",
      label: "determinism",
      v: [
        { k: "same start, twice", v: identical ? "identical" : "differs", cls: identical ? "good" : "bad" },
        { k: "output path length", v: fmt(outPath) },
        { k: "direct distance", v: fmt(outDirect) },
        { k: "ratio", v: fmt(outPath / outDirect, 2), cls: "good" },
      ],
    }
  );

  // ---- 5. payoff: step count, deterministic vs stochastic -----------------
  const BUDGETS = [2, 5, 10, 20, 50, 100, 250];
  const N_START = 40;
  const starts: V2[] = (() => {
    const r = seededRng(99);
    return Array.from({ length: N_START }, () => [gaussian(r), gaussian(r)] as V2);
  })();
  const refs = starts.map((s) => sample(s, T).out);

  // Deliberately NOT scoring samples by distance-to-nearest-mode. A correct
  // sample from this mixture sits about sigma = 0.18 from a mode centre, so
  // "closer" is not "better" — the first version of this payoff read that
  // metric as quality and concluded the stochastic sampler beat DDIM, which is
  // meaningless. What is well-posed is the *spread* of endpoints from a fixed
  // start: zero for a deterministic sampler, and whatever the noise injects
  // otherwise.
  const sweep = BUDGETS.map((S) => {
    let errD = 0;
    let spread = 0;
    starts.forEach((s, i) => {
      errD += dist(sample(s, S).out, refs[i]);
      // two independent stochastic runs from the SAME start
      const a = sample(s, S, 1, seededRng(1000 + i)).out;
      const b = sample(s, S, 1, seededRng(90000 + i)).out;
      spread += dist(a, b);
    });
    return { S, err: errD / N_START, spread: spread / N_START };
  });
  const at50 = sweep.find((s) => s.S === 50)!;
  const at2 = sweep[0];

  push(
    `**Payoff — what "50 steps instead of 1000" actually costs, and what η buys.** For ${N_START} starting noises, compare each budget against the 1000-step reference trajectory from the *same* start. DDIM's endpoint error falls ${fmt(
      at2.err,
      3
    )} at ${at2.S} steps to **${fmt(at50.err, 4)} at 50** — the page's ~20× speedup claim, and the residual is small next to the mixture's own scale (modes sit ${fmt(
      dist(MODES[0].m, MODES[1].m),
      2
    )} apart). The convergence is clean and monotone, which is the ODE argument working: a deterministic trajectory integrated on a coarser grid, with error shrinking as the grid refines. Now turn η up to 1, restoring DDPM's fresh noise at every step, and run each start **twice**: the two endpoints land ${fmt(
      at50.spread,
      3
    )} apart at 50 steps and ${fmt(
      sweep[sweep.length - 1].spread,
      3
    )} apart at ${
      sweep[sweep.length - 1].S
    }. There is no reference trajectory to converge to, because there is no trajectory — the endpoint is a draw, not a function of the start. **That, not sample quality, is what η costs.** Semantic interpolation, reproducible seeds, and the whole practice of treating the latent as an address for an image all require η = 0. The one exception in the table is the 2-step row, where the spread collapses to ${fmt(
      sweep[0].spread,
      3
    )}: a single jump from t = ${T - 1} straight to t = 0 lands at a noise level where ᾱ ≈ 1, so σ is almost zero and there is nowhere for the randomness to enter. Even DDPM is deterministic if you only take one step — it is just very wrong.`,
    ln("x = (sqrt(ab[t_next]) * x0"),
    {
      t: "table",
      label: `${N_START} starting noises, against the ${T}-step reference`,
      head: ["steps", "DDIM error vs ref", "η=1 spread, same start"],
      v: sweep.map((s) => ({
        cells: [String(s.S), fmt(s.err, 4), fmt(s.spread, 4)],
        cls: (s.S === 50 ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "plot",
      label: "DDIM error vs the 1000-step reference (green), η = 1 endpoint spread (red)",
      domain: [0, 250, 0, 1.8],
      xLabel: "steps",
      yLabel: "distance",
      curves: [
        { pts: sweep.map((s) => ({ x: s.S, y: s.err })), cls: "good" },
        { pts: sweep.map((s) => ({ x: s.S, y: s.spread })), cls: "bad" },
      ],
    },
    {
      t: "note",
      text: "One thing this deliberately does not claim: that DDIM produces *better samples* than the stochastic sampler. Scoring samples by distance to the nearest mode says the opposite, and that metric is meaningless here — a correct draw from this mixture sits about 0.18 from a mode centre, so closer is not better. With a perfect ε both samplers target the right distribution; what differs is that only one of them is a function of its input.",
      cls: "warn",
    }
  );

  return {
    id: "ddim-sampling",
    title: "DDIM — the guess, the re-noise, and what step-skipping costs",
    caption:
      "Run on a Gaussian mixture, whose optimal noise predictor is available in closed form — so there is no network to train and no model error mixed into the measurement. Watch x̂₀, the model's running guess at the clean sample, start near the distribution mean and commit to one mode as the responsibilities collapse. Determinism is checked directly and the interpolation property measured as a path-length ratio. The payoff measures the page's ~20x speedup claim against a 1000-step reference from the same starting noise — error falls to 0.027 at 50 steps — and then turns η back up to 1, where two runs from the same start diverge instead of converging, because there is no trajectory to converge to.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const ddimTrace = build();
