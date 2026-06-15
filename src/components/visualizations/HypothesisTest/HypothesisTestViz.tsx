"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Hypothesis testing on the standard-normal null distribution. Move the observed
 * test statistic z and the significance level α; the viz shades the p-value
 * region (area at least as extreme as z, under H0) and the rejection region (the
 * α-tails). When the p-value ≤ α — equivalently, when z falls in the rejection
 * region — we reject H0. Toggle one- vs two-tailed.
 */

const W = 480;
const H = 240;
const M = { top: 16, right: 14, bottom: 36, left: 14 };
const XLO = -4;
const XHI = 4;

const pdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

/** Standard-normal CDF via the Abramowitz–Stegun erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = pdf(z);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/** z critical value for a one-tailed area α (z* such that P(Z>z*)=α). */
function zCritical(area: number): number {
  // bisection on the CDF
  let lo = 0,
    hi = 6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (1 - normalCdf(mid) > area) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function HypothesisTestViz({ className }: { className?: string }) {
  const [z, setZ] = useState(1.8);
  const [alpha, setAlpha] = useState(0.05);
  const [twoTailed, setTwoTailed] = useState(true);

  const pValue = twoTailed ? 2 * (1 - normalCdf(Math.abs(z))) : 1 - normalCdf(z);
  const reject = pValue <= alpha;
  const zCrit = twoTailed ? zCritical(alpha / 2) : zCritical(alpha);

  const x = scale(XLO, XHI, M.left, W - M.right);
  const peak = pdf(0);
  const y = scale(0, peak * 1.1, H - M.bottom, M.top);

  const curve = (() => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const xv = XLO + ((XHI - XLO) * i) / 240;
      pts.push(`${i === 0 ? "M" : "L"}${x(xv).toFixed(1)},${y(pdf(xv)).toFixed(1)}`);
    }
    return pts.join(" ");
  })();

  /** filled area under the curve between [a,b]. */
  function area(a: number, b: number, fill: string, opacity: number) {
    const pts: string[] = [`M${x(a).toFixed(1)},${(H - M.bottom).toFixed(1)}`];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const xv = a + ((b - a) * i) / steps;
      pts.push(`L${x(xv).toFixed(1)},${y(pdf(xv)).toFixed(1)}`);
    }
    pts.push(`L${x(b).toFixed(1)},${(H - M.bottom).toFixed(1)} Z`);
    return <path d={pts.join(" ")} fill={fill} opacity={opacity} />;
  }

  return (
    <VizFrame
      className={className}
      title="Hypothesis testing: p-value vs. significance level"
      caption="The bell is the null distribution of the test statistic. Rose shading is the rejection region (the α-tails); blue shading is the p-value — the probability, if H0 were true, of a statistic at least as extreme as the observed z. Reject H0 exactly when the p-value ≤ α, i.e. when z lands beyond the critical value."
    >
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="hypothesis test null distribution">
          {/* rejection region(s) — alpha tails */}
          {twoTailed && area(XLO, -zCrit, VIZ.rose, 0.35)}
          {area(zCrit, XHI, VIZ.rose, 0.35)}

          {/* p-value region(s) — beyond observed z */}
          {twoTailed && area(XLO, -Math.abs(z), VIZ.brand, 0.55)}
          {area(twoTailed ? Math.abs(z) : z, XHI, VIZ.brand, 0.55)}

          {/* null curve */}
          <path d={curve} fill="none" stroke={VIZ.textBright} strokeWidth={2} />

          {/* observed z line */}
          <line x1={x(z)} y1={M.top} x2={x(z)} y2={H - M.bottom} stroke={VIZ.yellow} strokeWidth={2} />
          <text x={x(z)} y={M.top - 4} fill={VIZ.yellow} fontSize={10} textAnchor="middle" fontFamily="monospace">
            z = {z.toFixed(2)}
          </text>

          {/* critical-value markers */}
          <text x={x(zCrit)} y={H - M.bottom + 14} fill={VIZ.rose} fontSize={8} textAnchor="middle" fontFamily="monospace">
            +z* {zCrit.toFixed(2)}
          </text>
          {twoTailed && (
            <text x={x(-zCrit)} y={H - M.bottom + 14} fill={VIZ.rose} fontSize={8} textAnchor="middle" fontFamily="monospace">
              -z* {(-zCrit).toFixed(2)}
            </text>
          )}

          {/* axis */}
          <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} />
          {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
            <text key={t} x={x(t)} y={H - M.bottom + 26} fill={VIZ.text} fontSize={8} textAnchor="middle" fontFamily="monospace">
              {t}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 mt-2">
        <div className="flex-1 min-w-[160px]">
          <VizSlider label="Observed z" min={0} max={4} step={0.05} value={z} onChange={setZ} format={(v) => v.toFixed(2)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <VizSlider label="Significance α" min={0.01} max={0.2} step={0.01} value={alpha} onChange={setAlpha} format={(v) => v.toFixed(2)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <VizButton onClick={() => setTwoTailed(true)} active={twoTailed}>Two-tailed</VizButton>
        <VizButton onClick={() => setTwoTailed(false)} active={!twoTailed}>One-tailed</VizButton>
        <VizStat label="p-value" value={pValue.toFixed(4)} color={VIZ.brand} />
        <VizStat label="α" value={alpha.toFixed(2)} color={VIZ.rose} />
        <VizStat label="decision" value={reject ? "reject H₀" : "fail to reject"} color={reject ? VIZ.teal : VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
