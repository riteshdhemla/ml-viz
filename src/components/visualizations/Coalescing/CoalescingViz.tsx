"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat } from "../viz-kit";

/**
 * Memory coalescing: 8 threads of a warp each read one global-memory cell at
 * address `t * stride`. Global memory is delivered in fixed transactions
 * (cache lines) of SEG cells. With stride 1 the accesses fall into the fewest
 * transactions (coalesced, ~100% efficient); larger strides scatter them
 * across more transactions, wasting most of the fetched bytes.
 */

const THREADS = 8; // a small warp, for clarity (real NVIDIA warps are 32)
const SEG = 4; // cells per memory transaction (a "cache line")

export function CoalescingViz({ className }: { className?: string }) {
  const [stride, setStride] = useState(1);

  // Each thread t accesses address t*stride.
  const addresses = Array.from({ length: THREADS }, (_, t) => t * stride);
  const accessed = new Set(addresses);
  const maxAddr = addresses[THREADS - 1];

  // Which transactions (segments of SEG cells) are touched?
  const touched = new Set(addresses.map((a) => Math.floor(a / SEG)));
  const numSegments = Math.ceil((maxAddr + 1) / SEG);
  const transactions = touched.size;

  const bytesFetched = transactions * SEG;
  const efficiency = (THREADS / bytesFetched) * 100;

  // layout
  const cell = 26;
  const gap = 2;
  const totalCells = numSegments * SEG;
  const memY = 56;
  const totalW = totalCells * (cell + gap) + gap + 4;
  const totalH = memY + cell + 30;

  const effColor =
    efficiency > 80 ? VIZ.teal : efficiency > 40 ? VIZ.yellow : VIZ.rose;

  return (
    <VizFrame
      className={className}
      title="Memory coalescing: stride decides bandwidth"
      caption="Eight threads of a warp each read one memory cell. Global memory arrives in fixed transactions (here 4 cells each). Stride 1 packs the reads into the fewest transactions — coalesced, ~100% of fetched bytes used. Larger strides scatter reads across more transactions, so most fetched bytes are wasted and effective bandwidth collapses."
    >
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          width={totalW}
          className="block"
          role="img"
          aria-label="memory coalescing visualization"
        >
          {/* thread labels + access arrows */}
          <text x={2} y={10} fill={VIZ.text} fontSize={9} fontFamily="monospace">
            {THREADS} threads (one warp) → address t × stride
          </text>
          {addresses.map((addr, t) => {
            const x = addr * (cell + gap) + gap + cell / 2;
            return (
              <g key={`th-${t}`}>
                <text
                  x={x}
                  y={28}
                  fill={VIZ.brandLight}
                  fontSize={9}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  t{t}
                </text>
                <line
                  x1={x}
                  y1={32}
                  x2={x}
                  y2={memY - 2}
                  stroke={VIZ.brand}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {/* transaction (segment) brackets */}
          {Array.from({ length: numSegments }, (_, s) => {
            const isTouched = touched.has(s);
            const x = s * SEG * (cell + gap) + gap;
            const w = SEG * (cell + gap) - gap;
            return (
              <g key={`seg-${s}`}>
                <rect
                  x={x - 1}
                  y={memY - 3}
                  width={w + 2}
                  height={cell + 6}
                  rx={4}
                  fill="none"
                  stroke={isTouched ? effColor : VIZ.grid}
                  strokeWidth={isTouched ? 2 : 1}
                  strokeDasharray={isTouched ? undefined : "3 3"}
                />
                <text
                  x={x + w / 2}
                  y={memY + cell + 16}
                  fill={isTouched ? effColor : VIZ.text}
                  fontSize={8}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {isTouched ? "fetched" : "—"}
                </text>
              </g>
            );
          })}

          {/* memory cells */}
          {Array.from({ length: totalCells }, (_, a) => {
            const x = a * (cell + gap) + gap;
            const isUsed = accessed.has(a);
            const inTouched = touched.has(Math.floor(a / SEG));
            const fill = isUsed
              ? VIZ.brand
              : inTouched
              ? "#3a2030" // fetched but wasted
              : VIZ.card;
            return (
              <g key={`mem-${a}`}>
                <rect
                  x={x}
                  y={memY}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={fill}
                  stroke={isUsed ? VIZ.brandLight : VIZ.grid}
                  strokeWidth={isUsed ? 2 : 0.5}
                />
                <text
                  x={x + cell / 2}
                  y={memY + cell / 2 + 3}
                  fill={isUsed ? VIZ.textBright : VIZ.text}
                  fontSize={8}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {a}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 max-w-xs">
        <VizSlider
          label="Access stride"
          min={1}
          max={4}
          step={1}
          value={stride}
          onChange={(v) => setStride(Math.round(v))}
          format={(v) => `${v}×`}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="threads" value={String(THREADS)} />
        <VizStat label="transactions" value={String(transactions)} color={effColor} />
        <VizStat label="bytes used" value={`${THREADS}/${bytesFetched}`} />
        <VizStat
          label="efficiency"
          value={`${efficiency.toFixed(0)}%`}
          color={effColor}
        />
      </div>
    </VizFrame>
  );
}
