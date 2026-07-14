"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Temporal-leakage visualization — "training on the future".
 *
 * One training example has a fixed *prediction time* (t = 0). Each feature is
 * computed over a time window drawn as a horizontal bar. A window whose right
 * edge crosses the prediction line uses information that would not exist at
 * serving time — that is leakage, and it is drawn in red. The label itself
 * lives in the future (that is fine — it is the thing we predict), but a
 * *feature* must be point-in-time-correct: its window must end at or before
 * t = 0. The slider is the pipeline join latency for one feature; drag it past
 * the line to make an otherwise-safe feature leak.
 */

// Time axis in days, relative to the prediction moment (0).
const T_MIN = -14;
const T_MAX = 7;
const PRED_T = 0;

const W = 560;
const H = 300;
const M = { top: 30, right: 24, bottom: 40, left: 150 };

type Row = { label: string; start: number; end: number; kind: "label" | "safe" | "leak" };

export function TemporalLeakageViz({ className }: { className?: string }) {
  // Join latency (days) for the configurable feature: >0 means its window
  // extends past the prediction time — a leaky "as-of" join.
  const [lag, setLag] = useState(0);

  const sx = scale(T_MIN, T_MAX, M.left, W - M.right);

  const rows: Row[] = useMemo(() => {
    const configurableEnd = 0 + lag;
    return [
      { label: "Label: churn observed", start: 5, end: 7, kind: "label" },
      { label: "7-day avg spend (as-of)", start: -7, end: 0, kind: "safe" },
      { label: "account age", start: -14, end: 0, kind: "safe" },
      { label: "30-day total (leaky join)", start: -14, end: 5, kind: "leak" },
      {
        label: "your feature (join lag)",
        start: -10,
        end: configurableEnd,
        kind: configurableEnd > PRED_T ? "leak" : "safe",
      },
    ];
  }, [lag]);

  const leakingCount = rows.filter((r) => r.kind === "leak").length;
  const rowH = (H - M.top - M.bottom) / rows.length;

  const colorFor = (kind: Row["kind"]) =>
    kind === "leak" ? VIZ.rose : kind === "label" ? VIZ.yellow : VIZ.teal;

  return (
    <VizFrame
      className={className}
      title="Temporal Leakage: A Feature Window That Crosses the Prediction Line"
      caption="Every feature is computed over a time window (bars). At serving time only data up to the prediction moment (t = 0) exists, so any feature window that extends past that line uses the future — leakage. The label may live in the future; a feature may not. Drag the join-latency slider to push a safe feature across the line."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Feature time windows relative to prediction time">
        {/* prediction-time line */}
        <line x1={sx(PRED_T)} y1={M.top - 8} x2={sx(PRED_T)} y2={H - M.bottom} stroke={VIZ.brandLight} strokeWidth={2} strokeDasharray="4 3" />
        <text x={sx(PRED_T)} y={M.top - 14} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ.brandLight}>
          prediction time (t = 0)
        </text>

        {/* shaded "future" region */}
        <rect x={sx(PRED_T)} y={M.top - 8} width={sx(T_MAX) - sx(PRED_T)} height={H - M.bottom - (M.top - 8)} fill={VIZ.rose} opacity={0.06} />
        <text x={(sx(PRED_T) + sx(T_MAX)) / 2} y={H - M.bottom + 26} textAnchor="middle" fontSize={10} fill={VIZ.rose}>
          future — unavailable at serving
        </text>
        <text x={(sx(T_MIN) + sx(PRED_T)) / 2} y={H - M.bottom + 26} textAnchor="middle" fontSize={10} fill={VIZ.text}>
          past — available
        </text>

        {/* rows */}
        {rows.map((r, i) => {
          const cy = M.top + i * rowH + rowH / 2;
          const x1 = sx(Math.max(r.start, T_MIN));
          const x2 = sx(Math.min(r.end, T_MAX));
          const color = colorFor(r.kind);
          return (
            <g key={r.label}>
              <text x={M.left - 10} y={cy + 4} textAnchor="end" fontSize={11} fill={VIZ.textBright}>
                {r.label}
              </text>
              <rect x={x1} y={cy - 8} width={Math.max(x2 - x1, 2)} height={16} rx={4} fill={color} opacity={r.kind === "label" ? 0.55 : 0.85} />
              {r.kind === "leak" && (
                <text x={x2 + 6} y={cy + 4} fontSize={10} fontWeight={700} fill={VIZ.rose}>
                  leaks
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
        <div className="min-w-[200px] flex-1">
          <VizSlider
            label="pipeline join latency (days)"
            min={-5}
            max={5}
            step={1}
            value={lag}
            onChange={setLag}
            format={(v) => (v > 0 ? `+${v}` : `${v}`)}
          />
        </div>
        <VizStat label="leaking features" value={`${leakingCount}`} color={leakingCount > 1 ? VIZ.rose : VIZ.teal} />
      </div>
    </VizFrame>
  );
}
