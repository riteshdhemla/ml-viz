"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

/**
 * The rank-ordering table a scorecard validation pack opens with: sort the
 * population by score, cut it into equal-sized bins, and read off where the
 * bads actually landed.
 *
 * Two fixed pools of latent scores are drawn once at module load (1,600 bads,
 * 5,000 goods, both standard normal). The **separation** slider shifts the two
 * pools apart symmetrically, which changes discrimination without touching the
 * within-group ordering; **prevalence** re-cuts how many of each pool enter the
 * 5,000-account sample, which changes the base rate without touching
 * discrimination. That split is the point of the viz:
 *
 *   separation 1.4, prevalence  5%  →  AUC 0.856, KS 0.547, top-decile lift 5.20
 *   separation 1.4, prevalence 25%  →  AUC 0.847, KS 0.526, top-decile lift 3.22
 *
 * AUC and KS are rank statistics and barely move with the base rate (the 0.009
 * that does move is sampling noise from drawing 1,250 bads instead of 250).
 * Lift is a *ratio to the base rate*, so it collapses by 38% on a model whose
 * ranking is unchanged: a bin holding 10% of the population can capture at
 * most 1/0.25 = 4x the base rate once a quarter of the book is bad, however
 * good the ranking is. A team that promises "5x lift" without naming the
 * prevalence it was measured at has promised nothing.
 *
 * Everything is computed from the same sample: the exact AUC via the rank-sum
 * identity, the exact KS by sweeping every distinct score, and the binned KS
 * from the table's bin edges — which is always the smaller of the two, because
 * a bin grid can only find the gap at its own cut points.
 */

const GAINS_W = 360;
const GAINS_H = 250;
const LIFT_W = 360;
const LIFT_H = 250;

const N_SAMPLE = 5000;
const BAD_POOL = 1600;
const GOOD_POOL = 5000;

/** Latent scores, drawn once; the separation slider shifts these at render. */
const { badLatent, goodLatent } = (() => {
  const rng = seededRandom(20240117);
  return {
    badLatent: Array.from({ length: BAD_POOL }, () => gaussian(rng, 0, 1)),
    goodLatent: Array.from({ length: GOOD_POOL }, () => gaussian(rng, 0, 1)),
  };
})();

interface Bin {
  index: number;
  n: number;
  bads: number;
  badRate: number;
  lift: number;
  cumBadPct: number;
  cumGoodPct: number;
  cumLift: number;
  ks: number;
}

interface Table {
  bins: Bin[];
  nBad: number;
  nGood: number;
  baseRate: number;
  auc: number;
  exactKs: number;
  binnedKs: number;
  ksBin: number;
  monotoneBreaks: number;
}

/** Score, sort, cut into `k` equal-count bins, and tabulate. */
function buildTable(separation: number, prevalence: number, k: number): Table {
  const nBad = Math.round(prevalence * N_SAMPLE);
  const nGood = N_SAMPLE - nBad;

  const rows: { score: number; bad: number }[] = [];
  for (let i = 0; i < nBad; i++) rows.push({ score: badLatent[i] + separation / 2, bad: 1 });
  for (let i = 0; i < nGood; i++) rows.push({ score: goodLatent[i] - separation / 2, bad: 0 });
  rows.sort((p, q) => q.score - p.score);

  // Exact AUC by the rank-sum identity (scores are continuous, so no ties).
  let rankSumBad = 0;
  rows.forEach((r, i) => {
    if (r.bad === 1) rankSumBad += rows.length - i; // rank 1 = worst score
  });
  const auc = (rankSumBad - (nBad * (nBad + 1)) / 2) / (nBad * nGood);

  // Exact KS: the largest gap between the two cumulative curves, at any cut.
  let cb = 0;
  let cg = 0;
  let exactKs = 0;
  for (const r of rows) {
    if (r.bad === 1) cb += 1;
    else cg += 1;
    exactKs = Math.max(exactKs, cb / nBad - cg / nGood);
  }

  // Equal-count bins, best score first.
  const bins: Bin[] = [];
  let seenBad = 0;
  let seenGood = 0;
  let binnedKs = 0;
  let ksBin = 1;
  for (let b = 0; b < k; b++) {
    const lo = Math.floor((b * rows.length) / k);
    const hi = Math.floor(((b + 1) * rows.length) / k);
    let bads = 0;
    for (let i = lo; i < hi; i++) if (rows[i].bad === 1) bads += 1;
    const n = hi - lo;
    seenBad += bads;
    seenGood += n - bads;
    const cumBadPct = seenBad / nBad;
    const cumGoodPct = seenGood / nGood;
    const gap = cumBadPct - cumGoodPct;
    if (gap > binnedKs) {
      binnedKs = gap;
      ksBin = b + 1;
    }
    bins.push({
      index: b + 1,
      n,
      bads,
      badRate: bads / n,
      lift: bads / n / (nBad / N_SAMPLE),
      cumBadPct,
      cumGoodPct,
      cumLift: seenBad / hi / (nBad / N_SAMPLE),
      ks: gap,
    });
  }

  // A rank-ordering break: a bin riskier than the one above it.
  let monotoneBreaks = 0;
  for (let b = 1; b < bins.length; b++) {
    if (bins[b].badRate > bins[b - 1].badRate) monotoneBreaks += 1;
  }

  return {
    bins,
    nBad,
    nGood,
    baseRate: nBad / N_SAMPLE,
    auc,
    exactKs,
    binnedKs,
    ksBin,
    monotoneBreaks,
  };
}

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

export function DecileLiftViz({ className }: { className?: string }) {
  const [separation, setSeparation] = useState(1.4);
  const [prevalence, setPrevalence] = useState(0.05);
  const [k, setK] = useState(10);

  const t = useMemo(() => buildTable(separation, prevalence, k), [separation, prevalence, k]);

  const gx = scale(0, 1, 34, GAINS_W - 10);
  const gy = scale(0, 1, GAINS_H - 30, 12);

  const path = (ys: number[]) =>
    [
      `M ${gx(0)} ${gy(0)}`,
      ...ys.map((y, i) => `L ${gx((i + 1) / k)} ${gy(y)}`),
    ].join(" ");

  const ksMark = t.bins[t.ksBin - 1];
  const ksX = gx(t.ksBin / k);

  const liftMax = Math.max(2, ...t.bins.map((b) => b.lift)) * 1.1;
  const lx = scale(0, k, 34, LIFT_W - 8);
  const ly = scale(0, liftMax, LIFT_H - 30, 12);

  return (
    <VizFrame
      title="Decile analysis: gains, lift and KS"
      caption="Sort every account by score, cut into equal-sized bins, and count the bads in each. The gains curve is the cumulative share of bads captured (teal) against the cumulative share of goods (indigo); the dashed vertical bar is the KS statistic, the widest gap between them. Separation moves discrimination, prevalence moves only the base rate — watch AUC and KS hold while lift collapses, because lift is a ratio to the base rate and the other two are not."
      className={className}
    >
      <div className="grid gap-3 sm:grid-cols-3 mb-3">
        <VizSlider
          label="separation (bad vs good scores)"
          min={0}
          max={3}
          step={0.05}
          value={separation}
          onChange={setSeparation}
          format={(v) => v.toFixed(2)}
        />
        <VizSlider
          label="prevalence (bad rate)"
          min={0.02}
          max={0.3}
          step={0.01}
          value={prevalence}
          onChange={setPrevalence}
          format={(v) => `${(100 * v).toFixed(0)}%`}
        />
        <div className="flex items-end gap-2">
          {[5, 10, 20].map((n) => (
            <VizButton key={n} onClick={() => setK(n)} active={k === n}>
              {n} bins
            </VizButton>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <svg viewBox={`0 0 ${GAINS_W} ${GAINS_H}`} className="w-full">
          <text x={34} y={10} fill={VIZ.text} fontSize={9}>
            cumulative % captured
          </text>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={34} y1={gy(v)} x2={GAINS_W - 10} y2={gy(v)} stroke={VIZ.grid} strokeWidth={1} />
              <text x={30} y={gy(v) + 3} fill={VIZ.text} fontSize={8} textAnchor="end">
                {(100 * v).toFixed(0)}
              </text>
            </g>
          ))}
          <line x1={gx(0)} y1={gy(0)} x2={gx(1)} y2={gy(1)} stroke={VIZ.axis} strokeWidth={1} strokeDasharray="3 3" />

          {/* the KS gap at its widest bin */}
          <line
            x1={ksX}
            y1={gy(ksMark.cumGoodPct)}
            x2={ksX}
            y2={gy(ksMark.cumBadPct)}
            stroke={VIZ.yellow}
            strokeWidth={2}
            strokeDasharray="4 2"
          />
          <text x={ksX + 4} y={gy((ksMark.cumBadPct + ksMark.cumGoodPct) / 2)} fill={VIZ.yellow} fontSize={9}>
            KS {t.binnedKs.toFixed(3)}
          </text>

          <path d={path(t.bins.map((b) => b.cumGoodPct))} fill="none" stroke={VIZ.brand} strokeWidth={2} />
          <path d={path(t.bins.map((b) => b.cumBadPct))} fill="none" stroke={VIZ.teal} strokeWidth={2.5} />
          {t.bins.map((b) => (
            <circle key={b.index} cx={gx(b.index / k)} cy={gy(b.cumBadPct)} r={2.5} fill={VIZ.teal} />
          ))}

          <text x={GAINS_W - 10} y={GAINS_H - 14} fill={VIZ.text} fontSize={9} textAnchor="end">
            % of population targeted →
          </text>
          <text x={gx(0.03)} y={gy(0.94)} fill={VIZ.teal} fontSize={9}>
            bads captured
          </text>
          <text x={gx(0.45)} y={gy(0.28)} fill={VIZ.brand} fontSize={9}>
            goods captured
          </text>
        </svg>

        <svg viewBox={`0 0 ${LIFT_W} ${LIFT_H}`} className="w-full">
          <text x={34} y={10} fill={VIZ.text} fontSize={9}>
            lift per bin (bad rate ÷ base rate)
          </text>
          {[0, 1, 2, 3, 4, 5, 6].filter((v) => v <= liftMax).map((v) => (
            <g key={v}>
              <line
                x1={34}
                y1={ly(v)}
                x2={LIFT_W - 8}
                y2={ly(v)}
                stroke={v === 1 ? VIZ.axis : VIZ.grid}
                strokeWidth={1}
                strokeDasharray={v === 1 ? "4 3" : undefined}
              />
              <text x={30} y={ly(v) + 3} fill={VIZ.text} fontSize={8} textAnchor="end">
                {v}×
              </text>
            </g>
          ))}
          {t.bins.map((b) => {
            const x0 = lx(b.index - 1) + 2;
            const w = lx(1) - lx(0) - 4;
            const y = ly(Math.min(b.lift, liftMax));
            const broken = b.index > 1 && b.badRate > t.bins[b.index - 2].badRate;
            return (
              <rect
                key={b.index}
                x={x0}
                y={y}
                width={w}
                height={Math.max(1, ly(0) - y)}
                fill={broken ? VIZ.rose : b.lift >= 1 ? VIZ.teal : VIZ.brand}
                opacity={b.lift >= 1 ? 0.9 : 0.55}
              />
            );
          })}
          <text x={LIFT_W - 8} y={LIFT_H - 14} fill={VIZ.text} fontSize={9} textAnchor="end">
            riskiest bin → safest bin
          </text>
          {t.monotoneBreaks > 0 && (
            <text x={38} y={LIFT_H - 14} fill={VIZ.rose} fontSize={9}>
              {t.monotoneBreaks} rank-order break{t.monotoneBreaks > 1 ? "s" : ""} (rose)
            </text>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
        <VizStat label="AUC (exact)" value={t.auc.toFixed(3)} color={VIZ.teal} />
        <VizStat label="Gini = 2·AUC−1" value={(2 * t.auc - 1).toFixed(3)} color={VIZ.teal} />
        <VizStat label="KS (exact)" value={t.exactKs.toFixed(3)} color={VIZ.yellow} />
        <VizStat label={`KS (${k} bins)`} value={t.binnedKs.toFixed(3)} color={VIZ.yellow} />
        <VizStat label="top-bin lift" value={`${t.bins[0].lift.toFixed(2)}×`} color={VIZ.brandLight} />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[11px] font-mono text-slate-300">
          <thead className="text-slate-500">
            <tr>
              {["bin", "n", "bads", "bad rate", "lift", "cum % bads", "cum % goods", "KS"].map((h) => (
                <th key={h} className="px-2 py-1 text-right font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.bins.map((b) => {
              const broken = b.index > 1 && b.badRate > t.bins[b.index - 2].badRate;
              return (
                <tr
                  key={b.index}
                  className={b.index === t.ksBin ? "bg-surface-elevated" : undefined}
                  style={broken ? { color: VIZ.rose } : undefined}
                >
                  <td className="px-2 py-0.5 text-right">{b.index}</td>
                  <td className="px-2 py-0.5 text-right">{b.n}</td>
                  <td className="px-2 py-0.5 text-right">{b.bads}</td>
                  <td className="px-2 py-0.5 text-right">{pct(b.badRate)}</td>
                  <td className="px-2 py-0.5 text-right">{b.lift.toFixed(2)}×</td>
                  <td className="px-2 py-0.5 text-right">{pct(b.cumBadPct)}</td>
                  <td className="px-2 py-0.5 text-right">{pct(b.cumGoodPct)}</td>
                  <td className="px-2 py-0.5 text-right">{b.ks.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-3 leading-relaxed">
        Sample: {N_SAMPLE.toLocaleString()} accounts, {t.nBad.toLocaleString()} bad ({pct(t.baseRate)} base rate).
        The KS row is highlighted. Binned KS ({t.binnedKs.toFixed(3)}) can only ever be ≤ the exact KS (
        {t.exactKs.toFixed(3)}), because a bin grid finds the gap at its own cut points and nowhere else — push
        separation down until the bars stop descending cleanly and rose bins appear, the rank-order breaks that a
        validation pack has to explain.
      </p>
    </VizFrame>
  );
}

export default DecileLiftViz;
