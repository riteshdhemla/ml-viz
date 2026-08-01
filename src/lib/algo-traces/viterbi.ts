import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Viterbi decoding on the Rainy/Sunny HMM worked by hand in
 * `courses/graphical-models/03-hidden-markov-models.mdx`: π = [0.6, 0.4],
 * observations Walk → Shop, giving δ₁ = (0.06, 0.24), δ₂ = (0.0384, 0.0432)
 * and the best path Sunny → Sunny.
 *
 * The payoff is the distinction the page's "Sum vs max" callout asserts, made
 * concrete: run the *same* lattice with sum instead of max and the per-step
 * argmax picks **Rainy** at t = 2, while the best whole path ends in **Sunny**.
 * Two different questions, two different answers, on identical numbers.
 */

const CODE = codeLines(`
def viterbi(x, pi, A, B):
    T, N = len(x), len(pi)
    d   = [[0.0] * N for _ in range(T)]
    psi = [[0] * N for _ in range(T)]
    for j in range(N):
        d[0][j] = pi[j] * B[j][x[0]]
    for t in range(1, T):
        for j in range(N):
            # max over paths, not sum
            cand = [d[t-1][i] * A[i][j]
                    for i in range(N)]
            psi[t][j] = argmax(cand)
            d[t][j] = max(cand) * B[j][x[t]]
    q = [argmax(d[T-1])]                 # best last
    for t in range(T - 1, 0, -1):
        q.insert(0, psi[t][q[0]])        # backtrace
    return q, max(d[T-1])
`);

const ln = lineFinder(CODE);

const STATES = ["Rainy", "Sunny"];
const SYMBOLS = ["Walk", "Shop", "Clean"];
const PI = [0.6, 0.4];
const A = [
  [0.7, 0.3],
  [0.4, 0.6],
];
const B = [
  [0.1, 0.4, 0.5], // Rainy
  [0.6, 0.3, 0.1], // Sunny
];
const OBS = [0, 1]; // Walk, Shop
const T = OBS.length;
const N = STATES.length;

const fmt = (x: number, d = 4) => x.toFixed(d);
const short = (x: number) => Number(x.toFixed(6)).toString();

/** Viterbi: δ, backpointers, and the decoded path. */
function viterbi() {
  const d: number[][] = Array.from({ length: T }, () => Array(N).fill(0));
  const psi: number[][] = Array.from({ length: T }, () => Array(N).fill(-1));
  for (let j = 0; j < N; j++) d[0][j] = PI[j] * B[j][OBS[0]];
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < N; j++) {
      const cand = Array.from({ length: N }, (_, i) => d[t - 1][i] * A[i][j]);
      const best = cand.indexOf(Math.max(...cand));
      psi[t][j] = best;
      d[t][j] = cand[best] * B[j][OBS[t]];
    }
  }
  const last = d[T - 1].indexOf(Math.max(...d[T - 1]));
  const path = [last];
  for (let t = T - 1; t > 0; t--) path.unshift(psi[t][path[0]]);
  return { d, psi, path, score: d[T - 1][last] };
}

/** The forward algorithm — identical recursion with sum in place of max. */
function forward() {
  const a: number[][] = Array.from({ length: T }, () => Array(N).fill(0));
  for (let j = 0; j < N; j++) a[0][j] = PI[j] * B[j][OBS[0]];
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < N; j++) {
      a[t][j] = Array.from({ length: N }, (_, i) => a[t - 1][i] * A[i][j]).reduce((s, v) => s + v, 0) * B[j][OBS[t]];
    }
  }
  return { a, px: a[T - 1].reduce((s, v) => s + v, 0) };
}

/** Every hidden path and its exact joint probability — the ground truth. */
function enumeratePaths() {
  const out: { path: number[]; p: number }[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      out.push({ path: [i, j], p: PI[i] * B[i][OBS[0]] * A[i][j] * B[j][OBS[1]] });
    }
  }
  return out.sort((x, y) => y.p - x.p);
}

const V = viterbi();
const F = forward();
const DOMAIN: [number, number, number, number] = [0.4, 2.6, -0.6, 1.6];

/** Trellis: states as rows, time as columns, chosen backpointers drawn solid. */
function trellis(
  label: string,
  filled: number,
  opts: { active?: [number, number]; candidates?: [number, number][]; path?: number[] } = {}
): TraceComponent {
  const segments: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    cls?: TraceCls;
    dashed?: boolean;
  }[] = [];

  // every possible transition, faint
  if (filled >= 1) {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const isCandidate = opts.candidates?.some(([ci, cj]) => ci === i && cj === j);
        segments.push({
          x1: 1,
          y1: 1 - i,
          x2: 2,
          y2: 1 - j,
          cls: isCandidate ? "warn" : "dim",
          dashed: !isCandidate,
        });
      }
    }
  }
  // the decoded path, solid
  if (opts.path) {
    for (let t = 0; t < opts.path.length - 1; t++) {
      segments.push({
        x1: t + 1,
        y1: 1 - opts.path[t],
        x2: t + 2,
        y2: 1 - opts.path[t + 1],
        cls: "good",
      });
    }
  }

  return {
    t: "plot",
    label,
    domain: DOMAIN,
    ticks: false, // axes are categorical here: time and state index
    xLabel: `t=1 (${SYMBOLS[OBS[0]]})          t=2 (${SYMBOLS[OBS[1]]})`,
    segments,
    points: Array.from({ length: T }, (_, t) =>
      STATES.map((s, j) => ({
        x: t + 1,
        y: 1 - j,
        id: `${s} ${t < filled ? short(V.d[t][j]) : "·"}`,
        cls: (opts.path?.[t] === j
          ? "good"
          : opts.active && opts.active[0] === t && opts.active[1] === j
            ? "active"
            : t < filled
              ? "warn"
              : "dim") as TraceCls,
        shape: "dot" as const,
      }))
    ).flat(),
  };
}

function deltaTable(filled: number, active?: [number, number]): TraceComponent {
  return {
    t: "matrix",
    label: "δ — best path score ending in each state",
    rows: OBS.map((o, t) => `t${t + 1}=${SYMBOLS[o]}`),
    cols: STATES,
    v: V.d.map((row, t) => row.map((v, j) => (t < filled || (active && active[0] === t && active[1] === j) ? v : NaN))),
    digits: 4,
    cls: active ? { [`${active[0]},${active[1]}`]: "active" } : undefined,
  };
}

const psiPanel = (upTo: number): TraceComponent => ({
  t: "kv",
  label: "ψ — backpointers",
  v: V.psi.slice(1, upTo + 1).flatMap((row, t) =>
    row.map((from, j) => ({
      k: `ψ(t${t + 2}, ${STATES[j]})`,
      v: STATES[from],
      cls: "warn" as TraceCls,
    }))
  ),
});

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `A two-state weather HMM — Rainy or Sunny — where you never see the weather, only what someone did: Walk, Shop or Clean. The observations are ${OBS.map(
      (o) => SYMBOLS[o]
    ).join(" → ")}. Viterbi answers one specific question: **which single hidden sequence is most probable?**`,
    ln("def viterbi(x, pi, A, B)"),
    { t: "matrix", label: "A — transition", rows: STATES, cols: STATES, v: A, digits: 2 },
    { t: "matrix", label: "B — emission", rows: STATES, cols: SYMBOLS, v: B, digits: 2 },
    { t: "kv", label: "π — initial", v: STATES.map((s, i) => ({ k: s, v: String(PI[i]) })) },
    trellis("the trellis, empty", 0)
  );

  // ---- initialization -----------------------------------------------------
  for (let j = 0; j < N; j++) {
    push(
      `Initialize t = 1 for ${STATES[j]}: δ₁(${STATES[j]}) = π(${STATES[j]})·b_${STATES[j]}(${SYMBOLS[OBS[0]]}) = ${PI[j]}·${B[j][OBS[0]]} = ${short(
        V.d[0][j]
      )}. ${
        j === 1
          ? "Sunny starts ahead — walking is much more likely in the sun (0.6 vs 0.1), and that outweighs Rainy's higher prior."
          : "No path history yet, so this is just prior × emission."
      }`,
      ln("d[0][j] = pi[j] * B[j][x[0]]"),
      trellis(`initializing t = 1`, 0, { active: [0, j] }),
      deltaTable(0, [0, j])
    );
  }

  // ---- recursion ----------------------------------------------------------
  for (let j = 0; j < N; j++) {
    const cand = Array.from({ length: N }, (_, i) => V.d[0][i] * A[i][j]);
    const win = V.psi[1][j];
    push(
      `t = 2, ${STATES[j]}: consider every way to arrive. From Rainy: δ₁(Rainy)·A(Rainy→${STATES[j]}) = ${short(
        V.d[0][0]
      )}·${A[0][j]} = ${short(cand[0])}. From Sunny: ${short(V.d[0][1])}·${A[1][j]} = ${short(
        cand[1]
      )}. Take the **max** — ${short(Math.max(...cand))} via ${STATES[win]} — and multiply by the emission b_${STATES[j]}(${
        SYMBOLS[OBS[1]]
      }) = ${B[j][OBS[1]]}, giving δ₂(${STATES[j]}) = ${short(V.d[1][j])}. Record ψ = ${STATES[win]}: the loser is discarded permanently.`,
      [...ln("cand = [d[t-1][i]"), ...ln("d[t][j] = max(cand)")],
      trellis(`computing δ₂(${STATES[j]})`, 1, {
        active: [1, j],
        candidates: [
          [0, j],
          [1, j],
        ],
      }),
      deltaTable(1, [1, j]),
      {
        t: "bars",
        label: `incoming candidates for ${STATES[j]}`,
        v: STATES.map((s, i) => ({
          k: `from ${s}`,
          val: cand[i],
          show: short(cand[i]),
          cls: (i === win ? "good" : "bad") as TraceCls,
        })),
      }
    );
  }

  // ---- termination + backtrace -------------------------------------------
  const last = V.path[T - 1];
  push(
    `Termination: the largest δ at the final step is δ₂(${STATES[last]}) = ${short(
      V.score
    )}, so the best path *ends* in ${STATES[last]}. Note that this is the score of one complete path, not a marginal probability — it already accounts for how the path got here.`,
    ln("q = [argmax(d[T-1])]"),
    trellis("best final state", T, { active: [1, last] }),
    deltaTable(T),
    psiPanel(T)
  );

  push(
    `Backtrace: follow ψ backwards from ${STATES[last]}. ψ(t2, ${STATES[last]}) = ${STATES[V.psi[1][last]]}, so the path is **${V.path
      .map((p) => STATES[p])
      .join(" → ")}**. This is why the backpointers were stored during the forward sweep — reconstructing the path costs one backward walk, O(KT), with no extra probability computation.`,
    ln("q.insert(0, psi[t][q[0]])"),
    trellis(`decoded path`, T, { path: V.path }),
    { t: "tokens", label: "decoded hidden sequence", v: V.path.map((p) => ({ text: STATES[p], cls: "good" as TraceCls })) },
    psiPanel(T)
  );

  // ---- verification -------------------------------------------------------
  const paths = enumeratePaths();
  push(
    `Check it by brute force. With 2 states and 2 steps there are only ${paths.length} possible hidden paths, so they can be enumerated: ${STATES[
      paths[0].path[0]
    ]}→${STATES[paths[0].path[1]]} at ${short(paths[0].p)} is indeed the winner, and it matches δ₂ exactly. Viterbi found it without enumerating — at T steps and K states there are Kᵀ paths, and the recursion visits K²T transitions instead.`,
    ln("return q, max(d[T-1])"),
    {
      t: "table",
      label: `all ${paths.length} hidden paths, by joint probability`,
      head: ["path", "P(path, x)"],
      v: paths.map((p) => ({
        cells: [p.path.map((s) => STATES[s]).join(" → "), short(p.p)],
        cls: (p.path.join() === V.path.join() ? "good" : "dim") as TraceCls,
      })),
    },
    trellis("decoded path", T, { path: V.path })
  );

  // ---- payoff: sum vs max ------------------------------------------------
  const marginalBest = F.a[T - 1].indexOf(Math.max(...F.a[T - 1]));
  push(
    `Now swap the single word **max** for **sum** and rerun the identical lattice — that is the forward algorithm. It gives P(x) = ${short(
      F.px
    )}, the total probability of the observations over all paths. But look at the final row: α₂(Rainy) = ${short(
      F.a[1][0]
    )} exceeds α₂(Sunny) = ${short(F.a[1][1])}, so picking the most probable state *at each step* says **${
      STATES[marginalBest]
    }** at t = 2 — while the most probable *path* ends in **${STATES[last]}**. Both are right; they answer different questions.`,
    [...ln("cand = [d[t-1][i]"), ...ln("d[t][j] = max(cand)")],
    {
      t: "matrix",
      label: "δ (max over paths) — Viterbi",
      rows: OBS.map((o, t) => `t${t + 1}=${SYMBOLS[o]}`),
      cols: STATES,
      v: V.d,
      digits: 4,
      cls: { [`1,${last}`]: "good" },
    },
    {
      t: "matrix",
      label: "α (sum over paths) — forward",
      rows: OBS.map((o, t) => `t${t + 1}=${SYMBOLS[o]}`),
      cols: STATES,
      v: F.a,
      digits: 4,
      cls: { [`1,${marginalBest}`]: "bad" },
    },
    {
      t: "note",
      text: `Rainy is the more likely state at t = 2 (${short(F.a[1][0])} of ${short(F.px)}), yet no most-probable path passes through it. Per-step argmax can even return a sequence with probability zero if some transition is impossible — which is exactly why Viterbi keeps backpointers instead of just taking maxima.`,
      cls: "warn",
    }
  );

  return {
    id: "viterbi-decoding",
    title: "Viterbi — max over paths, and the backpointers that reconstruct one",
    caption:
      "Viterbi decoding on the Rainy/Sunny HMM worked by hand above, cell by cell: every incoming candidate scored, the max taken, the loser discarded, and a backpointer stored so the winning path can be walked back at the end. The last step swaps max for sum — the forward algorithm — on the identical lattice, and the per-step argmax disagrees with the best whole path. That disagreement is the whole reason both algorithms exist.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const viterbiTrace = build();
