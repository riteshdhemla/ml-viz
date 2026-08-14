"use client";

/**
 * What temperature does to a teacher's logits, and why the loss carries a τ².
 *
 * Three facts, all exact rather than illustrative:
 *
 * 1. **Softening reveals mass, not order.** On this logit vector the top class
 *    holds 0.8521 at τ = 1 and 0.1685 at τ = 10; the mass outside the argmax
 *    goes 0.148 → 0.832 and the entropy 0.561 → 2.255 nats. The *ranking never
 *    changes*, because softmax is monotone in the logits at every temperature.
 *
 * 2. **What compresses is the ratios, by exactly 1/τ in the exponent.** For any
 *    two classes p_i/p_j = exp((z_i − z_j)/τ). Verified here: the second/third
 *    ratio is 1.648721 at τ = 1, 1.133148 at τ = 4, 1.051271 at τ = 10, matching
 *    exp(0.5/τ) to six decimals. "Dark knowledge" is precisely those ratios
 *    being lifted out of floating-point irrelevance.
 *
 * 3. **The τ² is not a fudge factor.** The KD gradient with respect to the
 *    student logits is (p_student − p_teacher)/τ, and both the difference and
 *    the 1/τ shrink with temperature, so the raw gradient norm collapses from
 *    3.83e-1 at τ = 1 to 3.24e-3 at τ = 10 — 118× — and the distillation term
 *    would quietly stop training the student. Multiplying by τ² holds it at
 *    0.383 → 0.324 instead. The panel plots both.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat } from "../viz-kit";

/** A teacher's logits over ten classes: one clear winner, structure underneath. */
const TEACHER = [8.2, 5.9, 5.4, 3.1, 2.8, 1.2, 0.6, 0.1, -0.7, -1.4];
/** A partly-trained student, used only for the gradient-scale readout. */
const STUDENT = [6.0, 5.2, 4.9, 3.5, 2.0, 1.5, 1.0, 0.3, -0.2, -1.0];
const LABELS = ["cat", "lynx", "tiger", "dog", "fox", "wolf", "bear", "deer", "car", "boat"];

function softmax(z: number[], t: number) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp((v - m) / t));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
const entropy = (p: number[]) => -p.reduce((a, v) => a + (v > 0 ? v * Math.log(v) : 0), 0);

/** ‖∂ KD / ∂ z_student‖ = ‖(p_s − p_t)/τ‖, before the τ² correction. */
function gradNorm(t: number) {
  const pt = softmax(TEACHER, t);
  const ps = softmax(STUDENT, t);
  const g = ps.map((v, i) => (v - pt[i]) / t);
  return Math.sqrt(g.reduce((a, v) => a + v * v, 0));
}

const W = 560;
const H = 190;
const PAD = { l: 34, r: 12, t: 14, b: 34 };
const BARW = (W - PAD.l - PAD.r) / TEACHER.length;

const GW = 250;
const GH = 96;

export function DistillationViz({ className }: { className?: string }) {
  const [tau, setTau] = useState(1);

  const p = useMemo(() => softmax(TEACHER, tau), [tau]);
  const hard = useMemo(() => softmax(TEACHER, 1), []);
  const raw = gradNorm(tau);
  const corrected = raw * tau * tau;

  // gradient-scale curves over the whole τ range, normalised to τ = 1
  const g1 = gradNorm(1);
  const taus = Array.from({ length: 46 }, (_, i) => 1 + i * 0.2);
  const gx = (t: number) => 8 + ((t - 1) / 9) * (GW - 20);
  const gy = (v: number) => GH - 14 - (Math.log10(Math.max(v, 1e-4)) + 3) * ((GH - 26) / 3.2);
  const pathOf = (f: (t: number) => number) =>
    taus.map((t, i) => `${i === 0 ? "M" : "L"}${gx(t).toFixed(1)},${gy(f(t) / g1).toFixed(1)}`).join(" ");

  return (
    <VizFrame
      title="Temperature, and the τ² that keeps it honest"
      caption="A teacher's ten logits, softened by τ. Ghost outlines are the τ = 1 distribution for comparison. Right: the norm of the distillation gradient with respect to the student's logits, relative to its value at τ = 1, with and without the τ² factor — log scale."
      className={className}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_260px] items-start">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((y) => (
            <g key={y}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={H - PAD.b - y * (H - PAD.b - PAD.t)}
                y2={H - PAD.b - y * (H - PAD.b - PAD.t)}
                stroke={VIZ.grid}
                strokeWidth={1}
              />
              <text x={PAD.l - 5} y={H - PAD.b - y * (H - PAD.b - PAD.t) + 3} textAnchor="end" fontSize={8} fill={VIZ.text}>
                {y}
              </text>
            </g>
          ))}
          {p.map((v, i) => {
            const x = PAD.l + i * BARW;
            const h = v * (H - PAD.b - PAD.t);
            const h1 = hard[i] * (H - PAD.b - PAD.t);
            return (
              <g key={i}>
                <rect
                  x={x + 2}
                  y={H - PAD.b - h1}
                  width={BARW - 4}
                  height={h1}
                  fill="none"
                  stroke={VIZ.axis}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <rect
                  x={x + 2}
                  y={H - PAD.b - h}
                  width={BARW - 4}
                  height={h}
                  rx={1.5}
                  fill={i === 0 ? VIZ.brand : VIZ.teal}
                />
                <text x={x + BARW / 2} y={H - PAD.b + 11} textAnchor="middle" fontSize={7.5} fill={VIZ.text}>
                  {LABELS[i]}
                </text>
                <text x={x + BARW / 2} y={H - PAD.b + 21} textAnchor="middle" fontSize={7} fill={VIZ.textBright}>
                  {v < 0.001 ? "·" : v.toFixed(3)}
                </text>
              </g>
            );
          })}
        </svg>

        <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full">
          <line x1={8} x2={GW - 12} y1={GH - 14} y2={GH - 14} stroke={VIZ.axis} strokeWidth={1} />
          <line x1={8} x2={8} y1={4} y2={GH - 14} stroke={VIZ.axis} strokeWidth={1} />
          <path d={pathOf((t) => gradNorm(t))} fill="none" stroke={VIZ.rose} strokeWidth={2} />
          <path d={pathOf((t) => gradNorm(t) * t * t)} fill="none" stroke={VIZ.teal} strokeWidth={2} />
          <circle cx={gx(tau)} cy={gy(raw / g1)} r={3} fill={VIZ.rose} />
          <circle cx={gx(tau)} cy={gy(corrected / g1)} r={3} fill={VIZ.teal} />
          <text x={12} y={12} fontSize={8} fill={VIZ.teal}>
            × τ² — stays usable
          </text>
          <text x={12} y={GH - 20} fontSize={8} fill={VIZ.rose}>
            raw — collapses
          </text>
          <text x={GW - 12} y={GH - 3} textAnchor="end" fontSize={8} fill={VIZ.text}>
            τ = 10
          </text>
          <text x={8} y={GH - 3} fontSize={8} fill={VIZ.text}>
            1
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="p(top class)" value={p[0].toFixed(4)} color={VIZ.brand} />
        <VizStat label="mass outside the argmax" value={(1 - p[0]).toFixed(4)} color={VIZ.teal} />
        <VizStat label="entropy (nats)" value={entropy(p).toFixed(4)} />
        <VizStat label="p(lynx) / p(tiger)" value={(p[1] / p[2]).toFixed(6)} />
        <VizStat label="exp(0.5/τ)" value={Math.exp(0.5 / tau).toFixed(6)} color={VIZ.yellow} />
        <VizStat
          label="gradient vs τ=1, raw"
          value={`${(raw / g1).toFixed(4)}×`}
          color={raw / g1 < 0.2 ? VIZ.rose : VIZ.textBright}
        />
        <VizStat label="gradient vs τ=1, ×τ²" value={`${(corrected / g1).toFixed(4)}×`} color={VIZ.teal} />
      </div>

      <div className="mt-4 w-72">
        <VizSlider
          label="τ — softmax temperature"
          min={1}
          max={10}
          step={0.5}
          value={tau}
          onChange={setTau}
          format={(v) => v.toFixed(1)}
        />
      </div>
    </VizFrame>
  );
}
