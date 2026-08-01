import type { AlgoTrace, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * EM on the 1-D, 2-component mixture worked by hand in
 * `src/content/wiki/em-algorithm.mdx`: X = {1, 2, 4, 5}, μ = (2, 4),
 * σ = (1.5, 1.5), π = (0.5, 0.5).
 *
 * The payoff runs the loop to convergence and plots the log-likelihood, which
 * is monotone by construction — the ELBO argument on that page, in numbers.
 */

const CODE = codeLines(`
def em(X, mu, sd, pi, iters):
    for _ in range(iters):
        # E-step: responsibility of k for x_i
        g = [[pi[k] * N(x, mu[k], sd[k])
              for k in range(K)] for x in X]
        g = [[v / sum(row) for v in row]
             for row in g]
        # M-step: weighted counts -> parameters
        Nk = [sum(g[i][k] for i in range(n))
              for k in range(K)]
        mu = [sum(g[i][k] * X[i]
                  for i in range(n)) / Nk[k]
              for k in range(K)]
        sd = [sqrt(sum(g[i][k] * (X[i] - mu[k])**2
                       for i in range(n)) / Nk[k])
              for k in range(K)]
        pi = [Nk[k] / n for k in range(K)]
        ll = loglik(X, mu, sd, pi)
    return mu, sd, pi
`);

const ln = lineFinder(CODE);

const X = [1, 2, 4, 5];
const K = 2;
const n = X.length;
const DOMAIN: [number, number, number, number] = [0, 6, 0, 0.55];

const fmt = (x: number, d = 3) => x.toFixed(d);

const normal = (x: number, mu: number, sd: number) =>
  (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));

const loglik = (mu: number[], sd: number[], pi: number[]) =>
  X.reduce((s, x) => s + Math.log(pi.reduce((t, p, k) => t + p * normal(x, mu[k], sd[k]), 0)), 0);

/** The two weighted component densities, sampled for plotting. */
function densityPlot(label: string, mu: number[], sd: number[], pi: number[], active?: number): TraceComponent {
  const xs = Array.from({ length: 121 }, (_, i) => (i * 6) / 120);
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    xLabel: "x",
    curves: [
      { pts: xs.map((x) => ({ x, y: pi[0] * normal(x, mu[0], sd[0]) })), cls: "active" },
      { pts: xs.map((x) => ({ x, y: pi[1] * normal(x, mu[1], sd[1]) })), cls: "good" },
    ],
    points: [
      ...X.map((x, i) => ({
        x,
        y: 0.012,
        id: String(x),
        cls: (active === i ? "warn" : undefined) as "warn" | undefined,
        shape: (active === i ? "ring" : "dot") as "ring" | "dot",
      })),
      { x: mu[0], y: pi[0] * normal(mu[0], mu[0], sd[0]), id: "μ1", cls: "active", shape: "cross" },
      { x: mu[1], y: pi[1] * normal(mu[1], mu[1], sd[1]), id: "μ2", cls: "good", shape: "cross" },
    ],
  };
}

function respTable(gamma: number[][], upTo = n): TraceComponent {
  return {
    t: "table",
    label: "responsibilities γ",
    head: ["x", "γ·1", "γ·2"],
    v: X.map((x, i) => ({
      cells: [String(x), i < upTo ? fmt(gamma[i][0]) : "·", i < upTo ? fmt(gamma[i][1]) : "·"],
      cls: i < upTo ? (gamma[i][0] > gamma[i][1] ? "active" : "good") : "dim",
    })),
  };
}

const paramPanel = (mu: number[], sd: number[], pi: number[], ll: number): TraceComponent => ({
  t: "kv",
  label: "parameters",
  v: [
    { k: "μ1", v: fmt(mu[0], 2), cls: "active" },
    { k: "μ2", v: fmt(mu[1], 2), cls: "good" },
    { k: "σ1", v: fmt(sd[0], 3) },
    { k: "σ2", v: fmt(sd[1], 3) },
    { k: "π", v: `(${fmt(pi[0], 2)}, ${fmt(pi[1], 2)})` },
    { k: "ℓ", v: fmt(ll, 4), cls: "warn" },
  ],
});

/** One EM iteration; returns every intermediate quantity. */
function step(mu: number[], sd: number[], pi: number[]) {
  const gamma = X.map((x) => {
    const w = mu.map((m, k) => pi[k] * normal(x, m, sd[k]));
    const z = w.reduce((s, v) => s + v, 0);
    return w.map((v) => v / z);
  });
  const Nk = Array.from({ length: K }, (_, k) => gamma.reduce((s, g) => s + g[k], 0));
  const newMu = Nk.map((nk, k) => X.reduce((s, x, i) => s + gamma[i][k] * x, 0) / nk);
  const newSd = Nk.map((nk, k) =>
    Math.sqrt(X.reduce((s, x, i) => s + gamma[i][k] * (x - newMu[k]) ** 2, 0) / nk)
  );
  const newPi = Nk.map((nk) => nk / n);
  return { gamma, Nk, newMu, newSd, newPi };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  let mu = [2, 4];
  let sd = [1.5, 1.5];
  let pi = [0.5, 0.5];
  const llHistory = [loglik(mu, sd, pi)];

  push(
    `Four points — 1, 2, 4, 5 — and two Gaussian components initialized at μ = (2, 4) with σ = 1.5 and equal mixing weights. Nobody has told EM which point belongs to which component; that is precisely the latent variable it has to infer. Starting log-likelihood ℓ = ${fmt(llHistory[0], 4)}.`,
    ln("def em(X, mu, sd, pi, iters)"),
    densityPlot("initial mixture", mu, sd, pi),
    paramPanel(mu, sd, pi, llHistory[0])
  );

  const first = step(mu, sd, pi);

  // ---- E-step, point by point --------------------------------------------
  X.forEach((x, i) => {
    const d1 = normal(x, mu[0], sd[0]);
    const d2 = normal(x, mu[1], sd[1]);
    push(
      `x = ${x}: component 1 gives density ${fmt(d1, 4)}, component 2 gives ${fmt(d2, 4)}. Weight each by π = 0.5 and normalize: γ = (${fmt(first.gamma[i][0])}, ${fmt(first.gamma[i][1])}). This is a *soft* assignment — x = ${x} belongs ${fmt(first.gamma[i][0] * 100, 1)}% to component 1, not wholly to either.`,
      ln("g = [[pi[k] * N(x, mu[k], sd[k])"),
      densityPlot("E-step", mu, sd, pi, i),
      respTable(first.gamma, i + 1),
      {
        t: "bars",
        label: `x = ${x}: weighted density per component`,
        v: [
          { k: "π₁·N₁", val: pi[0] * d1, show: fmt(pi[0] * d1, 4), cls: d1 > d2 ? "active" : "dim" },
          { k: "π₂·N₂", val: pi[1] * d2, show: fmt(pi[1] * d2, 4), cls: d2 > d1 ? "good" : "dim" },
        ],
      }
    );
  });

  push(
    `E-step complete. The table is perfectly antisymmetric about x = 3 because the initialization was symmetric about it. The effective counts are N₁ = ${fmt(first.Nk[0], 2)} and N₂ = ${fmt(first.Nk[1], 2)} — each component "owns" exactly two points' worth of data, though not any two specific points.`,
    ln("Nk = [sum(g[i][k]"),
    respTable(first.gamma),
    {
      t: "kv",
      label: "effective counts",
      v: [
        { k: "N₁", v: fmt(first.Nk[0], 3), cls: "active" },
        { k: "N₂", v: fmt(first.Nk[1], 3), cls: "good" },
        { k: "n", v: String(n) },
      ],
    }
  );

  // ---- M-step ------------------------------------------------------------
  push(
    `M-step, means: μ₁ = (${X.map((x, i) => `${fmt(first.gamma[i][0], 3)}·${x}`).join(" + ")}) / ${fmt(first.Nk[0], 1)} = ${fmt(first.newMu[0], 2)}, and μ₂ = ${fmt(first.newMu[1], 2)}. Each mean is a *responsibility-weighted* average: every point contributes to every component, just not equally.`,
    ln("mu = [sum(g[i][k] * X[i]"),
    densityPlot("after the mean update", first.newMu, sd, pi),
    respTable(first.gamma)
  );

  push(
    `M-step, spreads and weights: σ → (${fmt(first.newSd[0], 3)}, ${fmt(first.newSd[1], 3)}), down from 1.5 — the components have started to specialize. π stays at (${fmt(first.newPi[0], 2)}, ${fmt(first.newPi[1], 2)}) because the responsibilities split evenly.`,
    [...ln("sd = [sqrt("), ...ln("pi = [Nk[k] / n")],
    densityPlot("after the full M-step", first.newMu, first.newSd, first.newPi),
    paramPanel(first.newMu, first.newSd, first.newPi, loglik(first.newMu, first.newSd, first.newPi))
  );

  mu = first.newMu;
  sd = first.newSd;
  pi = first.newPi;
  llHistory.push(loglik(mu, sd, pi));

  push(
    `Log-likelihood after one full iteration: ${fmt(llHistory[1], 4)}, up from ${fmt(llHistory[0], 4)}. That increase is not luck. The E-step makes the ELBO exactly tight against the log-likelihood, and the M-step then raises the ELBO — so the likelihood cannot fall.`,
    ln("ll = loglik(X, mu, sd, pi)"),
    {
      t: "bars",
      label: "log-likelihood by iteration",
      v: llHistory.map((l, i) => ({
        k: `iter ${i}`,
        val: l - llHistory[0] + 0.01,
        show: fmt(l, 3),
        cls: i === llHistory.length - 1 ? "good" : "dim",
      })),
    },
    paramPanel(mu, sd, pi, llHistory[1])
  );

  // ---- run to convergence -------------------------------------------------
  for (let iter = 2; iter <= 12; iter++) {
    const s = step(mu, sd, pi);
    mu = s.newMu;
    sd = s.newSd;
    pi = s.newPi;
    const ll = loglik(mu, sd, pi);
    const delta = ll - llHistory[llHistory.length - 1];
    llHistory.push(ll);

    if (iter <= 4 || delta < 1e-6 || iter === 12) {
      push(
        delta < 1e-6
          ? `Iteration ${iter}: ℓ moved by ${delta.toExponential(1)} — below the tolerance, so EM stops. The components have settled on μ = (${fmt(mu[0], 3)}, ${fmt(mu[1], 3)}) with σ = ${fmt(sd[0], 3)}: one owns {1, 2}, the other {4, 5}, which is the split a human would have made by eye.`
          : `Iteration ${iter}: the responsibilities sharpen, the means separate to (${fmt(mu[0], 3)}, ${fmt(mu[1], 3)}), and σ shrinks to ${fmt(sd[0], 3)}. ℓ rises to ${fmt(ll, 4)} (+${fmt(delta, 4)}).`,
        ln("for _ in range(iters)"),
        densityPlot(`iteration ${iter}`, mu, sd, pi),
        paramPanel(mu, sd, pi, ll),
        {
          t: "bars",
          label: "log-likelihood by iteration",
          v: llHistory.map((l, i) => ({
            k: `iter ${i}`,
            val: l - llHistory[0] + 0.01,
            show: fmt(l, 3),
            cls: i === llHistory.length - 1 ? "good" : "dim",
          })),
        }
      );
    }
    if (delta < 1e-6) break;
  }

  push(
    `The whole run in one picture: every bar is at least as tall as the one before it. EM is coordinate ascent on the ELBO, and because the E-step makes that bound tight, ascending it can only push the true log-likelihood up. That is why EM never needs a learning rate, never diverges, and never needs a step-size search — and also why it can only promise you a *local* optimum.`,
    ln("ll = loglik(X, mu, sd, pi)"),
    {
      t: "bars",
      label: "log-likelihood, every iteration",
      v: llHistory.map((l, i) => ({
        k: `iter ${i}`,
        val: l - llHistory[0] + 0.01,
        show: fmt(l, 3),
        cls: i === 0 ? "bad" : i === llHistory.length - 1 ? "good" : "dim",
      })),
    },
    densityPlot("converged mixture", mu, sd, pi),
    {
      t: "note",
      text: "Monotone, but not global: initialize both components on the same side of the data and EM will happily converge to a much worse fit, with the same guarantee intact.",
      cls: "warn",
    }
  );

  return {
    id: "em-gmm",
    title: "EM — soft responsibilities, weighted re-estimation, monotone likelihood",
    caption:
      "One full EM iteration on X = {1, 2, 4, 5} with two Gaussian components, in the same numbers as the hand-worked example above, then the loop run to convergence. Watch the E-step compute a soft responsibility for every point (never a hard assignment), the M-step re-estimate each parameter as a responsibility-weighted count, and the log-likelihood rise at every single iteration — the ELBO guarantee made visible.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const emTrace = build();
