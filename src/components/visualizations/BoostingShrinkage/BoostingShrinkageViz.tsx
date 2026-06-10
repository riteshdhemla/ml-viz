"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * Gradient boosting with shrinkage on 1D data. Depth-1 regression stumps are
 * fit sequentially to residuals; each contributes η times its prediction.
 * Top panel: the staged fit vs the truth. Bottom panel: train/test error as
 * trees are added — small η needs more trees but generalizes better, large η
 * races to a low train error and overfits.
 */

const W = 480;
const FIT_H = 190;
const ERR_H = 130;
const GAP = 26;
const H = FIT_H + GAP + ERR_H;
const M = { left: 44, right: 12 };

const MAX_TREES = 100;
const GRID = 80;

const trueFn = (x: number) => Math.sin(2.4 * Math.PI * x);

const TRAIN = (() => {
  const rng = seededRandom(7);
  return Array.from({ length: 26 }, () => {
    const x = rng();
    return { x, y: trueFn(x) + gaussian(rng, 0, 0.35) };
  }).sort((a, b) => a.x - b.x);
})();

const TEST = (() => {
  const rng = seededRandom(99);
  return Array.from({ length: 80 }, () => {
    const x = rng();
    return { x, y: trueFn(x) + gaussian(rng, 0, 0.35) };
  });
})();

const GRID_X = Array.from({ length: GRID + 1 }, (_, i) => i / GRID);

type Stump = { thr: number; left: number; right: number };

function fitStump(residuals: number[]): Stump {
  let best: Stump = { thr: 0.5, left: 0, right: 0 };
  let bestSse = Infinity;
  for (let s = 1; s < TRAIN.length; s++) {
    const thr = (TRAIN[s - 1].x + TRAIN[s].x) / 2;
    let nl = 0, sl = 0, nr = 0, sr = 0;
    for (let i = 0; i < TRAIN.length; i++) {
      if (TRAIN[i].x < thr) { nl++; sl += residuals[i]; }
      else { nr++; sr += residuals[i]; }
    }
    if (nl === 0 || nr === 0) continue;
    const ml = sl / nl, mr = sr / nr;
    let sse = 0;
    for (let i = 0; i < TRAIN.length; i++) {
      const pred = TRAIN[i].x < thr ? ml : mr;
      sse += (residuals[i] - pred) ** 2;
    }
    if (sse < bestSse) { bestSse = sse; best = { thr, left: ml, right: mr }; }
  }
  return best;
}

/** Boost MAX_TREES stumps with shrinkage eta; return staged grid fits + errors. */
function boost(eta: number) {
  const trainPred = new Array(TRAIN.length).fill(0);
  const testPred = new Array(TEST.length).fill(0);
  const gridPred = new Array(GRID + 1).fill(0);
  const gridStages: number[][] = [];
  const trainErr: number[] = [];
  const testErr: number[] = [];

  for (let m = 0; m < MAX_TREES; m++) {
    const residuals = TRAIN.map((p, i) => p.y - trainPred[i]);
    const st = fitStump(residuals);
    for (let i = 0; i < TRAIN.length; i++) trainPred[i] += eta * (TRAIN[i].x < st.thr ? st.left : st.right);
    for (let i = 0; i < TEST.length; i++) testPred[i] += eta * (TEST[i].x < st.thr ? st.left : st.right);
    for (let i = 0; i <= GRID; i++) gridPred[i] += eta * (GRID_X[i] < st.thr ? st.left : st.right);
    gridStages.push([...gridPred]);
    trainErr.push(TRAIN.reduce((s, p, i) => s + (p.y - trainPred[i]) ** 2, 0) / TRAIN.length);
    testErr.push(TEST.reduce((s, p, i) => s + (p.y - testPred[i]) ** 2, 0) / TEST.length);
  }
  return { gridStages, trainErr, testErr };
}

export function BoostingShrinkageViz({ className }: { className?: string }) {
  const [eta, setEta] = useState(0.3);
  const [trees, setTrees] = useState(20);

  const { gridStages, trainErr, testErr } = useMemo(() => boost(eta), [eta]);

  const fit = gridStages[trees - 1];
  const bestTestM = testErr.indexOf(Math.min(...testErr)) + 1;

  // fit panel scales
  const fx = scale(0, 1, M.left, W - M.right);
  const fy = scale(-1.7, 1.7, FIT_H - 6, 8);
  // error panel scales
  const errMax = 0.8;
  const ex = scale(1, MAX_TREES, M.left, W - M.right);
  const ey = scale(0, errMax, H - 18, FIT_H + GAP + 4);

  const fitPath = (ys: number[]) => ys.map((y, i) => `${i === 0 ? "M" : "L"}${fx(GRID_X[i]).toFixed(1)},${fy(Math.max(-1.7, Math.min(1.7, y))).toFixed(1)}`).join(" ");
  const errPath = (errs: number[]) => errs.map((e, i) => `${i === 0 ? "M" : "L"}${ex(i + 1).toFixed(1)},${ey(Math.min(e, errMax)).toFixed(1)}`).join(" ");

  return (
    <VizFrame
      className={className}
      title="Shrinkage: many small steps beat few big ones"
      caption="Top: the boosted fit (teal) built from depth-1 stumps vs the truth (dashed). Bottom: train (indigo) and test (rose) error as trees are added — the dotted marker is the test-error minimum. Lower η with more trees reaches a better test minimum and overfits later; η = 1 races down the train curve and overfits early."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Boosting with shrinkage">
        {/* ---- fit panel ---- */}
        <line x1={M.left} y1={fy(0)} x2={W - M.right} y2={fy(0)} stroke={VIZ.grid} strokeWidth={1} />
        <path d={fitPath(GRID_X.map(trueFn))} fill="none" stroke={VIZ.text} strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={fitPath(fit)} fill="none" stroke={VIZ.teal} strokeWidth={2.5} />
        {TRAIN.map((p, i) => (
          <circle key={i} cx={fx(p.x)} cy={fy(Math.max(-1.7, Math.min(1.7, p.y)))} r={3} fill={VIZ.brandLight} opacity={0.7} />
        ))}
        <text x={W - M.right} y={FIT_H + 2} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>x</text>
        <text x={M.left + 4} y={16} fill={VIZ.text} fontSize={10} opacity={0.85}>y</text>

        {/* ---- error panel ---- */}
        <line x1={M.left} y1={H - 18} x2={W - M.right} y2={H - 18} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={FIT_H + GAP + 4} x2={M.left} y2={H - 18} stroke={VIZ.axis} strokeWidth={1} />
        {[0, 0.4, 0.8].map((t) => (
          <text key={t} x={M.left - 5} y={ey(t) + 3.5} fill={VIZ.text} fontSize={9} textAnchor="end">{t}</text>
        ))}
        {[1, 25, 50, 75, 100].map((t) => (
          <text key={t} x={ex(t)} y={H - 6} fill={VIZ.text} fontSize={9} textAnchor="middle">{t}</text>
        ))}
        <text x={14} y={(FIT_H + GAP + H - 18) / 2} fill={VIZ.text} fontSize={10} textAnchor="middle" transform={`rotate(-90 14 ${(FIT_H + GAP + H - 18) / 2})`}>MSE</text>

        <path d={errPath(trainErr)} fill="none" stroke={VIZ.brand} strokeWidth={2} />
        <path d={errPath(testErr)} fill="none" stroke={VIZ.rose} strokeWidth={2} />

        {/* best-test marker + current trees marker */}
        <line x1={ex(bestTestM)} y1={FIT_H + GAP + 4} x2={ex(bestTestM)} y2={H - 18} stroke={VIZ.rose} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
        <line x1={ex(trees)} y1={FIT_H + GAP + 4} x2={ex(trees)} y2={H - 18} stroke={VIZ.textBright} strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
        <circle cx={ex(trees)} cy={ey(Math.min(trainErr[trees - 1], errMax))} r={3.5} fill={VIZ.brand} stroke="#0f1117" strokeWidth={1} />
        <circle cx={ex(trees)} cy={ey(Math.min(testErr[trees - 1], errMax))} r={3.5} fill={VIZ.rose} stroke="#0f1117" strokeWidth={1} />
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-slate-400">
        <span><span style={{ color: VIZ.teal }}>—</span> boosted fit</span>
        <span><span style={{ color: VIZ.text }}>- -</span> true function</span>
        <span><span style={{ color: VIZ.brand }}>—</span> train MSE</span>
        <span><span style={{ color: VIZ.rose }}>—</span> test MSE</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
        <VizSlider label="η (shrinkage)" min={0.05} max={1} step={0.05} value={eta} onChange={setEta} format={(v) => v.toFixed(2)} />
        <VizSlider label="trees" min={1} max={MAX_TREES} step={1} value={trees} onChange={setTrees} format={(v) => String(v)} />
      </div>

      <div className="flex gap-6 flex-wrap">
        <VizStat label="train MSE" value={trainErr[trees - 1].toFixed(3)} color={VIZ.brand} />
        <VizStat label="test MSE" value={testErr[trees - 1].toFixed(3)} color={VIZ.rose} />
        <VizStat label="best test @" value={`${bestTestM} trees`} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
