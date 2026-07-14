"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Self-consistency visualization — more samples aren't more votes.
 *
 * Majority voting over k sampled reasoning chains only helps when the chains'
 * errors are independent. Temperature controls that independence:
 *   - near-greedy (T≈0): high per-path accuracy but the k samples are near
 *     copies (correlation ≈ 1) — they vote as a bloc, so accuracy is flat in k.
 *   - moderate (T≈0.7): slightly lower per-path accuracy but diverse paths —
 *     errors cancel, so accuracy rises with k and saturates (Condorcet).
 *   - too hot (T≈1.3): diverse but low per-path accuracy — rises slowly from a
 *     lower base.
 *
 * Accuracy is modeled with the normal approximation to the Condorcet jury
 * theorem over an *effective* number of independent votes
 *   n_eff = 1 + (k−1)(1−ρ),
 * so correlation ρ throttles how fast extra samples help.
 */

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

type Regime = { name: string; short: string; p: number; rho: number; color: string };
const REGIMES: Regime[] = [
  { name: "near-greedy (T≈0)", short: "T≈0", p: 0.63, rho: 0.95, color: VIZ.yellow },
  { name: "moderate (T≈0.7)", short: "T≈0.7", p: 0.6, rho: 0.25, color: VIZ.teal },
  { name: "too hot (T≈1.3)", short: "T≈1.3", p: 0.52, rho: 0.04, color: VIZ.rose },
];

const K_MAX = 25;

function voteAccuracy(k: number, r: Regime): number {
  const nEff = 1 + (k - 1) * (1 - r.rho);
  const z = ((r.p - 0.5) * Math.sqrt(nEff)) / Math.sqrt(r.p * (1 - r.p));
  return normalCdf(z);
}

const W = 560;
const H = 340;
const PLOT = { x0: 46, x1: 380, y0: 22, y1: 280 };
const BAR = { x0: 424, x1: 544, y0: 40, y1: 250 };

export function SelfConsistencyViz({ className }: { className?: string }) {
  const [k, setK] = useState(9);

  const sx = scale(1, K_MAX, PLOT.x0, PLOT.x1);
  const sy = scale(0.5, 1.0, PLOT.y1, PLOT.y0);

  const lines = useMemo(
    () =>
      REGIMES.map((r) => ({
        r,
        pts: Array.from({ length: K_MAX }, (_, i) => {
          const kk = i + 1;
          return `${sx(kk)},${sy(voteAccuracy(kk, r))}`;
        }).join(" "),
        accAtK: voteAccuracy(k, r),
      })),
    [k]
  );

  const byBar = scale(0, 1, BAR.y1, BAR.y0);

  return (
    <VizFrame
      className={className}
      title="Self-Consistency: More Samples Aren't More Votes"
      caption="Majority-vote accuracy over k sampled reasoning chains. At near-zero temperature the chains are near-copies (high path correlation) and vote as a bloc — accuracy is flat in k. Moderate temperature diversifies the paths so errors cancel and accuracy climbs. Too hot lowers per-path accuracy. The right panel shows each regime's path diversity (1 − correlation): the flat curve is the low-diversity trap."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Accuracy vs number of samples at three temperatures">
        {/* axes */}
        <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} stroke={VIZ.axis} strokeWidth={1} />
        {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
          <g key={v}>
            <line x1={PLOT.x0} y1={sy(v)} x2={PLOT.x1} y2={sy(v)} stroke={VIZ.grid} strokeWidth={0.5} />
            <text x={PLOT.x0 - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>{v.toFixed(1)}</text>
          </g>
        ))}
        <text x={(PLOT.x0 + PLOT.x1) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={VIZ.text}>samples k (majority vote)</text>
        <text x={12} y={(PLOT.y0 + PLOT.y1) / 2} textAnchor="middle" fontSize={10} fill={VIZ.text} transform={`rotate(-90 12 ${(PLOT.y0 + PLOT.y1) / 2})`}>accuracy</text>

        {/* k marker */}
        <line x1={sx(k)} y1={PLOT.y0} x2={sx(k)} y2={PLOT.y1} stroke={VIZ.brandLight} strokeWidth={1} strokeDasharray="3 3" />

        {/* regime lines */}
        {lines.map((l) => (
          <g key={l.r.short}>
            <polyline points={l.pts} fill="none" stroke={l.r.color} strokeWidth={2.2} />
            <circle cx={sx(k)} cy={sy(l.accAtK)} r={3.5} fill={l.r.color} />
          </g>
        ))}

        {/* right panel: path diversity bars */}
        <text x={(BAR.x0 + BAR.x1) / 2} y={BAR.y0 - 14} textAnchor="middle" fontSize={10} fill={VIZ.textBright}>path diversity</text>
        <text x={(BAR.x0 + BAR.x1) / 2} y={BAR.y0 - 3} textAnchor="middle" fontSize={9} fill={VIZ.text}>1 − correlation</text>
        <line x1={BAR.x0 - 6} y1={BAR.y1} x2={BAR.x1} y2={BAR.y1} stroke={VIZ.axis} strokeWidth={1} />
        {REGIMES.map((r, i) => {
          const bw = (BAR.x1 - BAR.x0) / 3;
          const cx = BAR.x0 + bw * (i + 0.5);
          const div = 1 - r.rho;
          return (
            <g key={r.short}>
              <rect x={cx - bw * 0.32} y={byBar(div)} width={bw * 0.64} height={BAR.y1 - byBar(div)} fill={r.color} opacity={0.85} rx={2} />
              <text x={cx} y={BAR.y1 + 12} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>{r.short}</text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
        <div className="min-w-[180px] flex-1">
          <VizSlider label="samples k" min={1} max={K_MAX} step={1} value={k} onChange={setK} format={(v) => v.toFixed(0)} />
        </div>
        {lines.map((l) => (
          <VizStat key={l.r.short} label={`acc @k=${k} · ${l.r.short}`} value={l.accAtK.toFixed(2)} color={l.r.color} />
        ))}
      </div>
    </VizFrame>
  );
}
