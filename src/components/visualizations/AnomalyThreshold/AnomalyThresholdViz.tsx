"use client";

/**
 * The threshold problem, priced.
 *
 * Two score distributions — normal traffic N(0, 1) and anomalies N(2.6, 1.1) —
 * evaluated analytically rather than by sampling, so the far tail where all the
 * interesting thresholds live has no finite-sample zeros in it. At 0.1%
 * prevalence over 1M events a day:
 *
 *   miss/alarm   threshold   recall   precision   alerts/day
 *        1          3.93      0.1133    0.7275         156
 *       10          3.10      0.3247    0.2514       1,291
 *      100          2.22      0.6351    0.0459      13,831
 *     1000          1.28      0.8849    0.0088     101,057
 *
 * The F1-optimal threshold is 3.31 — recall 0.2593, precision 0.3575, 725
 * alerts. It is a perfectly reasonable operating point *and it encodes a cost
 * ratio you never chose*. Judged against a real ratio it is 2% off at 10, **50%
 * off at 100, and 244% off at 1000**. "Maximise F1" is not a neutral default;
 * it is an assumption that a missed anomaly costs about ten false alarms.
 *
 * The other half is the alert-fatigue arithmetic that imbalance forces. To
 * catch 88% of anomalies you accept 101,057 alerts a day of which 99.1% are
 * false. No threshold escapes that — it is prevalence, not model quality — and
 * the fix is triage, enrichment, or a better score, not a better cut.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

const MU_N = 0;
const SD_N = 1;
const MU_A = 2.6;
const SD_A = 1.1;
const TOTAL = 1e6;

/** Abramowitz–Stegun erf; exact tails beat sampled ones out here. */
function erf(x: number) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  return s * (1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
}
const sf = (x: number, m: number, s: number) => 0.5 * (1 - erf((x - m) / (s * Math.SQRT2)));
const pdf = (x: number, m: number, s: number) =>
  Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));

function metrics(t: number, prev: number) {
  const tpr = sf(t, MU_A, SD_A);
  const fpr = sf(t, MU_N, SD_N);
  const nP = prev * TOTAL;
  const nN = TOTAL - nP;
  const TP = tpr * nP;
  const FN = nP - TP;
  const FP = fpr * nN;
  const prec = TP + FP > 0 ? TP / (TP + FP) : 1;
  const f1 = prec + tpr > 0 ? (2 * prec * tpr) / (prec + tpr) : 0;
  return { t, tpr, fpr, TP, FN, FP, prec, f1, alerts: TP + FP };
}

const GRID = Array.from({ length: 701 }, (_, i) => -1 + i * 0.01);

function bestBy(score: (m: ReturnType<typeof metrics>) => number, prev: number) {
  let best = metrics(GRID[0], prev);
  let bv = score(best);
  for (const t of GRID) {
    const m = metrics(t, prev);
    const v = score(m);
    if (v < bv) {
      bv = v;
      best = m;
    }
  }
  return best;
}

const W = 560;
const H = 190;
const PAD = { l: 44, r: 14, t: 14, b: 28 };
const LO = -3.5;
const HI = 7;
const sx = scale(LO, HI, PAD.l, W - PAD.r);

export function AnomalyThresholdViz({ className }: { className?: string }) {
  const [t, setT] = useState(2.22);
  const [ratio, setRatio] = useState(100);
  const [prevPct, setPrevPct] = useState(0.1);

  const prev = prevPct / 100;
  const m = useMemo(() => metrics(t, prev), [t, prev]);
  const f1Best = useMemo(() => bestBy((x) => -x.f1, prev), [prev]);
  const costBest = useMemo(() => bestBy((x) => ratio * x.FN + x.FP, prev), [ratio, prev]);

  const costAt = (x: ReturnType<typeof metrics>) => ratio * x.FN + x.FP;
  const penalty = costAt(f1Best) / costAt(costBest) - 1;

  const peak = Math.max(pdf(MU_N, MU_N, SD_N), pdf(MU_A, MU_A, SD_A));
  const sy = scale(0, peak, H - PAD.b, PAD.t);
  const curve = (mu: number, sd: number) =>
    Array.from({ length: 220 }, (_, i) => {
      const x = LO + (i / 219) * (HI - LO);
      return `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(pdf(x, mu, sd)).toFixed(1)}`;
    }).join(" ");

  return (
    <VizFrame
      title="Every threshold is a price you already agreed to"
      caption="Normal traffic N(0,1) against anomalies N(2.6,1.1), evaluated analytically so the far tail is exact. Counts are per 1M events a day at the chosen prevalence. The teal line is your threshold; the yellow one is whatever the current cost ratio makes optimal."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={`${curve(MU_N, SD_N)} L${sx(HI)},${sy(0)} L${sx(LO)},${sy(0)} Z`} fill={VIZ.brand} opacity={0.18} />
        <path d={curve(MU_N, SD_N)} fill="none" stroke={VIZ.brand} strokeWidth={1.6} />
        <path d={`${curve(MU_A, SD_A)} L${sx(HI)},${sy(0)} L${sx(LO)},${sy(0)} Z`} fill={VIZ.rose} opacity={0.18} />
        <path d={curve(MU_A, SD_A)} fill="none" stroke={VIZ.rose} strokeWidth={1.6} />

        <line x1={sx(costBest.t)} x2={sx(costBest.t)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.yellow} strokeWidth={1.4} strokeDasharray="4 3" />
        <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.teal} strokeWidth={2} />

        <text x={sx(MU_N)} y={PAD.t + 10} textAnchor="middle" fontSize={9} fill={VIZ.brand}>
          normal
        </text>
        <text x={sx(MU_A)} y={PAD.t + 10} textAnchor="middle" fontSize={9} fill={VIZ.rose}>
          anomalies
        </text>
        <text x={sx(costBest.t)} y={H - PAD.b + 12} textAnchor="middle" fontSize={8} fill={VIZ.yellow}>
          cost-optimal {costBest.t.toFixed(2)}
        </text>
        <text x={sx(f1Best.t)} y={PAD.t + 24} textAnchor="middle" fontSize={8} fill={VIZ.text}>
          F1-optimal {f1Best.t.toFixed(2)}
        </text>
        <line x1={sx(f1Best.t)} x2={sx(f1Best.t)} y1={PAD.t + 28} y2={H - PAD.b} stroke={VIZ.axis} strokeWidth={1} strokeDasharray="2 3" />
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
        <VizStat label="recall" value={m.tpr.toFixed(4)} color={VIZ.teal} />
        <VizStat label="precision" value={m.prec.toFixed(4)} color={m.prec < 0.1 ? VIZ.rose : VIZ.textBright} />
        <VizStat label="alerts / day" value={Math.round(m.alerts).toLocaleString()} />
        <VizStat label="of them false" value={`${((m.FP / Math.max(1, m.alerts)) * 100).toFixed(1)}%`} color={VIZ.rose} />
        <VizStat label="missed anomalies" value={Math.round(m.FN).toLocaleString()} />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        <VizStat label="expected cost here" value={Math.round(costAt(m)).toLocaleString()} />
        <VizStat label="best achievable" value={Math.round(costAt(costBest)).toLocaleString()} color={VIZ.yellow} />
        <VizStat
          label="cost of using the F1 threshold"
          value={`${penalty > 0.005 ? "+" : ""}${(penalty * 100).toFixed(0)}%`}
          color={penalty > 0.2 ? VIZ.rose : VIZ.teal}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <VizSlider label="threshold" min={-1} max={6} step={0.01} value={t} onChange={setT} format={(v) => v.toFixed(2)} />
        <VizSlider
          label="cost of a miss ÷ cost of a false alarm"
          min={1}
          max={1000}
          step={1}
          value={ratio}
          onChange={(v) => setRatio(Math.round(v))}
          format={(v) => `${v}×`}
        />
        <VizSlider label="prevalence (%)" min={0.01} max={5} step={0.01} value={prevPct} onChange={setPrevPct} format={(v) => `${v.toFixed(2)}%`} />
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Set the ratio to 1000 and drag your threshold onto the yellow line: catching 88% of anomalies
        means accepting <span className="font-mono text-white">101,057</span> alerts a day,{" "}
        <span className="font-mono text-white">99.1%</span> of them false. That is not a bad model — it is
        what 0.1% prevalence costs, and no cut escapes it. The fix is triage, enrichment or a better
        score, never a better threshold.
      </p>
    </VizFrame>
  );
}
