import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Value iteration on the 3-state MDP from
 * `courses/reinforcement-learning/01-markov-decision-processes.mdx`, γ = 0.9,
 * converging to V* = [8.1, 9, 10].
 *
 * Two payoffs. First, γ is swept to show it controlling the *contraction rate*
 * — 30 iterations at 0.5, 2062 at 0.99. Second, one reward is changed (a small
 * payout for staying put) and γ is lowered, and the optimal **policy** flips:
 * discounting is not a convergence knob, it changes what "optimal" means.
 */

const CODE = codeLines(`
def value_iteration(P, gamma, tol=1e-6):
    V = [0.0] * n_states
    for it in range(1000):
        V_new = [0.0] * n_states
        for s in range(n_states):
            # Bellman optimality backup
            V_new[s] = max(
                sum(p * (r + gamma * V[s2])
                    for p, s2, r in P[s][a])
                for a in range(n_actions))
        if allclose(V, V_new, atol=tol):
            break                  # converged
        V = V_new
    policy = [argmax([q(s, a) for a in acts])
              for s in range(n_states)]
    return V, policy
`);

const ln = lineFinder(CODE);

type Transition = { p: number; s2: number; r: number };
type MDP = Transition[][][]; // [state][action] -> transitions

const NAMES = ["s0", "s1", "s2 (goal)"];
const ACTIONS = ["a0", "a1"];
const N_S = 3;
const N_A = 2;
const GAMMA = 0.9;
const TOL = 1e-6;

/** The lesson's MDP verbatim: a chain to an absorbing goal paying 1 per step. */
const BASE: MDP = [
  [[{ p: 1, s2: 0, r: 0 }], [{ p: 1, s2: 1, r: 0 }]],
  [[{ p: 1, s2: 0, r: 0 }], [{ p: 1, s2: 2, r: 0 }]],
  [[{ p: 1, s2: 2, r: 1 }], [{ p: 1, s2: 2, r: 1 }]],
];

/** Same MDP with one number changed: staying at s0 now pays 0.5 per step. */
const TEMPTING: MDP = [
  [[{ p: 1, s2: 0, r: 0.5 }], [{ p: 1, s2: 1, r: 0 }]],
  [[{ p: 1, s2: 0, r: 0 }], [{ p: 1, s2: 2, r: 0 }]],
  [[{ p: 1, s2: 2, r: 1 }], [{ p: 1, s2: 2, r: 1 }]],
];

const fmt = (x: number, d = 3) => x.toFixed(d);

const qValue = (P: MDP, V: number[], s: number, a: number, gamma: number) =>
  P[s][a].reduce((sum, t) => sum + t.p * (t.r + gamma * V[t.s2]), 0);

const backup = (P: MDP, V: number[], s: number, gamma: number) =>
  Math.max(...Array.from({ length: N_A }, (_, a) => qValue(P, V, s, a, gamma)));

const greedy = (P: MDP, V: number[], gamma: number) =>
  Array.from({ length: N_S }, (_, s) => {
    const qs = Array.from({ length: N_A }, (_, a) => qValue(P, V, s, a, gamma));
    return qs.indexOf(Math.max(...qs));
  });

/** Run to convergence, recording V after every sweep. */
function run(P: MDP, gamma: number) {
  let V = new Array(N_S).fill(0);
  const history = [[...V]];
  let iters = 0;
  for (let it = 0; it < 5000; it++) {
    const Vn = Array.from({ length: N_S }, (_, s) => backup(P, V, s, gamma));
    iters = it;
    if (Vn.every((v, s) => Math.abs(v - V[s]) <= TOL)) break;
    V = Vn;
    history.push([...V]);
  }
  return { V, history, iters, policy: greedy(P, V, gamma) };
}

const MAIN = run(BASE, GAMMA);

function mdpTable(P: MDP, active?: number): TraceComponent {
  return {
    t: "table",
    label: "the MDP — deterministic transitions",
    head: ["state", "a0 → (next, reward)", "a1 → (next, reward)"],
    v: NAMES.map((n, s) => ({
      cells: [
        n,
        `${NAMES[P[s][0][0].s2]}, r=${P[s][0][0].r}`,
        `${NAMES[P[s][1][0].s2]}, r=${P[s][1][0].r}`,
      ],
      cls: (s === active ? "active" : "dim") as TraceCls,
    })),
  };
}

function vBars(V: number[], active?: number, max = 10.5): TraceComponent {
  return {
    t: "bars",
    label: "V — value of each state",
    v: NAMES.map((n, s) => ({
      k: n,
      val: V[s],
      show: fmt(V[s]),
      cls: (s === active ? "active" : V[s] > 0 ? "good" : "dim") as TraceCls,
    })),
    max,
  };
}

function historyPlot(history: number[][], label: string): TraceComponent {
  const n = history.length - 1;
  return {
    t: "plot",
    label,
    domain: [0, Math.max(4, n), 0, 10.5],
    xLabel: "sweep",
    yLabel: "V",
    curves: NAMES.map((_, s) => ({
      pts: history.map((V, i) => ({ x: i, y: V[s] })),
      cls: (["active", "warn", "good"] as TraceCls[])[s],
    })),
  };
}

const policyPanel = (policy: number[], P: MDP): TraceComponent => ({
  t: "kv",
  label: "greedy policy from V",
  v: NAMES.map((n, s) => ({
    k: n,
    v: `${ACTIONS[policy[s]]} → ${NAMES[P[s][policy[s]][0].s2]}`,
    cls: "good" as TraceCls,
  })),
});

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `A three-state MDP: s0 and s1 are ordinary, s2 is an absorbing goal that pays 1 every step you sit in it. Both actions are deterministic. Value iteration needs no experience and no exploration — it is given P and R, and simply applies the Bellman optimality update until V stops moving. γ = ${GAMMA}, and every V starts at zero.`,
    ln("V = [0.0] * n_states"),
    mdpTable(BASE),
    vBars(MAIN.history[0]),
    {
      t: "note",
      text: "Nothing here is learning. Value iteration is dynamic programming on a known model — the contrast that makes Q-learning's model-free version interesting.",
    }
  );

  // ---- sweep 1, state by state --------------------------------------------
  for (let s = 0; s < N_S; s++) {
    const V0 = MAIN.history[0];
    const qs = Array.from({ length: N_A }, (_, a) => qValue(BASE, V0, s, a, GAMMA));
    const partial = MAIN.history[1].map((v, i) => (i <= s ? v : V0[i]));
    push(
      `Sweep 1, ${NAMES[s]}: evaluate both actions against the *current* V (all zeros). a0 gives ${
        BASE[s][0][0].r
      } + ${GAMMA}·V(${NAMES[BASE[s][0][0].s2]}) = ${fmt(qs[0])}, a1 gives ${fmt(qs[1])}. Take the max: V(${
        NAMES[s]
      }) ← ${fmt(Math.max(...qs))}. ${
        s === 2
          ? "Only the goal picks up value on the first sweep — it is the only state with an immediate reward. Everything else is still zero."
          : "Zero, because no reward is reachable in one step from here."
      }`,
      [...ln("V_new[s] = max("), ...ln("sum(p * (r + gamma * V[s2])")],
      mdpTable(BASE, s),
      vBars(partial, s),
      {
        t: "bars",
        label: `${NAMES[s]}: action values`,
        v: ACTIONS.map((a, i) => ({
          k: a,
          val: qs[i],
          show: fmt(qs[i]),
          cls: (qs[i] === Math.max(...qs) ? "good" : "bad") as TraceCls,
        })),
        max: 1.1,
      }
    );
  }

  // ---- subsequent sweeps ---------------------------------------------------
  const SHOWN = [2, 3, 4, 6];
  for (const k of SHOWN) {
    if (k >= MAIN.history.length) continue;
    const V = MAIN.history[k];
    const prev = MAIN.history[k - 1];
    push(
      `Sweep ${k}: value has propagated one more step backwards along the chain. V = (${V.map((v) => fmt(v, 3)).join(
        ", "
      )}), up from (${prev.map((v) => fmt(v, 3)).join(", ")}). Notice the direction of travel — reward information flows *backwards* from the goal, one state per sweep. That is why the number of sweeps needed grows with the distance to reward.`,
      ln("V = V_new"),
      vBars(V),
      historyPlot(MAIN.history.slice(0, k + 1), `V through sweep ${k}`)
    );
  }

  push(
    `After ${MAIN.iters} sweeps the largest change drops below the tolerance and the loop breaks. V* = (${MAIN.V.map(
      (v) => fmt(v, 2)
    ).join(", ")}). These are exactly the closed-form values: the goal pays 1 forever, so V(s2) = 1/(1 − ${GAMMA}) = 10; s1 is one discounted step away at 0.9·10 = 9; s0 is two, at 0.9·9 = 8.1.`,
    ln("break                  # converged"),
    vBars(MAIN.V),
    historyPlot(MAIN.history, "V over every sweep"),
    {
      t: "table",
      label: "V* vs the closed form",
      head: ["state", "V*", "closed form"],
      v: [
        { cells: ["s2 (goal)", fmt(MAIN.V[2], 2), "1/(1−γ) = 10"], cls: "good" },
        { cells: ["s1", fmt(MAIN.V[1], 2), "γ·10 = 9"], cls: "good" },
        { cells: ["s0", fmt(MAIN.V[0], 2), "γ²·10 = 8.1"], cls: "good" },
      ],
    }
  );

  push(
    `The policy falls out of V for free: at each state pick the action with the highest one-step lookahead. From s0, a1 leads to s1 (worth ${fmt(
      MAIN.V[1],
      1
    )}) while a0 stays put (worth ${fmt(MAIN.V[0], 1)}), so a1 wins. Value iteration never represented a policy at any point — it optimized V and read the policy off at the end.`,
    ln("policy = [argmax("),
    policyPanel(MAIN.policy, BASE),
    vBars(MAIN.V)
  );

  // ---- payoff 1: γ controls the contraction rate --------------------------
  const sweep = [0.5, 0.9, 0.99].map((g) => ({ g, ...run(BASE, g) }));
  push(
    `γ is not a free parameter. Each sweep contracts the error by a factor of γ, so the number of sweeps to a fixed tolerance scales like log(tol)/log(γ): ${sweep
      .map((r) => `γ = ${r.g} needs ${r.iters}`)
      .join(", ")}. Pushing γ from 0.9 to 0.99 to care about the far future costs an order of magnitude more computation — and the values themselves inflate by 10×, because a longer horizon means more total reward.`,
    ln("if allclose(V, V_new, atol=tol)"),
    {
      t: "bars",
      label: "sweeps to converge (tol = 1e-6)",
      v: sweep.map((r) => ({
        k: `γ = ${r.g}`,
        val: r.iters,
        show: String(r.iters),
        cls: (r.g === GAMMA ? "good" : "warn") as TraceCls,
      })),
    },
    {
      t: "table",
      label: "V* by discount factor",
      head: ["γ", "V(s0)", "V(s1)", "V(s2)", "sweeps"],
      v: sweep.map((r) => ({
        cells: [String(r.g), fmt(r.V[0], 2), fmt(r.V[1], 2), fmt(r.V[2], 2), String(r.iters)],
        cls: (r.g === GAMMA ? "good" : "dim") as TraceCls,
      })),
    }
  );

  // ---- payoff 2: γ changes what "optimal" means ---------------------------
  const temptHigh = run(TEMPTING, 0.9);
  const temptLow = run(TEMPTING, 0.5);

  push(
    `Now change exactly one number: staying at s0 pays 0.5 per step instead of 0. At γ = 0.9 nothing changes — V* is still (${temptHigh.V
      .map((v) => fmt(v, 1))
      .join(", ")}) and s0 still walks to the goal, because 0.5 forever is worth 5 while the goal is worth 8.1. Drop γ to 0.5 and the policy **flips**: the goal is now only worth ${fmt(
      temptLow.V[2],
      1
    )} discounted back to s0, while loitering pays ${fmt(
      temptLow.V[0],
      1
    )}. Same model, same code, opposite behaviour — γ is not a convergence knob, it changes what "optimal" *means*.`,
    ln("sum(p * (r + gamma * V[s2])"),
    mdpTable(TEMPTING, 0),
    {
      t: "table",
      label: "optimal policy under the modified reward",
      head: ["γ", "s0 does", "s1 does", "V(s0)"],
      v: [
        {
          cells: ["0.9", `${ACTIONS[temptHigh.policy[0]]} → ${NAMES[TEMPTING[0][temptHigh.policy[0]][0].s2]}`, `${ACTIONS[temptHigh.policy[1]]} → ${NAMES[TEMPTING[1][temptHigh.policy[1]][0].s2]}`, fmt(temptHigh.V[0], 2)],
          cls: "good",
        },
        {
          cells: ["0.5", `${ACTIONS[temptLow.policy[0]]} → ${NAMES[TEMPTING[0][temptLow.policy[0]][0].s2]}`, `${ACTIONS[temptLow.policy[1]]} → ${NAMES[TEMPTING[1][temptLow.policy[1]][0].s2]}`, fmt(temptLow.V[0], 2)],
          cls: "bad",
        },
      ],
    },
    {
      t: "note",
      text: "A myopic agent is not a badly-converged agent — it has correctly solved a different problem. This is why γ belongs in the problem specification, not the hyperparameter sweep.",
      cls: "warn",
    }
  );

  return {
    id: "value-iteration",
    title: "Value iteration — Bellman backups, and what γ actually controls",
    caption:
      "Value iteration on the 3-state MDP above, sweep by sweep. Watch reward information travel backwards from the goal one state per sweep — that propagation speed is why the sweep count grows with distance to reward. The last two steps show what γ does: it sets the contraction rate (30 sweeps at 0.5, 2062 at 0.99), and with one reward changed it flips the optimal policy outright. A myopic agent has not converged badly; it has solved a different problem.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const valueIterationTrace = build();
