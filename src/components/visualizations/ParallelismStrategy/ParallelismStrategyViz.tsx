"use client";

import { useState } from "react";
import { VIZ, VizFrame, useAnimationLoop } from "../viz-kit";

/**
 * There are only three axes of parallelism — split the DATA, split each LAYER,
 * or split the model into STAGES. Every named method is a point on one of these
 * axes (DDP / FSDP / DeepSpeed all live on the data axis; they differ only in
 * how much state they shard), and gradient checkpointing is an orthogonal
 * memory trick that stacks on any of them. This viz makes that taxonomy the
 * organizing idea: pick an axis, see what it splits across 4 GPUs, and read the
 * trade-off in plain language — no all-gather / reduce-scatter vocabulary.
 */

type Axis = "data" | "tensor" | "pipeline";
type DataMode = "replicate" | "shard" | "offload";
type Rating = 1 | 2 | 3 | 4 | 5;

const RATING_WORD: Record<Rating, string> = {
  1: "very low",
  2: "low",
  3: "medium",
  4: "high",
  5: "very high",
};

interface AxisInfo {
  label: string;
  splits: string; // headline: what gets divided
  wall: string;
  wallColor: string;
  color: string;
  comm: number; // chatter level 1..5
  commLine: string;
  complexity: Rating;
  methods: string[];
  short: string; // tiny caption under the schematic
}

const AXES: Record<Axis, AxisInfo> = {
  data: {
    label: "Data parallelism",
    splits: "the batch",
    wall: "compute wall",
    wallColor: VIZ.brand,
    color: VIZ.teal,
    comm: 3,
    commLine: "Each GPU trains on different data, then they average gradients once per step.",
    complexity: 1,
    methods: ["DDP", "FSDP", "ZeRO", "DeepSpeed"],
    short: "different data · gradients synced each step",
  },
  tensor: {
    label: "Tensor parallelism",
    splits: "each layer",
    wall: "memory wall · one layer",
    wallColor: VIZ.orange,
    color: VIZ.orange,
    comm: 5,
    commLine: "Every GPU computes part of the same layer, then they combine — lots of chatter, so keep it inside one fast node.",
    complexity: 4,
    methods: ["Megatron-LM", "column / row split"],
    short: "same data · combine inside every layer",
  },
  pipeline: {
    label: "Pipeline parallelism",
    splits: "the model into stages",
    wall: "memory wall · depth",
    wallColor: VIZ.brandLight,
    color: VIZ.brand,
    comm: 2,
    commLine: "Each GPU owns a few layers and hands its output to the next — light traffic, so it tolerates slower links.",
    complexity: 4,
    methods: ["GPipe", "1F1B", "PipeDream"],
    short: "same data · activations passed down the line",
  },
};

interface DataModeInfo {
  label: string;
  methods: string;
  perGpuState: string;
  memoryRelief: Rating;
  comm: number;
  note: string;
}

const DATA_MODES: Record<DataMode, DataModeInfo> = {
  replicate: {
    label: "Replicate (DDP)",
    methods: "PyTorch DDP",
    perGpuState: "16Ψ — full copy",
    memoryRelief: 1,
    comm: 3,
    note: "Every GPU keeps a full copy of the model. Fastest, but adding GPUs never shrinks the model — pure compute scaling.",
  },
  shard: {
    label: "Shard (FSDP / ZeRO)",
    methods: "FSDP · ZeRO-1/2/3",
    perGpuState: "16Ψ / G",
    memoryRelief: 4,
    comm: 4,
    note: "Split the weights, gradients, and optimizer state across the GPUs. Per-GPU memory now shrinks as you add GPUs.",
  },
  offload: {
    label: "Shard + offload (DeepSpeed)",
    methods: "DeepSpeed ZeRO-Offload",
    perGpuState: "≈ 0 on GPU",
    memoryRelief: 5,
    comm: 5,
    note: "Push the heavy optimizer state off the GPU into CPU RAM / NVMe. Biggest model on the fewest GPUs — but slower per step.",
  },
};

// ---- schematic geometry ----------------------------------------------------
const G = 4;
const L = 4;
const PAD = 10;
const CARD_W = 78;
const CARD_GAP = 16;
const HEAD_H = 18;
const BAR_H = 13;
const BAR_GAP = 5;
const BODY_H = L * BAR_H + (L - 1) * BAR_GAP;
const CARD_H = HEAD_H + BODY_H + 16;
const CARD_TOP = 6;
const SVG_W = PAD * 2 + G * CARD_W + (G - 1) * CARD_GAP;
const SVG_H = CARD_TOP + CARD_H + 44;

const cardX = (i: number) => PAD + i * (CARD_W + CARD_GAP);
const barY = (layer: number) => CARD_TOP + HEAD_H + layer * (BAR_H + BAR_GAP);

export function ParallelismStrategyViz({ className }: { className?: string }) {
  const [axis, setAxis] = useState<Axis>("data");
  const [dataMode, setDataMode] = useState<DataMode>("replicate");
  const [checkpoint, setCheckpoint] = useState(false);
  const [phase, setPhase] = useState(0);

  // Only the pipeline view animates (activation flowing down the stages).
  useAnimationLoop((dt) => setPhase((p) => (p + dt * 1.3) % (G + 1)), axis === "pipeline");
  const flowStage = Math.floor(phase);

  const info = AXES[axis];
  const dm = DATA_MODES[dataMode];
  const memoryRelief: Rating = axis === "data" ? dm.memoryRelief : 4;
  const comm = axis === "data" ? dm.comm : info.comm;

  return (
    <VizFrame
      className={className}
      title="The three axes of parallelism — and where every method fits"
      caption="Every way to scale training is one of these three axes (or, like gradient checkpointing, an orthogonal add-on that stacks on top). Data parallelism splits the data; tensor and pipeline parallelism split the model itself, in two different directions."
    >
      {/* axis tabs — the taxonomy */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.keys(AXES) as Axis[]).map((a) => {
          const ai = AXES[a];
          const on = axis === a;
          return (
            <button
              key={a}
              onClick={() => setAxis(a)}
              className={`rounded-lg border p-2.5 text-left transition-colors ${
                on ? "bg-surface-elevated" : "bg-surface-card hover:bg-surface-elevated/60"
              }`}
              style={{ borderColor: on ? ai.color : VIZ.grid }}
            >
              <div className="text-sm font-semibold" style={{ color: on ? ai.color : VIZ.textBright }}>
                {ai.label}
              </div>
              <div className="text-[11px] text-slate-400">splits {ai.splits}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        {/* ---- schematic ---- */}
        <div>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              width={SVG_W}
              className="block max-w-full"
              role="img"
              aria-label={`GPU layout for ${info.label}`}
            >
              {Array.from({ length: G }, (_, g) => {
                const x = cardX(g);
                return (
                  <g key={g}>
                    <rect
                      x={x}
                      y={CARD_TOP}
                      width={CARD_W}
                      height={CARD_H}
                      rx={7}
                      fill={VIZ.card}
                      stroke={VIZ.grid}
                    />
                    <text
                      x={x + CARD_W / 2}
                      y={CARD_TOP + 12}
                      fill={VIZ.textBright}
                      fontSize={9}
                      fontWeight={600}
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      GPU {g}
                    </text>

                    {Array.from({ length: L }, (_, l) => (
                      <LayerBar
                        key={l}
                        axis={axis}
                        dataMode={dataMode}
                        color={info.color}
                        g={g}
                        l={l}
                        x={x}
                        litStage={axis === "pipeline" ? flowStage : -1}
                      />
                    ))}

                    {/* footer: what data this GPU sees */}
                    <text
                      x={x + CARD_W / 2}
                      y={CARD_TOP + CARD_H - 4}
                      fill={VIZ.text}
                      fontSize={7.5}
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {axis === "data" ? `data slice ${g}` : "same batch"}
                    </text>
                  </g>
                );
              })}

              {/* pipeline: activation flow arrows */}
              {axis === "pipeline" &&
                Array.from({ length: G - 1 }, (_, i) => {
                  const y = CARD_TOP + CARD_H / 2;
                  return (
                    <line
                      key={i}
                      x1={cardX(i) + CARD_W}
                      y1={y}
                      x2={cardX(i + 1) - 3}
                      y2={y}
                      stroke={flowStage === i + 1 ? VIZ.brandLight : VIZ.axis}
                      strokeWidth={flowStage === i + 1 ? 2 : 1.1}
                      markerEnd="url(#ps-arrow)"
                    />
                  );
                })}

              <defs>
                <marker id="ps-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={VIZ.axis} />
                </marker>
              </defs>
            </svg>
          </div>

          <p className="mt-1 text-center text-[11px] text-slate-500">{info.short}</p>

          {/* data axis: how much state each GPU keeps */}
          {axis === "data" && (
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(Object.keys(DATA_MODES) as DataMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDataMode(m)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      dataMode === m
                        ? "bg-brand-500 text-white"
                        : "bg-surface-elevated text-slate-300 hover:bg-surface-border"
                    }`}
                  >
                    {DATA_MODES[m].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-surface-border/60 bg-surface-elevated/40 px-3 py-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">state / GPU</span>
                <span className="font-mono text-sm text-teal-300">{dm.perGpuState}</span>
                {dataMode === "offload" && (
                  <span className="ml-auto rounded px-1.5 py-0.5 text-[10px]" style={{ background: `${VIZ.rose}22`, color: VIZ.rose }}>
                    + CPU / NVMe
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{dm.note}</p>
            </div>
          )}
        </div>

        {/* ---- trade-off panel ---- */}
        <div className="flex flex-col gap-3">
          <span
            className="inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: `${info.wallColor}22`, color: info.wallColor }}
          >
            attacks the {info.wall}
          </span>

          <div className="text-[11px] text-slate-300">
            <span className="text-slate-500">Splits </span>
            <span className="font-semibold" style={{ color: info.color }}>
              {info.splits}
            </span>
          </div>

          <Meter label="Communication" value={comm as Rating} color={VIZ.brand} />
          <Meter label="Memory relief" value={memoryRelief} color={VIZ.teal} invert />
          <Meter label="Complexity" value={info.complexity} color={VIZ.yellow} />

          <div className="rounded-lg border border-surface-border/60 bg-surface-elevated/40 p-2.5">
            <p className="text-[11px] leading-snug text-slate-300">{info.commLine}</p>
          </div>

          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">methods in this family</div>
            <div className="flex flex-wrap gap-1.5">
              {(axis === "data" ? [dm.methods] : info.methods).map((m) => (
                <span
                  key={m}
                  className="rounded-md border px-2 py-0.5 text-[11px] text-slate-300"
                  style={{ borderColor: `${info.color}55` }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- orthogonal add-on ---- */}
      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-surface-border bg-surface-elevated/30 p-3 sm:flex-row sm:items-center">
        <button
          onClick={() => setCheckpoint((c) => !c)}
          className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            checkpoint ? "text-white" : "bg-surface-elevated text-slate-300 hover:bg-surface-border"
          }`}
          style={checkpoint ? { background: VIZ.yellow, color: "#1a1d27" } : undefined}
        >
          Gradient checkpointing: {checkpoint ? "ON" : "off"}
        </button>
        <p className="text-[11px] leading-snug text-slate-400">
          <span className="font-semibold text-slate-300">Orthogonal — not a fourth axis.</span> It recomputes
          activations during the backward pass instead of storing them: ~30% more compute for a big cut in{" "}
          <em>activation</em> memory. It stacks on top of{" "}
          <span style={{ color: info.color }}>{info.label.toLowerCase()}</span>
          {checkpoint ? " — and it's on now." : ""}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-400">3D parallelism:</span> large runs combine all three axes at
        once — tensor parallelism <em>within</em> a node, pipeline parallelism <em>across</em> nodes, and data
        parallelism <em>across</em> replicas — because each axis answers a different question.
      </p>
    </VizFrame>
  );
}

/** One layer's row inside a GPU card — how it's filled encodes the axis. */
function LayerBar({
  axis,
  dataMode,
  color,
  g,
  l,
  x,
  litStage,
}: {
  axis: Axis;
  dataMode: DataMode;
  color: string;
  g: number;
  l: number;
  x: number;
  litStage: number;
}) {
  const innerX = x + 6;
  const innerW = CARD_W - 12;
  const y = barY(l);
  const track = (
    <rect x={innerX} y={y} width={innerW} height={BAR_H} rx={2} fill="none" stroke={VIZ.grid} strokeWidth={0.5} />
  );

  if (axis === "data") {
    if (dataMode === "replicate") {
      // full copy of every layer
      return (
        <g>
          {track}
          <rect x={innerX} y={y} width={innerW} height={BAR_H} rx={2} fill={color} opacity={0.85} />
        </g>
      );
    }
    // shard / offload: this GPU keeps one 1/G slice of every layer
    const w = innerW / G;
    return (
      <g>
        {track}
        <rect x={innerX + g * w} y={y} width={w - 1} height={BAR_H} rx={1} fill={color} />
      </g>
    );
  }

  if (axis === "tensor") {
    // the layer is cut into G columns; this GPU owns one column of *every* layer
    const w = innerW / G;
    return (
      <g>
        {track}
        {Array.from({ length: G }, (_, k) => (
          <rect
            key={k}
            x={innerX + k * w}
            y={y}
            width={w - 1}
            height={BAR_H}
            fill={k === g ? color : VIZ.grid}
            opacity={k === g ? 1 : 0.5}
          />
        ))}
      </g>
    );
  }

  // pipeline: GPU g owns layer g (a contiguous stage); other layers live elsewhere
  const owned = l === g;
  return (
    <g>
      <rect
        x={innerX}
        y={y}
        width={innerW}
        height={BAR_H}
        rx={2}
        fill={owned ? color : "none"}
        opacity={owned ? (litStage === g ? 1 : 0.85) : 1}
        stroke={owned ? "none" : VIZ.grid}
        strokeWidth={owned ? 0 : 1}
        strokeDasharray={owned ? undefined : "3 2"}
      />
    </g>
  );
}

/**
 * A 5-segment meter. `invert` flags a "more is better" quantity (memory relief)
 * so it can read the same visual language while meaning the opposite of a cost.
 */
function Meter({ label, value, color, invert }: { label: string; value: Rating; color: string; invert?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-300">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">
          {RATING_WORD[value]}
          {invert ? " ↑" : ""}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="h-2 flex-1 rounded-sm" style={{ background: i < value ? color : VIZ.grid }} />
        ))}
      </div>
    </div>
  );
}
