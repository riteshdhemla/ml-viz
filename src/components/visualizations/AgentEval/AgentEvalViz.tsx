"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, seededRandom } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { clamp } from "@/lib/utils";

/**
 * Building an agent eval, stage by stage.
 *
 * The lesson lists the pieces — outcome, trajectory, judge, pass@k, budgets —
 * and each is easy to state. What no list can show is the thing that decides
 * whether an eval is worth running: **how much of what you are looking at is
 * noise**. The gap between the two agents here is a clear result at 200 tasks
 * and indistinguishable from chance at 20 — same agents, same runs, opposite
 * conclusions — and the only way to feel that is to move the number and watch
 * the intervals move.
 *
 * So the whole walkthrough is driven by two controls — how many tasks, how many
 * repeats — and everything recomputes: Wilson intervals, pass@k against pass^k
 * measured from the actual runs rather than assumed independent, Cohen's κ
 * between a simulated judge and human labels, and cost/latency per solved task.
 * Two agents are simulated from fixed per-task difficulties, so there is a
 * ground truth to compare the conclusions against.
 */

/* -------------------------------------------------------------- constants */

const TASK_COUNTS = [20, 50, 200] as const;
const K_VALUES = [1, 3, 5] as const;
const SEED = 404;

/** True per-agent skill. The eval's job is to recover the ordering. */
const AGENTS = [
  {
    id: "a",
    name: "Agent A",
    color: VIZ.teal,
    skill: 0.52,
    /** Mean tool calls per attempt, against an oracle minimum. */
    steps: 6.2,
    /** USD per solved-or-not attempt, dominated by tokens × steps. */
    costPerStep: 0.011,
    latencyPerStep: 1.9,
  },
  {
    id: "b",
    name: "Agent B",
    color: VIZ.brand,
    skill: 0.74,
    steps: 15.6,
    costPerStep: 0.036,
    latencyPerStep: 2.6,
  },
] as const;

const ORACLE_STEPS = 5;
const MAX_TASKS = Math.max(...TASK_COUNTS);
const MAX_K = Math.max(...K_VALUES);

/* --------------------------------------------------------------- sampling */

interface Attempt {
  solved: boolean;
  steps: number;
  /** Whether the trajectory touched an action the policy forbids. */
  violation: boolean;
}

/**
 * Per-task difficulty is shared between agents, so the comparison is paired —
 * the same tasks are hard for both, which is how a real benchmark behaves.
 */
const DIFFICULTY = (() => {
  const rng = seededRandom(SEED);
  return Array.from({ length: MAX_TASKS }, () => rng());
})();

/** Runs for one agent: `[task][attempt]`, drawn once at the maximum size. */
function runAgent(agentIdx: number): Attempt[][] {
  const a = AGENTS[agentIdx];
  const rng = seededRandom(SEED + 17 * (agentIdx + 1));
  return DIFFICULTY.map((d) => {
    // A task's success probability tilts with its difficulty around the skill.
    const p = clamp(a.skill + 1.1 * (0.5 - d), 0.02, 0.98);
    return Array.from({ length: MAX_K }, () => {
      const solved = rng() < p;
      const steps = Math.max(
        ORACLE_STEPS,
        Math.round(a.steps * (0.55 + 0.9 * rng()) + (solved ? 0 : 3)),
      );
      return { solved, steps, violation: rng() < (a.steps > 10 ? 0.06 : 0.02) };
    });
  });
}

const RUNS = AGENTS.map((_, i) => runAgent(i));

/* ------------------------------------------------------------- statistics */

/** Wilson score interval — the right one for proportions at small n. */
function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - spread) / d), Math.min(1, (centre + spread) / d)];
}

interface Summary {
  /** Fraction of first attempts that succeeded. */
  pass1: number;
  ci1: [number, number];
  /** Solved in at least one of k attempts — measured, not modelled. */
  passK: number;
  ciK: [number, number];
  /** Solved in all k attempts: the consistency number. */
  passPowK: number;
  /** Oracle minimum over mean steps taken. */
  efficiency: number;
  meanSteps: number;
  violations: number;
  costPerSolved: number;
  latency: number;
  solvedFirst: number;
}

function summarise(agentIdx: number, tasks: number, k: number): Summary {
  const a = AGENTS[agentIdx];
  const runs = RUNS[agentIdx].slice(0, tasks);
  let solvedFirst = 0;
  let any = 0;
  let all = 0;
  let steps = 0;
  let attempts = 0;
  let violations = 0;

  for (const task of runs) {
    const used = task.slice(0, k);
    if (used[0].solved) solvedFirst++;
    if (used.some((r) => r.solved)) any++;
    if (used.every((r) => r.solved)) all++;
    for (const r of used) {
      steps += r.steps;
      attempts++;
      if (r.violation) violations++;
    }
  }

  const meanSteps = steps / Math.max(1, attempts);
  const cost = attempts * meanSteps * a.costPerStep;
  return {
    pass1: solvedFirst / tasks,
    ci1: wilson(solvedFirst, tasks),
    passK: any / tasks,
    ciK: wilson(any, tasks),
    passPowK: all / tasks,
    efficiency: ORACLE_STEPS / meanSteps,
    meanSteps,
    violations,
    costPerSolved: cost / Math.max(1, any),
    latency: meanSteps * a.latencyPerStep,
    solvedFirst,
  };
}

/* ----------------------------------------------------------- the LLM judge */

/**
 * A simulated judge labelling "was the trajectory sound?" against human labels
 * on a held-out set. The judge agrees with the human most of the time and has a
 * bias towards passing long trajectories — the length bias the lesson warns
 * about, made measurable.
 */
const JUDGE_SET = (() => {
  const rng = seededRandom(SEED + 900);
  const n = 60;
  const rows = Array.from({ length: n }, () => {
    const long = rng() < 0.5;
    const human = rng() < (long ? 0.45 : 0.68);
    // The judge is right most of the time, and lenient on long trajectories.
    const flip = rng() < (long && !human ? 0.45 : 0.18);
    return { long, human, judge: flip ? !human : human };
  });
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  for (const r of rows) {
    if (r.judge && r.human) a++;
    else if (r.judge && !r.human) b++;
    else if (!r.judge && r.human) c++;
    else d++;
  }
  const po = (a + d) / n;
  const pe = ((a + b) * (a + c) + (c + d) * (b + d)) / (n * n);
  const kappa = (po - pe) / (1 - pe);
  const longRows = rows.filter((r) => r.long);
  const shortRows = rows.filter((r) => !r.long);
  const leniency =
    longRows.filter((r) => r.judge && !r.human).length / Math.max(1, longRows.length) -
    shortRows.filter((r) => r.judge && !r.human).length / Math.max(1, shortRows.length);
  return { n, a, b, c, d, po, pe, kappa, leniency };
})();

/* ------------------------------------------------------------ svg helpers */

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;
const usd = (x: number) => `$${x.toFixed(2)}`;

/* ---------------------------------------------------------------- phases */

const PHASES: GuidedPhase[] = [
  { id: "measure", label: "Measuring the agent", tone: "teal" },
  { id: "trust", label: "Trusting the measurement", tone: "brand", numberPrefix: "T" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "measure",
    label: "One run",
    title: "One trajectory is an anecdote",
    body: (
      <>
        <p>
          Here is a single run: a sequence of tool calls ending in success or failure. It is the
          unit everything else is built from, and on its own it tells you almost nothing — an agent
          is stochastic, so this is one draw from a distribution you have not measured.
        </p>
        <p>
          It does contain more than a verdict, though. The path is visible: which tools were called,
          how many steps it took against the {ORACLE_STEPS} an oracle needs, and whether it touched
          anything it should not have. Outcome and trajectory are both in here; the rest of the
          walkthrough is about extracting them at a scale where they mean something.
        </p>
      </>
    ),
    hint: "Two agents, two trajectories, same task. Note that the slower one is not obviously the worse one yet.",
  },
  {
    phase: "measure",
    label: "Outcome",
    title: "Success rate — with the interval that comes with it",
    body: (
      <>
        <p>
          Run every task once and count. That is the metric users care about, and it is a{" "}
          <strong>proportion estimated from a sample</strong>, so it arrives with an interval
          whether you report one or not. These are <strong>Wilson intervals</strong>, which behave
          at small n where the textbook normal interval does not.
        </p>
        <p>
          Change the task count above and watch the bars stay roughly still while the intervals
          collapse. At 20 tasks the two agents are indistinguishable; the ordering you would report
          is a coin flip dressed as a result.
        </p>
      </>
    ),
    hint: "Set tasks to 20, then to 200. The point estimates barely move; the conclusion changes completely.",
  },
  {
    phase: "measure",
    label: "Trajectory",
    title: "Two agents, same outcome, different paths",
    body: (
      <>
        <p>
          Outcome scoring cannot separate an agent that solves the task in six steps from one that
          wanders through sixteen and gets there. <strong>Efficiency</strong> normalises steps taken
          against the oracle minimum; the violation count asks whether the path touched a forbidden
          action at all.
        </p>
        <p>
          This is where an eval starts predicting production behaviour rather than benchmark
          behaviour. A long trajectory is not merely inelegant — it costs more, takes longer, and
          has more places to go wrong, all of which show up in the last step.
        </p>
      </>
    ),
    hint: "The higher-scoring agent takes more than twice as many steps to get there.",
  },
  {
    phase: "trust",
    label: "pass@k",
    title: "Repeat the runs: capability or luck?",
    body: (
      <>
        <p>
          <strong>pass@k</strong> — solved in at least one of k attempts — always rises with k, and
          measures what the agent can do when you let it retry. <strong>pass^k</strong> — solved in{" "}
          <em>all</em> k attempts — always falls, and measures whether you can depend on it.
        </p>
        <p>
          Both are computed from the actual repeated runs here rather than from{" "}
          <code>1 − (1 − p)ᵏ</code>, which assumes attempts are independent. They are not: a task
          that is hard is hard on every attempt, so the true pass@k is lower than the independence
          formula predicts. The gap between the two curves is the flakiness a single-run benchmark
          conceals.
        </p>
      </>
    ),
    hint: "Raise k and watch the two lines pull apart — that spread is the reliability story, and pass@1 shows none of it.",
  },
  {
    phase: "trust",
    label: "Validate the judge",
    title: "The judge is a model under evaluation too",
    body: (
      <>
        <p>
          Most trajectory questions have no programmatic checker, so an LLM judges them against a
          rubric. Before it can be used as ground truth it has to be scored itself, against human
          labels on a held-out set. <strong>Cohen&rsquo;s κ</strong> corrects agreement for the
          agreement you would get by chance — the raw agreement rate always looks reassuring.
        </p>
        <p>
          This judge agrees {pct(JUDGE_SET.po)} of the time, which sounds fine, and lands at κ ={" "}
          {JUDGE_SET.kappa.toFixed(2)}. Its errors are not random either: it passes long
          trajectories the human failed{" "}
          {(JUDGE_SET.leniency * 100).toFixed(0)} points more often than short ones — the length
          bias, which happens to favour exactly the agent you were trying to penalise for being
          wasteful.
        </p>
      </>
    ),
    hint: "Compare raw agreement with κ. The first number is the one that gets put in the deck.",
  },
  {
    phase: "trust",
    label: "Budgets",
    title: "Now price it",
    body: (
      <>
        <p>
          Cost is tokens × steps × price, and latency is steps × per-step time, because the steps
          are sequential. Both are properties of the trajectory, which is why trajectory metrics
          were worth collecting: they are the leading indicator of the two numbers that decide
          whether the thing ships.
        </p>
        <p>
          Judge on <strong>cost per solved task</strong>, not cost per run — an agent that fails
          cheaply is not cheap. That single division is what turns a benchmark table into a
          decision.
        </p>
      </>
    ),
    hint: "Read the last row before the success rates. The more accurate agent is several times the price per solved task.",
  },
];

const S_RUN = 0;
const S_OUTCOME = 1;
const S_TRAJ = 2;
const S_PASSK = 3;
const S_JUDGE = 4;
const S_BUDGET = 5;

/* ------------------------------------------------------------------ view */

export function AgentEvalViz({ className }: { className?: string }) {
  const [tasks, setTasks] = useState<number>(50);
  const [k, setK] = useState<number>(3);

  const stats = useMemo(() => AGENTS.map((_, i) => summarise(i, tasks, k)), [tasks, k]);
  const overlap = useMemo(() => stats[0].ci1[1] >= stats[1].ci1[0], [stats]);

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        tasks
      </span>
      {TASK_COUNTS.map((n) => (
        <VizButton key={n} onClick={() => setTasks(n)} active={tasks === n}>
          {n}
        </VizButton>
      ))}
      <span className="ml-2 self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        runs per task
      </span>
      {K_VALUES.map((n) => (
        <VizButton key={n} onClick={() => setK(n)} active={k === n}>
          k={n}
        </VizButton>
      ))}
    </>
  );

  /* -------------------------------------------------------------- stages */

  /** Step 01 — one trajectory per agent on the same task. */
  const runStage = () => {
    const TOOLS = ["plan", "search", "read", "search", "read", "compare", "read", "draft", "verify", "submit"];
    return (
      <svg viewBox="0 0 680 250" className="block w-full" role="img" aria-label="One trajectory per agent on the same task, as a sequence of tool calls">
        {AGENTS.map((a, ai) => {
          const run = RUNS[ai][0][0];
          const shown = Math.min(run.steps, 10);
          const y = 52 + ai * 96;
          return (
            <g key={a.id}>
              <text x={40} y={y - 16} fill={a.color} className="font-mono text-[10px]">
                {a.name} · task 1 · {run.steps} steps
              </text>
              {Array.from({ length: shown }, (_, s) => (
                <g key={s}>
                  <rect x={40 + s * 58} y={y} width={50} height={26} rx={4} fill={a.color} opacity={0.16} stroke={a.color} strokeOpacity={0.4} />
                  <text x={65 + s * 58} y={y + 17} textAnchor="middle" fill={VIZ.text} className="font-mono text-[8.5px]">
                    {TOOLS[s % TOOLS.length]}
                  </text>
                </g>
              ))}
              {run.steps > shown && (
                <text x={40 + shown * 58 + 6} y={y + 17} fill={VIZ.text} className="font-mono text-[9px]">
                  +{run.steps - shown} more
                </text>
              )}
              <text x={40} y={y + 44} fill={run.solved ? VIZ.teal : VIZ.rose} className="font-mono text-[9px]">
                outcome: {run.solved ? "solved" : "failed"}
              </text>
              <text x={180} y={y + 44} fill={VIZ.text} className="font-mono text-[9px]">
                efficiency {ORACLE_STEPS}/{run.steps} = {(ORACLE_STEPS / run.steps).toFixed(2)}
              </text>
              <text x={392} y={y + 44} fill={run.violation ? VIZ.rose : VIZ.text} className="font-mono text-[9px]">
                policy violations: {run.violation ? 1 : 0}
              </text>
            </g>
          );
        })}
        <text x={40} y={236} fill={VIZ.text} className="font-mono text-[9px]">
          one draw each · everything below is about doing this enough times to mean something
        </text>
      </svg>
    );
  };

  /** Step 02 — success rate with Wilson intervals. */
  const outcomeStage = () => {
    const box = { x: 150, y: 60, w: 450, h: 120 };
    const px = (p: number) => box.x + p * box.w;
    return (
      <svg viewBox="0 0 680 250" className="block w-full" role="img" aria-label="Success rate for each agent with 95% Wilson confidence intervals">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={px(g)} y1={box.y - 6} x2={px(g)} y2={box.y + box.h} stroke={VIZ.grid} strokeWidth={0.5} />
            <text x={px(g)} y={box.y + box.h + 16} textAnchor="middle" fill={VIZ.text} className="font-mono text-[9px]">
              {pct(g)}
            </text>
          </g>
        ))}
        {AGENTS.map((a, ai) => {
          const s = stats[ai];
          const y = box.y + 26 + ai * 60;
          return (
            <g key={a.id}>
              <text x={140} y={y + 4} textAnchor="end" fill={a.color} className="font-mono text-[10px]">
                {a.name}
              </text>
              <line x1={px(s.ci1[0])} y1={y} x2={px(s.ci1[1])} y2={y} stroke={a.color} strokeWidth={2} opacity={0.45} />
              <line x1={px(s.ci1[0])} y1={y - 7} x2={px(s.ci1[0])} y2={y + 7} stroke={a.color} strokeWidth={2} opacity={0.45} />
              <line x1={px(s.ci1[1])} y1={y - 7} x2={px(s.ci1[1])} y2={y + 7} stroke={a.color} strokeWidth={2} opacity={0.45} />
              <circle cx={px(s.pass1)} cy={y} r={5} fill={a.color} />
              <text x={px(s.pass1)} y={y - 14} textAnchor="middle" fill={VIZ.textBright} className="font-mono text-[10px]">
                {pct1(s.pass1)}
              </text>
              <text x={610} y={y + 4} fill={VIZ.text} className="font-mono text-[9px]">
                ±{(((s.ci1[1] - s.ci1[0]) / 2) * 100).toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x={40} y={30} fill={VIZ.textBright} className="font-mono text-[10px]">
          pass@1 over {tasks} tasks · 95% Wilson interval
        </text>
        <text x={40} y={216} fill={overlap ? VIZ.rose : VIZ.teal} className="font-mono text-[10px]">
          {overlap
            ? `intervals overlap at n = ${tasks} — this eval cannot tell these agents apart`
            : `intervals separate at n = ${tasks} — the ordering is a real result`}
        </text>
        <text x={40} y={234} fill={VIZ.text} className="font-mono text-[9px]">
          true skill: Agent A {pct(AGENTS[0].skill)}, Agent B {pct(AGENTS[1].skill)} — the ordering the eval should recover
        </text>
      </svg>
    );
  };

  /** Step 03 — trajectory metrics side by side. */
  const trajectoryStage = () => (
    <svg viewBox="0 0 680 250" className="block w-full" role="img" aria-label="Trajectory metrics: steps, efficiency and policy violations for each agent">
      {["", "pass@1", "mean steps", "efficiency", "violations"].map((h, i) => (
        <text key={h + i} x={[40, 200, 320, 450, 570][i]} y={34} fill={VIZ.text} className="font-mono text-[9px] uppercase tracking-[0.1em]">
          {h}
        </text>
      ))}
      {AGENTS.map((a, ai) => {
        const s = stats[ai];
        const y = 56 + ai * 52;
        return (
          <g key={a.id}>
            <rect x={34} y={y} width={612} height={40} rx={5} fill={VIZ.card} opacity={0.5} />
            <text x={44} y={y + 25} fill={a.color} className="font-mono text-[10px]">
              {a.name}
            </text>
            <text x={200} y={y + 25} fill={VIZ.textBright} className="font-mono text-[10px]">
              {pct1(s.pass1)}
            </text>
            <text x={320} y={y + 25} fill={VIZ.textBright} className="font-mono text-[10px]">
              {s.meanSteps.toFixed(1)}
            </text>
            <text x={450} y={y + 25} fill={VIZ.textBright} className="font-mono text-[10px]">
              {s.efficiency.toFixed(2)}
            </text>
            <rect x={492} y={y + 15} width={70 * s.efficiency} height={8} rx={2} fill={a.color} opacity={0.6} />
            <text x={570} y={y + 25} fill={s.violations ? VIZ.rose : VIZ.teal} className="font-mono text-[10px]">
              {s.violations}
            </text>
          </g>
        );
      })}
      <text x={40} y={186} fill={VIZ.textBright} className="font-mono text-[10px]">
        oracle minimum is {ORACLE_STEPS} steps · efficiency = {ORACLE_STEPS} / steps taken
      </text>
      <text x={40} y={208} fill={VIZ.text} className="font-mono text-[9px]">
        {AGENTS[1].name} scores {(stats[1].pass1 - stats[0].pass1) * 100 >= 0 ? "+" : ""}
        {((stats[1].pass1 - stats[0].pass1) * 100).toFixed(1)} points higher and takes{" "}
        {(stats[1].meanSteps / stats[0].meanSteps).toFixed(1)}× as many steps to do it
      </text>
      <text x={40} y={228} fill={VIZ.text} className="font-mono text-[9px]">
        over {tasks} tasks × k = {k} runs, so {tasks * k} trajectories per agent
      </text>
    </svg>
  );

  /** Step T1 — pass@k against pass^k as k grows. */
  const passKStage = () => {
    const box = { x: 90, y: 46, w: 520, h: 150 };
    const px = (i: number) => box.x + (i / (MAX_K - 1)) * box.w;
    const py = (p: number) => box.y + box.h - p * box.h;
    return (
      <svg viewBox="0 0 680 260" className="block w-full" role="img" aria-label="pass@k rising and pass^k falling as the number of repeated runs grows">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={box.x} y1={py(g)} x2={box.x + box.w} y2={py(g)} stroke={VIZ.grid} strokeWidth={0.5} />
            <text x={box.x - 8} y={py(g) + 3} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
              {pct(g)}
            </text>
          </g>
        ))}
        {AGENTS.map((a, ai) => {
          const series = K_VALUES.map((kk) => summarise(ai, tasks, kk));
          const line = (get: (s: Summary) => number, dash?: string) => (
            <path
              d={series.map((s, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(get(s)).toFixed(1)}`).join("")}
              fill="none"
              stroke={a.color}
              strokeWidth={1.8}
              strokeDasharray={dash}
            />
          );
          const indep = K_VALUES.map((kk) => 1 - (1 - series[0].pass1) ** kk);
          return (
            <g key={a.id}>
              {line((s) => s.passK)}
              {line((s) => s.passPowK, "5 3")}
              <path
                d={indep.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join("")}
                fill="none"
                stroke={VIZ.axis}
                strokeWidth={0.9}
                strokeDasharray="2 3"
              />
              {series.map((s, i) => (
                <g key={i}>
                  <circle cx={px(i)} cy={py(s.passK)} r={3.2} fill={a.color} />
                  <circle cx={px(i)} cy={py(s.passPowK)} r={3.2} fill={VIZ.card} stroke={a.color} strokeWidth={1.4} />
                </g>
              ))}
            </g>
          );
        })}
        {K_VALUES.map((kk, i) => (
          <text key={kk} x={px(i)} y={box.y + box.h + 18} textAnchor="middle" fill={kk === k ? VIZ.textBright : VIZ.text} className="font-mono text-[9px]">
            k = {kk}
          </text>
        ))}
        <text x={40} y={28} fill={VIZ.textBright} className="font-mono text-[10px]">
          solid: pass@k (any) · hollow: pass^k (all) · faint: 1 − (1 − p)ᵏ if attempts were independent
        </text>
        <text x={40} y={232} fill={VIZ.text} className="font-mono text-[9px]">
          at k = {k}: {AGENTS[0].name} pass@k {pct1(stats[0].passK)} vs consistency {pct1(stats[0].passPowK)} ·{" "}
          {AGENTS[1].name} {pct1(stats[1].passK)} vs {pct1(stats[1].passPowK)}
        </text>
        <text x={40} y={250} fill={VIZ.text} className="font-mono text-[9px]">
          the measured pass@k sits below the independence curve because a hard task stays hard on every attempt
        </text>
      </svg>
    );
  };

  /** Step T2 — the judge's confusion matrix against human labels. */
  const judgeStage = () => {
    const cells = [
      { label: "judge pass · human pass", n: JUDGE_SET.a, good: true },
      { label: "judge pass · human fail", n: JUDGE_SET.b, good: false },
      { label: "judge fail · human pass", n: JUDGE_SET.c, good: false },
      { label: "judge fail · human fail", n: JUDGE_SET.d, good: true },
    ];
    return (
      <svg viewBox="0 0 680 250" className="block w-full" role="img" aria-label="Agreement between the LLM judge and human labels, with Cohen's kappa">
        <text x={40} y={28} fill={VIZ.textBright} className="font-mono text-[10px]">
          judge vs human on {JUDGE_SET.n} held-out trajectories
        </text>
        {cells.map((c, i) => {
          const x = 60 + (i % 2) * 150;
          const y = 48 + Math.floor(i / 2) * 76;
          return (
            <g key={c.label}>
              <rect x={x} y={y} width={136} height={64} rx={5} fill={c.good ? VIZ.teal : VIZ.rose} opacity={0.14} stroke={c.good ? VIZ.teal : VIZ.rose} strokeOpacity={0.35} />
              <text x={x + 68} y={y + 30} textAnchor="middle" fill={VIZ.textBright} className="font-mono text-[15px]">
                {c.n}
              </text>
              <text x={x + 68} y={y + 48} textAnchor="middle" fill={VIZ.text} className="font-mono text-[7.5px]">
                {c.label}
              </text>
            </g>
          );
        })}
        <text x={390} y={70} fill={VIZ.text} className="font-mono text-[10px]">
          raw agreement
        </text>
        <text x={628} y={70} textAnchor="end" fill={VIZ.textBright} className="font-mono text-[10px]">
          {pct1(JUDGE_SET.po)}
        </text>
        <text x={390} y={96} fill={VIZ.text} className="font-mono text-[10px]">
          expected by chance
        </text>
        <text x={628} y={96} textAnchor="end" fill={VIZ.text} className="font-mono text-[10px]">
          {pct1(JUDGE_SET.pe)}
        </text>
        <line x1={390} y1={110} x2={628} y2={110} stroke={VIZ.grid} strokeWidth={0.6} />
        <text x={390} y={132} fill={VIZ.text} className="font-mono text-[10px]">
          Cohen&rsquo;s κ
        </text>
        <text x={628} y={132} textAnchor="end" fill={JUDGE_SET.kappa < 0.6 ? VIZ.yellow : VIZ.teal} className="font-mono text-[13px]">
          {JUDGE_SET.kappa.toFixed(2)}
        </text>
        <text x={390} y={156} fill={VIZ.text} className="font-mono text-[8.5px]">
          {JUDGE_SET.kappa < 0.4 ? "fair" : JUDGE_SET.kappa < 0.6 ? "moderate" : "substantial"} agreement — usable with care,
        </text>
        <text x={390} y={170} fill={VIZ.text} className="font-mono text-[8.5px]">
          not usable as ground truth
        </text>
        <text x={40} y={206} fill={VIZ.rose} className="font-mono text-[9px]">
          length bias: the judge passes long trajectories the human failed{" "}
          {(JUDGE_SET.leniency * 100).toFixed(0)} points more often than short ones
        </text>
        <text x={40} y={228} fill={VIZ.text} className="font-mono text-[9px]">
          which flatters exactly the agent that a trajectory metric would have penalised
        </text>
      </svg>
    );
  };

  /** Step T3 — the budget table, the payoff. */
  const budgetStage = () => {
    const rows: [string, (s: Summary, i: number) => string][] = [
      ["pass@1", (s) => pct1(s.pass1)],
      [`pass@${k}`, (s) => pct1(s.passK)],
      [`consistency (pass^${k})`, (s) => pct1(s.passPowK)],
      ["mean steps", (s) => s.meanSteps.toFixed(1)],
      ["latency per run", (s) => `${s.latency.toFixed(0)}s`],
      ["cost per solved task", (s) => usd(s.costPerSolved)],
    ];
    return (
      <svg viewBox="0 0 680 260" className="block w-full" role="img" aria-label="Eval report: accuracy, trajectory and budget metrics for both agents">
        {AGENTS.map((a, ai) => (
          <text key={a.id} x={400 + ai * 150} y={30} textAnchor="middle" fill={a.color} className="font-mono text-[10px]">
            {a.name}
          </text>
        ))}
        {rows.map(([label, get], i) => {
          const y = 46 + i * 32;
          const last = i === rows.length - 1;
          return (
            <g key={label}>
              <rect x={34} y={y} width={612} height={26} rx={4} fill={last ? VIZ.orange : VIZ.card} opacity={last ? 0.14 : 0.45} />
              <text x={46} y={y + 17} fill={last ? VIZ.orange : VIZ.text} className="font-mono text-[9.5px]">
                {label}
              </text>
              {AGENTS.map((a, ai) => (
                <text key={a.id} x={400 + ai * 150} y={y + 17} textAnchor="middle" fill={VIZ.textBright} className="font-mono text-[10px]">
                  {get(stats[ai], ai)}
                </text>
              ))}
            </g>
          );
        })}
        <text x={40} y={244} fill={VIZ.text} className="font-mono text-[9px]">
          {AGENTS[1].name} is {((stats[1].pass1 - stats[0].pass1) * 100).toFixed(1)} points more
          accurate and {(stats[1].costPerSolved / stats[0].costPerSolved).toFixed(1)}× the cost per
          solved task
        </text>
      </svg>
    );
  };

  const stage = (i: number) => {
    if (i === S_RUN) return runStage();
    if (i === S_OUTCOME) return outcomeStage();
    if (i === S_TRAJ) return trajectoryStage();
    if (i === S_PASSK) return passKStage();
    if (i === S_JUDGE) return judgeStage();
    return budgetStage();
  };

  /* --------------------------------------------------------------- panel */

  const panel = (i: number) => (
    <>
      <PanelTitle>What the eval can claim so far</PanelTitle>
      <div className="flex flex-wrap gap-2.5">
        <GuidedCard label="sample" accent={VIZ.teal}>
          <Num>{tasks}</Num> tasks × <Num>{k}</Num> runs = {tasks * k} trajectories per agent.
        </GuidedCard>

        {i >= S_OUTCOME && (
          <GuidedCard label="outcome" accent={overlap ? VIZ.rose : VIZ.brandLight}>
            A {pct1(stats[0].pass1)} vs B {pct1(stats[1].pass1)} ·{" "}
            <Num>{overlap ? "intervals overlap" : "intervals separate"}</Num>.
          </GuidedCard>
        )}

        {i >= S_TRAJ && (
          <GuidedCard label="trajectory" accent={VIZ.brand}>
            Efficiency {stats[0].efficiency.toFixed(2)} vs {stats[1].efficiency.toFixed(2)} ·{" "}
            {stats[0].violations + stats[1].violations} policy violations.
          </GuidedCard>
        )}

        {i >= S_PASSK && (
          <GuidedCard label="reliability" accent={VIZ.yellow}>
            B: pass@{k} <Num>{pct1(stats[1].passK)}</Num>, consistency {pct1(stats[1].passPowK)}.
          </GuidedCard>
        )}

        {i >= S_JUDGE && (
          <GuidedCard label="judge" accent={JUDGE_SET.kappa < 0.6 ? VIZ.yellow : VIZ.teal}>
            κ = <Num>{JUDGE_SET.kappa.toFixed(2)}</Num> against human labels, with a length bias.
          </GuidedCard>
        )}

        {i >= S_BUDGET && (
          <GuidedCard label="budget" accent={VIZ.orange}>
            Cost per solved task {usd(stats[0].costPerSolved)} vs{" "}
            <Num>{usd(stats[1].costPerSolved)}</Num>.
          </GuidedCard>
        )}
      </div>

      {i === S_OUTCOME && (
        <GuidedPayoff label="what n buys you">
          At {tasks} tasks the 95% interval on Agent A is ±
          {(((stats[0].ci1[1] - stats[0].ci1[0]) / 2) * 100).toFixed(1)} points.{" "}
          {overlap
            ? "That is wider than the gap between the two agents, so this eval cannot rank them — and it will still print a ranking if you let it."
            : "That is narrower than the gap between the agents, so the ordering survives the noise."}{" "}
          Precision on a proportion improves with <em>√n</em>: every halving of the interval costs
          four times the tasks.
        </GuidedPayoff>
      )}

      {i === S_BUDGET && (
        <GuidedPayoff label="the report that decides">
          Agent B wins on accuracy and loses on everything the accuracy costs:{" "}
          <strong className="font-semibold text-white">
            {(stats[1].meanSteps / stats[0].meanSteps).toFixed(1)}× the steps,{" "}
            {(stats[1].latency / stats[0].latency).toFixed(1)}× the latency,{" "}
            {(stats[1].costPerSolved / stats[0].costPerSolved).toFixed(1)}× the cost per solved task
          </strong>
          . Neither number is the answer on its own — the point of the whole pipeline is that you now
          have both, plus an honest interval around the part that is estimated, plus a judge whose
          agreement you have measured rather than assumed.
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i === S_PASSK)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>Agent A</GuidedLegend>
          <GuidedLegend color={VIZ.brand}>Agent B</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>independence assumption</GuidedLegend>
        </>
      );
    if (i === S_JUDGE)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>judge and human agree</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>disagree</GuidedLegend>
        </>
      );
    return (
      <>
        <GuidedLegend color={VIZ.teal}>Agent A</GuidedLegend>
        <GuidedLegend color={VIZ.brand}>Agent B</GuidedLegend>
      </>
    );
  };

  const stageNote = () => `${tasks} tasks · k = ${k}`;

  return (
    <GuidedViz
      className={className}
      title="Building an agent eval, step by step"
      caption="Two simulated agents with fixed true skills, evaluated the way the lesson describes: outcome, then trajectory, then repeated runs, then a judge that is itself validated, then budgets. Wilson intervals, pass@k and pass^k, Cohen's κ and cost per solved task are all computed from the runs. The task-count and repeat controls re-run the whole eval, which is the point — most of what an eval reports is a function of how many times you looked."
      phases={PHASES}
      steps={STEPS}
      controls={controls}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
    />
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
      {children}
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-200">{children}</span>;
}
