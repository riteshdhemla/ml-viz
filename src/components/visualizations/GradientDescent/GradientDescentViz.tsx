"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Animated gradient descent on a 1D loss curve f(x) = x².
 * The ball steps downhill by x ← x − lr·f'(x). Small learning rates inch toward
 * the minimum; large ones (lr ≥ 1) zig-zag, and lr > 1 diverges — the same
 * behaviour shown in the lesson, made interactive.
 */

const W = 480;
const H = 280;
const M = { top: 16, right: 16, bottom: 28, left: 36 };
const XD: [number, number] = [-5, 5];
const YD: [number, number] = [0, 25];

const f = (x: number) => x * x;
const grad = (x: number) => 2 * x;

export function GradientDescentViz({ className }: { className?: string }) {
  const [lr, setLr] = useState(0.1);
  const [startX, setStartX] = useState(-4.2);
  const [path, setPath] = useState<number[]>([-4.2]);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sx = scale(XD[0], XD[1], M.left, W - M.right);
  const sy = scale(YD[0], YD[1], H - M.bottom, M.top);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = XD[0] + (i / 100) * (XD[1] - XD[0]);
      pts.push(`${sx(x)},${sy(Math.min(f(x), YD[1]))}`);
    }
    return `M${pts.join("L")}`;
  }, [sx, sy]);

  const x = path[path.length - 1];
  const diverged = Math.abs(x) > 5;

  function step() {
    setPath((p) => {
      const cur = p[p.length - 1];
      if (Math.abs(cur) > 5) return p; // clamp once diverged
      const next = cur - lr * grad(cur);
      return [...p, next];
    });
  }

  function togglePlay() {
    if (playing) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      timer.current = setInterval(() => step(), 350);
    }
  }

  function reset() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setPath([startX]);
  }

  function onStartChange(v: number) {
    setStartX(v);
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setPath([v]);
  }

  return (
    <VizFrame
      className={className}
      title="Gradient descent on f(x) = x²"
      caption="Each step moves the ball by −learning-rate × gradient. Push the learning rate past 1.0 to watch it diverge."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gradient descent loss curve">
        {/* axes */}
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <text x={W / 2} y={H - 6} fill={VIZ.text} fontSize={11} textAnchor="middle">weight x</text>
        <text x={10} y={M.top + 6} fill={VIZ.text} fontSize={11}>loss</text>

        {/* loss curve */}
        <path d={curve} fill="none" stroke={VIZ.brand} strokeWidth={2} />

        {/* descent path: faint connectors + dots */}
        {path.map((px, i) => {
          if (i === 0) return null;
          const prev = path[i - 1];
          return (
            <line
              key={`l${i}`}
              x1={sx(prev)}
              y1={sy(Math.min(f(prev), YD[1]))}
              x2={sx(px)}
              y2={sy(Math.min(f(px), YD[1]))}
              stroke={VIZ.yellow}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          );
        })}
        {path.slice(0, -1).map((px, i) => (
          <circle key={`d${i}`} cx={sx(px)} cy={sy(Math.min(f(px), YD[1]))} r={3} fill={VIZ.yellow} opacity={0.45} />
        ))}

        {/* current position */}
        {!diverged && (
          <circle cx={sx(x)} cy={sy(Math.min(f(x), YD[1]))} r={7} fill={VIZ.orange} stroke="#fff" strokeWidth={1.5} />
        )}
      </svg>

      <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
        <VizSlider label="learning rate" min={0.01} max={1.1} step={0.01} value={lr} onChange={setLr} format={(v) => v.toFixed(2)} />
        <VizSlider label="start x" min={-4.8} max={4.8} step={0.1} value={startX} onChange={onStartChange} format={(v) => v.toFixed(1)} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <VizButton onClick={togglePlay} active={playing}>{playing ? "Pause" : "Play"}</VizButton>
          <VizButton onClick={step}>Step</VizButton>
          <VizButton onClick={reset}>Reset</VizButton>
        </div>
        <div className="flex gap-4 ml-auto">
          <VizStat label="step" value={String(path.length - 1)} />
          <VizStat label="x" value={diverged ? "—" : x.toFixed(3)} color={VIZ.orange} />
          <VizStat label="loss" value={diverged ? "diverged" : f(x).toFixed(3)} color={diverged ? VIZ.rose : VIZ.teal} />
        </div>
      </div>

      {diverged && (
        <p className={cn("mt-2 text-xs font-medium")} style={{ color: VIZ.rose }}>
          ⚠ Learning rate too large — steps overshoot the minimum and the loss blows up.
        </p>
      )}
    </VizFrame>
  );
}
