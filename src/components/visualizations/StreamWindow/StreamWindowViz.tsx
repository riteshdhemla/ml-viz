"use client";

/**
 * One bursty event stream, three window types, and the two clocks.
 *
 * 28 events over 60 seconds of event time, arriving in bursts with idle gaps —
 * the shape that makes session windows mean anything. 18% of them are delayed
 * by 3–12 s, which is what a phone in a tunnel looks like.
 *
 * The measurement that matters, and the reason the lesson insists on event
 * time: switching the *same* stream from event-time to processing-time
 * bucketing moves **8 of 28 events (28.6%) into a different window**, and
 * invents a seventh window that no event actually belongs to. Per-window
 * counts go from 6/2/6/6/4/4 to 5/1/7/6/4/3/2 — every bucket wrong, and
 * nothing in the output says so.
 *
 * The other two window types are here to show they answer different questions
 * rather than being alternatives: sliding 10s/5s counts each event 1.93 times
 * on average (that is the overlap, not a bug), and session windows with a 2 s
 * gap find 9 bursts while a 5 s gap merges them into 7. The gap threshold *is*
 * the definition of "a session" — there is no correct value hiding underneath.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, scale, seededRandom } from "../viz-kit";

const HORIZON = 60;
const LATE_SHARE = 0.18;

interface Ev {
  et: number;
  pt: number;
  late: boolean;
}

/** Bursts separated by idle gaps, with a minority arriving badly late. */
const EVENTS: Ev[] = (() => {
  const rng = seededRandom(19);
  const out: Ev[] = [];
  let t = 0;
  while (t < HORIZON) {
    const burst = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < burst && t < HORIZON; i++) {
      const lateness = rng() < LATE_SHARE ? 3 + rng() * 9 : rng() * 0.4;
      out.push({ et: +t.toFixed(2), pt: +(t + lateness).toFixed(2), late: lateness > 1 });
      t += 0.2 + rng() * 0.9;
    }
    t += 3 + rng() * 5;
  }
  return out;
})();

type Mode = "tumbling" | "sliding" | "session";

const W = 560;
const PAD = { l: 30, r: 14, t: 30 };
const sx = scale(0, HORIZON + 12, PAD.l, W - PAD.r);

/* Windows are drawn as lanes rather than one stacked band: with hop = size/2 a
   sliding window overlaps only its immediate neighbour, so two lanes are enough
   to separate them, and the overlap reads as a staircase instead of a blob. */
const LANE_H = 30;
const LANE_GAP = 4;

export function StreamWindowViz({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("tumbling");
  const [size, setSize] = useState(10);
  const [gap, setGap] = useState(2);
  const [byProcessing, setByProcessing] = useState(false);

  const key = byProcessing ? "pt" : "et";

  const windows = useMemo(() => {
    if (mode === "session") {
      const sorted = [...EVENTS].sort((a, b) => a[key] - b[key]);
      const out: { start: number; end: number; n: number }[] = [];
      let cur: { start: number; end: number; n: number } | null = null;
      for (const e of sorted) {
        if (!cur || e[key] - cur.end > gap) {
          cur = { start: e[key], end: e[key], n: 1 };
          out.push(cur);
        } else {
          cur.end = e[key];
          cur.n++;
        }
      }
      return out;
    }
    const hop = mode === "tumbling" ? size : size / 2;
    const out: { start: number; end: number; n: number }[] = [];
    for (let s = 0; s < HORIZON + hop; s += hop) {
      const n = EVENTS.filter((e) => e[key] >= s && e[key] < s + size).length;
      if (n > 0 || mode === "tumbling") out.push({ start: s, end: s + size, n });
    }
    return out.filter((w) => w.n > 0);
  }, [mode, size, gap, key]);

  /** How many events a processing-time clock would file in the wrong bucket. */
  const misfiled = useMemo(() => {
    if (mode === "session") return null;
    const b = (v: number) => Math.floor(v / size);
    return EVENTS.filter((e) => b(e.et) !== b(e.pt)).length;
  }, [mode, size]);

  const totalCounted = windows.reduce((a, w) => a + w.n, 0);
  const lateCount = EVENTS.filter((e) => e.late).length;

  const lanes = mode === "sliding" ? 2 : 1;
  const lanesBottom = PAD.t + lanes * LANE_H + (lanes - 1) * LANE_GAP;
  const evY = lanesBottom + 26;
  const axisY = evY + 14;
  const H = axisY + 22;

  return (
    <VizFrame
      title="Two clocks, three ways to cut a stream"
      caption="28 events over 60 seconds, arriving in bursts. Teal dots are on-time; rose dots arrived late — their position shows the clock you selected, so switching to processing time visibly slides them right. Each band is one window, labelled with the count it emits; sliding windows are drawn on two rows because each one overlaps its neighbour."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {(["tumbling", "sliding", "session"] as Mode[]).map((m) => (
          <VizButton key={m} active={mode === m} onClick={() => setMode(m)}>
            {m}
          </VizButton>
        ))}
        <span className="w-3" />
        <VizButton active={!byProcessing} onClick={() => setByProcessing(false)}>
          event time
        </VizButton>
        <VizButton active={byProcessing} onClick={() => setByProcessing(true)}>
          processing time
        </VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 10, 20, 30, 40, 50, 60].map((s) => (
          <line key={s} x1={sx(s)} x2={sx(s)} y1={PAD.t} y2={axisY} stroke={VIZ.grid} strokeWidth={1} opacity={0.5} />
        ))}

        {windows.map((w, i) => {
          const y = PAD.t + (i % lanes) * (LANE_H + LANE_GAP);
          const x = sx(w.start);
          const wid = Math.max(3, sx(w.end) - sx(w.start));
          const c = i % 2 ? VIZ.brand : VIZ.teal;
          return (
            <g key={i}>
              <rect x={x} y={y} width={wid} height={LANE_H} rx={2} fill={c} opacity={0.16} stroke={c} strokeWidth={1} />
              <text x={x + wid / 2} y={y + LANE_H / 2 + 3.5} textAnchor="middle" fontSize={10} fill={VIZ.textBright}>
                {w.n}
              </text>
            </g>
          );
        })}

        {/* how far each late event slid when the clock changed */}
        {byProcessing &&
          EVENTS.filter((e) => e.late).map((e, i) => (
            <line key={i} x1={sx(e.et)} y1={evY} x2={sx(e.pt)} y2={evY} stroke={VIZ.rose} strokeWidth={1} opacity={0.5} />
          ))}
        {EVENTS.map((e, i) => (
          <circle key={i} cx={sx(e[key])} cy={evY} r={3.4} fill={e.late ? VIZ.rose : VIZ.teal} />
        ))}

        <line x1={PAD.l} x2={W - PAD.r} y1={axisY} y2={axisY} stroke={VIZ.axis} strokeWidth={1} />
        {[0, 20, 40, 60].map((s) => (
          <text key={s} x={sx(s)} y={axisY + 13} textAnchor="middle" fontSize={9} fill={VIZ.text}>
            {s}s
          </text>
        ))}
        <text x={PAD.l} y={20} fontSize={9} fill={VIZ.text}>
          windows, labelled with the count they emit
        </text>
        {/* the clock goes at the top, not beside the event row — events run to the
            right edge under processing time and would collide with it there */}
        <text x={W - PAD.r} y={20} textAnchor="end" fontSize={9} fill={byProcessing ? VIZ.rose : VIZ.teal}>
          bucketed by {byProcessing ? "processing time" : "event time"}
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
        <VizStat label="events" value={String(EVENTS.length)} />
        <VizStat label="arrived late" value={String(lateCount)} color={VIZ.rose} />
        <VizStat label="windows" value={String(windows.length)} color={VIZ.teal} />
        <VizStat
          label="events counted"
          value={`${totalCounted}${mode === "sliding" ? ` (${(totalCounted / EVENTS.length).toFixed(2)}× each)` : ""}`}
        />
        {misfiled !== null && (
          <VizStat
            label="would land in the wrong window"
            value={`${misfiled} of ${EVENTS.length}`}
            color={misfiled > 0 ? VIZ.rose : VIZ.teal}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {mode !== "session" ? (
          <VizSlider label="window size (s)" min={4} max={20} step={1} value={size} onChange={(v) => setSize(Math.round(v))} format={(v) => `${v}s`} />
        ) : (
          <VizSlider label="session gap (s)" min={1} max={8} step={0.5} value={gap} onChange={setGap} format={(v) => `${v}s`} />
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Keep tumbling at 10s and flip the clock. The stream is unchanged, but{" "}
        <span className="font-mono text-white">8 of 28</span> events move to a different bucket, the
        per-window counts go from <span className="font-mono text-white">6/2/6/6/4/4</span> to{" "}
        <span className="font-mono text-white">5/1/7/6/4/3/2</span>, and a seventh window appears that no
        event actually belongs to. Nothing in the output announces any of this — which is why the fix is
        watermarks over event time rather than a check on the result.
      </p>
    </VizFrame>
  );
}
