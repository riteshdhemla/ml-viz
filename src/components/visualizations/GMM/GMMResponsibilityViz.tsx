"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * GMMResponsibilityViz — Gaussian Mixture Model with EM algorithm.
 *
 * Shows:
 * - 2D point cloud (~40 points from 3 Gaussian clusters)
 * - Points colored by soft responsibilities (blended RGB from component colors)
 * - Ellipses showing component covariances
 * - Step button runs precomputed E/M step snapshots
 * - Log-likelihood VizStat increasing monotonically after each M-step
 */

const W = 480;
const H = 340;
const M = { top: 20, right: 20, bottom: 20, left: 20 };
const DOM: [number, number] = [0, 10];
const K = 3;
const N_ITERS = 8;

// Component colors: brand (indigo), teal, orange
const COMP_COLORS: [number, number, number][] = [
  [99, 102, 241],   // brand #6366f1
  [20, 184, 166],   // teal  #14b8a6
  [249, 115, 22],   // orange #f97316
];

type Point = { x: number; y: number };

type GMMParams = {
  means: Point[];
  covs: [number, number, number][];  // [sxx, syy, sxy] per component
  weights: number[];
};

type Snapshot = {
  params: GMMParams;
  responsibilities: number[][];  // [n_points x K]
  logLikelihood: number;
  step: "E" | "M" | "init";
};

// Multivariate Gaussian PDF for 2D with covariance [sxx, syy, sxy]
function mvnPdf(x: number, y: number, mx: number, my: number, sxx: number, syy: number, sxy: number): number {
  const det = sxx * syy - sxy * sxy;
  if (det <= 0) return 1e-300;
  const dx = x - mx;
  const dy = y - my;
  const invSxx = syy / det;
  const invSyy = sxx / det;
  const invSxy = -sxy / det;
  const exponent = -0.5 * (dx * dx * invSxx + dy * dy * invSyy + 2 * dx * dy * invSxy);
  return Math.exp(exponent) / (2 * Math.PI * Math.sqrt(det));
}

function computeLogLikelihood(points: Point[], params: GMMParams): number {
  let ll = 0;
  for (const pt of points) {
    let sum = 0;
    for (let k = 0; k < K; k++) {
      const { means, covs, weights } = params;
      sum += weights[k] * mvnPdf(pt.x, pt.y, means[k].x, means[k].y, covs[k][0], covs[k][1], covs[k][2]);
    }
    ll += Math.log(Math.max(sum, 1e-300));
  }
  return ll;
}

function eStep(points: Point[], params: GMMParams): number[][] {
  const n = points.length;
  const resps: number[][] = Array.from({ length: n }, () => new Array(K).fill(0));
  for (let i = 0; i < n; i++) {
    const pt = points[i];
    let rowSum = 0;
    for (let k = 0; k < K; k++) {
      const { means, covs, weights } = params;
      const val = weights[k] * mvnPdf(pt.x, pt.y, means[k].x, means[k].y, covs[k][0], covs[k][1], covs[k][2]);
      resps[i][k] = val;
      rowSum += val;
    }
    for (let k = 0; k < K; k++) {
      resps[i][k] = rowSum > 1e-300 ? resps[i][k] / rowSum : 1 / K;
    }
  }
  return resps;
}

function mStep(points: Point[], responsibilities: number[][]): GMMParams {
  const n = points.length;
  const nk = new Array(K).fill(0);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < K; k++) {
      nk[k] += responsibilities[i][k];
    }
  }

  const means: Point[] = Array.from({ length: K }, () => ({ x: 0, y: 0 }));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < K; k++) {
      means[k].x += responsibilities[i][k] * points[i].x;
      means[k].y += responsibilities[i][k] * points[i].y;
    }
  }
  for (let k = 0; k < K; k++) {
    means[k].x /= nk[k];
    means[k].y /= nk[k];
  }

  // Covariance [sxx, syy, sxy]
  const covs: [number, number, number][] = Array.from({ length: K }, () => [0, 0, 0]);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < K; k++) {
      const dx = points[i].x - means[k].x;
      const dy = points[i].y - means[k].y;
      covs[k][0] += responsibilities[i][k] * dx * dx;
      covs[k][1] += responsibilities[i][k] * dy * dy;
      covs[k][2] += responsibilities[i][k] * dx * dy;
    }
  }
  for (let k = 0; k < K; k++) {
    const reg = 0.05; // regularization to avoid singular covariances
    covs[k][0] = covs[k][0] / nk[k] + reg;
    covs[k][1] = covs[k][1] / nk[k] + reg;
    covs[k][2] = covs[k][2] / nk[k];
  }

  const weights = nk.map((nki) => nki / n);
  return { means, covs, weights };
}

// Compute the 2σ ellipse parameters from a [sxx, syy, sxy] covariance
// Returns { cx, cy, rx, ry, angle } for SVG ellipse rendering
function ellipseFromCov(mx: number, my: number, sxx: number, syy: number, sxy: number) {
  // Eigendecomposition of 2x2 symmetric matrix
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const lam1 = trace / 2 + disc;
  const lam2 = trace / 2 - disc;
  // Eigenvector for lam1
  let angle: number;
  if (Math.abs(sxy) < 1e-10) {
    angle = sxx >= syy ? 0 : Math.PI / 2;
  } else {
    angle = Math.atan2(lam1 - sxx, sxy);
  }
  // 2-sigma radii
  return {
    mx,
    my,
    rx: 2 * Math.sqrt(Math.max(0, lam1)),
    ry: 2 * Math.sqrt(Math.max(0, lam2)),
    angle,
  };
}

function blendColor(responsibilities: number[]): string {
  let r = 0, g = 0, b = 0;
  for (let k = 0; k < K; k++) {
    r += responsibilities[k] * COMP_COLORS[k][0];
    g += responsibilities[k] * COMP_COLORS[k][1];
    b += responsibilities[k] * COMP_COLORS[k][2];
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function buildSnapshots(points: Point[]): Snapshot[] {
  const snaps: Snapshot[] = [];

  // Initial params: centers spread across the space with identity covariances
  const initMeans: Point[] = [
    { x: 2.5, y: 7.5 },
    { x: 7.5, y: 7.0 },
    { x: 5.0, y: 2.5 },
  ];
  const initCovs: [number, number, number][] = [
    [2.0, 2.0, 0],
    [2.0, 2.0, 0],
    [2.0, 2.0, 0],
  ];
  const initWeights = [1 / K, 1 / K, 1 / K];
  let params: GMMParams = { means: initMeans, covs: initCovs, weights: initWeights };

  // Initial E-step snapshot
  const initResps = eStep(points, params);
  snaps.push({
    params,
    responsibilities: initResps,
    logLikelihood: computeLogLikelihood(points, params),
    step: "init",
  });

  // Run N_ITERS EM iterations (each adds an M-step snapshot)
  let resps = initResps;
  for (let iter = 0; iter < N_ITERS; iter++) {
    params = mStep(points, resps);
    resps = eStep(points, params);
    snaps.push({
      params,
      responsibilities: resps,
      logLikelihood: computeLogLikelihood(points, params),
      step: iter === 0 ? "M" : "M",
    });
  }

  return snaps;
}

function makePoints(): Point[] {
  const rng = seededRandom(17);
  const trueCenters = [
    { x: 2.5, y: 7.2, sx: 0.9, sy: 0.7 },
    { x: 7.2, y: 6.8, sx: 0.8, sy: 1.1 },
    { x: 5.0, y: 2.2, sx: 1.2, sy: 0.6 },
  ];
  const pts: Point[] = [];
  // ~13-14 points per cluster → ~40 total
  for (const c of trueCenters) {
    for (let i = 0; i < 13; i++) {
      pts.push({
        x: Math.max(0.2, Math.min(9.8, gaussian(rng, c.x, c.sx))),
        y: Math.max(0.2, Math.min(9.8, gaussian(rng, c.y, c.sy))),
      });
    }
  }
  // One extra point per cluster
  pts.push({
    x: Math.max(0.2, Math.min(9.8, gaussian(rng, trueCenters[0].x, trueCenters[0].sx))),
    y: Math.max(0.2, Math.min(9.8, gaussian(rng, trueCenters[0].y, trueCenters[0].sy))),
  });
  return pts;
}

export function GMMResponsibilityViz({ className }: { className?: string }) {
  const points = useMemo(() => makePoints(), []);
  const snapshots = useMemo(() => buildSnapshots(points), [points]);

  const [snapIdx, setSnapIdx] = useState(0);

  const snap = snapshots[snapIdx];
  const { params, responsibilities, logLikelihood } = snap;

  const sx = scale(DOM[0], DOM[1], M.left, W - M.right);
  const sy = scale(DOM[0], DOM[1], H - M.bottom, M.top);

  function step() {
    setSnapIdx((i) => Math.min(i + 1, snapshots.length - 1));
  }

  function reset() {
    setSnapIdx(0);
  }

  const isConverged = snapIdx === snapshots.length - 1;
  const dominantK = (resps: number[]) => resps.indexOf(Math.max(...resps));

  return (
    <VizFrame
      className={className}
      title="EM for Gaussian Mixture Models"
      caption="Each EM step updates the component means and covariances (M-step) then re-computes soft responsibilities (E-step). Point colors blend between the three component colors weighted by responsibility. Ellipses show the 2σ contour of each Gaussian. Log-likelihood increases monotonically."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gaussian Mixture Model EM iterations">
        {/* Background */}
        <rect x={M.left} y={M.top} width={W - M.left - M.right} height={H - M.top - M.bottom} fill={VIZ.card} stroke={VIZ.axis} strokeWidth={0.5} />

        {/* Covariance ellipses */}
        {params.means.map((mean, k) => {
          const ell = ellipseFromCov(mean.x, mean.y, params.covs[k][0], params.covs[k][1], params.covs[k][2]);
          const color = `rgb(${COMP_COLORS[k][0]},${COMP_COLORS[k][1]},${COMP_COLORS[k][2]})`;
          const cx = sx(ell.mx);
          const cy = sy(ell.my);
          // Scale radii from data space to pixel space (approximate, using x-scale)
          const scaleX = (W - M.left - M.right) / (DOM[1] - DOM[0]);
          const scaleY = (H - M.top - M.bottom) / (DOM[1] - DOM[0]);
          const rx = ell.rx * scaleX;
          const ry = ell.ry * scaleY;
          const angleDeg = (ell.angle * 180) / Math.PI;
          return (
            <ellipse
              key={k}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={color}
              fillOpacity={0.08}
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              strokeDasharray="5 3"
              transform={`rotate(${angleDeg}, ${cx}, ${cy})`}
            />
          );
        })}

        {/* Data points colored by soft responsibilities */}
        {points.map((pt, i) => {
          const resps = responsibilities[i];
          const fill = blendColor(resps);
          const dom = dominantK(resps);
          const confidence = resps[dom];
          const r = 3.5 + confidence * 1.5;
          return (
            <circle
              key={i}
              cx={sx(pt.x)}
              cy={sy(pt.y)}
              r={r}
              fill={fill}
              stroke="#0f1117"
              strokeWidth={0.8}
              opacity={0.9}
            />
          );
        })}

        {/* Component mean markers (X crosses) */}
        {params.means.map((mean, k) => {
          const cx = sx(mean.x);
          const cy = sy(mean.y);
          const color = `rgb(${COMP_COLORS[k][0]},${COMP_COLORS[k][1]},${COMP_COLORS[k][2]})`;
          return (
            <g key={k} stroke={color} strokeWidth={2.5}>
              <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7} />
              <line x1={cx - 7} y1={cy + 7} x2={cx + 7} y2={cy - 7} />
              <circle cx={cx} cy={cy} r={9} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
            </g>
          );
        })}

        {/* Component weight labels */}
        {params.means.map((mean, k) => {
          const cx = sx(mean.x);
          const cy = sy(mean.y);
          const color = `rgb(${COMP_COLORS[k][0]},${COMP_COLORS[k][1]},${COMP_COLORS[k][2]})`;
          return (
            <text
              key={k}
              x={cx + 12}
              y={cy - 8}
              fill={color}
              fontSize={10}
              fontFamily="monospace"
            >
              π={params.weights[k].toFixed(2)}
            </text>
          );
        })}
        <text x={W - M.right - 4} y={H - M.bottom - 6} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>feature x₁</text>
        <text x={M.left + 6} y={M.top + 14} fill={VIZ.text} fontSize={10} opacity={0.85}>feature x₂</text>
      </svg>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <VizButton onClick={step} active={false}>
          {isConverged ? "Converged" : `EM Step ${snapIdx + 1}/${snapshots.length} →`}
        </VizButton>
        <VizButton onClick={reset}>Reset</VizButton>

        <div className="flex gap-5 ml-auto">
          <VizStat label="iteration" value={String(snapIdx)} />
          <VizStat
            label="log-likelihood"
            value={logLikelihood.toFixed(1)}
            color={VIZ.teal}
          />
          <VizStat
            label="phase"
            value={snap.step === "init" ? "init" : "M→E"}
            color={VIZ.yellow}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2">
        {["Component 1", "Component 2", "Component 3"].map((label, k) => {
          const color = `rgb(${COMP_COLORS[k][0]},${COMP_COLORS[k][1]},${COMP_COLORS[k][2]})`;
          return (
            <div key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          );
        })}
      </div>
    </VizFrame>
  );
}
