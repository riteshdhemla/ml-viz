"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat } from "../viz-kit";

/**
 * Forward vs reverse KL — mode-covering vs mode-seeking.
 *
 * The truth p is a fixed bimodal distribution over discrete bins. The model q
 * is a single Gaussian the reader controls with mean μ and width σ. Two buttons
 * grid-search the q that minimizes forward KL(p‖q) (which spreads q to cover
 * both modes) versus reverse KL(q‖p) (which locks q onto one mode), making the
 * lesson's "same formula, opposite personalities" claim tangible.
 */

const W = 480;
const H = 240;
const M = { top: 14, right: 14, bottom: 28, left: 36 };

const N = 13; // bins
const X_LO = -4;
const X_HI = 4;
const XS = Array.from({ length: N }, (_, i) => X_LO + ((i + 0.5) / N) * (X_HI - X_LO));
const FLOOR = 1e-4; // keep q strictly positive so KL stays finite

/** Fixed bimodal "truth": peaks near −2 and +1.3, the right one heavier. */
const P = (() => {
  const raw = XS.map((x) => 1.0 * Math.exp(-((x + 2) ** 2) / (2 * 0.5 ** 2)) + 1.4 * Math.exp(-((x - 1.3) ** 2) / (2 * 0.6 ** 2)));
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / s);
})();

/** Discretized + normalized Gaussian(μ, σ) over the bins, with a small floor. */
function qDist(mu: number, sigma: number): number[] {
  const raw = XS.map((x) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) + FLOOR);
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / s);
}

function klForward(p: number[], q: number[]) {
  return p.reduce((acc, pi, i) => acc + (pi > 0 ? pi * Math.log(pi / q[i]) : 0), 0);
}
function klReverse(p: number[], q: number[]) {
  return q.reduce((acc, qi, i) => acc + (qi > 0 ? qi * Math.log(qi / p[i]) : 0), 0);
}

/** Grid-search μ, σ minimizing the chosen divergence — used by the two buttons. */
function bestFit(direction: "forward" | "reverse"): { mu: number; sigma: number } {
  let best = { mu: 0, sigma: 1, val: Infinity };
  for (let mu = X_LO; mu <= X_HI; mu += 0.1) {
    for (let sigma = 0.4; sigma <= 3; sigma += 0.05) {
      const q = qDist(mu, sigma);
      const val = direction === "forward" ? klForward(P, q) : klReverse(P, q);
      if (val < best.val) best = { mu, sigma, val };
    }
  }
  return { mu: Math.round(best.mu * 10) / 10, sigma: Math.round(best.sigma * 20) / 20 };
}

const H_P = -P.reduce((a, pi) => a + (pi > 0 ? pi * Math.log(pi) : 0), 0);

export function KLDivergenceViz({ className }: { className?: string }) {
  const [mu, setMu] = useState(-0.4);
  const [sigma, setSigma] = useState(2.4);

  const q = useMemo(() => qDist(mu, sigma), [mu, sigma]);
  const klF = klForward(P, q);
  const klR = klReverse(P, q);
  const crossEntropy = H_P + klF;

  const barW = (W - M.left - M.right) / N;
  const maxY = Math.max(...P, ...q) * 1.1;
  const py = (v: number) => M.top + (1 - v / maxY) * (H - M.top - M.bottom);
  const baseY = py(0);

  return (
    <VizFrame
      className={className}
      title="Forward vs reverse KL: mode-covering vs mode-seeking"
      caption="The truth p (grey) is bimodal; your model q (indigo) is a single Gaussian you steer with μ and σ. Forward KL(p‖q) blows up wherever p has mass but q doesn't, so its best fit spreads q to COVER both modes. Reverse KL(q‖p) blows up wherever q has mass but p doesn't, so its best fit LOCKS onto one mode and ignores the other. Same formula, opposite personalities."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="forward vs reverse KL divergence">
        <line x1={M.left} y1={baseY} x2={W - M.right} y2={baseY} stroke={VIZ.axis} strokeWidth={1} />
        {/* p bars (truth) */}
        {P.map((pi, i) => (
          <rect key={`p${i}`} x={M.left + i * barW + 1} y={py(pi)} width={barW - 2} height={baseY - py(pi)} fill={VIZ.text} opacity={0.45} rx={1.5} />
        ))}
        {/* q outline (model) */}
        <path
          d={q.map((qi, i) => `${i === 0 ? "M" : "L"}${(M.left + (i + 0.5) * barW).toFixed(1)},${py(qi).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={VIZ.brand}
          strokeWidth={2.5}
        />
        {q.map((qi, i) => (
          <circle key={`q${i}`} cx={M.left + (i + 0.5) * barW} cy={py(qi)} r={2.6} fill={VIZ.brand} />
        ))}
        {/* x ticks */}
        {[-2, 0, 1.3].map((x) => {
          const cx = M.left + ((x - X_LO) / (X_HI - X_LO)) * (W - M.left - M.right);
          return (
            <text key={x} x={cx} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="middle">
              {x}
            </text>
          );
        })}
        <text x={M.left + 4} y={M.top + 10} fill={VIZ.text} fontSize={10}>■ p (truth)</text>
        <text x={M.left + 70} y={M.top + 10} fill={VIZ.brand} fontSize={10}>— q (model)</text>
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => { const f = bestFit("forward"); setMu(f.mu); setSigma(f.sigma); }}>
          Cover: min KL(p‖q)
        </VizButton>
        <VizButton onClick={() => { const r = bestFit("reverse"); setMu(r.mu); setSigma(r.sigma); }}>
          Lock mode: min KL(q‖p)
        </VizButton>
      </div>

      <div className="mt-3 mb-3 grid sm:grid-cols-2 gap-x-6 gap-y-3">
        <VizSlider label="μ (model mean)" min={X_LO} max={X_HI} step={0.1} value={mu} onChange={setMu} format={(v) => v.toFixed(1)} />
        <VizSlider label="σ (model width)" min={0.4} max={3} step={0.05} value={sigma} onChange={setSigma} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex flex-wrap gap-6">
        <VizStat label="H(p)" value={H_P.toFixed(3)} />
        <VizStat label="cross-entropy H(p,q)" value={crossEntropy.toFixed(3)} color={VIZ.textBright} />
        <VizStat label="forward KL(p‖q)" value={klF.toFixed(3)} color={VIZ.teal} />
        <VizStat label="reverse KL(q‖p)" value={klR.toFixed(3)} color={VIZ.orange} />
      </div>
    </VizFrame>
  );
}
