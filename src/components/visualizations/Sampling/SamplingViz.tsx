"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Decoding / sampling visualization.
 *
 * Shows the next-token probability distribution for a fixed prompt and lets the
 * reader reshape it with two controls:
 *   - temperature: probs = softmax(logits / T). Low T → peaky (greedy), high T → flat.
 *   - top-p (nucleus): keep the smallest set of tokens whose cumulative prob ≥ p,
 *     then renormalise. Excluded tokens are greyed out.
 *
 * Logits are hand-chosen for the prompt "The cat sat on the ___" so the demo is
 * deterministic and readable; no randomness needed.
 */

const TOKENS = ["mat", "floor", "sofa", "roof", "table", "bed", "grass", "moon"];
const BASE_LOGITS = [3.2, 2.6, 2.1, 1.0, 1.7, 1.3, 0.4, -0.5];

const W = 500;
const H = 300;
const M = { top: 16, right: 16, bottom: 46, left: 38 };

function softmaxT(logits: number[], T: number): number[] {
  const z = logits.map((l) => l / Math.max(T, 1e-3));
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export function SamplingViz({ className }: { className?: string }) {
  const [temp, setTemp] = useState(1);
  const [topP, setTopP] = useState(1);

  const { probs, kept, entropy, keptMass } = useMemo(() => {
    const probs = softmaxT(BASE_LOGITS, temp);
    const order = [...probs.keys()].sort((a, b) => probs[b] - probs[a]);
    const kept = new Set<number>();
    let cum = 0;
    for (const i of order) {
      kept.add(i);
      cum += probs[i];
      if (cum >= topP) break;
    }
    const entropy = -probs.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);
    const keptMass = [...kept].reduce((a, i) => a + probs[i], 0);
    return { probs, kept, entropy, keptMass };
  }, [temp, topP]);

  const maxP = Math.max(...probs);
  const sy = scale(0, maxP, H - M.bottom, M.top);
  const bw = (W - M.left - M.right) / TOKENS.length;

  return (
    <VizFrame
      className={className}
      title="Decoding: Temperature & Nucleus (top-p) Sampling"
      caption="Next-token distribution after “The cat sat on the ___”. Temperature reshapes the distribution (low → peaky/greedy, high → flat/creative); top-p keeps only the smallest set of tokens whose probability sums to p (greyed-out bars are excluded), then renormalises the survivors."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="next-token probability distribution">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = f * maxP;
          return (
            <g key={f}>
              <line x1={M.left} y1={sy(v)} x2={W - M.right} y2={sy(v)} stroke={VIZ.grid} strokeWidth={1} opacity={0.5} />
              <text x={M.left - 4} y={sy(v) + 3} fill={VIZ.text} fontSize={9} textAnchor="end">
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}
        {TOKENS.map((tok, i) => {
          const inNucleus = kept.has(i);
          const x = M.left + i * bw + bw * 0.15;
          const w = bw * 0.7;
          const h = H - M.bottom - sy(probs[i]);
          return (
            <g key={tok}>
              <rect
                x={x}
                y={sy(probs[i])}
                width={w}
                height={Math.max(0, h)}
                rx={3}
                fill={inNucleus ? VIZ.brand : VIZ.grid}
                fillOpacity={inNucleus ? 0.9 : 0.5}
                stroke={inNucleus ? VIZ.brandLight : VIZ.axis}
                strokeWidth={1}
              />
              <text x={x + w / 2} y={H - M.bottom + 14} fill={inNucleus ? VIZ.textBright : VIZ.text} fontSize={10} textAnchor="middle">
                {tok}
              </text>
              <text x={x + w / 2} y={H - M.bottom + 26} fill={VIZ.text} fontSize={8} textAnchor="middle">
                {(probs[i] * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VizSlider label="temperature" min={0.1} max={2} step={0.05} value={temp} onChange={setTemp} format={(v) => v.toFixed(2)} />
        <VizSlider label="top-p (nucleus)" min={0.05} max={1} step={0.05} value={topP} onChange={setTopP} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex gap-6 flex-wrap mt-3">
        <VizStat label="tokens kept" value={`${kept.size} / ${TOKENS.length}`} color={VIZ.brand} />
        <VizStat label="nucleus mass" value={`${(keptMass * 100).toFixed(0)}%`} color={VIZ.teal} />
        <VizStat label="entropy (bits)" value={entropy.toFixed(2)} />
      </div>
    </VizFrame>
  );
}
