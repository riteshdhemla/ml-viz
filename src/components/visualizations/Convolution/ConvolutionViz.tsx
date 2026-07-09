"use client";

import { useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat, seededRandom } from "../viz-kit";

/**
 * The convolution operation. A 3×3 kernel slides over a 6×6 input (stride 1,
 * valid padding) producing a 4×4 feature map. Step through positions to see the
 * receptive field and the multiply-accumulate that fills each output cell.
 */

const IN = 6;
const K = 3;
const OUT = IN - K + 1; // 4

const INPUT: number[][] = (() => {
  const rng = seededRandom(5);
  // a rough vertical edge: left dark, right bright, plus noise
  return Array.from({ length: IN }, () =>
    Array.from({ length: IN }, (_, c) => Math.round((c < IN / 2 ? 0.2 : 0.8) * 9 + (rng() - 0.5) * 2))
  );
})();

const KERNELS: Record<string, number[][]> = {
  "Edge": [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
  "Sobel ↕": [[1, 2, 1], [0, 0, 0], [-1, -2, -1]],
  "Blur": [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((v) => v / 9)),
};

function gray(v: number, lo: number, hi: number) {
  const t = (v - lo) / (hi - lo || 1);
  const c = Math.round(20 + t * 200);
  return `rgb(${c},${c},${Math.min(255, c + 10)})`;
}

export function ConvolutionViz({ className }: { className?: string }) {
  const [kname, setKname] = useState<keyof typeof KERNELS>("Edge");
  const [pos, setPos] = useState(0); // 0..OUT*OUT-1
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const kernel = KERNELS[kname];
  const or = Math.floor(pos / OUT);
  const oc = pos % OUT;

  // compute full output for color scaling
  const output: number[][] = Array.from({ length: OUT }, (_, r) =>
    Array.from({ length: OUT }, (_, c) => {
      let s = 0;
      for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) s += INPUT[r + i][c + j] * kernel[i][j];
      return s;
    })
  );
  const oFlat = output.flat();
  const oLo = Math.min(...oFlat);
  const oHi = Math.max(...oFlat);
  const current = output[or][oc];

  function step() {
    setPos((p) => (p + 1) % (OUT * OUT));
  }
  function togglePlay() {
    if (playing) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      timer.current = setInterval(step, 600);
    }
  }
  function reset(k: keyof typeof KERNELS = kname) {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setKname(k);
    setPos(0);
  }

  const cell = 30;
  const gap = 4;
  const inW = IN * (cell + gap);
  const outW = OUT * (cell + gap);

  return (
    <VizFrame
      className={className}
      title="Convolution: a kernel slides over the input"
      caption="The kernel multiplies its weights with the overlapping input patch and sums them into one output cell (stride 1, no padding → 6×6 becomes 4×4). The same small kernel is reused at every position — that's weight sharing."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.keys(KERNELS).map((k) => (
          <VizButton key={k} onClick={() => reset(k as keyof typeof KERNELS)} active={k === kname}>{k}</VizButton>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6 justify-center">
        {/* input */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">input 6×6</p>
          <svg viewBox={`0 0 ${inW} ${inW}`} width={inW} className="block" role="img" aria-label="convolution input">
            {INPUT.map((row, r) =>
              row.map((v, c) => {
                const inField = r >= or && r < or + K && c >= oc && c < oc + K;
                return (
                  <g key={`${r}-${c}`}>
                    <rect x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={3} fill={gray(v, -2, 11)} stroke={inField ? VIZ.yellow : "transparent"} strokeWidth={inField ? 2 : 0} />
                    <text x={c * (cell + gap) + cell / 2} y={r * (cell + gap) + cell / 2 + 3} fill="#cbd5e1" fontSize={9} textAnchor="middle">{v}</text>
                  </g>
                );
              })
            )}
          </svg>
        </div>

        {/* output */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">feature map 4×4</p>
          <svg viewBox={`0 0 ${outW} ${outW}`} width={outW} className="block" role="img" aria-label="convolution output">
            {output.map((row, r) =>
              row.map((v, c) => {
                const done = r * OUT + c <= pos;
                const isCur = r === or && c === oc;
                return (
                  <g key={`${r}-${c}`}>
                    <rect x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={3} fill={done ? gray(v, oLo, oHi) : VIZ.card} stroke={isCur ? VIZ.orange : VIZ.grid} strokeWidth={isCur ? 2 : 0.5} />
                    {done && <text x={c * (cell + gap) + cell / 2} y={r * (cell + gap) + cell / 2 + 3} fill="#cbd5e1" fontSize={9} textAnchor="middle">{v.toFixed(0)}</text>}
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex gap-2">
          <VizButton onClick={togglePlay} active={playing}>{playing ? "Pause" : "Play"}</VizButton>
          <VizButton onClick={step}>Step</VizButton>
          <VizButton onClick={() => reset()}>Reset</VizButton>
        </div>
        <div className="flex gap-4 ml-auto">
          <VizStat label="position" value={`(${or},${oc})`} color={VIZ.orange} />
          <VizStat label="output value" value={current.toFixed(1)} color={VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
