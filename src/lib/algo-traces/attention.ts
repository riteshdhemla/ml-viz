import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Scaled dot-product attention on the exact 3-token, d_k = 2 example worked by
 * hand in `src/content/wiki/scaled-dot-product-attention.mdx` — so every number
 * the player shows can be checked against the prose above it.
 *
 * The epilogue re-runs row 1 at the magnitude typical of d_k = 64 to show the
 * softmax saturating, which is the reason the 1/sqrt(d_k) factor exists.
 */

const CODE = codeLines(`
def softmax(row):
    e = [exp(s) for s in row]
    return [x / sum(e) for x in e]

Q = [[2, 0], [0, 2], [2, 2]]     # one row per token
K = [[2, 0], [0, 2], [1, 1]]
V = [[1, 0], [0, 1], [10, 10]]
d_k = 2

# (i, j): how relevant is key j to query i?
scores  = [[dot(q, k) for k in K] for q in Q]
scaled  = [[s / sqrt(d_k) for s in row]
           for row in scores]
# each row becomes a distribution summing to 1
weights = [softmax(row) for row in scaled]
out     = [[sum(weights[i][j] * V[j][d]
                for j in range(n))
            for d in range(d_v)]
           for i in range(n)]
`);

const ln = lineFinder(CODE);

const Q = [
  [2, 0],
  [0, 2],
  [2, 2],
];
const K = [
  [2, 0],
  [0, 2],
  [1, 1],
];
const V = [
  [1, 0],
  [0, 1],
  [10, 10],
];
const D_K = 2;
const N = 3;
const TOKENS = ["t1", "t2", "t3"];

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const fmt = (x: number, d = 3) => x.toFixed(d);

function softmax(row: number[]): number[] {
  const e = row.map((s) => Math.exp(s));
  const z = e.reduce((s, x) => s + x, 0);
  return e.map((x) => x / z);
}

/** Mark a whole row of a matrix with one class. */
function rowCls(i: number, cols: number, cls: TraceCls): Record<string, TraceCls> {
  return Object.fromEntries(Array.from({ length: cols }, (_, j) => [`${i},${j}`, cls]));
}

const qkvPanels = (activeRow?: number): TraceComponent[] => [
  {
    t: "matrix",
    label: "Q (queries)",
    rows: TOKENS,
    cols: ["·0", "·1"],
    v: Q,
    digits: 0,
    cls: activeRow === undefined ? undefined : rowCls(activeRow, 2, "active"),
  },
  { t: "matrix", label: "K (keys)", rows: TOKENS, cols: ["·0", "·1"], v: K, digits: 0 },
  { t: "matrix", label: "V (values)", rows: TOKENS, cols: ["·0", "·1"], v: V, digits: 0 },
];

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    "Three tokens, d_k = 2, with Q, K and V given directly (in a real model these are learned linear projections of the token embeddings). Every token will end up rewritten as a weighted blend of all three value vectors.",
    [...ln("Q = [[2, 0]"), ...ln("V = [[1, 0]")],
    ...qkvPanels(),
    {
      t: "note",
      text: "Read each row as one token: q_i asks a question, k_j advertises what token j offers, v_j is what token j actually contributes if attended to.",
    }
  );

  // ---- step 1: scores ----------------------------------------------------
  const scores: number[][] = [];
  for (let i = 0; i < N; i++) {
    scores.push(K.map((k) => dot(Q[i], k)));
    const detail = K.map((k, j) => `q${i + 1}·k${j + 1} = ${fmt(dot(Q[i], k), 0)}`).join(",  ");
    push(
      `Row ${i + 1} of the score matrix: dot token ${i + 1}'s query with every key. ${detail}. A larger dot product means "this key is more aligned with what I am looking for".`,
      ln("scores  = [["),
      {
        t: "matrix",
        label: "scores = QKᵀ",
        rows: TOKENS,
        cols: TOKENS,
        v: [...scores, ...Array.from({ length: N - scores.length }, () => [NaN, NaN, NaN])],
        digits: 0,
        cls: rowCls(i, N, "active"),
      },
      ...qkvPanels(i)
    );
  }

  push(
    "The full score matrix. Token 1 matches key 1 strongly (4) and key 2 not at all (0); token 3's query is equidistant from all three keys (4, 4, 4), so it has no preference at all.",
    ln("scores  = [["),
    { t: "matrix", label: "scores = QKᵀ", rows: TOKENS, cols: TOKENS, v: scores, digits: 0, heat: true }
  );

  // ---- step 2: scale -----------------------------------------------------
  const scaled = scores.map((row) => row.map((s) => s / Math.sqrt(D_K)));
  push(
    `Divide every score by √d_k = √2 ≈ 1.414. Dot products of d_k independent unit-variance components have variance d_k, so their magnitude grows like √d_k — dividing it out keeps the scores in a range where softmax still has usable gradients, no matter how wide the head is.`,
    ln("scaled  = [["),
    { t: "matrix", label: "scaled = QKᵀ / √d_k", rows: TOKENS, cols: TOKENS, v: scaled, heat: true },
    { t: "matrix", label: "scores (before scaling)", rows: TOKENS, cols: TOKENS, v: scores, digits: 0 }
  );

  // ---- step 3: softmax ---------------------------------------------------
  const weights: number[][] = [];
  for (let i = 0; i < N; i++) {
    weights.push(softmax(scaled[i]));
    const exps = scaled[i].map((s) => Math.exp(s));
    const z = exps.reduce((s, x) => s + x, 0);
    push(
      i === N - 1
        ? `Row ${i + 1}: all three scaled scores are identical (${fmt(scaled[i][0])}), so softmax returns exactly uniform weights — token 3 attends equally to everything.`
        : `Row ${i + 1}: exponentiate (${exps.map((e) => fmt(e, 2)).join(", ")}), then divide by the sum ${fmt(z, 2)}. The row now sums to 1 — these are the attention weights.`,
      [...ln("weights = [softmax"), ...ln("return [x / sum(e)")],
      {
        t: "matrix",
        label: "weights = softmax(scaled)",
        rows: TOKENS,
        cols: TOKENS,
        v: [...weights, ...Array.from({ length: N - weights.length }, () => [NaN, NaN, NaN])],
        cls: rowCls(i, N, "active"),
      },
      {
        t: "bars",
        label: `token ${i + 1}'s attention distribution`,
        v: weights[i].map((w, j) => ({
          k: `→ ${TOKENS[j]}`,
          val: w,
          show: fmt(w),
          cls: w === Math.max(...weights[i]) ? "active" : "dim",
        })),
        max: 1,
      }
    );
  }

  // ---- step 4: weighted sum ---------------------------------------------
  const out: number[][] = [];
  for (let i = 0; i < N; i++) {
    out.push(V[0].map((_, d) => weights[i].reduce((s, w, j) => s + w * V[j][d], 0)));
    push(
      `Output row ${i + 1} = the weighted sum of the value vectors: ${weights[i]
        .map((w, j) => `${fmt(w, 2)}·[${V[j].join(", ")}]`)
        .join(" + ")} = [${out[i].map((x) => fmt(x)).join(", ")}].`,
      ln("out     = [["),
      {
        t: "matrix",
        label: "output",
        rows: TOKENS,
        cols: ["·0", "·1"],
        v: [...out, ...Array.from({ length: N - out.length }, () => [NaN, NaN])],
        cls: rowCls(i, 2, "active"),
      },
      {
        t: "bars",
        label: `weights used for token ${i + 1}`,
        v: weights[i].map((w, j) => ({ k: `v(${TOKENS[j]})`, val: w, show: fmt(w), cls: "dim" })),
        max: 1,
      }
    );
  }

  push(
    "Done. Token 1 attends mostly to itself (0.768) yet its output is pulled well above v1 = [1, 0] — token 3's large value vector leaks in through a weight of only 0.187. Token 3, attending uniformly, gets the plain average of all values.",
    ln("out     = [["),
    { t: "matrix", label: "output = weights · V", rows: TOKENS, cols: ["·0", "·1"], v: out, heat: true },
    { t: "matrix", label: "weights", rows: TOKENS, cols: TOKENS, v: weights, heat: true },
    {
      t: "note",
      text: "A large value vector influences the output even at a small attention weight — attention weights alone do not tell you what drove an output.",
      cls: "warn",
    }
  );

  // ---- epilogue: why the scale factor is not optional ---------------------
  const bigK = 64;
  const inflate = Math.sqrt(bigK) / Math.sqrt(D_K); // typical magnitude growth
  const unscaledRow = scores[0].map((s) => s * inflate);
  const saturated = softmax(unscaledRow);
  push(
    `Why the √d_k is not cosmetic: at d_k = ${bigK} the same geometry produces scores about ${fmt(inflate, 1)}× larger. Feed those into softmax *without* scaling and row 1 collapses to ${fmt(saturated[0], 4)} on one entry — a hard lookup whose gradient is essentially zero, so the head stops learning. Scaling puts the row back where softmax is still soft.`,
    ln("scaled  = [["),
    {
      t: "bars",
      label: `unscaled at d_k = ${bigK} → saturated`,
      v: saturated.map((w, j) => ({
        k: `→ ${TOKENS[j]}`,
        val: w,
        show: w < 0.001 ? w.toExponential(1) : fmt(w, 4),
        cls: j === 0 ? "bad" : "dim",
      })),
      max: 1,
    },
    {
      t: "bars",
      label: "scaled (what the code actually computes)",
      v: weights[0].map((w, j) => ({ k: `→ ${TOKENS[j]}`, val: w, show: fmt(w), cls: j === 0 ? "good" : "dim" })),
      max: 1,
    },
    {
      t: "note",
      text: "Same attention pattern, same relative ordering — but one distribution can still be learned from and the other cannot.",
      cls: "good",
    }
  );

  return {
    id: "scaled-dot-product-attention",
    title: "Scaled dot-product attention — one pass, matrix by matrix",
    caption:
      "The four steps of softmax(QKᵀ/√d_k)·V on three tokens with d_k = 2, in the same numbers as the hand-worked example above: score every query against every key, scale, softmax each row into a distribution, then blend the value vectors. The last step shows what the same row looks like at d_k = 64 without the scale factor — softmax saturates and the gradient vanishes.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const attentionTrace = build();
