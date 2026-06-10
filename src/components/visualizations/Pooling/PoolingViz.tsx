"use client";

import { useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  useAnimationLoop,
  seededRandom,
} from "../viz-kit";

/**
 * Pooling: a 2×2 window slides over a 6×6 input feature map. Supports
 * max pooling and average pooling, and stride 1 or 2.
 */

const GRID = 6;
const WIN = 2;

const INPUT: number[][] = (() => {
  const rng = seededRandom(31);
  return Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => Math.floor(rng() * 10))
  );
})();

/** Linear interpolation between VIZ.card and VIZ.brand based on value 0–9. */
function cellColor(v: number): string {
  const t = v / 9;
  // VIZ.card = #1a1d27 (dark), VIZ.brand = #6366f1 (indigo)
  const r = Math.round(0x1a + t * (0x63 - 0x1a));
  const g = Math.round(0x1d + t * (0x66 - 0x1d));
  const b = Math.round(0x27 + t * (0xf1 - 0x27));
  return `rgb(${r},${g},${b})`;
}

function outputSize(stride: number): number {
  return Math.floor((GRID - WIN) / stride) + 1;
}

function computePool(
  r: number,
  c: number,
  mode: "max" | "avg"
): number {
  const vals: number[] = [];
  for (let i = 0; i < WIN; i++)
    for (let j = 0; j < WIN; j++)
      vals.push(INPUT[r + i][c + j]);
  if (mode === "max") return Math.max(...vals);
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}

export function PoolingViz({ className }: { className?: string }) {
  const [stride, setStride] = useState(2);
  const [mode, setMode] = useState<"max" | "avg">("max");
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const elapsedRef = useRef(0);

  const outN = outputSize(stride);
  const totalPositions = outN * outN;
  const done = pos >= totalPositions;

  // current window top-left
  const winRow = done ? outN - 1 : Math.floor(pos / outN) * stride;
  const winCol = done ? (outN - 1) * stride : (pos % outN) * stride;
  const curOutR = done ? outN - 1 : Math.floor(pos / outN);
  const curOutC = done ? pos % outN : pos % outN;

  // animation: 1.5 steps/sec → advance every ~0.667s
  useAnimationLoop((dt: number) => {
    if (!playing || done) return;
    elapsedRef.current += dt;
    if (elapsedRef.current >= 0.667) {
      elapsedRef.current -= 0.667;
      setPos((p) => Math.min(p + 1, totalPositions));
    }
  }, playing && !done);

  function step() {
    if (!done) setPos((p) => Math.min(p + 1, totalPositions));
  }
  function togglePlay() {
    if (done) return;
    setPlaying((p) => !p);
    elapsedRef.current = 0;
  }
  function reset() {
    setPlaying(false);
    setPos(0);
    elapsedRef.current = 0;
  }
  function changeStride(s: number) {
    reset();
    setStride(s);
  }
  function changeMode(m: "max" | "avg") {
    reset();
    setMode(m);
  }

  // layout constants
  const cell = 34;
  const gap = 3;
  const inPanelW = GRID * (cell + gap) + gap;
  const outPanelW = Math.max(outN * (cell + gap) + gap, 80);
  const panelH = GRID * (cell + gap) + gap;
  const arrowX = inPanelW + 10;
  const outStartX = arrowX + 36;
  const totalW = outStartX + outPanelW + 8;

  return (
    <VizFrame
      className={className}
      title="Pooling: sliding window downsampling"
      caption="A 2×2 pooling window slides over the 6×6 input. Max pooling keeps the largest value (preserving strong activations); average pooling takes the mean (smoother output). Stride 2 halves each spatial dimension."
    >
      {/* SVG panel */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW} ${panelH + 14}`}
          width={totalW}
          className="block"
          role="img"
          aria-label="pooling visualization"
        >
          {/* --- Input feature map --- */}
          <text x={0} y={10} fill={VIZ.text} fontSize={9} fontFamily="monospace">
            input 6×6
          </text>
          {INPUT.map((row, r) =>
            row.map((v, c) => {
              const inWindow =
                !done &&
                r >= winRow && r < winRow + WIN &&
                c >= winCol && c < winCol + WIN;
              const alreadyInWindow =
                done && r >= winRow && r < winRow + WIN && c >= winCol && c < winCol + WIN;
              const highlight = inWindow || alreadyInWindow;
              const x = c * (cell + gap) + gap;
              const y = r * (cell + gap) + gap + 14;
              return (
                <g key={`in-${r}-${c}`}>
                  <rect
                    x={x} y={y} width={cell} height={cell} rx={3}
                    fill={cellColor(v)}
                    stroke={highlight ? VIZ.yellow : VIZ.grid}
                    strokeWidth={highlight ? 2.5 : 0.5}
                  />
                  <text
                    x={x + cell / 2} y={y + cell / 2 + 4}
                    fill={VIZ.textBright} fontSize={10} textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {v}
                  </text>
                </g>
              );
            })
          )}

          {/* --- Arrow label --- */}
          <text
            x={arrowX + 2} y={panelH / 2 + 14}
            fill={VIZ.text} fontSize={9} textAnchor="middle"
            fontFamily="monospace"
          >
            Pool
          </text>
          <text
            x={arrowX + 2} y={panelH / 2 + 25}
            fill={VIZ.text} fontSize={9} textAnchor="middle"
            fontFamily="monospace"
          >
            →
          </text>

          {/* --- Output feature map --- */}
          <text x={outStartX} y={10} fill={VIZ.text} fontSize={9} fontFamily="monospace">
            output {outN}×{outN}
          </text>
          {Array.from({ length: outN }, (_, r) =>
            Array.from({ length: outN }, (_, c) => {
              const idx = r * outN + c;
              const computed = idx < pos;
              const isCurrent = idx === pos && !done;
              const x = outStartX + c * (cell + gap) + gap;
              const y = r * (cell + gap) + gap + 14;
              const val = computePool(r * stride, c * stride, mode);
              return (
                <g key={`out-${r}-${c}`}>
                  <rect
                    x={x} y={y} width={cell} height={cell} rx={3}
                    fill={computed || (done && idx < totalPositions) ? cellColor(Math.min(9, Math.round(val))) : VIZ.grid}
                    stroke={isCurrent ? VIZ.yellow : VIZ.grid}
                    strokeWidth={isCurrent ? 2.5 : 0.5}
                  />
                  {(computed || (done && idx < totalPositions)) && (
                    <text
                      x={x + cell / 2} y={y + cell / 2 + 4}
                      fill={VIZ.textBright} fontSize={9} textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {Number.isInteger(val) ? val : val.toFixed(1)}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Done overlay */}
          {done && (
            <text
              x={outStartX + outPanelW / 2} y={panelH + 10}
              fill={VIZ.teal} fontSize={10} textAnchor="middle"
              fontFamily="monospace"
            >
              Done ✓
            </text>
          )}
        </svg>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <div className="flex gap-2">
          <VizButton onClick={togglePlay} active={playing}>
            {playing ? "Pause" : "Play"}
          </VizButton>
          <VizButton onClick={step}>Step</VizButton>
          <VizButton onClick={reset}>Reset</VizButton>
        </div>
        <div className="flex gap-2">
          <VizButton onClick={() => changeMode("max")} active={mode === "max"}>Max</VizButton>
          <VizButton onClick={() => changeMode("avg")} active={mode === "avg"}>Avg</VizButton>
        </div>
      </div>

      <div className="mt-3">
        <VizSlider
          label="Stride"
          min={1} max={2} step={1}
          value={stride}
          onChange={(v) => changeStride(Math.round(v))}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat
          label="position"
          value={done ? `(${curOutR},${curOutC})` : pos < totalPositions ? `(${Math.floor(pos / outN)},${pos % outN})` : "—"}
          color={VIZ.yellow}
        />
        <VizStat label="window" value="2×2" />
        <VizStat label="stride" value={String(stride)} />
        <VizStat
          label="output size"
          value={`${outN}×${outN}`}
          color={VIZ.teal}
        />
      </div>
    </VizFrame>
  );
}
