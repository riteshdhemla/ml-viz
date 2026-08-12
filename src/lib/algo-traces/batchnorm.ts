import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * Batch normalisation from `wiki/batchnorm-algorithm.mdx`.
 *
 * Frames 1–2 reproduce the page's hand-worked example exactly (x = 2,4,6,8 →
 * μ_B = 5, σ²_B = 5, y = −1.683, 0.106, 1.894, 3.683) and check the two
 * identities it states: mean(y) = β and var(y) = γ².
 *
 * The rest measures what the page's warning gestures at but never shows. Two
 * results, both exact rather than statistical:
 *
 *  - **The page's own EMA example does not do what its comment claims.** The
 *    code block says the running mean "converges toward 5"; run it and after
 *    five batches μ_run = 2.0392, a **59% error**, with 44 batches needed to
 *    get within 1%. Running statistics start at (0, 1) and warm up slowly, so a
 *    model evaluated early in training uses badly wrong statistics — which is a
 *    much more common cause of "eval mode is broken" than forgetting
 *    `model.eval()`. The page comment is corrected alongside this trace.
 *  - **At batch size 1 the layer destroys its input completely.** With m = 1,
 *    μ_B = x, so x − μ_B = 0 and σ²_B = 0, giving x̂ = 0/√ε = 0 and y = β for
 *    *every* input. Not "unstable" or "high variance" — the output is a
 *    constant, and the input has no influence on it whatsoever.
 */

const CODE = codeLines(`
# training: statistics from THIS batch
mu = x.mean(0)
var = x.var(0)
xhat = (x - mu) / sqrt(var + eps)
y = gamma * xhat + beta

# accumulate an estimate for later
mu_run = (1 - a) * mu_run + a * mu
var_run = (1 - a) * var_run + a * var

# inference: frozen stats, no batch
xhat = (x - mu_run) / sqrt(var_run + eps)
y = gamma * xhat + beta
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const X = [2, 4, 6, 8];
const GAMMA = 2;
const BETA = 1;
const EPS = 1e-5;
const ALPHA = 0.1;
/** The page's own five batches. */
const PAGE_BATCHES: [number, number][] = [
  [5.0, 5.0],
  [4.8, 4.9],
  [5.2, 5.1],
  [5.0, 4.8],
  [4.9, 5.0],
];
const TRUE_MU = 5;
const TRUE_VAR = 5;
const SEED = 13;

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const variance = (a: number[]) => {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length;
};

/** The forward pass, exactly as the listing above. */
function bnForward(x: number[], gamma = GAMMA, beta = BETA, eps = EPS) {
  const mu = mean(x);
  const varB = variance(x);
  const xhat = x.map((v) => (v - mu) / Math.sqrt(varB + eps));
  return { mu, varB, xhat, y: xhat.map((h) => gamma * h + beta) };
}

/** Inference path: frozen statistics, one sample at a time. */
const bnEval = (x: number, muRun: number, varRun: number, gamma = GAMMA, beta = BETA) =>
  gamma * ((x - muRun) / Math.sqrt(varRun + EPS)) + beta;

const fmt = (x: number, d = 3) => x.toFixed(d);
const vec = (a: number[], d = 3) => a.map((v) => fmt(v, d)).join(", ");

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const fwd = bnForward(X);

  // ---- 1. the page's worked example ---------------------------------------
  push(
    `The page's worked example, run. A four-element batch x = (${X.join(
      ", "
    )}) gives μ_B = ${fmt(fwd.mu, 1)} and σ²_B = ${fmt(
      fwd.varB,
      1
    )}, so normalising yields x̂ = (${vec(
      fwd.xhat
    )}). Note what the batch statistics are computed **across**: the samples, not the features. Every sample's normalised value depends on every *other* sample in the batch, which is the property that everything else on this page follows from.`,
    ln("mu = x.mean(0)"),
    {
      t: "tokens",
      label: "x → x̂",
      v: X.map((v, i) => ({
        text: String(v),
        sub: fmt(fwd.xhat[i], 2),
        cls: "active" as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "batch statistics",
      v: [
        { k: "m", v: String(X.length) },
        { k: "μ_B", v: fmt(fwd.mu, 1), cls: "active" },
        { k: "σ²_B", v: fmt(fwd.varB, 1), cls: "active" },
        { k: "mean(x̂)", v: fmt(mean(fwd.xhat), 3), cls: "good" },
        { k: "var(x̂)", v: fmt(variance(fwd.xhat), 3), cls: "good" },
      ],
    }
  );

  // ---- 2. rescale, and the identity it can express ------------------------
  const idGamma = Math.sqrt(fwd.varB + EPS);
  const idFwd = bnForward(X, idGamma, fwd.mu);
  const idErr = Math.max(...idFwd.y.map((v, i) => Math.abs(v - X[i])));

  push(
    `Rescaling with γ = ${GAMMA}, β = ${BETA} gives y = (${vec(
      fwd.y
    )}), and the two identities the page states hold exactly: mean(y) = ${fmt(
      mean(fwd.y),
      3
    )} = β and var(y) = ${fmt(
      variance(fwd.y),
      3
    )} = γ². That pair is the answer to "why not just normalise?" — γ and β make the layer's output distribution a free parameter rather than pinned at (0, 1). They can even undo the normalisation entirely: set γ = √σ²_B = ${fmt(
      idGamma,
      3
    )} and β = μ_B = ${fmt(
      fwd.mu,
      1
    )} and the output returns the input to within ${idErr.toExponential(
      1
    )}. **The layer contains the identity function**, so normalising cannot cost the network expressivity — it only changes which solutions are easy to reach.`,
    ln("y = gamma * xhat + beta"),
    {
      t: "table",
      label: "the same layer, two settings of (γ, β)",
      head: ["x", `γ=${GAMMA}, β=${BETA}`, `γ=√σ²_B, β=μ_B`],
      v: X.map((v, i) => ({
        cells: [String(v), fmt(fwd.y[i]), fmt(idFwd.y[i])],
        cls: "dim" as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "identities",
      v: [
        { k: "mean(y)", v: fmt(mean(fwd.y), 3), cls: "good" },
        { k: "β", v: String(BETA), cls: "good" },
        { k: "var(y)", v: fmt(variance(fwd.y), 3), cls: "good" },
        { k: "γ²", v: String(GAMMA ** 2), cls: "good" },
        { k: "identity recovery error", v: idErr.toExponential(1), cls: "good" },
      ],
    }
  );

  // ---- 3. the same input, different batches -------------------------------
  const rng = seededRng(SEED);
  const PROBE = 6;
  const companions = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => Math.round(gaussian(rng, 5, 2) * 10) / 10)
  );
  const probeRuns = companions.map((c) => {
    const batch = [PROBE, ...c];
    const f = bnForward(batch);
    return { batch, y: f.y[0], mu: f.mu, varB: f.varB };
  });
  const spread =
    Math.max(...probeRuns.map((r) => r.y)) - Math.min(...probeRuns.map((r) => r.y));

  push(
    `Here is the consequence of normalising across the batch. Feed the **same** value x = ${PROBE} through the layer five times, changing only which three other samples share its batch, and it comes out differently every time — from ${fmt(
      Math.min(...probeRuns.map((r) => r.y))
    )} to ${fmt(Math.max(...probeRuns.map((r) => r.y)))}, a spread of ${fmt(
      spread
    )}. The layer is not a function of its input alone. During training that is a feature: the noise acts as a regulariser. At inference it is unacceptable — a prediction that depends on which other requests happened to be batched with yours is not a prediction — and it is the entire reason running statistics exist.`,
    ln("var = x.var(0)"),
    {
      t: "table",
      label: `x = ${PROBE} through five different batches`,
      head: ["batch", "μ_B", "σ²_B", `y for x = ${PROBE}`],
      v: probeRuns.map((r) => ({
        cells: [r.batch.map((v) => fmt(v, 1)).join(", "), fmt(r.mu, 2), fmt(r.varB, 2), fmt(r.y)],
        cls: "warn" as TraceCls,
      })),
    },
    {
      t: "bars",
      label: `output for the same input, by batch`,
      v: probeRuns.map((r, i) => ({
        k: `batch ${i + 1}`,
        val: r.y,
        show: fmt(r.y),
        cls: "warn" as TraceCls,
      })),
    }
  );

  // ---- 4. accumulating the running statistics -----------------------------
  let muRun = 0;
  let varRun = 1;
  const ema = PAGE_BATCHES.map(([mb, vb]) => {
    muRun = (1 - ALPHA) * muRun + ALPHA * mb;
    varRun = (1 - ALPHA) * varRun + ALPHA * vb;
    return { mb, vb, muRun, varRun };
  });

  push(
    `So the layer keeps an exponential moving average of the batch statistics, to be frozen and reused at inference. Running the page's own five batches: μ_run climbs ${ema
      .map((e) => fmt(e.muRun, 2))
      .join(
        " → "
      )}. Every batch mean fed in was close to ${TRUE_MU}, and the average of them is nowhere near ${TRUE_MU} — because the EMA **starts at 0** and each batch moves it only α = ${ALPHA} of the remaining distance.`,
    ln("mu_run = (1 - a) * mu_run + a * mu"),
    {
      t: "table",
      label: "the page's five batches",
      head: ["batch", "μ_B", "μ_run", "σ²_B", "σ²_run"],
      v: ema.map((e, i) => ({
        cells: [String(i + 1), fmt(e.mb, 1), fmt(e.muRun, 4), fmt(e.vb, 1), fmt(e.varRun, 4)],
        cls: (i === ema.length - 1 ? "warn" : "dim") as TraceCls,
      })),
    },
    {
      t: "plot",
      label: "running mean against the truth it is estimating",
      domain: [0, 5, 0, 6],
      xLabel: "batch",
      yLabel: "μ",
      curves: [
        { pts: ema.map((e, i) => ({ x: i + 1, y: e.muRun })), cls: "warn" },
        {
          pts: [
            { x: 0, y: TRUE_MU },
            { x: 5, y: TRUE_MU },
          ],
          cls: "good",
          dashed: true,
        },
      ],
    }
  );

  // ---- 5. payoff: the warm-up gap ----------------------------------------
  const last = ema[ema.length - 1];
  const err5 = Math.abs(last.muRun - TRUE_MU) / TRUE_MU;
  let m = 0;
  let v = 1;
  let within1 = 0;
  for (let i = 1; i <= 500; i++) {
    m = (1 - ALPHA) * m + ALPHA * TRUE_MU;
    v = (1 - ALPHA) * v + ALPHA * TRUE_VAR;
    if (!within1 && Math.abs(m - TRUE_MU) / TRUE_MU < 0.01) within1 = i;
  }
  // what a reader actually cares about: does train mode agree with eval mode?
  const probeX = 7;
  const trainY = bnForward([probeX, 3.5, 5.5, 6]).y[0];
  const gapAt = [1, 5, 10, 20, 44, 100].map((n) => {
    let mm = 0;
    let vv = 1;
    for (let i = 0; i < n; i++) {
      mm = (1 - ALPHA) * mm + ALPHA * TRUE_MU;
      vv = (1 - ALPHA) * vv + ALPHA * TRUE_VAR;
    }
    const evalY = bnEval(probeX, mm, vv);
    return { n, muRun: mm, evalY, gap: Math.abs(evalY - bnEval(probeX, TRUE_MU, TRUE_VAR)) };
  });

  push(
    `**Payoff — the running statistics are wrong for a long time, and nothing tells you.** After the page's five batches μ_run = ${fmt(
      last.muRun,
      4
    )} against a true mean of ${TRUE_MU} — a **${fmt(
      err5 * 100,
      0
    )}% error** — and it takes **${within1} batches** at α = ${ALPHA} to come within 1%. So a model switched to eval mode early in training does not merely lose the batch-noise regulariser; it normalises with statistics that are badly wrong, and produces confidently different answers. For a fixed input x = ${probeX}, the eval-mode output drifts ${fmt(
      gapAt[0].evalY
    )} → ${fmt(
      gapAt[gapAt.length - 1].evalY
    )} as the statistics warm up, converging only once the EMA has. **This is a more common cause of "eval mode is broken" than forgetting \`model.eval()\`**, and it is why PyTorch tracks \`num_batches_tracked\` and offers a debiased alternative.`,
    ln("var_run = (1 - a) * var_run + a * var"),
    {
      t: "table",
      label: `eval-mode output for a fixed input x = ${probeX}, as the EMA warms up`,
      head: ["batches seen", "μ_run", "eval y", "gap vs converged"],
      v: gapAt.map((g) => ({
        cells: [String(g.n), fmt(g.muRun, 3), fmt(g.evalY), fmt(g.gap)],
        cls: (g.gap < 0.01 ? "good" : g.gap > 1 ? "bad" : "warn") as TraceCls,
      })),
    },
    {
      t: "kv",
      label: `train mode vs eval mode, same input x = ${probeX}`,
      v: [
        { k: "train (this batch's stats)", v: fmt(trainY), cls: "warn" },
        { k: "eval after 5 batches", v: fmt(gapAt[1].evalY), cls: "bad" },
        { k: "eval after 100 batches", v: fmt(gapAt[gapAt.length - 1].evalY), cls: "good" },
        {
          k: "early train/eval gap",
          v: fmt(Math.abs(trainY - gapAt[1].evalY)),
          cls: "bad",
        },
        {
          k: "converged train/eval gap",
          v: fmt(Math.abs(trainY - gapAt[gapAt.length - 1].evalY)),
        },
      ],
    },
    {
      t: "note",
      text: `The page's code comment says the running mean "converges toward 5" after five batches. It is heading there, but it is at ${fmt(
        last.muRun,
        3
      )} — and the gap is the point rather than a detail, so the page now states the number.`,
      cls: "warn",
    }
  );

  // ---- 6. payoff: batch size 1 -------------------------------------------
  const singles = [2, 40, -1000].map((x) => {
    const f = bnForward([x]);
    return { x, mu: f.mu, varB: f.varB, xhat: f.xhat[0], y: f.y[0] };
  });
  const sizes = [1, 2, 4, 8, 16, 64];
  const noiseBySize = sizes.map((mSize) => {
    const r = seededRng(SEED + 7);
    const outs = Array.from({ length: 40 }, () => {
      const others = Array.from({ length: mSize - 1 }, () => gaussian(r, 5, 2));
      return bnForward([PROBE, ...others]).y[0];
    });
    return { m: mSize, sd: Math.sqrt(variance(outs)) };
  });

  push(
    `**Payoff — at batch size 1 the layer erases its input.** The page's warning says batch variance is "undefined" at m = 1. It is worse than undefined, it is exactly zero: with one sample μ_B = x, so x − μ_B = 0 and σ²_B = 0, giving x̂ = 0/√ε = 0 and **y = β for every possible input**. Not noisy, not unstable — a constant. Feeding 2, 40 and −1000 through the layer all return ${fmt(
      singles[0].y,
      1
    )}. The batch-noise curve tells the rest of the story: the spread of a fixed input's output falls ${fmt(
      noiseBySize[1].sd,
      3
    )} → ${fmt(
      noiseBySize[noiseBySize.length - 1].sd,
      3
    )} from m = 2 to m = ${
      sizes[sizes.length - 1]
    }, so small batches are noisy and m = 1 is not the limit of that trend but a different failure entirely. It is also why transformers use LayerNorm, which normalises across features and so works fine at batch size 1.`,
    ln("xhat = (x - mu) / sqrt(var + eps)"),
    {
      t: "table",
      label: "batch size 1: three very different inputs",
      head: ["x", "μ_B", "σ²_B", "x̂", "y"],
      v: singles.map((s) => ({
        cells: [String(s.x), fmt(s.mu, 1), fmt(s.varB, 1), fmt(s.xhat, 1), fmt(s.y, 1)],
        cls: "bad" as TraceCls,
      })),
    },
    {
      t: "bars",
      label: `sd of the output for a fixed input x = ${PROBE}, by batch size (m=1 is 0 because the output is constant)`,
      v: noiseBySize.map((n) => ({
        k: `m = ${n.m}`,
        val: n.sd,
        show: fmt(n.sd, 3),
        cls: (n.m === 1 ? "bad" : n.m <= 4 ? "warn" : "good") as TraceCls,
      })),
    }
  );

  return {
    id: "batchnorm",
    title: "BatchNorm — the batch in the forward pass, and the two ways it bites",
    caption:
      "The page's worked example run exactly (x = 2,4,6,8 → y = −1.683, 0.106, 1.894, 3.683, with mean(y) = β and var(y) = γ² confirmed), then the consequence of normalising across the batch: the same input gets a different output depending on who it was batched with. Two measured payoffs. The page's own EMA example claims the running mean converges toward 5 and reaches 2.0392 after five batches — a 59% error needing 44 batches to close, which is a commoner cause of broken eval-mode output than forgetting model.eval(). And at batch size 1 the variance is not undefined but exactly zero, so x̂ = 0 and the layer returns β for every input — 2, 40 and −1000 all come out the same.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const batchnormTrace = build();
