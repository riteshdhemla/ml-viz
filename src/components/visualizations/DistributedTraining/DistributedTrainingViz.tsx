"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat } from "../viz-kit";

/**
 * Per-GPU memory (in bytes-per-parameter, Psi) for mixed-precision Adam
 * training under each ZeRO sharding stage, following the ZeRO paper's
 * accounting: 2 Psi fp16 params + 2 Psi fp16 grads + 12 Psi fp32 optimizer
 * state (master weights + momentum + variance) = 16 Psi total.
 */

type Mode = "baseline" | "zero1" | "zero2" | "zero3";

const MODE_LABEL: Record<Mode, string> = {
  baseline: "Baseline DP",
  zero1: "ZeRO-1",
  zero2: "ZeRO-2",
  zero3: "ZeRO-3",
};

function components(mode: Mode, g: number) {
  const params = mode === "zero3" ? 2 / g : 2;
  const grads = mode === "zero3" || mode === "zero2" ? 2 / g : 2;
  const optim = mode === "baseline" ? 12 : 12 / g;
  return { params, grads, optim };
}

const MAX_TOTAL = 16; // baseline at G=1: upper bound for the bar scale
const BAR_W = 40;
const BAR_MAX_H = 130;
const GAP = 14;
const TOP_PAD = 20;
const BOTTOM_PAD = 34;

export function DistributedTrainingViz({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("baseline");
  const [g, setG] = useState(4);

  const { params, grads, optim } = components(mode, g);
  const total = params + grads + optim;

  const scaleH = (v: number) => (v / MAX_TOTAL) * BAR_MAX_H;
  const baseY = TOP_PAD + BAR_MAX_H;
  const optimH = scaleH(optim);
  const gradsH = scaleH(grads);
  const paramsH = scaleH(params);
  const optimY = baseY - optimH;
  const gradsY = optimY - gradsH;
  const paramsY = gradsY - paramsH;

  const gpuCount = Math.min(g, 8);
  const chartW = gpuCount * (BAR_W + GAP) + GAP;
  const chartH = TOP_PAD + BAR_MAX_H + BOTTOM_PAD;

  const gbFor7B = (total * 7e9) / 1e9;
  const fitsOn80GB = gbFor7B <= 80;

  return (
    <VizFrame
      className={className}
      title="Sharding model state: ZeRO stages vs. GPU count"
      caption={`Per-GPU bytes-per-parameter (Ψ) for ${MODE_LABEL[mode]} across ${g} GPU${g > 1 ? "s" : ""}. Baseline data parallelism replicates all 16Ψ bytes on every GPU. Each ZeRO stage shards one more piece of state — optimizer state, then gradients, then parameters — across the group, shrinking the per-GPU total toward 16Ψ/G.`}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <VizButton key={m} active={mode === m} onClick={() => setMode(m)}>
            {MODE_LABEL[m]}
          </VizButton>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width={chartW}
          className="block"
          role="img"
          aria-label="per-GPU memory breakdown across ZeRO stages"
        >
          {Array.from({ length: gpuCount }, (_, i) => {
            const x = GAP + i * (BAR_W + GAP);
            return (
              <g key={i}>
                <rect x={x} y={paramsY} width={BAR_W} height={paramsH} fill={VIZ.teal} />
                <rect x={x} y={gradsY} width={BAR_W} height={gradsH} fill={VIZ.brand} />
                <rect x={x} y={optimY} width={BAR_W} height={optimH} fill={VIZ.rose} />
                <rect
                  x={x}
                  y={baseY - BAR_MAX_H}
                  width={BAR_W}
                  height={BAR_MAX_H}
                  fill="none"
                  stroke={VIZ.grid}
                  strokeWidth={0.5}
                />
                <text
                  x={x + BAR_W / 2}
                  y={baseY + 14}
                  fill={VIZ.text}
                  fontSize={9}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  GPU {i}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 mt-1 mb-3 text-xs">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: VIZ.teal }} /> fp16 params (2Ψ)
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: VIZ.brand }} /> fp16 grads (2Ψ)
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: VIZ.rose }} /> fp32 optimizer state (12Ψ)
        </span>
      </div>

      <div className="max-w-xs">
        <VizSlider
          label="GPUs in the data-parallel group (G)"
          min={1}
          max={8}
          step={1}
          value={g}
          onChange={(v) => setG(Math.round(v))}
          format={(v) => String(Math.round(v))}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="bytes / param" value={`${total.toFixed(1)}Ψ`} />
        <VizStat
          label="7B model, per GPU"
          value={`${gbFor7B.toFixed(1)} GB`}
          color={fitsOn80GB ? VIZ.teal : VIZ.rose}
        />
        <VizStat label="fits on 80GB GPU?" value={fitsOn80GB ? "yes" : "no"} color={fitsOn80GB ? VIZ.teal : VIZ.rose} />
      </div>
    </VizFrame>
  );
}
