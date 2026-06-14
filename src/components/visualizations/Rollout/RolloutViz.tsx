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
} from "../viz-kit";

/**
 * RolloutViz — visualise the three canonical "test in production" traffic
 * splits side by side: Shadow, Canary, and A/B.
 *
 * A horizontal "live traffic" lane at the top emits request glyphs that flow
 * left → right via `useAnimationLoop`. Three lanes underneath show how each
 * pattern routes (or duplicates) that same traffic:
 *
 *   Shadow lane — every request is duplicated: full traffic still flows to
 *       the baseline (brand), and a *copy* tees off to the candidate (teal).
 *       The candidate's response is discarded (rendered as a greyed dot).
 *   Canary lane — a small slider-controlled fraction f of requests routes
 *       to the candidate (teal); the rest go to the baseline (brand). User-
 *       visible.
 *   A/B lane — a fixed 50/50 split, both visible to users, both measured.
 *
 * One slider (`canary fraction f` in [0, 50]%) controls the canary split. One
 * play/pause toggle drives the animation. Stat cards report request counts
 * routed to the candidate per lane, the user-visible risk class, and the
 * measurement strength.
 */

// SVG canvas.
const W = 720;
const H = 360;
const PAD = 16;

// Lane geometry — top "live traffic" strip + three side-by-side lanes below.
const TOP_Y = 36;
const TOP_H = 44;
const LANE_TOP = TOP_Y + TOP_H + 28;
const LANE_H = 192;
const LANE_GAP = 12;
const LANE_W = (W - 2 * PAD - 2 * LANE_GAP) / 3;

// Dot stream geometry.
const N_DOTS = 28;
const DOT_R = 4;
const SPEED = 110; // px/sec

// Stable, deterministic launch offsets for each dot so the stream looks dense
// from frame zero rather than ramping up over time.
const rng0 = seededRandom(7);
const INITIAL_OFFSETS = Array.from({ length: N_DOTS }, () => rng0());
const ROUTING_RNGS = Array.from({ length: N_DOTS }, () => rng0());

type LaneKey = "shadow" | "canary" | "ab";

interface LaneSpec {
  key: LaneKey;
  title: string;
  x: number;
  caption: string;
}

const LANES: LaneSpec[] = [
  {
    key: "shadow",
    title: "Shadow",
    x: PAD,
    caption: "every request is duplicated to the candidate; its result is discarded",
  },
  {
    key: "canary",
    title: "Canary",
    x: PAD + LANE_W + LANE_GAP,
    caption: "fraction f of users see the candidate; the rest see the baseline",
  },
  {
    key: "ab",
    title: "A/B test",
    x: PAD + 2 * (LANE_W + LANE_GAP),
    caption: "fixed 50/50 split; both arms are user-visible and measured",
  },
];

interface RiskClass {
  level: "none" | "low" | "equal";
  color: string;
}

const RISK: Record<LaneKey, RiskClass> = {
  shadow: { level: "none", color: VIZ.teal },
  canary: { level: "low", color: VIZ.yellow },
  ab: { level: "equal", color: VIZ.rose },
};

const MEASUREMENT: Record<LaneKey, { level: string; color: string }> = {
  shadow: { level: "none", color: VIZ.rose }, // no user behaviour observed
  canary: { level: "weak", color: VIZ.yellow }, // small sample
  ab: { level: "strong", color: VIZ.teal }, // 50/50 with a primary metric
};

export function RolloutViz({ className }: { className?: string }) {
  // Canary fraction in [0, 1] — slider is in percent.
  const [canaryPct, setCanaryPct] = useState(5);
  const [running, setRunning] = useState(true);
  const [, force] = useState(0);

  // The dots' horizontal positions live in a ref so the animation loop mutates
  // them in place without re-rendering on every micro-step.
  const positions = useRef<number[]>(
    INITIAL_OFFSETS.map((o) => o * (W - 2 * PAD))
  );
  // Counter for how many times each dot has wrapped around — the routing
  // decision for canary uses this so the "live" demo doesn't all flip the
  // same way every cycle.
  const cycleCount = useRef<number[]>(Array.from({ length: N_DOTS }, () => 0));

  // Per-lane running tallies of requests routed to the candidate.
  const counts = useRef<{ shadow: number; canary: number; ab: number; total: number }>(
    { shadow: 0, canary: 0, ab: 0, total: 0 }
  );

  // Reset positions if the user wants to "rewind."
  const reset = useCallback(() => {
    positions.current = INITIAL_OFFSETS.map((o) => o * (W - 2 * PAD));
    cycleCount.current = Array.from({ length: N_DOTS }, () => 0);
    counts.current = { shadow: 0, canary: 0, ab: 0, total: 0 };
    force((x) => x + 1);
  }, []);

  useAnimationLoop((dt) => {
    const clamped = Math.min(dt, 0.05);
    const span = W - 2 * PAD;
    for (let i = 0; i < N_DOTS; i++) {
      positions.current[i] += SPEED * clamped;
      while (positions.current[i] > span) {
        positions.current[i] -= span;
        cycleCount.current[i] += 1;
        // On each wrap-around we count one new "request" through every lane.
        counts.current.total += 1;
        counts.current.shadow += 1; // shadow duplicates every request
        // Canary routes to candidate with prob = canaryPct/100; use a stable
        // per-dot per-cycle PRNG so totals reflect the slider over time.
        const seed = i * 31 + cycleCount.current[i] * 17;
        const r = seededRandom(seed)();
        if (r < canaryPct / 100) counts.current.canary += 1;
        // A/B routes 50/50.
        const r2 = seededRandom(seed + 991)();
        if (r2 < 0.5) counts.current.ab += 1;
      }
    }
    force((x) => x + 1);
  }, running);

  // Stable routing decision for a dot's *current* on-screen position. We hash
  // the dot index + current cycle so the rendered colour doesn't flicker between
  // frames.
  const routeFor = useCallback(
    (i: number, lane: LaneKey): "baseline" | "candidate" | "both" => {
      const seed = i * 31 + cycleCount.current[i] * 17;
      const r = seededRandom(seed)();
      if (lane === "shadow") return "both"; // duplicated
      if (lane === "canary") return r < canaryPct / 100 ? "candidate" : "baseline";
      // A/B — use a different stream so canary and A/B are independent.
      const r2 = ROUTING_RNGS[i] + cycleCount.current[i] * 0.10391;
      const frac = r2 - Math.floor(r2);
      return frac < 0.5 ? "candidate" : "baseline";
    },
    [canaryPct]
  );

  // Live counts (snapshot for stats cards).
  const c = counts.current;
  const total = Math.max(1, c.total);
  const fmtPct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;

  // The traffic ribbon background ranges for the three lanes.
  const trafficStart = PAD;
  const trafficEnd = W - PAD;

  const lanePositions = useMemo(() => LANES, []);

  return (
    <VizFrame
      className={className}
      title="Test-in-production traffic splits: shadow vs canary vs A/B"
      caption="Top strip: live request traffic flows left → right. Each lane below shows how one rollout pattern routes (or duplicates) the same stream. Shadow sends every request to both — but discards the candidate's response, so users never see it. Canary routes a small slider-controlled fraction f to the candidate; the rest see baseline. A/B splits 50/50. Risk and measurement strength are reported per lane — they trade off: the safer the split, the weaker the user-behaviour signal."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Three rollout patterns — shadow, canary, A/B — with a live traffic stream flowing through each."
      >
        {/* Traffic ribbon (top). */}
        <rect
          x={trafficStart}
          y={TOP_Y}
          width={trafficEnd - trafficStart}
          height={TOP_H}
          rx={10}
          fill={VIZ.card}
          stroke={VIZ.grid}
          strokeWidth={1}
        />
        <text
          x={trafficStart + 10}
          y={TOP_Y - 6}
          fill={VIZ.text}
          fontSize={10}
          fontFamily="monospace"
        >
          live traffic
        </text>
        <text
          x={trafficEnd - 10}
          y={TOP_Y - 6}
          fill={VIZ.text}
          fontSize={10}
          fontFamily="monospace"
          textAnchor="end"
        >
          requests / sec
        </text>
        {/* Top stream of dots. */}
        {positions.current.map((p, i) => (
          <circle
            key={`top-${i}`}
            cx={trafficStart + p}
            cy={TOP_Y + TOP_H / 2}
            r={DOT_R}
            fill={VIZ.brandLight}
            opacity={0.9}
          />
        ))}

        {/* Per-lane geometry — render lanes side-by-side. */}
        {lanePositions.map((lane) => {
          const x0 = lane.x;
          const y0 = LANE_TOP;
          const w = LANE_W;
          const h = LANE_H;
          // The two sub-rails inside each lane: baseline (top) and candidate (bottom).
          const baseY = y0 + 60;
          const candY = y0 + 130;
          return (
            <g key={lane.key}>
              {/* Lane card. */}
              <rect
                x={x0}
                y={y0}
                width={w}
                height={h}
                rx={10}
                fill={VIZ.card}
                stroke={VIZ.grid}
                strokeWidth={1}
              />
              <text
                x={x0 + 12}
                y={y0 + 20}
                fill={VIZ.textBright}
                fontSize={12}
                fontFamily="monospace"
                fontWeight={600}
              >
                {lane.title}
              </text>
              <text
                x={x0 + 12}
                y={y0 + 36}
                fill={VIZ.text}
                fontSize={9}
                fontFamily="monospace"
              >
                {lane.caption}
              </text>

              {/* Sub-rail labels. */}
              <text
                x={x0 + 12}
                y={baseY - 14}
                fill={VIZ.brandLight}
                fontSize={9}
                fontFamily="monospace"
              >
                baseline
              </text>
              <text
                x={x0 + 12}
                y={candY - 14}
                fill={VIZ.teal}
                fontSize={9}
                fontFamily="monospace"
              >
                candidate
              </text>

              {/* Sub-rail tracks. */}
              <line
                x1={x0 + 12}
                x2={x0 + w - 12}
                y1={baseY}
                y2={baseY}
                stroke={VIZ.grid}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <line
                x1={x0 + 12}
                x2={x0 + w - 12}
                y1={candY}
                y2={candY}
                stroke={VIZ.grid}
                strokeWidth={1}
                strokeDasharray="3 4"
              />

              {/* Dots routed through this lane. We re-use the same horizontal
                  positions as the top stream, but mapped from [0, span] into
                  the lane's inner width. */}
              {positions.current.map((p, i) => {
                const span = trafficEnd - trafficStart;
                const lx = x0 + 12 + (p / span) * (w - 24);
                const route = routeFor(i, lane.key);
                if (route === "both") {
                  // Shadow: dot is mirrored on baseline and candidate; the
                  // candidate copy is greyed (discarded result).
                  return (
                    <g key={`${lane.key}-${i}`}>
                      <circle cx={lx} cy={baseY} r={DOT_R} fill={VIZ.brandLight} />
                      <circle
                        cx={lx}
                        cy={candY}
                        r={DOT_R}
                        fill={VIZ.teal}
                        opacity={0.55}
                      />
                      <line
                        x1={lx - 3}
                        x2={lx + 3}
                        y1={candY + 7}
                        y2={candY + 7}
                        stroke={VIZ.axis}
                        strokeWidth={1}
                      />
                    </g>
                  );
                }
                const onBaseline = route === "baseline";
                return (
                  <circle
                    key={`${lane.key}-${i}`}
                    cx={lx}
                    cy={onBaseline ? baseY : candY}
                    r={DOT_R}
                    fill={onBaseline ? VIZ.brandLight : VIZ.teal}
                  />
                );
              })}

              {/* Per-lane footer: split summary. */}
              <text
                x={x0 + 12}
                y={y0 + h - 12}
                fill={VIZ.text}
                fontSize={9}
                fontFamily="monospace"
              >
                {lane.key === "shadow"
                  ? "100% / 100% (duplicated)"
                  : lane.key === "canary"
                  ? `${(100 - canaryPct).toFixed(0)}% / ${canaryPct.toFixed(0)}%`
                  : "50% / 50%"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Controls. */}
      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => setRunning((r) => !r)} active={running}>
          {running ? "Pause" : "Play"}
        </VizButton>
        <VizButton onClick={reset}>Reset counts</VizButton>
      </div>

      <div className="mt-3">
        <VizSlider
          label="canary fraction f"
          min={0}
          max={50}
          step={1}
          value={canaryPct}
          onChange={setCanaryPct}
          format={(v) => `${v.toFixed(0)}%`}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="total requests" value={`${c.total}`} color={VIZ.textBright} />
        <VizStat
          label="shadow → candidate"
          value={`${c.shadow} (${fmtPct(c.shadow)})`}
          color={VIZ.teal}
        />
        <VizStat
          label="canary → candidate"
          value={`${c.canary} (${fmtPct(c.canary)})`}
          color={VIZ.yellow}
        />
        <VizStat
          label="A/B → candidate"
          value={`${c.ab} (${fmtPct(c.ab)})`}
          color={VIZ.rose}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat
          label="shadow risk / signal"
          value={`${RISK.shadow.level} / ${MEASUREMENT.shadow.level}`}
          color={RISK.shadow.color}
        />
        <VizStat
          label="canary risk / signal"
          value={`${RISK.canary.level} / ${MEASUREMENT.canary.level}`}
          color={RISK.canary.color}
        />
        <VizStat
          label="A/B risk / signal"
          value={`${RISK.ab.level} / ${MEASUREMENT.ab.level}`}
          color={RISK.ab.color}
        />
      </div>
    </VizFrame>
  );
}
