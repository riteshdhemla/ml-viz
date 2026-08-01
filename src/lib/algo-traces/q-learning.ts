import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * Q-learning on a 3×6 cliff world, plus the single worked update from
 * `courses/reinforcement-learning/02-q-learning.mdx` (α = 0.1, γ = 0.9,
 * Q = 5, r = 2, max Q' = 10 → 5.6).
 *
 * The payoff is the on-policy/off-policy table on that page, run rather than
 * tabulated: change `max` to "the action actually taken" and the same code
 * becomes SARSA, learns a *different* policy on identical experience, and earns
 * a better online return while doing it. Cliff-walking, after Sutton & Barto.
 */

const CODE = codeLines(`
def learn(env, episodes, alpha, gamma, eps,
          on_policy=False):
    Q = defaultdict(float)
    for _ in range(episodes):
        s = env.start
        a = eps_greedy(Q, s, eps)
        while not done:
            s2, r, done = env.step(s, a)
            a2 = eps_greedy(Q, s2, eps)
            # the one line that decides everything
            future = (Q[s2, a2] if on_policy
                      else max(Q[s2, b] for b in A))
            target = r + gamma * (0 if done
                                  else future)
            td = target - Q[s, a]
            Q[s, a] += alpha * td
            s, a = s2, a2
    return Q
`);

const ln = lineFinder(CODE);

const ROWS = 3;
const COLS = 6;
const START: [number, number] = [2, 0];
const GOAL: [number, number] = [2, COLS - 1];
const MOVES: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const MOVE_NAMES = ["up", "down", "left", "right"];
const isCliff = (r: number, c: number) => r === 2 && c > 0 && c < COLS - 1;

const fmt = (x: number, d = 2) => x.toFixed(d);
const sKey = (r: number, c: number) => `${r},${c}`;

function step(s: [number, number], a: number): { s2: [number, number]; r: number; done: boolean } {
  const r = Math.max(0, Math.min(ROWS - 1, s[0] + MOVES[a][0]));
  const c = Math.max(0, Math.min(COLS - 1, s[1] + MOVES[a][1]));
  if (isCliff(r, c)) return { s2: [...START], r: -100, done: false };
  if (r === GOAL[0] && c === GOAL[1]) return { s2: [r, c], r: -1, done: true };
  return { s2: [r, c], r: -1, done: false };
}

type QTable = Map<string, number[]>;
const getQ = (Q: QTable, r: number, c: number) => Q.get(sKey(r, c)) ?? [0, 0, 0, 0];
const maxQ = (Q: QTable, r: number, c: number) => Math.max(...getQ(Q, r, c));
const argmaxQ = (Q: QTable, r: number, c: number) => {
  const q = getQ(Q, r, c);
  return q.indexOf(Math.max(...q));
};

interface Transition {
  s: [number, number];
  a: number;
  r: number;
  s2: [number, number];
  done: boolean;
  before: number;
  target: number;
  td: number;
  after: number;
}

/** Train; `onPolicy` switches Q-learning into SARSA. */
function train(episodes: number, onPolicy: boolean, seed = 3, record?: Transition[]) {
  const rng = seededRng(seed);
  const Q: QTable = new Map();
  const alpha = 0.5;
  const gamma = 1;
  const eps = 0.1;
  const returns: number[] = [];

  const pick = (r: number, c: number) =>
    rng() < eps ? Math.floor(rng() * 4) % 4 : argmaxQ(Q, r, c);

  for (let ep = 0; ep < episodes; ep++) {
    let s: [number, number] = [...START];
    let a = pick(s[0], s[1]);
    let total = 0;
    for (let t = 0; t < 200; t++) {
      const { s2, r, done } = step(s, a);
      total += r;
      const a2 = pick(s2[0], s2[1]);
      const future = onPolicy ? getQ(Q, s2[0], s2[1])[a2] : maxQ(Q, s2[0], s2[1]);
      const target = r + gamma * (done ? 0 : future);
      const row = Q.get(sKey(s[0], s[1])) ?? [0, 0, 0, 0];
      const before = row[a];
      const td = target - before;
      row[a] = before + alpha * td;
      Q.set(sKey(s[0], s[1]), row);
      record?.push({ s: [...s], a, r, s2: [...s2], done, before, target, td, after: row[a] });
      s = s2;
      a = a2;
      if (done) break;
    }
    returns.push(total);
  }
  return { Q, returns };
}

/** V(s) = max_a Q(s,a), as a grid; unvisited cells render as "·". */
function gridPanel(Q: QTable, label: string, active?: [number, number]): TraceComponent {
  return {
    t: "matrix",
    label,
    rows: Array.from({ length: ROWS }, (_, r) => `r${r}`),
    cols: Array.from({ length: COLS }, (_, c) => `c${c}`),
    v: Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (isCliff(r, c) ? NaN : maxQ(Q, r, c)))
    ),
    digits: 1,
    cls: {
      [`${GOAL[0]},${GOAL[1]}`]: "good",
      [`${START[0]},${START[1]}`]: "warn",
      ...(active ? { [`${active[0]},${active[1]}`]: "active" as TraceCls } : {}),
    },
  };
}

/** The greedy path from the start, as a grid of marks. */
function pathPanel(Q: QTable, label: string): TraceComponent {
  const path: string[] = [];
  let s: [number, number] = [...START];
  for (let i = 0; i < 25; i++) {
    const a = argmaxQ(Q, s[0], s[1]);
    path.push(sKey(s[0], s[1]));
    const { s2, done } = step(s, a);
    s = s2;
    if (done) {
      path.push(sKey(s[0], s[1]));
      break;
    }
    if (path.includes(sKey(s[0], s[1]))) break;
  }
  return {
    t: "matrix",
    label: `${label} (${path.length} cells)`,
    rows: Array.from({ length: ROWS }, (_, r) => `r${r}`),
    cols: Array.from({ length: COLS }, (_, c) => `c${c}`),
    v: Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (isCliff(r, c) ? NaN : path.includes(sKey(r, c)) ? 1 : 0))
    ),
    digits: 0,
    cls: Object.fromEntries(path.map((p) => [p, "good" as TraceCls])),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `A ${ROWS}×${COLS} cliff world. Start bottom-left, goal bottom-right, and the whole bottom row between them is a cliff: step in and you take −100 and get teleported back to the start. Every other step costs −1. Unlike value iteration, the agent is given **no model** — it does not know where the cliff is, and has to find out by falling in.`,
    ln("def learn(env, episodes, alpha, gamma, eps,"),
    gridPanel(new Map(), "V(s) = max_a Q(s,a) — all zero, and the cliff cells are never visited"),
    {
      t: "note",
      text: "Cells shown as · are the cliff. The agent has no idea they are special until it lands on one.",
    }
  );

  // ---- the lesson's worked single update ---------------------------------
  const wQ = 5;
  const wR = 2;
  const wMax = 10;
  const wAlpha = 0.1;
  const wGamma = 0.9;
  const wTarget = wR + wGamma * wMax;
  push(
    `The update rule in isolation, with the lesson's numbers. The agent believed Q(s,a) = ${wQ}. It acted, collected r = ${wR}, and landed somewhere its **own table** values at ${wMax}. So the bootstrapped target is ${wR} + ${wGamma}·${wMax} = ${wTarget}, the TD error is ${wTarget} − ${wQ} = ${
      wTarget - wQ
    }, and the estimate moves a fraction α = ${wAlpha} of the way: ${wQ} + ${wAlpha}·${wTarget - wQ} = ${fmt(
      wQ + wAlpha * (wTarget - wQ),
      1
    )}. Nothing waited for the end of the episode — the prediction was corrected by the *next* prediction.`,
    ln("td = target - Q[s, a]"),
    {
      t: "kv",
      label: "one update",
      v: [
        { k: "Q(s,a) before", v: String(wQ) },
        { k: "r", v: String(wR) },
        { k: "max Q(s',·)", v: String(wMax) },
        { k: "TD target", v: String(wTarget), cls: "active" },
        { k: "TD error", v: String(wTarget - wQ), cls: "warn" },
        { k: "Q(s,a) after", v: fmt(wQ + wAlpha * (wTarget - wQ), 1), cls: "good" },
      ],
    },
    {
      t: "note",
      text: "This is the whole algorithm. Everything else is bookkeeping about which (s, a) to update next.",
    }
  );

  // ---- the first real transitions ----------------------------------------
  const firstEpisode: Transition[] = [];
  train(1, false, 3, firstEpisode);

  firstEpisode.slice(0, 3).forEach((t, i) => {
    push(
      `Episode 1, transition ${i + 1}: from (${t.s.join(",")}) take **${MOVE_NAMES[t.a]}**, collect r = ${
        t.r
      }, land in (${t.s2.join(",")}). ${
        t.r === -100
          ? "That was the cliff — a −100 hit and straight back to the start. This is the only way the agent can learn the cliff exists."
          : "The target is r + γ·max Q(s',·) = " +
            fmt(t.target, 1) +
            ", and since every Q is still 0 the whole signal is the reward itself."
      } Q moves from ${fmt(t.before, 2)} to ${fmt(t.after, 2)}.`,
      [...ln("target = r + gamma * (0 if done"), ...ln("Q[s, a] += alpha * td")],
      gridPanel(new Map(), "V(s) — still mostly zero", t.s),
      {
        t: "kv",
        label: "transition",
        v: [
          { k: "s", v: `(${t.s.join(",")})`, cls: "active" },
          { k: "a", v: MOVE_NAMES[t.a] },
          { k: "r", v: String(t.r), cls: t.r === -100 ? "bad" : "dim" },
          { k: "target", v: fmt(t.target, 2) },
          { k: "TD error", v: fmt(t.td, 2), cls: "warn" },
          { k: "Q after", v: fmt(t.after, 2), cls: "good" },
        ],
      }
    );
  });

  // ---- learning over episodes --------------------------------------------
  for (const eps of [20, 200, 3000]) {
    const { Q } = train(eps, false, 3);
    push(
      eps === 3000
        ? `After ${eps} episodes the values have converged. Notice the shape: V rises smoothly toward the goal, and the row directly above the cliff carries high value — the agent has worked out that hugging the edge is the *shortest* route, because it is only ever punished for actually falling in.`
        : `After ${eps} episodes. Value has propagated backwards from the goal, exactly as it does in value iteration — but here every increment came from a sampled transition rather than a known model. The cells nearest the goal firm up first.`,
      ln("Q[s, a] += alpha * td"),
      gridPanel(Q, `V(s) after ${eps} episodes`),
      ...(eps === 3000 ? [pathPanel(Q, "greedy path from the start")] : [])
    );
  }

  // ---- payoff: one word changed → SARSA ----------------------------------
  const qLearn = train(3000, false, 3);
  const sarsa = train(3000, true, 3);
  const avg = (xs: number[]) => xs.slice(-500).reduce((a, b) => a + b, 0) / 500;

  const rowsUsed = (Q: QTable) => {
    const rows = new Set<number>();
    let s: [number, number] = [...START];
    for (let i = 0; i < 25; i++) {
      rows.add(s[0]);
      const { s2, done } = step(s, argmaxQ(Q, s[0], s[1]));
      s = s2;
      if (done) break;
    }
    return [...rows].sort();
  };

  push(
    `Now change exactly one expression — \`max Q(s', b)\` becomes \`Q(s', a')\`, the action the agent is *actually about to take* — and the same code is SARSA. Same world, same ε, same experience stream. Q-learning learns the greedy path along row ${
      rowsUsed(qLearn.Q).includes(1) ? "1, hugging the cliff edge" : rowsUsed(qLearn.Q).join("/")
    }: it is optimal, because the max ignores the fact that an ε-greedy agent sometimes steps sideways into the cliff. SARSA's target includes the exploratory action, so it *feels* those falls and learns a detour along the top. The twist is in the returns: SARSA averages ${fmt(
      avg(sarsa.returns),
      1
    )} per episode while learning against Q-learning's ${fmt(
      avg(qLearn.returns),
      1
    )} — the "worse" policy earns more, because it is the one that accounts for its own exploration.`,
    ln("future = (Q[s2, a2] if on_policy"),
    pathPanel(qLearn.Q, "Q-learning (off-policy) — greedy path"),
    pathPanel(sarsa.Q, "SARSA (on-policy) — greedy path"),
    {
      t: "bars",
      label: "average online return over the last 500 episodes (higher is better)",
      v: [
        { k: "Q-learning", val: 60 + avg(qLearn.returns), show: fmt(avg(qLearn.returns), 1), cls: "bad" },
        { k: "SARSA", val: 60 + avg(sarsa.returns), show: fmt(avg(sarsa.returns), 1), cls: "good" },
      ],
    },
    {
      t: "note",
      text: "Neither is wrong. Q-learning converges to the optimal policy's values and would win if you switched exploration off at deployment; SARSA converges to the values of the policy you are actually running, exploration included. Which you want depends on whether falling off the cliff during training is survivable.",
      cls: "warn",
    }
  );

  return {
    id: "q-learning",
    title: "Q-learning — bootstrapping from experience, and the word that makes it SARSA",
    caption:
      "Q-learning on a cliff world the agent knows nothing about, starting from the lesson's single worked update and running out to convergence. Watch value propagate backwards from the goal exactly as it does in value iteration — except every increment here came from a sampled transition rather than a model. The final step changes one expression in the target, turning the same code into SARSA, and the two learn genuinely different routes: Q-learning hugs the cliff edge because the max ignores its own exploration, SARSA detours because its target does not.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const qLearningTrace = build();
