"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, useAnimationLoop, seededRandom, gaussian } from "../viz-kit";

/**
 * Online gradient descent (OGD) and sublinear regret.
 *
 * Each round an adversary reveals a convex loss f_t(x) = ½(x − y_t)².
 * OGD plays x_{t+1} = x_t − η_t ∇f_t(x_t) = x_t − η_t (x_t − y_t), with
 * η_t = c/√t. Regret against the best fixed action in hindsight is
 *
 *   R_T = Σ_{t≤T} f_t(x_t) − min_x Σ_{t≤T} f_t(x),
 *
 * and Zinkevich (2003) shows R_T = O(√T) for convex losses — so the average
 * regret R_T/T → 0: OGD is asymptotically as good as the best fixed decision.
 * A "lazy" learner that never updates suffers Θ(T) linear regret for contrast.
 */

const W = 520;
const H = 320;
const M = { top: 16, right: 16, bottom: 34, left: 46 };
const N = 200;

function simulate(c: number) {
  const rng = seededRandom(7);
  // stationary i.i.d. targets; absolute loss f_t(x) = |x − y_t| (the classic √T example)
  const y: number[] = [];
  for (let t = 1; t <= N; t++) y.push(gaussian(rng, 0, 1));

  // best fixed decision in hindsight for absolute loss is the median of y
  const xStar = [...y].sort((a, b) => a - b)[Math.floor(N / 2)];
  const xFixed = 2.5; // a fixed, poor decision that never adapts → linear regret

  let x = 0; // OGD iterate
  let lossOgd = 0;
  let lossFixed = 0;
  let comp = 0; // cumulative loss of the fixed hindsight-optimal x*

  const regretOgd: number[] = [];
  const regretLazy: number[] = [];

  for (let t = 1; t <= N; t++) {
    const yt = y[t - 1];
    lossOgd += Math.abs(x - yt);
    lossFixed += Math.abs(xFixed - yt);
    comp += Math.abs(xStar - yt);

    regretOgd.push(lossOgd - comp);
    regretLazy.push(lossFixed - comp);

    // OGD subgradient step with decaying step η_t = c/√t
    const eta = c / Math.sqrt(t);
    x = x - eta * Math.sign(x - yt);
  }
  return { regretOgd, regretLazy };
}

export function OnlineRegretViz({ className }: { className?: string }) {
  const [c, setC] = useState(1.0);
  const [T, setT] = useState(N);
  const [playing, setPlaying] = useState(false);
  const acc = useRef(0);

  const { regretOgd, regretLazy } = useMemo(() => simulate(c), [c]);

  useAnimationLoop((dt) => {
    const next = acc.current + dt * 60;
    const whole = Math.floor(next);
    acc.current = next - whole;
    if (whole > 0) {
      setT((prev) => {
        const nt = prev + whole;
        if (nt >= N) setPlaying(false);
        return Math.min(N, nt);
      });
    }
  }, playing);

  const yMax = Math.max(regretLazy[N - 1], 1) * 1.05;
  const px = (t: number) => M.left + (t / N) * (W - M.left - M.right);
  const py = (r: number) => M.top + (1 - r / yMax) * (H - M.top - M.bottom);

  // √T reference scaled to sit near the OGD curve's endpoint
  const sqrtScale = regretOgd[N - 1] / Math.sqrt(N);
  const pathFor = (arr: number[], upto: number) =>
    arr
      .slice(0, upto)
      .map((r, i) => `${i === 0 ? "M" : "L"}${px(i + 1).toFixed(1)},${py(r).toFixed(1)}`)
      .join(" ");
  const sqrtPath = Array.from({ length: T }, (_, i) => i + 1)
    .map((t, i) => `${i === 0 ? "M" : "L"}${px(t).toFixed(1)},${py(sqrtScale * Math.sqrt(t)).toFixed(1)}`)
    .join(" ");

  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  const start = () => {
    if (T >= N) setT(1);
    acc.current = 0;
    setPlaying(true);
  };

  const avgRegret = regretOgd[T - 1] / T;

  return (
    <VizFrame
      className={className}
      title="Online gradient descent: regret grows like √T"
      caption="Every round an adversary picks a convex loss |x−yₜ|; OGD takes a subgradient step with ηₜ = c/√t. Its cumulative regret (teal) tracks the √T reference (dashed) — sublinear — so average regret Rₜ/T → 0 and OGD matches the best fixed decision in hindsight (the median). A fixed guess that never adapts (rose) pays linear regret. Raise c to step harder: too small converges slowly, too large jitters — both lift the curve."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="online gradient descent regret curves">
        {/* axes */}
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        {yticks.map((r, i) => (
          <g key={i}>
            <line x1={M.left - 3} y1={py(r)} x2={W - M.right} y2={py(r)} stroke={VIZ.grid} strokeWidth={i === 0 ? 0 : 1} />
            <text x={M.left - 6} y={py(r) + 3} fill={VIZ.text} fontSize={9} textAnchor="end">
              {r.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={(W + M.left) / 2} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="middle">
          rounds T →
        </text>
        <text x={14} y={M.top + 4} fill={VIZ.text} fontSize={10}>
          cumulative regret Rₜ
        </text>

        {/* √T reference */}
        <path d={sqrtPath} fill="none" stroke={VIZ.textBright} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.6} />
        {/* lazy (linear) regret */}
        <path d={pathFor(regretLazy, T)} fill="none" stroke={VIZ.rose} strokeWidth={2} opacity={0.9} />
        {/* OGD regret */}
        <path d={pathFor(regretOgd, T)} fill="none" stroke={VIZ.teal} strokeWidth={2.2} />

        {/* endpoint markers */}
        <circle cx={px(T)} cy={py(regretOgd[T - 1])} r={4} fill={VIZ.teal} stroke="#0f1117" strokeWidth={1.2} />
        <circle cx={px(T)} cy={py(regretLazy[T - 1])} r={4} fill={VIZ.rose} stroke="#0f1117" strokeWidth={1.2} />

        {/* legend */}
        <g transform={`translate(${M.left + 12}, ${M.top + 10})`}>
          <rect width={10} height={3} y={4} fill={VIZ.teal} />
          <text x={16} y={8} fill={VIZ.text} fontSize={10}>OGD  (~√T)</text>
          <rect width={10} height={3} y={20} fill={VIZ.rose} />
          <text x={16} y={24} fill={VIZ.text} fontSize={10}>fixed guess  (~T)</text>
          <rect width={10} height={3} y={36} fill={VIZ.textBright} opacity={0.6} />
          <text x={16} y={40} fill={VIZ.text} fontSize={10}>√T guide</text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => (playing ? setPlaying(false) : start())} active={playing}>
          {playing ? "Pause" : T >= N ? "Replay" : "Play"}
        </VizButton>
        <VizButton
          onClick={() => {
            setPlaying(false);
            setT(N);
            acc.current = 0;
          }}
        >
          Reset
        </VizButton>
      </div>

      <div className="mt-3 mb-3">
        <VizSlider
          label="step-size scale c   (ηₜ = c/√t)"
          min={0.1}
          max={3}
          step={0.1}
          value={c}
          onChange={(v) => {
            setC(v);
            setT(N);
            setPlaying(false);
          }}
        />
        <div className="mt-3">
          <VizSlider
            label="horizon T"
            min={1}
            max={N}
            step={1}
            value={T}
            onChange={(v) => {
              setT(v);
              setPlaying(false);
            }}
            format={(v) => `${v} / ${N}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <VizStat label="OGD regret R_T" value={regretOgd[T - 1].toFixed(2)} color={VIZ.teal} />
        <VizStat label="fixed-guess R_T" value={regretLazy[T - 1].toFixed(2)} color={VIZ.rose} />
        <VizStat label="avg regret R_T/T" value={avgRegret.toFixed(4)} color={VIZ.brand} />
      </div>
    </VizFrame>
  );
}
