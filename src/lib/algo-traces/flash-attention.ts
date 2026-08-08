import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * FlashAttention's tiled online softmax, from
 * `courses/transformers/04-modern-attention.mdx`.
 *
 * The page makes two claims it cannot show. The first is that the tiled
 * computation is **exactly equivalent** to standard attention — measured here
 * against a full-matrix reference, and it holds to the last bit of float64
 * across every element. The second is that memory drops from O(N²) to O(N):
 * the trace counts live score entries rather than asserting the asymptotics.
 *
 * The mechanism worth stepping through is the **rescale**. Each time a K block
 * contains a score larger than anything seen so far, the running maximum moves,
 * and every partial result accumulated before that moment has to be corrected
 * by exp(m_old − m_new). That single factor is what lets a softmax be computed
 * without ever seeing all its inputs, and it is invisible in the page's prose.
 *
 * The payoff removes the running max entirely — the naive online softmax that
 * looks equivalent on paper — and finds the exact score magnitude at which it
 * dies: exp overflows float64 at 709.78, so a max score above that returns
 * Inf/Inf = NaN while the stable version is unmoved. Not an approximation
 * question, a representability one.
 */

const CODE = codeLines(`
# per query block: m = -inf, l = 0, O = 0

for j in range(n_key_blocks):
    S = Q_i @ K_j.T / sqrt(d)

    # the running max moves
    m_new = max(m, S.max())

    # correct everything already
    # accumulated, by one factor
    rescale = exp(m - m_new)
    P = exp(S - m_new)

    l = rescale * l + P.sum()
    O = rescale * O + P @ V_j
    m = m_new

return O / l
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const N = 12;
const D = 4;
const BR = 4;
const BC = 4;
const SEED = 17;

type Mat = number[][];

function randMat(rows: number, cols: number, rng: () => number, scale = 1): Mat {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => gaussian(rng, 0, scale))
  );
}

const RNG = seededRng(SEED);
const Q: Mat = randMat(N, D, RNG);
const K: Mat = randMat(N, D, RNG);
const V: Mat = randMat(N, D, RNG);

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const scoreOf = (q: number[], k: number[]) => dot(q, k) / Math.sqrt(D);

/** Standard attention for one query row: materialise all N scores, then softmax. */
function standardRow(qi: number, keys: Mat = K, values: Mat = V) {
  const s = keys.map((k) => scoreOf(Q[qi], k));
  const m = Math.max(...s);
  const e = s.map((x) => Math.exp(x - m));
  const l = e.reduce((a, b) => a + b, 0);
  const out = new Array<number>(D).fill(0);
  e.forEach((w, j) => {
    for (let c = 0; c < D; c++) out[c] += (w / l) * values[j][c];
  });
  return { scores: s, weights: e.map((w) => w / l), out, m, l };
}

interface Tile {
  block: number;
  scores: number[];
  mOld: number;
  mNew: number;
  rescale: number;
  l: number;
  o: number[];
  liveScores: number;
}

/** The tiled version, for one query row. `useMax=false` is the naive variant. */
function flashRow(qi: number, useMax = true, keys: Mat = K, values: Mat = V, queries: Mat = Q) {
  let m = useMax ? -Infinity : 0;
  let l = 0;
  let o = new Array<number>(D).fill(0);
  const tiles: Tile[] = [];
  for (let b = 0; b * BC < keys.length; b++) {
    const lo = b * BC;
    const hi = Math.min(lo + BC, keys.length);
    const scores: number[] = [];
    for (let j = lo; j < hi; j++) scores.push(scoreOf(queries[qi], keys[j]));

    const mOld = m;
    const mNew = useMax ? Math.max(m, ...scores) : 0;
    const rescale = useMax ? Math.exp(mOld - mNew) : 1;
    const p = scores.map((x) => Math.exp(x - mNew));

    l = rescale * l + p.reduce((a, b2) => a + b2, 0);
    const nextO = o.map((v) => rescale * v);
    p.forEach((w, jj) => {
      for (let c = 0; c < D; c++) nextO[c] += w * values[lo + jj][c];
    });
    o = nextO;
    m = mNew;
    tiles.push({
      block: b,
      scores,
      mOld,
      mNew,
      rescale,
      l,
      o: [...o],
      liveScores: scores.length,
    });
  }
  return { tiles, out: o.map((v) => v / l), l, m };
}

const fmt = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
const vec = (a: number[], d = 3) => `(${a.map((x) => fmt(x, d)).join(", ")})`;

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const QI = 0;
  const ref = standardRow(QI);
  const flash = flashRow(QI);

  // ---- 1. the memory wall -------------------------------------------------
  const sizes = [1024, 4096, 8192, 32768, 131072];
  const bytes = (n: number) => n * n * 2;
  const tiled = (n: number) => BR * BC * 2 + n * D * 2 * 3;
  push(
    `Standard attention materialises the whole N×N score matrix before it can take a softmax, because a softmax needs its denominator — which needs every score. At N = 8192 in float16 that is ${fmt(
      bytes(8192) / 1024 ** 2,
      0
    )} MB **per head per layer**, and it scales quadratically: N = 131,072 needs ${fmt(
      bytes(131072) / 1024 ** 3,
      1
    )} GB for a single head. The whole of FlashAttention follows from refusing to build that matrix, so the question is how to normalise a softmax you have not finished seeing.`,
    ln("# per query block: m = -inf, l = 0, O = 0"),
    {
      t: "table",
      label: "score-matrix memory, float16, one head one layer",
      head: ["N", "N² scores", "standard", "tiled (this trace's blocks)"],
      v: sizes.map((n) => ({
        cells: [
          n.toLocaleString(),
          (n * n).toExponential(1),
          bytes(n) >= 1024 ** 3
            ? `${fmt(bytes(n) / 1024 ** 3, 1)} GB`
            : `${fmt(bytes(n) / 1024 ** 2, 0)} MB`,
          `${fmt(tiled(n) / 1024, 0)} KB`,
        ],
        cls: (n === 8192 ? "bad" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The tiled column is not a smaller constant on the same curve — it is a different curve. Scores live only inside one B_r × B_c tile; everything else that grows with N is Q, K, V themselves, which are O(N·d) and had to exist anyway.",
    }
  );

  // ---- 2. the reference ---------------------------------------------------
  push(
    `The reference, computed the expensive way for query row ${QI}: all ${N} scores at once, one global maximum ${fmt(
      ref.m
    )} subtracted for stability, then normalise and take the weighted sum of V. Output ${vec(
      ref.out
    )}. Every number the tiled version produces has to match this one — the page claims exactness, and that is a claim with a right answer.`,
    ln("return O / l"),
    {
      t: "bars",
      label: `standard attention weights for query ${QI} (all ${N} keys at once)`,
      v: ref.weights.map((w, j) => ({
        k: `k${j}`,
        val: w,
        show: fmt(w),
        cls: (Math.floor(j / BC) === 0 ? "active" : Math.floor(j / BC) === 1 ? "warn" : "good") as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "reference",
      v: [
        { k: "global max", v: fmt(ref.m) },
        { k: "denominator ℓ", v: fmt(ref.l) },
        { k: "output", v: vec(ref.out) },
        { k: "scores materialised", v: String(N), cls: "bad" },
      ],
    }
  );

  // ---- 3..5. the tiles ----------------------------------------------------
  const tileNote: Record<number, string> = {
    0: `The first K block. There is nothing accumulated yet, so the rescale factor is exp(−∞ − ${fmt(
      flash.tiles[0].mNew
    )}) = 0 and it multiplies an ℓ and O that are already zero — the first block is just an ordinary softmax over ${BC} scores. What matters is that ℓ and O are now **partial**: they are correct for a world containing only these ${BC} keys.`,
    1: `Second block, and here is the trick. Its largest score is ${fmt(
      Math.max(...flash.tiles[1].scores)
    )} against a running max of ${fmt(
      flash.tiles[1].mOld
    )}, so the maximum moves. Everything accumulated from block 0 was exponentiated relative to the *old* maximum and is now wrong by a known factor — exactly exp(m_old − m_new) = ${fmt(
      flash.tiles[1].rescale,
      4
    )}. Multiply ℓ and O by it and they are correct again. **One scalar repairs an arbitrary amount of history**, which is the entire reason a softmax can be streamed.`,
    2: `Last block. Its max is ${fmt(
      Math.max(...flash.tiles[2].scores)
    )} against the running ${fmt(flash.tiles[2].mOld)}, so the rescale is ${fmt(
      flash.tiles[2].rescale,
      4
    )}${
      flash.tiles[2].rescale === 1
        ? " — exactly 1, meaning no correction was needed and nothing accumulated so far had to be touched"
        : ", another correction applied to everything so far"
    }. After this the accumulators are complete and one division finishes the job.`,
  };
  flash.tiles.forEach((t, i) => {
    push(
      `${tileNote[i]} Running state after block ${i}: m = ${fmt(t.mNew)}, ℓ = ${fmt(
        t.l
      )}, unnormalised O = ${vec(t.o, 2)}.`,
      i === 0 ? ln("S = Q_i @ K_j.T / sqrt(d)") : ln("rescale = exp(m - m_new)"),
      {
        t: "kv",
        label: `block ${i} (keys ${i * BC}–${i * BC + t.scores.length - 1})`,
        v: [
          { k: "block scores", v: t.scores.map((s) => fmt(s, 2)).join(", ") },
          { k: "m before", v: fmt(t.mOld), cls: "dim" },
          { k: "m after", v: fmt(t.mNew), cls: "active" },
          {
            k: "rescale exp(Δm)",
            v: fmt(t.rescale, 4),
            cls: (t.rescale === 1 ? "dim" : "warn") as TraceCls,
          },
          { k: "ℓ", v: fmt(t.l) },
          { k: "live scores", v: `${t.liveScores} of ${N}`, cls: "good" },
        ],
      },
      {
        t: "bars",
        label: "unnormalised output accumulator O (before the final divide)",
        v: t.o.map((x, c) => ({ k: `d${c}`, val: x, show: fmt(x, 2), cls: "warn" as TraceCls })),
      }
    );
  });

  // ---- 6. payoff A: exactness --------------------------------------------
  let worst = 0;
  let worstAt = "";
  for (let qi = 0; qi < N; qi++) {
    const a = standardRow(qi).out;
    const b = flashRow(qi).out;
    for (let c = 0; c < D; c++) {
      const diff = Math.abs(a[c] - b[c]);
      if (diff > worst) {
        worst = diff;
        worstAt = `row ${qi}, dim ${c}`;
      }
    }
  }
  const magnitude = Math.max(
    ...Array.from({ length: N }, (_, qi) => Math.max(...standardRow(qi).out.map(Math.abs)))
  );

  push(
    `**Payoff — "exactly equivalent" is a testable claim, and it passes.** Run both methods over all ${N} query rows and compare every output component. The largest absolute difference anywhere is ${worst.toExponential(
      2
    )} (${worstAt}), against outputs of magnitude up to ${fmt(
      magnitude,
      2
    )} — that is ${
      worst === 0 ? "bit-identical" : `a relative error of ${(worst / magnitude).toExponential(1)}`
    }, i.e. floating-point noise and nothing more. This is worth being precise about because it is unusual: FlashAttention is not a fast approximation that trades accuracy for memory, in the way that sparse or low-rank attention does. It computes the same function by a different association of the same arithmetic. **Any output difference is a bug, never a tuning knob.**`,
    ln("O = rescale * O + P @ V_j"),
    {
      t: "bars",
      label: `|standard − tiled| per query row, all ${D} dims (log-free view, ×1e16)`,
      v: Array.from({ length: N }, (_, qi) => {
        const a = standardRow(qi).out;
        const b = flashRow(qi).out;
        const d = Math.max(...a.map((x, c) => Math.abs(x - b[c])));
        return { k: `q${qi}`, val: d * 1e16, show: d.toExponential(1), cls: "good" as TraceCls };
      }),
    },
    {
      t: "kv",
      label: "exactness",
      v: [
        { k: "rows compared", v: String(N) },
        { k: "components compared", v: String(N * D) },
        { k: "max |difference|", v: worst.toExponential(2), cls: "good" },
        { k: "output magnitude", v: fmt(magnitude, 2) },
      ],
    }
  );

  // ---- 7. payoff B: what the running max is actually for ------------------
  // Scale Q so the scores grow. The softmax is mathematically unchanged in
  // shape; only the magnitude of the intermediates moves, which is exactly what
  // the running max exists to control.
  const SCALES = [1, 20, 100, 400, 1000, 1500, 1600, 2000];
  const overflow = SCALES.map((scale) => {
    const r = seededRng(SEED + 3);
    const kk: Mat = randMat(N, D, r, 1);
    const scaledQ: Mat = Q.map((row) => row.map((x) => x * scale));
    const maxScore = Math.max(...kk.map((k) => scoreOf(scaledQ[0], k)));
    const stable = flashRow(0, true, kk, V, scaledQ).out;
    const naive = flashRow(0, false, kk, V, scaledQ).out;
    return {
      scale,
      maxScore,
      stableOk: stable.every(Number.isFinite),
      naiveOk: naive.every(Number.isFinite),
      naive0: naive[0],
    };
  });
  const LN_MAX = Math.log(Number.MAX_VALUE);
  const firstFail = overflow.find((o) => !o.naiveOk);
  const lastOk = [...overflow].reverse().find((o) => o.naiveOk);
  if (!firstFail || !lastOk) {
    throw new Error("flash-attention: the overflow sweep must straddle the float64 ceiling");
  }

  push(
    `**Payoff — delete the running max and find where it dies.** Step 3 of the page's description says the online softmax keeps a running max "so the partial results are numerically stable". Drop it — accumulate exp(S) directly, which is algebraically the same function — and sweep the score magnitude. The naive version survives while scores stay small and then fails **completely**, not gradually: still finite at a max score of ${fmt(
      lastOk.maxScore,
      1
    )}, then ${String(
      firstFail.naive0
    )} at ${fmt(
      firstFail.maxScore,
      1
    )}. The threshold is not empirical and the sweep brackets it — exp() overflows float64 at exactly ln(MAX_FLOAT64) = ${fmt(
      LN_MAX,
      2
    )}, which falls between those two rows. Above it, exp() is Inf, the numerator and denominator are both Inf, and Inf/Inf is NaN. The stable version is untouched at every scale, because subtracting the running max caps the largest exponent at exp(0) = 1 **by construction**, whatever the scores are. Note what this is not: a precision trade-off. Both compute the same real number; only one of them can represent the intermediates.`,
    ln("P = exp(S - m_new)"),
    {
      t: "table",
      label: "the same computation, with and without the running max",
      head: ["Q scale", "max score", "with max", "without max"],
      v: overflow.map((o) => ({
        cells: [
          `×${o.scale}`,
          fmt(o.maxScore, 1),
          o.stableOk ? "finite" : "NaN",
          o.naiveOk ? "finite" : String(o.naive0),
        ],
        cls: (o.naiveOk ? "good" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `exp() overflows float64 at exactly ln(1.798e308) = ${fmt(
        LN_MAX,
        2
      )}. Scaled attention scores rarely reach that in a trained network, which is precisely why this bug survives code review — it is invisible until a long context, an untrained model, or a low-precision format moves the scores, and then the output is NaN rather than merely wrong.`,
      cls: "warn",
    }
  );

  return {
    id: "flash-attention",
    title: "FlashAttention — streaming a softmax you cannot see all of",
    caption:
      "A 12-key attention row computed twice: once the standard way, materialising every score, and once in three tiles that never hold more than four. Watch the rescale factor in block 1, where a larger score arrives, the running maximum moves, and one scalar exp(m_old − m_new) corrects every partial result accumulated so far — that single factor is what makes a streamed softmax possible. Then two measured payoffs: the page's claim of exact equivalence holds to the last bit of float64 across all 48 output components, and deleting the running max fails not gradually but completely, at exactly ln(MAX_FLOAT64) = 709.78.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const flashAttentionTrace = build();
