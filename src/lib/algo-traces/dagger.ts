import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * DAgger from `wiki/imitation-learning.mdx`, on a lane-keeping double
 * integrator: v' = v + dt·a, y' = y + dt·v', with an expert PD controller
 * a* = −6y − 4v demonstrated with a little hand jitter.
 *
 * **The first design of this trace failed and the failure is the reason the
 * learner here is a k-NN.** The learner was originally a linear controller
 * fitted by least squares — the same hypothesis class as the expert. Behavioural
 * cloning then worked fine in every one of 12 seeds across 7 gain settings: the
 * recovered gains were within ~10% of the expert's, the closed loop was never
 * unstable, and DAgger beat BC in only 3–8 seeds out of 12, i.e. noise. That is
 * a real result rather than a bug: when the hypothesis class is globally
 * correct, extrapolation is exact and covariate shift costs nothing. BC's
 * compounding error needs a learner that cannot extrapolate — which is every
 * real policy network, and which a k-NN models honestly.
 *
 * Measured payoffs, both over replicates with the evaluation world held fixed so
 * only the demonstrations vary:
 *
 *  - A *steadier* expert makes the clone *worse*, monotonically across all
 *    seven noise levels: BC's tracking cost runs 9.48 (steadiest) down to 0.090
 *    (sloppiest), a 105× swing, while DAgger sits in 0.056–0.124 throughout.
 *    The clone can never output a correction larger than the largest one in the
 *    data, and expert competence is exactly what keeps that number small. An
 *    independent 24-replicate run over a longer demonstration horizon agreed on
 *    the direction, the monotonicity and the order of magnitude (87.5×).
 *  - The supervised metric cannot see any of this. On held-out *expert* states
 *    the clone and the DAgger policy score the same (0.019 vs 0.019); on the
 *    states they each actually visit they score 62.4 vs 1.25, and DAgger wins
 *    24/24 seeds. Reported as medians, not means: own-state error is
 *    heavy-tailed (22.7 to 712.9 here) and two runaway seeds pull the mean 2.2×
 *    above the typical one.
 *
 * One thing deliberately *not* claimed: the O(εT²) vs O(εT) bound the page
 * quotes. Measured here, cumulative deviation grows with exponent 0.44 (BC) and
 * 0.29 (DAgger) — both policies eventually stabilise, so BC produces a large
 * bounded transient rather than a quadratic blow-up. BC's disadvantage does
 * widen with the horizon (1.8× at T = 10 to 3.7× at T = 200), and that is what
 * the trace says instead.
 */

const CODE = codeLines(`
D = expert_demos()
pi = fit(D)

for i in range(1, n_iters + 1):

    # 1. roll the LEARNER, not the expert
    S = states_visited(pi)

    # 2. ask the expert what it would
    #    have done at each of those
    A = [expert(s) for s in S]

    # 3. aggregate: never discard
    D = D + list(zip(S, A))

    # 4. refit on everything so far
    pi = fit(D)
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ world */

const DT = 0.1;
const KP = 6;
const KD = 4;
/** Weight on velocity when measuring distance between states. */
const VSCALE = 0.5;
const K = 3;
/** Hand jitter on a demonstrated action. */
const JIT = 0.2;
/** Process noise the policy is evaluated against. */
const EVAL_PROC = 0.1;
/** Process noise while the expert demonstrates — a steady road, a steady hand. */
const DEMO_PROC = 0.04;
/** Beyond this the car has left its lane. */
const LANE = 1.5;
const SEED = 11;

interface Sample {
  y: number;
  v: number;
  a: number;
}
type Policy = (y: number, v: number) => number;

const expert: Policy = (y, v) => -KP * y - KD * v;

function rollout(
  policy: Policy,
  rng: () => number,
  T: number,
  y0: number,
  v0: number,
  proc: number
) {
  let y = y0;
  let v = v0;
  const pts: Sample[] = [];
  const traj: { y: number; v: number }[] = [];
  let cost = 0;
  let off = 0;
  for (let t = 0; t < T; t++) {
    pts.push({ y, v, a: expert(y, v) + gaussian(rng, 0, JIT) });
    traj.push({ y, v });
    const a = policy(y, v);
    const nv = v + DT * a + gaussian(rng, 0, proc);
    y = Math.max(-30, Math.min(30, y + DT * nv));
    v = Math.max(-30, Math.min(30, nv));
    cost += y * y;
    if (Math.abs(y) > LANE) off += 1;
  }
  return { pts, traj, cost: cost / T, offRate: off / T };
}

/** The clone: average the k nearest demonstrated actions. */
function knn(data: Sample[], k = K): Policy {
  return (y, v) => {
    const d = data
      .map((p) => {
        const dy = p.y - y;
        const dv = (p.v - v) * VSCALE;
        return { r: dy * dy + dv * dv, a: p.a };
      })
      .sort((p, q) => p.r - q.r);
    const kk = Math.min(k, d.length);
    let s = 0;
    for (let i = 0; i < kk; i++) s += d[i].a;
    return s / kk;
  };
}

function neighbours(data: Sample[], y: number, v: number, k = K) {
  return data
    .map((p) => {
      const dy = p.y - y;
      const dv = (p.v - v) * VSCALE;
      return { d: Math.sqrt(dy * dy + dv * dv), p };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
}

/** Where a gust leaves the car. Every DAgger round re-rolls from these. */
const STARTS: [number, number][] = [
  [1.2, 0],
  [-1.2, 0],
  [0.9, 0.9],
  [-0.9, -0.9],
];

function demoSet(rng: () => number, nDemo = 3, T = 40): Sample[] {
  let data: Sample[] = [];
  for (let d = 0; d < nDemo; d++) {
    data = data.concat(rollout(expert, rng, T, gaussian(rng, 0, 0.08), 0, DEMO_PROC).pts);
  }
  return data;
}

function evaluate(policy: Policy, seed: number, T = 80) {
  let cost = 0;
  let off = 0;
  for (const [y0, v0] of STARTS) {
    const r = rollout(policy, seededRng(seed * 7919 + 13), T, y0, v0, EVAL_PROC);
    cost += r.cost;
    off += r.offRate;
  }
  return { cost: cost / STARTS.length, offRate: off / STARTS.length };
}

/** Mean squared action error of `policy` measured on a given set of states. */
function actionMse(policy: Policy, pts: Sample[]) {
  let s = 0;
  for (const p of pts) {
    const e = policy(p.y, p.v) - expert(p.y, p.v);
    s += e * e;
  }
  return s / pts.length;
}

const fmt = (x: number, d = 2) => x.toFixed(d);
const span = (data: Sample[]) => Math.max(...data.map((p) => Math.abs(p.y)));
const amax = (data: Sample[]) => Math.max(...data.map((p) => Math.abs(p.a)));

/* ---------------------------------------------------------------- panels */

const PHASE: [number, number, number, number] = [-3.6, 3.6, -6, 6];
const LANEVIEW: [number, number, number, number] = [0, 80, -3.6, 3.6];

function coverage(
  label: string,
  older: Sample[],
  newer: Sample[] = [],
  probe?: { y: number; v: number }
): TraceComponent {
  return {
    t: "plot",
    label,
    domain: PHASE,
    xLabel: "lateral offset y",
    yLabel: "velocity v",
    points: [
      ...older.map((p) => ({ x: p.y, y: p.v, cls: "dim" as TraceCls })),
      ...newer.map((p) => ({ x: p.y, y: p.v, cls: "good" as TraceCls })),
      ...(probe ? [{ x: probe.y, y: probe.v, id: "here", cls: "bad" as TraceCls, shape: "cross" as const }] : []),
    ],
  };
}

function laneView(
  label: string,
  runs: { traj: { y: number; v: number }[]; cls: TraceCls }[]
): TraceComponent {
  return {
    t: "plot",
    label,
    domain: LANEVIEW,
    xLabel: "step",
    yLabel: "lateral offset y",
    curves: [
      ...runs.map((r) => ({
        pts: r.traj.map((p, i) => ({ x: i, y: Math.max(-3.6, Math.min(3.6, p.y)) })),
        cls: r.cls,
      })),
      { pts: [{ x: 0, y: LANE }, { x: 80, y: LANE }], cls: "bad" as TraceCls, dashed: true },
      { pts: [{ x: 0, y: -LANE }, { x: 80, y: -LANE }], cls: "bad" as TraceCls, dashed: true },
    ],
  };
}

/* ----------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const rng = seededRng(SEED);

  // ---- 1. the demonstrations ----------------------------------------------
  const demos = demoSet(rng);
  const heldOut = demoSet(rng, 2, 40); // fresh *expert* states, for validation

  push(
    `Three demonstrations from an expert PD controller, ${demos.length} (state, action) pairs in total. Look at the scale: the expert is competent, so it never let the car get further than y = ${fmt(
      span(demos)
    )} from the centre line, and the largest steering correction anywhere in the dataset is ${fmt(
      amax(demos)
    )}. Both of those numbers are about to matter more than the dataset's size.`,
    ln("D = expert_demos()"),
    coverage(`demonstrated states (${demos.length} pairs)`, demos),
    {
      t: "kv",
      label: "what the expert showed us",
      v: [
        { k: "pairs", v: String(demos.length) },
        { k: "max |y|", v: fmt(span(demos)), cls: "warn" },
        { k: "max |a|", v: fmt(amax(demos)), cls: "warn" },
        { k: "lane edge", v: `|y| = ${fmt(LANE, 1)}` },
      ],
    }
  );

  // ---- 2. the clone --------------------------------------------------------
  const bc = knn(demos);
  const bcHeldOut = actionMse(bc, heldOut);

  push(
    `Clone it: predict the action by averaging the k = ${K} nearest demonstrated states. On ${heldOut.length} **held-out expert states** the clone's action error is ${fmt(
      bcHeldOut,
      3
    )} — essentially the demonstrator's own jitter. By every supervised measure available at this point, this is an excellent model, and nothing in the training pipeline suggests otherwise.`,
    ln("pi = fit(D)"),
    coverage(`the clone interpolates inside this cloud`, demos),
    {
      t: "kv",
      label: "supervised report card",
      v: [
        { k: "held-out states", v: String(heldOut.length) },
        { k: "action MSE", v: fmt(bcHeldOut, 3), cls: "good" },
        { k: "verdict", v: "ship it", cls: "good" },
      ],
    }
  );

  // ---- 3. a gust, and the under-correction --------------------------------
  const [gy, gv] = STARTS[0];
  const near = neighbours(demos, gy, gv);
  const want = expert(gy, gv);
  const got = bc(gy, gv);

  push(
    `A gust puts the car at y = ${fmt(gy, 1)} — outside everything the expert ever demonstrated. The expert would steer ${fmt(
      want
    )} here. The clone averages its ${K} nearest neighbours, all of them back in the cloud at |y| < ${fmt(
      span(demos)
    )}, and returns ${fmt(got)} — a correction ${fmt(
      want / got,
      0
    )}× too small. This is the structural failure: **a clone can never output a correction larger than the largest one in its data, and the expert's competence is precisely what kept that number small.**`,
    ln("S = states_visited(pi)"),
    coverage("the car is here; its nearest data is not", demos, [], { y: gy, v: gv }),
    {
      t: "table",
      label: `the ${K} nearest demonstrated states to (y = ${fmt(gy, 1)}, v = ${fmt(gv, 1)})`,
      head: ["y", "v", "demonstrated a", "distance"],
      v: near.map((n) => ({
        cells: [fmt(n.p.y), fmt(n.p.v), fmt(n.p.a), fmt(n.d)],
        cls: "warn" as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "action at this state",
      v: [
        { k: "expert would", v: fmt(want), cls: "good" },
        { k: "clone does", v: fmt(got), cls: "bad" },
        { k: "shortfall", v: `${fmt(want / got, 0)}×`, cls: "bad" },
      ],
    }
  );

  // ---- 4. the compounding rollout -----------------------------------------
  const bcRuns = STARTS.map(([y0, v0]) => rollout(bc, seededRng(SEED * 7919 + 13), 80, y0, v0, EVAL_PROC));
  const bcEval = evaluate(bc, SEED);

  push(
    `Let it run. Under-correcting leaves the car further out than it started, where the data is sparser still, so the next action is worse than the last — the error feeds itself. Across the four gust directions the car spends ${fmt(
      bcEval.offRate * 100,
      0
    )}% of its steps outside the lane. Note what did *not* happen: the clone never made one large mistake. It made a small one at every single step, always in the same direction, and the state it was acting from got worse each time.`,
    ln("S = states_visited(pi)"),
    laneView(
      "behavioural cloning, four gusts (dashed = lane edge)",
      bcRuns.map((r) => ({ traj: r.traj, cls: "bad" as TraceCls }))
    ),
    {
      t: "kv",
      label: "behavioural cloning",
      v: [
        { k: "tracking cost", v: fmt(bcEval.cost, 2), cls: "bad" },
        { k: "steps out of lane", v: `${fmt(bcEval.offRate * 100, 0)}%`, cls: "bad" },
        { k: "held-out MSE", v: fmt(bcHeldOut, 3), cls: "good" },
      ],
    },
    {
      t: "note",
      text: "The last two rows disagree, and the disagreement is the whole subject. The supervised metric is computed on the expert's states; the cost is paid on the clone's states. Nothing in behavioural cloning connects the two.",
      cls: "warn",
    }
  );

  // ---- 5. DAgger: roll the learner ----------------------------------------
  let data = demos.slice();
  const iter1New: Sample[] = [];
  for (const [y0, v0] of STARTS) {
    iter1New.push(...rollout(bc, rng, 40, y0, v0, EVAL_PROC).pts);
  }

  push(
    `DAgger's one idea, in one line: roll out the **learner** and record where it goes, not where the expert goes. Those ${
      iter1New.length
    } states reach out to |y| = ${fmt(
      span(iter1New)
    )} — off the demonstrated cloud entirely, because the clone put them there. Keep the states; throw the clone's actions away, they are the thing that is wrong.`,
    ln("S = states_visited(pi)"),
    coverage("expert states (dim) + where the clone actually went (bright)", demos, iter1New),
    {
      t: "kv",
      label: "states collected this round",
      v: [
        { k: "new states", v: String(iter1New.length) },
        { k: "reach |y|", v: fmt(span(iter1New)), cls: "good" },
        { k: "expert reached", v: fmt(span(demos)), cls: "dim" },
      ],
    }
  );

  // ---- 6. query the expert ------------------------------------------------
  push(
    `Now ask the expert what it *would* have done at each of those states. The labels come back up to ${fmt(
      amax(iter1New)
    )} — corrections ${fmt(
      amax(iter1New) / amax(demos),
      0
    )}× larger than anything in the original demonstrations, because the states are ${fmt(
      span(iter1New) / span(demos),
      0
    )}× further out. **No amount of extra expert driving would have produced these labels**: a competent expert never visits y = ${fmt(
      span(iter1New)
    )}, so it can never demonstrate the recovery from it. This is why DAgger needs an expert you can *query*, not a recording — and why it is impractical when the expert is a tired human.`,
    ln("A = [expert(s) for s in S]"),
    {
      t: "bars",
      label: "largest correction available to the learner",
      v: [
        { k: "expert demos", val: amax(demos), show: fmt(amax(demos)), cls: "dim" },
        { k: "+ DAgger round 1", val: amax(iter1New), show: fmt(amax(iter1New)), cls: "good" },
        { k: "needed at y = 1.2", val: Math.abs(want), show: fmt(Math.abs(want)), cls: "warn" },
      ],
    },
    {
      t: "note",
      text: "The expert is a function here, so querying is free. When it is a person, every one of these labels is a moment of someone's attention — which is the whole reason offline methods like GAIL exist.",
    }
  );

  // ---- 7. aggregate + refit ------------------------------------------------
  data = data.concat(iter1New);
  const dag1 = knn(data);
  const dag1Eval = evaluate(dag1, SEED);
  const dag1Runs = STARTS.map(([y0, v0]) =>
    rollout(dag1, seededRng(SEED * 7919 + 13), 80, y0, v0, EVAL_PROC)
  );

  push(
    `Aggregate — the old data stays — and refit. **Same model class, same k, same code**; only the state distribution changed. Tracking cost falls ${fmt(
      bcEval.cost / dag1Eval.cost,
      0
    )}× from ${fmt(bcEval.cost, 2)} to ${fmt(dag1Eval.cost, 3)}, and the car now spends ${fmt(
      dag1Eval.offRate * 100,
      0
    )}% of its steps out of lane against ${fmt(
      bcEval.offRate * 100,
      0
    )}% before. Nothing was learned about *control* that behavioural cloning could not represent — the clone simply had never been shown the states where it needed to act.`,
    ln("    pi = fit(D)"),
    laneView(
      "after one DAgger round, same four gusts",
      dag1Runs.map((r) => ({ traj: r.traj, cls: "good" as TraceCls }))
    ),
    {
      t: "kv",
      label: "after aggregation round 1",
      v: [
        { k: "dataset", v: `${demos.length} → ${data.length}` },
        { k: "tracking cost", v: `${fmt(bcEval.cost, 2)} → ${fmt(dag1Eval.cost, 3)}`, cls: "good" },
        { k: "out of lane", v: `${fmt(bcEval.offRate * 100, 0)}% → ${fmt(dag1Eval.offRate * 100, 0)}%`, cls: "good" },
      ],
    }
  );

  // ---- 8. further rounds ---------------------------------------------------
  const history = [
    { it: 0, cost: bcEval.cost, n: demos.length },
    { it: 1, cost: dag1Eval.cost, n: data.length },
  ];
  let policy = dag1;
  for (let i = 2; i <= 4; i++) {
    const fresh: Sample[] = [];
    for (const [y0, v0] of STARTS) fresh.push(...rollout(policy, rng, 40, y0, v0, EVAL_PROC).pts);
    data = data.concat(fresh);
    policy = knn(data);
    history.push({ it: i, cost: evaluate(policy, SEED).cost, n: data.length });
  }

  push(
    `Rounds 2 to 4 add ${
      STARTS.length * 40
    } more labelled states each. Round 2 is still worth having (${fmt(dag1Eval.cost, 3)} → ${fmt(
      history[2].cost,
      3
    )}), rounds 3 and 4 are indistinguishable from it (${fmt(history[3].cost, 3)}, ${fmt(
      history[4].cost,
      3
    )}). That flattening is the signal to stop, and it has a cause: the learner's state distribution has stopped moving, so the states it collects are ones it already has labels for. Against round 0's ${fmt(
      bcEval.cost / dag1Eval.cost,
      0
    )}× drop, everything after the first round is a rounding error — which matters because DAgger's currency is expert queries.`,
    ln("for i in range(1, n_iters + 1)"),
    {
      t: "bars",
      label: "tracking cost after each round (lower is better)",
      max: bcEval.cost,
      v: history.map((h) => ({
        k: h.it === 0 ? "BC" : `round ${h.it}`,
        val: h.cost,
        show: fmt(h.cost, 3),
        cls: (h.it === 0 ? "bad" : h.it === 1 ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "Aggregation, measured over 24 seeds: keeping every round (0.055) beats refitting on only the newest batch (0.063–0.073). A real gap, but a modest one — the larger benefit is that the aggregated policy stops moving between rounds while the newest-batch policy keeps wobbling.",
    }
  );

  // ---- 9. payoff A: a better expert makes a worse clone --------------------
  const SWEEP = [0.02, 0.04, 0.07, 0.12, 0.2, 0.3, 0.45];
  const REPS = 12;
  const sweep = SWEEP.map((proc) => {
    let sp = 0;
    let bcC = 0;
    let dgC = 0;
    for (let s = 1; s <= REPS; s++) {
      const r = seededRng(s * 977);
      let d: Sample[] = [];
      for (let j = 0; j < 3; j++) {
        d = d.concat(rollout(expert, r, 40, gaussian(r, 0, proc * 2), 0, proc).pts);
      }
      sp += span(d);
      const p = knn(d);
      bcC += evaluate(p, s).cost;
      for (const [y0, v0] of STARTS) d = d.concat(rollout(p, r, 40, y0, v0, EVAL_PROC).pts);
      dgC += evaluate(knn(d), s).cost;
    }
    return { proc, span: sp / REPS, bc: bcC / REPS, dag: dgC / REPS };
  });
  const monotone = sweep.every((r, i) => i === 0 || r.bc <= sweep[i - 1].bc);
  const swing = sweep[0].bc / sweep[sweep.length - 1].bc;

  push(
    `**Payoff — the better the expert, the worse the clone.** Sweep how steadily the expert drives while holding the evaluation world fixed, ${REPS} replicates per point. As the expert gets *steadier*, its demonstrations cover less of the state space, and behavioural cloning gets monotonically worse: cost ${fmt(
      sweep[0].bc,
      2
    )} from the steadiest expert down to ${fmt(sweep[sweep.length - 1].bc, 3)} from the sloppiest — an ${fmt(
      swing,
      0
    )}× swing, in the direction nobody expects${
      monotone ? ", monotone across all seven levels" : ""
    }. DAgger is flat across the same sweep (${fmt(
      Math.min(...sweep.map((s) => s.dag)),
      3
    )}–${fmt(Math.max(...sweep.map((s) => s.dag)), 3)}) because it manufactures its own coverage. This is the fact that makes "collect more expert data" the wrong instinct: more data from a good expert is more of the same sliver.`,
    ln("D = expert_demos()"),
    {
      t: "plot",
      label: "tracking cost vs how far the expert's own demonstrations wander",
      domain: [0, 1.3, 0, 8],
      xLabel: "demonstrated reach, max |y|",
      yLabel: "tracking cost",
      curves: [
        { pts: sweep.map((s) => ({ x: s.span, y: s.bc })), cls: "bad" },
        { pts: sweep.map((s) => ({ x: s.span, y: s.dag })), cls: "good" },
      ],
    },
    {
      t: "table",
      label: `expert steadiness sweep (${REPS} replicates, evaluation world fixed)`,
      head: ["demo reach |y|", "BC cost", "DAgger cost"],
      v: sweep.map((s) => ({
        cells: [fmt(s.span), fmt(s.bc, 3), fmt(s.dag, 3)],
        cls: (s.proc === DEMO_PROC ? "active" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 10. payoff B: the validation metric is blind ------------------------
  // Averaged over replicates rather than read off the display seed: on seed 11
  // alone the clone's own-state MSE is 32.18, more than double the mean, so a
  // single run would overstate the gap by a factor of two.
  const REPS_B = 24;
  const blind: { bcHeld: number[]; bcOwn: number[]; dagHeld: number[]; dagOwn: number[] } = {
    bcHeld: [],
    bcOwn: [],
    dagHeld: [],
    dagOwn: [],
  };
  let dagWins = 0;
  for (let s = 1; s <= REPS_B; s++) {
    const r = seededRng(s * 977);
    let d = demoSet(r);
    const held = demoSet(r, 2, 40);
    const clone = knn(d);
    const cloneOwn: Sample[] = [];
    for (const [y0, v0] of STARTS) {
      cloneOwn.push(...rollout(clone, seededRng(s * 31 + 5), 80, y0, v0, EVAL_PROC).pts);
    }
    blind.bcHeld.push(actionMse(clone, held));
    blind.bcOwn.push(actionMse(clone, cloneOwn));

    for (const [y0, v0] of STARTS) d = d.concat(rollout(clone, r, 40, y0, v0, EVAL_PROC).pts);
    const dagged = knn(d);
    const daggedOwn: Sample[] = [];
    for (const [y0, v0] of STARTS) {
      daggedOwn.push(...rollout(dagged, seededRng(s * 31 + 5), 80, y0, v0, EVAL_PROC).pts);
    }
    blind.dagHeld.push(actionMse(dagged, held));
    blind.dagOwn.push(actionMse(dagged, daggedOwn));
    if (blind.dagOwn[blind.dagOwn.length - 1] < blind.bcOwn[blind.bcOwn.length - 1]) dagWins += 1;
  }
  // Median, not mean: the own-state error is heavy-tailed (22.7 to 712.9 across
  // these 24 seeds), so two runaway seeds pull the mean 2.2× above the typical
  // one. The median is the number that survives re-seeding.
  const median = (a: number[]) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const bcHeldM = median(blind.bcHeld);
  const bcOwnM = median(blind.bcOwn);
  const dagHeldM = median(blind.dagHeld);
  const dagOwnM = median(blind.dagOwn);

  push(
    `**Payoff — the validation metric cannot see any of this.** Score both policies two ways over ${REPS_B} replicates: action error on held-out *expert* states, the number a normal training pipeline reports, and action error on the states each policy actually *visits*. On the expert's states the two policies are **indistinguishable** — ${fmt(
      bcHeldM,
      3
    )} against ${fmt(
      dagHeldM,
      3
    )}. On their own states they are not remotely: ${fmt(bcOwnM, 1)} against ${fmt(
      dagOwnM,
      2
    )}, a ${fmt(
      bcOwnM / dagOwnM,
      0
    )}× gap that DAgger wins in ${dagWins} of ${REPS_B} seeds. Read the left pair and you would ship either policy; read the right pair and only one of them keeps the car in its lane. Aggregating did not make the policy a better fit to the expert — it changed which states the policy is asked about, and that is all "roll out, label, aggregate, refit" mechanically does.`,
    ln("S = states_visited(pi)"),
    {
      t: "bars",
      label: `action MSE, median of ${REPS_B} replicates — same policies, two state distributions`,
      v: [
        { k: "BC, on expert states", val: bcHeldM, show: fmt(bcHeldM, 3), cls: "good" },
        { k: "BC, on its own states", val: bcOwnM, show: fmt(bcOwnM, 2), cls: "bad" },
        { k: "DAgger, on expert states", val: dagHeldM, show: fmt(dagHeldM, 3), cls: "good" },
        { k: "DAgger, on its own states", val: dagOwnM, show: fmt(dagOwnM, 2), cls: "warn" },
      ],
    },
    {
      t: "note",
      text: "Both bars on the left are the honest supervised answer to \"did the model learn the expert?\" — and both say yes. The question they cannot ask is \"learn the expert where?\"",
      cls: "good",
    }
  );

  return {
    id: "dagger",
    title: "DAgger — why a better expert makes a worse clone",
    caption:
      "Lane keeping with a PD expert and a nearest-neighbour clone. The demonstrations are excellent and the clone fits them almost perfectly, but the expert never let the car drift, so the largest correction anywhere in the data is 0.84 — and when a gust needs −7.20, the clone can only supply −0.38. Watch the aggregation loop manufacture the states the expert would never visit, then two measured payoffs: a steadier expert makes cloning monotonically worse across a 7-point sweep, and the held-out validation score misses the failure by 253×.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const daggerTrace = build();
