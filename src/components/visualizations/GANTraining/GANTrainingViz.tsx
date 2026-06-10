"use client";

import { useCallback, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizStat,
  useAnimationLoop,
  scale,
} from "../viz-kit";

/**
 * GAN Training Trajectory Visualization
 *
 * Illustrates how a GAN generator distribution evolves from noise toward the
 * real data distribution (a bimodal Gaussian). Includes:
 *  - Real data density (bimodal Gaussian: peaks at -1.5 and +1.5, σ=0.5)
 *  - Generator density evolving through ~20 snapshots
 *  - Discriminator confidence curve D(x) ∈ [0,1]
 *  - Mode collapse toggle: generator collapses to just one mode
 *
 * All data is precomputed deterministically at module level.
 */

const W = 520;
const H = 240;
const M = { top: 20, right: 20, bottom: 40, left: 44 };

/** x domain for evaluations */
const X_MIN = -4;
const X_MAX = 4;
const N_PTS = 80;
const N_SNAPSHOTS = 20;

/** Build evenly-spaced x evaluation grid */
const X_GRID: number[] = Array.from({ length: N_PTS }, (_, i) =>
  X_MIN + (i / (N_PTS - 1)) * (X_MAX - X_MIN)
);

/** Bimodal real data Gaussian density */
function realDensity(x: number): number {
  const g = (mu: number, sigma: number) =>
    (1 / (sigma * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
  return 0.5 * g(-1.5, 0.5) + 0.5 * g(1.5, 0.5);
}

/** Gaussian density with given mean and sigma */
function gaussianDensity(x: number, mean: number, sigma: number): number {
  return (
    (1 / (sigma * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * ((x - mean) / sigma) ** 2)
  );
}

/**
 * Generator density at snapshot t (0 = noise, N_SNAPSHOTS = converged).
 * Normal: converges to the bimodal (mixture of two Gaussians).
 * Mode collapse: converges to just the right mode (peak at +1.5).
 */
function generatorDensity(x: number, t: number, modeCollapse: boolean): number {
  const alpha = t / N_SNAPSHOTS; // 0..1
  if (modeCollapse) {
    // Interpolate from wide noise (mean=0, σ=2) to single peak (mean=1.5, σ=0.5)
    const mean = 0 + alpha * 1.5;
    const sigma = 2 - alpha * 1.5; // 2 → 0.5
    return gaussianDensity(x, mean, sigma);
  } else {
    // Interpolate from wide noise (mean=0, σ=2) to bimodal
    // Bimodal is a mixture of two Gaussians; we interpolate mean/sigma of each component
    // and the weight split (starts at 50/50 uniform-ish, stays 50/50 for bimodal)
    const sigma = 2 - alpha * 1.5; // 2 → 0.5
    // Two components moving from ±0 to ±1.5
    const mu1 = -alpha * 1.5;
    const mu2 = alpha * 1.5;
    return (
      0.5 * gaussianDensity(x, mu1, sigma) +
      0.5 * gaussianDensity(x, mu2, sigma)
    );
  }
}

/**
 * Discriminator confidence D(x) at snapshot t.
 * Starts near 0.5 everywhere; sharpens as training progresses — high near real
 * data peaks, low near generator peaks. At equilibrium (t=N_SNAPSHOTS),
 * D(x) ≈ 0.5 everywhere (can't distinguish).
 */
function discriminatorConfidence(x: number, t: number, modeCollapse: boolean): number {
  const alpha = t / N_SNAPSHOTS;
  const sharpness = alpha * (1 - alpha) * 4; // peaks at t=0.5, near 0 at start/end

  const real = realDensity(x);
  const gen = generatorDensity(x, t, modeCollapse);
  const total = real + gen;
  if (total < 1e-9) return 0.5;
  // "Optimal" discriminator: P(real) = p_data / (p_data + p_gen)
  const optimal = real / total;
  // Blend: at start/end near 0.5, at middle near optimal
  return 0.5 + sharpness * (optimal - 0.5);
}

/** Precompute density snapshots for both modes */
function precomputeSnapshots(modeCollapse: boolean): Float32Array[] {
  return Array.from({ length: N_SNAPSHOTS + 1 }, (_, t) => {
    const arr = new Float32Array(N_PTS);
    for (let i = 0; i < N_PTS; i++) {
      arr[i] = generatorDensity(X_GRID[i], t, modeCollapse);
    }
    return arr;
  });
}

function precomputeDiscriminator(modeCollapse: boolean): Float32Array[] {
  return Array.from({ length: N_SNAPSHOTS + 1 }, (_, t) => {
    const arr = new Float32Array(N_PTS);
    for (let i = 0; i < N_PTS; i++) {
      arr[i] = discriminatorConfidence(X_GRID[i], t, modeCollapse);
    }
    return arr;
  });
}

/** Precompute real data density (same for both modes) */
const REAL_DENSITY: Float32Array = (() => {
  const arr = new Float32Array(N_PTS);
  for (let i = 0; i < N_PTS; i++) arr[i] = realDensity(X_GRID[i]);
  return arr;
})();

const NORMAL_SNAPSHOTS = precomputeSnapshots(false);
const NORMAL_DISCRIMINATOR = precomputeDiscriminator(false);
const COLLAPSE_SNAPSHOTS = precomputeSnapshots(true);
const COLLAPSE_DISCRIMINATOR = precomputeDiscriminator(true);

/** Build an SVG polyline path from x/y arrays */
function makePath(
  xs: number[],
  ys: Float32Array,
  sx: (v: number) => number,
  sy: (v: number) => number,
  clampY: number
): string {
  const pts: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    pts.push(`${sx(xs[i]).toFixed(1)},${sy(Math.min(ys[i], clampY)).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

/** Compute KL divergence label approx (just for display) */
function approxJSD(genDensity: Float32Array): number {
  let d = 0;
  for (let i = 0; i < N_PTS; i++) {
    const p = REAL_DENSITY[i];
    const q = genDensity[i];
    const m = (p + q) / 2;
    if (m > 1e-9 && p > 1e-9) d += p * Math.log(p / m);
    if (m > 1e-9 && q > 1e-9) d += q * Math.log(q / m);
  }
  // Normalize roughly (integral approx)
  const dx = (X_MAX - X_MIN) / (N_PTS - 1);
  return Math.max(0, (d * dx) / 2);
}

export function GANTrainingViz({ className }: { className?: string }) {
  const [snapshot, setSnapshot] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [modeCollapse, setModeCollapse] = useState(false);
  const accumRef = useRef(0);

  const genSnapshots = modeCollapse ? COLLAPSE_SNAPSHOTS : NORMAL_SNAPSHOTS;
  const discSnapshots = modeCollapse ? COLLAPSE_DISCRIMINATOR : NORMAL_DISCRIMINATOR;

  const genDensity = genSnapshots[snapshot];
  const discDensity = discSnapshots[snapshot];

  // Y domain: density up to ~0.9 (cap for visibility)
  const Y_MAX_DENSITY = 0.9;
  const Y_DISC_TOP = 1.0; // D(x) in [0,1]

  // Two panels in one SVG: top = density, bottom = D confidence
  // Density panel: y in [0, Y_MAX_DENSITY]
  // Discriminator: shown as a thin line scaled to [0,1] -> mapped to a sub-band
  const DENSITY_H = 160;
  const DISC_H = 50;
  const GAP = 12;
  const TOTAL_H = M.top + DENSITY_H + GAP + DISC_H + M.bottom;

  const sx = scale(X_MIN, X_MAX, M.left, W - M.right);

  // Density panel: y=0 at bottom of density area, y=Y_MAX at top
  const syDensity = scale(0, Y_MAX_DENSITY, M.top + DENSITY_H, M.top);

  // Discriminator panel: y=0..1 mapped to bottom..top of disc band
  const discTop = M.top + DENSITY_H + GAP;
  const discBottom = discTop + DISC_H;
  const syDisc = scale(0, Y_DISC_TOP, discBottom, discTop);

  const realPath = makePath(X_GRID, REAL_DENSITY, sx, syDensity, Y_MAX_DENSITY);
  const genPath = makePath(X_GRID, genDensity, sx, syDensity, Y_MAX_DENSITY);
  const discPath = makePath(X_GRID, discDensity, sx, syDisc, Y_DISC_TOP);

  const jsd = approxJSD(genDensity);
  const progress = snapshot / N_SNAPSHOTS;

  const handlePlay = useCallback(() => setPlaying((p) => !p), []);

  useAnimationLoop(
    useCallback(
      (dt: number) => {
        accumRef.current += dt;
        if (accumRef.current < 0.5) return; // ~2 frames/sec
        accumRef.current = 0;
        setSnapshot((s) => {
          if (s >= N_SNAPSHOTS) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      },
      []
    ),
    playing
  );

  function handleModeCollapse(on: boolean) {
    setModeCollapse(on);
    setSnapshot(0);
    setPlaying(false);
    accumRef.current = 0;
  }

  // X axis tick values
  const xTicks = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  return (
    <VizFrame
      className={className}
      title="GAN Training Trajectory"
      caption="Blue = real data distribution (bimodal Gaussian). Orange = generator distribution evolving over 20 training snapshots. Thin teal line = discriminator confidence D(x) = P(real). At convergence, D(x) ≈ 0.5 everywhere. Toggle Mode Collapse to see the generator fixate on one mode."
    >
      <svg
        viewBox={`0 0 ${W} ${TOTAL_H}`}
        className="w-full"
        role="img"
        aria-label="GAN training trajectory with discriminator confidence"
      >
        {/* Background grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((v) => (
          <line
            key={v}
            x1={M.left}
            y1={syDensity(v)}
            x2={W - M.right}
            y2={syDensity(v)}
            stroke={VIZ.grid}
            strokeWidth={1}
          />
        ))}
        {/* D(x) panel background */}
        <rect
          x={M.left}
          y={discTop}
          width={W - M.left - M.right}
          height={DISC_H}
          fill={VIZ.card}
          rx={2}
          opacity={0.4}
        />
        {/* D(x) = 0.5 reference line */}
        <line
          x1={M.left}
          y1={syDisc(0.5)}
          x2={W - M.right}
          y2={syDisc(0.5)}
          stroke={VIZ.grid}
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Real data density fill */}
        <path
          d={`${realPath}L${sx(X_MAX)},${syDensity(0)}L${sx(X_MIN)},${syDensity(0)}Z`}
          fill={VIZ.brand}
          fillOpacity={0.18}
        />
        {/* Real data density line */}
        <path d={realPath} fill="none" stroke={VIZ.brand} strokeWidth={2} />

        {/* Generator density fill */}
        <path
          d={`${genPath}L${sx(X_MAX)},${syDensity(0)}L${sx(X_MIN)},${syDensity(0)}Z`}
          fill={VIZ.orange}
          fillOpacity={0.15}
        />
        {/* Generator density line */}
        <path
          d={genPath}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={2}
          strokeDasharray={snapshot === 0 ? "5 3" : "none"}
        />

        {/* Discriminator confidence curve */}
        <path d={discPath} fill="none" stroke={VIZ.teal} strokeWidth={1.5} />

        {/* Density y-axis labels */}
        {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
          <text
            key={v}
            x={M.left - 6}
            y={syDensity(v) + 4}
            fill={VIZ.text}
            fontSize={9}
            textAnchor="end"
          >
            {v.toFixed(1)}
          </text>
        ))}

        {/* Density panel label */}
        <text
          x={M.left - 6}
          y={M.top + DENSITY_H / 2}
          fill={VIZ.text}
          fontSize={9}
          textAnchor="middle"
          transform={`rotate(-90, ${M.left - 28}, ${M.top + DENSITY_H / 2})`}
        >
          density
        </text>

        {/* x-axis ticks (at bottom of density area) */}
        {xTicks.map((v) => (
          <g key={v}>
            <line
              x1={sx(v)}
              y1={syDensity(0)}
              x2={sx(v)}
              y2={syDensity(0) + 4}
              stroke={VIZ.axis}
              strokeWidth={1}
            />
            <text
              x={sx(v)}
              y={syDensity(0) + 14}
              fill={VIZ.text}
              fontSize={9}
              textAnchor="middle"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Discriminator panel labels */}
        <text
          x={M.left - 6}
          y={syDisc(1) + 4}
          fill={VIZ.teal}
          fontSize={9}
          textAnchor="end"
        >
          1
        </text>
        <text
          x={M.left - 6}
          y={syDisc(0.5) + 4}
          fill={VIZ.teal}
          fontSize={9}
          textAnchor="end"
        >
          0.5
        </text>
        <text
          x={M.left - 6}
          y={syDisc(0) + 4}
          fill={VIZ.teal}
          fontSize={9}
          textAnchor="end"
        >
          0
        </text>
        <text
          x={W - M.right}
          y={discTop - 4}
          fill={VIZ.teal}
          fontSize={9}
          textAnchor="end"
        >
          D(x)
        </text>

        {/* Legend */}
        <circle cx={M.left + 4} cy={M.top + 8} r={4} fill={VIZ.brand} fillOpacity={0.7} />
        <text x={M.left + 12} y={M.top + 12} fill={VIZ.textBright} fontSize={10}>
          Real data p_data(x)
        </text>
        <circle cx={M.left + 140} cy={M.top + 8} r={4} fill={VIZ.orange} fillOpacity={0.7} />
        <text x={M.left + 148} y={M.top + 12} fill={VIZ.textBright} fontSize={10}>
          Generator p_g(x)
        </text>
      </svg>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <VizButton onClick={handlePlay} active={playing}>
          {playing ? "Pause" : "Play"}
        </VizButton>
        <VizButton
          onClick={() => {
            setSnapshot(0);
            setPlaying(false);
            accumRef.current = 0;
          }}
        >
          Reset
        </VizButton>
        <VizButton
          onClick={() => handleModeCollapse(false)}
          active={!modeCollapse}
        >
          Normal
        </VizButton>
        <VizButton
          onClick={() => handleModeCollapse(true)}
          active={modeCollapse}
        >
          Mode Collapse
        </VizButton>
        <div className="flex gap-4 ml-auto">
          <VizStat label="snapshot" value={`${snapshot} / ${N_SNAPSHOTS}`} />
          <VizStat
            label="JSD"
            value={jsd.toFixed(3)}
            color={jsd < 0.05 ? VIZ.teal : VIZ.orange}
          />
          <VizStat
            label="progress"
            value={`${(progress * 100).toFixed(0)}%`}
            color={VIZ.brand}
          />
        </div>
      </div>
    </VizFrame>
  );
}
