"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, useAnimationLoop } from "../viz-kit";

/**
 * Side-by-side comparison of the six ways people scale training across GPUs.
 * Pick a strategy → the schematic shows how G=4 GPUs lay out the model, the
 * data, and the optimizer state; the panel on the right rates the four costs
 * that actually differ between strategies (per-GPU memory, communication,
 * compute overhead, and implementation complexity) so the trade-off is legible
 * at a glance. Every rating is a cost — shorter bars are better.
 */

type Strategy = "dp" | "fsdp" | "deepspeed" | "tensor" | "pipeline" | "checkpoint";

type Rating = 1 | 2 | 3 | 4 | 5;

interface StrategyInfo {
  label: string;
  tag: string; // which wall it attacks
  tagColor: string;
  shards: string; // one-line "what it does to the model"
  memory: Rating;
  comm: Rating;
  compute: Rating;
  complexity: Rating;
  bestFor: string;
  watchOut: string;
}

const RATING_WORD: Record<Rating, string> = {
  1: "very low",
  2: "low",
  3: "medium",
  4: "high",
  5: "very high",
};

const STRATEGIES: Record<Strategy, StrategyInfo> = {
  dp: {
    label: "Data Parallel",
    tag: "compute wall",
    tagColor: VIZ.brand,
    shards: "Full model copied on every GPU; the batch is split. Gradients are averaged with an all-reduce.",
    memory: 5,
    comm: 3,
    compute: 1,
    complexity: 1,
    bestFor: "A model that already fits on one GPU — you just want to train it faster on more data.",
    watchOut: "Does nothing for memory. Every GPU still holds a full copy of params, grads, and optimizer state.",
  },
  fsdp: {
    label: "FSDP (ZeRO-3)",
    tag: "memory wall · state",
    tagColor: VIZ.teal,
    shards: "Params, grads, and optimizer state are split 1/G across GPUs; each shard is all-gathered only for the layer using it, then freed.",
    memory: 2,
    comm: 4,
    compute: 1,
    complexity: 2,
    bestFor: "A model whose 16Ψ of state won't fit — PyTorch-native sharding that scales per-GPU memory down as you add GPUs.",
    watchOut: "Extra all-gather of parameters on every forward and backward pass, on top of DP's gradient sync.",
  },
  deepspeed: {
    label: "DeepSpeed ZeRO-Offload",
    tag: "memory wall · state",
    tagColor: VIZ.teal,
    shards: "Same sharding as FSDP, plus optimizer state can be pushed off the GPU entirely into CPU RAM or NVMe.",
    memory: 1,
    comm: 5,
    compute: 2,
    complexity: 3,
    bestFor: "Squeezing the biggest possible model onto a few GPUs — offload trades interconnect bandwidth for GPU capacity.",
    watchOut: "Offloading moves state over PCIe/NVMe every step — often bandwidth-bound and slower per step than staying on-GPU.",
  },
  tensor: {
    label: "Tensor (Model) Parallel",
    tag: "memory wall · one layer",
    tagColor: VIZ.orange,
    shards: "A single layer's weight matrix is split across GPUs; each computes a partial matmul and they all-reduce to combine.",
    memory: 2,
    comm: 5,
    compute: 1,
    complexity: 4,
    bestFor: "A single layer too big for one GPU (giant attention/FFN blocks) — kept inside one fast-interconnect node.",
    watchOut: "An all-reduce inside every layer, forward and backward. Latency-sensitive; falls apart across slow links.",
  },
  pipeline: {
    label: "Pipeline Parallel",
    tag: "memory wall · depth",
    tagColor: VIZ.brand,
    shards: "The model is cut by layer: GPU 0 holds the first layers, GPU 1 the next, and so on; activations flow stage to stage.",
    memory: 2,
    comm: 2,
    compute: 3,
    complexity: 4,
    bestFor: "A very deep model spread across nodes — only activations cross GPU boundaries, so it tolerates slower links.",
    watchOut: "The 'bubble': stages sit idle at the start and end. You need many micro-batches to keep everyone busy.",
  },
  checkpoint: {
    label: "Gradient Checkpointing",
    tag: "memory wall · activations",
    tagColor: VIZ.yellow,
    shards: "A single-GPU trick: drop most activations after the forward pass and recompute them during backward instead of storing them.",
    memory: 2,
    comm: 1,
    compute: 4,
    complexity: 1,
    bestFor: "Fitting a bigger batch or model on the same GPU when activations — not weights — are what's overflowing.",
    watchOut: "Recomputing the forward pass costs ~30% more compute per step. It composes with every strategy above.",
  },
};

const ORDER: Strategy[] = ["dp", "fsdp", "deepspeed", "tensor", "pipeline", "checkpoint"];

// ---- schematic geometry ----------------------------------------------------
const G = 4;
const L = 4;
const PAD = 10;
const CARD_W = 78;
const CARD_GAP = 16;
const HEAD_H = 20;
const BAR_H = 14;
const BAR_GAP = 5;
const BODY_H = L * BAR_H + (L - 1) * BAR_GAP;
const CARD_H = HEAD_H + BODY_H + 8;
const CARD_TOP = 8;
const SVG_W = PAD * 2 + G * CARD_W + (G - 1) * CARD_GAP;
const SVG_H = CARD_TOP + CARD_H + 62; // room for the communication annotation

function cardX(i: number) {
  return PAD + i * (CARD_W + CARD_GAP);
}
function barY(layer: number) {
  return CARD_TOP + HEAD_H + layer * (BAR_H + BAR_GAP);
}

interface Cell {
  frac: number; // fraction of the layer this GPU stores (0 = doesn't hold it)
  color: string;
  hollow?: boolean;
}

function cell(s: Strategy, gpu: number, layer: number): Cell {
  switch (s) {
    case "dp":
      return { frac: 1, color: VIZ.brand };
    case "fsdp":
    case "deepspeed":
      return { frac: 1 / G, color: VIZ.teal };
    case "tensor":
      return { frac: 1 / G, color: VIZ.orange };
    case "pipeline":
      return gpu === layer ? { frac: 1, color: VIZ.brand } : { frac: 0, color: VIZ.grid, hollow: true };
    case "checkpoint":
      // single device does everything; only GPU 0 is "on"
      return gpu === 0 ? { frac: 1, color: VIZ.brand } : { frac: 0, color: VIZ.grid, hollow: true };
  }
}

function gpuLabel(s: Strategy, gpu: number): string {
  if (s === "dp") return `batch ${gpu}`;
  if (s === "pipeline") return `layer ${gpu}`;
  if (s === "checkpoint") return gpu === 0 ? "active" : "idle";
  return `shard ${gpu}`;
}

export function ParallelismStrategyViz({ className }: { className?: string }) {
  const [strategy, setStrategy] = useState<Strategy>("dp");
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0);

  useAnimationLoop((dt) => {
    setPhase((p) => (p + dt * 1.1) % L);
  }, playing);

  const info = STRATEGIES[strategy];
  const active = Math.floor(phase); // 0..L-1, drives the "currently computing" highlight

  return (
    <VizFrame
      className={className}
      title="Six ways to scale training — and what each one costs"
      caption={
        info.shards +
        " The four bars on the right are all costs, so shorter is better: every strategy buys progress on one axis by spending on another."
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {ORDER.map((s) => (
          <VizButton key={s} active={strategy === s} onClick={() => setStrategy(s)}>
            {STRATEGIES[s].label}
          </VizButton>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ---- schematic ---- */}
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width={SVG_W}
            className="block max-w-full"
            role="img"
            aria-label={`GPU layout for ${info.label}`}
          >
            {/* GPU cards */}
            {Array.from({ length: G }, (_, g) => {
              const x = cardX(g);
              const dimmed = strategy === "checkpoint" && g !== 0;
              return (
                <g key={g} opacity={dimmed ? 0.28 : 1}>
                  <rect
                    x={x}
                    y={CARD_TOP}
                    width={CARD_W}
                    height={CARD_H}
                    rx={7}
                    fill={VIZ.card}
                    stroke={VIZ.grid}
                    strokeWidth={1}
                  />
                  <text
                    x={x + CARD_W / 2}
                    y={CARD_TOP + 13}
                    fill={VIZ.textBright}
                    fontSize={9}
                    fontWeight={600}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    GPU {g}
                  </text>

                  {/* layer bars */}
                  {Array.from({ length: L }, (_, l) => {
                    const c = cell(strategy, g, l);
                    const y = barY(l);
                    const innerX = x + 6;
                    const innerW = CARD_W - 12;
                    const isActive =
                      playing &&
                      l === active &&
                      strategy !== "dp" &&
                      strategy !== "checkpoint" &&
                      !c.hollow;
                    return (
                      <g key={l}>
                        {/* track */}
                        <rect
                          x={innerX}
                          y={y}
                          width={innerW}
                          height={BAR_H}
                          rx={2}
                          fill="none"
                          stroke={VIZ.grid}
                          strokeWidth={c.hollow ? 1 : 0.5}
                          strokeDasharray={c.hollow ? "3 2" : undefined}
                        />
                        {/* owned fraction */}
                        {c.frac > 0 && (
                          <rect
                            x={innerX}
                            y={y}
                            width={Math.max(innerW * c.frac, 4)}
                            height={BAR_H}
                            rx={2}
                            fill={c.color}
                            opacity={isActive ? 1 : 0.85}
                          />
                        )}
                        {/* on-demand gather ghost: the layer momentarily reconstructed in full */}
                        {isActive && (strategy === "fsdp" || strategy === "deepspeed") && (
                          <rect
                            x={innerX}
                            y={y}
                            width={innerW}
                            height={BAR_H}
                            rx={2}
                            fill="none"
                            stroke={VIZ.teal}
                            strokeWidth={1.4}
                            strokeDasharray="3 2"
                          />
                        )}
                        {/* tensor-parallel: all-reduce tie line across GPUs on the active layer */}
                        {isActive && strategy === "tensor" && g < G - 1 && (
                          <line
                            x1={x + CARD_W}
                            y1={y + BAR_H / 2}
                            x2={cardX(g + 1)}
                            y2={y + BAR_H / 2}
                            stroke={VIZ.orange}
                            strokeWidth={1.4}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* per-GPU footer label */}
                  <text
                    x={x + CARD_W / 2}
                    y={CARD_TOP + CARD_H - 3}
                    fill={VIZ.text}
                    fontSize={8}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {gpuLabel(strategy, g)}
                  </text>
                </g>
              );
            })}

            {/* pipeline: activation flow arrows between stages */}
            {strategy === "pipeline" &&
              Array.from({ length: G - 1 }, (_, i) => {
                const x1 = cardX(i) + CARD_W;
                const x2 = cardX(i + 1);
                const y = CARD_TOP + CARD_H / 2;
                const lit = playing && i === active;
                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2 - 4}
                      y2={y}
                      stroke={lit ? VIZ.brandLight : VIZ.axis}
                      strokeWidth={lit ? 2 : 1.2}
                      markerEnd="url(#ps-arrow)"
                    />
                  </g>
                );
              })}

            <defs>
              <marker id="ps-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={VIZ.axis} />
              </marker>
            </defs>

            {/* ---- communication annotation strip ---- */}
            <CommStrip strategy={strategy} />
          </svg>
        </div>

        {/* ---- trade-off panel ---- */}
        <div className="flex flex-col gap-3">
          <div>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: `${info.tagColor}22`, color: info.tagColor }}
            >
              attacks the {info.tag}
            </span>
          </div>

          <Meter label="Per-GPU memory" value={info.memory} color={VIZ.rose} />
          <Meter label="Communication" value={info.comm} color={VIZ.brand} />
          <Meter label="Compute overhead" value={info.compute} color={VIZ.orange} />
          <Meter label="Complexity" value={info.complexity} color={VIZ.yellow} />

          <div className="mt-1 rounded-lg border border-surface-border/60 bg-surface-elevated/40 p-2.5">
            <p className="text-[11px] leading-snug text-slate-300">
              <span className="font-semibold text-teal-300">Best for </span>
              {info.bestFor}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-300">
              <span className="font-semibold text-rose-300">Watch out </span>
              {info.watchOut}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <VizButton active={playing} onClick={() => setPlaying((p) => !p)}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </VizButton>
        <span className="text-[11px] text-slate-500">
          Animation highlights the layer each GPU is working on — watch how state is gathered on demand, combined across
          GPUs, or handed down the pipeline.
        </span>
      </div>
    </VizFrame>
  );
}

/** A 5-segment cost meter. Every meter is a cost, so fewer lit segments is better. */
function Meter({ label, value, color }: { label: string; value: Rating; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-300">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">{RATING_WORD[value]}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-sm"
            style={{ background: i < value ? color : VIZ.grid }}
          />
        ))}
      </div>
    </div>
  );
}

/** Strategy-specific caption under the GPU cards describing what crosses the wire. */
function CommStrip({ strategy }: { strategy: Strategy }) {
  const y = CARD_TOP + CARD_H + 20;
  const text: Record<Strategy, string> = {
    dp: "↔ all-reduce: average gradients across all GPUs once per step",
    fsdp: "↕ all-gather params per layer, then reduce-scatter gradients",
    deepspeed: "↓ optimizer state offloaded to CPU / NVMe, streamed back each step",
    tensor: "↔ all-reduce inside every layer — frequent, latency-sensitive",
    pipeline: "→ only activations cross stage boundaries — light traffic",
    checkpoint: "· no cross-GPU traffic — a single-device memory/compute trade",
  };
  // For DeepSpeed, draw a CPU/NVMe bank the offloaded state lives in.
  return (
    <>
      {strategy === "deepspeed" && (
        <g>
          {Array.from({ length: G }, (_, g) => (
            <line
              key={g}
              x1={cardX(g) + CARD_W / 2}
              y1={CARD_TOP + CARD_H}
              x2={cardX(g) + CARD_W / 2}
              y2={y - 12}
              stroke={VIZ.rose}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          ))}
          <rect
            x={PAD}
            y={y - 12}
            width={SVG_W - PAD * 2}
            height={16}
            rx={4}
            fill={`${VIZ.rose}18`}
            stroke={VIZ.rose}
            strokeWidth={1}
          />
          <text
            x={SVG_W / 2}
            y={y}
            fill={VIZ.rose}
            fontSize={9}
            textAnchor="middle"
            fontFamily="monospace"
          >
            CPU RAM / NVMe — offloaded optimizer state
          </text>
        </g>
      )}
      {strategy !== "deepspeed" && (
        <text
          x={SVG_W / 2}
          y={y}
          fill={VIZ.text}
          fontSize={9.5}
          textAnchor="middle"
          fontFamily="monospace"
        >
          {text[strategy]}
        </text>
      )}
    </>
  );
}
