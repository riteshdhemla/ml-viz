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

/**
 * The continuous-training loop, one stage at a time.
 *
 * The lesson names the pieces — maturity levels, CI/CD/CT, retraining triggers,
 * validation gates — and every one of them sounds obviously good. What a list
 * cannot show is that **each stage is answering a specific failure**, that the
 * failures are not interchangeable, and that the most sophisticated-sounding
 * trigger is the one that fails hardest.
 *
 * So this runs the loop for real over 180 simulated days: a logistic model
 * retrained on a rolling 21-day window, scored daily on fresh traffic, with
 * labels arriving a week late. Three worlds and four triggers, and everything
 * on screen — accuracy, PSI, promotion decisions, the scoreboard — comes out of
 * the simulation.
 *
 * Two faults are planted in the *training* stream (serving traffic stays clean),
 * because they fail in different ways and so justify different gates:
 *
 *   - a feature collapses to a constant (a broken upstream join). Visible in the
 *     input statistics, so a data-validation gate catches it before training.
 *   - the labelling job regresses and emits noise. The inputs are perfect and
 *     the model trains happily; only holding the candidate against the incumbent
 *     on real labelled traffic catches it.
 *
 * Measured against the shipped simulation, and the reason the steps are ordered
 * the way they are:
 *   - Steady world: every trigger lands within 0.01 of never retraining, so the
 *     schedule's runs buy zero accuracy — the lesson's "maturity is a means"
 *     callout, as a number.
 *   - On that same steady world, ungated CT is *worse than never retraining*
 *     (0.800 vs 0.894, worst day 0.168) because it ships both faults. Gating it
 *     restores 0.893 / 0.848. Where the world does move, ungated CT still beats
 *     standing still — the gates are what stop it being a liability, not what
 *     make it worthwhile.
 *   - The drift trigger fires 4 times during the covariate shift on the drifting
 *     world — a stretch in which the un-retrained model spends 0 of 74 days
 *     below the SLO. On the shock world it never fires at all: PSI stays under
 *     0.06 while accuracy sits below the SLO for 85 days straight, so it scores
 *     exactly as well as never retraining.
 *   - Monitoring is LABEL_DELAY days blind by construction: on the shock world
 *     true accuracy collapses on day 95 and the monitored line only crosses the
 *     SLO on day 102, which is why the performance trigger reacts late.
 */

/* -------------------------------------------------------------- constants */

const DAYS = 180;
const TRAIN_PER_DAY = 60;
const EVAL_PER_DAY = 250;
/** Rows per day used for the drift estimate — enough for a stable PSI. */
const PSI_SAMPLE = 100;
/** Rolling training window, in days. */
const WINDOW = 21;
/** How long before a day's labels are usable for evaluation. */
const LABEL_DELAY = 7;
/** Minimum days between pipeline runs. */
const COOLDOWN = 7;
/** A failed gate re-runs this many days later rather than waiting for the trigger. */
const RETRY = 3;
const SLO = 0.84;
/** Bottom of the accuracy axis — below any value the simulation can reach. */
const ACC_FLOOR = 0.12;
const SCHEDULE_DAYS = 14;
const PSI_THRESHOLD = 0.25;
/** Label noise sharpness — sets the achievable accuracy ceiling. */
const SHARPNESS = 5;
const SEED = 5;
const THETA0 = 0.9;

/** Training-stream faults. Serving traffic is never corrupted. */
const FEATURE_FAULT: [number, number] = [63, 92];
const LABEL_FAULT: [number, number] = [132, 164];

const SCENARIOS = [
  { id: "steady", label: "Steady", note: "no drift" },
  { id: "drifting", label: "Drifting", note: "covariate shift, then concept drift" },
  { id: "shock", label: "Shock", note: "sudden regime change on day 95" },
] as const;
type ScenarioId = (typeof SCENARIOS)[number]["id"];

const TRIGGERS = [
  { id: "none", label: "None", note: "train once, never again" },
  { id: "schedule", label: "Schedule", note: `every ${SCHEDULE_DAYS} days` },
  { id: "drift", label: "Drift", note: `PSI > ${PSI_THRESHOLD}` },
  { id: "performance", label: "Performance", note: `measured accuracy < ${SLO}` },
] as const;
type TriggerId = (typeof TRIGGERS)[number]["id"];

interface Gates {
  data: boolean;
  model: boolean;
}

/* ------------------------------------------------------------------ world */

/** Feature-space direction along the fixed boundary — moving along it is a pure covariate shift. */
const TANGENT = [-Math.sin(THETA0), Math.cos(THETA0)];

function worldAt(scenario: ScenarioId, day: number) {
  let theta = THETA0;
  let shift = 0;
  if (scenario === "drifting") {
    // A pure covariate shift first (the data moves, the boundary does not),
    // then a pure concept rotation (the boundary moves, the data does not).
    shift = 2.2 * Math.min(1, Math.max(0, (day - 25) / 30));
    theta = THETA0 + 1.5 * Math.min(1, Math.max(0, (day - 95) / 30));
  } else if (scenario === "shock" && day >= 95) {
    theta = THETA0 + 1.7;
  }
  return { theta, shift };
}

function gaussian(rnd: () => number) {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface Row {
  x: [number, number];
  y: number;
}

function sampleDay(scenario: ScenarioId, day: number, rnd: () => number, n: number) {
  const { theta, shift } = worldAt(scenario, day);
  const w = [Math.cos(theta), Math.sin(theta)];
  const rows: (Row & { u: number })[] = [];
  for (let i = 0; i < n; i++) {
    const x: [number, number] = [
      gaussian(rnd) + TANGENT[0] * shift,
      gaussian(rnd) + TANGENT[1] * shift,
    ];
    const m = w[0] * x[0] + w[1] * x[1];
    rows.push({ x, y: rnd() < 1 / (1 + Math.exp(-SHARPNESS * m)) ? 1 : 0, u: rnd() });
  }
  return rows;
}

const inFault = (d: number, f: [number, number]) => d >= f[0] && d <= f[1];

/**
 * Build both streams once per scenario — the sim reruns over them many times,
 * so the per-day column views are precomputed here rather than re-sliced inside
 * the loop.
 */
function buildWorld(scenario: ScenarioId) {
  const rndT = seededRandom(SEED);
  const rndE = seededRandom(SEED + 1000);
  const train: Row[][] = [];
  const serve: Row[][] = [];
  /** A subsample per day, enough to estimate PSI without rescanning every row. */
  const psiCols: [number[], number[]][] = [];
  for (let d = 0; d < DAYS; d++) {
    const raw = sampleDay(scenario, d, rndT, TRAIN_PER_DAY);
    const featBad = inFault(d, FEATURE_FAULT);
    const labelBad = inFault(d, LABEL_FAULT);
    train.push(
      raw.map((r) => ({
        x: featBad ? ([r.x[0], 0] as [number, number]) : r.x,
        y: labelBad ? (r.u < 0.5 ? 1 : 0) : r.y,
      })),
    );
    const day = sampleDay(scenario, d, rndE, EVAL_PER_DAY).map((r) => ({ x: r.x, y: r.y }));
    serve.push(day);
    const sub = day.slice(0, PSI_SAMPLE);
    psiCols.push([sub.map((r) => r.x[0]), sub.map((r) => r.x[1])]);
  }
  return { train, serve, psiCols };
}

type World = ReturnType<typeof buildWorld>;

/** Accuracy over a day range, without materialising the concatenation. */
function accuracyRange(m: Model, serve: Row[][], from: number, to: number) {
  let hit = 0;
  let n = 0;
  for (let d = Math.max(0, from); d <= to; d++) {
    for (const r of serve[d]) {
      if (predict(m, r.x) === r.y) hit += 1;
      n += 1;
    }
  }
  return n ? hit / n : 1;
}

/* ------------------------------------------------------------------ model */

interface Model {
  w: [number, number];
  b: number;
}

function fitLogistic(rows: Row[]): Model {
  const w: [number, number] = [0, 0];
  let b = 0;
  const n = rows.length;
  const lr = 0.9;
  const L2 = 0.002;
  for (let s = 0; s < 200; s++) {
    let g0 = 0;
    let g1 = 0;
    let gb = 0;
    for (const r of rows) {
      const e = r.y - 1 / (1 + Math.exp(-(w[0] * r.x[0] + w[1] * r.x[1] + b)));
      g0 += e * r.x[0];
      g1 += e * r.x[1];
      gb += e;
    }
    w[0] += lr * (g0 / n - L2 * w[0]);
    w[1] += lr * (g1 / n - L2 * w[1]);
    b += lr * (gb / n);
  }
  return { w, b };
}

const predict = (m: Model, x: [number, number]) => (m.w[0] * x[0] + m.w[1] * x[1] + m.b > 0 ? 1 : 0);

const accuracy = (m: Model, rows: Row[]) =>
  rows.length ? rows.reduce((a, r) => a + (predict(m, r.x) === r.y ? 1 : 0), 0) / rows.length : 1;

/* ------------------------------------------------- population stability index */

function binEdges(values: number[], k = 8) {
  const s = [...values].sort((a, b) => a - b);
  const e: number[] = [];
  for (let i = 1; i < k; i++) e.push(s[Math.floor((i / k) * s.length)]);
  return e;
}

function histogram(values: number[], edges: number[]) {
  const c = new Array<number>(edges.length + 1).fill(0);
  for (const v of values) {
    let i = 0;
    while (i < edges.length && v > edges[i]) i++;
    c[i] += 1;
  }
  return c.map((n) => (n + 0.5) / (values.length + 0.5 * c.length));
}

function psi(refValues: number[], curValues: number[], edges: number[]) {
  const a = histogram(refValues, edges);
  const b = histogram(curValues, edges);
  return a.reduce((s, p, i) => s + (b[i] - p) * Math.log(b[i] / p), 0);
}

/* -------------------------------------------------------------- the loop */

type DayEvent = "promoted" | "rejected" | "skipped";

interface DayLog {
  day: number;
  acc: number;
  monitored: number | null;
  psi: number;
  event: DayEvent | null;
}

interface RunResult {
  log: DayLog[];
  promoted: number;
  rejected: number;
  skipped: number;
  mean: number;
  below: number;
  worst: number;
}

function simulate(world: World, trigger: TriggerId, gates: Gates): RunResult {
  const { train, serve, psiCols } = world;
  const batch = (upto: number) => train.slice(Math.max(0, upto - WINDOW), upto).flat();

  let model = fitLogistic(batch(WINDOW));

  /** Concatenate the PSI subsamples for a day range. */
  const psiWindow = (from: number, to: number, f: 0 | 1) => {
    const out: number[] = [];
    for (let d = Math.max(0, from); d <= to; d++) out.push(...psiCols[d][f]);
    return out;
  };

  // The drift reference profiles the SERVING traffic the model was trained
  // against, not the training table. Profiling the training table would let a
  // corrupted feature poison the drift signal as well as the model.
  let refCols: number[][] = [];
  let refEdges: number[][] = [];
  const setReference = (upto: number) => {
    refCols = [psiWindow(upto - WINDOW, upto - 1, 0), psiWindow(upto - WINDOW, upto - 1, 1)];
    refEdges = [binEdges(refCols[0]), binEdges(refCols[1])];
  };
  setReference(WINDOW);

  const log: DayLog[] = [];
  let promoted = 0;
  let rejected = 0;
  let skipped = 0;
  let last = WINDOW - COOLDOWN;

  for (let d = WINDOW; d < DAYS; d++) {
    const acc = accuracy(model, serve[d]);
    const seen = d - LABEL_DELAY;
    const monitored =
      seen >= WINDOW ? accuracyRange(model, serve, Math.max(WINDOW, seen - 6), seen) : null;
    const psiVal = Math.max(
      psi(refCols[0], psiWindow(d - 6, d, 0), refEdges[0]),
      psi(refCols[1], psiWindow(d - 6, d, 1), refEdges[1]),
    );

    let fire = false;
    if (d - last >= COOLDOWN) {
      if (trigger === "schedule" && d - last >= SCHEDULE_DAYS) fire = true;
      if (trigger === "drift" && psiVal > PSI_THRESHOLD) fire = true;
      if (trigger === "performance" && monitored !== null && monitored < SLO) fire = true;
    }

    let event: DayEvent | null = null;
    if (fire) {
      last = d;
      const rows = batch(d);
      // Data validation as a training/serving skew check: the training table for
      // this window should look like the traffic it was recorded from.
      const sdTrain = Math.sqrt(rows.reduce((a, r) => a + r.x[1] ** 2, 0) / rows.length);
      const serveCol = psiWindow(d - WINDOW, d - 1, 1);
      const sdServe = Math.sqrt(serveCol.reduce((a, v) => a + v * v, 0) / serveCol.length);
      if (gates.data && sdTrain < 0.5 * sdServe) {
        skipped += 1;
        event = "skipped";
        last = d - COOLDOWN + RETRY;
      } else {
        const candidate = fitLogistic(rows);
        if (gates.model) {
          // Model validation: beat the incumbent on the freshest labelled traffic.
          const lo = Math.max(WINDOW, seen - 6);
          if (
            accuracyRange(candidate, serve, lo, seen) >=
            accuracyRange(model, serve, lo, seen) - 0.02
          ) {
            model = candidate;
            setReference(d);
            promoted += 1;
            event = "promoted";
          } else {
            rejected += 1;
            event = "rejected";
            last = d - COOLDOWN + RETRY;
          }
        } else {
          model = candidate;
          setReference(d);
          promoted += 1;
          event = "promoted";
        }
      }
    }
    log.push({ day: d, acc, monitored, psi: psiVal, event });
  }

  const accs = log.map((l) => l.acc);
  return {
    log,
    promoted,
    rejected,
    skipped,
    mean: accs.reduce((a, b) => a + b, 0) / accs.length,
    below: accs.filter((a) => a < SLO).length,
    worst: Math.min(...accs),
  };
}

/* ------------------------------------------------------------------ steps */

const S_MONITOR = 1;
const S_TRIGGER = 2;
const S_DATA = 3;
const S_MODEL = 4;
const S_LADDER = 5;

const PHASES: GuidedPhase[] = [
  { id: "deploy", label: "Level 0 · a model in production", tone: "teal" },
  { id: "trigger", label: "Level 1 · continuous training", tone: "brand", numberPrefix: "T" },
  { id: "gates", label: "Level 1 · validation gates", tone: "yellow", numberPrefix: "G" },
  { id: "ladder", label: "Level 2 · what it bought", tone: "orange", numberPrefix: "L" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "deploy",
    label: "Deploy a model",
    title: "A deployed model decays even though its code never changes",
    body: (
      <>
        <p>
          One model, trained once on the first three weeks and left alone — the Level 0 setup, where
          the artifact you ship is a <strong>trained model</strong> and a person is the retraining
          loop. Accuracy is measured every day on fresh traffic it has never seen.
        </p>
        <p>
          Nothing about the model changes. What changes is the world, and the{" "}
          <strong>scenario control</strong> decides how much. That is the whole argument for adding a
          third loop to CI and CD: software rots when you edit it, models rot when you do not.
        </p>
      </>
    ),
    hint: "Switch the scenario control between Steady and Shock — same model, same code, opposite outcomes.",
  },
  {
    phase: "deploy",
    label: "Monitor it",
    title: "Monitoring tells you, but not today",
    body: (
      <>
        <p>
          You cannot react to what you do not measure, so the first addition is production
          monitoring. But the metric an ML system needs is <em>accuracy</em>, and accuracy needs
          labels — which arrive {LABEL_DELAY} days late here, and far later in most real systems.
        </p>
        <p>
          The gap between the two lines is the part you are flying blind through. Without monitoring
          you would never find out at all; with it, you find out late, and every trigger built on it
          inherits that lag.
        </p>
      </>
    ),
    hint: "On Shock, true accuracy falls on day 95 and the monitored line only crosses the SLO around day 102.",
  },
  {
    phase: "trigger",
    label: "Add a trigger",
    title: "Automate the retraining decision — but every trigger is blind to something",
    body: (
      <>
        <p>
          Level 1 makes the <strong>pipeline</strong> the deployable artifact, so retraining is a
          pipeline run rather than a project. That only helps once something decides when to run it.
          Three candidates, none of which observes the thing you actually care about.
        </p>
        <p>
          <strong>Schedule</strong> is blind to whether anything happened. <strong>Drift</strong>{" "}
          watches the inputs, which is a proxy: it fires on a covariate shift the model absorbs
          without a single day below the SLO, and stays silent when the inputs are unchanged but the{" "}
          <em>relationship</em> has moved. <strong>Performance</strong> watches the right thing, and
          arrives {LABEL_DELAY} days late.
        </p>
      </>
    ),
    hint: "Set the world to Shock and the trigger to Drift: PSI never moves, so the pipeline never runs — while accuracy sits under the SLO for 85 days.",
  },
  {
    phase: "gates",
    label: "Validate the data",
    title: "An automated loop will happily train on a broken batch",
    body: (
      <>
        <p>
          On day {FEATURE_FAULT[0]} an upstream join breaks and one feature is written as a constant
          for a month. Serving traffic is unaffected — only the training data is wrong — so nothing
          in production looks unusual until a retrain lands inside that window and ships a model
          fitted to it.
        </p>
        <p>
          The gate is a check on the batch before training: compare its statistics against the
          profile the current model was trained on, and fail the run rather than the model. A failed
          run retries in {RETRY} days instead of waiting for the next trigger.
        </p>
      </>
    ),
    hint: "Turn the trigger to Schedule and watch the run inside the shaded window change from promoted to skipped.",
  },
  {
    phase: "gates",
    label: "Validate the model",
    title: "The failure that passes every data check",
    body: (
      <>
        <p>
          On day {LABEL_FAULT[0]} the labelling job regresses and starts emitting noise. Every input
          statistic is perfect, the schema is valid, the pipeline is green, and the model trains
          without complaint — on labels that mean nothing.
        </p>
        <p>
          Only one thing catches it: making promotion <strong>conditional</strong> on beating the
          model already in production, measured on real labelled traffic. This is the gate the lesson
          insists on, and it is the difference between a loop that keeps you fresh and a loop that
          ships a broken model on a schedule.
        </p>
      </>
    ),
    hint: "Compare the worst-day figure with the previous step: the same pipeline, one extra check.",
  },
  {
    phase: "ladder",
    label: "What it bought",
    title: "The right level is the lowest one that keeps the model fresh enough",
    body: (
      <>
        <p>
          All four triggers under the current world, with both gates on. The ranking is not fixed —
          it is a property of the world, which is exactly why maturity is a means rather than a
          goal.
        </p>
        <p>
          On a steady world every row is the same accuracy and the automation is pure cost. Where the
          world does move, the trigger that watches the target beats the one that watches a proxy,
          for a fraction of the runs — provided you have labels. Where you do not, you are back on
          drift, with the blind spots this walkthrough just showed you.
        </p>
      </>
    ),
    hint: "Step the scenario control through all three and watch the best row change.",
  },
];

/* -------------------------------------------------------------- component */

export function ContinuousTrainingViz({ className }: { className?: string }) {
  const [scenario, setScenario] = useState<ScenarioId>("drifting");
  const [trigger, setTrigger] = useState<TriggerId>("schedule");

  const world = useMemo(() => buildWorld(scenario), [scenario]);

  /** Gates are switched on by the walkthrough itself, stage by stage. */
  const gatesFor = (i: number): Gates => ({ data: i >= S_DATA, model: i >= S_MODEL });
  const triggerFor = (i: number): TriggerId => (i <= S_MONITOR ? "none" : trigger);

  const [step, setStep] = useState(0);
  const gates = gatesFor(step);
  const activeTrigger = triggerFor(step);

  const result = useMemo(
    () => simulate(world, activeTrigger, gates),
    [world, activeTrigger, gates.data, gates.model], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** The scoreboard compares every trigger under the fully gated pipeline. */
  const scoreboard = useMemo(
    () => TRIGGERS.map((t) => ({ trigger: t, run: simulate(world, t.id, { data: true, model: true }) })),
    [world],
  );

  /** Level 0 in this world, as the thing every row is measured against. */
  const level0 = scoreboard.find((r) => r.trigger.id === "none")!.run;
  /** Only needed to price the gates on the model-validation step. */
  const ungated = useMemo(
    () => (step >= S_MODEL ? simulate(world, activeTrigger, { data: false, model: false }) : result),
    [world, activeTrigger, step, result],
  );

  const events = result.log.filter((l) => l.event);
  const bestRow = scoreboard.reduce((a, r) => (r.run.below < a.run.below ? r : a), scoreboard[0]);

  /* ------------------------------------------------------------ controls */

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        world
      </span>
      {SCENARIOS.map((s) => (
        <VizButton key={s.id} onClick={() => setScenario(s.id)} active={scenario === s.id}>
          {s.label}
        </VizButton>
      ))}
      <span className="ml-2 self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        retrain trigger
      </span>
      {TRIGGERS.map((t) => (
        <VizButton key={t.id} onClick={() => setTrigger(t.id)} active={trigger === t.id}>
          {t.label}
        </VizButton>
      ))}
    </>
  );

  /* -------------------------------------------------------------- stages */

  const X0 = 44;
  const X1 = 664;
  const dayX = (d: number) => X0 + ((d - WINDOW) / (DAYS - 1 - WINDOW)) * (X1 - X0);

  const faultBands = (yTop: number, height: number, i: number) => (
    <>
      {i >= S_TRIGGER && (
        <>
          <rect
            x={dayX(FEATURE_FAULT[0])}
            y={yTop}
            width={dayX(FEATURE_FAULT[1]) - dayX(FEATURE_FAULT[0])}
            height={height}
            fill={VIZ.rose}
            opacity={i >= S_DATA ? 0.12 : 0.06}
          />
          <rect
            x={dayX(LABEL_FAULT[0])}
            y={yTop}
            width={dayX(LABEL_FAULT[1]) - dayX(LABEL_FAULT[0])}
            height={height}
            fill={VIZ.orange}
            opacity={i >= S_MODEL ? 0.12 : 0.06}
          />
        </>
      )}
    </>
  );

  /** Accuracy over time, with the SLO, the monitored view and the pipeline's decisions. */
  const timeline = (i: number) => {
    const H = 208;
    const yTop = 14;
    const yBot = H - 30;
    const accY = (a: number) => yBot - ((a - ACC_FLOOR) / (1 - ACC_FLOOR)) * (yBot - yTop);
    const line = (key: "acc" | "monitored") =>
      result.log
        .filter((l) => l[key] !== null)
        .map((l, k) => `${k === 0 ? "M" : "L"}${dayX(l.day).toFixed(1)} ${accY(l[key] as number).toFixed(1)}`)
        .join("");

    const eventColor: Record<DayEvent, string> = {
      promoted: VIZ.teal,
      rejected: VIZ.rose,
      skipped: VIZ.yellow,
    };

    return (
      <svg
        viewBox={`0 0 680 ${H}`}
        className="block w-full"
        role="img"
        aria-label="Daily accuracy in production over 180 days, with the SLO and the pipeline's retraining decisions"
      >
        {faultBands(yTop, yBot - yTop, i)}

        {[0.2, 0.4, 0.6, 0.8].map((a) => (
          <g key={a}>
            <line x1={X0} y1={accY(a)} x2={X1} y2={accY(a)} stroke={VIZ.grid} strokeWidth={0.7} />
            <text
              x={X0 - 6}
              y={accY(a) + 3}
              textAnchor="end"
              fill={VIZ.axis}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {a.toFixed(1)}
            </text>
          </g>
        ))}
        <line
          x1={X0}
          y1={accY(SLO)}
          x2={X1}
          y2={accY(SLO)}
          stroke={VIZ.yellow}
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
        <text
          x={X1 - 3}
          y={accY(SLO) - 6}
          textAnchor="end"
          fill={VIZ.yellow}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          SLO {SLO}
        </text>

        {i >= S_MONITOR && (
          <path d={line("monitored")} fill="none" stroke={VIZ.teal} strokeWidth={1.6} opacity={0.9} />
        )}
        <path d={line("acc")} fill="none" stroke={VIZ.brand} strokeWidth={1.8} />

        {i >= S_TRIGGER &&
          events.map((l) => (
            <g key={l.day}>
              <line
                x1={dayX(l.day)}
                y1={yTop}
                x2={dayX(l.day)}
                y2={yBot}
                stroke={eventColor[l.event as DayEvent]}
                strokeWidth={0.8}
                strokeDasharray="2 3"
                opacity={0.55}
              />
              <circle cx={dayX(l.day)} cy={yBot + 7} r={3} fill={eventColor[l.event as DayEvent]} />
            </g>
          ))}

        <line x1={X0} y1={yBot} x2={X1} y2={yBot} stroke={VIZ.axis} strokeWidth={1} />
        {[21, 50, 80, 110, 140, 170].map((d) => (
          <text
            key={d}
            x={dayX(d)}
            y={H - 6}
            textAnchor="middle"
            fill={VIZ.axis}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
          >
            day {d}
          </text>
        ))}
        <text
          x={10}
          y={(yTop + yBot) / 2}
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
          transform={`rotate(-90 10 ${(yTop + yBot) / 2})`}
        >
          accuracy
        </text>
      </svg>
    );
  };

  /** What the drift detector sees, on the same time axis. */
  const psiPanel = (i: number) => {
    const H = 112;
    const yTop = 16;
    const yBot = H - 26;
    const maxPsi = Math.max(0.6, ...result.log.map((l) => l.psi));
    const psiY = (p: number) => yBot - (Math.min(p, maxPsi) / maxPsi) * (yBot - yTop);
    return (
      <svg
        viewBox={`0 0 680 ${H}`}
        className="block w-full"
        role="img"
        aria-label="Population stability index of the input features over the same period, against the drift threshold"
      >
        {faultBands(yTop, yBot - yTop, i)}
        <path
          d={result.log
            .map((l, k) => `${k === 0 ? "M" : "L"}${dayX(l.day).toFixed(1)} ${psiY(l.psi).toFixed(1)}`)
            .join("")}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.8}
        />
        <line
          x1={X0}
          y1={psiY(PSI_THRESHOLD)}
          x2={X1}
          y2={psiY(PSI_THRESHOLD)}
          stroke={VIZ.rose}
          strokeWidth={1.1}
          strokeDasharray="4 3"
        />
        <text
          x={X1}
          y={psiY(PSI_THRESHOLD) - 4}
          textAnchor="end"
          fill={VIZ.rose}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          fires above {PSI_THRESHOLD}
        </text>
        <line x1={X0} y1={yBot} x2={X1} y2={yBot} stroke={VIZ.axis} strokeWidth={1} />
        <text
          x={X0 - 6}
          y={yBot + 3}
          textAnchor="end"
          fill={VIZ.axis}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          0
        </text>
        <text
          x={X0 - 6}
          y={yTop + 8}
          textAnchor="end"
          fill={VIZ.axis}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          {maxPsi.toFixed(1)}
        </text>
        <text
          x={(X0 + X1) / 2}
          y={H - 6}
          textAnchor="middle"
          fill={VIZ.text}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          feature drift (PSI) — what a drift trigger can see
        </text>
      </svg>
    );
  };

  /** Every trigger, fully gated, in this world. */
  const scoreboardPanel = () => {
    const H = 178;
    const rowH = 26;
    const cols = [
      { title: "mean acc", w: 92, get: (r: RunResult) => r.mean.toFixed(3) },
      { title: "worst day", w: 88, get: (r: RunResult) => r.worst.toFixed(3) },
      { title: "days < SLO", w: 92, get: (r: RunResult) => String(r.below) },
      { title: "deploys", w: 78, get: (r: RunResult) => String(r.promoted) },
      { title: "runs blocked", w: 104, get: (r: RunResult) => String(r.rejected + r.skipped) },
    ];
    let x = 158;
    const colX = cols.map((c) => {
      const at = x;
      x += c.w;
      return at;
    });
    return (
      <svg
        viewBox={`0 0 680 ${H}`}
        className="block w-full"
        role="img"
        aria-label="Accuracy, worst day, days below SLO, deploys and blocked runs for each retraining trigger"
      >
        {cols.map((c, k) => (
          <text
            key={c.title}
            x={colX[k]}
            y={16}
            fill={VIZ.text}
            fontSize={9.5}
            fontFamily="ui-monospace, monospace"
          >
            {c.title.toUpperCase()}
          </text>
        ))}
        {scoreboard.map((row, k) => {
          const y = 28 + k * rowH;
          const best = row.trigger.id === bestRow.trigger.id;
          return (
            <g key={row.trigger.id}>
              {best && (
                <rect x={4} y={y} width={672} height={rowH - 4} fill={VIZ.teal} opacity={0.1} rx={3} />
              )}
              <text
                x={10}
                y={y + 15}
                fill={best ? VIZ.textBright : VIZ.text}
                fontSize={11}
                fontFamily="ui-monospace, monospace"
              >
                {row.trigger.label}
              </text>
              <text
                x={10}
                y={y + 15}
                fill="transparent"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
              />
              {cols.map((c, ci) => (
                <text
                  key={c.title}
                  x={colX[ci]}
                  y={y + 15}
                  fill={best ? VIZ.textBright : VIZ.text}
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                >
                  {c.get(row.run)}
                </text>
              ))}
            </g>
          );
        })}
        <text
          x={10}
          y={28 + scoreboard.length * rowH + 16}
          fill={VIZ.axis}
          fontSize={9.5}
          fontFamily="ui-monospace, monospace"
        >
          all rows with data + model validation on · {SCENARIOS.find((s) => s.id === scenario)?.note}
        </text>
      </svg>
    );
  };

  const stage = (i: number) => {
    if (i === S_LADDER)
      return (
        <>
          {scoreboardPanel()}
          {timeline(i)}
        </>
      );
    return (
      <>
        {timeline(i)}
        {i >= S_TRIGGER && psiPanel(i)}
      </>
    );
  };

  const stageNote = (i: number) =>
    i <= S_MONITOR
      ? `${SCENARIOS.find((s) => s.id === scenario)?.label} world · no retraining`
      : `${SCENARIOS.find((s) => s.id === scenario)?.label} world · ${
          TRIGGERS.find((t) => t.id === activeTrigger)?.note
        }`;

  /* --------------------------------------------------------------- panel */

  const pct = (v: number) => v.toFixed(3);

  const panel = (i: number) => (
    <>
      <div className="flex flex-wrap gap-2">
        <GuidedCard label="in production" accent={VIZ.brand}>
          Mean accuracy <Num>{pct(result.mean)}</Num>, worst day <Num>{pct(result.worst)}</Num>,{" "}
          <Num>{result.below}</Num> of {result.log.length} days below the SLO.
        </GuidedCard>

        {i >= S_MONITOR && (
          <GuidedCard label="what monitoring sees" accent={VIZ.teal}>
            Labels land {LABEL_DELAY} days late, so every trigger built on accuracy reacts to a world
            that is already {LABEL_DELAY} days old.
          </GuidedCard>
        )}

        {i >= S_TRIGGER && (
          <GuidedCard label="pipeline runs" accent={VIZ.brand}>
            <Num>{result.promoted}</Num> deployed
            {result.skipped > 0 && (
              <>
                , <Num>{result.skipped}</Num> stopped by data validation
              </>
            )}
            {result.rejected > 0 && (
              <>
                , <Num>{result.rejected}</Num> rejected by model validation
              </>
            )}
            .
          </GuidedCard>
        )}

        {i >= S_DATA && (
          <GuidedCard label="feature fault" accent={VIZ.rose}>
            Days {FEATURE_FAULT[0]}–{FEATURE_FAULT[1]}: one feature written as a constant in the
            training stream only.
          </GuidedCard>
        )}

        {i >= S_MODEL && (
          <GuidedCard label="label fault" accent={VIZ.orange}>
            Days {LABEL_FAULT[0]}–{LABEL_FAULT[1]}: labels are noise. No input check can see it.
          </GuidedCard>
        )}
      </div>

      {i === S_TRIGGER && (
        <GuidedPayoff label="what the trigger can and cannot see">
          {activeTrigger === "none" ? (
            <>
              Nothing is retraining, so this is still Level 0: mean accuracy{" "}
              <strong>{pct(result.mean)}</strong> against {result.below} days below the SLO. Pick a
              trigger in the controls to close the loop.
            </>
          ) : (
            <>
              This trigger ran the pipeline <strong>{result.promoted}</strong>{" "}
              {result.promoted === 1 ? "time" : "times"} and finished at{" "}
              <strong>{pct(result.mean)}</strong> mean accuracy, against{" "}
              {pct(level0.mean)} for never retraining.{" "}
              {activeTrigger === "drift" && (
                <>
                  Drift is a proxy for the thing you care about. On the drifting world it fires
                  during a covariate shift the model absorbs without a single day below the SLO, and
                  by the time the concept drift arrives PSI has already saturated, so there is no new
                  signal in it. On the shock world the inputs never move at all — PSI stays under
                  0.06 while accuracy sits below the SLO for 85 days — so it never fires.
                </>
              )}
              {activeTrigger === "schedule" && (
                <>
                  A schedule cannot be wrong about when to fire, only about how often — it pays the
                  full cost on a steady world and still reacts up to {SCHEDULE_DAYS} days late to a
                  shock.
                </>
              )}
              {activeTrigger === "performance" && (
                <>
                  This is the only trigger watching the quantity you care about, and it is still{" "}
                  {LABEL_DELAY} days behind it. Where labels are slow or absent, you are forced back
                  onto the drift proxy and its blind spots.
                </>
              )}
            </>
          )}
        </GuidedPayoff>
      )}

      {i === S_MODEL && (
        <GuidedPayoff label="why the promotion gate is the load-bearing one">
          Same trigger, same world: ungated, this pipeline ends at{" "}
          <strong>{pct(ungated.mean)}</strong> mean with {ungated.below} days below the SLO and a
          worst day of <strong>{pct(ungated.worst)}</strong>. With both gates it is{" "}
          <strong>{pct(result.mean)}</strong>, {result.below} days below, worst day{" "}
          <strong>{pct(result.worst)}</strong> — bought with {result.skipped + result.rejected}{" "}
          blocked runs.{" "}
          {ungated.mean < level0.mean ? (
            <>
              Ungated it lands <em>below</em> the {pct(level0.mean)} you would have had by never
              retraining at all: the loop is not a partial win, it is a liability.
            </>
          ) : (
            <>
              Ungated it still beats the {pct(level0.mean)} of never retraining — the gates are not
              what make continuous training worthwhile here, they are what stop it shipping the two
              faults. Switch the world to Steady to see the same pipeline fall below never
              retraining without them.
            </>
          )}
        </GuidedPayoff>
      )}

      {i === S_LADDER && (
        <GuidedPayoff label="maturity is a means, not a goal">
          In the <strong>{SCENARIOS.find((s) => s.id === scenario)?.label.toLowerCase()}</strong>{" "}
          world the best trigger is <strong>{bestRow.trigger.label.toLowerCase()}</strong> at{" "}
          {bestRow.run.below} days below the SLO, against {level0.below} for never retraining
          — bought with {bestRow.run.promoted} deploys.{" "}
          {scoreboard.every((r) => Math.abs(r.run.mean - level0.mean) < 0.01)
            ? "Every row lands on the same accuracy here, so all of that automation bought nothing: this is the world where Level 0 is the correct answer and climbing the ladder is pure cost."
            : "Climb only as far as the freshness you actually need — the cheapest row that clears your SLO is the right one, not the most automated."}
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i === S_LADDER)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>fewest days below the SLO</GuidedLegend>
          <GuidedLegend color={VIZ.brand}>accuracy in production</GuidedLegend>
        </>
      );
    return (
      <>
        <GuidedLegend color={VIZ.brand}>true accuracy today</GuidedLegend>
        {i >= S_MONITOR && <GuidedLegend color={VIZ.teal}>what monitoring can see</GuidedLegend>}
        {i >= S_TRIGGER && <GuidedLegend color={VIZ.teal}>● model deployed</GuidedLegend>}
        {i >= S_DATA && <GuidedLegend color={VIZ.yellow}>● run stopped by the data check</GuidedLegend>}
        {i >= S_MODEL && <GuidedLegend color={VIZ.rose}>● candidate rejected on holdout</GuidedLegend>}
        {i >= S_TRIGGER && <GuidedLegend color={VIZ.rose}>shaded: feature fault in training</GuidedLegend>}
        {i >= S_TRIGGER && <GuidedLegend color={VIZ.orange}>shaded: label fault in training</GuidedLegend>}
      </>
    );
  };

  return (
    <GuidedViz
      className={className}
      title="The continuous-training loop, stage by stage"
      caption="180 simulated days of a model in production: a logistic classifier retrained on a rolling 21-day window, scored daily on fresh traffic, with labels arriving a week late. Two faults are planted in the training stream — a feature that collapses to a constant, and a stretch of noisy labels — because they fail differently and so justify different gates. Accuracy, PSI, every promotion decision and the scoreboard are computed from the simulation; the world and trigger controls re-run all of it."
      phases={PHASES}
      steps={STEPS}
      controls={controls}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
      onStepChange={setStep}
    />
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-200">{children}</span>;
}
