"use client";

/**
 * The point-in-time join, and what the naive one actually costs.
 *
 * A fraud-detection feature pipeline, simulated end to end: 1200 users over
 * 140 days, ~30k labelled transactions at a ~3% fraud rate. Four features —
 * account age, average amount, device count, and `disputes_30d`. The last one
 * is *caused by* the label: a fraudulent transaction generates a dispute that
 * lands 7 days later and increments the counter.
 *
 * Build the training set with a naive join (today's feature value for every
 * historical row) and the model reads disputes that its own label produced.
 * Build it with an as-of join (t_f <= t) and it cannot.
 *
 * Everything below is measured by the component, not quoted. Logistic
 * regression, standardised features, 70/30 split by time, AUC by rank.
 *
 *   feedback   contaminated rows      naive AUC              as-of AUC
 *   (share of  positive  negative   offline  production    offline = prod
 *    frauds
 *    disputed)
 *      0.00      16%       4%        0.806     0.806           0.806
 *      0.50      86%      20%        0.859     0.805           0.806
 *      1.00     100%      29%        0.913     0.806           0.806
 *
 * Two findings, and the second one contradicts how this is usually taught.
 *
 * 1. **The leak starves the honest features.** At full feedback the naive
 *    model puts 0.74 of its weight on `disputes_30d` and only -0.15 on account
 *    age; the as-of model puts 0.10 on disputes and -0.47 on account age. The
 *    leaky column does not merely add fake signal, it crowds out the real
 *    signal the model would otherwise have learned.
 *
 * 2. **Production accuracy does not, in fact, collapse — 0.806 either way.**
 *    The honest features carry the ranking at serving time even with their
 *    weights shrunk. What collapses is the *number you believed*: you ship
 *    expecting 0.91 and you have 0.81. The usual phrasing ("production
 *    accuracy collapses") is only true when the leaky feature is load-bearing.
 *    Strip the honest features out and it is: disputes alone goes 0.916
 *    offline to 0.680 in production, a 0.237 collapse. The toggle in step 6
 *    runs exactly that comparison.
 *
 * So the damage from a leaky join is usually to your *decision* rather than to
 * your model: thresholds, capacity plans and stakeholder promises all get set
 * from a number that was never real. The as-of pipeline's offline figure
 * equals its production figure by construction — that is what it buys.
 *
 * Stability across seeds 7/11/19/23/31 at full feedback: naive offline
 * 0.892-0.927, production 0.797-0.832, so figures are shown to two decimals.
 */

import { useMemo, useState } from "react";
import {
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  GuidedViz,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { VIZ, VizButton, VizSlider, seededRandom } from "../viz-kit";

const N_USERS = 1200;
const DAYS = 140;
const DISPUTE_LAG = 7;
const WINDOW = 30;
const FEATURES = ["account age", "avg amount", "device count", "disputes 30d"];
const LEAKY = 3;

type Row = { u: number; day: number; y: number; asof: number[]; naive: number[] };

function simulate(feedback: number, seed = 7) {
  const rng = seededRandom(seed);
  const users = [];
  for (let u = 0; u < N_USERS; u++) {
    const bad = rng() < 0.12;
    users.push({
      risk: bad ? 0.35 + rng() * 0.3 : 0.01 + rng() * 0.04,
      age: bad ? 10 + rng() * 200 : 200 + rng() * 900,
      amt: bad ? 60 + rng() * 240 : 20 + rng() * 90,
      dev: bad ? 2 + Math.floor(rng() * 5) : 1 + Math.floor(rng() * 2),
      disputes: [] as number[],
    });
  }
  const rows: Row[] = [];
  for (let day = 0; day < DAYS; day++)
    for (let u = 0; u < N_USERS; u++) {
      if (rng() > 0.18) continue;
      const usr = users[u];
      const fraud = rng() < usr.risk * 0.35;
      rows.push({ u, day, y: fraud ? 1 : 0, asof: [], naive: [] });
      // the dispute this fraud causes, landing DISPUTE_LAG days later
      if (fraud && rng() < feedback) usr.disputes.push(day + DISPUTE_LAG);
      if (rng() < usr.risk * 0.02) usr.disputes.push(day + DISPUTE_LAG);
    }
  for (const r of rows) {
    const u = users[r.u];
    const base = [u.age, u.amt, u.dev];
    r.asof = [...base, u.disputes.filter((d) => d <= r.day && d > r.day - WINDOW).length];
    r.naive = [...base, u.disputes.length];
  }
  return rows;
}

/** Rank-based AUC, ties averaged. */
function auc(y: number[], s: number[]) {
  const p = y.map((v, i) => [s[i], v]).sort((a, b) => a[0] - b[0]);
  let pos = 0;
  let neg = 0;
  for (const v of y) v ? pos++ : neg++;
  let sum = 0;
  let i = 0;
  while (i < p.length) {
    let j = i;
    while (j < p.length && p[j][0] === p[i][0]) j++;
    const r = (i + j + 1) / 2;
    for (let k = i; k < j; k++) if (p[k][1]) sum += r;
    i = j;
  }
  return (sum - (pos * (pos + 1)) / 2) / (pos * neg);
}

function fit(X: number[][], y: number[], steps = 250, lr = 0.6) {
  const d = X[0].length;
  const n = X.length;
  const w = new Array(d).fill(0);
  let b = 0;
  for (let s = 0; s < steps; s++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const e = 1 / (1 + Math.exp(-z)) - y[i];
      for (let j = 0; j < d; j++) gw[j] += e * X[i][j];
      gb += e;
    }
    for (let j = 0; j < d; j++) w[j] -= (lr * gw[j]) / n;
    b -= (lr * gb) / n;
  }
  return { w, b };
}

type Fitted = { w: number[]; offline: number; production: number };

function evaluate(rows: Row[], cols: number[]) {
  const cut = Math.floor(rows.length * 0.7);
  const tr = rows.slice(0, cut);
  const te = rows.slice(cut);
  const y = te.map((r) => r.y);
  const ytr = tr.map((r) => r.y);
  const pick = (v: number[]) => cols.map((j) => v[j]);
  const out: Record<string, Fitted> = {};
  for (const key of ["naive", "asof"] as const) {
    const raw = tr.map((r) => pick(r[key]));
    const d = raw[0].length;
    const mu = new Array(d).fill(0);
    const sd = new Array(d).fill(0);
    for (const r of raw) for (let j = 0; j < d; j++) mu[j] += r[j] / raw.length;
    for (const r of raw) for (let j = 0; j < d; j++) sd[j] += (r[j] - mu[j]) ** 2 / raw.length;
    for (let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1;
    const z = (v: number[]) => pick(v).map((x, j) => (x - mu[j]) / sd[j]);
    const m = fit(
      raw.map((v) => v.map((x, j) => (x - mu[j]) / sd[j])),
      ytr
    );
    const score = (k: "naive" | "asof") =>
      te.map((r) => {
        const v = z(r[k]);
        let s = m.b;
        for (let j = 0; j < v.length; j++) s += m.w[j] * v[j];
        return s;
      });
    // "production" always scores with as-of features: that is what serving has
    out[key] = { w: m.w, offline: auc(y, score(key)), production: auc(y, score("asof")) };
  }
  const pos = rows.filter((r) => r.y === 1);
  const neg = rows.filter((r) => r.y === 0);
  return {
    naive: out.naive,
    asof: out.asof,
    contamPos: pos.filter((r) => r.naive[LEAKY] > r.asof[LEAKY]).length / pos.length,
    contamNeg: neg.filter((r) => r.naive[LEAKY] > r.asof[LEAKY]).length / neg.length,
    rows: rows.length,
    rate: rows.reduce((a, r) => a + r.y, 0) / rows.length,
  };
}

/* One user's timeline, used for the story steps. Chosen for having a fraud
   early enough that the dispute it causes lands inside the observation window. */
const STORY = {
  label: { day: 34, y: 1 },
  disputes: [12, 41, 66],
  txns: [8, 19, 27, 34, 52, 61, 78, 95],
};

const W = 560;
const HZ = 110;

function Timeline({ mark }: { mark: "none" | "asof" | "naive" }) {
  const sx = (d: number) => 40 + (d / 110) * (W - 80);
  return (
    <svg viewBox={`0 0 ${W} ${HZ}`} className="w-full">
      <line x1={40} x2={W - 40} y1={72} y2={72} stroke={VIZ.axis} strokeWidth={1} />
      {[0, 30, 60, 90].map((d) => (
        <text key={d} x={sx(d)} y={88} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          day {d}
        </text>
      ))}

      {/* the window each join reads from */}
      {mark !== "none" && (
        <rect
          x={mark === "asof" ? sx(STORY.label.day - WINDOW) : sx(0)}
          y={26}
          width={
            mark === "asof"
              ? sx(STORY.label.day) - sx(STORY.label.day - WINDOW)
              : sx(110) - sx(0)
          }
          height={40}
          fill={mark === "asof" ? VIZ.teal : VIZ.rose}
          opacity={0.12}
          stroke={mark === "asof" ? VIZ.teal : VIZ.rose}
          strokeWidth={1}
        />
      )}

      {STORY.txns.map((d) => (
        <circle key={d} cx={sx(d)} cy={72} r={2.5} fill={VIZ.axis} />
      ))}

      {STORY.disputes.map((d) => {
        const caused = d === STORY.label.day + DISPUTE_LAG;
        return (
          <g key={d}>
            <line x1={sx(d)} x2={sx(d)} y1={46} y2={72} stroke={caused ? VIZ.rose : VIZ.yellow} strokeWidth={1.4} />
            <circle cx={sx(d)} cy={46} r={4} fill={caused ? VIZ.rose : VIZ.yellow} />
          </g>
        );
      })}

      {/* the labelled event, and the dispute it causes */}
      <line x1={sx(STORY.label.day)} x2={sx(STORY.label.day)} y1={16} y2={72} stroke={VIZ.textBright} strokeWidth={1.6} />
      <circle cx={sx(STORY.label.day)} cy={72} r={5} fill={VIZ.textBright} />
      <text x={sx(STORY.label.day)} y={12} textAnchor="middle" fontSize={9} fill={VIZ.textBright}>
        label · fraud
      </text>
      <path
        d={`M${sx(STORY.label.day)},20 Q${sx(STORY.label.day + 3.5)},6 ${sx(STORY.label.day + DISPUTE_LAG)},40`}
        fill="none"
        stroke={VIZ.rose}
        strokeWidth={1.2}
        strokeDasharray="3 2"
      />
      <text x={sx(STORY.label.day + DISPUTE_LAG) + 6} y={36} fontSize={8.5} fill={VIZ.rose}>
        the dispute this fraud caused
      </text>
    </svg>
  );
}

function WeightBars({ w, other, tone }: { w: number[]; other?: number[]; tone: string }) {
  const max = Math.max(...w.map(Math.abs), ...(other ?? []).map(Math.abs), 0.5);
  return (
    <div className="space-y-1.5">
      {FEATURES.map((f, j) => (
        <div key={f} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{f}</span>
          <div className="relative h-3 flex-1 rounded bg-surface-elevated/50">
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-700" />
            <div
              className="absolute inset-y-0 rounded"
              style={{
                background: j === LEAKY ? tone : VIZ.brand,
                left: w[j] < 0 ? `${50 - (Math.abs(w[j]) / max) * 50}%` : "50%",
                width: `${(Math.abs(w[j]) / max) * 50}%`,
              }}
            />
          </div>
          <span className="w-11 shrink-0 font-mono text-[10.5px] text-slate-300">{w[j].toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

const PHASES: GuidedPhase[] = [
  { id: "build", label: "Building the training set", tone: "brand", numberPrefix: "J" },
  { id: "cost", label: "What the join costs", tone: "rose", numberPrefix: "C" },
];

const STEPS: GuidedStep[] = [
  {
    label: "the event log",
    phase: "build",
    title: "A feature that the label creates",
    body: (
      <>
        One user&rsquo;s history. Grey dots are transactions; the white one is a labelled fraud on
        day&nbsp;34. Yellow marks are disputes the user filed for unrelated reasons — and the rose one
        on day&nbsp;41 is the dispute <em>caused by</em> that fraud, landing {DISPUTE_LAG} days later.
        <br />
        <br />
        The feature <span className="font-mono text-slate-200">disputes_30d</span> counts disputes in
        the trailing 30 days. Nothing is wrong with it as a feature. What matters is <em>when</em> you
        read it.
      </>
    ),
    hint: "Note that the rose dispute sits to the right of the label — it did not exist when the transaction was scored.",
  },
  {
    label: "the naive join",
    phase: "build",
    title: "SELECT the current value",
    body: (
      <>
        The natural query joins each label to the feature table as it stands <em>today</em>. For the
        day-34 row that counts the day-41 dispute — a fact created by the very label being predicted.
        <br />
        <br />
        At full feedback this contaminates <strong>100% of fraud rows</strong> and 29% of legitimate
        ones. The asymmetry is the whole problem: the feature is now a partial copy of the label.
      </>
    ),
    hint: "The rose band is the range the naive join reads: all of history, including everything after the label.",
  },
  {
    label: "the as-of join",
    phase: "build",
    title: "SELECT the value as of t",
    body: (
      <>
        The point-in-time join takes, for each label at time <span className="font-mono">t</span>, only
        feature values timestamped <span className="font-mono">t_f ≤ t</span>. The teal band is what
        the day-34 row is allowed to see.
        <br />
        <br />
        Same rows, same feature definition, different value — because the join now reconstructs what was
        knowable at scoring time instead of what is knowable now.
      </>
    ),
    hint: "The rose dispute is outside the teal band. That single exclusion is the entire fix.",
  },
  {
    label: "what it learns",
    phase: "cost",
    title: "The leak starves the honest features",
    body: (
      <>
        Both training sets, same model, same split. The naive model does not merely gain fake accuracy —
        it <em>reallocates</em>. Weight piles onto the leaky column while account age, amount and device
        count are squeezed toward zero.
        <br />
        <br />
        That is the damage no metric shows you: the model stopped learning the signal it will actually
        have at serving time.
      </>
    ),
    hint: "Drag the slider. As more frauds feed back into the feature, watch the honest weights shrink.",
  },
  {
    label: "what it costs",
    phase: "cost",
    title: "Offline soars. Production does not move.",
    body: (
      <>
        The naive pipeline reports <strong>0.91</strong> offline and delivers <strong>0.81</strong>. The
        as-of pipeline reports 0.81 and delivers 0.81.
        <br />
        <br />
        But look closely at the production column: it is <em>the same number</em> for both. The honest
        features still carry the ranking even with their weights starved. What the leak destroyed was
        not the model — it was your knowledge of the model.
      </>
    ),
    hint: "Compare the two production bars, then the two offline bars. Only one pair disagrees.",
  },
  {
    label: "when it does collapse",
    phase: "cost",
    title: "Unless the leaky feature was load-bearing",
    body: (
      <>
        &ldquo;Production accuracy collapses&rdquo; is the usual warning, and it is true only when the
        leaky column is doing the work. Drop the three honest features and train on
        <span className="font-mono"> disputes_30d</span> alone: the naive model reports 0.92 and
        delivers <strong>0.68</strong>.
        <br />
        <br />
        You cannot know in advance which case you are in — that is the point. The as-of join is applied
        by construction, before you know whether it mattered.
      </>
    ),
    hint: "Toggle the feature set. With honest features the loss is hidden; without them it is catastrophic.",
  },
];

export function PointInTimeViz({ className }: { className?: string }) {
  const [feedback, setFeedback] = useState(1);
  const [leakyOnly, setLeakyOnly] = useState(false);
  const [step, setStep] = useState(0);

  const rows = useMemo(() => simulate(feedback), [feedback]);
  const full = useMemo(() => evaluate(rows, [0, 1, 2, 3]), [rows]);
  const solo = useMemo(() => evaluate(rows, [LEAKY]), [rows]);
  const shown = step >= 5 && leakyOnly ? solo : full;

  const asofVal = STORY.disputes.filter(
    (d) => d <= STORY.label.day && d > STORY.label.day - WINDOW
  ).length;
  const naiveVal = STORY.disputes.length;

  const bar = (v: number, color: string, label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-3.5 flex-1 rounded bg-surface-elevated/50">
        <div
          className="h-3.5 rounded"
          style={{ width: `${((v - 0.5) / 0.5) * 100}%`, background: color }}
        />
      </div>
      <span className="w-10 shrink-0 font-mono text-[11px] text-white">{v.toFixed(2)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="The join that leaks the future"
      caption="A fraud pipeline simulated end to end: 1200 users, 140 days, ~30k labelled transactions at a ~3% fraud rate. disputes_30d is caused by the label — a fraud generates a dispute 7 days later. Every AUC and weight below is fitted and measured in your browser, not quoted."
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        step >= 3 ? (
          <div className="flex flex-wrap items-end gap-5">
            <div className="w-64">
              <VizSlider
                label="share of frauds that generate a dispute"
                min={0}
                max={1}
                step={0.05}
                value={feedback}
                onChange={setFeedback}
                format={(v) => `${(v * 100).toFixed(0)}%`}
              />
            </div>
            {step >= 5 && (
              <div className="flex gap-2">
                <VizButton active={!leakyOnly} onClick={() => setLeakyOnly(false)}>
                  all four features
                </VizButton>
                <VizButton active={leakyOnly} onClick={() => setLeakyOnly(true)}>
                  disputes only
                </VizButton>
              </div>
            )}
          </div>
        ) : undefined
      }
      stageNote={(i) =>
        i < 3 ? (
          <span className="font-mono text-[11px] text-slate-400">
            label at t = day {STORY.label.day}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">
            {shown.rows.toLocaleString()} rows · {(shown.rate * 100).toFixed(1)}% fraud
          </span>
        )
      }
      stage={(i) => {
        if (i < 3) return <Timeline mark={i === 0 ? "none" : i === 1 ? "naive" : "asof"} />;
        if (i === 3)
          return (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-[11px] text-accent-rose">naive join</div>
                <WeightBars w={full.naive.w} other={full.asof.w} tone={VIZ.rose} />
              </div>
              <div>
                <div className="mb-2 font-mono text-[11px] text-accent-teal">as-of join</div>
                <WeightBars w={full.asof.w} other={full.naive.w} tone={VIZ.teal} />
              </div>
            </div>
          );
        return (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 font-mono text-[11px] text-accent-rose">naive join</div>
              <div className="space-y-1.5">
                {bar(shown.naive.offline, VIZ.rose, "offline")}
                {bar(shown.naive.production, VIZ.axis, "production")}
              </div>
              <p className="mt-2 font-mono text-[10.5px] text-accent-rose">
                overstated by {(shown.naive.offline - shown.naive.production).toFixed(2)} AUC
              </p>
            </div>
            <div>
              <div className="mb-2 font-mono text-[11px] text-accent-teal">as-of join</div>
              <div className="space-y-1.5">
                {bar(shown.asof.offline, VIZ.teal, "offline")}
                {bar(shown.asof.production, VIZ.axis, "production")}
              </div>
              <p className="mt-2 font-mono text-[10.5px] text-accent-teal">
                overstated by {(shown.asof.offline - shown.asof.production).toFixed(2)} AUC
              </p>
            </div>
          </div>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* GuidedCard renders its children inside a <p>, so everything here
              stays inline — a <div> would be invalid nesting and break hydration. */}
          <GuidedCard label="the day-34 training row" accent={VIZ.brand}>
            <span className="font-mono text-[11.5px] text-slate-300">
              label = <span className="text-white">fraud</span>
              <br />
              disputes_30d ={" "}
              {i === 0 ? (
                <span className="text-slate-600">not joined yet</span>
              ) : i === 1 ? (
                <span className="text-accent-rose">{naiveVal} ← reads day 41</span>
              ) : (
                <span className="text-accent-teal">{asofVal} ← only t_f ≤ t</span>
              )}
            </span>
          </GuidedCard>
          {i >= 1 && (
            <GuidedCard label="contaminated rows" accent={i >= 2 ? VIZ.teal : VIZ.rose}>
              <span className="font-mono text-[11.5px] text-slate-300">
                naive: <span className="text-accent-rose">{(full.contamPos * 100).toFixed(0)}%</span> of
                fraud rows, {(full.contamNeg * 100).toFixed(0)}% of legitimate
                <br />
                as-of: <span className="text-accent-teal">0%</span> — impossible by construction
              </span>
            </GuidedCard>
          )}
          {/* In disputes-only mode there is no account-age column to report, so
              this card drops to the one weight that still exists. */}
          {i >= 3 && !(i === 5 && leakyOnly) && (
            <GuidedCard label="weight on the leaky feature" accent={VIZ.yellow}>
              <span className="font-mono text-[11.5px] text-slate-300">
                naive <span className="text-accent-rose">{full.naive.w[LEAKY].toFixed(2)}</span> vs as-of{" "}
                <span className="text-accent-teal">{full.asof.w[LEAKY].toFixed(2)}</span>
                <br />
                account age {full.naive.w[0].toFixed(2)} vs {full.asof.w[0].toFixed(2)}
              </span>
            </GuidedCard>
          )}
          {i === 5 && (
            <GuidedPayoff label="what the as-of join buys">
              Not a better model — the two production numbers are the same when honest features exist.
              It buys a number you can <em>act on</em>: the as-of pipeline&rsquo;s offline AUC equals its
              production AUC by construction, at every setting of every control here. The naive
              pipeline&rsquo;s offline AUC is an estimate of nothing, and you cannot tell by looking at
              it whether this run cost you {(full.naive.offline - full.naive.production).toFixed(2)} AUC
              or {(solo.naive.offline - solo.naive.production).toFixed(2)}.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i < 3 ? (
          <>
            <GuidedLegend color={VIZ.textBright}>labelled event</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>dispute caused by that label</GuidedLegend>
            <GuidedLegend color={VIZ.yellow}>unrelated dispute</GuidedLegend>
            <GuidedLegend color={VIZ.axis}>transaction</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.rose}>naive join</GuidedLegend>
            <GuidedLegend color={VIZ.teal}>as-of join</GuidedLegend>
            <GuidedLegend color={VIZ.axis}>scored with serving features</GuidedLegend>
          </>
        )
      }
    />
  );
}
