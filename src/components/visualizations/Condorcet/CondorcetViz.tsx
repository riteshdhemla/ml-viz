"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Condorcet's jury theorem, live: P(majority correct) as a function of the
 * number of voters N (odd), for a chosen per-agent accuracy p. Drag p below
 * 0.5 and the curve flips — a majority of below-chance agents is *worse*
 * than one agent, the theorem's independence/competence fine print.
 */

const ODD_N = Array.from({ length: 13 }, (_, i) => 2 * i + 1); // 1..25

function binomCoeff(n: number, k: number) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
}

function majorityCorrect(n: number, p: number) {
  let sum = 0;
  for (let k = Math.ceil(n / 2); k <= n; k++) {
    sum += binomCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }
  return sum;
}

export function CondorcetViz({ className }: { className?: string }) {
  const [p, setP] = useState(0.7);

  const W = 640;
  const H = 300;
  const M = { top: 16, right: 16, bottom: 34, left: 44 };
  const x = scale(1, 25, M.left, W - M.right);
  const y = scale(0, 1, H - M.bottom, M.top);

  const pts = ODD_N.map((n) => ({ n, v: majorityCorrect(n, p) }));
  const path = pts.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.n)},${y(d.v)}`).join(" ");
  const at11 = majorityCorrect(11, p);

  return (
    <VizFrame
      title="Condorcet's jury theorem — majority accuracy vs. jury size"
      caption="Each point is the probability that a majority of N independent agents is correct when each is right with probability p. Above p = 0.5 the curve climbs toward 1 as N grows; drag p below 0.5 and adding agents makes the majority worse — and with correlated errors (shared base model), real systems sit closer to the single-agent line than this ideal curve."
      className={className}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
        <div className="w-56">
          <VizSlider
            label="per-agent accuracy p"
            min={0.3}
            max={0.95}
            step={0.01}
            value={p}
            onChange={setP}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <div className="flex gap-5">
          <VizStat label="single agent" value={p.toFixed(2)} />
          <VizStat
            label="majority of 11"
            value={at11.toFixed(3)}
            color={at11 >= p ? VIZ.teal : VIZ.rose}
          />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Majority accuracy versus number of agents">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={M.left} y1={y(v)} x2={W - M.right} y2={y(v)} stroke={VIZ.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(v) + 3} fill={VIZ.text} fontSize={10} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {ODD_N.filter((n) => n % 4 === 1).map((n) => (
          <text key={n} x={x(n)} y={H - M.bottom + 16} fill={VIZ.text} fontSize={10} textAnchor="middle">
            {n}
          </text>
        ))}
        <text x={(M.left + W - M.right) / 2} y={H - 4} fill={VIZ.text} fontSize={10} textAnchor="middle">
          number of agents N (odd)
        </text>

        {/* single-agent baseline */}
        <line
          x1={M.left}
          y1={y(p)}
          x2={W - M.right}
          y2={y(p)}
          stroke={VIZ.text}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text x={W - M.right - 4} y={y(p) - 5} fill={VIZ.text} fontSize={9} textAnchor="end">
          single agent (p)
        </text>

        {/* chance line at 0.5 */}
        <line x1={M.left} y1={y(0.5)} x2={W - M.right} y2={y(0.5)} stroke={VIZ.rose} strokeWidth={1} strokeDasharray="2 5" opacity={0.6} />

        <path d={path} fill="none" stroke={VIZ.brand} strokeWidth={2.5} />
        {pts.map((d) => (
          <circle key={d.n} cx={x(d.n)} cy={y(d.v)} r={3.5} fill={VIZ.brand} />
        ))}
      </svg>
    </VizFrame>
  );
}
