"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat } from "../viz-kit";

/**
 * Sinusoidal positional encoding heatmap.
 *
 * Rows = positions 0–15, columns = dimensions 0–31.
 * Each cell shows PE[pos][dim] mapped from -1→+1 onto a
 * blue → white → brand (indigo) colour gradient.
 *
 * A slider selects the highlighted position; a mini bar-chart
 * below shows the cosine similarity of that position's vector
 * against every other position, illustrating how nearby positions
 * get similar encodings.
 */

const NUM_POS = 16; // rows
const NUM_DIM = 32; // columns
const D_MODEL = NUM_DIM; // model dimension used in PE formula

// ── PE computation ────────────────────────────────────────────────────────────

/** Compute PE[pos][dim] analytically (no random state). */
function computePE(pos: number, dim: number): number {
  const i = Math.floor(dim / 2);
  const angle = pos / Math.pow(10000, (2 * i) / D_MODEL);
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
}

/** Full PE matrix as a 2-D array [pos][dim]. */
function buildPEMatrix(): number[][] {
  return Array.from({ length: NUM_POS }, (_, pos) =>
    Array.from({ length: NUM_DIM }, (_, dim) => computePE(pos, dim))
  );
}

/** Dot product of two equal-length vectors. */
function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

/** L2 norm of a vector. */
function norm(a: number[]): number {
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0));
}

/** Cosine similarity in [-1, 1]. */
function cosineSimilarity(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

/** Parse "#rrggbb" → [r, g, b] 0..255 */
function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Interpolate two [r,g,b] triples by t ∈ [0,1]. */
function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bv = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bv})`;
}

const BLUE_RGB = hex2rgb("#1e40af"); // cold / negative
const WHITE_RGB: [number, number, number] = [226, 232, 240]; // neutral zero (#e2e8f0)
const BRAND_RGB = hex2rgb("#6366f1"); // warm / positive

/** Map a PE value in [-1, +1] onto the blue→white→brand gradient. */
function peColor(v: number): string {
  if (v < 0) {
    // [-1, 0] → blue → white
    return lerpRgb(BLUE_RGB, WHITE_RGB, v + 1); // t = v+1 ∈ [0,1]
  } else {
    // [0, 1] → white → brand
    return lerpRgb(WHITE_RGB, BRAND_RGB, v);
  }
}

// ── Layout constants ──────────────────────────────────────────────────────────

const CELL_W = 14; // px per dimension column
const CELL_H = 18; // px per position row
const LABEL_W = 24; // left axis labels
const LABEL_H = 16; // top axis labels
const HEATMAP_W = LABEL_W + NUM_DIM * CELL_W;
const HEATMAP_H = LABEL_H + NUM_POS * CELL_H;

// ── Component ─────────────────────────────────────────────────────────────────

export function PositionalEncodingViz({ className }: { className?: string }) {
  const [selectedPos, setSelectedPos] = useState(3);

  const peMatrix = useMemo(() => buildPEMatrix(), []);

  // Cosine similarities of selectedPos vs all positions
  const similarities = useMemo(() => {
    const ref = peMatrix[selectedPos];
    return peMatrix.map((row) => cosineSimilarity(ref, row));
  }, [peMatrix, selectedPos]);

  // ── Heatmap SVG ─────────────────────────────────────────────────────────────
  const cells = useMemo(() => {
    return peMatrix.flatMap((row, pos) =>
      row.map((v, dim) => ({
        pos,
        dim,
        x: LABEL_W + dim * CELL_W,
        y: LABEL_H + pos * CELL_H,
        color: peColor(v),
      }))
    );
  }, [peMatrix]);

  // Bar chart layout
  const BAR_W = 320;
  const BAR_H = 110;
  const BAR_MARGIN = { top: 10, right: 12, bottom: 22, left: 32 };
  const barInnerW = BAR_W - BAR_MARGIN.left - BAR_MARGIN.right;
  const barInnerH = BAR_H - BAR_MARGIN.top - BAR_MARGIN.bottom;
  const barWidth = barInnerW / NUM_POS - 2;

  return (
    <VizFrame
      className={className}
      title="Sinusoidal positional encoding"
      caption="Each row is a position's encoding vector. The heatmap colour maps PE values from -1 (blue) through 0 (light) to +1 (indigo). High-frequency dimensions (left) vary rapidly between adjacent positions; low-frequency dimensions (right) change slowly. The bar chart shows how similar the selected position's vector is to every other position — nearby positions are more similar."
    >
      {/* ── Slider ─────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <VizSlider
          label="Selected position"
          min={0}
          max={NUM_POS - 1}
          step={1}
          value={selectedPos}
          onChange={(v) => setSelectedPos(Math.round(v))}
          format={(v) => `pos ${Math.round(v)}`}
        />
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="flex gap-6 mb-4">
        <VizStat label="Selected position" value={`pos ${selectedPos}`} color={VIZ.brand} />
        <VizStat
          label="Self-similarity"
          value="1.000"
          color={VIZ.teal}
        />
        <VizStat
          label="Sim to pos ±1"
          value={
            selectedPos > 0
              ? similarities[selectedPos - 1].toFixed(3)
              : similarities[selectedPos + 1]?.toFixed(3) ?? "—"
          }
          color={VIZ.yellow}
        />
        <VizStat
          label="Sim to pos ±4"
          value={
            selectedPos >= 4
              ? similarities[selectedPos - 4].toFixed(3)
              : selectedPos + 4 < NUM_POS
              ? similarities[selectedPos + 4].toFixed(3)
              : "—"
          }
          color={VIZ.orange}
        />
      </div>

      {/* ── Heatmap + Bar chart side by side ───────────────────────────────── */}
      <div className="flex flex-wrap gap-6 items-start">
        {/* Heatmap */}
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${HEATMAP_W} ${HEATMAP_H}`}
            width={HEATMAP_W}
            height={HEATMAP_H}
            role="img"
            aria-label="Positional encoding heatmap"
            style={{ display: "block" }}
          >
            {/* Axis labels — positions (rows) */}
            {Array.from({ length: NUM_POS }, (_, pos) => (
              <text
                key={`row-${pos}`}
                x={LABEL_W - 4}
                y={LABEL_H + pos * CELL_H + CELL_H / 2 + 4}
                fill={pos === selectedPos ? VIZ.textBright : VIZ.text}
                fontSize={9}
                textAnchor="end"
                fontWeight={pos === selectedPos ? "bold" : "normal"}
              >
                {pos}
              </text>
            ))}

            {/* Axis labels — dims (columns, every 4) */}
            {Array.from({ length: NUM_DIM }, (_, dim) =>
              dim % 4 === 0 ? (
                <text
                  key={`col-${dim}`}
                  x={LABEL_W + dim * CELL_W + CELL_W / 2}
                  y={LABEL_H - 3}
                  fill={VIZ.text}
                  fontSize={8}
                  textAnchor="middle"
                >
                  {dim}
                </text>
              ) : null
            )}

            {/* Heatmap cells */}
            {cells.map(({ pos, dim, x, y, color }) => {
              const isSelected = pos === selectedPos;
              return (
                <rect
                  key={`${pos}-${dim}`}
                  x={x}
                  y={y}
                  width={CELL_W}
                  height={CELL_H}
                  fill={color}
                  opacity={isSelected ? 1 : 0.82}
                  stroke={isSelected ? VIZ.textBright : "none"}
                  strokeWidth={isSelected ? (dim === 0 ? 1.5 : dim === NUM_DIM - 1 ? 1.5 : 0) : 0}
                />
              );
            })}

            {/* Bright outline for selected row */}
            <rect
              x={LABEL_W}
              y={LABEL_H + selectedPos * CELL_H}
              width={NUM_DIM * CELL_W}
              height={CELL_H}
              fill="none"
              stroke={VIZ.textBright}
              strokeWidth={1.5}
              rx={1}
            />

            {/* Column axis label */}
            <text
              x={LABEL_W + (NUM_DIM * CELL_W) / 2}
              y={HEATMAP_H - 1}
              fill={VIZ.text}
              fontSize={9}
              textAnchor="middle"
            >
              dimension →
            </text>
          </svg>
        </div>

        {/* Similarity bar chart */}
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] text-slate-400 mb-1">
            Cosine similarity to pos {selectedPos}
          </p>
          <svg
            viewBox={`0 0 ${BAR_W} ${BAR_H}`}
            width="100%"
            role="img"
            aria-label={`Cosine similarity of position ${selectedPos} to all positions`}
          >
            {/* zero line */}
            <line
              x1={BAR_MARGIN.left}
              y1={BAR_MARGIN.top + barInnerH}
              x2={BAR_MARGIN.left + barInnerW}
              y2={BAR_MARGIN.top + barInnerH}
              stroke={VIZ.axis}
              strokeWidth={1}
            />
            {/* y-axis ticks: 0, 0.5, 1.0 */}
            {[0, 0.5, 1.0].map((tick) => {
              const yy =
                BAR_MARGIN.top + barInnerH - tick * barInnerH;
              return (
                <g key={tick}>
                  <line
                    x1={BAR_MARGIN.left - 3}
                    y1={yy}
                    x2={BAR_MARGIN.left}
                    y2={yy}
                    stroke={VIZ.axis}
                    strokeWidth={1}
                  />
                  <text
                    x={BAR_MARGIN.left - 5}
                    y={yy + 3}
                    fill={VIZ.text}
                    fontSize={8}
                    textAnchor="end"
                  >
                    {tick.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {similarities.map((sim, pos) => {
              const barH = Math.max(1, sim * barInnerH);
              const x =
                BAR_MARGIN.left + pos * (barInnerW / NUM_POS) + 1;
              const y = BAR_MARGIN.top + barInnerH - barH;
              const isSelected = pos === selectedPos;
              const dist = Math.abs(pos - selectedPos);
              // Color: selected = brand, nearby = teal, far = slate
              const barColor =
                isSelected
                  ? VIZ.brand
                  : dist <= 1
                  ? VIZ.teal
                  : dist <= 3
                  ? VIZ.yellow
                  : VIZ.axis;
              return (
                <g key={pos}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    fill={barColor}
                    opacity={isSelected ? 1 : 0.8}
                    rx={1}
                  />
                  {/* position label below */}
                  <text
                    x={x + barWidth / 2}
                    y={BAR_MARGIN.top + barInnerH + 11}
                    fill={
                      isSelected ? VIZ.textBright : VIZ.text
                    }
                    fontSize={7}
                    textAnchor="middle"
                  >
                    {pos}
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div className="flex gap-3 mt-1 flex-wrap">
            {[
              { color: VIZ.brand, label: "selected" },
              { color: VIZ.teal, label: "±1" },
              { color: VIZ.yellow, label: "±2–3" },
              { color: VIZ.axis, label: "far" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-slate-400">
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: color,
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </VizFrame>
  );
}
