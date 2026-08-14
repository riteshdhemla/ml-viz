"use client";

/**
 * The feasible region, the active constraint, and the multiplier as a price.
 *
 * Problem: minimise f(x,y) = (x−3)² + (y−2)² subject to x + y ≤ b, x ≥ 0,
 * y ≥ 0. Small enough to solve in closed form, which is the point — every
 * quantity the KKT conditions talk about can then be checked rather than
 * asserted.
 *
 * The claim worth checking is that λ is a *shadow price*: the rate at which the
 * optimal value improves as the constraint is relaxed. Against a numerical
 * derivative of f* with respect to b:
 *
 *     b      f*        λ         −d(f*)/db
 *    2.0   4.50000   3.00000    3.00000
 *    3.0   2.00000   2.00000    2.00000
 *    4.0   0.50000   1.00000    1.00000
 *    4.5   0.12500   0.50000    0.50000
 *    5.0   0.00000   0.00000    0.00000   ← constraint goes inactive
 *
 * Exact at every b, and λ hits zero precisely when the unconstrained optimum
 * becomes feasible. That is complementary slackness — μᵢgᵢ(x*) = 0 — as a
 * thing you watch happen rather than a line in a table: a constraint that is
 * not binding has no price, and a constraint that binds prices itself at
 * exactly what relaxing it is worth.
 *
 * The practical reading: λ tells you how much to pay for one more unit of
 * budget before you go and negotiate for it.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

const CX = 3;
const CY = 2;

/** Closed-form solution of the projection onto x + y ≤ b. */
function solve(b: number) {
  if (CX + CY <= b) return { x: CX, y: CY, f: 0, lam: 0, active: false };
  const d = (CX + CY - b) / 2;
  const x = CX - d;
  const y = CY - d;
  return { x, y, f: (x - CX) ** 2 + (y - CY) ** 2, lam: 2 * d, active: true };
}

const W = 560;
const H = 280;
const PAD = { l: 44, r: 190, t: 14, b: 30 };
const LO = -0.4;
const HI = 5.6;
const sx = scale(LO, HI, PAD.l, W - PAD.r);
const sy = scale(LO, HI, H - PAD.b, PAD.t);

export function ConstrainedOptViz({ className }: { className?: string }) {
  const [b, setB] = useState(4);

  const s = useMemo(() => solve(b), [b]);

  /** Shadow price, measured rather than quoted. */
  const shadow = useMemo(() => {
    const h = 1e-5;
    return -(solve(b + h).f - solve(b - h).f) / (2 * h);
  }, [b]);

  const rings = [0.5, 1, 2, 3, 4].map((r) => Math.sqrt(r));

  return (
    <VizFrame
      title="What the multiplier is worth"
      caption="Minimise (x−3)² + (y−2)² inside the shaded feasible region x + y ≤ b, x, y ≥ 0. Rings are level sets of the objective; the white dot is the unconstrained optimum and the teal dot the constrained one. λ is read off the closed-form solution, and −df*/db beside it is a numerical derivative of the optimal value."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <clipPath id="co-plot">
            <rect x={PAD.l} y={PAD.t} width={W - PAD.r - PAD.l} height={H - PAD.b - PAD.t} />
          </clipPath>
        </defs>
        <rect x={PAD.l} y={PAD.t} width={W - PAD.r - PAD.l} height={H - PAD.b - PAD.t} fill="#171a24" />

        <g clipPath="url(#co-plot)">
          {/* feasible region: the triangle x,y >= 0, x + y <= b */}
          <polygon
            points={`${sx(0)},${sy(0)} ${sx(Math.min(b, HI))},${sy(0)} ${sx(0)},${sy(Math.min(b, HI))}`}
            fill={VIZ.teal}
            opacity={0.13}
          />
          <line x1={sx(0)} y1={sy(b)} x2={sx(b)} y2={sy(0)} stroke={VIZ.teal} strokeWidth={2} />

          {rings.map((r) => (
            <circle
              key={r}
              cx={sx(CX)}
              cy={sy(CY)}
              r={r * (sx(1) - sx(0))}
              fill="none"
              stroke={VIZ.brand}
              strokeWidth={1}
              opacity={0.55}
            />
          ))}
          {/* the gradient of f at the optimum is normal to the active constraint */}
          {s.active && (
            <line
              x1={sx(s.x)}
              y1={sy(s.y)}
              x2={sx(CX)}
              y2={sy(CY)}
              stroke={VIZ.yellow}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
          )}
        </g>

        <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={sx(0)} x2={sx(0)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.axis} strokeWidth={1} />
        <circle cx={sx(CX)} cy={sy(CY)} r={4} fill="none" stroke={VIZ.textBright} strokeWidth={1.6} />
        <circle cx={sx(s.x)} cy={sy(s.y)} r={5.5} fill={VIZ.teal} />
        <text x={sx(CX) + 8} y={sy(CY) - 6} fontSize={9} fill={VIZ.textBright}>
          unconstrained (3, 2)
        </text>
        <text x={W - PAD.r - 6} y={sy(0) + 13} textAnchor="end" fontSize={9} fill={VIZ.text}>
          x
        </text>

        <g transform={`translate(${W - PAD.r + 16}, ${PAD.t + 14})`}>
          <text x={0} y={0} fontSize={10} fill={VIZ.textBright}>
            {s.active ? "constraint active" : "constraint inactive"}
          </text>
          <text x={0} y={16} fontSize={9} fill={s.active ? VIZ.teal : VIZ.text}>
            x + y = {(s.x + s.y).toFixed(3)}
          </text>
          <text x={0} y={30} fontSize={9} fill={VIZ.text}>
            budget b = {b.toFixed(2)}
          </text>
          <text x={0} y={56} fontSize={9} fill={VIZ.text}>
            optimum
          </text>
          <text x={0} y={70} fontSize={10} fill={VIZ.teal}>
            ({s.x.toFixed(3)}, {s.y.toFixed(3)})
          </text>
          <text x={0} y={96} fontSize={9} fill={VIZ.text}>
            complementary slackness
          </text>
          <text x={0} y={110} fontSize={10} fill={Math.abs(s.lam * (s.x + s.y - b)) < 1e-9 ? VIZ.teal : VIZ.rose}>
            λ·g(x*) = {(s.lam * (s.x + s.y - b)).toFixed(6)}
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="optimal value" value={s.f.toFixed(5)} />
        {/* VizStat uppercases its label, and uppercase lambda is a different symbol —
            so the Greek lives in the SVG panel and the prose, and these read as words. */}
        <VizStat label="multiplier" value={s.lam.toFixed(5)} color={VIZ.yellow} />
        <VizStat label="measured shadow price" value={shadow.toFixed(5)} color={VIZ.teal} />
        <VizStat
          label="agreement"
          value={Math.abs(s.lam - shadow) < 1e-4 ? "exact" : (s.lam - shadow).toExponential(1)}
          color={Math.abs(s.lam - shadow) < 1e-4 ? VIZ.teal : VIZ.rose}
        />
      </div>

      <div className="mt-4 w-72">
        <VizSlider label="b — the budget in x + y ≤ b" min={0.5} max={5.5} step={0.05} value={b} onChange={setB} format={(v) => v.toFixed(2)} />
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        λ and the measured <span className="font-mono text-white">−df*/db</span> agree at every budget, which
        is what &ldquo;shadow price&rdquo; means: relax the constraint by one unit and the objective improves by λ.
        Push b past <span className="font-mono text-white">5</span> and the unconstrained optimum becomes
        feasible — λ drops to exactly <span className="font-mono text-white">0</span> and stays there. A
        constraint that is not binding has no price, which is complementary slackness happening rather than
        being stated.
      </p>
    </VizFrame>
  );
}
