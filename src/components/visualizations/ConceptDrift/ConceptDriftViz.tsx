"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, useAnimationLoop, seededRandom } from "../viz-kit";

/**
 * Concept drift and ADWIN-style detection.
 *
 * A stream's target concept shifts at t = D. A *static* model that never
 * retrains sees its error rate jump and stay high. An *adaptive* model runs a
 * change detector (a simplified ADWIN) on its error stream: it keeps a window
 * of recent errors and, whenever some split of the window shows two halves
 * whose means differ by more than a Hoeffding cut ε_cut, it declares drift,
 * drops the stale half, and retrains — its error falls back to baseline.
 *
 * ε_cut = √( (1/2m) · ln(4·|W|/δ) ),  m = harmonic mean of the two sub-window
 * sizes. A larger confidence δ lowers ε_cut → detects sooner but risks false
 * alarms; a smaller δ is conservative → longer detection delay.
 */

const W = 520;
const H = 300;
const M = { top: 16, right: 14, bottom: 34, left: 40 };
const N = 240;
const D = 120; // true drift point
const ERR_GOOD = 0.08;
const ERR_BAD = 0.42;
const SMOOTH = 20; // sliding window for the displayed error rate

/** Static model error bits: good before D, degraded after (never adapts). */
function staticBits(): number[] {
  const rng = seededRandom(24);
  const bits: number[] = [];
  for (let t = 0; t < N; t++) {
    const p = t < D ? ERR_GOOD : ERR_BAD;
    bits.push(rng() < p ? 1 : 0);
  }
  return bits;
}

/** First time a simplified-ADWIN cut fires on the error stream, given δ. */
function detectDrift(bits: number[], delta: number): number {
  const start = 0; // window anchor; bits[start..t] is the current window
  for (let t = SMOOTH; t < N; t++) {
    const len = t - start + 1;
    // prefix sums over the current window
    let best = -1;
    for (let split = 5; split < len - 5; split++) {
      let s0 = 0;
      for (let i = 0; i < split; i++) s0 += bits[start + i];
      let s1 = 0;
      for (let i = split; i < len; i++) s1 += bits[start + i];
      const n0 = split;
      const n1 = len - split;
      const m0 = s0 / n0;
      const m1 = s1 / n1;
      const m = 1 / (1 / n0 + 1 / n1);
      const eCut = Math.sqrt((1 / (2 * m)) * Math.log((4 * len) / delta));
      if (Math.abs(m0 - m1) > eCut) {
        best = t;
        break;
      }
    }
    if (best >= 0) return best; // detection time
    // (window would normally shrink here; for first-detection we can stop)
  }
  return N; // never detected
}

/** Sliding-window error rate for display. */
function smoothRate(bits: number[]): number[] {
  const out: number[] = [];
  for (let t = 0; t < N; t++) {
    const lo = Math.max(0, t - SMOOTH + 1);
    let s = 0;
    for (let i = lo; i <= t; i++) s += bits[i];
    out.push(s / (t - lo + 1));
  }
  return out;
}

export function ConceptDriftViz({ className }: { className?: string }) {
  const sBits = useMemo(staticBits, []);
  const [delta, setDelta] = useState(0.1);
  const [T, setT] = useState(N);
  const [playing, setPlaying] = useState(false);
  const acc = useRef(0);

  const { staticRate, adaptiveRate, detection } = useMemo(() => {
    const detection = detectDrift(sBits, delta);
    // adaptive model retrains at `detection`: good bits from then on
    const rng = seededRandom(99);
    const aBits = sBits.map((b, t) => (t >= detection ? (rng() < ERR_GOOD ? 1 : 0) : b));
    return { staticRate: smoothRate(sBits), adaptiveRate: smoothRate(aBits), detection };
  }, [sBits, delta]);

  useAnimationLoop((dt) => {
    const next = acc.current + dt * 70;
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

  const yMax = 0.55;
  const px = (t: number) => M.left + (t / N) * (W - M.left - M.right);
  const py = (r: number) => M.top + (1 - r / yMax) * (H - M.top - M.bottom);
  const pathFor = (arr: number[], upto: number) =>
    arr
      .slice(0, upto)
      .map((r, i) => `${i === 0 ? "M" : "L"}${px(i + 1).toFixed(1)},${py(r).toFixed(1)}`)
      .join(" ");

  const yticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
  const start = () => {
    if (T >= N) setT(1);
    acc.current = 0;
    setPlaying(true);
  };
  const detected = detection < N;
  const delay = detected ? detection - D : null;

  return (
    <VizFrame
      className={className}
      title="Concept drift: detect, then adapt"
      caption="At the dashed line the concept changes. A static model (rose) never recovers — its error stays elevated. The adaptive model (teal) runs an ADWIN-style detector on its error stream; when two halves of its window diverge by more than the Hoeffding cut it flags drift (flag), drops the stale window, retrains, and error falls back to baseline. Raise the confidence δ to trip the detector sooner — at the cost of more false alarms on stationary data."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="concept drift detection">
        {/* axes + gridlines */}
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        {yticks.map((r, i) => (
          <g key={i}>
            {i > 0 && <line x1={M.left} y1={py(r)} x2={W - M.right} y2={py(r)} stroke={VIZ.grid} strokeWidth={1} />}
            <text x={M.left - 6} y={py(r) + 3} fill={VIZ.text} fontSize={9} textAnchor="end">
              {r.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={(W + M.left) / 2} y={H - 8} fill={VIZ.text} fontSize={10} textAnchor="middle">
          stream position t →
        </text>
        <text x={12} y={M.top + 4} fill={VIZ.text} fontSize={10}>
          error rate
        </text>

        {/* true drift marker */}
        {T > D && (
          <g>
            <line x1={px(D)} y1={M.top} x2={px(D)} y2={H - M.bottom} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
            <text x={px(D) + 4} y={M.top + 12} fill={VIZ.yellow} fontSize={9}>
              concept shifts
            </text>
          </g>
        )}

        {/* detection flag */}
        {detected && T >= detection && (
          <g>
            <line x1={px(detection)} y1={M.top} x2={px(detection)} y2={H - M.bottom} stroke={VIZ.teal} strokeWidth={1.2} opacity={0.5} />
            <path d={`M${px(detection)},${M.top} l14,5 l-14,5 z`} fill={VIZ.teal} />
            <text x={px(detection) + 16} y={M.top + 12} fill={VIZ.teal} fontSize={9}>
              drift detected
            </text>
          </g>
        )}

        {/* rate curves */}
        <path d={pathFor(staticRate, T)} fill="none" stroke={VIZ.rose} strokeWidth={2} opacity={0.9} />
        <path d={pathFor(adaptiveRate, T)} fill="none" stroke={VIZ.teal} strokeWidth={2.2} />

        {/* legend */}
        <g transform={`translate(${W - M.right - 132}, ${M.top + 6})`}>
          <rect width={10} height={3} y={4} fill={VIZ.rose} />
          <text x={16} y={8} fill={VIZ.text} fontSize={10}>static (no adapt)</text>
          <rect width={10} height={3} y={20} fill={VIZ.teal} />
          <text x={16} y={24} fill={VIZ.text} fontSize={10}>adaptive (ADWIN)</text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => (playing ? setPlaying(false) : start())} active={playing}>
          {playing ? "Pause" : T >= N ? "Replay" : "Play"}
        </VizButton>
        <VizButton
          onClick={() => {
            setPlaying(false);
            setT(N);
            acc.current = 0;
          }}
        >
          Reset
        </VizButton>
      </div>

      <div className="mt-3 mb-3">
        <VizSlider
          label="ADWIN confidence δ"
          min={0.01}
          max={0.5}
          step={0.01}
          value={delta}
          onChange={(v) => {
            setDelta(v);
            setT(N);
            setPlaying(false);
          }}
          format={(v) => v.toFixed(2)}
        />
        <div className="mt-3">
          <VizSlider
            label="stream position t"
            min={1}
            max={N}
            step={1}
            value={T}
            onChange={(v) => {
              setT(v);
              setPlaying(false);
            }}
            format={(v) => `${v} / ${N}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <VizStat label="true drift" value={`t = ${D}`} color={VIZ.yellow} />
        <VizStat label="detected at" value={detected ? `t = ${detection}` : "— (missed)"} color={VIZ.teal} />
        <VizStat label="detection delay" value={delay === null ? "—" : `${delay}`} color={VIZ.brand} />
      </div>
    </VizFrame>
  );
}
