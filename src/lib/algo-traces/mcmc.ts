import type { AlgoTrace, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * Random-walk Metropolis on a Beta(8, 4) posterior — 7 heads in 10 flips under a
 * uniform prior. The target is deliberately one we can solve exactly, so the
 * sampler's answer can be checked against the truth rather than admired.
 *
 * The payoff runs three proposal scales against the same target and reports
 * acceptance rate and effective sample size: the σ that accepts almost
 * everything and the σ that accepts almost nothing are both far worse than the
 * one in between, which is the whole reason acceptance-rate tuning is a rule
 * of thumb worth memorizing.
 */

const CODE = codeLines(`
def metropolis(target, theta, sigma, n):
    chain = [theta]
    for _ in range(n):
        # symmetric proposal: q cancels
        prop = theta + normal(0, sigma)
        if not 0 < prop < 1:
            chain.append(theta)   # reject
            continue
        # the normalizing constant cancels here
        ratio = target(prop) / target(theta)
        if uniform() < min(1, ratio):
            theta = prop          # accept
        chain.append(theta)
    return chain

def target(t):                    # unnormalized
    return t ** 7 * (1 - t) ** 3
`);

const ln = lineFinder(CODE);

// Beta(8, 4): 7 heads, 3 tails, uniform prior. Mean 8/12, mode 7/10.
const A = 8;
const B = 4;
const TRUE_MEAN = A / (A + B);
const START = 0.2;
const SIGMA = 0.3;

const DOMAIN: [number, number, number, number] = [0, 1, 0, 3.2];
const fmt = (x: number, d = 3) => x.toFixed(d);

/** Unnormalized posterior — exactly what the sampler is allowed to see. */
const target = (t: number) => (t <= 0 || t >= 1 ? 0 : t ** (A - 1) * (1 - t) ** (B - 1));

/** Normalized Beta density, used only to check the sampler's answer. */
function betaPdf(t: number) {
  const logB =
    lgamma(A) + lgamma(B) - lgamma(A + B);
  return Math.exp((A - 1) * Math.log(t) + (B - 1) * Math.log(1 - t) - logB);
}

/** Lanczos log-gamma — enough precision for a plotted reference curve. */
function lgamma(x: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  g.forEach((c, i) => (a += c / (x + i + 1)));
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const XS = Array.from({ length: 101 }, (_, i) => i / 100);
const TARGET_CURVE = XS.slice(1, 100).map((x) => ({ x, y: betaPdf(x) }));

/** One Metropolis run; `record` captures per-step detail for the traced portion. */
function metropolis(sigma: number, steps: number, seed = 7) {
  const rng = seededRng(seed);
  let theta = START;
  const chain = [theta];
  const detail: { prop: number; ratio: number; u: number; accept: boolean; from: number }[] = [];
  let accepted = 0;

  for (let i = 0; i < steps; i++) {
    const prop = theta + gaussian(rng, 0, sigma);
    const from = theta;
    let ratio = 0;
    let u = 1;
    let accept = false;
    if (prop > 0 && prop < 1) {
      ratio = target(prop) / target(theta);
      u = rng();
      accept = u < Math.min(1, ratio);
      if (accept) {
        theta = prop;
        accepted += 1;
      }
    } else {
      rng(); // keep the stream aligned with the accepted branch
    }
    detail.push({ prop, ratio, u, accept, from });
    chain.push(theta);
  }
  return { chain, detail, acceptRate: accepted / steps };
}

/** ESS = N / (1 + 2Σρ_k), truncated where the autocorrelation dies out. */
function ess(chain: number[]) {
  const n = chain.length;
  const mean = chain.reduce((s, v) => s + v, 0) / n;
  const varSum = chain.reduce((s, v) => s + (v - mean) ** 2, 0);
  if (varSum === 0) return 0;
  let sum = 0;
  for (let k = 1; k < Math.min(500, n - 1); k++) {
    let c = 0;
    for (let i = 0; i < n - k; i++) c += (chain[i] - mean) * (chain[i + k] - mean);
    const rho = c / varSum;
    if (rho < 0.05) break;
    sum += rho;
  }
  return n / (1 + 2 * sum);
}

function densityPlot(label: string, theta: number, prop?: number, accepted?: boolean): TraceComponent {
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    xLabel: "θ",
    curves: [{ pts: TARGET_CURVE, cls: "dim" }],
    points: [
      { x: theta, y: betaPdf(theta), id: "θ", cls: "active", shape: "dot" },
      ...(prop !== undefined && prop > 0 && prop < 1
        ? [
            {
              x: prop,
              y: betaPdf(prop),
              id: "θ'",
              cls: (accepted ? "good" : "bad") as "good" | "bad",
              shape: "ring" as const,
            },
          ]
        : []),
    ],
    segments:
      prop !== undefined && prop > 0 && prop < 1
        ? [{ x1: theta, y1: betaPdf(theta), x2: prop, y2: betaPdf(prop), cls: accepted ? "good" : "bad", dashed: true }]
        : undefined,
  };
}

/** Trace plot: chain value against iteration. */
function tracePlot(chain: number[], label: string): TraceComponent {
  return {
    t: "plot",
    label,
    domain: [0, Math.max(12, chain.length - 1), 0, 1],
    xLabel: "iteration",
    yLabel: "θ",
    curves: [
      { pts: chain.map((v, i) => ({ x: i, y: v })), cls: "active" },
      {
        pts: [
          { x: 0, y: TRUE_MEAN },
          { x: Math.max(12, chain.length - 1), y: TRUE_MEAN },
        ],
        cls: "good",
        dashed: true,
      },
    ],
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const TRACED = 12;
  const run = metropolis(SIGMA, 4000);

  push(
    `The target is the posterior after 7 heads in 10 flips under a uniform prior — a Beta(${A}, ${B}) with mean ${fmt(TRUE_MEAN)}. Crucially the sampler is only ever shown the *unnormalized* density θ⁷(1−θ)³; it never gets the normalizing constant, which is the situation every real Bayesian model is in. The chain starts at θ = ${START}, deliberately far out in the tail.`,
    ln("def target(t)"),
    densityPlot("target density (dashed line = true mean)", START),
    {
      t: "kv",
      label: "setup",
      v: [
        { k: "θ₀", v: String(START), cls: "active" },
        { k: "σ (proposal)", v: String(SIGMA) },
        { k: "true mean", v: fmt(TRUE_MEAN), cls: "good" },
      ],
    }
  );

  for (let i = 0; i < TRACED; i++) {
    const d = run.detail[i];
    const outOfRange = d.prop <= 0 || d.prop >= 1;
    push(
      outOfRange
        ? `Step ${i + 1}: the proposal θ' = ${fmt(d.prop)} falls outside [0, 1], where the density is zero. Reject, and record the *current* value again — a rejected step still produces a sample, which is why the chain has flat stretches.`
        : `Step ${i + 1}: propose θ' = ${fmt(d.prop)} from θ = ${fmt(d.from)}. The ratio π(θ')/π(θ) = ${fmt(d.ratio)} ${
            d.ratio >= 1
              ? "≥ 1 — the proposal is at least as probable, so it is accepted unconditionally. Uphill moves are always taken."
              : `< 1, so accept it only with probability ${fmt(d.ratio)}. The coin came up ${fmt(d.u)}, so ${d.accept ? "accept — the chain does move downhill sometimes, and must, or it would just be hill-climbing." : "reject and stay put."}`
          }`,
      outOfRange ? ln("chain.append(theta)   # reject") : ln("ratio = target(prop) / target(theta)"),
      densityPlot(`step ${i + 1}`, d.from, d.prop, d.accept),
      {
        t: "kv",
        label: "this step",
        v: [
          { k: "θ", v: fmt(d.from), cls: "active" },
          { k: "θ'", v: fmt(d.prop), cls: d.accept ? "good" : "bad" },
          { k: "ratio", v: outOfRange ? "0" : fmt(d.ratio) },
          { k: "u", v: fmt(d.u) },
          { k: "→", v: d.accept ? "accept" : "reject", cls: d.accept ? "good" : "bad" },
        ],
      },
      tracePlot(run.chain.slice(0, i + 2), "chain so far")
    );
  }

  push(
    `Twelve steps in, the chain has climbed from ${START} into the bulk of the posterior. Those first steps are **burn-in**: they say more about where the chain started than about the target, and are discarded. Notice the ratio does the work — the normalizing constant appears in both numerator and denominator and cancels, so the sampler never needed it.`,
    ln("ratio = target(prop) / target(theta)"),
    tracePlot(run.chain.slice(0, TRACED + 1), "the first 12 steps — burn-in"),
    densityPlot("where the chain has reached", run.chain[TRACED])
  );

  // ---- long run -----------------------------------------------------------
  const burn = 500;
  const kept = run.chain.slice(burn);
  const mean = kept.reduce((s, v) => s + v, 0) / kept.length;

  const bins = 25;
  const hist = Array(bins).fill(0);
  kept.forEach((v) => (hist[Math.min(bins - 1, Math.floor(v * bins))] += 1));
  const histCurve = hist.map((c, i) => ({ x: (i + 0.5) / bins, y: (c / kept.length) * bins }));

  push(
    `Run 4000 steps, discard the first ${burn} as burn-in, and histogram the rest. The sample mean is ${fmt(mean, 4)} against a true posterior mean of ${fmt(TRUE_MEAN, 4)} — an error of ${fmt(Math.abs(mean - TRUE_MEAN), 4)}, from a sampler that only ever evaluated an unnormalized density and compared ratios.`,
    ln("return chain"),
    {
      t: "plot",
      label: "samples vs the exact posterior",
      domain: DOMAIN,
      xLabel: "θ",
      curves: [
        { pts: TARGET_CURVE, cls: "good" },
        { pts: histCurve, cls: "active" },
      ],
    },
    {
      t: "kv",
      label: "estimate",
      v: [
        { k: "sample mean", v: fmt(mean, 4), cls: "active" },
        { k: "true mean", v: fmt(TRUE_MEAN, 4), cls: "good" },
        { k: "acceptance", v: `${fmt(run.acceptRate * 100, 1)}%` },
        { k: "ESS", v: fmt(ess(kept), 0), cls: "warn" },
      ],
    }
  );

  // ---- payoff: the proposal scale ----------------------------------------
  const scales = [0.005, SIGMA, 5.0];
  const runs = scales.map((s) => {
    const r = metropolis(s, 4000);
    const k = r.chain.slice(burn);
    return {
      sigma: s,
      acceptRate: r.acceptRate,
      ess: ess(k),
      mean: k.reduce((a, v) => a + v, 0) / k.length,
      chain: r.chain,
    };
  });
  const best = runs.reduce((a, b) => (b.ess > a.ess ? b : a));

  push(
    `Same target, same 4000 steps, three proposal scales. σ = ${runs[0].sigma} accepts ${fmt(runs[0].acceptRate * 100, 0)}% of proposals — nearly all of them — but the steps are so small the chain never even finishes burning in, and its mean is off by ${fmt(Math.abs(runs[0].mean - TRUE_MEAN), 3)}. σ = ${runs[2].sigma} proposes jumps that overshoot into the tails, so ${fmt((1 - runs[2].acceptRate) * 100, 0)}% are rejected and the chain sits frozen for long stretches. Opposite failures, identical symptom: effective sample size collapses to ${fmt(runs[0].ess, 0)} and ${fmt(runs[2].ess, 0)} out of ${kept.length} draws. σ = ${best.sigma} wins with ESS ${fmt(best.ess, 0)} — and note its acceptance rate, ${fmt(best.acceptRate * 100, 0)}%, which is almost exactly the ~44% that the tuning rule of thumb prescribes for a single parameter.`,
    ln("prop = theta + normal(0, sigma)"),
    {
      t: "bars",
      label: "acceptance rate",
      v: runs.map((r) => ({
        k: `σ = ${r.sigma}`,
        val: r.acceptRate,
        show: `${fmt(r.acceptRate * 100, 0)}%`,
        cls: r === best ? "good" : "bad",
      })),
      max: 1,
    },
    {
      t: "bars",
      label: `effective sample size (of ${kept.length} draws)`,
      v: runs.map((r) => ({
        k: `σ = ${r.sigma}`,
        val: r.ess,
        show: fmt(r.ess, 0),
        cls: r === best ? "good" : "bad",
      })),
    },
    {
      t: "bars",
      label: "error in the posterior mean",
      v: runs.map((r) => ({
        k: `σ = ${r.sigma}`,
        val: Math.abs(r.mean - TRUE_MEAN),
        show: fmt(Math.abs(r.mean - TRUE_MEAN), 4),
        cls: r === best ? "good" : "bad",
      })),
    },
    {
      t: "note",
      text: "A high acceptance rate is not a good sign — it usually means the steps are too timid. The classic targets are ~44% for one parameter and ~23% in high dimensions, and ESS, not chain length, is what should be reported.",
      cls: "warn",
    }
  );

  return {
    id: "metropolis-hastings",
    title: "Metropolis–Hastings — proposing, accepting, and the σ that ruins everything",
    caption:
      "Random-walk Metropolis sampling a Beta(8, 4) posterior it is only allowed to see up to a constant. Step through the accept/reject decision — uphill moves always taken, downhill moves taken sometimes — and watch the chain climb out of the tail during burn-in. The final step runs three proposal scales against the same target: one accepts almost everything, one almost nothing, and both collapse the effective sample size for opposite reasons.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const mcmcTrace = build();
