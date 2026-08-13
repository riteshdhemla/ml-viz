"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

/**
 * One threshold, five metrics, two curves — and what class imbalance does to
 * each of them.
 *
 * 900 positives and 900 negatives are scored once, at module load, from two
 * fixed Gaussians pushed through a sigmoid (negatives centred at -0.8,
 * positives at +0.8, so the separation is 1.6 and the achievable AUC is 0.873).
 * TPR and FPR depend only on those two score distributions, so they are
 * precomputed for all 201 thresholds; prevalence enters only through the
 * reweighting `P = pi*TPR / (pi*TPR + (1-pi)*FPR)`.
 *
 * That structure is the point the lesson's imbalance warning makes in prose:
 *
 *   prevalence   AUC-ROC   PR-AUC
 *        50%      0.8727   0.8699
 *        10%      0.8727   0.5247
 *         1%      0.8727   0.1905
 *
 * AUC-ROC is *identical* to four decimals at every prevalence — not similar,
 * identical, because it never touches the class mix. At 1% prevalence and a
 * threshold of 0.5 the same model produces 2,079 false positives against 79
 * true ones (precision 0.037) while accuracy holds at 0.790 and the ROC curve
 * does not move at all.
 *
 * The two histograms are each normalised to their own height, otherwise the
 * positive class is a single invisible pixel at 1% prevalence. The mix lives in
 * the confusion-matrix counts instead, which are the honest place for it.
 */

const W = 380;
const HIST_H = 128;
const PLOT = 148;

const N_PER_CLASS = 900;
const N_TOTAL = 10000;
const BINS = 34;
const N_TH = 201;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

const { NEG, POS } = (() => {
  const rng = seededRandom(11);
  const NEG = Array.from({ length: N_PER_CLASS }, () => sigmoid(gaussian(rng, -0.8, 1)));
  const POS = Array.from({ length: N_PER_CLASS }, () => sigmoid(gaussian(rng, 0.8, 1)));
  return { NEG, POS };
})();

const aboveRate = (arr: number[], t: number) => arr.reduce((n, s) => n + (s >= t ? 1 : 0), 0) / arr.length;

/** TPR/FPR per threshold — independent of prevalence, so computed once. */
const RATES = Array.from({ length: N_TH }, (_, i) => {
  const t = i / (N_TH - 1);
  return { t, tpr: aboveRate(POS, t), fpr: aboveRate(NEG, t) };
});

/** Class-conditional histograms, each normalised to its own peak. */
function histogram(arr: number[]) {
  const counts = new Array(BINS).fill(0);
  for (const s of arr) counts[Math.min(BINS - 1, Math.floor(s * BINS))] += 1;
  const max = Math.max(...counts);
  return counts.map((c) => c / max);
}
const HIST_NEG = histogram(NEG);
const HIST_POS = histogram(POS);

const AUC_ROC = (() => {
  const pts = [...RATES].sort((a, b) => a.fpr - b.fpr);
  let auc = 0;
  for (let i = 1; i < pts.length; i++) auc += (pts[i].fpr - pts[i - 1].fpr) * ((pts[i].tpr + pts[i - 1].tpr) / 2);
  return auc;
})();

const PREVALENCES = [0.5, 0.1, 0.01];

export function ThresholdSweepViz({ className }: { className?: string }) {
  const [t, setT] = useState(0.5);
  const [prev, setPrev] = useState(0.5);

  const { curve, prAuc } = useMemo(() => {
    const curve = RATES.map((r) => {
      const predPos = prev * r.tpr + (1 - prev) * r.fpr;
      return { ...r, prec: predPos > 0 ? (prev * r.tpr) / predPos : 1 };
    });
    const byRecall = [...curve].sort((a, b) => a.tpr - b.tpr);
    let ap = 0;
    for (let i = 1; i < byRecall.length; i++) ap += (byRecall[i].tpr - byRecall[i - 1].tpr) * byRecall[i].prec;
    return { curve, prAuc: ap };
  }, [prev]);

  const now = useMemo(() => {
    const nearest = curve.reduce((best, c) => (Math.abs(c.t - t) < Math.abs(best.t - t) ? c : best), curve[0]);
    const nPos = Math.round(prev * N_TOTAL);
    const nNeg = N_TOTAL - nPos;
    const tp = Math.round(nearest.tpr * nPos);
    const fp = Math.round(nearest.fpr * nNeg);
    const fn = nPos - tp;
    const tn = nNeg - fp;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = nPos > 0 ? tp / nPos : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { ...nearest, tp, fp, fn, tn, precision, recall, f1, accuracy: (tp + tn) / N_TOTAL };
  }, [curve, t, prev]);

  const hx = scale(0, 1, 26, W - 8);
  const hy = scale(0, 1, HIST_H - 16, 8);
  const px = scale(0, 1, 26, PLOT - 6);
  const py = scale(0, 1, PLOT - 20, 6);

  const bars = (h: number[], colour: string, up: boolean) =>
    h.map((v, i) => {
      const x0 = hx(i / BINS);
      const x1 = hx((i + 1) / BINS);
      const y = hy(v * 0.92);
      return (
        <rect
          key={`${up}-${i}`}
          x={x0}
          y={y}
          width={Math.max(1, x1 - x0 - 0.6)}
          height={hy(0) - y}
          fill={colour}
          opacity={0.5}
        />
      );
    });

  const line = (pts: { x: number; y: number }[], sx: (v: number) => number, sy: (v: number) => number) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  const rocPts = [...curve].sort((a, b) => a.fpr - b.fpr).map((c) => ({ x: c.fpr, y: c.tpr }));
  const prPts = [...curve].sort((a, b) => a.tpr - b.tpr).map((c) => ({ x: c.tpr, y: c.prec }));

  return (
    <VizFrame
      className={className}
      title="One threshold, and what imbalance does to the metrics that read it"
      caption="900 positives and 900 negatives scored by the same fixed model. The threshold slider moves the cut; the prevalence buttons change only the class mix, never the model. Each histogram is normalised to its own height — at 1% prevalence the positive class would otherwise be one invisible pixel — so the real mix lives in the confusion-matrix counts."
    >
      {/* score distributions with the cut */}
      <svg viewBox={`0 0 ${W} ${HIST_H}`} className="w-full max-w-lg mx-auto block" role="img" aria-label="Score distributions for both classes with the decision threshold">
        <line x1={hx(0)} y1={hy(0)} x2={hx(1)} y2={hy(0)} stroke={VIZ.axis} strokeWidth={1} />
        {bars(HIST_NEG, VIZ.text, false)}
        {bars(HIST_POS, VIZ.brand, true)}
        <rect x={hx(t)} y={8} width={Math.max(0, hx(1) - hx(t))} height={hy(0) - 8} fill={VIZ.teal} opacity={0.07} />
        <line x1={hx(t)} y1={4} x2={hx(t)} y2={hy(0)} stroke={VIZ.teal} strokeWidth={2} />
        <text x={hx(t)} y={HIST_H - 4} textAnchor="middle" fill={VIZ.teal} fontSize={9}>
          {t.toFixed(2)}
        </text>
        <text x={26} y={HIST_H - 4} fill={VIZ.text} fontSize={9}>
          score 0
        </text>
        <text x={W - 8} y={HIST_H - 4} textAnchor="end" fill={VIZ.text} fontSize={9}>
          1
        </text>
        <g transform={`translate(34, 14)`}>
          <rect x={0} y={-6} width={8} height={7} fill={VIZ.brand} opacity={0.6} />
          <text x={12} y={0} fill={VIZ.text} fontSize={9}>
            positives
          </text>
          <rect x={62} y={-6} width={8} height={7} fill={VIZ.text} opacity={0.5} />
          <text x={74} y={0} fill={VIZ.text} fontSize={9}>
            negatives
          </text>
        </g>
      </svg>

      {/* the two curves */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <svg viewBox={`0 0 ${PLOT} ${PLOT}`} className="w-40" role="img" aria-label="ROC curve with the current operating point">
          <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} stroke={VIZ.axis} strokeWidth={1} />
          <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(1)} stroke={VIZ.axis} strokeWidth={1} />
          <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke={VIZ.grid} strokeWidth={1} strokeDasharray="3 3" />
          <path d={line(rocPts, px, py)} fill="none" stroke={VIZ.brand} strokeWidth={2} />
          <circle cx={px(now.fpr)} cy={py(now.tpr)} r={4} fill={VIZ.teal} stroke={VIZ.card} strokeWidth={1.5} />
          <text x={PLOT / 2} y={PLOT - 8} textAnchor="middle" fill={VIZ.text} fontSize={9}>
            FPR
          </text>
          <text x={9} y={PLOT / 2} textAnchor="middle" fill={VIZ.text} fontSize={9} transform={`rotate(-90 9 ${PLOT / 2})`}>
            TPR
          </text>
          <text x={26} y={12} fill={VIZ.brandLight} fontSize={9}>
            ROC
          </text>
        </svg>

        <svg viewBox={`0 0 ${PLOT} ${PLOT}`} className="w-40" role="img" aria-label="Precision-recall curve with the current operating point">
          <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} stroke={VIZ.axis} strokeWidth={1} />
          <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(1)} stroke={VIZ.axis} strokeWidth={1} />
          <line x1={px(0)} y1={py(prev)} x2={px(1)} y2={py(prev)} stroke={VIZ.rose} strokeWidth={1} strokeDasharray="3 3" />
          <path d={line(prPts, px, py)} fill="none" stroke={VIZ.orange} strokeWidth={2} />
          <circle cx={px(now.recall)} cy={py(now.precision)} r={4} fill={VIZ.teal} stroke={VIZ.card} strokeWidth={1.5} />
          <text x={PLOT / 2} y={PLOT - 8} textAnchor="middle" fill={VIZ.text} fontSize={9}>
            recall
          </text>
          <text x={9} y={PLOT / 2} textAnchor="middle" fill={VIZ.text} fontSize={9} transform={`rotate(-90 9 ${PLOT / 2})`}>
            precision
          </text>
          <text x={PLOT - 8} y={12} textAnchor="end" fill={VIZ.orange} fontSize={9}>
            PR
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] items-start">
        {/* confusion matrix at 10,000 scored items */}
        <table className="text-xs font-mono border-collapse shrink-0">
          <tbody>
            <tr>
              <td className="px-2 py-1" />
              <td className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">pred +</td>
              <td className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">pred −</td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">actual +</td>
              <td className="px-2 py-1 rounded" style={{ color: VIZ.teal }}>
                {now.tp.toLocaleString()}
              </td>
              <td className="px-2 py-1" style={{ color: VIZ.yellow }}>
                {now.fn.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">actual −</td>
              <td className="px-2 py-1" style={{ color: VIZ.rose }}>
                {now.fp.toLocaleString()}
              </td>
              <td className="px-2 py-1 text-slate-400">{now.tn.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-col gap-3">
          <VizSlider label="decision threshold" min={0} max={1} step={0.005} value={t} onChange={setT} format={(v) => v.toFixed(3)} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400">prevalence</span>
            {PREVALENCES.map((p) => (
              <VizButton key={p} onClick={() => setPrev(p)} active={prev === p}>
                {p >= 0.1 ? `${p * 100}%` : `${(p * 100).toFixed(0)}%`}
              </VizButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <VizStat label="precision" value={now.precision.toFixed(3)} color={now.precision < 0.2 ? VIZ.rose : VIZ.textBright} />
            <VizStat label="recall" value={now.recall.toFixed(3)} />
            <VizStat label="F1" value={now.f1.toFixed(3)} />
            <VizStat label="accuracy" value={now.accuracy.toFixed(3)} color={VIZ.text} />
            <VizStat label="AUC-ROC" value={AUC_ROC.toFixed(4)} color={VIZ.brandLight} />
            <VizStat label="PR-AUC" value={prAuc.toFixed(4)} color={VIZ.orange} />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {prev === 0.5
              ? "Balanced classes. Slide the threshold: precision and recall move against each other, and the teal point walks along both curves at once. Now change the prevalence — the model does not change."
              : `At ${(prev * 100).toFixed(0)}% prevalence the ROC curve and its AUC of ${AUC_ROC.toFixed(4)} are unchanged — FPR divides by a huge TN, so it barely notices ${now.fp.toLocaleString()} false positives. PR-AUC has fallen to ${prAuc.toFixed(4)} against a no-skill floor of ${prev.toFixed(2)}, and precision reads ${now.precision.toFixed(3)}. Accuracy still says ${now.accuracy.toFixed(3)}.`}
          </p>
        </div>
      </div>
    </VizFrame>
  );
}
