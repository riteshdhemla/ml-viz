"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat } from "../viz-kit";

/**
 * Transformer layer block diagram.
 *
 * Draws one complete transformer layer as stacked rounded-rect sub-blocks
 * with residual skip connections as curved SVG paths. Clicking or hovering
 * a block highlights it and shows a tooltip-style annotation. A toggle
 * switches between encoder mode (bidirectional attention) and decoder mode
 * (masked causal attention).
 */

const W = 520;
const H = 480;

// Block layout — each block has an id, y-center, label, and annotation
type BlockId =
  | "input"
  | "mha"
  | "addnorm1"
  | "ffn"
  | "addnorm2"
  | "output";

interface Block {
  id: BlockId;
  y: number;          // center y
  label: (decoder: boolean) => string;
  annotation: (decoder: boolean) => string;
  color: string;
}

const BLOCK_W = 220;
const BLOCK_H = 42;
const BLOCK_X = (W - BLOCK_W) / 2; // horizontally centred

// Vertical layout — spaced evenly top-to-bottom, leave room for labels
const BLOCKS: Block[] = [
  {
    id: "input",
    y: 40,
    label: () => "Input Embedding",
    annotation: () =>
      "Token embeddings (+ positional encoding) enter the layer. Shape: [seq_len × d_model].",
    color: VIZ.teal,
  },
  {
    id: "mha",
    y: 130,
    label: (dec) => (dec ? "Masked Multi-Head Attention" : "Multi-Head Attention"),
    annotation: (dec) =>
      dec
        ? "Causal self-attention: each token attends only to past tokens (triangular mask sets future scores to −∞ before softmax)."
        : "Bidirectional self-attention: every token attends to every other token simultaneously — ideal for understanding tasks.",
    color: VIZ.brand,
  },
  {
    id: "addnorm1",
    y: 220,
    label: () => "Add & Norm",
    annotation: () =>
      "Residual add: x = x + Attn(x). Then LayerNorm stabilises feature-dimension scale, enabling deep stacks to train.",
    color: VIZ.orange,
  },
  {
    id: "ffn",
    y: 310,
    label: () => "Feed-Forward (FFN)",
    annotation: () =>
      "Two-layer MLP applied independently to each token: FFN(x) = W₂ ReLU(W₁x + b₁) + b₂. Hidden dim = 4 × d_model.",
    color: VIZ.brand,
  },
  {
    id: "addnorm2",
    y: 400,
    label: () => "Add & Norm",
    annotation: () =>
      "Second residual add: x = x + FFN(x). LayerNorm again — each transformer block ends with normalised activations.",
    color: VIZ.orange,
  },
  {
    id: "output",
    y: 460,
    label: () => "Output",
    annotation: () =>
      "Normalised token representations passed to the next layer (or, for the last block, to the task head).",
    color: VIZ.teal,
  },
];

// ── Skip / residual connection paths ──────────────────────────────────────────
// Residual 1: from just before MHA (between input & mha) to just after Add&Norm1
// Residual 2: from just before FFN (between addnorm1 & ffn) to just after Add&Norm2

function residualPath(
  fromY: number,
  toY: number,
  side: "left" | "right",
  active: boolean
): React.ReactElement {
  const xEdge = BLOCK_X + (side === "left" ? -4 : BLOCK_W + 4);
  const xCurve = side === "left" ? xEdge - 36 : xEdge + 36;
  const midY = (fromY + toY) / 2;

  const d = [
    `M ${xEdge} ${fromY}`,
    `C ${xCurve} ${fromY}, ${xCurve} ${midY}, ${xCurve} ${midY}`,
    `C ${xCurve} ${midY}, ${xCurve} ${toY}, ${xEdge} ${toY}`,
  ].join(" ");

  return (
    <path
      key={`res-${side}-${fromY}`}
      d={d}
      fill="none"
      stroke={active ? VIZ.yellow : VIZ.grid}
      strokeWidth={active ? 2.5 : 1.5}
      strokeDasharray={active ? "none" : "4 3"}
      opacity={active ? 0.9 : 0.5}
    />
  );
}

// Arrow head pointing down
function arrowDown(x: number, y: number, active: boolean): React.ReactElement {
  const color = active ? VIZ.yellow : VIZ.axis;
  return (
    <polygon
      key={`arrow-${y}`}
      points={`${x - 5},${y - 8} ${x + 5},${y - 8} ${x},${y}`}
      fill={color}
      opacity={active ? 0.9 : 0.5}
    />
  );
}

export function TransformerBlockViz({ className }: { className?: string }) {
  const [decoder, setDecoder] = useState(false);
  const [selected, setSelected] = useState<BlockId | null>("mha");
  const [hovered, setHovered] = useState<BlockId | null>(null);

  const activeId = hovered ?? selected;
  const activeBlock = BLOCKS.find((b) => b.id === activeId) ?? null;

  // Residual 1: from midpoint between input (y=40) and mha (y=130) → to midpoint between mha (y=130) and addnorm1 (y=220)
  // We draw from the bottom edge of "input" block to the bottom edge of "addnorm1" block
  const res1FromY = BLOCKS[0].y + BLOCK_H / 2 + 4;  // below Input
  const res1ToY   = BLOCKS[2].y + BLOCK_H / 2 + 4;  // below Add&Norm1

  // Residual 2: from below addnorm1 to below addnorm2
  const res2FromY = BLOCKS[2].y + BLOCK_H / 2 + 4;  // below Add&Norm1
  const res2ToY   = BLOCKS[4].y + BLOCK_H / 2 + 4;  // below Add&Norm2

  // Connector lines between blocks (vertical segments)
  const connectors: React.ReactElement[] = [];
  for (let i = 0; i < BLOCKS.length - 1; i++) {
    const fromY = BLOCKS[i].y + BLOCK_H / 2;
    const toY   = BLOCKS[i + 1].y - BLOCK_H / 2;
    if (toY > fromY + 2) {
      const isActive =
        activeId === BLOCKS[i].id || activeId === BLOCKS[i + 1].id;
      connectors.push(
        <line
          key={`conn-${i}`}
          x1={W / 2}
          y1={fromY}
          x2={W / 2}
          y2={toY}
          stroke={isActive ? VIZ.brandLight : VIZ.axis}
          strokeWidth={isActive ? 2 : 1.5}
          opacity={isActive ? 0.9 : 0.5}
        />
      );
      // Arrow between blocks
      connectors.push(arrowDown(W / 2, toY, isActive));
    }
  }

  // Determine which residual paths are active
  const res1Active =
    activeId === "input" ||
    activeId === "mha" ||
    activeId === "addnorm1";
  const res2Active =
    activeId === "addnorm1" ||
    activeId === "ffn" ||
    activeId === "addnorm2";

  const maskedIndicatorBlock = BLOCKS.find((b) => b.id === "mha")!;

  return (
    <VizFrame
      className={className}
      title="Transformer Layer — Block Diagram"
      caption="Click any block to see what it does. Toggle Encoder / Decoder to see how masked attention changes the architecture. Yellow curves show residual skip connections."
    >
      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <VizButton onClick={() => setDecoder(false)} active={!decoder}>
          Encoder (bidirectional)
        </VizButton>
        <VizButton onClick={() => setDecoder(true)} active={decoder}>
          Decoder (masked)
        </VizButton>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Transformer layer block diagram"
        style={{ overflow: "visible" }}
      >
        {/* Residual skip connections (drawn behind blocks) */}
        {residualPath(res1FromY, res1ToY, "left",  res1Active)}
        {residualPath(res1FromY, res1ToY, "right", res1Active)}
        {residualPath(res2FromY, res2ToY, "left",  res2Active)}
        {residualPath(res2FromY, res2ToY, "right", res2Active)}

        {/* Connector lines & arrows */}
        {connectors}

        {/* Sub-blocks */}
        {BLOCKS.map((block) => {
          const isActive = block.id === activeId;
          const rx = BLOCK_X;
          const ry = block.y - BLOCK_H / 2;

          const fillColor = isActive ? block.color : VIZ.card;
          const strokeColor = isActive ? block.color : VIZ.grid;
          const textColor = isActive ? "#fff" : VIZ.text;

          const label = block.label(decoder);

          return (
            <g
              key={block.id}
              style={{ cursor: "pointer" }}
              onClick={() => setSelected(selected === block.id ? null : block.id)}
              onMouseEnter={() => setHovered(block.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={rx}
                y={ry}
                width={BLOCK_W}
                height={BLOCK_H}
                rx={10}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isActive ? 2 : 1.5}
                opacity={isActive ? 1 : 0.85}
              />

              {/* Masked indicator badge for decoder MHA */}
              {decoder && block.id === "mha" && (
                <rect
                  x={rx + BLOCK_W - 56}
                  y={ry + 8}
                  width={48}
                  height={18}
                  rx={6}
                  fill={VIZ.rose}
                  opacity={0.9}
                />
              )}
              {decoder && block.id === "mha" && (
                <text
                  x={rx + BLOCK_W - 32}
                  y={ry + 21}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight="600"
                >
                  masked
                </text>
              )}

              <text
                x={rx + BLOCK_W / 2}
                y={block.y + 5}
                textAnchor="middle"
                fill={textColor}
                fontSize={13}
                fontWeight={isActive ? "700" : "500"}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Residual label — left side */}
        <text
          x={BLOCK_X - 42}
          y={(res1FromY + res1ToY) / 2}
          textAnchor="middle"
          fill={res1Active ? VIZ.yellow : VIZ.axis}
          fontSize={9}
          opacity={res1Active ? 0.9 : 0.5}
          transform={`rotate(-90, ${BLOCK_X - 42}, ${(res1FromY + res1ToY) / 2})`}
        >
          residual
        </text>
        <text
          x={BLOCK_X - 42}
          y={(res2FromY + res2ToY) / 2}
          textAnchor="middle"
          fill={res2Active ? VIZ.yellow : VIZ.axis}
          fontSize={9}
          opacity={res2Active ? 0.9 : 0.5}
          transform={`rotate(-90, ${BLOCK_X - 42}, ${(res2FromY + res2ToY) / 2})`}
        >
          residual
        </text>
      </svg>

      {/* Annotation panel */}
      {activeBlock && (
        <div
          className="mt-3 p-3 rounded-lg border text-sm text-slate-300 leading-relaxed"
          style={{ borderColor: activeBlock.color + "55", backgroundColor: activeBlock.color + "11" }}
        >
          <span className="font-semibold" style={{ color: activeBlock.color }}>
            {activeBlock.label(decoder)}
          </span>
          <span className="mx-2 text-slate-500">—</span>
          {activeBlock.annotation(decoder)}
        </div>
      )}

      {/* Stats row */}
      <div className="flex gap-6 mt-3">
        <VizStat label="mode" value={decoder ? "Decoder" : "Encoder"} color={VIZ.brandLight} />
        <VizStat label="selected" value={activeBlock ? activeBlock.label(decoder) : "none"} color={activeBlock?.color ?? VIZ.text} />
        <VizStat
          label="residuals"
          value={maskedIndicatorBlock ? "2 skip connections" : "—"}
          color={VIZ.yellow}
        />
      </div>
    </VizFrame>
  );
}
