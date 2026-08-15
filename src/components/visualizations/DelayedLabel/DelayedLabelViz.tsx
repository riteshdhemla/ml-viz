"use client";

/**
 * Delayed labels, and the dashboard that quietly lies because of them.
 *
 * 200 days of card transactions, 1,200 a day, a true fraud rate of exactly
 * 3.00%. A fraudulent transaction produces a chargeback, but not immediately:
 * the delay is lognormal, most landing inside a month with a tail out to ~150
 * days. Nothing here drifts and no model is involved — the only moving part is
 * *when the labels arrive*.
 *
 * Measured completion of the chargeback curve by cohort age:
 *
 *     7d  24.5%      45d  92.8%
 *    14d  54.0%      60d  96.4%
 *    30d  83.0%     120d  99.5%
 *
 * The consequence is a systematic, one-directional bias in every recent-window
 * metric. Observed against true fraud rate at day 199:
 *
 *     window    observed    true     understated by
 *       7d       0.29%     3.02%          91%
 *      14d       0.74%     3.12%          76%
 *      30d       1.40%     2.93%          52%
 *      60d       2.17%     3.06%          29%
 *     120d       2.55%     3.01%          15%
 *
 * A rolling 30-day fraud dashboard reads about **half** the real rate, and it
 * does so every day, stably — 49–53% across seeds 13/29/41/57, at every value
 * of "today" from day 60 to day 199. It is not noise and it does not average
 * out. Read naively, the freshest number is always the most flattering, which
 * is exactly backwards from how a dashboard is usually read.
 *
 * Two ways out, both measured here:
 *
 *   - **Wait.** Restrict to cohorts at least 120 days old: 2.967% against a
 *     true 3.000%. Unbiased, and useless for telling you whether the change you
 *     shipped last week worked.
 *   - **Divide by the completion curve.** The 30-day window whose raw reading is
 *     1.40% has a mean completion of 48.4% across its constituent days;
 *     1.40 / 0.484 = 2.89% against a true 2.93%. You recover the answer now,
 *     at the cost of trusting the maturity curve you estimated from history.
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
import { VIZ, VizSlider, seededRandom } from "../viz-kit";

const DAYS = 200;
const PER_DAY = 1200;
const RATE = 0.03;
const MAX_DELAY = 150;
const TODAY = DAYS - 1;

type Day = { n: number; fraud: number; landed: number[] };

/** 200 days of transactions; chargebacks land on a lognormal delay. */
function build(seed: number): Day[] {
  const rng = seededRandom(seed);
  const daily: Day[] = [];
  for (let d = 0; d < DAYS; d++)
    daily.push({ n: 0, fraud: 0, landed: new Array(DAYS + MAX_DELAY + 2).fill(0) });
  for (let day = 0; day < DAYS; day++) {
    const c = daily[day];
    for (let i = 0; i < PER_DAY; i++) {
      c.n++;
      if (rng() < RATE) {
        c.fraud++;
        const u = Math.max(1e-9, rng());
        const dl = Math.max(
          1,
          Math.min(
            MAX_DELAY,
            Math.round(Math.exp(2.6 + 0.85 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng())))
          )
        );
        c.landed[day + dl]++;
      }
    }
  }
  return daily;
}

const DAILY = build(13);

/** Share of all chargebacks that have landed by a given cohort age. */
const MATURITY = (() => {
  const out: number[] = [];
  let totalFraud = 0;
  for (const c of DAILY) totalFraud += c.fraud;
  for (let age = 0; age <= MAX_DELAY; age++) {
    let landed = 0;
    for (let d = 0; d < DAYS; d++) for (let k = 0; k <= age; k++) landed += DAILY[d].landed[d + k] || 0;
    out.push(landed / totalFraud);
  }
  return out;
})();

/** What a rolling window of the given age reads at time T, observed and true. */
function windowStats(age: number, T = TODAY) {
  const lo = Math.max(0, T - age + 1);
  let n = 0;
  let tru = 0;
  let obs = 0;
  let completion = 0;
  let days = 0;
  for (let d = lo; d <= T; d++) {
    n += DAILY[d].n;
    tru += DAILY[d].fraud;
    for (let k = d; k <= T; k++) obs += DAILY[d].landed[k] || 0;
    completion += MATURITY[Math.min(MAX_DELAY, T - d)];
    days++;
  }
  const comp = completion / days;
  return {
    observed: obs / n,
    truth: tru / n,
    corrected: comp > 0 ? obs / n / comp : 0,
    completion: comp,
    n,
  };
}

/** Only cohorts old enough that essentially every chargeback has landed. */
const MATURED = (() => {
  let n = 0;
  let f = 0;
  for (let d = 0; d <= TODAY - 120; d++) {
    n += DAILY[d].n;
    f += DAILY[d].fraud;
  }
  return f / n;
})();

const PHASES: GuidedPhase[] = [
  { id: "loop", label: "The feedback loop", tone: "brand", numberPrefix: "D" },
  { id: "read", label: "Reading it correctly", tone: "teal", numberPrefix: "R" },
];

const STEPS: GuidedStep[] = [
  {
    label: "the label is late",
    phase: "loop",
    title: "You decide now and find out much later",
    body: (
      <>
        A card transaction is scored and approved on day 0. If it was fraudulent, the cardholder
        eventually notices and files a chargeback — but that lands weeks later. Half of all chargebacks
        here have not arrived after two weeks.
        <br />
        <br />
        Nothing in this simulation drifts and no model is involved. The true fraud rate is exactly 3.00%
        on every single day. The only moving part is <em>when the labels arrive</em>.
      </>
    ),
    hint: "Follow one rose bar down to where its chargeback actually lands — that horizontal distance is the whole problem.",
  },
  {
    label: "the dashboard lies",
    phase: "loop",
    title: "The freshest number is the most flattering",
    body: (
      <>
        Compute a rolling fraud rate from the labels you have today and it reads far below the truth,
        because most of the recent window&rsquo;s chargebacks have not landed yet.
        <br />
        <br />
        A 30-day window reads about <strong>half</strong> the real rate. A 7-day window reads about a
        tenth of it. This is not noise: it is the same understatement every day, at every value of
        &ldquo;today&rdquo;, and it does not average out.
      </>
    ),
    hint: "Shrink the window. The shorter and fresher it gets, the better your model appears to be doing.",
  },
  {
    label: "the maturity curve",
    phase: "read",
    title: "How much of the truth has arrived yet",
    body: (
      <>
        The fix starts with measuring the delay itself: what share of a cohort&rsquo;s chargebacks have
        landed by age <span className="font-mono">d</span>. That curve is estimable from history, and it
        is the missing denominator.
        <br />
        <br />
        At 7 days you are seeing a quarter of the eventual bad outcomes; at 30 days, {(MATURITY[30] * 100).toFixed(0)}%;
        at 60, {(MATURITY[60] * 100).toFixed(0)}%. Every recent-window metric needs dividing by this
        number before it means anything.
      </>
    ),
    hint: "Note how flat the curve is past 60 days — that flatness is what makes old cohorts trustworthy.",
  },
  {
    label: "two honest reads",
    phase: "read",
    title: "Wait for it, or correct for it",
    body: (
      <>
        Restrict to cohorts at least 120 days old and the estimate is unbiased — {(MATURED * 100).toFixed(2)}%
        against a true 3.00%. It is also four months stale, so it cannot tell you whether last
        week&rsquo;s change worked.
        <br />
        <br />
        Or divide the recent window by its completion. That recovers the answer now, from data that
        looks, untreated, like half the story.
      </>
    ),
    hint: "Compare the four bars. Raw is the only one that is wrong, and it is the one on every dashboard.",
  },
];

const W = 560;

export function DelayedLabelViz({ className }: { className?: string }) {
  const [age, setAge] = useState(30);
  const [step, setStep] = useState(0);

  const stats = useMemo(() => windowStats(age), [age]);

  /* The observed and true rolling series, for the "dashboard" plot. */
  const series = useMemo(() => {
    const obs: number[] = [];
    const tru: number[] = [];
    for (let T = 60; T <= TODAY; T++) {
      const s = windowStats(age, T);
      obs.push(s.observed);
      tru.push(s.truth);
    }
    return { obs, tru };
  }, [age]);

  const sxSeries = (i: number) => 46 + (i / (series.obs.length - 1)) * (W - 92);
  const syRate = (v: number) => 140 - (v / 0.04) * 120;

  return (
    <GuidedViz
      title="The metric that is always wrong in the same direction"
      caption="200 days of transactions, 1,200 a day, a true fraud rate of exactly 3.00% every day. Fraudulent transactions produce chargebacks on a lognormal delay — most inside a month, a tail past 100 days. Nothing drifts and there is no model; every gap you see below is caused purely by labels not having arrived."
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        step === 1 || step === 3 ? (
          <div className="w-72">
            <VizSlider
              label="rolling window age (days)"
              min={7}
              max={120}
              step={1}
              value={age}
              onChange={(v) => setAge(Math.round(v))}
              format={(v) => `${v.toFixed(0)}d`}
            />
          </div>
        ) : undefined
      }
      stageNote={(i) =>
        i === 2 ? (
          <span className="font-mono text-[11px] text-slate-400">chargeback completion by age</span>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">
            today = day {TODAY} · true rate 3.00%
          </span>
        )
      }
      stage={(i) => {
        if (i === 0) {
          /* A cohort of frauds from one day, and where their labels land. */
          const cohortDay = 40;
          const lands: { age: number; n: number }[] = [];
          for (let k = 1; k <= 120; k++) {
            const n = DAILY[cohortDay].landed[cohortDay + k] || 0;
            if (n > 0) lands.push({ age: k, n });
          }
          const maxN = Math.max(...lands.map((l) => l.n));
          const sx = (d: number) => 46 + (d / 120) * (W - 92);
          return (
            <svg viewBox={`0 0 ${W} 160`} className="w-full">
              <line x1={46} x2={W - 46} y1={120} y2={120} stroke={VIZ.axis} strokeWidth={1} />
              {/* the decision */}
              <line x1={sx(0)} x2={sx(0)} y1={26} y2={120} stroke={VIZ.textBright} strokeWidth={2} />
              <text x={sx(0)} y={20} fontSize={9} fill={VIZ.textBright}>
                {PER_DAY.toLocaleString()} decisions, all made here
              </text>
              {lands.map((l) => (
                <rect
                  key={l.age}
                  x={sx(l.age) - 1.5}
                  y={120 - (l.n / maxN) * 70}
                  width={3}
                  height={(l.n / maxN) * 70}
                  fill={VIZ.rose}
                  opacity={0.85}
                />
              ))}
              <text x={sx(60)} y={44} fontSize={9} fill={VIZ.rose}>
                …and the chargebacks they caused land out here
              </text>
              {[0, 30, 60, 90, 120].map((d) => (
                <text key={d} x={sx(d)} y={134} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                  +{d}d
                </text>
              ))}
              <text x={46} y={152} fontSize={8.5} fill={VIZ.text}>
                days after the decision
              </text>
            </svg>
          );
        }

        if (i === 2) {
          const sx = (d: number) => 46 + (d / 150) * (W - 92);
          const sy = (v: number) => 136 - v * 112;
          return (
            <svg viewBox={`0 0 ${W} 168`} className="w-full">
              {[0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={46} x2={W - 46} y1={sy(v)} y2={sy(v)} stroke={VIZ.grid} strokeWidth={1} opacity={0.4} />
                  <text x={42} y={sy(v) + 3} textAnchor="end" fontSize={8} fill={VIZ.text}>
                    {(v * 100).toFixed(0)}%
                  </text>
                </g>
              ))}
              <path
                d={MATURITY.map((v, d) => `${d === 0 ? "M" : "L"}${sx(d)},${sy(v)}`).join(" ")}
                fill="none"
                stroke={VIZ.teal}
                strokeWidth={2}
              />
              {[7, 30, 60, 120].map((d) => (
                <g key={d}>
                  <line x1={sx(d)} x2={sx(d)} y1={sy(MATURITY[d])} y2={136} stroke={VIZ.yellow} strokeWidth={1} strokeDasharray="2 2" />
                  <circle cx={sx(d)} cy={sy(MATURITY[d])} r={3} fill={VIZ.yellow} />
                  <text x={sx(d)} y={sy(MATURITY[d]) - 7} textAnchor="middle" fontSize={8.5} fill={VIZ.yellow}>
                    {(MATURITY[d] * 100).toFixed(0)}%
                  </text>
                  <text x={sx(d)} y={148} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                    {d}d
                  </text>
                </g>
              ))}
              <text x={46} y={14} fontSize={9} fill={VIZ.text}>
                share of chargebacks that have landed
              </text>
              <text x={46} y={164} fontSize={8.5} fill={VIZ.text}>
                cohort age
              </text>
            </svg>
          );
        }

        if (i === 3) {
          const bars = [
            { label: "raw window", v: stats.observed, c: VIZ.rose },
            { label: "÷ completion", v: stats.corrected, c: VIZ.teal },
            { label: "matured cohorts", v: MATURED, c: VIZ.brand },
            { label: "the truth", v: 0.03, c: VIZ.textBright },
          ];
          return (
            <div className="space-y-2 py-2">
              {bars.map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-right font-mono text-[10.5px] text-slate-400">
                    {b.label}
                  </span>
                  <div className="h-4 flex-1 rounded bg-surface-elevated/50">
                    <div className="h-4 rounded" style={{ width: `${(b.v / 0.04) * 100}%`, background: b.c }} />
                  </div>
                  <span className="w-14 shrink-0 font-mono text-[11px] text-white">
                    {(b.v * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
              <p className="pt-1 font-mono text-[10.5px] text-slate-400">
                a {age}-day window, {(stats.completion * 100).toFixed(1)}% complete on average
              </p>
            </div>
          );
        }

        // step 1: the two rolling series over time
        return (
          <svg viewBox={`0 0 ${W} 168`} className="w-full">
            {[0.01, 0.02, 0.03, 0.04].map((v) => (
              <g key={v}>
                <line x1={46} x2={W - 46} y1={syRate(v)} y2={syRate(v)} stroke={VIZ.grid} strokeWidth={1} opacity={0.4} />
                <text x={42} y={syRate(v) + 3} textAnchor="end" fontSize={8} fill={VIZ.text}>
                  {(v * 100).toFixed(0)}%
                </text>
              </g>
            ))}
            {/* the gap is the lie */}
            <path
              d={`${series.tru.map((v, n) => `${n === 0 ? "M" : "L"}${sxSeries(n)},${syRate(v)}`).join(" ")} L${sxSeries(
                series.obs.length - 1
              )},${syRate(series.obs[series.obs.length - 1])} ${series.obs
                .map((v, n) => `L${sxSeries(series.obs.length - 1 - n)},${syRate(series.obs[series.obs.length - 1 - n])}`)
                .join(" ")} Z`}
              fill={VIZ.rose}
              opacity={0.13}
            />
            <path
              d={series.tru.map((v, n) => `${n === 0 ? "M" : "L"}${sxSeries(n)},${syRate(v)}`).join(" ")}
              fill="none"
              stroke={VIZ.textBright}
              strokeWidth={2}
            />
            <path
              d={series.obs.map((v, n) => `${n === 0 ? "M" : "L"}${sxSeries(n)},${syRate(v)}`).join(" ")}
              fill="none"
              stroke={VIZ.rose}
              strokeWidth={2}
            />
            <text x={W - 46} y={syRate(series.tru[series.tru.length - 1]) - 6} textAnchor="end" fontSize={8.5} fill={VIZ.textBright}>
              what actually happened
            </text>
            <text x={W - 46} y={syRate(series.obs[series.obs.length - 1]) + 12} textAnchor="end" fontSize={8.5} fill={VIZ.rose}>
              what the dashboard shows
            </text>
            <line x1={46} x2={W - 46} y1={140} y2={140} stroke={VIZ.axis} strokeWidth={1} />
            <text x={46} y={156} fontSize={8.5} fill={VIZ.text}>
              day 60
            </text>
            <text x={W - 46} y={156} textAnchor="end" fontSize={8.5} fill={VIZ.text}>
              day {TODAY}
            </text>
            <text x={46} y={14} fontSize={9} fill={VIZ.text}>
              rolling {age}-day fraud rate
            </text>
          </svg>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {i === 0 && (
            <GuidedCard label="how late the labels are" accent={VIZ.rose}>
              <span className="font-mono text-[11.5px] text-slate-300">
                landed by 7d: <span className="text-accent-rose">{(MATURITY[7] * 100).toFixed(1)}%</span>
                <br />
                by 14d {(MATURITY[14] * 100).toFixed(1)}% · by 30d {(MATURITY[30] * 100).toFixed(1)}%
              </span>
            </GuidedCard>
          )}
          {(i === 1 || i === 3) && (
            <>
              <GuidedCard label={`the ${age}-day window`} accent={VIZ.rose}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  reads <span className="text-accent-rose">{(stats.observed * 100).toFixed(2)}%</span>, truth{" "}
                  <span className="text-white">{(stats.truth * 100).toFixed(2)}%</span>
                  <br />
                  understated by{" "}
                  <span className="text-accent-rose">
                    {((1 - stats.observed / stats.truth) * 100).toFixed(0)}%
                  </span>
                </span>
              </GuidedCard>
              <GuidedCard label="the missing denominator" accent={VIZ.teal}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  mean completion{" "}
                  <span className="text-accent-teal">{(stats.completion * 100).toFixed(1)}%</span>
                  <br />
                  corrected <span className="text-accent-teal">{(stats.corrected * 100).toFixed(2)}%</span> vs
                  truth {(stats.truth * 100).toFixed(2)}%
                </span>
              </GuidedCard>
            </>
          )}
          {i === 2 && (
            <GuidedCard label="when a cohort is safe to read" accent={VIZ.teal}>
              <span className="font-mono text-[11.5px] text-slate-300">
                60d: {(MATURITY[60] * 100).toFixed(1)}% complete
                <br />
                120d: <span className="text-accent-teal">{(MATURITY[120] * 100).toFixed(1)}%</span> complete
              </span>
            </GuidedCard>
          )}
          {i === 3 && (
            <GuidedPayoff label="the choice the delay forces on you">
              Waiting is unbiased and useless for steering: matured cohorts give{" "}
              {(MATURED * 100).toFixed(2)}% against a true 3.00%, but they describe a model you shipped
              four months ago. Correcting is immediate and gives{" "}
              {(stats.corrected * 100).toFixed(2)}% against {(stats.truth * 100).toFixed(2)}% on a window
              only {(stats.completion * 100).toFixed(0)}% complete — but it trusts a maturity curve you
              estimated from history, which is exactly the thing a genuine shift in fraud behaviour would
              invalidate. What is never defensible is the raw number, and the raw number is the one
              almost every dashboard shows.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i === 1 ? (
          <>
            <GuidedLegend color={VIZ.textBright}>true rate</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>observed from labels so far</GuidedLegend>
          </>
        ) : i === 0 ? (
          <>
            <GuidedLegend color={VIZ.textBright}>decisions made</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>chargebacks arriving</GuidedLegend>
          </>
        ) : i === 2 ? (
          <>
            <GuidedLegend color={VIZ.teal}>completion curve</GuidedLegend>
            <GuidedLegend color={VIZ.yellow}>reference ages</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.rose}>raw, biased</GuidedLegend>
            <GuidedLegend color={VIZ.teal}>corrected by completion</GuidedLegend>
            <GuidedLegend color={VIZ.brand}>matured cohorts only</GuidedLegend>
            <GuidedLegend color={VIZ.textBright}>ground truth</GuidedLegend>
          </>
        )
      }
    />
  );
}
