"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom, gaussian } from "../viz-kit";

/**
 * Eckart–Young low-rank approximation. We build a known matrix
 *   A = Σ σ_i u_i v_iᵀ
 * from orthonormal u_i, v_i (Gram–Schmidt) and a chosen, decaying singular-value
 * spectrum — so the SVD is exact by construction, no numerical solver needed.
 * The reader sweeps the truncation rank k and watches the rank-k reconstruction
 * sharpen while the Frobenius error √(Σ_{i>k} σ_i²) falls, exactly as the
 * theorem promises.
 */

const SZ = 20; // matrix is SZ × SZ
const R = 8; // number of nonzero singular values
const SIGMAS = [9, 6, 4.2, 2.6, 1.3, 0.7, 0.35, 0.18]; // steep then a noise floor
const CELL = 11;

/** Gram–Schmidt: r orthonormal vectors in R^SZ from a deterministic seed. */
function orthonormal(seed: number): number[][] {
  const rng = seededRandom(seed);
  const vecs: number[][] = [];
  for (let i = 0; i < R; i++) {
    let v = Array.from({ length: SZ }, () => gaussian(rng));
    for (const u of vecs) {
      const dot = v.reduce((s, x, j) => s + x * u[j], 0);
      v = v.map((x, j) => x - dot * u[j]);
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    vecs.push(v.map((x) => x / norm));
  }
  return vecs;
}

const U = orthonormal(7);
const V = orthonormal(42);

/** Reconstruction using the first k rank-1 layers (k = R ⇒ the full matrix A). */
function reconstruct(k: number): number[][] {
  const out = Array.from({ length: SZ }, () => new Array(SZ).fill(0));
  for (let r = 0; r < k; r++) {
    const s = SIGMAS[r];
    for (let i = 0; i < SZ; i++) for (let j = 0; j < SZ; j++) out[i][j] += s * U[r][i] * V[r][j];
  }
  return out;
}

const FULL = reconstruct(R);
const ABS_MAX = Math.max(...FULL.flat().map(Math.abs));
const TOTAL_ENERGY = SIGMAS.reduce((s, v) => s + v * v, 0);

/** Diverging teal↔rose heatmap for a signed matrix value. */
function color(v: number): string {
  const t = Math.max(-1, Math.min(1, v / ABS_MAX));
  if (t >= 0) return `rgba(20, 184, 166, ${(0.12 + 0.88 * t).toFixed(3)})`;
  return `rgba(244, 63, 94, ${(0.12 + 0.88 * -t).toFixed(3)})`;
}

function Heatmap({ data, label }: { data: number[][]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${SZ * CELL} ${SZ * CELL}`} className="w-full max-w-[220px]" role="img" aria-label={label}>
        {data.map((row, i) =>
          row.map((v, j) => <rect key={`${i}-${j}`} x={j * CELL} y={i * CELL} width={CELL} height={CELL} fill={color(v)} />)
        )}
      </svg>
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

export function LowRankViz({ className }: { className?: string }) {
  const [k, setK] = useState(2);

  const approx = useMemo(() => reconstruct(k), [k]);
  const tailError = Math.sqrt(SIGMAS.slice(k).reduce((s, v) => s + v * v, 0));
  const energy = (SIGMAS.slice(0, k).reduce((s, v) => s + v * v, 0) / TOTAL_ENERGY) * 100;
  const storedNumbers = k * (2 * SZ); // k layers × (one u + one v column)
  const fullNumbers = SZ * SZ;

  const specW = 460;
  const specH = 120;
  const barW = (specW - 40) / R;
  const sMax = SIGMAS[0] * 1.1;

  return (
    <VizFrame
      className={className}
      title="Low-rank approximation: keep the biggest layers, drop the rest"
      caption="A is rebuilt from its rank-1 layers σᵢ uᵢ vᵢᵀ, biggest singular value first. Truncating to the top k layers gives the provably best rank-k approximation (Eckart–Young), with Frobenius error √(Σ_{i>k} σᵢ²) — the height of the bars you discarded. The spectrum's steep drop then flat tail means a handful of layers carry almost all the signal."
    >
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Heatmap data={FULL} label={`original A (rank ${R})`} />
        <Heatmap data={approx} label={`rank-${k} approximation`} />
      </div>

      {/* singular-value spectrum with the cut line at k */}
      <svg viewBox={`0 0 ${specW} ${specH}`} className="w-full" role="img" aria-label="singular value spectrum">
        <line x1={30} y1={specH - 22} x2={specW - 10} y2={specH - 22} stroke={VIZ.axis} strokeWidth={1} />
        {SIGMAS.map((s, i) => {
          const h = (s / sMax) * (specH - 36);
          const kept = i < k;
          return (
            <g key={i}>
              <rect
                x={34 + i * barW}
                y={specH - 22 - h}
                width={barW - 6}
                height={h}
                fill={kept ? VIZ.teal : VIZ.grid}
                stroke={kept ? "none" : VIZ.axis}
                strokeWidth={1}
                rx={1.5}
              />
              <text x={34 + i * barW + (barW - 6) / 2} y={specH - 9} fill={VIZ.text} fontSize={9} textAnchor="middle">
                {i + 1}
              </text>
            </g>
          );
        })}
        {/* cut line between kept and discarded layers */}
        {k < R && k > 0 && (
          <line x1={34 + k * barW - 3} y1={6} x2={34 + k * barW - 3} y2={specH - 22} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="3 3" />
        )}
        <text x={2} y={14} fill={VIZ.text} fontSize={9}>σ</text>
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="truncation rank k" min={0} max={R} step={1} value={k} onChange={setK} format={(v) => `${v} / ${R}`} />
      </div>

      <div className="flex flex-wrap gap-6">
        <VizStat label="Frobenius error" value={tailError.toFixed(3)} color={tailError < 1 ? VIZ.teal : VIZ.rose} />
        <VizStat label="energy captured" value={`${energy.toFixed(1)}%`} color={VIZ.teal} />
        <VizStat label="numbers stored" value={`${storedNumbers} / ${fullNumbers}`} color={storedNumbers < fullNumbers ? VIZ.teal : VIZ.textBright} />
      </div>
    </VizFrame>
  );
}
