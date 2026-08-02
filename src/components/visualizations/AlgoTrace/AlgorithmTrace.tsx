"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AlgoTrace, TraceCls, TraceComponent, TraceFrame } from "@/types/algo-trace";
import { getAlgoTrace } from "@/lib/algo-traces";
import { VizFrame, scale } from "../viz-kit";
import { cn } from "@/lib/utils";

/**
 * The algo-viz-style algorithm player: source code on the left with the
 * currently-executing line highlighted, live algorithm state on the right, and
 * play / step / seek controls underneath. Referenced from MDX by id —
 * `<AlgorithmTrace id="bm25-scoring" />` — because lesson MDX runs with
 * `blockJS: true`, so only plain string props survive.
 */

/* ------------------------------------------------------------------ styling */

const CHIP: Record<TraceCls, string> = {
  active: "border-brand-500 bg-brand-500/20 text-white",
  good: "border-accent-teal bg-accent-teal/15 text-accent-teal",
  bad: "border-accent-rose bg-accent-rose/15 text-accent-rose",
  warn: "border-accent-yellow bg-accent-yellow/15 text-accent-yellow",
  dim: "border-surface-border bg-surface/60 text-slate-500",
};

const BAR: Record<TraceCls, string> = {
  active: "bg-brand-500",
  good: "bg-accent-teal",
  bad: "bg-accent-rose",
  warn: "bg-accent-yellow",
  dim: "bg-slate-700",
};

const DOT: Record<TraceCls, { fill: string; stroke: string }> = {
  active: { fill: "#6366f1", stroke: "#a5b4fc" },
  good: { fill: "#14b8a6", stroke: "#5eead4" },
  bad: { fill: "#f43f5e", stroke: "#fda4af" },
  warn: { fill: "#eab308", stroke: "#fde047" },
  dim: { fill: "#1a1d27", stroke: "#2e3347" },
};

const chipCls = (cls?: TraceCls) =>
  cls ? CHIP[cls] : "border-surface-border bg-surface-elevated text-slate-200";

/* --------------------------------------------------------------- primitives */

function Panel({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      {/* Labels often carry data ("low" ×5), so they are deliberately not uppercased. */}
      {label && <div className="text-[10px] tracking-wide text-slate-500 mb-1.5">{label}</div>}
      {children}
    </div>
  );
}

function Tokens({ c }: { c: Extract<TraceComponent, { t: "tokens" }> }) {
  return (
    <Panel label={c.label}>
      <div className="flex flex-wrap items-end gap-1.5">
        {c.v.map((tok, i) => (
          <div key={i} className="flex items-end gap-1.5">
            {i > 0 && c.sep && <span className="text-slate-600 text-xs pb-1.5">{c.sep}</span>}
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "px-2 py-1 rounded-md border font-mono text-xs whitespace-pre transition-colors",
                  chipCls(tok.cls)
                )}
              >
                {tok.text}
              </span>
              {tok.sub && <span className="text-[9px] text-slate-500 font-mono">{tok.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function KV({ c }: { c: Extract<TraceComponent, { t: "kv" }> }) {
  return (
    <Panel label={c.label}>
      <div className="flex flex-wrap gap-1.5">
        {c.v.length === 0 && <span className="text-xs text-slate-600 italic">empty</span>}
        {c.v.map((chip, i) => (
          <span
            key={i}
            className={cn(
              "px-2 py-1 rounded-md border font-mono text-xs transition-colors",
              chipCls(chip.cls)
            )}
          >
            {chip.k}
            {chip.v !== undefined && (
              <span className="text-slate-400"> {c.sep ?? "→"} </span>
            )}
            {chip.v !== undefined && <span className="font-semibold">{chip.v}</span>}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function Bars({ c }: { c: Extract<TraceComponent, { t: "bars" }> }) {
  const max = c.max ?? Math.max(1e-9, ...c.v.map((b) => Math.abs(b.val)));
  return (
    <Panel label={c.label}>
      <div className="flex flex-col gap-1">
        {c.v.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-right font-mono text-[11px] text-slate-400">
              {b.k}
            </span>
            <div className="h-3.5 flex-1 rounded-sm bg-surface/70 overflow-hidden">
              <div
                className={cn("h-full rounded-sm transition-all duration-300", BAR[b.cls ?? "dim"])}
                style={{ width: `${Math.max(1.5, (Math.abs(b.val) / max) * 100)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 font-mono text-[11px] text-slate-300">
              {b.show ?? b.val.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Matrix({ c }: { c: Extract<TraceComponent, { t: "matrix" }> }) {
  const digits = c.digits ?? 3;
  // NaN marks a cell the algorithm has not filled in yet — it renders as "·"
  // rather than 0, which would read as a computed value.
  const flat = c.v.flat().filter((v) => !Number.isNaN(v));
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const heat = (val: number) => {
    if (!c.heat || Number.isNaN(val)) return undefined;
    const norm = hi > lo ? (val - lo) / (hi - lo) : 0.5;
    return `rgba(99, 102, 241, ${(0.06 + 0.55 * norm).toFixed(3)})`;
  };
  return (
    <Panel label={c.label}>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 font-mono text-[11px]">
          <thead>
            <tr>
              <th />
              {/* Keyed by index: column headers are not required to be unique
                  (a bare matrix may label none of them). */}
              {c.cols.map((col, j) => (
                <th key={j} className="px-1 pb-0.5 font-normal text-slate-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.v.map((row, i) => (
              <tr key={i}>
                <th className="pr-1 text-right font-normal text-slate-500">{c.rows[i]}</th>
                {row.map((val, j) => {
                  const pending = Number.isNaN(val);
                  const cls = pending ? undefined : c.cls?.[`${i},${j}`];
                  return (
                    <td
                      key={j}
                      className={cn(
                        "min-w-[3.4rem] rounded-md border px-2 py-1 text-center transition-colors",
                        cls
                          ? CHIP[cls]
                          : pending
                            ? "border-surface-border/50 text-slate-700"
                            : "border-surface-border text-slate-200"
                      )}
                      style={cls ? undefined : { background: heat(val) }}
                    >
                      {pending ? "·" : val.toFixed(digits)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TraceTable({ c }: { c: Extract<TraceComponent, { t: "table" }> }) {
  return (
    <Panel label={c.label}>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 font-mono text-[11px]">
          <thead>
            <tr>
              {c.head.map((h) => (
                <th key={h} className="px-2 pb-0.5 text-left font-normal text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.v.map((row, i) => (
              <tr key={i}>
                {row.cells.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "border-y px-2 py-1 transition-colors first:rounded-l-md first:border-l last:rounded-r-md last:border-r",
                      chipCls(row.cls)
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LayerGraph({ c }: { c: Extract<TraceComponent, { t: "graph" }> }) {
  const W = 560;
  const ROW = 74;
  const PAD_X = 46;
  const H = c.levels.length * ROW + 16;
  const px = (x: number) => PAD_X + x * (W - PAD_X - 20);
  const py = (level: number) => 26 + level * ROW;

  return (
    <Panel label={c.label}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={c.label}>
        {c.levels.map((lvl, li) => {
          const pos = new Map(lvl.nodes.map((n) => [n.id, n.x]));
          return (
            <g key={lvl.name}>
              <text x={4} y={py(li) + 4} fill="#64748b" fontSize={10} fontFamily="monospace">
                {lvl.name}
              </text>
              <line
                x1={PAD_X - 12}
                y1={py(li) + 26}
                x2={W - 8}
                y2={py(li) + 26}
                stroke="#2e3347"
                strokeDasharray="2 4"
              />
              {lvl.edges.map(([a, b], ei) => {
                const xa = pos.get(a);
                const xb = pos.get(b);
                if (xa === undefined || xb === undefined) return null;
                return (
                  <line
                    key={ei}
                    x1={px(xa)}
                    y1={py(li)}
                    x2={px(xb)}
                    y2={py(li)}
                    stroke="#3b4256"
                    strokeWidth={1.5}
                  />
                );
              })}
              {lvl.nodes.map((n) => {
                const col = DOT[n.cls ?? "dim"];
                return (
                  <g key={n.id}>
                    <circle
                      cx={px(n.x)}
                      cy={py(li)}
                      r={n.cls && n.cls !== "dim" ? 13 : 11}
                      fill={col.fill}
                      stroke={col.stroke}
                      strokeWidth={1.5}
                      className="transition-all duration-300"
                    />
                    <text
                      x={px(n.x)}
                      y={py(li) + 4}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="monospace"
                      fill={n.cls && n.cls !== "dim" ? "#0f1117" : "#94a3b8"}
                      fontWeight={600}
                    >
                      {n.id}
                    </text>
                    {c.drop === n.id && li < c.levels.length - 1 && (
                      <path
                        d={`M${px(n.x)},${py(li) + 15} L${px(n.x)},${py(li + 1) - 16}`}
                        stroke="#eab308"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        markerEnd="url(#algo-trace-arrow)"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        <defs>
          <marker
            id="algo-trace-arrow"
            markerWidth={6}
            markerHeight={6}
            refX={5}
            refY={3}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="#eab308" />
          </marker>
        </defs>
      </svg>
    </Panel>
  );
}

function Plot({ c }: { c: Extract<TraceComponent, { t: "plot" }> }) {
  // The plot sits in one half of a two-column grid, so the viewBox is kept close
  // to its rendered size — a wider box would shrink dots and labels past legibility.
  const W = 420;
  const H = 290;
  const M = { top: 12, right: 14, bottom: 24, left: 30 };
  const [x0, x1, y0, y1] = c.domain;
  const sx = scale(x0, x1, M.left, W - M.right);
  const sy = scale(y0, y1, H - M.bottom, M.top);
  // Radii are in data units — x and y scales share a factor here, so use x.
  const sr = (r: number) => Math.abs(sx(x0 + r) - sx(x0));
  const stroke = (cls?: TraceCls) => DOT[cls ?? "dim"].fill;
  // Circles and curves are clipped to the axes so an ε-radius larger than the
  // view spills off the edge instead of bleeding over the surrounding card.
  // Derived from the plot's own content rather than `useId()`: React's generated
  // ids depend on tree position, which differs between the server render of the
  // surrounding MDX and the client render, and the mismatch trips hydration.
  // Two plots that collide here would share an identical clip rect anyway.
  const clipId = useMemo(() => {
    const key = `${c.label}|${c.domain.join(",")}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
      h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    }
    return `algoclip${(h >>> 0).toString(36)}`;
  }, [c.label, c.domain]);

  return (
    <Panel label={c.label}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={c.label}>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={M.left}
              y={M.top}
              width={W - M.left - M.right}
              height={H - M.top - M.bottom}
            />
          </clipPath>
        </defs>
        <rect
          x={M.left}
          y={M.top}
          width={W - M.left - M.right}
          height={H - M.top - M.bottom}
          fill="none"
          stroke="#2e3347"
        />
        {(c.ticks === false ? [] : [
          { v: x0, x: sx(x0), y: H - 10, anchor: "start" as const },
          { v: x1, x: sx(x1), y: H - 10, anchor: "end" as const },
        ]).map((t, i) => (
          <text key={`xt${i}`} x={t.x} y={t.y} textAnchor={t.anchor} fontSize={9} fill="#475569">
            {t.v}
          </text>
        ))}
        {(c.ticks === false ? [] : [
          { v: y1, y: sy(y1) + 4 },
          { v: y0, y: sy(y0) },
        ]).map((t, i) => (
          <text key={`yt${i}`} x={M.left - 4} y={t.y} textAnchor="end" fontSize={9} fill="#475569">
            {t.v}
          </text>
        ))}
        <g clipPath={`url(#${clipId})`}>
        {c.circles?.map((circle, i) => (
          <circle
            key={`c${i}`}
            cx={sx(circle.x)}
            cy={sy(circle.y)}
            r={sr(circle.r)}
            fill={stroke(circle.cls)}
            fillOpacity={0.07}
            stroke={stroke(circle.cls)}
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
        ))}
        {c.segments?.map((s, i) => (
          <line
            key={`s${i}`}
            x1={sx(s.x1)}
            y1={sy(s.y1)}
            x2={sx(s.x2)}
            y2={sy(s.y2)}
            stroke={stroke(s.cls)}
            strokeWidth={1.75}
            strokeDasharray={s.dashed ? "4 3" : undefined}
          />
        ))}
        {c.curves?.map((curve, i) => (
          <path
            key={`p${i}`}
            // Rounded to 1/100 px: `Math.sin`/`cos`/`sqrt` are not required to
            // agree to the last bit across engines, so full-precision
            // coordinates make the server and client render differing `d`
            // strings and trip hydration. Two decimals is well below one pixel.
            d={curve.pts
              .map((p, j) => `${j === 0 ? "M" : "L"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`)
              .join(" ")}
            fill="none"
            stroke={stroke(curve.cls)}
            strokeWidth={2}
            strokeDasharray={curve.dashed ? "4 3" : undefined}
          />
        ))}
        </g>
        {c.points?.map((p, i) => {
          const col = DOT[p.cls ?? "dim"];
          const cx = sx(p.x);
          const cy = sy(p.y);
          return (
            <g key={`pt${i}`} className="transition-all duration-300">
              {p.shape === "cross" ? (
                <path
                  d={`M${cx - 7},${cy - 7} L${cx + 7},${cy + 7} M${cx + 7},${cy - 7} L${cx - 7},${cy + 7}`}
                  stroke={col.fill}
                  strokeWidth={3}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={p.shape === "ring" ? 8 : 6}
                  fill={p.shape === "ring" ? "none" : col.fill}
                  stroke={col.stroke}
                  strokeWidth={p.shape === "ring" ? 3 : 1.5}
                />
              )}
              {p.id && (
                <text
                  x={cx + 9}
                  y={cy - 7}
                  fontSize={11}
                  fontFamily="monospace"
                  fill={p.cls && p.cls !== "dim" ? col.stroke : "#64748b"}
                >
                  {p.id}
                </text>
              )}
            </g>
          );
        })}
        {c.xLabel && (
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#64748b">
            {c.xLabel}
          </text>
        )}
        {c.yLabel && (
          <text
            x={10}
            y={H / 2}
            textAnchor="middle"
            fontSize={9}
            fill="#64748b"
            transform={`rotate(-90 10 ${H / 2})`}
          >
            {c.yLabel}
          </text>
        )}
      </svg>
    </Panel>
  );
}

function Note({ c }: { c: Extract<TraceComponent, { t: "note" }> }) {
  return (
    <p
      className={cn(
        "my-2 rounded-md border-l-2 bg-surface/60 px-3 py-1.5 text-xs leading-relaxed",
        c.cls === "good"
          ? "border-accent-teal text-accent-teal"
          : c.cls === "bad"
            ? "border-accent-rose text-accent-rose"
            : c.cls === "warn"
              ? "border-accent-yellow text-accent-yellow"
              : "border-brand-500 text-slate-300"
      )}
    >
      {c.text}
    </p>
  );
}

function StateComponent({ c }: { c: TraceComponent }) {
  switch (c.t) {
    case "tokens":
      return <Tokens c={c} />;
    case "kv":
      return <KV c={c} />;
    case "bars":
      return <Bars c={c} />;
    case "matrix":
      return <Matrix c={c} />;
    case "table":
      return <TraceTable c={c} />;
    case "graph":
      return <LayerGraph c={c} />;
    case "plot":
      return <Plot c={c} />;
    case "note":
      return <Note c={c} />;
  }
}

/* ------------------------------------------------------------- code listing */

function CodePanel({ code, active }: { code: string[]; active: number[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const line = lineRef.current;
    if (!box || !line) return;
    // Keep the executing line in view *within the code box* — never scroll the page.
    const top = line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [active]);

  let firstActiveSeen = false;
  return (
    <div
      ref={boxRef}
      className="max-h-[22rem] overflow-auto rounded-lg border border-surface-border bg-surface/70 py-2"
    >
      {code.map((line, i) => {
        const n = i + 1;
        const on = active.includes(n);
        const isFirst = on && !firstActiveSeen;
        if (isFirst) firstActiveSeen = true;
        return (
          <div
            key={n}
            ref={isFirst ? lineRef : undefined}
            className={cn(
              // w-max + min-w-full: rows grow to fit long lines (so the box scrolls
              // horizontally) while the highlight still spans the full width.
              "flex w-max min-w-full gap-3 border-l-2 px-3 py-[1px] font-mono text-[11.5px] leading-[1.6] transition-colors",
              on ? "border-brand-500 bg-brand-500/15" : "border-transparent"
            )}
          >
            <span className="w-5 shrink-0 select-none text-right text-slate-600">{n}</span>
            <span className={cn("whitespace-pre", on ? "text-white" : "text-slate-400")}>
              {line || " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- controls */

function CtrlButton({
  children,
  onClick,
  disabled,
  label,
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-lg border border-surface-border bg-surface-elevated py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-surface-border disabled:cursor-not-allowed disabled:opacity-35",
        wide ? "px-3.5" : "px-2.5"
      )}
    >
      {children}
    </button>
  );
}

const SPEEDS: { label: string; ms: number }[] = [
  { label: "0.5×", ms: 1600 },
  { label: "1×", ms: 900 },
  { label: "2×", ms: 420 },
];

/* -------------------------------------------------------------------- shell */

export function AlgorithmTrace({ id, className }: { id: string; className?: string }) {
  const trace: AlgoTrace | undefined = useMemo(() => getAlgoTrace(id), [id]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const total = trace?.frames.length ?? 0;
  const last = Math.max(0, total - 1);

  useEffect(() => {
    if (!playing || total === 0) return;
    const t = setInterval(() => {
      setI((prev) => {
        if (prev >= total - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, SPEEDS[speed].ms);
    return () => clearInterval(t);
  }, [playing, speed, total]);

  const play = useCallback(() => {
    setI((prev) => (prev >= last ? 0 : prev));
    setPlaying((p) => !p);
  }, [last]);

  if (!trace) {
    return (
      <div className="not-prose card-glass my-6 p-4 text-sm text-accent-rose">
        Unknown algorithm trace: <code className="font-mono">{id}</code>
      </div>
    );
  }

  const frame: TraceFrame = trace.frames[Math.min(i, last)];

  return (
    <VizFrame title={trace.title} caption={trace.caption} className={className}>
      {/* what just happened */}
      <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2">
        <span className="mt-px shrink-0 rounded bg-brand-500/25 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-200">
          {i + 1}/{total}
        </span>
        <p className="text-xs leading-relaxed text-slate-200">{frame.d}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            {trace.lang ?? "python"}
          </div>
          <CodePanel code={trace.code} active={frame.l ?? []} />
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">state</div>
          <div className="rounded-lg border border-surface-border bg-surface/70 p-3">
            {frame.c.map((c, k) => (
              <StateComponent key={k} c={c} />
            ))}
          </div>
        </div>
      </div>

      {/* transport */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CtrlButton label="Reset to first step" onClick={() => { setPlaying(false); setI(0); }} disabled={i === 0 && !playing}>
          ↺
        </CtrlButton>
        <CtrlButton label="Previous step" onClick={() => { setPlaying(false); setI((p) => Math.max(0, p - 1)); }} disabled={i === 0}>
          ◀
        </CtrlButton>
        <CtrlButton label={playing ? "Pause" : "Play"} onClick={play} wide>
          {playing ? "❙❙ Pause" : "▶ Play"}
        </CtrlButton>
        <CtrlButton label="Next step" onClick={() => { setPlaying(false); setI((p) => Math.min(last, p + 1)); }} disabled={i >= last}>
          ▶
        </CtrlButton>

        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={i}
          aria-label="Seek to step"
          onChange={(e) => { setPlaying(false); setI(parseInt(e.target.value, 10)); }}
          className="mx-1 min-w-[7rem] flex-1 cursor-pointer accent-brand-500"
        />

        <div className="flex gap-1">
          {SPEEDS.map((s, k) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSpeed(k)}
              className={cn(
                "rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
                k === speed
                  ? "bg-brand-500 text-white"
                  : "bg-surface-elevated text-slate-400 hover:text-slate-200"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </VizFrame>
  );
}
