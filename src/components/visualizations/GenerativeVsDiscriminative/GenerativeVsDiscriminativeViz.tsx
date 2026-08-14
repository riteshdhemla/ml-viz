"use client";

/**
 * The same points, fitted both ways — and the two things only the generative
 * model can do.
 *
 * Both models are fitted live: a logistic regression by gradient descent, and
 * class-conditional isotropic Gaussians (GDA) in closed form. On this data they
 * draw almost the same boundary, which is the point — the difference is not the
 * decision, it is what else the model knows.
 *
 * **1. Data efficiency.** Test error on 4000 held-out points, by training size:
 *
 *      n:      8      16     30     60    150    400   1500
 *      logreg  4.05%  2.80%  2.65%  1.85%  2.02%  1.82%  1.88%
 *      GDA     2.08%  1.93%  2.00%  2.02%  1.88%  1.90%  1.95%
 *
 * With 8 labels the generative model is nearly twice as accurate; by 60 they
 * have converged. That is Ng & Jordan's result: modelling p(x,y) imposes
 * structure that substitutes for data, and stops helping once there is enough.
 *
 * **2. Knowing when it does not know.** A discriminative model reports which
 * side of a line you are on and nothing else. At x = (4.5, 3.2) the logistic
 * regression says P(class 1) = 1.0000 while the generative model reports
 * p(x) ~ 1e-8 (2.37e-8 at n = 16, 6.2e-8 at n = 400); at (−6, 5) it is
 * P = 0.0000 against p(x) ~ 1e-24. Both
 * "confident" answers are about a region the model has never seen. Only the
 * model that learned p(x) can say so.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

const MU = [
  [-1.3, -0.7],
  [1.4, 0.8],
];
const SD = 0.75;
const TEST_N = 4000;

function makeData(n: number, seed: number) {
  const rng = seededRandom(seed);
  const X: number[][] = [];
  const Y: number[] = [];
  for (let i = 0; i < n; i++) {
    const y = i % 2;
    X.push([gaussian(rng, MU[y][0], SD), gaussian(rng, MU[y][1], SD)]);
    Y.push(y);
  }
  return { X, Y };
}

const TEST = makeData(TEST_N, 999);

function fitLogistic(X: number[][], Y: number[]) {
  const w = [0, 0];
  let b = 0;
  for (let t = 0; t < 600; t++) {
    const gw = [0, 0];
    let gb = 0;
    for (let i = 0; i < X.length; i++) {
      const z = w[0] * X[i][0] + w[1] * X[i][1] + b;
      const e = 1 / (1 + Math.exp(-z)) - Y[i];
      gw[0] += (e * X[i][0]) / X.length;
      gw[1] += (e * X[i][1]) / X.length;
      gb += e / X.length;
    }
    w[0] -= 0.6 * gw[0];
    w[1] -= 0.6 * gw[1];
    b -= 0.6 * gb;
  }
  return { w, b };
}

/** Class-conditional isotropic Gaussians — closed form, no iteration. */
function fitGaussians(X: number[][], Y: number[]) {
  const mu = [
    [0, 0],
    [0, 0],
  ];
  const cnt = [0, 0];
  X.forEach((x, i) => {
    mu[Y[i]][0] += x[0];
    mu[Y[i]][1] += x[1];
    cnt[Y[i]]++;
  });
  for (const k of [0, 1]) {
    mu[k][0] /= Math.max(1, cnt[k]);
    mu[k][1] /= Math.max(1, cnt[k]);
  }
  let s2 = 0;
  X.forEach((x, i) => {
    s2 += ((x[0] - mu[Y[i]][0]) ** 2 + (x[1] - mu[Y[i]][1]) ** 2) / 2;
  });
  s2 = Math.max(0.05, s2 / Math.max(1, X.length));
  return { mu, s2, prior: [cnt[0] / X.length, cnt[1] / X.length] };
}

type G = ReturnType<typeof fitGaussians>;
function logPx(g: G, x: number[]) {
  const t = [0, 1].map(
    (k) =>
      Math.log(Math.max(1e-9, g.prior[k])) -
      ((x[0] - g.mu[k][0]) ** 2 + (x[1] - g.mu[k][1]) ** 2) / (2 * g.s2) -
      Math.log(2 * Math.PI * g.s2)
  );
  const m = Math.max(...t);
  return m + Math.log(t.reduce((a, v) => a + Math.exp(v - m), 0));
}

const W = 560;
const H = 280;
const PAD = { l: 40, r: 200, t: 14, b: 30 };
const LO = -6.5;
const HI = 6.5;
const sx = scale(LO, HI, PAD.l, W - PAD.r);
const sy = scale(LO, HI, H - PAD.b, PAD.t);

export function GenerativeVsDiscriminativeViz({ className }: { className?: string }) {
  const [n, setN] = useState(16);
  const [probe, setProbe] = useState<[number, number]>([4.5, 3.2]);

  const model = useMemo(() => {
    const { X, Y } = makeData(n, 3);
    const lr = fitLogistic(X, Y);
    const g = fitGaussians(X, Y);
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < TEST_N; i++) {
      const x = TEST.X[i];
      const z = lr.w[0] * x[0] + lr.w[1] * x[1] + lr.b;
      if ((z > 0 ? 1 : 0) !== TEST.Y[i]) e1++;
      const d0 = (x[0] - g.mu[0][0]) ** 2 + (x[1] - g.mu[0][1]) ** 2;
      const d1 = (x[0] - g.mu[1][0]) ** 2 + (x[1] - g.mu[1][1]) ** 2;
      if ((d1 < d0 ? 1 : 0) !== TEST.Y[i]) e2++;
    }
    return { X, Y, lr, g, errLr: e1 / TEST_N, errG: e2 / TEST_N };
  }, [n]);

  const { lr, g } = model;
  const zProbe = lr.w[0] * probe[0] + lr.w[1] * probe[1] + lr.b;
  const pProbe = 1 / (1 + Math.exp(-zProbe));
  const px = Math.exp(logPx(g, probe));

  // the logistic boundary as a segment across the frame
  const boundary = (() => {
    const [a, bb] = lr.w;
    if (Math.abs(bb) < 1e-6) return null;
    const yAt = (x: number) => (-lr.b - a * x) / bb;
    return { x1: LO, y1: yAt(LO), x2: HI, y2: yAt(HI) };
  })();

  return (
    <VizFrame
      title="Same points, two things to learn"
      caption="Both models are fitted live on the sampled points: a logistic regression by gradient descent (dashed boundary) and class-conditional Gaussians in closed form (rings at 1 and 2 standard deviations). Test error is measured on 4000 held-out points. Move the probe to see what each model says about a point it was never shown."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          {/* the fitted boundary is an infinite line; keep it inside the frame */}
          <clipPath id="gvd-plot">
            <rect x={PAD.l} y={PAD.t} width={W - PAD.r - PAD.l} height={H - PAD.b - PAD.t} />
          </clipPath>
        </defs>
        <rect x={PAD.l} y={PAD.t} width={W - PAD.r - PAD.l} height={H - PAD.b - PAD.t} fill="#171a24" />
        {[-4, -2, 0, 2, 4].map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.grid} strokeWidth={1} />
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke={VIZ.grid} strokeWidth={1} />
          </g>
        ))}

        <g clipPath="url(#gvd-plot)">
        {/* generative: the density it learned */}
        {[0, 1].map((k) =>
          [1, 2].map((r) => (
            <circle
              key={`${k}-${r}`}
              cx={sx(g.mu[k][0])}
              cy={sy(g.mu[k][1])}
              r={(r * Math.sqrt(g.s2) * (sx(1) - sx(0)))}
              fill="none"
              stroke={k === 0 ? VIZ.brand : VIZ.orange}
              strokeWidth={1.2}
              opacity={0.75}
            />
          ))
        )}

        {model.X.map((p, i) => (
          <circle
            key={i}
            cx={sx(p[0])}
            cy={sy(p[1])}
            r={2.6}
            fill={model.Y[i] === 0 ? VIZ.brand : VIZ.orange}
            opacity={0.85}
          />
        ))}

        {/* discriminative: a line, and nothing else */}
        {boundary && (
          <line
            x1={sx(boundary.x1)}
            y1={sy(boundary.y1)}
            x2={sx(boundary.x2)}
            y2={sy(boundary.y2)}
            stroke={VIZ.textBright}
            strokeWidth={1.8}
            strokeDasharray="5 3"
          />
        )}

        </g>
        <circle cx={sx(probe[0])} cy={sy(probe[1])} r={6} fill={VIZ.teal} stroke={VIZ.card} strokeWidth={1.5} />
        <text x={sx(probe[0]) + 9} y={sy(probe[1]) + 3} fontSize={9} fill={VIZ.teal} stroke={VIZ.card} strokeWidth={2.5} paintOrder="stroke">
          probe
        </text>

        {/* verdict panel */}
        <g transform={`translate(${W - PAD.r + 16}, ${PAD.t + 12})`}>
          <text x={0} y={0} fontSize={10} fill={VIZ.textBright}>
            discriminative
          </text>
          <text x={0} y={16} fontSize={9} fill={VIZ.text}>
            P(orange) = {pProbe.toFixed(4)}
          </text>
          <text x={0} y={30} fontSize={9} fill={pProbe > 0.99 || pProbe < 0.01 ? VIZ.rose : VIZ.text}>
            {pProbe > 0.99 || pProbe < 0.01 ? "totally certain" : "undecided"}
          </text>

          <text x={0} y={62} fontSize={10} fill={VIZ.textBright}>
            generative
          </text>
          <text x={0} y={78} fontSize={9} fill={VIZ.text}>
            p(x) = {px.toExponential(2)}
          </text>
          <text x={0} y={92} fontSize={9} fill={px < 1e-4 ? VIZ.rose : VIZ.teal}>
            {px < 1e-4 ? "never seen anything like this" : "inside the data"}
          </text>

          <text x={0} y={124} fontSize={9} fill={VIZ.text}>
            test error, {TEST_N} points
          </text>
          <text x={0} y={139} fontSize={10} fill={VIZ.textBright}>
            logistic {(model.errLr * 100).toFixed(2)}%
          </text>
          <text x={0} y={154} fontSize={10} fill={VIZ.teal}>
            generative {(model.errG * 100).toFixed(2)}%
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-2 mt-2">
        <VizButton active={probe[0] === 0 && probe[1] === 0} onClick={() => setProbe([0, 0])}>
          between the classes
        </VizButton>
        <VizButton active={probe[0] === 4.5} onClick={() => setProbe([4.5, 3.2])}>
          off the edge
        </VizButton>
        <VizButton active={probe[0] === -6} onClick={() => setProbe([-6, 5])}>
          far outside
        </VizButton>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        <VizStat label="training points" value={String(n)} />
        <VizStat label="logistic test error" value={`${(model.errLr * 100).toFixed(2)}%`} />
        <VizStat label="generative test error" value={`${(model.errG * 100).toFixed(2)}%`} color={VIZ.teal} />
        <VizStat
          label="generative advantage"
          value={`${((model.errLr - model.errG) * 100).toFixed(2)} pts`}
          color={model.errLr - model.errG > 0.005 ? VIZ.teal : VIZ.text}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <VizSlider label="training points" min={8} max={400} step={2} value={n} onChange={(v) => setN(Math.round(v))} format={(v) => String(v)} />
        <VizSlider label="probe x" min={-6.5} max={6.5} step={0.1} value={probe[0]} onChange={(v) => setProbe([v, probe[1]])} format={(v) => v.toFixed(1)} />
        <VizSlider label="probe y" min={-6.5} max={6.5} step={0.1} value={probe[1]} onChange={(v) => setProbe([probe[0], v])} format={(v) => v.toFixed(1)} />
      </div>
    </VizFrame>
  );
}
