"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Gradient descent on a 2D loss surface, drawn as a contour heatmap. Toggle
 * between a convex bowl (one global minimum) and a saddle (a critical point
 * that is neither a min nor max) to see why curvature matters for optimization.
 */

const W = 360;
const H = 360;
const DOM: [number, number] = [-3, 3];
const CELLS = 32;

type Surface = { name: string; f: (x: number, y: number) => number; grad: (x: number, y: number) => [number, number] };
const SURF: Record<string, Surface> = {
  bowl: { name: "Convex bowl  x²+y²", f: (x, y) => x * x + y * y, grad: (x, y) => [2 * x, 2 * y] },
  saddle: { name: "Saddle  x²−y²", f: (x, y) => x * x - y * y, grad: (x, y) => [2 * x, -2 * y] },
};

// lerp between two hex colors, t in [0,1]
function mix(c0: string, c1: string, t: number) {
  const p = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [r0, g0, b0] = p(c0);
  const [r1, g1, b1] = p(c1);
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

export function GradientFieldViz({ className }: { className?: string }) {
  const [key, setKey] = useState<keyof typeof SURF>("bowl");
  const [lr, setLr] = useState(0.1);
  const [path, setPath] = useState<[number, number][]>([[-2.5, 2.2]]);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const surf = SURF[key];
  const sx = scale(DOM[0], DOM[1], 0, W);
  const sy = scale(DOM[0], DOM[1], H, 0);
  const cell = W / CELLS;

  const heat = useMemo(() => {
    const vals: { x: number; y: number; v: number }[] = [];
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < CELLS; i++) {
      for (let j = 0; j < CELLS; j++) {
        const x = DOM[0] + ((i + 0.5) / CELLS) * (DOM[1] - DOM[0]);
        const y = DOM[0] + ((j + 0.5) / CELLS) * (DOM[1] - DOM[0]);
        const v = surf.f(x, y);
        min = Math.min(min, v);
        max = Math.max(max, v);
        vals.push({ x: i, y: j, v });
      }
    }
    return { vals, min, max };
  }, [surf]);

  const cur = path[path.length - 1];

  function step() {
    setPath((p) => {
      const [x, y] = p[p.length - 1];
      const [gx, gy] = surf.grad(x, y);
      const nx = Math.max(DOM[0], Math.min(DOM[1], x - lr * gx));
      const ny = Math.max(DOM[0], Math.min(DOM[1], y - lr * gy));
      return [...p, [nx, ny]];
    });
  }

  function togglePlay() {
    if (playing) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      timer.current = setInterval(step, 280);
    }
  }

  function reset(k: keyof typeof SURF = key) {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setKey(k);
    setPath([[-2.5, 2.2]]);
  }

  return (
    <VizFrame
      className={className}
      title="Gradient descent on a 2D loss surface"
      caption="Darker = lower loss. On the convex bowl every path spirals into the single minimum. On the saddle, descent slides away along the y-axis — a critical point where the gradient is zero but it's not a minimum."
    >
      <div className="flex gap-2 mb-3">
        {Object.entries(SURF).map(([k, v]) => (
          <VizButton key={k} onClick={() => reset(k as keyof typeof SURF)} active={k === key}>{v.name}</VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto block" role="img" aria-label={`Loss surface ${surf.name}`}>
        {heat.vals.map((c, i) => {
          const t = (c.v - heat.min) / (heat.max - heat.min || 1);
          return <rect key={i} x={c.x * cell} y={H - (c.y + 1) * cell} width={cell + 0.5} height={cell + 0.5} fill={mix("#0f1117", VIZ.brand, t)} />;
        })}

        {/* descent path */}
        {path.map((pt, i) => {
          if (i === 0) return null;
          const prev = path[i - 1];
          return <line key={`l${i}`} x1={sx(prev[0])} y1={sy(prev[1])} x2={sx(pt[0])} y2={sy(pt[1])} stroke={VIZ.yellow} strokeWidth={1.5} />;
        })}
        {path.slice(0, -1).map((pt, i) => (
          <circle key={`d${i}`} cx={sx(pt[0])} cy={sy(pt[1])} r={2.5} fill={VIZ.yellow} opacity={0.6} />
        ))}
        <circle cx={sx(cur[0])} cy={sy(cur[1])} r={6} fill={VIZ.orange} stroke="#fff" strokeWidth={1.5} />
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="learning rate" min={0.01} max={0.5} step={0.01} value={lr} onChange={setLr} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <VizButton onClick={togglePlay} active={playing}>{playing ? "Pause" : "Play"}</VizButton>
          <VizButton onClick={step}>Step</VizButton>
          <VizButton onClick={() => reset()}>Reset</VizButton>
        </div>
        <div className="flex gap-4 ml-auto">
          <VizStat label="step" value={String(path.length - 1)} />
          <VizStat label="loss" value={surf.f(cur[0], cur[1]).toFixed(3)} color={VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
