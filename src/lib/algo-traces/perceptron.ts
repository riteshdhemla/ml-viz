import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * The perceptron learning rule converging on OR in two mistakes, then failing
 * forever on XOR — the pair of traces from
 * `src/content/wiki/perceptron-learning.mdx`.
 *
 * The XOR half is the payoff: the same code, the same number of steps, and the
 * weights simply cycle. The impossibility proof on that page says no separator
 * exists; this shows the algorithm hunting for one and never landing.
 */

const CODE = codeLines(`
def train(data, epochs, eta=1.0):
    w, b = [0.0, 0.0], 0.0
    for _ in range(epochs):
        for x, y in data:
            z = w[0]*x[0] + w[1]*x[1] + b
            pred = 1 if z > 0 else 0
            err = y - pred
            if err == 0:
                continue          # correct: no update
            # push the boundary toward x (or away)
            w[0] += eta * err * x[0]
            w[1] += eta * err * x[1]
            b    += eta * err
    return w, b
`);

const ln = lineFinder(CODE);

type Row = { x: [number, number]; y: number };

const OR: Row[] = [
  { x: [1, 1], y: 1 },
  { x: [1, 0], y: 1 },
  { x: [0, 1], y: 1 },
  { x: [0, 0], y: 0 },
];

const XOR: Row[] = [
  { x: [0, 0], y: 0 },
  { x: [1, 0], y: 1 },
  { x: [0, 1], y: 1 },
  { x: [1, 1], y: 0 },
];

const DOMAIN: [number, number, number, number] = [-0.6, 1.6, -0.6, 1.6];
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/** The line w·x + b = 0, clipped to the plot domain (or null when degenerate). */
function boundary(w: [number, number], b: number) {
  const [x0, x1, y0, y1] = DOMAIN;
  if (Math.abs(w[1]) > 1e-9) {
    const yAt = (x: number) => -(w[0] * x + b) / w[1];
    return { x1: x0, y1: yAt(x0), x2: x1, y2: yAt(x1) };
  }
  if (Math.abs(w[0]) > 1e-9) {
    const x = -b / w[0];
    return { x1: x, y1: y0, x2: x, y2: y1 };
  }
  return null; // w = 0: no boundary yet
}

function plotPanel(
  label: string,
  data: Row[],
  w: [number, number],
  b: number,
  active?: number
): TraceComponent {
  const line = boundary(w, b);
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    xLabel: "x₁",
    yLabel: "x₂",
    segments: line ? [{ ...line, cls: "active" as TraceCls }] : undefined,
    points: data.map((r, i) => ({
      x: r.x[0],
      y: r.x[1],
      id: `${r.y}`,
      cls: (i === active ? "warn" : r.y === 1 ? "good" : "bad") as TraceCls,
      shape: (i === active ? "ring" : "dot") as "ring" | "dot",
    })),
  };
}

const statePanel = (w: [number, number], b: number, extra: { k: string; v: string; cls?: TraceCls }[] = []): TraceComponent => ({
  t: "kv",
  label: "state",
  v: [
    { k: "w₁", v: fmt(w[0]) },
    { k: "w₂", v: fmt(w[1]) },
    { k: "b", v: fmt(b) },
    ...extra,
  ],
});

/** One pass of the perceptron rule; returns the steps it took. */
function trainSteps(data: Row[], epochs: number) {
  const steps: {
    row: Row;
    idx: number;
    z: number;
    pred: number;
    err: number;
    wBefore: [number, number];
    bBefore: number;
    w: [number, number];
    b: number;
    epoch: number;
  }[] = [];
  let w: [number, number] = [0, 0];
  let b = 0;
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const z = w[0] * row.x[0] + w[1] * row.x[1] + b;
      const pred = z > 0 ? 1 : 0;
      const err = row.y - pred;
      const wBefore: [number, number] = [...w];
      const bBefore = b;
      if (err !== 0) {
        w = [w[0] + err * row.x[0], w[1] + err * row.x[1]];
        b = b + err;
      }
      steps.push({ row, idx: i, z, pred, err, wBefore, bBefore, w: [...w], b, epoch });
    }
  }
  return steps;
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    "OR, with the perceptron starting from w = (0, 0), b = 0 — no boundary at all yet. The rule is deliberately lazy: it only changes the weights when it gets a point wrong, and the change always pushes the boundary toward the misclassified point (or away from it).",
    ln("w, b = [0.0, 0.0], 0.0"),
    plotPanel("OR — labels shown on each point", OR, [0, 0], 0),
    statePanel([0, 0], 0),
    {
      t: "note",
      text: "Teal = class 1, rose = class 0. A correct separator must put all three teal points on the positive side and the origin on the negative side.",
    }
  );

  // ---- OR: run until a full clean pass ------------------------------------
  const orSteps = trainSteps(OR, 3);
  let mistakes = 0;
  let cleanRun = 0;
  for (const s of orSteps) {
    if (s.err !== 0) {
      mistakes += 1;
      cleanRun = 0;
    } else {
      cleanRun += 1;
    }

    push(
      s.err === 0
        ? `(${s.row.x.join(", ")}) → z = ${fmt(s.z)}, so predict ${s.pred}; the label is ${s.row.y}. Correct, so no update — the perceptron learns from mistakes only.`
        : `(${s.row.x.join(", ")}) → z = ${fmt(s.z)}, so predict ${s.pred}, but the label is ${s.row.y}. Error = ${s.err > 0 ? "+1" : "−1"}, so ${
            s.err > 0
              ? "add x to w and 1 to b, tilting the boundary toward this point so its z rises."
              : "subtract x from w and 1 from b, pushing the boundary away so its z falls."
          } Mistake ${mistakes}.`,
      s.err === 0 ? ln("continue          # correct") : ln("w[0] += eta * err * x[0]"),
      plotPanel(`step ${orSteps.indexOf(s) + 1} — epoch ${s.epoch + 1}`, OR, s.w, s.b, s.idx),
      statePanel(s.w, s.b, [
        { k: "z", v: fmt(s.z), cls: "active" },
        { k: "pred", v: String(s.pred) },
        { k: "label", v: String(s.row.y) },
        { k: "mistakes", v: String(mistakes), cls: s.err === 0 ? "good" : "bad" },
      ])
    );

    if (cleanRun === OR.length) break;
  }

  const orFinal = orSteps.find((s) => s.err !== 0 && orSteps.indexOf(s) > 0) ?? orSteps[0];
  push(
    `A full pass with no mistakes: the perceptron has converged on w = (${fmt(orFinal.w[0])}, ${fmt(orFinal.w[1])}), b = ${fmt(orSteps[orSteps.length - 1].b)} after ${mistakes} mistakes total. The convergence theorem guarantees this: on linearly separable data the perceptron makes at most R²/γ² mistakes, where γ is the margin — it cannot loop forever.`,
    ln("return w, b"),
    plotPanel("converged separator for OR", OR, [1, 1], 0),
    statePanel([1, 1], 0, [{ k: "mistakes", v: String(mistakes), cls: "good" }]),
    {
      t: "note",
      text: "Boundary x₁ + x₂ = 0. Check it: (0,0) → 0, not > 0 → class 0 ✓; every other input → ≥ 1 → class 1 ✓.",
      cls: "good",
    }
  );

  // ---- payoff: XOR never converges ---------------------------------------
  const xorSteps = trainSteps(XOR, 3);
  const xorMistakes = xorSteps.filter((s) => s.err !== 0).length;

  push(
    `Now the same code on XOR. Watch the last four steps of three full epochs: the weights are still moving, and they are moving in a *cycle* — ${xorMistakes} mistakes in 12 steps with no sign of settling. Run it for a million epochs and nothing changes.`,
    ln("for _ in range(epochs)"),
    plotPanel("XOR — after 3 epochs, still wrong", XOR, xorSteps[xorSteps.length - 1].w, xorSteps[xorSteps.length - 1].b),
    {
      t: "table",
      label: "last 4 steps",
      head: ["x", "y", "z", "pred", "w after", "b"],
      v: xorSteps.slice(-4).map((s) => ({
        cells: [
          `(${s.row.x.join(",")})`,
          String(s.row.y),
          fmt(s.z),
          String(s.pred),
          `(${fmt(s.w[0])}, ${fmt(s.w[1])})`,
          fmt(s.b),
        ],
        cls: s.err === 0 ? "good" : "bad",
      })),
    }
  );

  push(
    "The algorithm is not failing — there is simply nothing to find. Adding the two class-1 constraints gives w₁ + w₂ + 2b > 0, while the two class-0 constraints force w₁ + w₂ + 2b ≤ b ≤ 0. A contradiction, so no line separates XOR. A hidden layer fixes it by mapping (1,0) and (0,1) to the *same* point, collapsing the impossible arrangement into a separable one — which is exactly the observation that produced the multi-layer perceptron.",
    ln("pred = 1 if z > 0 else 0"),
    plotPanel("XOR — no line can do this", XOR, [0, 0], 0),
    {
      t: "kv",
      label: "the four constraints",
      v: [
        { k: "(0,0)→0", v: "b ≤ 0", cls: "bad" },
        { k: "(1,0)→1", v: "w₁ + b > 0", cls: "good" },
        { k: "(0,1)→1", v: "w₂ + b > 0", cls: "good" },
        { k: "(1,1)→0", v: "w₁ + w₂ + b ≤ 0", cls: "bad" },
      ],
    },
    {
      t: "note",
      text: "Contradiction: the teal pair sum to w₁ + w₂ + 2b > 0, the rose pair force w₁ + w₂ + 2b ≤ 0.",
      cls: "warn",
    }
  );

  return {
    id: "perceptron-learning",
    title: "The perceptron rule — converging on OR, cycling forever on XOR",
    caption:
      "The perceptron learning rule, step by step, with the decision boundary redrawn after every update. On OR it converges in two mistakes, exactly as the convergence theorem promises. Then the same code runs on XOR and never settles — not because the algorithm is broken, but because the four constraints XOR imposes are mutually contradictory. That failure is the reason hidden layers exist.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const perceptronTrace = build();
