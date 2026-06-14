"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom, gaussian } from "../viz-kit";

/**
 * Low-rank decomposition of a weight-update matrix.
 *
 * Full fine-tuning learns a dense Δ ∈ ℝ^{d×d} (d² parameters). LoRA factors the
 * update as Δ ≈ B · A where B ∈ ℝ^{d×r}, A ∈ ℝ^{r×d}, total 2·d·r parameters.
 * We generate a target Δ that *truly* has rank r_true, then reconstruct it from
 * factors of user-selected rank r. The viz shows three heatmaps side-by-side
 * (target Δ, reconstruction B·A, residual) and reports parameter counts.
 */

const D = 12; // matrix dimension d×d
const R_TRUE = 4; // intrinsic rank of the target Δ
const CELL = 18; // pixel size of each heatmap cell
const GAP = 22; // horizontal gap between matrices

const W_TOTAL = 3 * D * CELL + 2 * GAP + 80;
const H_TOTAL = D * CELL + 60;

type Mat = number[][];

function zeros(rows: number, cols: number): Mat {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function matmul(A: Mat, B: Mat): Mat {
  const rows = A.length;
  const inner = B.length;
  const cols = B[0].length;
  const out = zeros(rows, cols);
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const a = A[i][k];
      for (let j = 0; j < cols; j++) {
        out[i][j] += a * B[k][j];
      }
    }
  }
  return out;
}

function buildFactors(rng: () => number, rows: number, cols: number): Mat {
  const M = zeros(rows, cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      M[i][j] = gaussian(rng, 0, 1);
    }
  }
  return M;
}

/** Frobenius norm. */
function frob(M: Mat): number {
  let s = 0;
  for (const row of M) for (const v of row) s += v * v;
  return Math.sqrt(s);
}

/** Element-wise subtract. */
function sub(A: Mat, B: Mat): Mat {
  const out = zeros(A.length, A[0].length);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      out[i][j] = A[i][j] - B[i][j];
    }
  }
  return out;
}

/** Map a signed value in [-vmax, vmax] to a brand/rose diverging colour. */
function colorFor(v: number, vmax: number): string {
  const t = Math.max(-1, Math.min(1, v / Math.max(vmax, 1e-9)));
  if (t >= 0) {
    // 0 → card, 1 → brand
    const a = t;
    const r = Math.round(0x1a + a * (0x63 - 0x1a));
    const g = Math.round(0x1d + a * (0x66 - 0x1d));
    const b = Math.round(0x27 + a * (0xf1 - 0x27));
    return `rgb(${r},${g},${b})`;
  } else {
    const a = -t;
    const r = Math.round(0x1a + a * (0xf4 - 0x1a));
    const g = Math.round(0x1d + a * (0x3f - 0x1d));
    const b = Math.round(0x27 + a * (0x5e - 0x27));
    return `rgb(${r},${g},${b})`;
  }
}

function Heatmap({
  M,
  x,
  y,
  vmax,
  label,
}: {
  M: Mat;
  x: number;
  y: number;
  vmax: number;
  label: string;
}) {
  const rows = M.length;
  const cols = M[0].length;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        x={(cols * CELL) / 2}
        y={-8}
        fill={VIZ.textBright}
        fontSize={11}
        textAnchor="middle"
        fontWeight={600}
      >
        {label}
      </text>
      {M.map((row, i) =>
        row.map((v, j) => (
          <rect
            key={`${i}-${j}`}
            x={j * CELL}
            y={i * CELL}
            width={CELL - 1}
            height={CELL - 1}
            fill={colorFor(v, vmax)}
            stroke={VIZ.grid}
            strokeWidth={0.5}
          />
        ))
      )}
      <text
        x={(cols * CELL) / 2}
        y={rows * CELL + 14}
        fill={VIZ.text}
        fontSize={10}
        textAnchor="middle"
        fontFamily="monospace"
      >
        {rows}×{cols}
      </text>
    </g>
  );
}

export function LoRAViz({ className }: { className?: string }) {
  const [r, setR] = useState(2);

  // Build a fixed target Δ with intrinsic rank R_TRUE. Memoised so the
  // colour scale and the matrix don't twitch as the user slides r.
  const { target, vmax } = useMemo(() => {
    const rng = seededRandom(42);
    const B_true = buildFactors(rng, D, R_TRUE);
    const A_true = buildFactors(rng, R_TRUE, D);
    const T = matmul(B_true, A_true);
    let m = 0;
    for (const row of T) for (const v of row) m = Math.max(m, Math.abs(v));
    return { target: T, vmax: m };
  }, []);

  // The LoRA factors of rank r approximate the target via random Gaussian
  // factors of matching column-space — for an illustrative viz we take the
  // top-r columns/rows of the original true factors when r ≤ R_TRUE, and pad
  // with extra Gaussian noise factors when r > R_TRUE. This way r = R_TRUE
  // reconstructs Δ exactly (intuitive "match the intrinsic rank").
  const { recon, residual, fNorm, rNorm } = useMemo(() => {
    const rng = seededRandom(42);
    const B_true = buildFactors(rng, D, R_TRUE);
    const A_true = buildFactors(rng, R_TRUE, D);

    let B: Mat, A: Mat;
    if (r <= R_TRUE) {
      B = B_true.map((row) => row.slice(0, r));
      A = A_true.slice(0, r);
    } else {
      // Use all R_TRUE rows + (r - R_TRUE) noise rows scaled down so they don't
      // dominate. Net effect: reconstruction is correct, noise adds tiny error.
      const extraRng = seededRandom(99);
      const extraB = buildFactors(extraRng, D, r - R_TRUE).map((row) =>
        row.map((v) => v * 0.0)
      );
      const extraA = buildFactors(extraRng, r - R_TRUE, D).map((row) =>
        row.map((v) => v * 0.0)
      );
      B = B_true.map((row, i) => [...row, ...extraB[i]]);
      A = [...A_true, ...extraA];
    }

    const recon = matmul(B, A);
    const residual = sub(target, recon);
    return {
      recon,
      residual,
      fNorm: frob(target),
      rNorm: frob(residual),
    };
  }, [r, target]);

  const fullParams = D * D;
  const loraParams = 2 * D * r;
  const savings = ((fullParams - loraParams) / fullParams) * 100;
  const relErr = (rNorm / Math.max(fNorm, 1e-9)) * 100;

  return (
    <VizFrame
      className={className}
      title="Low-rank update ΔW ≈ B · A"
      caption="A full update ΔW (left) is approximated by two skinny matrices: B (d×r) and A (r×d). Sliding rank r changes how many parameters LoRA stores — and how close the reconstruction gets. The target here has intrinsic rank 4, so r = 4 reconstructs it perfectly."
    >
      <svg
        viewBox={`0 0 ${W_TOTAL} ${H_TOTAL}`}
        className="w-full"
        role="img"
        aria-label="Low-rank decomposition of a weight update matrix"
      >
        <Heatmap M={target} x={10} y={30} vmax={vmax} label="target ΔW" />
        <text
          x={10 + D * CELL + GAP / 2}
          y={30 + (D * CELL) / 2 + 5}
          fill={VIZ.textBright}
          fontSize={18}
          textAnchor="middle"
        >
          ≈
        </text>
        <Heatmap
          M={recon}
          x={10 + D * CELL + GAP}
          y={30}
          vmax={vmax}
          label={`B · A  (rank ${r})`}
        />
        <text
          x={10 + 2 * D * CELL + 1.5 * GAP}
          y={30 + (D * CELL) / 2 + 5}
          fill={VIZ.textBright}
          fontSize={18}
          textAnchor="middle"
        >
          −
        </text>
        <Heatmap
          M={residual}
          x={10 + 2 * D * CELL + 2 * GAP}
          y={30}
          vmax={vmax}
          label="residual"
        />
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider
          label="rank r"
          min={1}
          max={8}
          step={1}
          value={r}
          onChange={(v) => setR(Math.round(v))}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <VizStat
          label="full ΔW params"
          value={`${fullParams} (d²)`}
          color={VIZ.rose}
        />
        <VizStat
          label="LoRA params"
          value={`${loraParams} (2·d·r)`}
          color={VIZ.teal}
        />
        <VizStat
          label="params saved"
          value={`${savings.toFixed(0)}%`}
          color={VIZ.brand}
        />
        <VizStat
          label="reconstruction error"
          value={`${relErr.toFixed(1)}%`}
          color={relErr < 1 ? VIZ.teal : relErr < 30 ? VIZ.yellow : VIZ.rose}
        />
      </div>
    </VizFrame>
  );
}
