"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  useAnimationLoop,
  seededRandom,
  gaussian,
  scale,
} from "../viz-kit";

const W = 440;
const H = 260;
const PAD = 24;

type Point = { x: number; y: number; moon: 0 | 1 };

/** Generate 30-point two-moons dataset with seededRandom(13). */
function makeMoons(): Point[] {
  const rng = seededRandom(13);
  const pts: Point[] = [];
  // Moon 1: angles 0..π, center (0, 0.3)
  for (let i = 0; i < 15; i++) {
    const angle = (i / 14) * Math.PI;
    pts.push({
      x: Math.cos(angle) + gaussian(rng, 0, 0.08),
      y: Math.sin(angle) + 0.3 + gaussian(rng, 0, 0.08),
      moon: 0,
    });
  }
  // Moon 2: angles π..2π, center (0, -0.3)
  for (let i = 0; i < 15; i++) {
    const angle = Math.PI + (i / 14) * Math.PI;
    pts.push({
      x: Math.cos(angle) + gaussian(rng, 0, 0.08),
      y: Math.sin(angle) - 0.3 + gaussian(rng, 0, 0.08),
      moon: 1,
    });
  }
  return pts;
}

const ORIGINS = makeMoons();
const T_MAX = 20;

function computeBeta(t: number, schedule: "linear" | "cosine"): number {
  if (schedule === "linear") {
    return 0.01 + t * 0.04;
  }
  // Cosine: β_t = clip(1 - cos²((t/T + 0.008) / 1.008 · π/2), 0, 0.999)
  const s = 0.008;
  const val = 1 - Math.pow(Math.cos(((t / T_MAX + s) / (1 + s)) * (Math.PI / 2)), 2);
  return Math.min(Math.max(val, 0), 0.999);
}

/** Precompute forward noised positions for all T steps. Index 0 = original. */
function computeForward(
  origins: Point[],
  schedule: "linear" | "cosine"
): Array<Array<{ x: number; y: number }>> {
  const rng = seededRandom(42);
  const steps: Array<Array<{ x: number; y: number }>> = [
    origins.map((p) => ({ x: p.x, y: p.y })),
  ];
  for (let t = 1; t <= T_MAX; t++) {
    const beta = computeBeta(t, schedule);
    const sqrtKeep = Math.sqrt(1 - beta);
    const sqrtNoise = Math.sqrt(beta);
    const prev = steps[t - 1];
    steps.push(
      prev.map((p) => ({
        x: sqrtKeep * p.x + sqrtNoise * gaussian(rng),
        y: sqrtKeep * p.y + sqrtNoise * gaussian(rng),
      }))
    );
  }
  return steps;
}

/** Precompute reverse positions: linear interp from noised→original + small noise. */
function computeReverse(
  origins: Point[],
  forward: Array<Array<{ x: number; y: number }>>
): Array<Array<{ x: number; y: number }>> {
  const rng = seededRandom(77);
  const noised = forward[T_MAX];
  // Index 0 of reverse = t=20, index T_MAX = t=0
  const steps: Array<Array<{ x: number; y: number }>> = [noised.map((p) => ({ ...p }))];
  for (let step = 1; step <= T_MAX; step++) {
    const alpha = step / T_MAX; // 0..1 progress toward clean
    const jitter = 0.02 * (1 - alpha); // shrinks toward end
    steps.push(
      origins.map((orig, i) => ({
        x: noised[i].x + alpha * (orig.x - noised[i].x) + gaussian(rng, 0, jitter),
        y: noised[i].y + alpha * (orig.y - noised[i].y) + gaussian(rng, 0, jitter),
      }))
    );
  }
  return steps;
}

export function DiffusionViz({ className }: { className?: string }) {
  const [schedule, setSchedule] = useState<"linear" | "cosine">("linear");
  const [mode, setMode] = useState<"forward" | "reverse">("forward");
  const [timestep, setTimestep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const accumRef = useRef(0);

  const forward = useMemo(() => computeForward(ORIGINS, schedule), [schedule]);
  const reverse = useMemo(() => computeReverse(ORIGINS, forward), [forward]);

  // Determine displayed positions
  const displayedPts = useMemo(() => {
    if (mode === "forward") return forward[timestep];
    // In reverse mode, timestep 20=noised, 0=clean → reverse array index = T_MAX - timestep
    return reverse[T_MAX - timestep];
  }, [mode, timestep, forward, reverse]);

  const allX = displayedPts.map((p) => p.x);
  const allY = displayedPts.map((p) => p.y);
  const xMin = Math.min(...allX) - 0.3;
  const xMax = Math.max(...allX) + 0.3;
  const yMin = Math.min(...allY) - 0.3;
  const yMax = Math.max(...allY) + 0.3;

  const sx = scale(xMin, xMax, PAD, W - PAD);
  const sy = scale(yMin, yMax, H - PAD, PAD);

  const betaT = timestep > 0 ? computeBeta(timestep, schedule) : 0;
  const sigmaT = Math.sqrt(betaT);

  const handlePlay = useCallback(() => setPlaying((p) => !p), []);

  useAnimationLoop(
    useCallback(
      (dt: number) => {
        accumRef.current += dt;
        if (accumRef.current < 1 / 3) return; // ~3 steps/sec
        accumRef.current = 0;
        setTimestep((t) => {
          const next = t + (mode === "forward" ? 1 : -1);
          if (mode === "forward") {
            if (next > T_MAX) return 0; // loop
            return next;
          } else {
            if (next < 0) return T_MAX; // loop
            return next;
          }
        });
      },
      [mode]
    ),
    playing
  );

  function handleModeToggle(newMode: "forward" | "reverse") {
    setMode(newMode);
    setTimestep(newMode === "forward" ? 0 : T_MAX);
    setPlaying(false);
    accumRef.current = 0;
  }

  function handleSchedule(s: "linear" | "cosine") {
    setSchedule(s);
    setPlaying(false);
    setTimestep(mode === "forward" ? 0 : T_MAX);
  }

  return (
    <VizFrame
      className={className}
      title="Diffusion Process — Forward & Reverse"
      caption="Forward: watch structure dissolve into Gaussian noise over 20 steps. Reverse: watch a denoising network reconstruct structure from noise. Toggle the β schedule to compare linear vs cosine noise addition."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Diffusion process visualization on two-moons dataset"
      >
        {displayedPts.map((pt, i) => {
          const isOrigin = timestep === 0;
          const isFullNoise = timestep === T_MAX;
          const moon = ORIGINS[i].moon;
          const baseColor = moon === 0 ? VIZ.brand : VIZ.teal;
          const fill = isFullNoise ? VIZ.text : baseColor;
          const r = isOrigin ? 5 : 4;
          const opacity = isFullNoise ? 0.4 : isOrigin ? 1 : 0.7;
          const stroke = isOrigin || isFullNoise ? "none" : VIZ.grid;
          return (
            <circle
              key={i}
              cx={sx(pt.x)}
              cy={sy(pt.y)}
              r={r}
              fill={fill}
              fillOpacity={opacity}
              stroke={stroke}
              strokeWidth={isOrigin || isFullNoise ? 0 : 1}
            />
          );
        })}
      </svg>

      <div className="mt-3 mb-2">
        <VizSlider
          label="Timestep t"
          min={0}
          max={T_MAX}
          step={1}
          value={timestep}
          onChange={(v) => { setTimestep(v); setPlaying(false); }}
          format={(v) => String(v)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2">
        <div className="flex gap-1">
          <VizButton onClick={() => handleModeToggle("forward")} active={mode === "forward"}>
            Forward
          </VizButton>
          <VizButton onClick={() => handleModeToggle("reverse")} active={mode === "reverse"}>
            Reverse
          </VizButton>
        </div>
        <div className="flex gap-1">
          <VizButton onClick={() => handleSchedule("linear")} active={schedule === "linear"}>
            Linear
          </VizButton>
          <VizButton onClick={() => handleSchedule("cosine")} active={schedule === "cosine"}>
            Cosine
          </VizButton>
        </div>
        <VizButton onClick={handlePlay} active={playing}>
          {playing ? "Pause" : "Play"}
        </VizButton>
        <div className="flex gap-4 ml-auto">
          <VizStat label="mode" value={mode === "forward" ? "Forward" : "Reverse"} />
          <VizStat label="t" value={String(timestep)} />
          <VizStat label="β_t" value={timestep > 0 ? betaT.toFixed(3) : "—"} color={VIZ.yellow} />
          <VizStat label="σ_t" value={timestep > 0 ? sigmaT.toFixed(3) : "—"} color={VIZ.orange} />
        </div>
      </div>
    </VizFrame>
  );
}
