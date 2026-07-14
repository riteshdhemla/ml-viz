"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizButton, VizStat, scale } from "../viz-kit";

/**
 * RLHF J-curve visualization — worse before better.
 *
 * When the target behavior is out-of-distribution for the SFT model, the KL
 * penalty is charged immediately (it rises as the policy moves), while the
 * reward gains only arrive once the policy discovers genuinely better outputs.
 * Task performance ≈ reward − β·KL therefore dips before it climbs — a J-curve.
 *
 * SFT warm-start begins RL near the target distribution: the reward rises
 * sooner and the KL cost is smaller, so the dip is visibly shallower. The other
 * mode's task curve is drawn as a faint dashed reference for direct comparison.
 */

const BETA = 0.6;
const N = 80;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

type Mode = { kl: (t: number) => number; reward: (t: number) => number };
const MODES: Record<"naive" | "warm", Mode> = {
  naive: {
    kl: (t) => 1.0 * (1 - Math.exp(-t / 0.15)), // rises immediately
    reward: (t) => sigmoid((t - 0.45) / 0.12), // delayed payoff
  },
  warm: {
    kl: (t) => 0.5 * (1 - Math.exp(-t / 0.15)), // starts near-distribution → smaller KL
    reward: (t) => sigmoid((t - 0.2) / 0.12), // payoff arrives sooner
  },
};

const task = (m: Mode, t: number) => m.reward(t) - BETA * m.kl(t);

const W = 560;
const H = 340;
const PLOT = { x0: 46, x1: 540, y0: 22, y1: 280 };
const YD: [number, number] = [-0.45, 1.05];

function curve(fn: (t: number) => number, sx: (v: number) => number, sy: (v: number) => number) {
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    return `${sx(t)},${sy(fn(t))}`;
  }).join(" ");
}

export function RLHFJCurveViz({ className }: { className?: string }) {
  const [warm, setWarm] = useState(false);
  const [step, setStep] = useState(30);

  const sx = scale(0, 1, PLOT.x0, PLOT.x1);
  const sy = scale(YD[0], YD[1], PLOT.y1, PLOT.y0);
  const mode = warm ? MODES.warm : MODES.naive;
  const other = warm ? MODES.naive : MODES.warm;
  const t = step / 100;

  const { klC, rewC, taskC, otherTaskC, dip } = useMemo(() => {
    // task-performance dip = starting value minus the minimum along the run
    let minTask = Infinity;
    for (let i = 0; i <= N; i++) minTask = Math.min(minTask, task(mode, i / N));
    return {
      klC: curve((x) => mode.kl(x), sx, sy),
      rewC: curve((x) => mode.reward(x), sx, sy),
      taskC: curve((x) => task(mode, x), sx, sy),
      otherTaskC: curve((x) => task(other, x), sx, sy),
      dip: task(mode, 0) - minTask,
    };
  }, [warm]);

  const klNow = mode.kl(t);
  const rewNow = mode.reward(t);
  const taskNow = task(mode, t);

  return (
    <VizFrame
      className={className}
      title="RLHF J-Curve: Worse Before Better"
      caption="Task performance ≈ reward − β·KL. The KL penalty is charged immediately as the out-of-distribution policy moves, while the reward payoff lags — so performance dips before it climbs. Toggle SFT warm-start: starting RL near the target distribution shrinks the KL cost and brings the reward forward, so the dip (dashed reference = the other mode) becomes much shallower."
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <VizButton active={!warm} onClick={() => setWarm(false)}>No warm-start</VizButton>
        <VizButton active={warm} onClick={() => setWarm(true)}>SFT warm-start</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="KL, reward, and task performance over RL steps">
        {/* axes + zero line */}
        <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={PLOT.x0} y1={sy(0)} x2={PLOT.x1} y2={sy(0)} stroke={VIZ.axis} strokeWidth={1} strokeDasharray="2 2" />
        <text x={PLOT.x0 - 6} y={sy(0) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>0</text>
        <text x={PLOT.x0 - 6} y={sy(1) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>+1</text>
        <text x={(PLOT.x0 + PLOT.x1) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={VIZ.text}>RL training steps →</text>

        {/* step marker */}
        <line x1={sx(t)} y1={PLOT.y0} x2={sx(t)} y2={PLOT.y1} stroke={VIZ.brandLight} strokeWidth={1} strokeDasharray="3 3" />

        {/* reference task curve (other mode) */}
        <polyline points={otherTaskC} fill="none" stroke={VIZ.text} strokeWidth={1.3} strokeDasharray="4 3" opacity={0.5} />

        {/* KL, reward, task */}
        <polyline points={klC} fill="none" stroke={VIZ.rose} strokeWidth={2.2} />
        <polyline points={rewC} fill="none" stroke={VIZ.teal} strokeWidth={2.2} />
        <polyline points={taskC} fill="none" stroke={VIZ.brand} strokeWidth={2.6} />

        {/* markers at step */}
        <circle cx={sx(t)} cy={sy(klNow)} r={3} fill={VIZ.rose} />
        <circle cx={sx(t)} cy={sy(rewNow)} r={3} fill={VIZ.teal} />
        <circle cx={sx(t)} cy={sy(taskNow)} r={3.6} fill={VIZ.brand} />

        {/* legend */}
        {[
          { c: VIZ.rose, t: "KL cost (paid up front)" },
          { c: VIZ.teal, t: "raw reward (lags)" },
          { c: VIZ.brand, t: "task perf = reward − β·KL" },
        ].map((it, i) => (
          <g key={it.t}>
            <rect x={PLOT.x1 - 176} y={PLOT.y0 + 6 + i * 15} width={11} height={4} fill={it.c} />
            <text x={PLOT.x1 - 161} y={PLOT.y0 + 10 + i * 15} fontSize={9} fill={VIZ.text}>{it.t}</text>
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
        <div className="min-w-[180px] flex-1">
          <VizSlider label="training step" min={0} max={100} step={1} value={step} onChange={setStep} format={(v) => `${v}%`} />
        </div>
        <VizStat label="task perf now" value={taskNow.toFixed(2)} color={taskNow < task(mode, 0) ? VIZ.rose : VIZ.teal} />
        <VizStat label="max dip" value={dip.toFixed(2)} color={dip > 0.15 ? VIZ.rose : VIZ.teal} />
      </div>
    </VizFrame>
  );
}
