import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * AdaBoost on a 10-point 1-D dataset whose best single stump misclassifies
 * exactly two points — so round 1 reproduces the ε = 0.2, α = 0.693 worked by
 * hand in `src/content/wiki/adaboost-algorithm.mdx`.
 *
 * The payoff is the point of boosting: no depth-1 stump can classify this data
 * (the labels are not monotone in x), yet the weighted vote of three of them
 * gets every point right.
 */

const CODE = codeLines(`
def adaboost(X, y, rounds):
    w = [1 / n] * n
    model = []
    for _ in range(rounds):
        h = best_stump(X, y, w)   # weighted fit
        err = sum(w[i] for i in range(n)
                  if h(X[i]) != y[i])
        alpha = 0.5 * log((1 - err) / err)
        # wrong -> weight grows, right -> shrinks
        w = [w[i] * exp(-alpha * y[i] * h(X[i]))
             for i in range(n)]
        w = [wi / sum(w) for wi in w]
        model.append((alpha, h))
    return model

def predict(model, x):
    return sign(sum(a * h(x) for a, h in model))
`);

const ln = lineFinder(CODE);

const XS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const YS = [1, 1, 1, 1, 1, -1, -1, -1, 1, 1];
const n = XS.length;
const ROUNDS = 3;
const DOMAIN: [number, number, number, number] = [0, 11, -1.6, 1.6];

const fmt = (x: number, d = 4) => x.toFixed(d);

/** A decision stump: predict `polarity` above the threshold, −polarity below. */
interface Stump {
  t: number;
  polarity: 1 | -1;
}

const apply = (h: Stump, x: number) => (x > h.t ? h.polarity : (-h.polarity as 1 | -1));

const stumpLabel = (h: Stump) =>
  h.polarity === 1 ? `+1 if x > ${h.t}` : `+1 if x < ${h.t}`;

/** Exhaustive weighted stump search — the weak learner. */
function bestStump(w: number[]): { h: Stump; err: number } {
  let best: { h: Stump; err: number } | null = null;
  for (let i = 0; i <= n; i++) {
    const t = i === 0 ? 0.5 : i === n ? n + 0.5 : (XS[i - 1] + XS[i]) / 2;
    for (const polarity of [1, -1] as const) {
      const h: Stump = { t, polarity };
      const err = XS.reduce((s, x, k) => s + (apply(h, x) !== YS[k] ? w[k] : 0), 0);
      if (!best || err < best.err - 1e-12) best = { h, err };
    }
  }
  return best!;
}

function dataPlot(
  label: string,
  w: number[],
  h?: Stump,
  wrong: number[] = []
): TraceComponent {
  const maxW = Math.max(...w);
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    xLabel: "x  (dot size not shown — weight is in the bars below)",
    segments: h
      ? [{ x1: h.t, y1: -1.6, x2: h.t, y2: 1.6, cls: "active" as TraceCls, dashed: true }]
      : undefined,
    points: XS.map((x, i) => ({
      x,
      y: YS[i],
      id: w[i] > maxW * 0.7 ? fmt(w[i], 2) : undefined,
      cls: (wrong.includes(i) ? "bad" : YS[i] === 1 ? "good" : "warn") as TraceCls,
      shape: (wrong.includes(i) ? "ring" : "dot") as "ring" | "dot",
    })),
  };
}

const weightBars = (w: number[], wrong: number[] = []): TraceComponent => ({
  t: "bars",
  label: "sample weights",
  v: XS.map((x, i) => ({
    k: `x=${x} (y=${YS[i] > 0 ? "+" : "−"})`,
    val: w[i],
    show: fmt(w[i], 3),
    cls: wrong.includes(i) ? "bad" : "dim",
  })),
  max: 0.3,
});

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  let w = XS.map(() => 1 / n);
  const model: { alpha: number; h: Stump }[] = [];

  push(
    `Ten points on a line. The labels are +1, then −1 in the middle, then +1 again — deliberately not monotone in x, which means **no single decision stump can get them all right**. A stump is a threshold and a direction; this data needs two boundaries. All weights start equal at 1/${n} = ${fmt(1 / n, 1)}.`,
    ln("w = [1 / n] * n"),
    dataPlot("the dataset", w),
    weightBars(w)
  );

  for (let round = 0; round < ROUNDS; round++) {
    const { h, err } = bestStump(w);
    const wrong = XS.map((x, i) => (apply(h, x) !== YS[i] ? i : -1)).filter((i) => i >= 0);

    push(
      `Round ${round + 1}: fit the best stump against the current weights. "${stumpLabel(h)}" gets the weighted error ε = ${fmt(err)} by missing ${wrong.length} point${wrong.length === 1 ? "" : "s"} (x = ${wrong.map((i) => XS[i]).join(", ")}). ${
        round === 0
          ? "That is the best any stump can do on this data — the middle block and the right block cannot both be captured by one threshold."
          : "Note which points it now targets: the re-weighting from the previous round is what steered it here."
      }`,
      ln("h = best_stump(X, y, w)"),
      dataPlot(`round ${round + 1} — stump at x = ${h.t}`, w, h, wrong),
      weightBars(w, wrong),
      {
        t: "kv",
        label: "this stump",
        v: [
          { k: "rule", v: stumpLabel(h), cls: "active" },
          { k: "ε", v: fmt(err), cls: err < 0.5 ? "good" : "bad" },
          { k: "misses", v: String(wrong.length) },
        ],
      }
    );

    const alpha = 0.5 * Math.log((1 - err) / err);
    push(
      `α = ½·ln((1 − ε)/ε) = ½·ln(${fmt((1 - err) / err, 3)}) = ${fmt(alpha)}. This is not a heuristic — it is the exact minimizer of the exponential loss once the stump is fixed. A stump at ε = 0.5 would get α = 0, contributing nothing; a perfect stump would get α = ∞ and dominate the vote.`,
      ln("alpha = 0.5 * log((1 - err) / err)"),
      dataPlot(`round ${round + 1}`, w, h, wrong),
      {
        t: "kv",
        label: "model weight",
        v: [
          { k: "ε", v: fmt(err) },
          { k: "(1−ε)/ε", v: fmt((1 - err) / err, 3) },
          { k: "α", v: fmt(alpha), cls: "good" },
        ],
      }
    );

    const raw = w.map((wi, i) => wi * Math.exp(-alpha * YS[i] * apply(h, XS[i])));
    const z = raw.reduce((s, v) => s + v, 0);
    const next = raw.map((v) => v / z);

    push(
      `Re-weight: w ← w·exp(−α·y·h(x)), then normalize. Correctly-classified points have y·h = +1 so their weight is multiplied by e^(−${fmt(alpha, 3)}) = ${fmt(Math.exp(-alpha), 3)}; the misses have y·h = −1 and get multiplied by ${fmt(Math.exp(alpha), 3)}. After normalizing, the ${wrong.length} missed point${wrong.length === 1 ? " carries" : "s carry"} ${fmt(wrong.reduce((s, i) => s + next[i], 0) * 100, 1)}% of the total weight — the next stump cannot afford to ignore them.`,
      [...ln("w = [w[i] * exp(-alpha"), ...ln("w = [wi / sum(w) for wi in w]")],
      dataPlot(`weights after round ${round + 1}`, next, h, wrong),
      weightBars(next, wrong),
      {
        t: "note",
        text:
          round === 0
            ? "This is the entire idea of boosting: the next learner is trained on a re-shaped version of the same data, where the previous learner's mistakes matter most."
            : "Weight mass keeps moving to whatever the ensemble still gets wrong.",
      }
    );

    model.push({ alpha, h });
    w = next;
  }

  // ---- payoff: the ensemble beats every one of its members ----------------
  const margin = XS.map((x) => model.reduce((s, m) => s + m.alpha * apply(m.h, x), 0));
  const ensembleWrong = margin.map((m, i) => (Math.sign(m) !== YS[i] ? i : -1)).filter((i) => i >= 0);
  const stumpErrors = model.map(
    (m) => XS.filter((x, i) => apply(m.h, x) !== YS[i]).length
  );

  push(
    `Now vote: sign(Σ α_b·h_b(x)). Individually the three stumps get ${stumpErrors.join(", ")} points wrong respectively — every one of them fails somewhere, and no threshold could do better. Their weighted sum gets ${ensembleWrong.length === 0 ? "**every point right**" : `${ensembleWrong.length} wrong`}. Nothing about any individual stump improved — what changed is that each was fitted to a different re-weighting of the data, so their errors do not coincide, and a weighted vote can cancel them out.`,
    ln("return sign(sum(a * h(x) for a, h in model))"),
    {
      t: "bars",
      label: "ensemble margin  y·Σα·h(x)  (positive = correct)",
      v: XS.map((x, i) => ({
        k: `x=${x} (y=${YS[i] > 0 ? "+" : "−"})`,
        val: margin[i] * YS[i],
        show: fmt(margin[i] * YS[i], 2),
        cls: Math.sign(margin[i]) === YS[i] ? "good" : "bad",
      })),
    },
    {
      t: "table",
      label: "the committee",
      head: ["round", "rule", "α", "errors alone"],
      v: model.map((m, i) => ({
        cells: [String(i + 1), stumpLabel(m.h), fmt(m.alpha, 3), `${stumpErrors[i]}/10`],
        cls: "dim",
      })),
    },
    {
      t: "note",
      text: "Weak learners only have to beat chance. AdaBoost's guarantee is that training error falls exponentially in the number of rounds as long as every ε stays below 0.5 — which is also why an ε above 0.5 produces a negative α and simply inverts that learner's vote.",
      cls: "good",
    }
  );

  return {
    id: "adaboost-rounds",
    title: "AdaBoost — re-weight, refit, and vote",
    caption:
      "Three rounds of AdaBoost on ten points whose labels no single decision stump can capture. Round 1 reproduces the hand-worked ε = 0.2 and α = 0.693 above; watch the sample weights after it, where the two missed points jump to half the total mass and steer the next stump. The final step votes the three stumps together and gets every point right — none of them could alone.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const adaboostTrace = build();
