"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom, gaussian } from "../viz-kit";

/**
 * Post-training quantization on a tiny weight matrix.
 *
 * Slider sets the bit-width b ∈ {1, 2, 4, 8, 16, 32}. The viz shows the
 * original FP32 weights next to their uniform-quantized reconstruction at b
 * bits (2^b levels mapped over [-max|w|, +max|w|]). Stats: memory for a 7B
 * model at this bit-width, and a quantization-noise proxy for accuracy loss.
 */

const D = 14;
const CELL = 16;
const GAP = 30;
const BITS_OPTIONS = [1, 2, 4, 8, 16, 32] as const;
const PARAM_COUNT_7B = 7_000_000_000;

type Mat = number[][];

function zeros(rows: number, cols: number): Mat {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function quantize(M: Mat, bits: number): { Q: Mat; vmax: number } {
  let vmax = 0;
  for (const row of M) for (const v of row) vmax = Math.max(vmax, Math.abs(v));
  if (bits >= 32) return { Q: M.map((r) => [...r]), vmax };
  const levels = Math.pow(2, bits);
  const step = (2 * vmax) / (levels - 1);
  const Q = zeros(M.length, M[0].length);
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      const idx = Math.round((M[i][j] + vmax) / step);
      Q[i][j] = idx * step - vmax;
    }
  }
  return { Q, vmax };
}

function colorFor(v: number, vmax: number): string {
  const t = Math.max(-1, Math.min(1, v / Math.max(vmax, 1e-9)));
  if (t >= 0) {
    const a = t;
    const r = Math.round(0x1a + a * (0x63 - 0x1a));
    const g = Math.round(0x1d + a * (0x66 - 0x1d));
    const b = Math.round(0x27 + a * (0xf1 - 0x27));
    return `rgb(${r},${g},${b})`;
  }
  const a = -t;
  const r = Math.round(0x1a + a * (0xf4 - 0x1a));
  const g = Math.round(0x1d + a * (0x3f - 0x1d));
  const b = Math.round(0x27 + a * (0x5e - 0x27));
  return `rgb(${r},${g},${b})`;
}

function Heatmap({ M, x, y, vmax, label }: { M: Mat; x: number; y: number; vmax: number; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x={(M[0].length * CELL) / 2} y={-8} fill={VIZ.textBright} fontSize={11} textAnchor="middle" fontWeight={600}>
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
    </g>
  );
}

function formatBytes(bytesPerParam: number): string {
  const total = bytesPerParam * PARAM_COUNT_7B;
  const gb = total / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

const W_TOTAL = 2 * D * CELL + GAP + 40;
const H_TOTAL = D * CELL + 50;

export function QuantizationViz({ className }: { className?: string }) {
  const [bitsIdx, setBitsIdx] = useState(3); // default 8 bits

  const original = useMemo(() => {
    const rng = seededRandom(7);
    const M: Mat = zeros(D, D);
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) M[i][j] = gaussian(rng, 0, 1);
    return M;
  }, []);

  const bits = BITS_OPTIONS[bitsIdx];
  const { Q, vmax } = useMemo(() => quantize(original, bits), [original, bits]);

  // Quantization noise (Frobenius norm of error / Frobenius norm of original).
  const { noisePct, levels } = useMemo(() => {
    let num = 0;
    let den = 0;
    for (let i = 0; i < D; i++) {
      for (let j = 0; j < D; j++) {
        const d = original[i][j] - Q[i][j];
        num += d * d;
        den += original[i][j] * original[i][j];
      }
    }
    return {
      noisePct: (Math.sqrt(num) / Math.max(Math.sqrt(den), 1e-9)) * 100,
      levels: Math.pow(2, bits),
    };
  }, [original, Q]);

  const bytesPerParam = bits / 8;
  const memory = formatBytes(bytesPerParam);

  return (
    <VizFrame
      className={className}
      title="Post-training quantization: bit-width vs accuracy"
      caption="Original FP32 weights (left) compressed to a discrete grid of 2^b levels (right). Lower bit-width shrinks the model — and adds quantization noise. The memory line assumes a 7B-parameter model."
    >
      <svg
        viewBox={`0 0 ${W_TOTAL} ${H_TOTAL}`}
        className="w-full"
        role="img"
        aria-label="Weight matrix quantization across bit-widths"
      >
        <Heatmap M={original} x={10} y={30} vmax={vmax} label="FP32 weights" />
        <text
          x={10 + D * CELL + GAP / 2}
          y={30 + (D * CELL) / 2 + 5}
          fill={VIZ.textBright}
          fontSize={16}
          textAnchor="middle"
        >
          →
        </text>
        <Heatmap M={Q} x={10 + D * CELL + GAP} y={30} vmax={vmax} label={`${bits}-bit weights`} />
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider
          label={`bit-width: ${bits}`}
          min={0}
          max={BITS_OPTIONS.length - 1}
          step={1}
          value={bitsIdx}
          onChange={(v) => setBitsIdx(Math.round(v))}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <VizStat label="bit-width" value={`${bits}-bit`} color={VIZ.brand} />
        <VizStat label="levels" value={`${levels.toLocaleString()}`} color={VIZ.teal} />
        <VizStat label="7B model memory" value={memory} color={VIZ.orange} />
        <VizStat
          label="quantization error"
          value={`${noisePct.toFixed(1)}%`}
          color={noisePct < 2 ? VIZ.teal : noisePct < 15 ? VIZ.yellow : VIZ.rose}
        />
      </div>
    </VizFrame>
  );
}
