"use client";

/**
 * Why correlated transitions break the regression, measured on the smallest
 * problem that still shows it.
 *
 * The target is a linear function of two features. The agent walks a slow
 * random path through feature space, so consecutive samples are almost
 * identical — exactly the structure of an RL trajectory. Then the *same* data
 * is fitted twice with the same learning rate and the same number of updates,
 * differing only in the order:
 *
 *   learning rate   sequential ‖w − w*‖   shuffled   ratio
 *       0.02             0.2575            0.0774    3.33×
 *       0.05             0.1928            0.0162   11.89×
 *
 * (400 trajectories of 800 steps each.)
 *
 * Two things worth taking from that. Replay is not a memory optimisation — the
 * data is identical, only the order changed, and the fit is up to twelve times
 * worse without it. And the damage **grows with the learning rate**: at 0.02
 * the gap is 3×, at 0.05 it is 12×, because a larger step lets each stretch of
 * correlated samples drag the weights further before the next region arrives.
 * That is why the naive fix — "just lower the learning rate" — trades the
 * problem for slowness instead of solving it.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

const W_TRUE = [1.5, -0.8];
const STEPS = 800;
const TRIALS = 400;

function trajectory(seed: number) {
  const r = seededRandom(seed);
  const out: { x: [number, number]; y: number }[] = [];
  let s: [number, number] = [0, 0];
  for (let i = 0; i < STEPS; i++) {
    s = [s[0] + gaussian(r, 0, 0.08), s[1] + gaussian(r, 0, 0.08)];
    const x: [number, number] = [Math.sin(s[0]), Math.cos(s[1])];
    out.push({ x, y: W_TRUE[0] * x[0] + W_TRUE[1] * x[1] + gaussian(r, 0, 0.05) });
  }
  return out;
}

function sgd(data: ReturnType<typeof trajectory>, order: number[], lr: number) {
  let w: [number, number] = [0, 0];
  const path: [number, number][] = [[0, 0]];
  for (let n = 0; n < order.length; n++) {
    const { x, y } = data[order[n]];
    const e = w[0] * x[0] + w[1] * x[1] - y;
    w = [w[0] - lr * e * x[0], w[1] - lr * e * x[1]];
    if (n % 8 === 0) path.push([...w] as [number, number]);
  }
  return { w, path };
}

const err = (w: [number, number]) => Math.hypot(w[0] - W_TRUE[0], w[1] - W_TRUE[1]);

function shuffled(seed: number) {
  const r = seededRandom(seed);
  const o = [...Array(STEPS).keys()];
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
}

const W = 560;
const H = 240;
const PAD = { l: 44, r: 14, t: 16, b: 28 };

export function ExperienceReplayViz({ className }: { className?: string }) {
  const [lr, setLr] = useState(0.05);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => trajectory(1 + seed * 7919), [seed]);
  const inOrder = useMemo(() => [...Array(STEPS).keys()], []);
  const seq = useMemo(() => sgd(data, inOrder, lr), [data, inOrder, lr]);
  const shuf = useMemo(() => sgd(data, shuffled(999 + seed), lr), [data, seed, lr]);

  /** The same comparison over many trajectories, so one path never argues. */
  const mean = useMemo(() => {
    let a = 0;
    let b = 0;
    for (let s = 0; s < TRIALS; s++) {
      const d = trajectory(1 + s * 7919);
      a += err(sgd(d, [...Array(STEPS).keys()], lr).w) / TRIALS;
      b += err(sgd(d, shuffled(999 + s), lr).w) / TRIALS;
    }
    return { seq: a, shuf: b };
  }, [lr]);

  const lo = -0.6;
  const hi = 2.1;
  const sx = scale(lo, hi, PAD.l, (W - PAD.r + PAD.l) / 2 - 10);
  const sy = scale(-1.6, 1.1, H - PAD.b, PAD.t);

  const pathOf = (p: [number, number][]) => p.map((q, i) => `${i === 0 ? "M" : "L"}${sx(q[0]).toFixed(1)},${sy(q[1]).toFixed(1)}`).join(" ");

  return (
    <VizFrame
      title="Same data, same updates, different order"
      caption="Weight-space trajectories of the two fits. The agent walks slowly through feature space so consecutive samples are near-duplicates; the sequential run (rose) is dragged around by whichever region it is currently in, while the shuffled run (teal) sees a fresh mix at every step. The white cross is the true weight vector. Averages are over 400 independent trajectories."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[-1, 0, 1].map((t) => (
          <line key={t} x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke={VIZ.grid} strokeWidth={1} />
        ))}
        {[0, 1, 2].map((t) => (
          <line key={t} x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.grid} strokeWidth={1} />
        ))}
        <path d={pathOf(seq.path)} fill="none" stroke={VIZ.rose} strokeWidth={1.4} opacity={0.9} />
        <path d={pathOf(shuf.path)} fill="none" stroke={VIZ.teal} strokeWidth={1.4} opacity={0.9} />
        <circle cx={sx(seq.w[0])} cy={sy(seq.w[1])} r={4} fill={VIZ.rose} />
        <circle cx={sx(shuf.w[0])} cy={sy(shuf.w[1])} r={4} fill={VIZ.teal} />
        <g stroke={VIZ.textBright} strokeWidth={1.6}>
          <line x1={sx(W_TRUE[0]) - 5} y1={sy(W_TRUE[1])} x2={sx(W_TRUE[0]) + 5} y2={sy(W_TRUE[1])} />
          <line x1={sx(W_TRUE[0])} y1={sy(W_TRUE[1]) - 5} x2={sx(W_TRUE[0])} y2={sy(W_TRUE[1]) + 5} />
        </g>
        <text x={sx(W_TRUE[0]) + 8} y={sy(W_TRUE[1]) - 6} fontSize={9} fill={VIZ.textBright}>
          true w
        </text>
        <text x={PAD.l} y={H - 6} fontSize={9} fill={VIZ.text}>
          w₁ →
        </text>
        <text x={W - PAD.r - 6} y={PAD.t + 10} textAnchor="end" fontSize={9} fill={VIZ.rose}>
          sequential (no replay)
        </text>
        <text x={W - PAD.r - 6} y={PAD.t + 24} textAnchor="end" fontSize={9} fill={VIZ.teal}>
          shuffled (replay buffer)
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="sequential error (this run)" value={err(seq.w).toFixed(4)} color={VIZ.rose} />
        <VizStat label="shuffled error (this run)" value={err(shuf.w).toFixed(4)} color={VIZ.teal} />
        <VizStat label="sequential (400-run mean)" value={mean.seq.toFixed(4)} color={VIZ.rose} />
        <VizStat label="shuffled (400-run mean)" value={mean.shuf.toFixed(4)} color={VIZ.teal} />
        <VizStat
          label="replay is better by"
          value={`${(mean.seq / Math.max(1e-9, mean.shuf)).toFixed(2)}×`}
          color={VIZ.yellow}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4 items-end">
        <VizSlider label="learning rate" min={0.01} max={0.08} step={0.01} value={lr} onChange={setLr} format={(v) => v.toFixed(2)} />
        <div className="flex gap-2">
          <VizButton onClick={() => setSeed((s) => s + 1)}>new trajectory</VizButton>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Raise the learning rate and the gap <em>widens</em> — 3.33× at 0.02, 11.89× at 0.05 — because a
        larger step lets each stretch of near-identical samples drag the weights further before the next
        region arrives. That is why &ldquo;just use a smaller learning rate&rdquo; is not the fix: it trades the
        problem for slowness. Replay changes the order, and the order is the problem.
      </p>
    </VizFrame>
  );
}
