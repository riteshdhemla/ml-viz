import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Random walk — the exact law of (position, running maximum).
 *
 * Every number in this trace comes from an **exhaustive** forward DP over the
 * joint distribution of `(S_t, max_{s<=t} S_s)`, so there is no sampling error
 * anywhere: `Var(S_t) = t` holds to the last digit, and the reflection
 * principle can be *checked* rather than asserted.
 *
 * Two things the DP measured that the page's prose did not say:
 *
 *  - The textbook identity `P(max >= a) = 2 P(S_t >= a)` is the **Brownian**
 *    statement. On the integer lattice it over-counts by exactly `P(S_t = a)`
 *    whenever `a` and `t` share parity — at `t = 12, a = 2` it claims 0.7744
 *    against the true 0.5811, a 33% overstatement. The exact discrete form
 *    `2 P(S_t > a) + P(S_t = a)` matched the enumeration for every
 *    `a` in 1..6 (equality in exact rational arithmetic, cross-checked in
 *    Python with `fractions.Fraction`).
 *  - Absorbing the same DP at 0 and N reproduces the Gambler's-Ruin closed
 *    form to 6 decimals for every case the page quotes, and shows the value
 *    of an edge depends on the bankroll. At k = N/2 = 50 a +-1% edge is
 *    exactly symmetric (0.8808 / 0.5000 / 0.1192), because
 *    R_k(p) + R_{N-k}(1-p) = 1 makes the half-target case self-symmetric.
 *    At k = 10 it is not: -1% adds 0.091 to a ruin probability already at
 *    0.900, while +1% removes 0.236 — 2.6x larger. The first draft of this
 *    frame reported only the k = 10 numbers and called the asymmetry a
 *    property of the edge; adding the k = 50 row showed it is a property of
 *    the *starting stack*, so both are now in the table.
 */

const src = `
from collections import defaultdict

# joint law of (position, running max)
joint = {(0, 0): 1.0}

for t in range(1, T + 1):
    nxt = defaultdict(float)
    for (s, m), pr in joint.items():
        if s <= lo or s >= hi:
            # absorbed — stays put
            nxt[(s, m)] += pr
            continue
        up = (s + 1, max(m, s + 1))
        nxt[up] += pr * p
        nxt[(s - 1, m)] += pr * (1 - p)
    joint = nxt

# marginals read straight off the joint
pos = tally(joint, lambda sm: sm[0])
run = tally(joint, lambda sm: sm[1])
`;

const code = codeLines(src);
const ln = lineFinder(code);

type Joint = Map<string, number>;

const key = (s: number, m: number) => `${s},${m}`;
const parse = (k: string) => k.split(",").map(Number) as [number, number];

/** One forward step of the exact joint law, with optional absorbing barriers. */
function step(joint: Joint, p: number, lo: number, hi: number): Joint {
  const nxt: Joint = new Map();
  const add = (k: string, v: number) => nxt.set(k, (nxt.get(k) ?? 0) + v);
  for (const [k, pr] of joint) {
    const [s, m] = parse(k);
    if (s <= lo || s >= hi) {
      add(k, pr);
      continue;
    }
    add(key(s + 1, Math.max(m, s + 1)), pr * p);
    add(key(s - 1, m), pr * (1 - p));
  }
  return nxt;
}

function run(T: number, p = 0.5, lo = -Infinity, hi = Infinity): Joint[] {
  let joint: Joint = new Map([[key(0, 0), 1]]);
  const hist = [joint];
  for (let t = 1; t <= T; t++) {
    joint = step(joint, p, lo, hi);
    hist.push(joint);
  }
  return hist;
}

/** Marginal over position (idx 0) or running max (idx 1). */
function marginal(joint: Joint, idx: 0 | 1): Map<number, number> {
  const out = new Map<number, number>();
  for (const [k, pr] of joint) {
    const v = parse(k)[idx];
    out.set(v, (out.get(v) ?? 0) + pr);
  }
  return new Map([...out].sort((a, b) => a[0] - b[0]));
}

function moments(pos: Map<number, number>) {
  let mean = 0;
  let sq = 0;
  for (const [s, pr] of pos) {
    mean += s * pr;
    sq += s * s * pr;
  }
  return { mean, variance: sq - mean * mean };
}

const T_MAX = 100;
const hist = run(T_MAX);
const posAt = (t: number) => marginal(hist[t], 0);

/** Bars of the position marginal at time t, on a fixed axis. */
function posBars(t: number, mark?: (s: number) => TraceCls | undefined) {
  const pos = posAt(t);
  return {
    t: "bars" as const,
    label: `P(S_${t} = s)`,
    max: 1,
    v: [...pos]
      .filter(([, pr]) => pr > 1e-6)
      .map(([s, pr]) => ({
        k: String(s),
        val: pr,
        show: pr.toFixed(4),
        cls: mark?.(s),
      })),
  };
}

const { push, frames } = frameBuilder();

// ---------------------------------------------------------------- frame 1
push(
  "The whole distribution starts as one atom: the walk is at 0, and the highest level it has ever reached is also 0. Every frame below is the exact law over all 2^t sign sequences at once — no sampling.",
  ln("joint = {(0, 0): 1.0}"),
  {
    t: "kv",
    label: "setup",
    v: [
      { k: "p (step up)", v: "0.5" },
      { k: "barriers", v: "none", cls: "dim" },
      { k: "states", v: "1" },
      { k: "E[S_0]", v: "0" },
      { k: "Var(S_0)", v: "0" },
    ],
  },
  posBars(0, () => "active"),
);

// ---------------------------------------------------------------- frame 2
const SAMPLE = [1, -1, 1, 1, -1, -1, 1, 1, 1, -1];
{
  let s = 0;
  let m = 0;
  const rows = [{ cells: ["0", "—", "0", "0"] }];
  SAMPLE.forEach((e, i) => {
    s += e;
    m = Math.max(m, s);
    rows.push({ cells: [String(i + 1), e > 0 ? "+1" : "−1", String(s), String(m)] });
  });
  push(
    `One concrete path through the same update — the ten flips the page walks by hand. It ends at S₁₀ = ${s} having touched a high-water mark of ${m}; the DP carries this pair for every path simultaneously, which is why the running max costs nothing extra.`,
    ln("up = (s + 1, max(m, s + 1))", "nxt[(s - 1, m)] += pr * (1 - p)"),
    {
      t: "tokens",
      label: "ε (the ten flips)",
      v: SAMPLE.map((e) => ({ text: e > 0 ? "+1" : "−1", cls: e > 0 ? "good" : "bad" })),
    },
    {
      t: "table",
      label: "one sample path",
      head: ["t", "ε_t", "S_t", "max"],
      v: rows,
    },
    {
      t: "note",
      text: `This single path has probability 1/2¹⁰ = ${(1 / 1024).toFixed(6)}. The DP below tracks all 1024 of them.`,
    },
  );
}

// ---------------------------------------------------------------- frames 3–5
for (const t of [1, 2, 4]) {
  const { mean, variance } = moments(posAt(t));
  const support = [...posAt(t).keys()];
  const parity = t % 2 === 0 ? "even" : "odd";
  push(
    t === 1
      ? "After one step the mass splits evenly to ±1. Variance is 1 — and it will keep climbing by exactly 1 per step, because the increments are independent so their variances simply add."
      : t === 2
        ? `Two steps: the ±1 atoms each split again and the two inner halves land back on 0, so P(S₂ = 0) = 0.5. Note the support — only ${parity} sites are reachable at an ${parity} time. The lattice walk has a parity constraint that Brownian motion does not.`
        : `Variance is now ${variance.toFixed(0)}, exactly t. The spread grows as √t = ${Math.sqrt(t).toFixed(3)}, so doubling the horizon widens the walk by only 41%, not 100%.`,
    ln("joint = nxt"),
    posBars(t),
    {
      t: "kv",
      label: `t = ${t}`,
      v: [
        { k: "support", v: `${support[0]} … ${support[support.length - 1]}` },
        { k: "atoms", v: String(support.length) },
        { k: "E[S_t]", v: mean.toFixed(4), cls: "dim" },
        { k: "Var(S_t)", v: variance.toFixed(4), cls: "good" },
        { k: "SD", v: Math.sqrt(variance).toFixed(3) },
      ],
    },
  );
}

// ---------------------------------------------------------------- frame 6
{
  const t = 12;
  const { mean, variance } = moments(posAt(t));
  push(
    `At t = ${t} the law is spread over ${posAt(t).size} sites but still centred exactly on 0. Mean and variance are ${mean.toFixed(1)} and ${variance.toFixed(1)} — the drift-free walk never goes anywhere on average, it only gets harder to predict.`,
    ln("pos = tally(joint, lambda sm: sm[0])"),
    posBars(t),
    {
      t: "kv",
      label: `t = ${t}`,
      v: [
        { k: "E[S_t]", v: mean.toFixed(6) },
        { k: "Var(S_t)", v: variance.toFixed(6), cls: "good" },
        { k: "SD", v: Math.sqrt(variance).toFixed(3) },
        { k: "P(S = 0)", v: (posAt(t).get(0) ?? 0).toFixed(4) },
        { k: "P(|S| ≥ 6)", v: [...posAt(t)].reduce((a, [s, pr]) => a + (Math.abs(s) >= 6 ? pr : 0), 0).toFixed(4) },
      ],
    },
  );
}

// ---------------------------------------------------------------- frame 7
{
  const rows = [1, 4, 9, 16, 36, 100].map((t) => {
    const { mean, variance } = moments(posAt(t));
    return {
      cells: [
        String(t),
        mean.toExponential(1),
        variance.toFixed(6),
        Math.sqrt(variance).toFixed(4),
        Math.sqrt(t).toFixed(4),
      ],
      cls: "good" as const,
    };
  });
  push(
    "Running the DP out to t = 100 and reading the moments off the exact law: the variance equals t to six decimals at every checkpoint, and the standard deviation equals √t. Nothing here is estimated — this is the whole distribution, not a sample of paths.",
    ln("for t in range(1, T + 1):"),
    { t: "table", label: "moments of the exact law", head: ["t", "E[S_t]", "Var(S_t)", "SD", "√t"], v: rows },
    {
      t: "note",
      text: "Var(S_t) = t is why a random walk is non-stationary: the variance has no ceiling, so no amount of data pins down its level.",
    },
  );
}

// ---------------------------------------------------------------- frame 8
{
  const t = 12;
  const joint = hist[t];
  const pos = posAt(t);
  const pMaxGe = (a: number) => {
    let acc = 0;
    for (const [k, pr] of joint) if (parse(k)[1] >= a) acc += pr;
    return acc;
  };
  const tail = (a: number, strict: boolean) => {
    let acc = 0;
    for (const [s, pr] of pos) if (strict ? s > a : s >= a) acc += pr;
    return acc;
  };
  const rows = [1, 2, 3, 4, 5, 6].map((a) => {
    const exact = pMaxGe(a);
    const naive = 2 * tail(a, false);
    const disc = 2 * tail(a, true) + (pos.get(a) ?? 0);
    return {
      cells: [String(a), exact.toFixed(6), naive.toFixed(6), disc.toFixed(6), (pos.get(a) ?? 0).toFixed(6)],
      cls: (Math.abs(naive - exact) > 1e-9 ? "bad" : "dim") as "bad" | "dim",
    };
  });
  const worst = Math.max(...[1, 2, 3, 4, 5, 6].map((a) => 2 * tail(a, false) - pMaxGe(a)));
  push(
    `Because the DP carries the running max, the reflection principle can be checked rather than trusted. The exact P(max ≥ a) is in column 2. The textbook 2·P(S ≥ a) over-counts by as much as ${worst.toFixed(4)} — it is the *Brownian* statement, and on the lattice it double-counts the paths that finish exactly at a.`,
    ln("run = tally(joint, lambda sm: sm[1])"),
    {
      t: "table",
      label: "reflection principle at t = 12",
      head: ["a", "P(max ≥ a) exact", "2·P(S ≥ a)", "2·P(S > a) + P(S = a)", "P(S = a)"],
      v: rows,
    },
    {
      t: "note",
      text: "Column 4 matches column 2 for every a. The gap opens only when a shares parity with t, because that is exactly when P(S_t = a) > 0.",
      cls: "good",
    },
  );
}

// ---------------------------------------------------------------- frame 9
{
  const A = 1;
  const fp: number[] = [0];
  let d = new Map<number, number>([[0, 1]]);
  for (let t = 1; t <= 40; t++) {
    const nxt = new Map<number, number>();
    const add = (s: number, v: number) => nxt.set(s, (nxt.get(s) ?? 0) + v);
    for (const [s, pr] of d) {
      if (s >= A) continue;
      add(s + 1, pr / 2);
      add(s - 1, pr / 2);
    }
    fp.push(nxt.get(A) ?? 0);
    d = nxt;
  }
  const rows = [1, 3, 5, 7, 9, 11].map((t) => ({
    cells: [
      String(t),
      fp[t].toFixed(6),
      ((A / t) * (posAt(t).get(A) ?? 0)).toFixed(6),
      fp.slice(0, t + 1).reduce((a, b) => a + b, 0).toFixed(6),
    ],
  }));
  const reached20 = fp.slice(0, 21).reduce((a, b) => a + b, 0);
  const reached40 = fp.slice(0, 41).reduce((a, b) => a + b, 0);
  push(
    `Absorb at a = 1 instead and the same loop gives the first-passage law. It reproduces (a/t)·P(S_t = a) exactly — but look at the cumulative column: after 20 steps only ${(reached20 * 100).toFixed(1)}% of paths have ever touched +1, and doubling the horizon to 40 only gets to ${(reached40 * 100).toFixed(1)}%. That tail decays like t^(-1/2), which is why E[T_a] diverges even though the walk hits every level eventually.`,
    ln("if s <= lo or s >= hi:", "continue"),
    {
      t: "table",
      label: "first passage to a = 1",
      head: ["t", "P(T = t) exact", "(a/t)·P(S_t = a)", "P(T ≤ t)"],
      v: rows,
    },
    {
      t: "kv",
      label: "heavy tail",
      v: [
        { k: "P(T > 20)", v: (1 - reached20).toFixed(4), cls: "warn" },
        { k: "P(T > 40)", v: (1 - reached40).toFixed(4), cls: "warn" },
        { k: "ratio", v: ((1 - reached40) / (1 - reached20)).toFixed(3) },
        { k: "√(20/40)", v: Math.sqrt(0.5).toFixed(3) },
      ],
    },
  );
}

// ---------------------------------------------------------------- frame 10
{
  const N = 100;
  const K = 10;
  const closed = (k: number, n: number, p: number) => {
    if (Math.abs(p - 0.5) < 1e-12) return 1 - k / n;
    const r = (1 - p) / p;
    return (r ** k - r ** n) / (1 - r ** n);
  };
  const cases: [number, number][] = [
    [K, 0.49],
    [K, 0.5],
    [K, 0.51],
    [50, 0.49],
    [50, 0.5],
    [50, 0.51],
  ];
  // Position-only DP: the running max is irrelevant once the walk is absorbed
  // at both ends, and dropping it keeps this to 101 states per sweep.
  const absorbed = (k: number, p: number) => {
    let d = new Float64Array(N + 1);
    d[k] = 1;
    for (let t = 0; t < 60000; t++) {
      const nxt = new Float64Array(N + 1);
      nxt[0] = d[0];
      nxt[N] = d[N];
      for (let s = 1; s < N; s++) {
        if (d[s] === 0) continue;
        nxt[s + 1] += d[s] * p;
        nxt[s - 1] += d[s] * (1 - p);
      }
      d = nxt;
      if (1 - d[0] - d[N] < 1e-12) break;
    }
    return { ruin: d[0], win: d[N], live: 1 - d[0] - d[N] };
  };
  const measured = new Map<string, number>();
  const rows = cases.map(([k, p]) => {
    const { ruin, win } = absorbed(k, p);
    measured.set(`${k}|${p}`, ruin);
    return {
      cells: [String(k), p.toFixed(2), ruin.toFixed(6), closed(k, N, p).toFixed(6), win.toFixed(6)],
      cls: (p < 0.5 ? "bad" : p > 0.5 ? "good" : "warn") as "bad" | "good" | "warn",
    };
  });
  const at = (k: number, p: number) => measured.get(`${k}|${p}`)!;
  const smallUp = at(K, 0.49) - at(K, 0.5);
  const smallDown = at(K, 0.5) - at(K, 0.51);
  const bigUp = at(50, 0.49) - at(50, 0.5);
  const bigDown = at(50, 0.5) - at(50, 0.51);
  push(
    `The payoff: switch the barriers on — absorb at 0 and at N = 100 — and the identical loop becomes Gambler's Ruin, matching the closed form to six decimals. It also shows the edge is not worth the same to everyone. From half the target (k = 50) a ±1% edge is perfectly symmetric: ${bigUp.toFixed(4)} up, ${bigDown.toFixed(4)} down. From a short stack (k = 10) it is not — losing 1% adds only ${smallUp.toFixed(3)} to a ruin probability already at 0.90, while gaining 1% removes ${smallDown.toFixed(3)}, a ${(smallDown / smallUp).toFixed(1)}× larger move. The short stack has no headroom left to lose; a favourable edge is what buys it the runway to build one.`,
    ln("# absorbed — stays put"),
    {
      t: "table",
      label: "ruin probability, N = 100 (DP vs closed form)",
      head: ["k", "p", "R_k (DP)", "R_k (formula)", "P(reach N)"],
      v: rows,
    },
    {
      t: "bars",
      label: "ruin probability — short stack (k=10) vs half target (k=50)",
      max: 1,
      v: [
        { k: "k=10, p=.49", val: at(K, 0.49), show: at(K, 0.49).toFixed(3), cls: "bad" },
        { k: "k=10, p=.50", val: at(K, 0.5), show: at(K, 0.5).toFixed(3), cls: "warn" },
        { k: "k=10, p=.51", val: at(K, 0.51), show: at(K, 0.51).toFixed(3), cls: "good" },
        { k: "k=50, p=.49", val: at(50, 0.49), show: at(50, 0.49).toFixed(3), cls: "bad" },
        { k: "k=50, p=.50", val: at(50, 0.5), show: at(50, 0.5).toFixed(3), cls: "warn" },
        { k: "k=50, p=.51", val: at(50, 0.51), show: at(50, 0.51).toFixed(3), cls: "good" },
      ],
    },
    {
      t: "note",
      text: "One loop for all of it: the drift-free law, the running max, the first-passage time, and the ruin problem differ only in p and where the barriers sit.",
      cls: "good",
    },
  );
}

export const randomWalkTrace: AlgoTrace = {
  id: "random-walk-law",
  title: "Random walk — the exact law, step by step",
  caption:
    "A forward DP over the joint law of (position, running maximum). Nothing is sampled, so Var(S_t) = t holds exactly, the reflection principle can be checked instead of assumed, and switching on absorbing barriers turns the same loop into Gambler's Ruin.",
  code,
  lang: "python",
  frames,
};
