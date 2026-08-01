import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Newton's method on f(x, y) = x² + xy + y² − 3x, the quadratic worked in
 * `src/content/wiki/newtons-method.mdx`: from (0, 0) the Newton step lands
 * exactly on the minimum (2, −1) in one move.
 *
 * The payoff runs gradient descent on the identical function from the identical
 * start and counts how many steps it needs to reach the same accuracy. The
 * function is mildly ill-conditioned (κ = 3), which is enough for the gap to be
 * embarrassing.
 */

const CODE = codeLines(`
def newton(f, grad, hess, x, steps):
    for _ in range(steps):
        g = grad(x)
        H = hess(x)
        s = -solve(H, g)      # -H^-1 @ g
        x = x + s
    return x

def gradient_descent(grad, x, eta, steps):
    for _ in range(steps):
        x = x - eta * grad(x)  # same step size
    return x                   # in every direction

# f(x, y) = x^2 + x*y + y^2 - 3x
grad = lambda p: [2*p[0] + p[1] - 3,
                  p[0] + 2*p[1]]
hess = lambda p: [[2, 1],
                  [1, 2]]
`);

const ln = lineFinder(CODE);

type Vec = [number, number];

const f = (p: Vec) => p[0] ** 2 + p[0] * p[1] + p[1] ** 2 - 3 * p[0];
const grad = (p: Vec): Vec => [2 * p[0] + p[1] - 3, p[0] + 2 * p[1]];
const HESS = [
  [2, 1],
  [1, 2],
];
const OPT: Vec = [2, -1];
const F_MIN = f(OPT);
const START: Vec = [0, 0];
const DOMAIN: [number, number, number, number] = [-1.5, 3.5, -2.5, 2];

const fmt = (x: number, d = 3) => x.toFixed(d);
const vec = (p: Vec) => `(${fmt(p[0], 3)}, ${fmt(p[1], 3)})`;

/** Solve the 2×2 system H·s = −g by hand — the Newton step. */
function newtonStep(p: Vec): Vec {
  const g = grad(p);
  const det = HESS[0][0] * HESS[1][1] - HESS[0][1] * HESS[1][0];
  // H⁻¹ = (1/det)·[[d, −b], [−c, a]]
  const inv = [
    [HESS[1][1] / det, -HESS[0][1] / det],
    [-HESS[1][0] / det, HESS[0][0] / det],
  ];
  return [-(inv[0][0] * g[0] + inv[0][1] * g[1]), -(inv[1][0] * g[0] + inv[1][1] * g[1])];
}

/** Level set f = F_MIN + c, parametrized around the optimum. */
function levelSet(c: number) {
  return Array.from({ length: 121 }, (_, i) => {
    const th = (i / 120) * 2 * Math.PI;
    // u² + uv + v² = c  ⟹  r² (1 + cosθ sinθ) = c
    const r = Math.sqrt(c / (1 + Math.cos(th) * Math.sin(th)));
    return { x: OPT[0] + r * Math.cos(th), y: OPT[1] + r * Math.sin(th) };
  });
}

function landscape(
  label: string,
  path: Vec[],
  opts: { tangentTo?: Vec; showOpt?: boolean } = {}
): TraceComponent {
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    xLabel: "x",
    yLabel: "y",
    curves: [
      { pts: levelSet(1), cls: "dim" },
      { pts: levelSet(4), cls: "dim" },
      { pts: levelSet(9), cls: "dim" },
      ...(path.length > 1 ? [{ pts: path.map((p) => ({ x: p[0], y: p[1] })), cls: "active" as TraceCls }] : []),
    ],
    points: [
      ...(opts.showOpt !== false
        ? [{ x: OPT[0], y: OPT[1], id: "min", cls: "good" as TraceCls, shape: "cross" as const }]
        : []),
      ...path.map((p, i) => ({
        x: p[0],
        y: p[1],
        id: i === 0 ? "x₀" : i === path.length - 1 ? `x${i}` : undefined,
        cls: (i === path.length - 1 ? "active" : "dim") as TraceCls,
        shape: "dot" as const,
      })),
    ],
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `f(x, y) = x² + xy + y² − 3x, a convex quadratic whose minimum sits at (2, −1) with f = ${fmt(F_MIN, 0)}. Start at the origin. The contours are ellipses rather than circles — the xy term tilts them — and that tilt is exactly what a single learning rate cannot cope with.`,
    ln("# f(x, y) = x^2 + x*y + y^2 - 3x"),
    landscape("the landscape", [START]),
    {
      t: "kv",
      label: "start",
      v: [
        { k: "x₀", v: vec(START), cls: "active" },
        { k: "f(x₀)", v: fmt(f(START), 3) },
        { k: "minimum", v: vec(OPT), cls: "good" },
      ],
    }
  );

  const g0 = grad(START);
  push(
    `Gradient at the origin: ∇f = (2x + y − 3, x + 2y) = ${vec(g0 as Vec)}. It points along −x only, straight at neither the minimum nor away from it — the y-component is zero even though the minimum is at y = −1. Follow the negative gradient and you would move purely horizontally, which is the wrong direction.`,
    ln("g = grad(x)"),
    landscape("negative gradient at x₀", [START]),
    {
      t: "kv",
      label: "gradient",
      v: [
        { k: "∇f", v: vec(g0 as Vec), cls: "warn" },
        { k: "−∇f direction", v: `(${fmt(-g0[0], 1)}, ${fmt(-g0[1], 1)})` },
      ],
    }
  );

  push(
    "The Hessian is constant here — every second derivative of a quadratic is a number, not a function. Its off-diagonal 1 is the coupling between x and y: move in x and the optimal y changes. A scalar learning rate has no way to express that; a matrix does.",
    ln("H = hess(x)"),
    landscape("curvature", [START]),
    { t: "matrix", label: "H = ∇²f", rows: ["∂x", "∂y"], cols: ["∂x", "∂y"], v: HESS, digits: 0 },
    {
      t: "note",
      text: "H⁻¹ = ⅓·[[2, −1], [−1, 2]]. It rescales *and rotates* the gradient — shrinking steps in steep directions, stretching them in flat ones.",
    }
  );

  const s = newtonStep(START);
  const x1: Vec = [START[0] + s[0], START[1] + s[1]];

  push(
    `Newton step: s = −H⁻¹∇f = −⅓·[[2, −1], [−1, 2]]·${vec(g0 as Vec)} = ${vec(s)}. Note the y-component: it is −1 even though the gradient's y-component was 0. The Hessian's off-diagonal term supplied a direction the gradient never mentioned.`,
    ln("s = -solve(H, g)"),
    landscape("the Newton step", [START, x1]),
    {
      t: "kv",
      label: "step",
      v: [
        { k: "∇f", v: vec(g0 as Vec) },
        { k: "s = −H⁻¹∇f", v: vec(s), cls: "active" },
        { k: "x₁ = x₀ + s", v: vec(x1), cls: "good" },
      ],
    }
  );

  push(
    `x₁ = ${vec(x1)}, and f(x₁) = ${fmt(f(x1), 4)} — the exact minimum, in one step, from a starting point that was nowhere near it. This is not luck: Newton's method minimizes the second-order Taylor model of f exactly, and for a quadratic that model **is** f. The gradient at x₁ is ${vec(grad(x1) as Vec)}, so the next step would be zero.`,
    ln("x = x + s"),
    landscape("landed on the minimum", [START, x1]),
    {
      t: "kv",
      label: "after one step",
      v: [
        { k: "x₁", v: vec(x1), cls: "good" },
        { k: "f(x₁)", v: fmt(f(x1), 6), cls: "good" },
        { k: "‖∇f(x₁)‖", v: fmt(Math.hypot(...grad(x1)), 6) },
      ],
    }
  );

  // ---- payoff: gradient descent on the same function ----------------------
  const TOL = 1e-3;
  const runGD = (eta: number) => {
    let p: Vec = [...START];
    const path: Vec[] = [p];
    for (let i = 0; i < 5000; i++) {
      const g = grad(p);
      p = [p[0] - eta * g[0], p[1] - eta * g[1]];
      path.push(p);
      if (Math.hypot(p[0] - OPT[0], p[1] - OPT[1]) < TOL) return { steps: i + 1, path, diverged: false };
      if (!Number.isFinite(p[0]) || Math.abs(p[0]) > 1e6) return { steps: i + 1, path, diverged: true };
    }
    return { steps: 5000, path, diverged: false };
  };

  const gd = [0.1, 0.3, 0.7].map((eta) => ({ eta, ...runGD(eta) }));
  const bestGD = gd.filter((r) => !r.diverged).reduce((a, b) => (b.steps < a.steps ? b : a));

  push(
    `Gradient descent on the identical function from the identical start. At η = ${bestGD.eta} it needs **${bestGD.steps} steps** to get within ${TOL} of the point Newton reached in one, and it gets there by zig-zagging across the valley rather than down it. Raise η to ${gd[2].eta} and it ${gd[2].diverged ? "diverges outright" : `still needs ${gd[2].steps}`}; lower it and it crawls. There is no η that fixes this, because the problem is not the step *size* — it is that one number has to serve two directions with different curvature.`,
    ln("x = x - eta * grad(x)"),
    landscape(`gradient descent, η = ${bestGD.eta}`, bestGD.path.slice(0, 40)),
    {
      t: "bars",
      label: `steps to reach ‖x − x*‖ < ${TOL}`,
      v: [
        { k: "Newton", val: 1, show: "1", cls: "good" },
        ...gd.map((r) => ({
          k: `GD η=${r.eta}`,
          val: r.diverged ? 0 : r.steps,
          show: r.diverged ? "diverges" : String(r.steps),
          cls: "bad" as TraceCls,
        })),
      ],
    },
    {
      t: "note",
      text: "The condition number here is only 3 (eigenvalues 3 and 1). Real loss surfaces reach thousands, and the gap widens with it — which is why second-order and quasi-Newton ideas keep resurfacing in optimizers.",
      cls: "warn",
    }
  );

  push(
    "The catch, and it is a large one: Newton's method jumps to the *stationary point* of the quadratic model, not to a minimum. Where the Hessian is not positive definite — a saddle, or any non-convex region — the model's stationary point can be a maximum, and the step moves uphill. Storing and inverting H is also O(d²) memory and O(d³) time, hopeless at a billion parameters. Every practical variant (L-BFGS, Gauss–Newton, Adam's diagonal preconditioner) is an approximation built to dodge one of those two problems.",
    ln("s = -solve(H, g)"),
    landscape("one step, exactly", [START, x1]),
    {
      t: "table",
      label: "why not always Newton",
      head: ["problem", "consequence"],
      v: [
        { cells: ["H not positive definite", "step can move uphill"], cls: "bad" },
        { cells: ["O(d²) memory, O(d³) solve", "infeasible past ~10⁴ params"], cls: "bad" },
        { cells: ["exact on quadratics", "superlinear near a minimum"], cls: "good" },
      ],
    }
  );

  return {
    id: "newtons-method",
    title: "Newton's method — one step to the minimum, and why we can't always take it",
    caption:
      "Newton's method on f(x, y) = x² + xy + y² − 3x from the origin, the quadratic worked above. Watch the y-component of the step: the gradient's is zero, yet the correct move has y = −1, and the Hessian's off-diagonal term is the only thing that knows it. One step lands exactly on the minimum. The final steps run gradient descent on the same function from the same point for comparison, and then state plainly what Newton costs.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const newtonTrace = build();
