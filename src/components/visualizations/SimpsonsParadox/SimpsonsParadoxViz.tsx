"use client";

import { useMemo, useState } from "react";
import { CLASS_COLORS, VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

/**
 * Simpson's paradox, driven by the confounding arrow itself.
 *
 * 180 patients in three severity strata. The generating process is fixed and
 * known: dose helps every patient by exactly +0.90 recovery points per unit
 * (`BETA`), and severity independently costs 2.5 points per stratum (`DELTA`).
 * The only thing the reader controls is how strongly severity drives the
 * *dose* — the Z -> X arrow — plus a switch that severs it the way
 * randomisation does.
 *
 * The numbers are recorded from OLS on the generated sample, not asserted.
 * Seed 587 was picked from 600 candidates as the one whose finite sample makes
 * all three estimators land on the truth when they should: with the arrow at 0
 * the naive slope is +0.898 and the within-stratum slope +0.896, against a true
 * +0.90. Push the arrow up and the naive slope crosses zero at gamma ~ 0.35 and
 * bottoms out at -0.473, while the within-stratum estimate never moves.
 *
 * A note on the range: the confounding bias is *not* monotone in gamma. It is
 * worst when the confounder explains a moderate share of the dose variation and
 * shrinks again once it explains nearly all of it (the bias term is
 * delta*gamma*Var(Z) / (gamma^2 Var(Z) + sigma_x^2), maximised at
 * gamma = sigma_x / sd(Z)). The slider stops at 1.0, just below the turning
 * point at gamma ~ 0.95, so the picture stays monotone; the turnaround there is
 * 0.003 wide and would read as noise rather than as the real effect it is.
 */

const W = 380;
const H = 250;
const X_DOM: [number, number] = [0.3, 6.6];
const Y_DOM: [number, number] = [-1.4, 12.8];

const N_PER_GROUP = 60;
const GROUPS = ["mild", "moderate", "severe"] as const;

/** Dose -> recovery. The causal effect the reader is trying to recover. */
const BETA = 0.9;
/** Severity -> recovery, per stratum. The confounder's direct effect. */
const DELTA = -2.5;
const BASE_X = 2.4;
const BASE_Y = 6.0;
const SD_X = 0.7;
const SD_Y = 1.1;

/** Noise terms only — fixed, so the slider changes the structure and nothing else. */
const NOISE = (() => {
  const rng = seededRandom(587);
  const out: { g: number; ex: number; ey: number }[] = [];
  for (let g = 0; g < GROUPS.length; g++) {
    for (let i = 0; i < N_PER_GROUP; i++) {
      out.push({ g, ex: gaussian(rng, 0, SD_X), ey: gaussian(rng, 0, SD_Y) });
    }
  }
  return out;
})();

interface Pt {
  g: number;
  x: number;
  y: number;
}

function simulate(gamma: number, randomised: boolean): Pt[] {
  return NOISE.map((p) => {
    const x = BASE_X + (randomised ? 0 : gamma * p.g) + p.ex;
    return { g: p.g, x, y: BASE_Y + BETA * x + DELTA * p.g + p.ey };
  });
}

function ols(pts: Pt[]) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/** Pooled within-stratum slope — the estimate that adjusts for the confounder. */
function withinSlope(pts: Pt[]) {
  let sxy = 0;
  let sxx = 0;
  for (let g = 0; g < GROUPS.length; g++) {
    const sub = pts.filter((p) => p.g === g);
    const mx = sub.reduce((s, p) => s + p.x, 0) / sub.length;
    const my = sub.reduce((s, p) => s + p.y, 0) / sub.length;
    for (const p of sub) {
      sxy += (p.x - mx) * (p.y - my);
      sxx += (p.x - mx) ** 2;
    }
  }
  return sxy / sxx;
}

export function SimpsonsParadoxViz({ className }: { className?: string }) {
  const [gamma, setGamma] = useState(0.7);
  const [randomised, setRandomised] = useState(false);

  const sx = scale(X_DOM[0], X_DOM[1], 34, W - 8);
  const sy = scale(Y_DOM[0], Y_DOM[1], H - 26, 8);

  const { pts, agg, within, groupFits } = useMemo(() => {
    const pts = simulate(gamma, randomised);
    const agg = ols(pts);
    const groupFits = GROUPS.map((_, g) => {
      const sub = pts.filter((p) => p.g === g);
      const fit = ols(sub);
      const lo = Math.min(...sub.map((p) => p.x));
      const hi = Math.max(...sub.map((p) => p.x));
      return { ...fit, lo, hi };
    });
    return { pts, agg, within: withinSlope(pts), groupFits };
  }, [gamma, randomised]);

  const flipped = agg.slope < 0;
  const arrowOn = !randomised && gamma > 0.02;

  return (
    <VizFrame
      className={className}
      title="Does the dose help? Two answers from one dataset"
      caption="180 patients in three severity strata. By construction the dose helps everyone by exactly +0.90 recovery points per unit, and severity independently costs 2.5 points. The slider controls only how strongly severity drives the dose — the confounding arrow — so every change you see comes from that one arrow, never from the treatment's real effect."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto block" role="img" aria-label="Dose versus recovery, coloured by severity stratum">
        {/* axes */}
        <line x1={sx(X_DOM[0])} y1={sy(Y_DOM[0])} x2={sx(X_DOM[1])} y2={sy(Y_DOM[0])} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={sx(X_DOM[0])} y1={sy(Y_DOM[0])} x2={sx(X_DOM[0])} y2={sy(Y_DOM[1])} stroke={VIZ.axis} strokeWidth={1} />
        <text x={W / 2} y={H - 4} textAnchor="middle" fill={VIZ.text} fontSize={9}>
          dose
        </text>
        <text x={10} y={H / 2} textAnchor="middle" fill={VIZ.text} fontSize={9} transform={`rotate(-90 10 ${H / 2})`}>
          recovery
        </text>

        {/* patients */}
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.3} fill={CLASS_COLORS[p.g]} opacity={0.55} />
        ))}

        {/* per-stratum fits — all three slope up, always */}
        {groupFits.map((f, g) => (
          <line
            key={g}
            x1={sx(f.lo)}
            y1={sy(f.intercept + f.slope * f.lo)}
            x2={sx(f.hi)}
            y2={sy(f.intercept + f.slope * f.hi)}
            stroke={CLASS_COLORS[g]}
            strokeWidth={2.5}
          />
        ))}

        {/* the pooled fit — the answer you get by ignoring severity */}
        <line
          x1={sx(X_DOM[0])}
          y1={sy(agg.intercept + agg.slope * X_DOM[0])}
          x2={sx(X_DOM[1])}
          y2={sy(agg.intercept + agg.slope * X_DOM[1])}
          stroke={flipped ? VIZ.rose : VIZ.textBright}
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {/* legend — bottom-left, the one corner no fit line reaches */}
        {GROUPS.map((name, g) => (
          <g key={name} transform={`translate(${44}, ${H - 62 + g * 13})`}>
            <circle cx={0} cy={-3} r={3} fill={CLASS_COLORS[g]} />
            <text x={8} y={0} fill={VIZ.text} fontSize={9}>
              {name}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        {/* the causal graph the slider is editing */}
        <svg viewBox="0 0 146 92" className="w-36 shrink-0" role="img" aria-label="Causal graph: severity drives both dose and recovery">
          <defs>
            <marker id="spv-head" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={VIZ.text} />
            </marker>
            <marker id="spv-head-live" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={VIZ.rose} />
            </marker>
            <marker id="spv-head-true" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={VIZ.teal} />
            </marker>
          </defs>
          <text x={73} y={12} textAnchor="middle" fill={VIZ.textBright} fontSize={9}>
            severity
          </text>
          <text x={16} y={62} textAnchor="middle" fill={VIZ.textBright} fontSize={9}>
            dose
          </text>
          <text x={120} y={62} textAnchor="middle" fill={VIZ.textBright} fontSize={9}>
            recovery
          </text>
          {/* severity -> dose: the arrow the slider controls */}
          <line
            x1={57}
            y1={17}
            x2={24}
            y2={50}
            stroke={arrowOn ? VIZ.rose : VIZ.grid}
            strokeWidth={arrowOn ? 1 + gamma * 2.2 : 1}
            strokeDasharray={randomised ? "3 3" : undefined}
            markerEnd={arrowOn ? "url(#spv-head-live)" : "url(#spv-head)"}
          />
          {randomised && <line x1={31} y1={45} x2={51} y2={25} stroke={VIZ.teal} strokeWidth={1.8} />}
          {/* severity -> recovery: fixed */}
          <line x1={89} y1={17} x2={114} y2={50} stroke={VIZ.text} strokeWidth={1.4} markerEnd="url(#spv-head)" />
          {/* dose -> recovery: the true effect, +0.90 whatever the reader does */}
          <line x1={20} y1={78} x2={112} y2={78} stroke={VIZ.teal} strokeWidth={1.8} markerEnd="url(#spv-head-true)" />
          <text x={66} y={90} textAnchor="middle" fill={VIZ.teal} fontSize={8}>
            +0.90
          </text>
        </svg>

        <div className="flex flex-col gap-3">
          <VizSlider
            label="how strongly severity drives the dose"
            min={0}
            max={1}
            step={0.05}
            value={gamma}
            onChange={setGamma}
            format={(v) => (randomised ? "severed" : v.toFixed(2))}
          />
          <div className="flex flex-wrap items-center gap-2">
            <VizButton onClick={() => setRandomised(!randomised)} active={randomised}>
              {randomised ? "randomised (RCT)" : "randomise the dose"}
            </VizButton>
            <span className="text-[11px] text-slate-400">
              {randomised
                ? "the arrow is cut — severity no longer decides who gets what dose"
                : "sicker patients are given more of it"}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <VizStat label="true effect" value={`+${BETA.toFixed(2)}`} color={VIZ.teal} />
            <VizStat
              label="pooled fit (ignore severity)"
              value={`${agg.slope >= 0 ? "+" : ""}${agg.slope.toFixed(3)}`}
              color={flipped ? VIZ.rose : VIZ.textBright}
            />
            <VizStat label="within stratum (adjusted)" value={`+${within.toFixed(3)}`} color={CLASS_COLORS[1]} />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {randomised
              ? "Randomising severs severity → dose. The strata still differ in recovery, but severity no longer predicts the dose, so the pooled fit recovers the true effect — with no adjustment and no knowledge of the confounder."
              : flipped
                ? "The pooled fit now says the dose is harmful, while all three stratum fits slope up. Same 180 patients, same +0.90 effect in each one — only the assignment rule changed."
                : "The pooled fit still agrees with the truth. Push the slider up: the reversal starts once the confounder explains enough of who gets which dose."}
          </p>
        </div>
      </div>
    </VizFrame>
  );
}
