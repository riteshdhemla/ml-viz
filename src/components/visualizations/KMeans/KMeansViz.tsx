"use client";

import { useRef, useState } from "react";
import { VIZ, CLASS_COLORS, VizFrame, VizButton, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * K-Means as alternating steps: ASSIGN each point to its nearest centroid, then
 * UPDATE each centroid to the mean of its points. Step through to see Lloyd's
 * algorithm converge; "Auto" plays the whole loop.
 */

const W = 420;
const H = 320;
const M = 20;
const DOM: [number, number] = [0, 10];
const K = 3;

type Pt = { x: number; y: number; c: number };

function makePoints(seed: number): Pt[] {
  const rng = seededRandom(seed);
  const centers = [
    [2.5, 7],
    [7.5, 7.5],
    [5, 2.5],
  ];
  const pts: Pt[] = [];
  for (const [cx, cy] of centers) {
    for (let i = 0; i < 18; i++) {
      pts.push({ x: gaussian(rng, cx, 0.9), y: gaussian(rng, cy, 0.9), c: -1 });
    }
  }
  return pts;
}

function initCentroids(seed: number) {
  const rng = seededRandom(seed * 13 + 1);
  return Array.from({ length: K }, () => ({ x: rng() * 8 + 1, y: rng() * 8 + 1 }));
}

export function KMeansViz({ className }: { className?: string }) {
  const [seed, setSeed] = useState(3);
  const [pts, setPts] = useState<Pt[]>(() => makePoints(3));
  const [cents, setCents] = useState(() => initCentroids(3));
  const [phase, setPhase] = useState<"assign" | "update">("assign");
  const [iter, setIter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sx = scale(DOM[0], DOM[1], M, W - M);
  const sy = scale(DOM[0], DOM[1], H - M, M);

  function assign() {
    setPts((ps) =>
      ps.map((p) => {
        let best = 0, bd = Infinity;
        cents.forEach((c, i) => {
          const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
          if (d < bd) { bd = d; best = i; }
        });
        return { ...p, c: best };
      })
    );
    setPhase("update");
  }

  function update() {
    setCents((cs) =>
      cs.map((c, i) => {
        const members = pts.filter((p) => p.c === i);
        if (members.length === 0) return c;
        return {
          x: members.reduce((s, p) => s + p.x, 0) / members.length,
          y: members.reduce((s, p) => s + p.y, 0) / members.length,
        };
      })
    );
    setPhase("assign");
    setIter((i) => i + 1);
  }

  function step() {
    if (phase === "assign") assign();
    else update();
  }

  function togglePlay() {
    if (playing) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      timer.current = setInterval(step, 500);
    }
  }

  function reset(newSeed = seed) {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setSeed(newSeed);
    setPts(makePoints(newSeed));
    setCents(initCentroids(newSeed));
    setPhase("assign");
    setIter(0);
  }

  return (
    <VizFrame
      className={className}
      title="K-Means clustering (K = 3)"
      caption="Two alternating moves: assign points to the nearest centroid (✕), then move each centroid to the mean of its cluster. Repeat until nothing changes."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="K-means clusters">
        <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} fill={VIZ.card} stroke={VIZ.axis} />
        {/* tether lines to assigned centroid */}
        {pts.map((p, i) =>
          p.c >= 0 ? (
            <line key={`t${i}`} x1={sx(p.x)} y1={sy(p.y)} x2={sx(cents[p.c].x)} y2={sy(cents[p.c].y)} stroke={CLASS_COLORS[p.c]} strokeWidth={0.5} opacity={0.25} />
          ) : null
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={p.c >= 0 ? CLASS_COLORS[p.c] : "#64748b"} stroke="#0f1117" strokeWidth={0.5} />
        ))}
        {cents.map((c, i) => (
          <g key={i} stroke={CLASS_COLORS[i]} strokeWidth={3}>
            <line x1={sx(c.x) - 7} y1={sy(c.y) - 7} x2={sx(c.x) + 7} y2={sy(c.y) + 7} />
            <line x1={sx(c.x) - 7} y1={sy(c.y) + 7} x2={sx(c.x) + 7} y2={sy(c.y) - 7} />
          </g>
        ))}
        <text x={W - 8} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="end" opacity={0.85}>feature x₁</text>
        <text x={8} y={16} fill={VIZ.text} fontSize={10} opacity={0.85}>feature x₂</text>
      </svg>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex gap-2">
          <VizButton onClick={togglePlay} active={playing}>{playing ? "Pause" : "Auto"}</VizButton>
          <VizButton onClick={step}>{phase === "assign" ? "Assign →" : "Update →"}</VizButton>
          <VizButton onClick={() => reset()}>Reset</VizButton>
          <VizButton onClick={() => reset(seed + 1)}>New points</VizButton>
        </div>
        <div className="flex gap-4 ml-auto">
          <VizStat label="iter" value={String(iter)} />
          <VizStat label="next" value={phase} color={VIZ.yellow} />
        </div>
      </div>
    </VizFrame>
  );
}
