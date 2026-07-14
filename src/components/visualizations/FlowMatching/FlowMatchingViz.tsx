"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizButton, VizStat, seededRandom, gaussian, scale } from "../viz-kit";

/**
 * Flow-matching visualization — straight trajectories integrate in few steps.
 *
 * Particles are transported from a noise blob (left) to a two-cluster data
 * distribution (right) by integrating a velocity field with an explicit Euler
 * solver. Two fields:
 *   - Rectified (straight): v(t) = d - z is constant, so the ODE integrates
 *     exactly for ANY number of steps — even 1 or 2 lands on the data manifold.
 *   - Curved (diffusion-like): v(t) = (d - z) + a·π·cos(πt)·n_perp varies over
 *     time, so a coarse Euler quadrature misses; the landing error shrinks as
 *     steps increase. Integration error tracks curvature, not distance.
 *
 * The step slider is the knob that unlocks millisecond-class inference: a
 * straightened field needs a handful of steps where a curved one needs many.
 */

const RNG_SEED = 7;
const N_PARTICLES = 24;
const W = 560;
const H = 340;
const XD: [number, number] = [-4, 4];
const YD: [number, number] = [-3, 3];

type Particle = { z: [number, number]; d: [number, number]; perp: [number, number] };

function buildParticles(): Particle[] {
  const rng = seededRandom(RNG_SEED);
  const out: Particle[] = [];
  for (let i = 0; i < N_PARTICLES; i++) {
    const z: [number, number] = [gaussian(rng, -2.6, 0.55), gaussian(rng, 0, 0.85)];
    const cy = i % 2 === 0 ? 1.5 : -1.5; // two data clusters
    const d: [number, number] = [gaussian(rng, 2.5, 0.35), gaussian(rng, cy, 0.32)];
    const dir = [d[0] - z[0], d[1] - z[1]];
    const len = Math.hypot(dir[0], dir[1]) || 1;
    // unit perpendicular, sign alternates so bows fan out organically
    const sign = rng() < 0.5 ? 1 : -1;
    const perp: [number, number] = [(-dir[1] / len) * sign, (dir[0] / len) * sign];
    out.push({ z, d, perp });
  }
  return out;
}

const PARTICLES = buildParticles();

// Euler-integrate one particle over `steps` steps; returns the polyline + endpoint.
function integrate(p: Particle, steps: number, bow: number): { path: [number, number][]; end: [number, number] } {
  const dx = p.d[0] - p.z[0];
  const dy = p.d[1] - p.z[1];
  let x = p.z[0];
  let y = p.z[1];
  const path: [number, number][] = [[x, y]];
  const dt = 1 / steps;
  for (let k = 0; k < steps; k++) {
    const t = k / steps;
    const c = bow * Math.PI * Math.cos(Math.PI * t);
    const vx = dx + c * p.perp[0];
    const vy = dy + c * p.perp[1];
    x += vx * dt;
    y += vy * dt;
    path.push([x, y]);
  }
  return { path, end: [x, y] };
}

export function FlowMatchingViz({ className }: { className?: string }) {
  const [steps, setSteps] = useState(2);
  const [curved, setCurved] = useState(false);

  const sx = scale(XD[0], XD[1], 24, W - 16);
  const sy = scale(YD[0], YD[1], H - 44, 20);
  const bow = curved ? 1.7 : 0;

  const { paths, meanErr } = useMemo(() => {
    let errSum = 0;
    const paths = PARTICLES.map((p) => {
      const { path, end } = integrate(p, steps, bow);
      errSum += Math.hypot(end[0] - p.d[0], end[1] - p.d[1]);
      return { path, end, d: p.d };
    });
    return { paths, meanErr: errSum / PARTICLES.length };
  }, [steps, bow]);

  return (
    <VizFrame
      className={className}
      title="Flow Matching: Straight Fields Integrate in Few Steps"
      caption="Particles are transported from noise (left) to a two-cluster data distribution (right) by an Euler ODE solver. A rectified (straight) field has constant velocity, so even 1–2 steps land exactly on the data. A curved field needs many steps before the polyline reaches the targets — integration error tracks curvature, not distance. Fewer steps = millisecond inference, which is why straightening the flow matters."
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <VizButton active={!curved} onClick={() => setCurved(false)}>
          Rectified (straight)
        </VizButton>
        <VizButton active={curved} onClick={() => setCurved(true)}>
          Curved (diffusion-like)
        </VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Flow matching trajectories from noise to data">
        {/* target rings */}
        {paths.map((p, i) => (
          <circle key={`t-${i}`} cx={sx(p.d[0])} cy={sy(p.d[1])} r={5} fill="none" stroke={VIZ.teal} strokeWidth={1.4} opacity={0.8} />
        ))}
        {/* Euler polylines */}
        {paths.map((p, i) => (
          <polyline
            key={`p-${i}`}
            points={p.path.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")}
            fill="none"
            stroke={curved ? VIZ.orange : VIZ.brandLight}
            strokeWidth={1.3}
            opacity={0.75}
          />
        ))}
        {/* source points */}
        {PARTICLES.map((p, i) => (
          <circle key={`s-${i}`} cx={sx(p.z[0])} cy={sy(p.z[1])} r={2.6} fill={VIZ.text} opacity={0.7} />
        ))}
        {/* landed endpoints */}
        {paths.map((p, i) => (
          <circle key={`e-${i}`} cx={sx(p.end[0])} cy={sy(p.end[1])} r={3.6} fill={curved ? VIZ.orange : VIZ.brand} />
        ))}

        <text x={sx(-2.6)} y={H - 24} textAnchor="middle" fontSize={10} fill={VIZ.text}>noise</text>
        <text x={sx(2.5)} y={H - 24} textAnchor="middle" fontSize={10} fill={VIZ.teal}>data (rings)</text>
      </svg>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
        <div className="min-w-[200px] flex-1">
          <VizSlider label="Euler steps" min={1} max={20} step={1} value={steps} onChange={setSteps} format={(v) => v.toFixed(0)} />
        </div>
        <VizStat label="mean landing error" value={meanErr.toFixed(2)} color={meanErr < 0.25 ? VIZ.teal : VIZ.orange} />
      </div>
    </VizFrame>
  );
}
