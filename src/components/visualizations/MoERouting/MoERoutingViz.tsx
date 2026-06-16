"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom } from "../viz-kit";

/**
 * Mixture-of-Experts routing. A gating network scores every token against every
 * expert; each token is sent only to its top-k experts (sparse routing). Pick
 * top-k and a token to see which experts it activates — and watch the per-expert
 * load, the thing load-balancing losses try to keep even.
 */

const N_TOK = 6;
const N_EXP = 5;

// deterministic gate logits: token t, expert e
const GATES: number[][] = (() => {
  const rng = seededRandom(11);
  return Array.from({ length: N_TOK }, () =>
    Array.from({ length: N_EXP }, () => rng())
  );
})();

const TOKENS = ["The", "cat", "sat", "on", "the", "mat"];

function topK(scores: number[], k: number): number[] {
  return scores
    .map((s, i) => [s, i] as [number, number])
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map((p) => p[1]);
}

function softmaxOver(scores: number[], idxs: number[]): Record<number, number> {
  const m = Math.max(...idxs.map((i) => scores[i]));
  const exp = idxs.map((i) => Math.exp(scores[i] - m));
  const sum = exp.reduce((a, b) => a + b, 0);
  const out: Record<number, number> = {};
  idxs.forEach((i, j) => (out[i] = exp[j] / sum));
  return out;
}

export function MoERoutingViz({ className }: { className?: string }) {
  const [k, setK] = useState(2);
  const [sel, setSel] = useState(1);

  // routing for every token (for the load counts)
  const routes = GATES.map((g) => topK(g, k));
  const load = Array.from({ length: N_EXP }, (_, e) => routes.filter((r) => r.includes(e)).length);
  const selRoute = routes[sel];
  const selWeights = softmaxOver(GATES[sel], selRoute);

  const tokX = 70;
  const expX = 360;
  const tokY = (i: number) => 30 + i * 32;
  const expY = (i: number) => 40 + i * 36;

  return (
    <VizFrame
      className={className}
      title="Mixture-of-Experts routing"
      caption="A gating network scores each token against every expert; the token is processed by only its top-k experts (sparse routing), and their outputs are combined by the gate weights. Pick a token to see its experts and gate weights. The per-expert load is what load-balancing losses keep even — an overloaded expert bottlenecks, an idle one wastes capacity."
    >
      <div className="overflow-x-auto">
        <svg viewBox="0 0 460 230" width="100%" role="img" aria-label="mixture of experts routing">
          {/* routing lines for the selected token */}
          {selRoute.map((e) => (
            <line
              key={`edge-${e}`}
              x1={tokX + 34}
              y1={tokY(sel)}
              x2={expX - 6}
              y2={expY(e)}
              stroke={VIZ.brand}
              strokeWidth={1 + 5 * selWeights[e]}
              opacity={0.8}
            />
          ))}

          {/* tokens */}
          <text x={tokX} y={16} fill={VIZ.text} fontSize={9} textAnchor="middle" fontFamily="monospace">tokens</text>
          {TOKENS.map((t, i) => (
            <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
              <rect x={tokX - 30} y={tokY(i) - 12} width={64} height={24} rx={5}
                fill={i === sel ? VIZ.brand : VIZ.card} stroke={i === sel ? VIZ.brandLight : VIZ.grid} strokeWidth={i === sel ? 2 : 1} />
              <text x={tokX} y={tokY(i) + 4} fill={VIZ.textBright} fontSize={11} textAnchor="middle" fontFamily="monospace">{t}</text>
            </g>
          ))}

          {/* experts */}
          <text x={expX + 28} y={16} fill={VIZ.text} fontSize={9} textAnchor="middle" fontFamily="monospace">experts (load)</text>
          {Array.from({ length: N_EXP }, (_, e) => {
            const active = selRoute.includes(e);
            const loadFrac = load[e] / N_TOK;
            return (
              <g key={e}>
                <rect x={expX} y={expY(e) - 13} width={56} height={26} rx={5}
                  fill={active ? `rgba(99,102,241,${0.3 + 0.5 * (selWeights[e] || 0)})` : VIZ.card}
                  stroke={active ? VIZ.brandLight : VIZ.grid} strokeWidth={active ? 2 : 1} />
                <text x={expX + 28} y={expY(e) + 4} fill={VIZ.textBright} fontSize={10} textAnchor="middle" fontFamily="monospace">E{e}</text>
                {/* load bar */}
                <rect x={expX + 62} y={expY(e) - 5} width={40 * loadFrac} height={10} rx={2}
                  fill={load[e] > Math.ceil((N_TOK * k) / N_EXP) ? VIZ.rose : VIZ.teal} />
                <text x={expX + 106} y={expY(e) + 4} fill={VIZ.text} fontSize={9} fontFamily="monospace">{load[e]}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 max-w-xs">
        <VizSlider label="Top-k (experts per token)" min={1} max={3} step={1} value={k} onChange={(v) => setK(Math.round(v))} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="experts" value={String(N_EXP)} />
        <VizStat label="active / token" value={`${k} of ${N_EXP}`} color={VIZ.brandLight} />
        <VizStat label="selected" value={`"${TOKENS[sel]}" → ${selRoute.map((e) => `E${e}`).join(", ")}`} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
