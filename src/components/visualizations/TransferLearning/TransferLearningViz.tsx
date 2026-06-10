"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat } from "../viz-kit";

/**
 * CNN layer-block diagram showing freeze vs. unfreeze depth.
 * - Vertical stack: Input → Conv1 → Conv2 → Conv3 → FC1 → FC2 → Output
 * - Slider for "unfreeze depth" (0 = all frozen, 6 = all trainable)
 * - Blocks shaded: frozen = gray (VIZ.axis), trainable = brand (VIZ.brand)
 * - Live trainable parameter count
 * - 3 strategy preset buttons: Feature extraction, Fine-tune top, Full fine-tune
 */

const W = 480;
const H = 400;

/** Each layer block: name, plausible param count (matching a simple CNN), trainable index (1-based). */
const LAYERS = [
  { id: "conv1", label: "Conv1",  params: 9408,    desc: "3×3 conv, 64 filters" },
  { id: "conv2", label: "Conv2",  params: 73856,   desc: "3×3 conv, 128 filters" },
  { id: "conv3", label: "Conv3",  params: 295168,  desc: "3×3 conv, 256 filters" },
  { id: "fc1",   label: "FC1",    params: 2097152, desc: "Dense 2048 units" },
  { id: "fc2",   label: "FC2",    params: 524544,  desc: "Dense 256 units" },
  { id: "out",   label: "Output", params: 514,     desc: "Dense k classes" },
] as const;

const TOTAL_PARAMS = LAYERS.reduce((sum, l) => sum + l.params, 0);

/** Strategy presets: unfreeze depth (how many layers from the bottom are trainable) */
const STRATEGIES = [
  { name: "Feature extraction", depth: 2, desc: "Freeze all conv blocks, train FC layers only" },
  { name: "Fine-tune top",       depth: 4, desc: "Freeze Conv1–2, train Conv3 + FC layers" },
  { name: "Full fine-tune",      depth: 6, desc: "Train all layers" },
] as const;

function formatParams(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function TransferLearningViz({ className }: { className?: string }) {
  const [unfreezeDepth, setUnfreezeDepth] = useState(2);
  const [activeStrategy, setActiveStrategy] = useState<number | null>(0);

  // unfrezeDepth = how many of the last N layers are trainable
  // depth=0 → all frozen, depth=6 → all trainable
  // Layers are ordered from bottom (Conv1) to top (Output)
  // trainable layers = last `unfreezeDepth` layers
  const trainableParams = LAYERS.slice(LAYERS.length - unfreezeDepth)
    .reduce((sum, l) => sum + l.params, 0);
  const trainablePct = TOTAL_PARAMS > 0 ? (trainableParams / TOTAL_PARAMS) * 100 : 0;

  // SVG layout
  const blockH = 44;
  const blockW = 260;
  const gap = 14;
  const stackH = LAYERS.length * blockH + (LAYERS.length - 1) * gap;
  const startY = (H - stackH) / 2;
  const startX = (W - blockW) / 2;

  // Arrow connector vertical positions
  const arrowTop = startY - 20;
  const arrowBottom = startY + stackH + 20;

  function handleStrategy(idx: number) {
    setActiveStrategy(idx);
    setUnfreezeDepth(STRATEGIES[idx].depth);
  }

  function handleSlider(v: number) {
    setActiveStrategy(null);
    setUnfreezeDepth(Math.round(v));
  }

  const inputArrowX = W / 2;
  const outputArrowY = startY + stackH;

  return (
    <VizFrame
      className={className}
      title="Transfer learning: freeze / unfreeze depth"
      caption="Frozen layers (gray) keep ImageNet weights intact; trainable layers (purple) update during fine-tuning. Use the slider or preset buttons to explore the three transfer strategies."
    >
      {/* Strategy presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STRATEGIES.map((s, i) => (
          <VizButton
            key={s.name}
            onClick={() => handleStrategy(i)}
            active={activeStrategy === i}
          >
            {s.name}
          </VizButton>
        ))}
      </div>

      {/* SVG diagram */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="CNN layer block diagram showing freeze/unfreeze depth">
        {/* Input arrow */}
        <defs>
          <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill={VIZ.axis} />
          </marker>
        </defs>

        {/* Input label + arrow */}
        <text
          x={inputArrowX}
          y={arrowTop - 4}
          fill={VIZ.text}
          fontSize={11}
          textAnchor="middle"
          fontFamily="monospace"
        >
          Input image
        </text>
        <line
          x1={inputArrowX}
          y1={arrowTop + 6}
          x2={inputArrowX}
          y2={startY - 2}
          stroke={VIZ.axis}
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />

        {/* Layer blocks */}
        {LAYERS.map((layer, i) => {
          // trainable if layer index >= (total - unfreezeDepth)
          const isTrainable = i >= LAYERS.length - unfreezeDepth;
          const blockColor = isTrainable ? VIZ.brand : VIZ.axis;
          const bgOpacity = isTrainable ? 0.18 : 0.08;
          const y = startY + i * (blockH + gap);
          const labelX = startX + blockW / 2;
          const labelY = y + blockH / 2;

          return (
            <g key={layer.id}>
              {/* Block background */}
              <rect
                x={startX}
                y={y}
                width={blockW}
                height={blockH}
                rx={8}
                fill={blockColor}
                fillOpacity={bgOpacity}
                stroke={blockColor}
                strokeWidth={isTrainable ? 2 : 1.5}
                strokeOpacity={isTrainable ? 0.9 : 0.45}
              />

              {/* Layer name */}
              <text
                x={labelX - 48}
                y={labelY - 5}
                fill={isTrainable ? VIZ.textBright : VIZ.text}
                fontSize={13}
                fontWeight={isTrainable ? "700" : "500"}
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {layer.label}
              </text>

              {/* Desc */}
              <text
                x={labelX - 48}
                y={labelY + 10}
                fill={VIZ.text}
                fontSize={9.5}
                textAnchor="middle"
                fontFamily="monospace"
                opacity={0.75}
              >
                {layer.desc}
              </text>

              {/* Param count */}
              <text
                x={startX + blockW - 10}
                y={labelY + 5}
                fill={isTrainable ? VIZ.brandLight : VIZ.axis}
                fontSize={11}
                textAnchor="end"
                fontFamily="monospace"
                fontWeight="600"
              >
                {formatParams(layer.params)}
              </text>

              {/* Frozen / trainable badge */}
              <rect
                x={startX + blockW - 84}
                y={labelY - 10}
                width={64}
                height={16}
                rx={4}
                fill={blockColor}
                fillOpacity={0.25}
                stroke={blockColor}
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <text
                x={startX + blockW - 84 + 32}
                y={labelY + 2}
                fill={blockColor}
                fontSize={9}
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="700"
              >
                {isTrainable ? "trainable" : "frozen"}
              </text>

              {/* Arrow between blocks */}
              {i < LAYERS.length - 1 && (
                <line
                  x1={inputArrowX}
                  y1={y + blockH + 1}
                  x2={inputArrowX}
                  y2={y + blockH + gap - 2}
                  stroke={VIZ.axis}
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                />
              )}
            </g>
          );
        })}

        {/* Output arrow */}
        <line
          x1={inputArrowX}
          y1={outputArrowY + 2}
          x2={inputArrowX}
          y2={arrowBottom - 4}
          stroke={VIZ.axis}
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
        <text
          x={inputArrowX}
          y={arrowBottom + 10}
          fill={VIZ.text}
          fontSize={11}
          textAnchor="middle"
          fontFamily="monospace"
        >
          Predictions
        </text>

        {/* Freeze bracket on the left */}
        {unfreezeDepth < LAYERS.length && (
          <>
            <rect
              x={startX - 26}
              y={startY - 2}
              width={18}
              height={(LAYERS.length - unfreezeDepth) * (blockH + gap) - gap + 4}
              rx={4}
              fill={VIZ.axis}
              fillOpacity={0.10}
              stroke={VIZ.axis}
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="3 2"
            />
            <text
              x={startX - 17}
              y={startY + ((LAYERS.length - unfreezeDepth) * (blockH + gap) - gap) / 2 + 4}
              fill={VIZ.axis}
              fontSize={9}
              textAnchor="middle"
              fontFamily="monospace"
              transform={`rotate(-90, ${startX - 17}, ${startY + ((LAYERS.length - unfreezeDepth) * (blockH + gap) - gap) / 2 + 4})`}
            >
              frozen backbone
            </text>
          </>
        )}

        {/* Trainable bracket on the left */}
        {unfreezeDepth > 0 && (
          <>
            <rect
              x={startX - 26}
              y={startY + (LAYERS.length - unfreezeDepth) * (blockH + gap) - 2}
              width={18}
              height={unfreezeDepth * (blockH + gap) - gap + 4}
              rx={4}
              fill={VIZ.brand}
              fillOpacity={0.10}
              stroke={VIZ.brand}
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="3 2"
            />
            <text
              x={startX - 17}
              y={startY + (LAYERS.length - unfreezeDepth) * (blockH + gap) + (unfreezeDepth * (blockH + gap) - gap) / 2 + 4}
              fill={VIZ.brand}
              fontSize={9}
              textAnchor="middle"
              fontFamily="monospace"
              transform={`rotate(-90, ${startX - 17}, ${startY + (LAYERS.length - unfreezeDepth) * (blockH + gap) + (unfreezeDepth * (blockH + gap) - gap) / 2 + 4})`}
            >
              trainable
            </text>
          </>
        )}
      </svg>

      {/* Slider */}
      <div className="mt-2 mb-3">
        <VizSlider
          label="Unfreeze depth (layers from top)"
          min={0}
          max={6}
          step={1}
          value={unfreezeDepth}
          onChange={handleSlider}
          format={(v) => {
            if (v === 0) return "all frozen";
            if (v === 6) return "all trainable";
            return `top ${Math.round(v)} layer${v > 1 ? "s" : ""}`;
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-6 mt-1">
        <VizStat
          label="trainable params"
          value={formatParams(trainableParams)}
          color={VIZ.brand}
        />
        <VizStat
          label="frozen params"
          value={formatParams(TOTAL_PARAMS - trainableParams)}
          color={VIZ.axis}
        />
        <VizStat
          label="% trainable"
          value={trainablePct < 0.1 && trainablePct > 0 ? "<0.1%" : trainablePct.toFixed(1) + "%"}
          color={VIZ.teal}
        />
        <VizStat label="total params" value={formatParams(TOTAL_PARAMS)} />
      </div>
    </VizFrame>
  );
}
