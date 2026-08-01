import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Baum–Welch on a 2-state, 2-symbol HMM over a 3-step observation sequence —
 * small enough that every α, β, γ and ξ fits on screen at once, which is the
 * only way the forward–backward product stops feeling like notation.
 *
 * States: Rain / Sun. Symbols: umbrella (U) / none (N). The observations
 * (U, U, N) are deliberately informative: the first two scream "rain", the
 * third argues for a switch, so γ actually moves across the sequence.
 */

const CODE = codeLines(`
def baum_welch(x, pi, A, B):
    # E-step: forward, then backward
    a[0] = pi * B[:, x[0]]
    for t in range(1, T):
        a[t] = (a[t-1] @ A) * B[:, x[t]]
    b[T-1] = 1
    for t in range(T - 2, -1, -1):
        b[t] = A @ (B[:, x[t+1]] * b[t+1])

    # occupancy and transition posteriors
    g = a * b / (a * b).sum(axis=1)
    xi[t,i,j] = (a[t,i] * A[i,j]
                 * B[j,x[t+1]] * b[t+1,j]) / P

    # M-step: normalized expected counts
    pi = g[0]
    A  = xi.sum(0) / g[:-1].sum(0)[:, None]
    B  = counts(g, x) / g.sum(0)[:, None]
    return pi, A, B
`);

const ln = lineFinder(CODE);

const STATES = ["Rain", "Sun"];
const SYMBOLS = ["U", "N"];
const OBS = [0, 0, 1]; // U, U, N
const T = OBS.length;
const N = STATES.length;

const fmt = (x: number, d = 4) => x.toFixed(d);
const obsStr = OBS.map((o) => SYMBOLS[o]).join(", ");

interface Params {
  pi: number[];
  A: number[][];
  B: number[][];
}

const INIT: Params = {
  pi: [0.5, 0.5],
  A: [
    [0.7, 0.3],
    [0.3, 0.7],
  ],
  B: [
    [0.9, 0.1], // Rain: mostly umbrella
    [0.2, 0.8], // Sun: mostly none
  ],
};

/** Forward, backward, γ and ξ for one parameter set. */
function eStep(p: Params) {
  const alpha: number[][] = [];
  alpha[0] = p.pi.map((pi, i) => pi * p.B[i][OBS[0]]);
  for (let t = 1; t < T; t++) {
    alpha[t] = Array.from({ length: N }, (_, j) =>
      alpha[t - 1].reduce((s, a, i) => s + a * p.A[i][j], 0) * p.B[j][OBS[t]]
    );
  }

  const beta: number[][] = Array.from({ length: T }, () => Array(N).fill(0));
  beta[T - 1] = Array(N).fill(1);
  for (let t = T - 2; t >= 0; t--) {
    beta[t] = Array.from({ length: N }, (_, i) =>
      p.A[i].reduce((s, a, j) => s + a * p.B[j][OBS[t + 1]] * beta[t + 1][j], 0)
    );
  }

  const px = alpha[T - 1].reduce((s, a) => s + a, 0);
  const gamma = alpha.map((row, t) => {
    const z = row.reduce((s, a, i) => s + a * beta[t][i], 0);
    return row.map((a, i) => (a * beta[t][i]) / z);
  });

  const xi: number[][][] = [];
  for (let t = 0; t < T - 1; t++) {
    const raw = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => alpha[t][i] * p.A[i][j] * p.B[j][OBS[t + 1]] * beta[t + 1][j])
    );
    const z = raw.flat().reduce((s, v) => s + v, 0);
    xi.push(raw.map((row) => row.map((v) => v / z)));
  }

  return { alpha, beta, gamma, xi, px };
}

/** M-step: every parameter is a ratio of expected counts. */
function mStep(e: ReturnType<typeof eStep>): Params {
  const pi = [...e.gamma[0]];
  const A = Array.from({ length: N }, (_, i) => {
    const denom = e.gamma.slice(0, T - 1).reduce((s, g) => s + g[i], 0);
    return Array.from({ length: N }, (_, j) => e.xi.reduce((s, x) => s + x[i][j], 0) / denom);
  });
  const B = Array.from({ length: N }, (_, j) => {
    const denom = e.gamma.reduce((s, g) => s + g[j], 0);
    return SYMBOLS.map((_, k) =>
      OBS.reduce((s, o, t) => s + (o === k ? e.gamma[t][j] : 0), 0) / denom
    );
  });
  return { pi, A, B };
}

const timeLabels = OBS.map((o, t) => `t${t + 1}=${SYMBOLS[o]}`);

function seqPanel(active?: number): TraceComponent {
  return {
    t: "tokens",
    label: "observation sequence",
    v: OBS.map((o, t) => ({
      text: SYMBOLS[o],
      sub: `t${t + 1}`,
      cls: active === t ? "active" : undefined,
    })),
  };
}

function paramPanels(p: Params, cls?: { A?: boolean; B?: boolean; pi?: boolean }): TraceComponent[] {
  return [
    {
      t: "matrix",
      label: "A — transition",
      rows: STATES,
      cols: STATES,
      v: p.A,
      heat: cls?.A,
    },
    {
      t: "matrix",
      label: "B — emission",
      rows: STATES,
      cols: SYMBOLS,
      v: p.B,
      heat: cls?.B,
    },
    {
      t: "kv",
      label: "π — initial",
      v: STATES.map((s, i) => ({ k: s, v: fmt(p.pi[i], 3), cls: (cls?.pi ? "good" : undefined) as TraceCls | undefined })),
    },
  ];
}

const gammaPanel = (gamma: number[][], upTo = T): TraceComponent => ({
  t: "matrix",
  label: "γ — P(state | whole sequence)",
  rows: timeLabels,
  cols: STATES,
  v: gamma.map((row, t) => (t < upTo ? row : row.map(() => NaN))),
  heat: true,
});

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const params = INIT;
  const e = eStep(params);

  push(
    `A two-state HMM — Rain and Sun — that emits "umbrella" (U) or "none" (N). The observed sequence is (${obsStr}): two umbrella days then a dry one. The hidden states are never observed, which is the whole difficulty; Baum–Welch has to infer both the states *and* the parameters that generated them.`,
    ln("def baum_welch(x, pi, A, B)"),
    seqPanel(),
    ...paramPanels(params),
    {
      t: "note",
      text: "Initialization already leans the right way (Rain emits U with 0.9), but nothing forces the hidden path — the algorithm still has to work out how much each state explains each day.",
    }
  );

  // ---- forward -----------------------------------------------------------
  for (let t = 0; t < T; t++) {
    push(
      t === 0
        ? `Forward, t = 1: α₁(i) = π(i)·b_i(${SYMBOLS[OBS[0]]}). Rain gets ${fmt(e.alpha[0][0])} and Sun ${fmt(e.alpha[0][1])} — an umbrella on day 1 is already ${fmt(e.alpha[0][0] / e.alpha[0][1], 1)}× better explained by Rain.`
        : `Forward, t = ${t + 1}: α_t(j) = [Σ_i α_{t−1}(i)·A_ij]·b_j(${SYMBOLS[OBS[t]]}). Every path into state j is summed, then charged the cost of emitting ${SYMBOLS[OBS[t]]}. α is the probability of the observations *so far* together with landing in each state.`,
      t === 0 ? ln("a[0] = pi * B[:, x[0]]") : ln("a[t] = (a[t-1] @ A) * B[:, x[t]]"),
      seqPanel(t),
      {
        t: "matrix",
        label: "α — forward",
        rows: timeLabels,
        cols: STATES,
        v: e.alpha.map((row, k) => (k <= t ? row : row.map(() => NaN))),
        heat: true,
      }
    );
  }

  push(
    `The forward pass ends with P(x) = Σ_i α_T(i) = ${fmt(e.px, 5)}. That single number is the likelihood of the observed sequence under the current parameters — the quantity the whole algorithm is trying to increase.`,
    ln("a[t] = (a[t-1] @ A) * B[:, x[t]]"),
    seqPanel(),
    {
      t: "kv",
      label: "sequence likelihood",
      v: [{ k: "P(x)", v: fmt(e.px, 6), cls: "warn" }],
    },
    {
      t: "matrix",
      label: "α — forward",
      rows: timeLabels,
      cols: STATES,
      v: e.alpha,
      heat: true,
    }
  );

  // ---- backward ----------------------------------------------------------
  for (let t = T - 1; t >= 0; t--) {
    push(
      t === T - 1
        ? `Backward, t = ${T}: β_T(i) = 1 by definition — there is no future left to explain, so every state is equally consistent with "nothing more happens".`
        : `Backward, t = ${t + 1}: β_t(i) = Σ_j A_ij·b_j(${SYMBOLS[OBS[t + 1]]})·β_{t+1}(j). This is the mirror of α: the probability of everything *after* time t, given that you are in state i now. Rain scores ${fmt(e.beta[t][0])}, Sun ${fmt(e.beta[t][1])}.`,
      t === T - 1 ? ln("b[T-1] = 1") : ln("b[t] = A @ (B[:, x[t+1]] * b[t+1])"),
      seqPanel(t),
      {
        t: "matrix",
        label: "β — backward",
        rows: timeLabels,
        cols: STATES,
        v: e.beta.map((row, k) => (k >= t ? row : row.map(() => NaN))),
        heat: true,
      }
    );
  }

  // ---- gamma -------------------------------------------------------------
  for (let t = 0; t < T; t++) {
    push(
      `γ_${t + 1}(i) = α_${t + 1}(i)·β_${t + 1}(i) / P(x): the past and the future multiplied, then normalized. At t = ${t + 1} the posterior is Rain ${fmt(e.gamma[t][0], 3)}, Sun ${fmt(e.gamma[t][1], 3)}. ${
        t === T - 1
          ? "The dry third day pulls the posterior toward Sun even though the chain prefers to stay put."
          : "Note this uses the *whole* sequence, not just the past — that is what makes it a smoothing estimate rather than a filtering one."
      }`,
      ln("g = a * b / (a * b).sum(axis=1)"),
      seqPanel(t),
      gammaPanel(e.gamma, t + 1),
      {
        t: "bars",
        label: `t = ${t + 1}: α·β per state`,
        v: STATES.map((s, i) => ({
          k: s,
          val: e.alpha[t][i] * e.beta[t][i],
          show: fmt(e.alpha[t][i] * e.beta[t][i], 5),
          cls: e.gamma[t][i] > 0.5 ? "good" : "dim",
        })),
      }
    );
  }

  // ---- xi ----------------------------------------------------------------
  for (let t = 0; t < T - 1; t++) {
    push(
      `ξ_${t + 1}(i,j): the posterior probability of taking edge i→j between t = ${t + 1} and t = ${t + 2}. Read the numerator left to right — reach i by time ${t + 1} (α), take the transition (A), emit ${SYMBOLS[OBS[t + 1]]} from j (B), then account for the rest (β). γ alone cannot give you this: it knows where you *were*, not where you *went*.`,
      ln("xi[t,i,j] = (a[t,i] * A[i,j]"),
      seqPanel(t),
      {
        t: "matrix",
        label: `ξ at t = ${t + 1} (from → to)`,
        rows: STATES,
        cols: STATES,
        v: e.xi[t],
        heat: true,
      },
      gammaPanel(e.gamma)
    );
  }

  // ---- M-step ------------------------------------------------------------
  const updated = mStep(e);

  push(
    `M-step, π̂ = γ₁ = (${fmt(updated.pi[0], 3)}, ${fmt(updated.pi[1], 3)}). The expected fraction of sequences starting in each state — with one sequence, that is just the posterior at t = 1.`,
    ln("pi = g[0]"),
    ...paramPanels(updated, { pi: true }),
    gammaPanel(e.gamma)
  );

  push(
    `M-step, Â_ij = Σ_t ξ_t(i,j) / Σ_t γ_t(i) — expected i→j transitions over expected time spent in i. Rain→Rain moves to ${fmt(updated.A[0][0], 3)} from ${fmt(INIT.A[0][0], 3)}, and B̂_j(k) is the same idea for emissions: expected times j emitted k over expected time in j. Every parameter is a ratio of *expected* counts, which is exactly what the M-step would be if the states had been observed.`,
    [...ln("A  = xi.sum(0)"), ...ln("B  = counts(g, x)")],
    ...paramPanels(updated, { A: true, B: true })
  );

  // ---- payoff: iterate ----------------------------------------------------
  const llHistory = [Math.log(e.px)];
  let p = updated;
  for (let iter = 0; iter < 12; iter++) {
    const ee = eStep(p);
    llHistory.push(Math.log(ee.px));
    p = mStep(ee);
  }

  push(
    `Now iterate. log P(x) climbs from ${fmt(llHistory[0], 4)} to ${fmt(llHistory[llHistory.length - 1], 4)} and flattens — never once dipping, because Baum–Welch is just EM and inherits the monotone guarantee. Watch what the parameters do to get there: A and B both sharpen toward 0/1, because with a single short sequence the model can explain it best by committing to one hidden path.`,
    ln("return pi, A, B"),
    {
      t: "bars",
      label: "log P(x) by iteration",
      v: llHistory.map((l, i) => ({
        k: `iter ${i}`,
        val: l - llHistory[0] + 0.01,
        show: fmt(l, 4),
        cls: i === 0 ? "bad" : i === llHistory.length - 1 ? "good" : "dim",
      })),
    },
    ...paramPanels(p, { A: true, B: true }),
    {
      t: "note",
      text: "That sharpening is overfitting: one 3-step sequence cannot support a 2-state HMM. Real training sums expected counts over many sequences before normalizing — and runs the recursions in log space, since α and β underflow within a few dozen steps.",
      cls: "warn",
    }
  );

  return {
    id: "baum-welch",
    title: "Baum–Welch — forward, backward, and re-estimation from expected counts",
    caption:
      "The full E-step and M-step on a 2-state HMM over three observations, small enough that every α, β, γ and ξ is on screen. The point to watch is why *both* passes are needed: α carries the past, β carries the future, and only their product gives the posterior over hidden states given the whole sequence. The final step iterates to convergence — log P(x) rises monotonically, and the parameters sharpen to the point of overfitting a single short sequence.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const baumWelchTrace = build();
