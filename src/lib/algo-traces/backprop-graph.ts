import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Backpropagation through a computational graph, twice: once on the scalar
 * graph this lesson works by hand (w = 2, x = 3, y = 5 → ∂L/∂w = 6), then the
 * *same procedure* on the one-hidden-layer network.
 *
 * `ComputationalGraphViz` already draws the DAG, so this deliberately does not:
 * it shows the numbers moving through it, one cached value and one local
 * gradient at a time.
 *
 * The network's weights are small explicit constants rather than a seeded draw,
 * so every number here is checkable by hand — and they are chosen so one hidden
 * unit lands at z₁ = −0.1 and is switched off by the ReLU. That single dead unit
 * zeroes 5 of the 11 parameter gradients, which is the clearest available
 * demonstration of what `(z1 > 0)` actually does.
 *
 * Both payoffs are measured, not asserted: every analytic gradient is checked
 * against a central finite difference (worst relative error 3.9e-11), and the
 * forward-pass count that check costs (22) is compared against the one backward
 * pass backprop needs.
 */

const CODE = codeLines(`
def scalar_graph(w, x, y):
    # forward: cache every node
    z = w * x
    r = z - y
    L = r * r
    # backward: upstream x local
    dr = 2 * r
    dz = dr * 1
    dw = dz * x
    return L, dw

def forward(x, W1, b1, w2, b2, y):
    z1 = W1 @ x + b1
    a1 = relu(z1)
    z2 = w2 @ a1 + b2
    yh = sigmoid(z2)
    L = -(y*log(yh) + (1-y)*log(1-yh))
    return L, (z1, a1, z2, yh)

def backward(x, w2, y, cache):
    z1, a1, z2, yh = cache
    # BCE + sigmoid collapse to yh - y
    dz2 = yh - y
    dw2 = dz2 * a1
    db2 = dz2
    da1 = dz2 * w2
    dz1 = da1 * (z1 > 0)
    dW1 = outer(dz1, x)
    db1 = dz1
    return dW1, db1, dw2, db2
`);

const ln = lineFinder(CODE);

const fmt = (x: number, d = 3) => x.toFixed(d).replace("-", "−");

// --- the lesson's scalar graph -------------------------------------------
const SW = 2;
const SX = 3;
const SY = 5;
const SZ = SW * SX;
const SR = SZ - SY;
const SL = SR * SR;
const SDR = 2 * SR;
const SDZ = SDR * 1;
const SDW = SDZ * SX;
/** The closed form the lesson checks against: dL/dw = 2(wx − y)x. */
const SCLOSED = 2 * (SW * SX - SY) * SX;

// --- the one-hidden-layer network ----------------------------------------
const X = [1, 2, 3];
const Y = 1;
const W1: number[][] = [
  [0.2, -0.1, 0.4],
  [-0.3, 0.5, -0.2],
];
const B1 = [0.1, -0.2];
const W2 = [0.6, -0.4];
const B2 = 0.05;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

type Fwd = { z1: number[]; a1: number[]; z2: number; yh: number; L: number };
function forward(W1_: number[][], b1: number[], w2: number[], b2: number): Fwd {
  const z1 = W1_.map((row, i) => row.reduce((s, v, j) => s + v * X[j], 0) + b1[i]);
  const a1 = z1.map((v) => Math.max(0, v));
  const z2 = w2.reduce((s, v, i) => s + v * a1[i], 0) + b2;
  const yh = sigmoid(z2);
  const L = -(Y * Math.log(yh) + (1 - Y) * Math.log(1 - yh));
  return { z1, a1, z2, yh, L };
}

const F = forward(W1, B1, W2, B2);

// The backward pass, exactly as the listing writes it.
const DZ2 = F.yh - Y;
const DW2 = F.a1.map((v) => DZ2 * v);
const DB2 = DZ2;
const DA1 = W2.map((v) => DZ2 * v);
const DZ1 = DA1.map((v, i) => v * (F.z1[i] > 0 ? 1 : 0));
const DW1 = DZ1.map((g) => X.map((v) => g * v));
const DB1 = [...DZ1];

/** The two factors that cancel in the BCE + sigmoid collapse. */
const DL_DYH = (F.yh - Y) / (F.yh * (1 - F.yh));
const DYH_DZ2 = F.yh * (1 - F.yh);

// --- the finite-difference check -----------------------------------------

type Param = { name: string; analytic: number; perturb: (h: number) => Fwd };

const PARAMS: Param[] = [
  ...W1.flatMap((row, i) =>
    row.map((_, j) => ({
      name: `W₁[${i}][${j}]`,
      analytic: DW1[i][j],
      perturb: (h: number) => {
        const m = W1.map((r) => [...r]);
        m[i][j] += h;
        return forward(m, B1, W2, B2);
      },
    }))
  ),
  ...B1.map((_, i) => ({
    name: `b₁[${i}]`,
    analytic: DB1[i],
    perturb: (h: number) => {
      const b = [...B1];
      b[i] += h;
      return forward(W1, b, W2, B2);
    },
  })),
  ...W2.map((_, i) => ({
    name: `w₂[${i}]`,
    analytic: DW2[i],
    perturb: (h: number) => {
      const w = [...W2];
      w[i] += h;
      return forward(W1, B1, w, B2);
    },
  })),
  { name: "b₂", analytic: DB2, perturb: (h: number) => forward(W1, B1, W2, B2 + h) },
];

const H = 1e-6;
let FD_CALLS = 0;
const FD = PARAMS.map((p) => {
  const plus = p.perturb(H).L;
  const minus = p.perturb(-H).L;
  FD_CALLS += 2;
  const numeric = (plus - minus) / (2 * H);
  const den = Math.max(1e-12, Math.abs(numeric) + Math.abs(p.analytic));
  return { name: p.name, analytic: p.analytic, numeric, rel: Math.abs(numeric - p.analytic) / den };
});
const WORST = FD.reduce((a, b) => (b.rel > a.rel ? b : a));
const ZERO_GRADS = PARAMS.filter((p) => p.analytic === 0);

// ---------------------------------------------------------------------------

const nodeTable = (label: string, rows: [string, string, string][]): TraceComponent => ({
  t: "table",
  label,
  head: ["node", "value", "how"],
  v: rows.map((r) => ({ cells: r, cls: "good" as TraceCls })),
});

// ---------------------------------------------------------------------------

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Start with the scalar graph the lesson works by hand: L = (wx − y)² with w = ${SW}, x = ${SX}, y = ${SY}. The forward pass walks the graph in topological order and — this is the part that matters — **caches every intermediate**: z = ${fmt(SZ, 0)}, r = ${fmt(SR, 0)}, L = ${fmt(SL, 0)}. Nothing is thrown away, because each of those values is about to be needed again on the way back.`,
    ln("z = w * x", "r = z - y", "L = r * r"),
    nodeTable("forward pass", [
      ["z", fmt(SZ, 0), `w · x = ${SW} · ${SX}`],
      ["r", fmt(SR, 0), `z − y = ${SZ} − ${SY}`],
      ["L", fmt(SL, 0), `r² = ${SR}²`],
    ]),
    {
      t: "note",
      text: "Every node stores its output. That cache is the entire reason a single backward pass can produce every gradient — the alternative is recomputing the forward values once per parameter.",
    }
  );

  push(
    `Backward, starting from ∂L/∂L = 1 and multiplying **upstream × local** at each node. ∂L/∂r = 1 · 2r = ${fmt(SDR, 0)}; ∂L/∂z = ${fmt(SDR, 0)} · 1 = ${fmt(SDZ, 0)} (subtraction passes gradient through unchanged); ∂L/∂w = ${fmt(SDZ, 0)} · x = ${fmt(SDW, 0)}. Check it against the closed form 2(wx − y)x = ${fmt(SCLOSED, 0)} — they agree. Note that the local gradient at each node is a function of the *cached* forward value: 2r needs r, and ∂z/∂w needs x.`,
    ln("dr = 2 * r", "dz = dr * 1", "dw = dz * x"),
    {
      t: "table",
      label: "backward pass — upstream × local",
      head: ["node", "upstream", "local", "∂L/∂·"],
      v: [
        { cells: ["L", "—", "1", "1"], cls: "dim" },
        { cells: ["r", "1", `2r = ${fmt(SDR, 0)}`, fmt(SDR, 0)], cls: "good" },
        { cells: ["z", fmt(SDR, 0), "∂r/∂z = 1", fmt(SDZ, 0)], cls: "good" },
        { cells: ["w", fmt(SDZ, 0), `∂z/∂w = x = ${SX}`, fmt(SDW, 0)], cls: "active" },
      ],
    },
    {
      t: "kv",
      label: "check",
      v: [
        { k: "backprop ∂L/∂w", v: fmt(SDW, 0), cls: "active" },
        { k: "closed form 2(wx−y)x", v: fmt(SCLOSED, 0), cls: "good" },
      ],
    }
  );

  push(
    `Now the identical procedure on a network. Two hidden units, x = (${X.join(", ")}), y = ${Y}, and small explicit weights so every number stays checkable. The first layer gives z₁ = (${F.z1.map((v) => fmt(v, 2)).join(", ")}) — and look at the second component: **${fmt(F.z1[1], 1)}, which is negative**. ReLU clamps it, so a₁ = (${F.a1.map((v) => fmt(v, 2)).join(", ")}). That unit is switched off, and it will matter enormously on the way back.`,
    ln("z1 = W1 @ x + b1", "a1 = relu(z1)"),
    nodeTable("layer 1", [
      ["z₁[0]", fmt(F.z1[0], 4), "W₁[0]·x + b₁[0]"],
      ["z₁[1]", fmt(F.z1[1], 4), "W₁[1]·x + b₁[1] — negative"],
      ["a₁[0]", fmt(F.a1[0], 4), "ReLU passes it through"],
      ["a₁[1]", fmt(F.a1[1], 4), "ReLU clamps it to zero"],
    ]),
    {
      t: "bars",
      label: "pre-activation z₁ against activation a₁",
      v: [
        { k: "z₁[0]", val: Math.abs(F.z1[0]), show: fmt(F.z1[0], 4), cls: "good" },
        { k: "a₁[0]", val: Math.abs(F.a1[0]), show: fmt(F.a1[0], 4), cls: "good" },
        { k: "z₁[1]", val: Math.abs(F.z1[1]), show: fmt(F.z1[1], 4), cls: "bad" },
        { k: "a₁[1]", val: Math.abs(F.a1[1]), show: fmt(F.a1[1], 4), cls: "bad" },
      ],
      max: 1.4,
    }
  );

  push(
    `Finish the forward pass. z₂ = w₂·a₁ + b₂ = ${fmt(F.z2, 4)} — note the dead unit contributes exactly nothing to this sum regardless of what w₂[1] is. Then ŷ = σ(z₂) = ${fmt(F.yh, 6)} and the binary cross-entropy L = ${fmt(F.L, 6)}. Four cached tensors go into the backward pass: z₁, a₁, z₂ and ŷ.`,
    ln("z2 = w2 @ a1 + b2", "yh = sigmoid(z2)", "L = -(y*log(yh)"),
    nodeTable("forward pass complete", [
      ["z₂", fmt(F.z2, 6), `w₂·a₁ + b₂`],
      ["ŷ", fmt(F.yh, 6), "σ(z₂)"],
      ["L", fmt(F.L, 6), "−ln ŷ  (since y = 1)"],
    ]),
    {
      t: "note",
      text: "ŷ ≈ 0.70 against a target of 1 — the network is right-ish but under-confident, so the gradients below all push in the same direction.",
    }
  );

  push(
    `The first backward step, and the one worth slowing down for. Taken separately the two local gradients are both awkward: ∂L/∂ŷ = (ŷ−y)/(ŷ(1−ŷ)) = ${fmt(DL_DYH, 4)}, and ∂ŷ/∂z₂ = ŷ(1−ŷ) = ${fmt(DYH_DZ2, 4)}. But their product is ${fmt(DL_DYH, 4)} · ${fmt(DYH_DZ2, 4)} = **${fmt(DZ2, 6)}**, which is exactly ŷ − y = ${fmt(F.yh, 6)} − ${Y}. The ŷ(1−ŷ) cancels. That is why every framework fuses sigmoid with BCE into one op — not just for speed, but because the fused form is numerically stable where the separate ones divide by ŷ(1−ŷ) → 0.`,
    ln("dz2 = yh - y"),
    {
      t: "table",
      label: "the collapse",
      head: ["term", "value"],
      v: [
        { cells: ["∂L/∂ŷ = (ŷ−y)/(ŷ(1−ŷ))", fmt(DL_DYH, 6)], cls: "warn" },
        { cells: ["∂ŷ/∂z₂ = ŷ(1−ŷ)", fmt(DYH_DZ2, 6)], cls: "warn" },
        { cells: ["product", fmt(DL_DYH * DYH_DZ2, 6)], cls: "good" },
        { cells: ["ŷ − y", fmt(DZ2, 6)], cls: "active" },
      ],
    }
  );

  push(
    `From here every line is upstream × a cached forward value, and nothing else. ∂L/∂w₂ = ∂L/∂z₂ · a₁ = (${DW2.map((v) => fmt(v, 4)).join(", ")}) — the second entry is zero because a₁[1] is zero, so w₂[1] gets no gradient at all. ∂L/∂b₂ = ∂L/∂z₂ · 1 = ${fmt(DB2, 6)}. ∂L/∂a₁ = ∂L/∂z₂ · w₂ = (${DA1.map((v) => fmt(v, 4)).join(", ")}), and **both entries here are non-zero**.`,
    ln("dw2 = dz2 * a1", "db2 = dz2", "da1 = dz2 * w2"),
    {
      t: "table",
      label: "output layer gradients",
      head: ["", "upstream", "local (cached)", "∂L/∂·"],
      v: [
        { cells: ["w₂[0]", fmt(DZ2, 4), `a₁[0] = ${fmt(F.a1[0], 3)}`, fmt(DW2[0], 6)], cls: "good" },
        { cells: ["w₂[1]", fmt(DZ2, 4), `a₁[1] = ${fmt(F.a1[1], 3)}`, fmt(DW2[1], 6)], cls: "bad" },
        { cells: ["b₂", fmt(DZ2, 4), "1", fmt(DB2, 6)], cls: "good" },
        { cells: ["a₁[0]", fmt(DZ2, 4), `w₂[0] = ${fmt(W2[0], 2)}`, fmt(DA1[0], 6)], cls: "good" },
        { cells: ["a₁[1]", fmt(DZ2, 4), `w₂[1] = ${fmt(W2[1], 2)}`, fmt(DA1[1], 6)], cls: "warn" },
      ],
    }
  );

  push(
    `The ReLU gate, which is the sharpest thing in this whole pass. ∂L/∂a₁ = (${DA1.map((v) => fmt(v, 4)).join(", ")}) — the loss is genuinely sensitive to the second activation; if a₁[1] could change, L would change at rate ${fmt(DA1[1], 4)}. But it cannot change, because z₁[1] = ${fmt(F.z1[1], 1)} sits on the flat side of the ReLU. Multiplying by (z₁ > 0) = (${F.z1.map((v) => (v > 0 ? "1" : "0")).join(", ")}) gives ∂L/∂z₁ = (${DZ1.map((v) => fmt(v, 4)).join(", ")}). **Non-zero sensitivity to the activation, exactly zero gradient to the pre-activation.** Those are different quantities and the gate is what separates them.`,
    ln("dz1 = da1 * (z1 > 0)"),
    {
      t: "table",
      label: "the gate",
      head: ["unit", "z₁", "ReLU′", "∂L/∂a₁", "∂L/∂z₁"],
      v: F.z1.map((z, i) => ({
        cells: [String(i), fmt(z, 3), z > 0 ? "1" : "0", fmt(DA1[i], 6), fmt(DZ1[i], 6)],
        cls: (z > 0 ? "good" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "This is the mechanism behind dying ReLU: a unit pushed to the flat side stops receiving gradient, so nothing can push it back — the gradient that would fix it is precisely the one being zeroed.",
      cls: "warn",
    }
  );

  push(
    `Last step, and the damage becomes visible. ∂L/∂W₁ = outer(∂L/∂z₁, x), so each row of W₁ gets its unit's gradient scaled by the input vector — and the second row is the outer product of **zero** with x, which is all zeros. ∂L/∂b₁ = ∂L/∂z₁ has the same hole. Count it up: **${ZERO_GRADS.length} of the ${PARAMS.length} parameters** in this network receive a gradient of exactly zero this step, all of them traceable to one hidden unit sitting at z₁ = ${fmt(F.z1[1], 1)}.`,
    ln("dW1 = outer(dz1, x)", "db1 = dz1"),
    {
      t: "table",
      label: "∂L/∂W₁ = outer(∂L/∂z₁, x)",
      head: ["", `x=${X[0]}`, `x=${X[1]}`, `x=${X[2]}`, "∂L/∂b₁"],
      v: DW1.map((row, i) => ({
        cells: [`row ${i}`, ...row.map((v) => fmt(v, 5)), fmt(DB1[i], 5)],
        cls: (DZ1[i] === 0 ? "bad" : "good") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: `all ${PARAMS.length} parameter gradients — bar is |∂L/∂·|, number is signed`,
      v: PARAMS.map((p) => ({
        k: p.name,
        val: Math.abs(p.analytic),
        show: fmt(p.analytic, 5),
        cls: (p.analytic === 0 ? "bad" : "good") as TraceCls,
      })),
    }
  );

  push(
    `Payoff one: is any of this actually right? Perturb each parameter by ±h = 10⁻⁶, recompute the loss, and compare (L₊ − L₋)/2h against what backprop claimed. Across all ${PARAMS.length} parameters the worst relative disagreement is **${WORST.rel.toExponential(1)}** (at ${WORST.name}) — that is floating-point noise, not error. The five zero gradients come back as exact zeros numerically too, which is the real confirmation that the ReLU gate is doing something structural rather than merely producing a small number.`,
    ln("return dW1, db1, dw2, db2"),
    {
      t: "table",
      label: "analytic vs central finite difference (h = 10⁻⁶)",
      head: ["parameter", "backprop", "numeric", "rel. error"],
      v: FD.map((r) => ({
        cells: [r.name, fmt(r.analytic, 7), fmt(r.numeric, 7), r.rel === 0 ? "0" : r.rel.toExponential(1)],
        cls: (r.analytic === 0 ? "bad" : r.rel > 1e-8 ? "warn" : "good") as TraceCls,
      })),
    }
  );

  push(
    `Payoff two: what that check cost. Verifying ${PARAMS.length} gradients by finite differences took **${FD_CALLS} forward passes** — two per parameter, and each one recomputes the entire network from scratch. Backprop produced all ${PARAMS.length} in **one** backward pass, because every local gradient it needed was already sitting in the cache from the forward pass: 2r needed r, ∂L/∂w₂ needed a₁, ∂L/∂z₁ needed z₁, ∂L/∂W₁ needed x. On this toy network the ratio is ${Math.round(FD_CALLS / 1)}:1. On a network with 10⁹ parameters it is 2 × 10⁹ : 1 — which is the entire reason deep learning is possible at all.`,
    ln("return L, (z1, a1, z2, yh)", "z1, a1, z2, yh = cache"),
    {
      t: "bars",
      label: `passes needed to get all ${PARAMS.length} gradients`,
      v: [
        { k: "finite differences", val: FD_CALLS, show: `${FD_CALLS} forward passes`, cls: "bad" },
        { k: "backpropagation", val: 1, show: "1 backward pass", cls: "good" },
      ],
    },
    {
      t: "table",
      label: "how the ratio scales",
      head: ["parameters", "finite differences", "backprop"],
      v: [
        { cells: [String(PARAMS.length), `${FD_CALLS} passes`, "1 pass"], cls: "active" },
        { cells: ["10³", "2 000 passes", "1 pass"], cls: "dim" },
        { cells: ["10⁹", "2 × 10⁹ passes", "1 pass"], cls: "dim" },
      ],
    },
    {
      t: "note",
      text: "Finite differences are still worth writing once, as a test. Every autodiff framework ships a gradcheck for exactly this reason — it is too slow to train with and too useful to skip when you have hand-written a backward pass.",
    }
  );

  return {
    id: "backprop-computational-graph",
    title: "Backpropagation through a computational graph, checked against finite differences",
    caption:
      "The scalar graph worked by hand above (w = 2, x = 3, y = 5 → ∂L/∂w = 6), then the identical procedure on the one-hidden-layer network. The weights are small explicit constants so every number is checkable, and they put one hidden unit at z₁ = −0.1: watch that unit get switched off by the ReLU and take 5 of the network's 11 parameter gradients to exactly zero with it — while ∂L/∂a₁ for the same unit stays non-zero, which is the distinction the gate exists to draw. The last two frames verify every gradient against a central finite difference (worst relative error 3.9e-11) and count what that verification cost: 22 forward passes against backprop's one.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const backpropGraphTrace = build();
