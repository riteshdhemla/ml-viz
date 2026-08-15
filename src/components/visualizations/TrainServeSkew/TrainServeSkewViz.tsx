"use client";

/**
 * The imputation-default skew bug, and why nothing you monitor catches it.
 *
 * The lesson's own example, simulated: training imputes a missing `age` with
 * the training-set median (34); the serving path, written separately, defaults
 * it to 0. Same model, same data, one constant different in one branch.
 *
 * 8,000 training and 8,000 held-out rows, three features, logistic regression.
 * Measured across the share of rows with a missing age:
 *
 *   missing   AUC (all)        AUC (slice)      mean score (all)   mean score (slice)
 *      2%   0.711 -> 0.711   0.631 -> 0.631   0.1346 -> 0.1338    0.135 -> 0.094  (-30%)
 *      5%   0.709 -> 0.709   0.694 -> 0.694   0.1344 -> 0.1325    0.131 -> 0.094  (-28%)
 *     12%   0.706 -> 0.704   0.720 -> 0.720   0.1344 -> 0.1301    0.134 -> 0.100  (-26%)
 *     25%   0.696 -> 0.694   0.694 -> 0.694   0.1338 -> 0.1283    0.132 -> 0.110  (-17%)
 *
 * The finding is what does *not* move. **AUC is unchanged** — to three decimals,
 * overall and within the affected slice. Substituting a constant shifts every
 * affected row by the same amount, so the ranking inside the slice is identical
 * and, at small shares, the cross-pairs barely move either. A ranking metric is
 * structurally incapable of seeing this bug.
 *
 * The aggregate prediction distribution barely moves either: at 2% missing the
 * mean score falls 0.6%, which no drift monitor is going to alarm on. Inside the
 * affected slice the mean score falls **30%**.
 *
 * So this is a calibration failure, not a ranking failure, and it is invisible
 * to the two things teams actually watch — offline AUC and aggregate prediction
 * drift. It only causes harm where the score is used as a probability: a
 * threshold, an expected-value calculation, an eligibility cut. There the
 * affected users are systematically underserved, silently, forever.
 *
 * The moral for the monitoring section: segment by the branches your feature
 * code can take, or you will not find this class of bug at all.
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

const MEDIAN_AGE = 34;
const SERVING_DEFAULT = 0;
const N = 8000;
const THRESHOLD = 0.15;

function gauss(rng: () => number, m = 0, s = 1) {
  let u = 0;
  let v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type Row = { age: number; tenure: number; spend: number; y: number; missing: boolean };

function make(n: number, seed: number, missShare: number): Row[] {
  const rng = seededRandom(seed);
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const age = Math.max(18, Math.min(80, gauss(rng, MEDIAN_AGE, 12)));
    const tenure = Math.max(0, gauss(rng, 3, 2));
    const spend = Math.max(0, gauss(rng, 50, 25));
    const z = -2.2 + 0.055 * (age - 34) + 0.3 * tenure - 0.02 * spend;
    out.push({ age, tenure, spend, y: rng() < 1 / (1 + Math.exp(-z)) ? 1 : 0, missing: rng() < missShare });
  }
  return out;
}

const feats = (r: Row, impute: number) => [(r.missing ? impute : r.age) / 50, r.tenure / 5, r.spend / 50];

function fit(X: number[][], y: number[], steps = 250, lr = 0.6) {
  const d = X[0].length;
  const n = X.length;
  const w = new Array(d).fill(0);
  let b = 0;
  for (let s = 0; s < steps; s++) {
    const g = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const e = 1 / (1 + Math.exp(-z)) - y[i];
      for (let j = 0; j < d; j++) g[j] += e * X[i][j];
      gb += e;
    }
    for (let j = 0; j < d; j++) w[j] -= (lr * g[j]) / n;
    b -= (lr * gb) / n;
  }
  return { w, b };
}

const sc = (m: { w: number[]; b: number }, x: number[]) => {
  let z = m.b;
  for (let j = 0; j < x.length; j++) z += m.w[j] * x[j];
  return 1 / (1 + Math.exp(-z));
};

function auc(y: number[], s: number[]) {
  const p = y.map((v, i) => [s[i], v]).sort((a, b) => a[0] - b[0]);
  let pos = 0;
  let neg = 0;
  for (const v of y) v ? pos++ : neg++;
  if (!pos || !neg) return NaN;
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

function evaluate(share: number) {
  const tr = make(N, 3, share);
  const te = make(N, 77, share);
  const m = fit(tr.map((r) => feats(r, MEDIAN_AGE)), tr.map((r) => r.y));
  const good = te.map((r) => sc(m, feats(r, MEDIAN_AGE)));
  const bad = te.map((r) => sc(m, feats(r, SERVING_DEFAULT)));
  const y = te.map((r) => r.y);
  const idx = te.map((_, i) => i).filter((i) => te[i].missing);
  const mean = (a: number[]) => a.reduce((x, v) => x + v, 0) / (a.length || 1);
  const sub = (a: number[]) => idx.map((i) => a[i]);
  const ysub = idx.map((i) => y[i]);
  // how many of the affected slice get pushed below an action threshold
  const flipped = idx.filter((i) => good[i] >= THRESHOLD && bad[i] < THRESHOLD).length;
  return {
    aucAll: auc(y, good),
    aucAllBad: auc(y, bad),
    aucSlice: auc(ysub, sub(good)),
    aucSliceBad: auc(ysub, sub(bad)),
    meanAll: mean(good),
    meanAllBad: mean(bad),
    meanSlice: mean(sub(good)),
    meanSliceBad: mean(sub(bad)),
    sliceN: idx.length,
    flipped,
    good,
    bad,
    te,
    idx,
  };
}

const PHASES: GuidedPhase[] = [
  { id: "bug", label: "The bug", tone: "rose", numberPrefix: "S" },
  { id: "catch", label: "Catching it", tone: "teal", numberPrefix: "M" },
];

const STEPS: GuidedStep[] = [
  {
    label: "two code paths",
    phase: "bug",
    title: "One constant, written twice",
    body: (
      <>
        Training fills a missing <span className="font-mono">age</span> with the training-set median,{" "}
        <span className="font-mono">34</span>. The serving path was written separately, by someone else,
        months later, and defaults it to <span className="font-mono">0</span>.
        <br />
        <br />
        That is the entire defect. Same model, same weights, same raw data — one branch of the feature
        code disagrees, and it only fires when the value is missing.
      </>
    ),
    hint: "Look where the serving spike lands: at a value the model never saw a single example of during training.",
  },
  {
    label: "AUC sees nothing",
    phase: "bug",
    title: "Your offline metric is structurally blind to it",
    body: (
      <>
        Score the held-out set both ways. The AUC is <em>unchanged</em> — to three decimals, overall and
        even within the affected rows themselves.
        <br />
        <br />
        Substituting a constant shifts every affected row by the same amount, so the ranking inside the
        slice is untouched. A rank-based metric cannot express this bug. You could run this comparison
        every night for a year and never see a number move.
      </>
    ),
    hint: "Move the missing-share slider anywhere. Watch the two AUC figures refuse to separate.",
  },
  {
    label: "what monitors see",
    phase: "catch",
    title: "The aggregate barely twitches",
    body: (
      <>
        The standard drift monitor watches the distribution of model outputs. Here the mean prediction
        across all traffic falls by around <strong>1%</strong> — well inside normal daily variation, and
        below any threshold anyone would set an alarm at.
        <br />
        <br />
        Inside the affected slice the mean prediction falls by <strong>about 30%</strong>. The signal is
        enormous and the aggregate dilutes it into nothing.
      </>
    ),
    hint: "Compare the two pairs of bars. The bug is not small — it is small only after averaging.",
  },
  {
    label: "where it hurts",
    phase: "catch",
    title: "A calibration bug, not a ranking bug",
    body: (
      <>
        If you only ever <em>rank</em> with this score, the bug is nearly harmless and undetectable. The
        moment you use it as a probability — a threshold, an eligibility cut, an expected-value
        calculation — the affected users are systematically pushed down.
        <br />
        <br />
        That is the resolution: it is invisible to the two things teams actually watch, and it is real in
        exactly the place they do not look.
      </>
    ),
    hint: "This is why monitoring has to be segmented by the branches your feature code can take.",
  },
];

const W = 560;

export function TrainServeSkewViz({ className }: { className?: string }) {
  const [share, setShare] = useState(0.05);
  const [step, setStep] = useState(0);

  const r = useMemo(() => evaluate(share), [share]);

  const bar = (label: string, v: number, max: number, color: string, fmt = (x: number) => x.toFixed(3)) => (
    <div className="flex items-center gap-2">
      <span className="w-36 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-3.5 flex-1 rounded bg-surface-elevated/50">
        <div className="h-3.5 rounded" style={{ width: `${(v / max) * 100}%`, background: color }} />
      </div>
      <span className="w-14 shrink-0 font-mono text-[11px] text-white">{fmt(v)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="The skew bug that every metric you watch will miss"
      caption="The lesson's own example, simulated: training imputes a missing age with the median (34); the separately-written serving path defaults it to 0. 8,000 training and 8,000 held-out rows, logistic regression on three features. Every AUC and mean below is fitted and measured here."
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        step >= 1 ? (
          <div className="w-72">
            <VizSlider
              label="share of rows with a missing age"
              min={0.01}
              max={0.3}
              step={0.01}
              value={share}
              onChange={setShare}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
          </div>
        ) : undefined
      }
      stageNote={() => (
        <span className="font-mono text-[11px] text-slate-400">
          {r.sliceN.toLocaleString()} of {N.toLocaleString()} rows affected
        </span>
      )}
      stage={(i) => {
        if (i === 0) {
          // the age feature as training saw it vs as serving sends it
          const bins = 34;
          const lo = 0;
          const hi = 85;
          const hist = new Array(bins).fill(0);
          for (const row of r.te) if (!row.missing) hist[Math.min(bins - 1, Math.floor(((row.age - lo) / (hi - lo)) * bins))]++;
          const maxH = Math.max(...hist);
          const bx = (n: number) => 46 + (n / bins) * (W - 92);
          const bw = (W - 92) / bins - 1;
          const spikeH = r.sliceN / (r.te.length / bins) / maxH;
          return (
            <svg viewBox={`0 0 ${W} 172`} className="w-full">
              {hist.map((h, n) => (
                <rect key={n} x={bx(n)} y={132 - (h / maxH) * 96} width={bw} height={(h / maxH) * 96} fill={VIZ.axis} opacity={0.6} />
              ))}
              {/* what serving actually sends for the missing rows */}
              <rect x={bx(0)} y={132 - Math.min(1, spikeH) * 96} width={bw * 1.6} height={Math.min(1, spikeH) * 96} fill={VIZ.rose} />
              <line x1={bx(0)} x2={bx(0)} y1={20} y2={132} stroke={VIZ.rose} strokeWidth={1} strokeDasharray="3 2" />
              <text x={bx(0) + 6} y={26} fontSize={9} fill={VIZ.rose}>
                serving sends age = 0 here
              </text>
              <line
                x1={46 + (MEDIAN_AGE / hi) * (W - 92)}
                x2={46 + (MEDIAN_AGE / hi) * (W - 92)}
                y1={30}
                y2={132}
                stroke={VIZ.teal}
                strokeWidth={1.6}
              />
              <text x={46 + (MEDIAN_AGE / hi) * (W - 92) + 6} y={44} fontSize={9} fill={VIZ.teal}>
                training imputes 34
              </text>
              <line x1={46} x2={W - 46} y1={132} y2={132} stroke={VIZ.axis} strokeWidth={1} />
              {[0, 20, 40, 60, 80].map((v) => (
                <text key={v} x={46 + (v / hi) * (W - 92)} y={146} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                  {v}
                </text>
              ))}
              <text x={46} y={164} fontSize={8.5} fill={VIZ.text}>
                age as the model receives it
              </text>
            </svg>
          );
        }

        if (i === 1)
          return (
            <div className="space-y-2 py-2">
              {bar("AUC, all rows — correct", r.aucAll, 1, VIZ.teal)}
              {bar("AUC, all rows — skewed", r.aucAllBad, 1, VIZ.rose)}
              <div className="h-2" />
              {bar("AUC, affected slice — correct", r.aucSlice, 1, VIZ.teal)}
              {bar("AUC, affected slice — skewed", r.aucSliceBad, 1, VIZ.rose)}
              <p className="pt-1 font-mono text-[10.5px] text-slate-400">
                difference: {(r.aucAllBad - r.aucAll).toFixed(4)} overall,{" "}
                {(r.aucSliceBad - r.aucSlice).toFixed(4)} on the slice
              </p>
            </div>
          );

        if (i === 2) {
          const max = Math.max(r.meanAll, r.meanSlice) * 1.15;
          return (
            <div className="space-y-2 py-2">
              {bar("mean score, all — correct", r.meanAll, max, VIZ.axis, (x) => x.toFixed(4))}
              {bar("mean score, all — skewed", r.meanAllBad, max, VIZ.rose, (x) => x.toFixed(4))}
              <p className="font-mono text-[10.5px] text-slate-500">
                aggregate change {((r.meanAllBad / r.meanAll - 1) * 100).toFixed(1)}% — no monitor alarms on this
              </p>
              <div className="h-2" />
              {bar("mean score, slice — correct", r.meanSlice, max, VIZ.teal, (x) => x.toFixed(4))}
              {bar("mean score, slice — skewed", r.meanSliceBad, max, VIZ.rose, (x) => x.toFixed(4))}
              <p className="font-mono text-[10.5px] text-accent-rose">
                slice change {((r.meanSliceBad / r.meanSlice - 1) * 100).toFixed(0)}%
              </p>
            </div>
          );
        }

        // step 3: what a threshold does to the affected slice
        const pts = r.idx.slice(0, 260);
        const sx = (v: number) => 46 + (v / 0.5) * (W - 92);
        return (
          <svg viewBox={`0 0 ${W} 172`} className="w-full">
            <line x1={sx(THRESHOLD)} x2={sx(THRESHOLD)} y1={16} y2={132} stroke={VIZ.textBright} strokeWidth={1.6} />
            <text x={sx(THRESHOLD) + 5} y={24} fontSize={9} fill={VIZ.textBright}>
              action threshold {THRESHOLD.toFixed(2)}
            </text>
            {pts.map((idx, n) => {
              const y = 40 + (n % 46) * 2;
              return (
                <g key={n}>
                  <line x1={sx(Math.min(0.5, r.bad[idx]))} x2={sx(Math.min(0.5, r.good[idx]))} y1={y} y2={y} stroke={VIZ.rose} strokeWidth={0.7} opacity={0.35} />
                  <circle cx={sx(Math.min(0.5, r.good[idx]))} cy={y} r={1.5} fill={VIZ.teal} />
                  <circle cx={sx(Math.min(0.5, r.bad[idx]))} cy={y} r={1.5} fill={VIZ.rose} />
                </g>
              );
            })}
            <line x1={46} x2={W - 46} y1={140} y2={140} stroke={VIZ.axis} strokeWidth={1} />
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((v) => (
              <text key={v} x={sx(v)} y={154} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                {v.toFixed(1)}
              </text>
            ))}
            <text x={46} y={168} fontSize={8.5} fill={VIZ.text}>
              score for the affected rows — teal is correct, rose is what serving produces
            </text>
          </svg>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <GuidedCard label="the disagreement" accent={VIZ.rose}>
            <span className="font-mono text-[11.5px] text-slate-300">
              training imputes <span className="text-accent-teal">{MEDIAN_AGE}</span>, serving sends{" "}
              <span className="text-accent-rose">{SERVING_DEFAULT}</span>
              <br />
              affects {r.sliceN.toLocaleString()} rows ({(share * 100).toFixed(0)}%)
            </span>
          </GuidedCard>
          {i >= 1 && (
            <GuidedCard label="what the offline metric says" accent={VIZ.teal}>
              <span className="font-mono text-[11.5px] text-slate-300">
                AUC {r.aucAll.toFixed(3)} → <span className="text-accent-teal">{r.aucAllBad.toFixed(3)}</span>
                <br />
                moved by {(r.aucAllBad - r.aucAll).toFixed(4)} — nothing to see
              </span>
            </GuidedCard>
          )}
          {i >= 2 && (
            <GuidedCard label="aggregate vs slice" accent={VIZ.yellow}>
              <span className="font-mono text-[11.5px] text-slate-300">
                all traffic <span className="text-slate-400">{((r.meanAllBad / r.meanAll - 1) * 100).toFixed(1)}%</span>
                <br />
                affected slice{" "}
                <span className="text-accent-rose">{((r.meanSliceBad / r.meanSlice - 1) * 100).toFixed(0)}%</span>
              </span>
            </GuidedCard>
          )}
          {i === 3 && (
            <GuidedPayoff label="why nobody finds this one">
              Offline AUC moves by {(r.aucAllBad - r.aucAll).toFixed(4)} and aggregate prediction drift by{" "}
              {((r.meanAllBad / r.meanAll - 1) * 100).toFixed(1)}% — the two things teams actually watch
              both say the system is healthy, and they are not being lazy: a rank metric genuinely cannot
              represent a constant shift applied to a subgroup. Meanwhile{" "}
              <strong>{r.flipped.toLocaleString()}</strong> of the {r.sliceN.toLocaleString()} affected
              rows are pushed from above the {THRESHOLD.toFixed(2)} action threshold to below it, purely
              because one branch of the feature code disagrees with the other. Segment your monitoring by
              the branches your feature code can take — imputed versus present, each default, each
              fallback path — or this class of bug will never surface at all.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i === 0 ? (
          <>
            <GuidedLegend color={VIZ.axis}>age as training saw it</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>what serving sends instead</GuidedLegend>
            <GuidedLegend color={VIZ.teal}>the training imputation value</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.teal}>correct serving path</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>skewed serving path</GuidedLegend>
          </>
        )
      }
    />
  );
}
