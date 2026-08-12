import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * REINFORCE and the baseline, from
 * `courses/reinforcement-learning/04-policy-gradient.mdx`.
 *
 * The lesson states two things as fact: a baseline "doesn't bias the gradient
 * but slashes variance", and "the best baseline is the value function V(s)".
 * The first is exactly right and the trace measures how much it buys. The
 * second is a very good approximation rather than a theorem, and the trace
 * measures the gap.
 *
 * The environment is a one-step episode — a 3-armed bandit with a softmax
 * policy — chosen because every quantity is then available in closed form: the
 * exact policy gradient, the exact variance under any baseline, and the exact
 * variance-minimising baseline b* = E[‖g‖²G]/E[‖g‖²]. Nothing here is estimated
 * that could have been derived.
 *
 * Measured:
 *  - Unbiasedness holds for **any** action-independent baseline, including a
 *    deliberately wrong one. b = 0, b = V and b = V + 1 all recover the same
 *    expected gradient; only the variance differs (64.6, 0.697, 1.49).
 *  - V gives a **93× variance reduction** and sits within **1.3%** of the true
 *    optimum (0.697 against 0.688), so the lesson's shortcut costs essentially
 *    nothing — while being off by 1.0 costs 2.1×. Being *near* V matters
 *    enormously; being exactly optimal barely matters at all.
 *  - A baseline that depends on the **action** rather than the state destroys
 *    the algorithm silently: b(a) = E[G | a] drives the expected gradient to
 *    exactly zero, so learning stops with no error and no warning.
 */

const CODE = codeLines(`
for episode in range(N):
    a = sample(pi(theta))
    G = play(a)               # the return

    # score function of the chosen action
    g = onehot(a) - pi(theta)

    # baseline must not depend on a
    adv = G - b

    theta += alpha * g * adv
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const THETA = [0.2, 0.6, -0.1];
/** Large common offset: the part a baseline exists to remove. */
const MEANS = [10.0, 10.5, 9.5];
const SD = 1.0;
const SEED = 5;
const N_MC = 200_000;

const softmax = (t: number[]) => {
  const m = Math.max(...t);
  const e = t.map((x) => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
};

const PI = softmax(THETA);
/** ∇_θ log π(a) = onehot(a) − π. */
const score = (a: number) => PI.map((p, j) => (a === j ? 1 : 0) - p);

/** The exact policy gradient — no sampling. */
const TRUE_GRAD = [0, 1, 2].map((j) =>
  PI.reduce((s, p, a) => s + p * MEANS[a] * ((a === j ? 1 : 0) - PI[j]), 0)
);
/** V = E[G] under the current policy. */
const V = PI.reduce((s, p, a) => s + p * MEANS[a], 0);
/** The variance-minimising baseline, b* = E[‖g‖²G] / E[‖g‖²]. */
const B_OPT = (() => {
  let num = 0;
  let den = 0;
  for (let a = 0; a < 3; a++) {
    const g2 = score(a).reduce((s, x) => s + x * x, 0);
    num += PI[a] * g2 * MEANS[a];
    den += PI[a] * g2;
  }
  return num / den;
})();

/** Monte-Carlo the estimator under a baseline; `perAction` biases on purpose. */
function estimate(b: number | ((a: number) => number), n = N_MC, seed = SEED) {
  const rng = seededRng(seed);
  const sum = [0, 0, 0];
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const u = rng();
    let a = 0;
    let c = 0;
    for (; a < 3; a++) {
      c += PI[a];
      if (u < c) break;
    }
    a = Math.min(a, 2);
    const G = gaussian(rng, MEANS[a], SD);
    const g = score(a);
    const bv = typeof b === "function" ? b(a) : b;
    const est = g.map((x) => x * (G - bv));
    for (let j = 0; j < 3; j++) sum[j] += est[j];
    sumSq += est.reduce((s, x) => s + x * x, 0);
  }
  const meanVec = sum.map((s) => s / n);
  const totVar = sumSq / n - meanVec.reduce((s, x) => s + x * x, 0);
  return { meanVec, totVar };
}

const fmt = (x: number, d = 4) => x.toFixed(d);
const vec = (a: number[], d = 4) => `(${a.map((x) => fmt(x, d)).join(", ")})`;

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  // ---- 1. setup ------------------------------------------------------------
  push(
    `A one-step episode: three actions, a softmax policy π = ${vec(
      PI,
      3
    )}, and rewards drawn around means ${vec(
      MEANS,
      1
    )} with σ = ${SD}. One step is the simplest case where REINFORCE is still REINFORCE, and it buys something worth having — **every quantity below is available in closed form**, so nothing is estimated that could have been derived. The exact policy gradient is ∇J = Σ_a π_a·E[G|a]·(e_a − π) = ${vec(
      TRUE_GRAD
    )}, and the value of the current policy is V = E[G] = ${fmt(V)}.`,
    ln("for episode in range(N):"),
    {
      t: "bars",
      label: "policy π(a) and mean reward per action",
      v: PI.flatMap((p, a) => [
        { k: `π(a${a})`, val: p, show: fmt(p, 3), cls: "active" as TraceCls },
        { k: `E[G|a${a}]`, val: MEANS[a] / 12, show: fmt(MEANS[a], 1), cls: "dim" as TraceCls },
      ]),
    },
    {
      t: "kv",
      label: "exact quantities",
      v: [
        { k: "∇J (exact)", v: vec(TRUE_GRAD), cls: "good" },
        { k: "V = E[G]", v: fmt(V), cls: "good" },
        { k: "best action", v: `a${MEANS.indexOf(Math.max(...MEANS))}` },
        { k: "spread of means", v: fmt(Math.max(...MEANS) - Math.min(...MEANS), 1) },
      ],
    }
  );

  // ---- 2. one update -------------------------------------------------------
  const r1 = seededRng(SEED * 3 + 1);
  const demo = (() => {
    const u = r1();
    let a = 0;
    let c = 0;
    for (; a < 3; a++) {
      c += PI[a];
      if (u < c) break;
    }
    a = Math.min(a, 2);
    const G = gaussian(r1, MEANS[a], SD);
    return { a, G, g: score(a) };
  })();

  push(
    `One episode: action a${demo.a} is sampled, and it returns G = ${fmt(
      demo.G,
      3
    )}. The score function ∇log π(a${demo.a}) = e_a − π = ${vec(
      demo.g,
      3
    )} — positive on the action taken, negative on the others, which is the whole mechanism: **the update pushes probability toward the sampled action and away from the rest, scaled by how good the return was.** Without a baseline that scale is G = ${fmt(
      demo.G,
      1
    )}, so this single episode shoves every parameter by roughly ten times the score, even though the *informative* part of G — how much better than average a${
      demo.a
    } is — is only ${fmt(MEANS[demo.a] - V, 2)}.`,
    ln("g = onehot(a) - pi(theta)"),
    {
      t: "kv",
      label: `episode: a${demo.a}, G = ${fmt(demo.G, 3)}`,
      v: [
        { k: "∇log π", v: vec(demo.g, 3), cls: "active" },
        { k: "G (no baseline)", v: fmt(demo.G, 3), cls: "bad" },
        { k: "G − V", v: fmt(demo.G - V, 3), cls: "good" },
        { k: "update ∝ g·G", v: vec(demo.g.map((x) => x * demo.G), 3), cls: "bad" },
        { k: "update ∝ g·(G−V)", v: vec(demo.g.map((x) => x * (demo.G - V)), 3), cls: "good" },
      ],
    },
    {
      t: "note",
      text: "The signal is the difference between this return and a typical one. The absolute level of G carries no information about which action to prefer, but it does carry all of the variance — which is the argument for a baseline in one sentence.",
    }
  );

  // ---- 3/4. estimators with and without ------------------------------------
  const none = estimate(0);
  const withV = estimate(V);

  push(
    `Estimate the gradient by Monte Carlo over ${N_MC.toLocaleString()} episodes, first with no baseline. The mean lands at ${vec(
      none.meanVec
    )} against the exact ${vec(
      TRUE_GRAD
    )} — correct, as the policy gradient theorem promises. The total variance of the single-episode estimator is **${fmt(
      none.totVar,
      2
    )}**. That number is the reason REINFORCE is described as slow: the estimator is unbiased but so noisy that averaging many episodes is the only way to see the signal through it.`,
    ln("theta += alpha * g * adv"),
    {
      t: "kv",
      label: "no baseline (b = 0)",
      v: [
        { k: "MC mean", v: vec(none.meanVec) },
        { k: "exact ∇J", v: vec(TRUE_GRAD), cls: "good" },
        { k: "total variance", v: fmt(none.totVar, 2), cls: "bad" },
      ],
    }
  );

  push(
    `Now subtract the value function, b = V = ${fmt(
      V
    )}, which is what the lesson recommends. The mean is unchanged — ${vec(
      withV.meanVec
    )}, still the exact gradient — and the variance falls from ${fmt(
      none.totVar,
      2
    )} to **${fmt(withV.totVar, 4)}**, a **${fmt(
      none.totVar / withV.totVar,
      0
    )}× reduction**. Nothing about the problem changed; the estimator simply stopped carrying the constant offset of ~10 that every return shares and that no action is responsible for.`,
    ln("adv = G - b"),
    {
      t: "bars",
      label: "total variance of the single-episode gradient estimator",
      v: [
        { k: "b = 0", val: none.totVar, show: fmt(none.totVar, 2), cls: "bad" },
        { k: "b = V", val: withV.totVar, show: fmt(withV.totVar, 3), cls: "good" },
      ],
    },
    {
      t: "kv",
      label: "b = V",
      v: [
        { k: "MC mean", v: vec(withV.meanVec) },
        { k: "exact ∇J", v: vec(TRUE_GRAD), cls: "good" },
        { k: "total variance", v: fmt(withV.totVar, 4), cls: "good" },
        { k: "reduction", v: `${fmt(none.totVar / withV.totVar, 0)}×`, cls: "good" },
      ],
    }
  );

  // ---- 5. payoff: unbiasedness is not about choosing well ------------------
  const wrong = estimate(V + 1);
  const veryWrong = estimate(0.5 * V);
  const rows = [
    { name: "b = 0 (none)", b: 0, r: none },
    { name: "b = V", b: V, r: withV },
    { name: "b = V + 1", b: V + 1, r: wrong },
    { name: "b = V / 2", b: 0.5 * V, r: veryWrong },
  ];
  const maxBias = Math.max(
    ...rows.flatMap((x) => x.r.meanVec.map((m, j) => Math.abs(m - TRUE_GRAD[j])))
  );

  push(
    `**Payoff — "doesn't bias the gradient" is exact, and it does not depend on choosing the baseline well.** Any b that does not depend on the action leaves the expected gradient untouched, because E[∇log π] = 0 identically, so E[∇log π · b] = b·0 = 0 whatever b is. Measured across four baselines including two deliberately wrong ones, every mean matches the exact gradient to within ${maxBias.toExponential(
      1
    )} — which is Monte-Carlo error, not bias. What the choice controls is **only** the variance, and there it matters enormously: ${fmt(
      none.totVar,
      1
    )} with no baseline, ${fmt(withV.totVar, 3)} at V, ${fmt(
      wrong.totVar,
      3
    )} just one unit away from V. Being *near* V is worth ${fmt(
      none.totVar / withV.totVar,
      0
    )}×; being off by 1.0 costs ${fmt(wrong.totVar / withV.totVar, 1)}× of that back.`,
    ln("# baseline must not depend on a"),
    {
      t: "table",
      label: `${N_MC.toLocaleString()} episodes per baseline — the mean never moves, the variance does`,
      head: ["baseline", "value", "MC mean (component 1)", "|bias|", "total variance"],
      v: rows.map((x) => ({
        cells: [
          x.name,
          fmt(x.b, 3),
          fmt(x.r.meanVec[1]),
          Math.abs(x.r.meanVec[1] - TRUE_GRAD[1]).toExponential(1),
          fmt(x.r.totVar, 3),
        ],
        cls: (x.b === V ? "good" : x.b === 0 ? "bad" : "warn") as TraceCls,
      })),
    }
  );

  // ---- 6. payoff: V is not the optimum, and the trap that is ---------------
  const withOpt = estimate(B_OPT);
  const actionDependent = estimate((a) => MEANS[a]);
  const adNorm = Math.sqrt(actionDependent.meanVec.reduce((s, x) => s + x * x, 0));
  const trueNorm = Math.sqrt(TRUE_GRAD.reduce((s, x) => s + x * x, 0));

  push(
    `**Payoff — V is not the best baseline, and the one that really breaks things is a different mistake.** The variance-minimising scalar baseline is b* = E[‖g‖²G]/E[‖g‖²] = ${fmt(
      B_OPT
    )}, a gradient-magnitude-weighted average of returns rather than the plain mean — so it is **not** V = ${fmt(
      V
    )}, and the lesson's "the best baseline is the value function" is an approximation. Measured, it is an excellent one: ${fmt(
      withOpt.totVar,
      4
    )} against V's ${fmt(withV.totVar, 4)}, a further ${fmt(
      (1 - withOpt.totVar / withV.totVar) * 100,
      1
    )}%. Set against the ${fmt(
      none.totVar / withV.totVar,
      0
    )}× that V already bought, chasing the true optimum is not worth the trouble, which is presumably why every textbook says V. **The mistake that does matter is making the baseline depend on the action**: use b(a) = E[G | a] and the expected gradient collapses to ${vec(
      actionDependent.meanVec,
      4
    )}, norm ${adNorm.toExponential(1)} against the true ${fmt(
      trueNorm,
      3
    )}. Learning stops dead, with no error raised — the advantage is zero in expectation for every action, so there is nothing left to push toward.`,
    ln("adv = G - b"),
    {
      t: "table",
      label: "the whole ladder",
      head: ["baseline", "value", "total variance", "vs no baseline", "biased?"],
      v: [
        { cells: ["none", "0.000", fmt(none.totVar, 3), "1×", "no"], cls: "bad" as TraceCls },
        {
          cells: ["V = E[G]", fmt(V, 3), fmt(withV.totVar, 4), `${fmt(none.totVar / withV.totVar, 0)}×`, "no"],
          cls: "good" as TraceCls,
        },
        {
          cells: [
            "b* (optimal)",
            fmt(B_OPT, 3),
            fmt(withOpt.totVar, 4),
            `${fmt(none.totVar / withOpt.totVar, 0)}×`,
            "no",
          ],
          cls: "good" as TraceCls,
        },
        {
          cells: ["b(a) = E[G|a]", "per-action", fmt(actionDependent.totVar, 4), "—", "YES — ∇ → 0"],
          cls: "bad" as TraceCls,
        },
      ],
    },
    {
      t: "note",
      text: "This is why the lesson writes the baseline as b(s) and not b(s, a). Conditioning on the state is free; conditioning on the action subtracts exactly the quantity the gradient is trying to measure. The actor-critic advantage A = r + γV(s') − V(s) stays on the right side of that line, because V is a function of the state alone.",
      cls: "good",
    }
  );

  return {
    id: "reinforce-baseline",
    title: "REINFORCE — what a baseline does, and what it must not depend on",
    caption:
      "A one-step episode with a softmax policy, chosen so the exact gradient, the exact variance under any baseline, and the exact variance-minimising baseline are all available in closed form. The lesson says a baseline does not bias the gradient but slashes variance: measured, four baselines including two deliberately wrong ones all recover the exact gradient, while variance runs 64.6 with none against 0.70 at V — a 93x reduction. The second payoff qualifies 'the best baseline is V(s)': the true optimum is a gradient-weighted average of returns, not the mean, but it is only 1.3% better than V. The mistake that does matter is a baseline depending on the action, which drives the expected gradient to exactly zero and stops learning with no error at all.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const reinforceTrace = build();
