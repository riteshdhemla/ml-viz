"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizButton, VizStat, useAnimationLoop, scale } from "../viz-kit";

/**
 * Saddle-point visualization — plateaus aren't minima, and dimension is why.
 *
 * Left: the loss surface f(x, y) = x² − y² has a saddle at the origin —
 * positive curvature along x (walls), negative along y (escape valleys).
 * A plain gradient-descent ball crawls as it nears the origin (the gradient
 * norm collapses), while a momentum ball accumulates velocity and sails
 * through into the negative-curvature valley. Same start, same step size.
 *
 * Right: a bar for P(all N curvature directions point up) = 2^−N. A point is a
 * local minimum only if *every* Hessian eigenvalue is positive, which becomes
 * exponentially unlikely as dimension grows — so in high dimensions almost
 * every critical point is a saddle, not a minimum. The 2-D picture misleads.
 */

const STEPS = 110;
const LR = 0.05;
const BETA = 0.9;
const START: [number, number] = [1.5, 0.06];
const DOM: [number, number] = [-2, 2];

const W = 560;
const H = 340;
const PLOT = { x0: 30, x1: 360, y0: 20, y1: 300 };

function grad(x: number, y: number): [number, number] {
  return [2 * x, -2 * y]; // ∇(x² − y²)
}
const clamp = (v: number) => Math.max(DOM[0], Math.min(DOM[1], v));

function trajectory(momentum: boolean): [number, number][] {
  let x = START[0];
  let y = START[1];
  let vx = 0;
  let vy = 0;
  const out: [number, number][] = [[x, y]];
  for (let i = 0; i < STEPS; i++) {
    const [gx, gy] = grad(x, y);
    if (momentum) {
      vx = BETA * vx + gx;
      vy = BETA * vy + gy;
      x = clamp(x - LR * vx);
      y = clamp(y - LR * vy);
    } else {
      x = clamp(x - LR * gx);
      y = clamp(y - LR * gy);
    }
    out.push([x, y]);
  }
  return out;
}

// coarse heatmap of the saddle surface
const GRID_NX = 34;
const GRID_NY = 28;

export function SaddlePointViz({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dim, setDim] = useState(10);

  const gd = useMemo(() => trajectory(false), []);
  const mom = useMemo(() => trajectory(true), []);

  useAnimationLoop((dt) => {
    setStep((s) => {
      const next = s + dt * 32;
      if (next >= STEPS) {
        setPlaying(false);
        return STEPS;
      }
      return next;
    });
  }, playing);

  const sx = scale(DOM[0], DOM[1], PLOT.x0, PLOT.x1);
  const sy = scale(DOM[0], DOM[1], PLOT.y1, PLOT.y0);
  const idx = Math.min(STEPS, Math.floor(step));

  const gdPt = gd[idx];
  const momPt = mom[idx];
  const gdGradNorm = Math.hypot(...grad(gdPt[0], gdPt[1]));

  const prob = Math.pow(2, -dim);

  const cells = [];
  for (let i = 0; i < GRID_NX; i++) {
    for (let j = 0; j < GRID_NY; j++) {
      const x = DOM[0] + ((i + 0.5) / GRID_NX) * (DOM[1] - DOM[0]);
      const y = DOM[0] + ((j + 0.5) / GRID_NY) * (DOM[1] - DOM[0]);
      const f = x * x - y * y; // in [-4, 4]
      const mag = Math.min(1, Math.abs(f) / 4);
      const color = f >= 0 ? VIZ.rose : VIZ.teal; // walls vs valleys
      cells.push(
        <rect
          key={`${i}-${j}`}
          x={sx(DOM[0] + (i / GRID_NX) * (DOM[1] - DOM[0]))}
          y={sy(DOM[0] + ((j + 1) / GRID_NY) * (DOM[1] - DOM[0]))}
          width={(PLOT.x1 - PLOT.x0) / GRID_NX + 0.5}
          height={(PLOT.y1 - PLOT.y0) / GRID_NY + 0.5}
          fill={color}
          opacity={0.06 + 0.32 * mag}
        />
      );
    }
  }

  const poly = (traj: [number, number][]) =>
    traj.slice(0, idx + 1).map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  // right panel: 2^-N bar
  const barX0 = 410;
  const barX1 = 540;
  const barW = (p: number) => (barX1 - barX0) * Math.max(p, 0.004);

  return (
    <VizFrame
      className={className}
      title="Saddle Points: A Plateau Is Not a Minimum"
      caption="Left: on the saddle f(x,y)=x²−y², plain gradient descent crawls as its gradient collapses near the origin, while momentum accumulates velocity and escapes down the negative-curvature valley. Right: a point is a local minimum only if all N curvature directions point up — probability 2⁻ᴺ — so in high dimensions nearly every critical point is a saddle. The 2-D 'stuck in a bowl' intuition does not survive."
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <VizButton active={playing} onClick={() => { if (idx >= STEPS) setStep(0); setPlaying(!playing); }}>
          {playing ? "Pause" : idx >= STEPS ? "Replay" : "Play"}
        </VizButton>
        <VizButton onClick={() => { setStep(0); setPlaying(true); }}>Reset</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Saddle point escape and the 2^-N argument">
        {cells}
        {/* axes labels */}
        <text x={PLOT.x1} y={sy(0) - 4} textAnchor="end" fontSize={9} fill={VIZ.rose}>+curvature (wall)</text>
        <text x={sx(0) + 4} y={PLOT.y0 + 8} fontSize={9} fill={VIZ.teal}>−curvature (escape)</text>

        {/* trajectories */}
        <polyline points={poly(gd)} fill="none" stroke={VIZ.yellow} strokeWidth={2} opacity={0.9} />
        <polyline points={poly(mom)} fill="none" stroke={VIZ.brandLight} strokeWidth={2} opacity={0.9} />
        {/* balls */}
        <circle cx={sx(gdPt[0])} cy={sy(gdPt[1])} r={5} fill={VIZ.yellow} />
        <circle cx={sx(momPt[0])} cy={sy(momPt[1])} r={5} fill={VIZ.brandLight} />
        {/* saddle marker */}
        <circle cx={sx(0)} cy={sy(0)} r={3} fill="none" stroke={VIZ.textBright} strokeWidth={1.2} />

        {/* legend */}
        <rect x={PLOT.x0} y={PLOT.y1 + 12} width={10} height={4} fill={VIZ.yellow} />
        <text x={PLOT.x0 + 14} y={PLOT.y1 + 16} fontSize={9} fill={VIZ.text}>gradient descent</text>
        <rect x={PLOT.x0 + 120} y={PLOT.y1 + 12} width={10} height={4} fill={VIZ.brandLight} />
        <text x={PLOT.x0 + 134} y={PLOT.y1 + 16} fontSize={9} fill={VIZ.text}>momentum</text>

        {/* right panel: 2^-N */}
        <text x={barX0} y={PLOT.y0 + 6} fontSize={10} fill={VIZ.textBright}>P(local min) = 2⁻ᴺ</text>
        <rect x={barX0} y={PLOT.y0 + 16} width={barX1 - barX0} height={16} fill={VIZ.grid} rx={3} />
        <rect x={barX0} y={PLOT.y0 + 16} width={barW(prob)} height={16} fill={VIZ.orange} rx={3} />
        <text x={barX0} y={PLOT.y0 + 52} fontSize={11} fontFamily="monospace" fill={VIZ.orange}>
          N={dim}: {prob < 0.001 ? prob.toExponential(1) : prob.toFixed(3)}
        </text>
        <text x={barX0} y={PLOT.y0 + 74} fontSize={9} fill={VIZ.text}>every curvature</text>
        <text x={barX0} y={PLOT.y0 + 86} fontSize={9} fill={VIZ.text}>direction must be up</text>
      </svg>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
        <div className="min-w-[200px] flex-1">
          <VizSlider label="dimensions N" min={1} max={20} step={1} value={dim} onChange={setDim} format={(v) => v.toFixed(0)} />
        </div>
        <VizStat label="GD gradient norm" value={gdGradNorm.toFixed(3)} color={gdGradNorm < 0.15 ? VIZ.rose : VIZ.teal} />
        <VizStat label="step" value={`${idx}/${STEPS}`} />
      </div>
    </VizFrame>
  );
}
