import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * How a framework's autograd actually works: the tape, the topological order,
 * and the `+=` that everything depends on.
 *
 * The lesson on backpropagation shows the chain rule moving through a graph the
 * reader draws by hand. This trace shows the part the framework does instead —
 * building that graph as a side effect of the forward pass, then replaying it.
 * It is deliberately a *different* question from `backprop-computational-graph`:
 * that one asks "what are the gradients?", this one asks "what data structure
 * produces them, and what breaks if you get it wrong?"
 *
 * The expression is chosen so the answer is not obtainable by walking a chain:
 *
 *     a = w · x        h = tanh(a)        o = w · h
 *     d = o − t        L = d · d
 *
 * **w is used twice** — once at the input and once at the output. That is weight
 * sharing, the same structure an RNN has across timesteps and a convolution has
 * across positions, and it is exactly the case where "apply the chain rule"
 * stops being sufficient: w's gradient is a *sum over paths*, and the two paths
 * reach it at different depths. `d` is a second, shallower instance of the same
 * thing (L = d·d references d twice), which is why the accumulation rule hands
 * back the familiar 2d without anyone writing a `square` rule.
 *
 * Every number is recorded from the real micro-autograd implemented below, and
 * the last frame checks the result against a central finite difference:
 *
 *     accumulated (+=)   ∂L/∂w = −1.0775324462   rel. err 2.9e-11
 *     overwritten (=)    ∂L/∂w = −0.1848146920   rel. err 8.3e-01
 *
 * The overwrite bug is the payoff. It is not a crash and not a NaN: it silently
 * returns 17.2% of the correct gradient, which is the kind of thing that trains
 * to a worse model and never announces itself. Note that 17.2% is smaller than
 * the 34.3% that w's own two paths would explain, because L = d·d is a fan-out
 * as well and collapses from 2d to d in the same run — one broken `+=` corrupts
 * every fan-out in the graph at once.
 */

const CODE = codeLines(`
class Node:
    def __init__(self, v, src=()):
        self.v = v      # forward value
        self.g = 0.0    # accumulated grad
        self.src = src  # (parent, local grad)

def mul(a, b):
    # locals captured at RECORD time
    return Node(a.v * b.v, (
        (a, lambda g: g * b.v),
        (b, lambda g: g * a.v)))

def sub(a, b):
    return Node(a.v - b.v, (
        (a, lambda g:  g),
        (b, lambda g: -g)))

def tanh(a):
    t = math.tanh(a.v)
    return Node(t, (
        (a, lambda g: g * (1 - t * t)),))

def toposort(out):
    order, seen = [], set()
    def visit(n):
        if id(n) in seen: return
        seen.add(id(n))
        for p, _ in n.src:
            visit(p)
        order.append(n)   # parents first
    visit(out)
    return order

def backward(out):
    order = toposort(out)
    out.g = 1.0
    for n in reversed(order):
        for parent, local in n.src:
            parent.g += local(n.g)
`);

const ln = lineFinder(CODE);

const fmt = (x: number, d = 6) => {
  const s = x.toFixed(d);
  return (s.startsWith("-") ? s.replace("-", "−") : s).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};

// --- a real micro-autograd -------------------------------------------------

interface Node {
  name: string;
  v: number;
  g: number;
  /** op that produced this node, for the tape display */
  op: string;
  /** parents paired with the local derivative captured at record time */
  src: { parent: Node; local: (g: number) => number }[];
}

/** The tape: every node in the order the forward pass created it. */
let TAPE: Node[] = [];

function leaf(name: string, v: number): Node {
  const n: Node = { name, v, g: 0, op: "leaf", src: [] };
  TAPE.push(n);
  return n;
}

function record(name: string, op: string, v: number, src: Node["src"]): Node {
  const n: Node = { name, v, g: 0, op, src };
  TAPE.push(n);
  return n;
}

const mul = (name: string, a: Node, b: Node) =>
  record(name, `${a.name}·${b.name}`, a.v * b.v, [
    { parent: a, local: (g) => g * b.v },
    { parent: b, local: (g) => g * a.v },
  ]);

const sub = (name: string, a: Node, b: Node) =>
  record(name, `${a.name}−${b.name}`, a.v - b.v, [
    { parent: a, local: (g) => g },
    { parent: b, local: (g) => -g },
  ]);

const tanhOp = (name: string, a: Node) => {
  const t = Math.tanh(a.v);
  return record(name, `tanh(${a.name})`, t, [{ parent: a, local: (g) => g * (1 - t * t) }]);
};

/** Depth-first post-order: a node is appended only after all its parents. */
function toposort(out: Node): Node[] {
  const order: Node[] = [];
  const seen = new Set<Node>();
  const visit = (n: Node) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const s of n.src) visit(s.parent);
    order.push(n);
  };
  visit(out);
  return order;
}

// --- the run being traced --------------------------------------------------
const W0 = 0.7;
const X0 = 1.5;
const T0 = 1.0;

TAPE = [];
const w = leaf("w", W0);
const x = leaf("x", X0);
const tgt = leaf("t", T0);
const a = mul("a", w, x);
const h = tanhOp("h", a);
const o = mul("o", w, h);
const d = sub("d", o, tgt);
const L = mul("L", d, d);

const ORDER = toposort(L);
const REVERSED = [...ORDER].reverse();

/**
 * The backward pass, replayed one *node* at a time so each frame can show the
 * gradient column changing. Returns the running contributions so the trace can
 * name which push landed where.
 */
interface Push {
  from: string;
  to: string;
  delta: number;
  after: number;
}

/**
 * Keyed by the node being processed rather than by position: the reverse order
 * also contains leaves, which push nothing, so positional indices would not
 * line up with the frames.
 */
const PUSHES: Record<string, Push[]> = {};
/** Every gradient as it stood after that node finished pushing. */
const GRAD_AT: Record<string, Record<string, number>> = {};
/** Flat push log, in execution order. */
const PUSH_LOG: Push[] = [];

{
  const g: Record<string, number> = {};
  for (const n of TAPE) g[n.name] = 0;
  g[L.name] = 1;
  GRAD_AT["seed"] = { ...g };

  L.g = 1;
  for (const n of REVERSED) {
    const step: Push[] = [];
    for (const s of n.src) {
      const delta = s.local(n.g);
      s.parent.g += delta;
      const rec = { from: n.name, to: s.parent.name, delta, after: s.parent.g };
      step.push(rec);
      PUSH_LOG.push(rec);
      g[s.parent.name] = s.parent.g;
    }
    PUSHES[n.name] = step;
    GRAD_AT[n.name] = { ...g };
  }
}

const W_GRAD = w.g;
const W_PUSHES = PUSH_LOG.filter((p) => p.to === "w");

/**
 * The overwrite bug, actually run rather than estimated: the same traversal with
 * `parent.g = ...` in place of `parent.g += ...`.
 *
 * Simulating it only on w's two pushes would understate it. `L = mul(d, d)` is a
 * fan-out too, so d also collapses from 2d to d, and the two errors compound —
 * the returned gradient is 17.2% of the truth, not the 34.3% that w's paths
 * alone would suggest. Both numbers are reported in the payoff frame because the
 * difference between them is itself the lesson: one broken `+=` corrupts every
 * fan-out in the graph, not just the one you were thinking about.
 */
function backwardOverwrite(): { w: number; d: number } {
  const g = new Map<Node, number>();
  for (const n of TAPE) g.set(n, 0);
  g.set(L, 1);
  for (const n of REVERSED) {
    for (const s of n.src) g.set(s.parent, s.local(g.get(n) ?? 0));
  }
  return { w: g.get(w) ?? 0, d: g.get(d) ?? 0 };
}
const OVERWRITE = backwardOverwrite();
const W_OVERWRITE = OVERWRITE.w;
/** What w alone would lose if only its own fan-out collapsed. */
const W_OVERWRITE_OWN_PATH_ONLY = W_PUSHES[W_PUSHES.length - 1].delta;

// --- the check -------------------------------------------------------------
const forwardL = (wv: number) => {
  const av = wv * X0;
  const hv = Math.tanh(av);
  const ov = wv * hv;
  const dv = ov - T0;
  return dv * dv;
};
const FD_H = 1e-6;
const FD = (forwardL(W0 + FD_H) - forwardL(W0 - FD_H)) / (2 * FD_H);
const REL_OK = Math.abs(W_GRAD - FD) / Math.abs(FD);
const REL_BAD = Math.abs(W_OVERWRITE - FD) / Math.abs(FD);

// --- rendering helpers -----------------------------------------------------

const tapeTable = (upto: number, activeName?: string) => ({
  t: "table" as const,
  label: `the tape — ${upto} node${upto === 1 ? "" : "s"} recorded so far`,
  head: ["#", "node", "op", "value", "parents"],
  v: TAPE.slice(0, upto).map((n, i) => ({
    cells: [
      String(i),
      n.name,
      n.op === "leaf" ? "input" : n.op,
      fmt(n.v),
      n.src.length ? n.src.map((s) => s.parent.name).join(", ") : "—",
    ],
    cls: (n.name === activeName ? "active" : n.op === "leaf" ? "dim" : "good") as TraceCls,
  })),
});

/** `after` names the node whose pushes have just completed (or "seed"). */
const gradTable = (after: string, activeNames: string[] = []) => ({
  t: "table" as const,
  label: "gradients so far",
  head: ["node", "value", "∂L/∂·"],
  v: TAPE.map((n) => ({
    cells: [n.name, fmt(n.v), fmt(GRAD_AT[after][n.name] ?? 0)],
    cls: (activeNames.includes(n.name)
      ? "active"
      : (GRAD_AT[after][n.name] ?? 0) === 0
        ? "dim"
        : "good") as TraceCls,
  })),
});

// ---------------------------------------------------------------------------

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `The expression, and why this one. a = w·x, h = tanh(a), o = w·h, d = o − t, L = d·d, with w = ${fmt(W0, 2)}, x = ${fmt(X0, 2)}, t = ${fmt(T0, 2)}. Look at where **w** appears: once at the very bottom feeding the tanh, and again near the top multiplying its output. One parameter, two uses. That is weight sharing — the same structure an RNN has across timesteps — and it is precisely the case where "just apply the chain rule" stops being a complete instruction, because w's gradient is a sum over two paths of different lengths.`,
    ln("class Node:"),
    {
      t: "kv",
      label: "inputs",
      v: [
        { k: "w", v: fmt(W0, 2), cls: "active" },
        { k: "x", v: fmt(X0, 2) },
        { k: "t", v: fmt(T0, 2) },
      ],
    },
    {
      t: "note",
      text: "A framework does not read your expression. It has no idea a formula exists — it only sees a sequence of operations being called, and it writes each one down as it happens. That written record is the tape.",
    }
  );

  push(
    `Every op does two things, and the second is the one that matters. \`mul(w, x)\` computes the value ${fmt(W0)} · ${fmt(X0)} = ${fmt(a.v)}, and it also stores **how to turn an incoming gradient into gradients for its parents** — the two lambdas. Note what those lambdas close over: \`b.v\` and \`a.v\`, the input values, *captured now, during the forward pass*. This is why frameworks hold on to activations and why memory scales with the depth of your network: the backward pass needs numbers only the forward pass knew.`,
    ln("return Node(a.v * b.v, (", "(a, lambda g: g * b.v),"),
    tapeTable(4, "a"),
    {
      t: "kv",
      label: "recorded with node a",
      v: [
        { k: "value", v: fmt(a.v), cls: "good" },
        { k: "∂a/∂w", v: `x = ${fmt(X0, 2)}`, cls: "active" },
        { k: "∂a/∂x", v: `w = ${fmt(W0, 2)}`, cls: "active" },
      ],
    }
  );

  push(
    `h = tanh(a) = ${fmt(h.v)}. The tanh rule captures **t**, its own output, because 1 − t² is the cheapest form of the derivative. Frameworks pick their stored quantity per op: tanh and sigmoid keep the output, ReLU keeps only the sign bit, matmul keeps both inputs. What gets kept is a memory decision made at record time, and it is the thing gradient checkpointing later trades away.`,
    ln("t = math.tanh(a.v)", "(a, lambda g: g * (1 - t * t)),)"),
    tapeTable(5, "h"),
    {
      t: "kv",
      label: "recorded with node h",
      v: [
        { k: "value t", v: fmt(h.v), cls: "good" },
        { k: "∂h/∂a = 1 − t²", v: fmt(1 - h.v * h.v), cls: "active" },
      ],
    }
  );

  push(
    `o = w · h = ${fmt(o.v)} — and **here is the fan-out**. This call passes \`w\`, the same object that node a already points at. The tape does not copy it or complain; it just records a second edge into the same node. w now has two children, a and o, and nothing anywhere in the data structure treats that as unusual. The graph stopped being a chain the moment this line ran.`,
    ln("def mul(a, b):"),
    tapeTable(6, "o"),
    {
      t: "kv",
      label: "edges into w",
      v: [
        { k: "from a", v: "∂a/∂w = x", cls: "warn" },
        { k: "from o", v: "∂o/∂w = h", cls: "warn" },
      ],
    },
    {
      t: "note",
      text: "This is the whole reason autodiff is graph machinery rather than a chain rule loop. A chain has one path from parameter to loss; this has two, and the answer is their sum.",
      cls: "warn",
    }
  );

  push(
    `Finish the forward pass: d = o − t = ${fmt(d.v)}, then L = d · d = ${fmt(L.v)}. That last line is a *second* fan-out, a shallower one — \`mul(d, d)\` passes the same node as both arguments, so d also has two edges into it. Watch it produce the familiar factor of 2 later without anyone having written a rule for squaring. The forward pass is now done and the user has their loss; the tape sitting behind it is ${TAPE.length} nodes long.`,
    ln("def sub(a, b):", "return Node(a.v - b.v, ("),
    tapeTable(TAPE.length, "L"),
    {
      t: "kv",
      label: "forward result",
      v: [
        { k: "L", v: fmt(L.v), cls: "good" },
        { k: "tape length", v: String(TAPE.length) },
      ],
    }
  );

  push(
    `Before anything can go backward the nodes have to be put in an order. \`toposort\` walks parents first and appends each node *after* all of its parents, giving ${ORDER.map((n) => n.name).join(" → ")}. Reverse it and you get the order the backward pass uses: ${REVERSED.map((n) => n.name).join(" → ")}. The rule this enforces is the one thing a fan-out makes non-negotiable: **never read a node's gradient until every node that consumes it has already pushed into it.** Process o before d and w would get half its gradient and no error would be raised.`,
    ln("order.append(n)   # parents first", "visit(out)"),
    {
      t: "tokens",
      label: "reverse topological order — the order backward() walks",
      v: REVERSED.map((n) => ({ text: n.name, sub: fmt(n.v, 3), cls: "good" as TraceCls })),
      sep: "→",
    },
    {
      t: "note",
      text: "PyTorch does this with a dependency counter rather than a DFS, and only walks the part of the graph that leads to tensors requiring gradients, but the invariant is identical.",
    }
  );

  push(
    `Seed the output with ∂L/∂L = 1 and take the first node. L = mul(d, d) has two edges, both to d, so it pushes twice: ${fmt(PUSHES.L[0].delta)} then ${fmt(PUSHES.L[1].delta)}, and d ends at **${fmt(PUSHES.L[1].after)}** = 2d. There it is — the factor of 2 that nobody implemented. \`+=\` on a repeated argument *is* the product rule.`,
    ln("out.g = 1.0", "parent.g += local(n.g)"),
    gradTable("L", ["L", "d"]),
    {
      t: "table",
      label: "pushes from L",
      head: ["→ node", "contribution", "running total"],
      v: PUSHES.L.map((p) => ({
        cells: [p.to, fmt(p.delta), fmt(p.after)],
        cls: "active" as TraceCls,
      })),
    }
  );

  push(
    `Next node in reverse order: d = sub(o, t). Its gradient is final now (L was its only consumer), so it is safe to read. It pushes ${fmt(PUSHES.d[0].delta)} into o and ${fmt(PUSHES.d[1].delta)} into t — subtraction passes gradient straight through, negated on the right-hand side. Nobody cares about t's gradient, but the tape has no idea which nodes you consider parameters, so it computes it anyway.`,
    ln("(a, lambda g:  g),", "(b, lambda g: -g)))"),
    gradTable("d", ["d", "o", "t"])
  );

  push(
    `o = mul(w, h), and this is **w's first contribution**. Using the local derivative captured back at record time, ∂L/∂w += ∂L/∂o · h = ${fmt(PUSHES.o[0].delta)}, so w goes from 0 to ${fmt(PUSHES.o[0].after)}. It also pushes ${fmt(PUSHES.o[1].delta)} into h. If you stopped the algorithm here and read w.g you would get a number that looks perfectly reasonable and is wrong — it is the short path only, and the long one has not been walked yet.`,
    ln("(a, lambda g: g * b.v),"),
    gradTable("o", ["o", "w", "h"]),
    {
      t: "bars",
      label: "∂L/∂w — contributions so far",
      v: [
        { k: "via o (short path)", val: Math.abs(PUSHES.o[0].delta), show: fmt(PUSHES.o[0].delta), cls: "good" },
        { k: "via a (not yet)", val: 0, show: "—", cls: "dim" },
      ],
      max: Math.abs(W_GRAD),
    }
  );

  push(
    `h = tanh(a) pushes ∂L/∂a += ∂L/∂h · (1 − t²) = ${fmt(PUSHES.h[0].delta)}. Note how much smaller this is than the gradient arriving at h (${fmt(GRAD_AT.o["h"])}): the tanh factor 1 − t² = ${fmt(1 - h.v * h.v)} shrinks it by ${fmt(1 / (1 - h.v * h.v), 2)}×. Stack forty of these and you have the vanishing-gradient problem, visible right here as one multiplication.`,
    ln("def tanh(a):"),
    gradTable("h", ["h", "a"])
  );

  push(
    `a = mul(w, x) — **w's second contribution**, arriving from the other side of the graph. ∂L/∂w += ∂L/∂a · x = ${fmt(PUSHES.a[0].delta)}. Because the line is \`+=\` and not \`=\`, this lands on top of the ${fmt(PUSHES.o[0].after)} already there: w finishes at **${fmt(W_GRAD)}**. Two paths, two pushes, one sum, and the ordering guaranteed by the topological sort is what made it safe to add the second one last.`,
    ln("parent.g += local(n.g)"),
    gradTable("a", ["a", "w", "x"]),
    {
      t: "bars",
      label: "∂L/∂w — both paths, summed",
      v: [
        { k: "via o (short path)", val: Math.abs(W_PUSHES[0].delta), show: fmt(W_PUSHES[0].delta), cls: "good" },
        { k: "via a (long path)", val: Math.abs(W_PUSHES[1].delta), show: fmt(W_PUSHES[1].delta), cls: "good" },
        { k: "total", val: Math.abs(W_GRAD), show: fmt(W_GRAD), cls: "active" },
      ],
    }
  );

  push(
    `The payoff: change one character and re-run the whole traversal. With \`parent.g = ...\` in place of \`parent.g += ...\` the last write wins, and ∂L/∂w comes back as ${fmt(W_OVERWRITE)} instead of ${fmt(W_GRAD)} — **${((W_OVERWRITE / W_GRAD) * 100).toFixed(1)}% of the correct value**. Look at *why* it is that small. Losing w's short path alone would leave ${((W_OVERWRITE_OWN_PATH_ONLY / W_GRAD) * 100).toFixed(1)}%; the rest is gone because L = d·d is a fan-out too, so d collapsed from 2d to d before the gradient ever reached w. **One broken \`+=\` corrupts every fan-out in the graph, and they multiply.** Against a central finite difference (${fmt(FD, 8)}) the accumulating version is right to ${REL_OK.toExponential(1)} and this one is off by ${(REL_BAD * 100).toFixed(0)}%. Note what does *not* happen: no exception, no NaN, no shape error. It trains, a bit worse, forever.`,
    ln("parent.g += local(n.g)"),
    {
      t: "table",
      label: "∂L/∂w — three ways of getting it",
      head: ["method", "value", "rel. error"],
      v: [
        { cells: ["finite difference (h = 10⁻⁶)", fmt(FD, 8), "—"], cls: "dim" },
        { cells: ["autograd with  parent.g += …", fmt(W_GRAD, 8), REL_OK.toExponential(1)], cls: "good" },
        { cells: ["autograd with  parent.g = …", fmt(W_OVERWRITE, 8), REL_BAD.toExponential(1)], cls: "bad" },
        { cells: ["  ↳ losing only w's short path would give", fmt(W_OVERWRITE_OWN_PATH_ONLY, 8), `${((W_OVERWRITE_OWN_PATH_ONLY / W_GRAD) * 100).toFixed(1)}% of true`], cls: "warn" },
        { cells: ["  ↳ d's collapsed fan-out then multiplies it by", `× ${(W_OVERWRITE / W_OVERWRITE_OWN_PATH_ONLY).toFixed(2)}`, "—"], cls: "warn" },
      ],
    },
    {
      t: "note",
      text: "This is also why you call optimizer.zero_grad() every step. The framework's += never resets on its own — it cannot know where one backward pass ends and the next begins — so gradients from the previous iteration are still sitting in .grad waiting to be added to. The accumulation that makes fan-out correct is the same accumulation that silently sums your steps together if you forget.",
      cls: "warn",
    }
  );

  return {
    id: "autograd-tape",
    title: "Reverse-mode autodiff: building the tape and replaying it backwards",
    caption:
      "A real micro-autograd, recorded as it runs. The expression uses w twice (a = w·x and o = w·h) so it is a genuine DAG rather than a chain, which is what makes the two structural pieces necessary: the topological sort, so a node's gradient is never read before all of its consumers have written to it, and the `+=`, so both paths add instead of one overwriting the other. The last frame changes that `+=` to `=`, re-runs the traversal, and checks both against a finite difference — the bug returns 17.2% of the true gradient with no error of any kind, and the frame breaks down why that is even worse than w's own two paths would explain.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const autogradTrace = build();
