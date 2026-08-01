import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * BPTT on a 2-unit tanh RNN unrolled over 6 steps, showing the backward
 * recursion dh_{t−1} = Wᵀ·diag(tanh'(a_t))·dh_t derived in
 * `src/content/wiki/bptt-algorithm.mdx`.
 *
 * The payoff sweeps the spectral radius of W_hh and plots ‖∂L/∂h_k‖ against the
 * gap — the vanishing/exploding dichotomy as a measured curve rather than an
 * assertion about products of Jacobians.
 */

const CODE = codeLines(`
def bptt(xs, h0, W_hh, W_xh, b):
    hs, as_ = [h0], []
    for x in xs:                    # forward
        a = W_hh @ hs[-1] + W_xh @ x + b
        as_.append(a)
        hs.append(tanh(a))
    dh = dloss_dh(hs[-1])           # seed at t = T
    norms = [norm(dh)]
    for t in reversed(range(len(xs))):
        # one step back = one W_hh and one tanh'
        d = 1 - tanh(as_[t]) ** 2   # tanh'(a_t)
        dh = W_hh.T @ (d * dh)
        norms.append(norm(dh))
    return norms
`);

const ln = lineFinder(CODE);

const T = 6;
const H = 2;
const fmt = (x: number, d = 4) => x.toFixed(d);

type Mat = number[][];
type Vec = number[];

const matVec = (M: Mat, v: Vec): Vec => M.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const matTVec = (M: Mat, v: Vec): Vec =>
  v.map((_, j) => M.reduce((s, row, i) => s + row[j] * v[i], 0));
const norm = (v: Vec) => Math.hypot(...v);
const tanhp = (a: number) => 1 - Math.tanh(a) ** 2;

/** W_hh scaled to a chosen spectral radius; the base matrix has eigenvalues 0.6, 0.4. */
function W(radius: number): Mat {
  const base = [
    [0.5, 0.1],
    [0.1, 0.5],
  ];
  const k = radius / 0.6; // base spectral radius is 0.5 + 0.1
  return base.map((row) => row.map((v) => v * k));
}

const W_XH: Mat = [
  [0.6, -0.2],
  [-0.3, 0.5],
];
const B: Vec = [0.05, -0.05];
const XS: Vec[] = Array.from({ length: T }, (_, t) => [Math.cos(t), Math.sin(t * 0.7)]);
const H0: Vec = [0.1, -0.1];

/** Forward pass, then the backward recursion, recording ‖dh‖ at every step. */
function run(radius: number) {
  const Whh = W(radius);
  const hs: Vec[] = [H0];
  const as: Vec[] = [];
  for (let t = 0; t < T; t++) {
    const a = matVec(Whh, hs[t]).map((v, i) => v + matVec(W_XH, XS[t])[i] + B[i]);
    as.push(a);
    hs.push(a.map(Math.tanh));
  }
  // seed the backward pass with a unit gradient at the final step
  let dh: Vec = [1, 0];
  const back: { t: number; dh: Vec; dtanh: Vec; norm: number }[] = [
    { t: T, dh: [...dh], dtanh: [1, 1], norm: norm(dh) },
  ];
  for (let t = T - 1; t >= 0; t--) {
    const d = as[t].map(tanhp);
    dh = matTVec(
      Whh,
      dh.map((v, i) => v * d[i])
    );
    back.push({ t, dh: [...dh], dtanh: d, norm: norm(dh) });
  }
  return { Whh, hs, as, back };
}

const RADIUS = 0.6;

function hiddenPanel(hs: Vec[], upTo: number): TraceComponent {
  return {
    t: "matrix",
    label: "hidden states h_t",
    rows: hs.map((_, t) => (t === 0 ? "h₀" : `h${t}`)),
    cols: ["unit 0", "unit 1"],
    v: hs.map((h, t) => (t <= upTo ? h : h.map(() => NaN))),
    heat: true,
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const { Whh, hs, as, back } = run(RADIUS);

  push(
    `A 2-unit tanh RNN unrolled over ${T} steps: h_t = tanh(W_hh·h_{t−1} + W_xh·x_t + b). BPTT is nothing more than backpropagation on this unrolled graph — but the graph has a special shape, because the *same* W_hh appears at every step, and that repetition is where all the trouble comes from.`,
    ln("def bptt(xs, h0, W_hh, W_xh, b)"),
    { t: "matrix", label: `W_hh (spectral radius ${RADIUS})`, rows: ["→0", "→1"], cols: ["0", "1"], v: Whh },
    hiddenPanel(hs, 0)
  );

  push(
    `Forward pass done — ${T} hidden states, each a squashed linear function of the last. Nothing about the forward direction is unusual; a plain feed-forward net of depth ${T} would look the same. The difference is that all ${T} layers share one weight matrix.`,
    ln("hs.append(tanh(a))"),
    hiddenPanel(hs, T),
    {
      t: "bars",
      label: "‖h_t‖",
      v: hs.map((h, t) => ({ k: t === 0 ? "h₀" : `h${t}`, val: norm(h), show: fmt(norm(h), 3), cls: "dim" })),
    }
  );

  push(
    `Now the key object. Differentiating h_t = tanh(a_t) with respect to h_{t−1} gives ∂h_t/∂h_{t−1} = diag(tanh'(a_t))·W_hh — a diagonal of activation slopes times the recurrent matrix. Every single step backwards multiplies by one of these, so a gradient reaching back k steps is a product of k of them. **That product is the entire story of BPTT.**`,
    ln("d = 1 - tanh(as_[t]) ** 2"),
    {
      t: "matrix",
      label: "diag(tanh'(a_T))",
      rows: ["0", "1"],
      cols: ["0", "1"],
      v: [
        [tanhp(as[T - 1][0]), 0],
        [0, tanhp(as[T - 1][1])],
      ],
    },
    { t: "matrix", label: "W_hh", rows: ["→0", "→1"], cols: ["0", "1"], v: Whh },
    {
      t: "note",
      text: "tanh' = 1 − tanh² is at most 1, and is strictly below 1 whenever the unit is doing anything at all. Every backward step therefore multiplies by something ≤ 1 *and* by W_hh.",
    }
  );

  for (let i = 1; i < back.length; i++) {
    const step = back[i];
    const prev = back[i - 1];
    push(
      `Step back to h${step.t}: dh_{${step.t}} = W_hhᵀ·(tanh'(a_${step.t + 1}) ⊙ dh_{${step.t + 1}}). The activation slopes here are (${step.dtanh
        .map((d) => fmt(d, 3))
        .join(", ")}) — tanh' never exceeds 1, and ${
        Math.max(...step.dtanh) > 0.99
          ? "even when a unit sits near the linear region and its slope is ~1, W_hh still shrinks the step"
          : "these units are off the linear region, so the slopes actively shrink it further"
      }. The gradient norm falls from ${fmt(prev.norm, 4)} to ${fmt(step.norm, 4)}, a factor of ${fmt(step.norm / prev.norm, 3)}.`,
      ln("dh = W_hh.T @ (d * dh)"),
      {
        t: "bars",
        label: "‖∂L/∂h_t‖ as the gradient travels back",
        v: back.slice(0, i + 1).map((b) => ({
          k: `h${b.t}`,
          val: b.norm,
          show: fmt(b.norm, 4),
          cls: (b === step ? "active" : "dim") as TraceCls,
        })),
        max: 1.05,
      },
      {
        t: "kv",
        label: "this step",
        v: [
          { k: "tanh'(a)", v: `(${step.dtanh.map((d) => fmt(d, 3)).join(", ")})`, cls: "warn" },
          { k: "‖dh‖ before", v: fmt(prev.norm, 4) },
          { k: "‖dh‖ after", v: fmt(step.norm, 4), cls: "bad" },
          { k: "ratio", v: fmt(step.norm / prev.norm, 3) },
        ],
      }
    );
  }

  const decay = back[back.length - 1].norm / back[0].norm;
  push(
    `After ${T} steps the gradient has shrunk by a factor of ${fmt(decay, 5)}. The loss at step ${T} has essentially nothing to say about h₀ — and the weight update for the earliest timesteps is built from exactly this gradient. The network cannot learn a dependency it cannot feel.`,
    ln("norms.append(norm(dh))"),
    {
      t: "bars",
      label: "‖∂L/∂h_t‖ over the whole sequence",
      v: back.map((b) => ({
        k: `h${b.t}`,
        val: b.norm,
        show: fmt(b.norm, 5),
        cls: (b.t === 0 ? "bad" : b.t === T ? "good" : "dim") as TraceCls,
      })),
      max: 1.05,
    }
  );

  // ---- payoff: the spectral radius decides everything ---------------------
  const radii = [0.6, 1.0, 1.5];
  const runs = radii.map((r) => ({ r, back: run(r).back }));

  push(
    `The whole dichotomy in one picture. The product of Jacobians is dominated by the spectral radius of W_hh, and tanh' ≤ 1 only ever pushes it further down. At ρ = 0.6 the gradient dies (×${fmt(
      runs[0].back[runs[0].back.length - 1].norm,
      5
    )} over ${T} steps); at ρ = 1.5 it grows (×${fmt(runs[2].back[runs[2].back.length - 1].norm, 2)}) and would overflow over a long sequence; only near ρ = 1 does it stay usable, and that is a knife-edge nobody can balance on for long. Gradient clipping handles the exploding side cheaply. Nothing patches the vanishing side — which is why LSTMs added an additive cell path with no repeated matrix on it at all.`,
    ln("dh = W_hh.T @ (d * dh)"),
    {
      t: "plot",
      label: "‖∂L/∂h_t‖ vs how far back the gradient has travelled",
      domain: [0, T, -2.5, 0.5],
      xLabel: "steps back",
      yLabel: "log₁₀ ‖dh‖",
      curves: runs.map((run_, i) => ({
        pts: run_.back.map((b, k) => ({ x: k, y: Math.log10(Math.max(b.norm, 1e-9)) })),
        cls: (["bad", "good", "warn"] as TraceCls[])[i],
      })),
    },
    {
      t: "table",
      label: `gradient norm after ${T} steps back`,
      head: ["spectral radius", "‖dh‖", "behaviour"],
      v: runs.map((run_, i) => ({
        cells: [
          fmt(run_.r, 1),
          fmt(run_.back[run_.back.length - 1].norm, 5),
          ["vanishes", "marginal", "explodes"][i],
        ],
        cls: (["bad", "good", "warn"] as TraceCls[])[i],
      })),
    },
    {
      t: "note",
      text: "Note the y-axis is log scale and the curves are close to straight lines — the decay is geometric in the gap, not polynomial. Doubling the sequence length squares the shrinkage.",
      cls: "warn",
    }
  );

  return {
    id: "bptt-gradient-flow",
    title: "BPTT — one Jacobian per step, and what their product does",
    caption:
      "The backward recursion on a 2-unit tanh RNN unrolled over six steps. Each step back multiplies by one W_hhᵀ and one diagonal of tanh′ values — watch the gradient norm shrink by a fixed factor every single time, because the same matrix is applied at every step. The final step sweeps the spectral radius of W_hh and plots the result on a log axis: geometric decay below 1, geometric growth above it, and a knife-edge in between that no initialization can hold.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const bpttTrace = build();
