"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom } from "../viz-kit";

/**
 * Matrix factorization for recommendation. A user–item rating matrix R is
 * approximated by a low-rank product Û = U·Vᵀ, where U holds k latent factors
 * per user and V holds k per item. The true matrix here is rank-3; slide the
 * model rank k from 1→3 and watch the reconstruction approach the target (RMSE
 * falling). Low rank = "a few hidden tastes explain most ratings."
 */

const N = 6; // users
const M = 6; // items
const TRUE_RANK = 3;

// Deterministic ground-truth factors → a genuinely rank-3 rating matrix.
const { Ufull, Vfull, R } = (() => {
  const rng = seededRandom(7);
  const Ufull = Array.from({ length: N }, () =>
    Array.from({ length: TRUE_RANK }, () => rng() * 2 - 1)
  );
  const Vfull = Array.from({ length: M }, () =>
    Array.from({ length: TRUE_RANK }, () => rng() * 2 - 1)
  );
  const R = Ufull.map((u) =>
    Vfull.map((v) => u.reduce((s, uk, k) => s + uk * v[k], 0))
  );
  return { Ufull, Vfull, R };
})();

function reconstruct(k: number): number[][] {
  return Ufull.map((u) =>
    Vfull.map((v) => {
      let s = 0;
      for (let r = 0; r < k; r++) s += u[r] * v[r];
      return s;
    })
  );
}

const allVals = R.flat();
const LO = Math.min(...allVals);
const HI = Math.max(...allVals);

function color(v: number): string {
  const t = Math.max(0, Math.min(1, (v - LO) / (HI - LO)));
  const r = Math.round(0x1a + t * (0x6b - 0x1a));
  const g = Math.round(0x1d + t * (0x72 - 0x1d));
  const b = Math.round(0x27 + t * (0xf1 - 0x27));
  return `rgb(${r},${g},${b})`;
}

function Grid({ data, label, x0 }: { data: number[][]; label: string; x0: number }) {
  const cell = 22;
  const gap = 2;
  return (
    <g>
      <text x={x0} y={10} fill={VIZ.text} fontSize={9} fontFamily="monospace">
        {label}
      </text>
      {data.map((row, i) =>
        row.map((v, j) => (
          <rect
            key={`${i}-${j}`}
            x={x0 + j * (cell + gap)}
            y={16 + i * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={color(v)}
            stroke={VIZ.grid}
            strokeWidth={0.5}
          />
        ))
      )}
    </g>
  );
}

export function MatrixFactorizationViz({ className }: { className?: string }) {
  const [k, setK] = useState(1);
  const Rhat = reconstruct(k);

  const mse =
    R.flat().reduce((s, v, idx) => {
      const i = Math.floor(idx / M);
      const j = idx % M;
      return s + (v - Rhat[i][j]) ** 2;
    }, 0) /
    (N * M);
  const rmse = Math.sqrt(mse);

  const params = (N + M) * k;
  const full = N * M;

  return (
    <VizFrame
      className={className}
      title="Matrix factorization: low-rank reconstruction"
      caption="The 6×6 rating matrix R (left) is genuinely rank-3. A model with rank k approximates it as U·Vᵀ — k latent factors per user and per item. Raise k: the reconstruction (right) approaches R and the RMSE falls to ~0 at k=3. A few latent 'tastes' reconstruct the whole matrix with far fewer numbers than storing it directly."
    >
      <div className="overflow-x-auto">
        <svg viewBox="0 0 340 180" width="100%" role="img" aria-label="matrix factorization reconstruction">
          <Grid data={R} label="R (true ratings)" x0={4} />
          <text x={160} y={95} fill={VIZ.text} fontSize={16} textAnchor="middle">
            ≈
          </text>
          <text x={160} y={112} fill={VIZ.text} fontSize={8} textAnchor="middle" fontFamily="monospace">
            U·Vᵀ
          </text>
          <Grid data={Rhat} label={`reconstruction (rank ${k})`} x0={196} />
        </svg>
      </div>

      <div className="mt-3 max-w-xs">
        <VizSlider
          label="Model rank k"
          min={1}
          max={5}
          step={1}
          value={k}
          onChange={(v) => setK(Math.round(v))}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="true rank" value={String(TRUE_RANK)} color={VIZ.teal} />
        <VizStat label="RMSE" value={rmse.toFixed(3)} color={rmse < 0.01 ? VIZ.teal : VIZ.yellow} />
        <VizStat label="params stored" value={`${params} vs ${full}`} color={VIZ.brandLight} />
      </div>
    </VizFrame>
  );
}
