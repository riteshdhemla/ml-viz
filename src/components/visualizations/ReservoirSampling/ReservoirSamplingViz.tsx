"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, useAnimationLoop, seededRandom } from "../viz-kit";

/**
 * Reservoir sampling (Algorithm R) on a one-pass stream.
 *
 *   keep a reservoir of k slots.
 *   for the t-th element (1-indexed):
 *     if t <= k:            put it in slot t
 *     else with prob k/t:   replace a uniformly random slot with it
 *
 * Invariant: after seeing t elements, every one of them is in the reservoir
 * with probability exactly k/t — a uniform sample without knowing t in advance.
 * The whole run is precomputed with a seeded PRNG so it looks identical on
 * every render, then replayed step-by-step.
 */

const W = 520;
const H = 300;
const N = 80; // stream length

type Step = {
  t: number; // 1-indexed element just processed
  reservoir: number[]; // element indices currently held (length k)
  accepted: boolean; // was element t taken into the reservoir?
  slot: number; // slot written (or -1 if rejected)
};

/** Precompute the full run for a given k and seed. */
function simulate(k: number, seed: number): Step[] {
  const rng = seededRandom(seed);
  const reservoir: number[] = [];
  const steps: Step[] = [];
  for (let t = 1; t <= N; t++) {
    let accepted = false;
    let slot = -1;
    if (t <= k) {
      slot = t - 1;
      reservoir[slot] = t;
      accepted = true;
    } else {
      // accept with probability k/t
      if (rng() < k / t) {
        slot = Math.floor(rng() * k);
        reservoir[slot] = t;
        accepted = true;
      }
    }
    steps.push({ t, reservoir: [...reservoir], accepted, slot });
  }
  return steps;
}

export function ReservoirSamplingViz({ className }: { className?: string }) {
  const [k, setK] = useState(6);
  const [t, setT] = useState(N); // 1-indexed position in the stream
  const [playing, setPlaying] = useState(false);
  const acc = useRef(0);

  const steps = useMemo(() => simulate(k, 1337), [k]);
  const cur = steps[t - 1];
  const swaps = useMemo(
    () => steps.slice(0, t).filter((s) => s.accepted && s.t > k).length,
    [steps, t, k]
  );

  useAnimationLoop((dt) => {
    const next = acc.current + dt * 12; // ~12 elements / second
    const whole = Math.floor(next);
    acc.current = next - whole;
    if (whole > 0) {
      setT((prev) => {
        const nt = prev + whole;
        if (nt >= N) setPlaying(false);
        return Math.min(N, nt);
      });
    }
  }, playing);

  const start = () => {
    if (t >= N) setT(1);
    acc.current = 0;
    setPlaying(true);
  };

  // layout
  const slotW = 46;
  const slotGap = 8;
  const reservoirW = k * slotW + (k - 1) * slotGap;
  const reservoirX = (W - reservoirW) / 2;
  const reservoirY = 150;
  const pAccept = t <= k ? 1 : k / t;

  // upcoming stream tokens to the right of the "cursor"
  const upcoming = [];
  for (let i = 0; i < 7 && t + i <= N; i++) upcoming.push(t + i);

  return (
    <VizFrame
      className={className}
      title="Reservoir sampling: a uniform sample in one pass"
      caption="Each stream element t is taken into the k-slot reservoir with probability k/t (certain for the first k). This exactly maintains a uniform random sample of everything seen so far — without ever knowing the stream's length. Watch the acceptance probability k/t decay: early elements are grabbed eagerly, late ones rarely, and the two effects cancel so every element ends with probability k/t of surviving."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="reservoir sampling animation">
        {/* stream track */}
        <text x={12} y={40} fill={VIZ.text} fontSize={11}>
          incoming stream →
        </text>
        {/* current element */}
        <g>
          <rect
            x={W / 2 - 22}
            y={54}
            width={44}
            height={40}
            rx={8}
            fill={cur.accepted ? VIZ.teal : VIZ.rose}
            opacity={0.9}
          />
          <text x={W / 2} y={79} fill="#0f1117" fontSize={15} fontWeight={700} textAnchor="middle">
            {cur.t}
          </text>
          <text x={W / 2} y={112} fill={cur.accepted ? VIZ.teal : VIZ.rose} fontSize={11} textAnchor="middle">
            {cur.accepted ? (cur.t <= k ? "fill" : "swap in") : "skip"}
          </text>
        </g>
        {/* upcoming tokens */}
        {upcoming.slice(1).map((idx, i) => (
          <g key={idx} opacity={0.5 - i * 0.05}>
            <rect x={W / 2 + 40 + i * 40} y={60} width={30} height={28} rx={6} fill={VIZ.grid} />
            <text x={W / 2 + 55 + i * 40} y={79} fill={VIZ.text} fontSize={11} textAnchor="middle">
              {idx}
            </text>
          </g>
        ))}

        {/* arrow down to reservoir */}
        {cur.accepted && cur.slot >= 0 && (
          <line
            x1={W / 2}
            y1={96}
            x2={reservoirX + cur.slot * (slotW + slotGap) + slotW / 2}
            y2={reservoirY - 6}
            stroke={VIZ.teal}
            strokeWidth={2}
            strokeDasharray="4 3"
            markerEnd="url(#rs-arrow)"
          />
        )}
        <defs>
          <marker id="rs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={VIZ.teal} />
          </marker>
        </defs>

        {/* reservoir label */}
        <text x={reservoirX} y={reservoirY - 14} fill={VIZ.textBright} fontSize={12} fontWeight={600}>
          reservoir (k = {k})
        </text>
        {/* reservoir slots */}
        {cur.reservoir.map((el, s) => {
          const x = reservoirX + s * (slotW + slotGap);
          const justWritten = cur.accepted && cur.slot === s;
          return (
            <g key={s}>
              <rect
                x={x}
                y={reservoirY}
                width={slotW}
                height={slotW}
                rx={8}
                fill={justWritten ? VIZ.teal : VIZ.card}
                stroke={justWritten ? VIZ.teal : VIZ.axis}
                strokeWidth={justWritten ? 2 : 1}
              />
              <text
                x={x + slotW / 2}
                y={reservoirY + slotW / 2 + 5}
                fill={justWritten ? "#0f1117" : VIZ.textBright}
                fontSize={14}
                fontWeight={600}
                textAnchor="middle"
              >
                {el ?? ""}
              </text>
            </g>
          );
        })}

        {/* acceptance probability bar */}
        <text x={reservoirX} y={reservoirY + slotW + 34} fill={VIZ.text} fontSize={11}>
          P(accept next) = k/t = {pAccept.toFixed(3)}
        </text>
        <rect x={reservoirX} y={reservoirY + slotW + 42} width={reservoirW} height={8} rx={4} fill={VIZ.grid} />
        <rect
          x={reservoirX}
          y={reservoirY + slotW + 42}
          width={reservoirW * pAccept}
          height={8}
          rx={4}
          fill={VIZ.brand}
        />
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => (playing ? setPlaying(false) : start())} active={playing}>
          {playing ? "Pause" : t >= N ? "Replay" : "Play"}
        </VizButton>
        <VizButton
          onClick={() => {
            setPlaying(false);
            setT((p) => Math.min(N, p + 1));
          }}
        >
          Step
        </VizButton>
        <VizButton
          onClick={() => {
            setPlaying(false);
            setT(1);
            acc.current = 0;
          }}
        >
          Reset
        </VizButton>
      </div>

      <div className="mt-3 mb-3">
        <VizSlider
          label="reservoir size k"
          min={2}
          max={10}
          step={1}
          value={k}
          onChange={(v) => {
            setK(v);
            setT(N);
            setPlaying(false);
          }}
        />
        <div className="mt-3">
          <VizSlider
            label="stream position t"
            min={1}
            max={N}
            step={1}
            value={t}
            onChange={(v) => {
              setT(v);
              setPlaying(false);
            }}
            format={(v) => `${v} / ${N}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <VizStat label="seen" value={`${t}`} />
        <VizStat label="P(accept)=k/t" value={pAccept.toFixed(3)} color={VIZ.brand} />
        <VizStat label="swaps so far" value={`${swaps}`} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
