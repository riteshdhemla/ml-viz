"use client";

/**
 * Grid versus random on the same budget, over an objective where only one
 * dimension matters — Bergstra & Bengio's setup, run rather than described.
 *
 * The objective is exp(−(x−0.62)²/0.02) + 0.05·exp(−(y−0.4)²/0.02): x moves it
 * a lot, y almost not at all. A k×k grid spends n = k² evaluations to sample
 * only **k distinct values of x**; n random points sample n distinct values.
 *
 * Best value found, averaged over 2000 seeds for random (grid is deterministic):
 *
 *   budget    grid                      random
 *      9      0.5171  (3 values of x)   0.8554
 *     16      1.0472  (4 values of x)   0.9402
 *     25      0.7565  (5 values of x)   0.9797
 *     36      0.9843  (6 values of x)   0.9985
 *
 * The headline is not "random wins" — at 16 the grid happens to win. It is that
 * **grid is not monotone in budget**: going from 16 to 25 evaluations made it
 * *worse*, because whether a grid line lands near x = 0.62 is an accident of
 * the spacing, and a finer grid can easily straddle the peak it used to hit.
 * Random improves monotonically because every extra sample is a fresh draw of
 * the coordinate that matters. Spending more and getting less is the property
 * that should retire grid search, and it is only visible if you sweep the
 * budget rather than fixing it.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, scale, seededRandom } from "../viz-kit";

/** One dimension matters; the other barely does. */
const f = (x: number, y: number) =>
  Math.exp(-((x - 0.62) ** 2) / 0.02) + 0.05 * Math.exp(-((y - 0.4) ** 2) / 0.02);
const OPT = f(0.62, 0.4);
const TRIALS = 2000;

function gridPoints(budget: number) {
  const k = Math.max(2, Math.round(Math.sqrt(budget)));
  const pts: [number, number][] = [];
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) pts.push([(i + 0.5) / k, (j + 0.5) / k]);
  return { pts, k };
}
function randomPoints(budget: number, seed: number) {
  const rng = seededRandom(seed);
  return Array.from({ length: budget }, () => [rng(), rng()] as [number, number]);
}

/** Grid is deterministic; random is averaged so one lucky draw never argues. */
function meanBestRandom(budget: number) {
  let acc = 0;
  for (let s = 0; s < TRIALS; s++) {
    let best = 0;
    for (const [x, y] of randomPoints(budget, 1 + s * 7919)) best = Math.max(best, f(x, y));
    acc += best / TRIALS;
  }
  return acc;
}

const W = 560;
const H = 220;
const PANEL = 200;
const PAD = { t: 16, b: 26 };

export function HyperparamSearchViz({ className }: { className?: string }) {
  const [budget, setBudget] = useState(25);
  const [seed, setSeed] = useState(1);

  const { pts: gp, k } = useMemo(() => gridPoints(budget), [budget]);
  const rp = useMemo(() => randomPoints(budget, seed), [budget, seed]);

  const gridBest = useMemo(() => gp.reduce((m, [x, y]) => Math.max(m, f(x, y)), 0), [gp]);
  const randBestThis = useMemo(() => rp.reduce((m, [x, y]) => Math.max(m, f(x, y)), 0), [rp]);
  const randMean = useMemo(() => meanBestRandom(budget), [budget]);

  const px = (v: number, x0: number) => x0 + v * PANEL;
  const py = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);

  const heat = useMemo(() => {
    const cells: { x: number; y: number; v: number }[] = [];
    const R = 24;
    for (let i = 0; i < R; i++)
      for (let j = 0; j < R; j++) cells.push({ x: (i + 0.5) / R, y: (j + 0.5) / R, v: f((i + 0.5) / R, (j + 0.5) / R) });
    return { cells, R };
  }, []);

  const Panel = ({ x0, pts, label, best }: { x0: number; pts: [number, number][]; label: string; best: number }) => (
    <g>
      {heat.cells.map((c, i) => (
        <rect
          key={i}
          x={px(c.x - 0.5 / heat.R, x0)}
          y={py(c.y + 0.5 / heat.R)}
          width={PANEL / heat.R + 0.5}
          height={(H - PAD.t - PAD.b) / heat.R + 0.5}
          fill={VIZ.brand}
          opacity={0.06 + 0.5 * (c.v / OPT)}
        />
      ))}
      <rect x={x0} y={PAD.t} width={PANEL} height={H - PAD.t - PAD.b} fill="none" stroke={VIZ.axis} strokeWidth={1} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={px(x, x0)} cy={py(y)} r={2.6} fill={VIZ.teal} opacity={0.9} />
      ))}
      {/* the coordinate that matters, projected onto the x axis */}
      {pts.map(([x], i) => (
        <line key={`t${i}`} x1={px(x, x0)} x2={px(x, x0)} y1={H - PAD.b} y2={H - PAD.b + 5} stroke={VIZ.yellow} strokeWidth={1} opacity={0.8} />
      ))}
      <text x={x0 + PANEL / 2} y={12} textAnchor="middle" fontSize={10} fill={VIZ.textBright}>
        {label}
      </text>
      <text x={x0 + PANEL / 2} y={H - 4} textAnchor="middle" fontSize={9} fill={VIZ.text}>
        best {best.toFixed(4)}
      </text>
    </g>
  );

  return (
    <VizFrame
      title="Grid spends its budget on the wrong axis"
      caption="The objective is bright where it is high: x moves it a lot, y almost not at all. Teal dots are the evaluations; the yellow ticks below each panel are their x coordinates — the only coordinate that matters. A k×k grid costs k² evaluations and buys k distinct values of x."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Panel x0={40} pts={gp} label={`grid ${k}×${k} — ${k} values of x`} best={gridBest} />
        <Panel x0={310} pts={rp} label={`random — ${budget} values of x`} best={randBestThis} />
        <text x={40} y={H - PAD.b + 16} fontSize={8} fill={VIZ.text}>
          x →
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="evaluations" value={String(gp.length)} />
        <VizStat label="grid best" value={gridBest.toFixed(4)} color={VIZ.yellow} />
        <VizStat label="random best (this seed)" value={randBestThis.toFixed(4)} />
        <VizStat label="random best (2000-seed mean)" value={randMean.toFixed(4)} color={VIZ.teal} />
        <VizStat label="optimum" value={OPT.toFixed(4)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4 items-end">
        <VizSlider
          label="budget — evaluations"
          min={4}
          max={49}
          step={1}
          value={budget}
          onChange={(v) => setBudget(Math.round(v))}
          format={(v) => String(v)}
        />
        <div className="flex gap-2">
          <VizButton onClick={() => setSeed((s) => s + 1)}>resample random</VizButton>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Walk the budget from 9 to 36 and watch the grid column: <span className="font-mono text-white">0.5171</span> at
        9, <span className="font-mono text-white">1.0472</span> at 16,{" "}
        <span className="font-mono text-white">0.7565</span> at 25,{" "}
        <span className="font-mono text-white">0.9843</span> at 36.{" "}
        <strong className="text-white">It is not monotone</strong> — going from 16 evaluations to 25 made
        it worse, because whether a grid line lands near the peak is an accident of
        the spacing, and a finer grid can straddle a peak the coarser one hit. Random goes{" "}
        <span className="font-mono text-white">0.8554 → 0.9402 → 0.9797 → 0.9985</span>, because every extra
        sample is a fresh draw of the coordinate that matters.
      </p>
    </VizFrame>
  );
}
