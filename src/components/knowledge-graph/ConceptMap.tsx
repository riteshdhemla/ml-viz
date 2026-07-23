"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VIZ } from "@/components/visualizations/viz-kit";
import { seededRandom } from "@/components/visualizations/viz-kit";
import type {
  CourseGraphNode,
  CourseGraphEdge,
  CourseDetail,
} from "@/lib/knowledge-graph";

/**
 * ConceptMap — the semantic "map" that complements the project-loop "spine".
 * A course-level knowledge graph: nodes are courses (grouped by cluster,
 * sized by lesson count), edges are prerequisites (solid, directed) and
 * aggregated conceptual cross-links (faint). Click a course to drill into its
 * lessons, their loop stages, prerequisites, dependents, and wiki deep-dives.
 */

interface Props {
  nodes: CourseGraphNode[];
  edges: CourseGraphEdge[];
  details: Record<string, CourseDetail>;
}

const W = 1000;
const H = 680;

// Categorical palette for clusters (mirrors the viz design tokens).
const PALETTE = [
  "#6366f1", "#14b8a6", "#f97316", "#eab308", "#f43f5e",
  "#a5b4fc", "#22d3ee", "#a3e635", "#fb7185", "#c084fc", "#38bdf8",
];

type P = { x: number; y: number; vx: number; vy: number };

/** Deterministic force-directed layout for a small (~33 node) graph. */
function layout(nodes: CourseGraphNode[], edges: CourseGraphEdge[]): Map<string, P> {
  const rng = seededRandom(1337);
  const pos = new Map<string, P>();
  nodes.forEach((n) => pos.set(n.slug, { x: rng() * W, y: rng() * H, vx: 0, vy: 0 }));

  const iters = 400;
  for (let it = 0; it < iters; it++) {
    const cool = 1 - it / iters;
    // Repulsion between all pairs.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos.get(nodes[i].slug)!;
        const b = pos.get(nodes[j].slug)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        // Extra push for different clusters so groups separate.
        const sameCluster = nodes[i].cluster === nodes[j].cluster;
        const rep = (sameCluster ? 5200 : 8000) / d2;
        const d = Math.sqrt(d2);
        a.vx += (dx / d) * rep;
        a.vy += (dy / d) * rep;
        b.vx -= (dx / d) * rep;
        b.vy -= (dy / d) * rep;
      }
    }
    // Spring attraction along edges (prerequisites pull harder / shorter).
    for (const e of edges) {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = e.kind === "prerequisite" ? 130 : 240;
      const k = e.kind === "prerequisite" ? 0.02 : 0.006 * Math.min(e.weight, 4);
      const f = (d - ideal) * k;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    // Gravity toward centre + integrate with damping.
    for (const n of nodes) {
      const p = pos.get(n.slug)!;
      p.vx += (W / 2 - p.x) * 0.008;
      p.vy += (H / 2 - p.y) * 0.008;
      p.x += Math.max(-30, Math.min(30, p.vx)) * cool;
      p.y += Math.max(-30, Math.min(30, p.vy)) * cool;
      p.vx *= 0.85;
      p.vy *= 0.85;
    }
  }
  // Fit to viewbox with padding.
  const xs = [...pos.values()].map((p) => p.x);
  const ys = [...pos.values()].map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 60;
  for (const p of pos.values()) {
    p.x = pad + ((p.x - minX) / (maxX - minX || 1)) * (W - 2 * pad);
    p.y = pad + ((p.y - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  }
  return pos;
}

const STAGE_ABBR: Record<string, string> = {
  data: "Da", "hypothesis-space": "Hy", objective: "Ob", optimization: "Op",
  evaluation: "Ev", feedback: "Fb", task: "Ta", context: "Cx",
  orchestration: "Or", guardrails: "Gd", operations: "Ops",
};

export function ConceptMap({ nodes, edges, details }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [spineFilter, setSpineFilter] = useState<"all" | "ml" | "agentic">("all");
  const [showRelated, setShowRelated] = useState(true);

  const pos = useMemo(() => layout(nodes, edges), [nodes, edges]);

  const clusters = useMemo(
    () => [...new Set(nodes.map((n) => n.cluster))].sort(),
    [nodes],
  );
  const clusterColor = (c: string) => PALETTE[clusters.indexOf(c) % PALETTE.length];

  const maxLessons = Math.max(...nodes.map((n) => n.lessonCount));
  const radius = (n: CourseGraphNode) => 10 + 14 * (n.lessonCount / maxLessons);

  const active = selected ?? hover;
  // Neighbours of the active node (for highlight).
  const activeNeighbours = useMemo(() => {
    if (!active) return new Set<string>();
    const s = new Set<string>();
    for (const e of edges) {
      if (e.source === active) s.add(e.target);
      if (e.target === active) s.add(e.source);
    }
    return s;
  }, [active, edges]);

  const dimmed = (slug: string) => {
    if (spineFilter !== "all") {
      const node = nodes.find((n) => n.slug === slug);
      if (node && node.spine !== spineFilter) return true;
    }
    if (active) return slug !== active && !activeNeighbours.has(slug);
    return false;
  };

  const sel = selected ? nodes.find((n) => n.slug === selected) : null;
  const selDetail = selected ? details[selected] : null;
  const prereqs = selected
    ? edges.filter((e) => e.kind === "prerequisite" && e.source === selected).map((e) => e.target)
    : [];
  const dependents = selected
    ? edges.filter((e) => e.kind === "prerequisite" && e.target === selected).map((e) => e.source)
    : [];
  const relatedCourses = selected
    ? edges
        .filter((e) => e.kind === "related" && (e.source === selected || e.target === selected))
        .map((e) => (e.source === selected ? e.target : e.source))
    : [];
  const titleOf = (slug: string) => nodes.find((n) => n.slug === slug)?.title ?? slug;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        {/* Controls */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Spine:</span>
          {(["all", "ml", "agentic"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSpineFilter(f)}
              className={`rounded-md px-2 py-1 font-medium transition-colors ${
                spineFilter === f
                  ? "bg-brand-500 text-white"
                  : "bg-surface-elevated text-slate-300 hover:bg-surface-border"
              }`}
            >
              {f === "all" ? "All" : f === "ml" ? "ML loop" : "Agentic loop"}
            </button>
          ))}
          <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-slate-400">
            <input
              type="checkbox"
              checked={showRelated}
              onChange={(e) => setShowRelated(e.target.checked)}
              className="accent-brand-500"
            />
            concept links
          </label>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full rounded-xl border border-surface-border bg-surface-card"
          role="img"
          aria-label="Course knowledge map: courses connected by prerequisites and shared concepts."
        >
          <defs>
            <marker id="cm-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3"
              orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L7,3 L0,6 Z" fill={VIZ.axis} />
            </marker>
          </defs>

          {/* Related (conceptual) edges — faint. */}
          {showRelated &&
            edges.filter((e) => e.kind === "related").map((e, i) => {
              const a = pos.get(e.source)!;
              const b = pos.get(e.target)!;
              const on = active && (e.source === active || e.target === active);
              if (dimmed(e.source) || dimmed(e.target)) return null;
              return (
                <line
                  key={`r${i}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={on ? VIZ.brandLight : VIZ.grid}
                  strokeWidth={on ? 1.5 : 0.8}
                  opacity={on ? 0.8 : 0.35}
                />
              );
            })}

          {/* Prerequisite edges — solid, directed. */}
          {edges.filter((e) => e.kind === "prerequisite").map((e, i) => {
            const a = pos.get(e.source)!;
            const b = pos.get(e.target)!;
            if (dimmed(e.source) || dimmed(e.target)) return null;
            const on = active && (e.source === active || e.target === active);
            // Shorten so the arrow sits at the target node's edge.
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const tb = radius(nodes.find((n) => n.slug === e.target)!) + 4;
            const ex = b.x - (dx / d) * tb;
            const ey = b.y - (dy / d) * tb;
            return (
              <line
                key={`p${i}`}
                x1={a.x} y1={a.y} x2={ex} y2={ey}
                stroke={on ? VIZ.brandLight : VIZ.axis}
                strokeWidth={on ? 2 : 1.3}
                opacity={on ? 0.95 : 0.6}
                markerEnd="url(#cm-arrow)"
              />
            );
          })}

          {/* Course nodes. */}
          {nodes.map((n) => {
            const p = pos.get(n.slug)!;
            const r = radius(n);
            const isSel = selected === n.slug;
            const dim = dimmed(n.slug);
            return (
              <g
                key={n.slug}
                className="cursor-pointer"
                opacity={dim ? 0.25 : 1}
                onMouseEnter={() => setHover(n.slug)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setSelected(isSel ? null : n.slug)}
              >
                <circle
                  cx={p.x} cy={p.y} r={r}
                  fill={clusterColor(n.cluster)}
                  stroke={isSel ? "#fff" : n.spine === "agentic" ? VIZ.textBright : "transparent"}
                  strokeWidth={isSel ? 3 : n.spine === "agentic" ? 1.5 : 0}
                  strokeDasharray={n.spine === "agentic" ? "3 2" : undefined}
                />
                <text
                  x={p.x} y={p.y + r + 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isSel || hover === n.slug ? VIZ.textBright : VIZ.text}
                >
                  {n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          {clusters.map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: clusterColor(c) }} />
              {c}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-slate-300" />
            agentic spine
          </span>
        </div>
      </div>

      {/* Detail panel */}
      <aside className="w-full shrink-0 lg:w-80">
        {!sel ? (
          <div className="card-glass p-4 text-sm text-slate-400">
            <p className="font-medium text-white">The concept map</p>
            <p className="mt-2 leading-relaxed">
              Every course connected by <strong className="text-slate-200">prerequisites</strong> (arrows)
              and <strong className="text-slate-200">shared concepts</strong> (faint links). Node size = lesson
              count; colour = cluster; a dashed ring marks the agentic spine.
            </p>
            <p className="mt-2 leading-relaxed">Click a course to see its lessons, loop stages, and connections.</p>
          </div>
        ) : (
          <div className="card-glass p-4">
            <Link href={sel.href} className="text-base font-semibold text-white hover:text-brand-300">
              {sel.title}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              {sel.cluster} · {sel.lessonCount} lessons · {sel.spine === "agentic" ? "agentic" : "ML"} loop
            </p>

            {prereqs.length > 0 && (
              <PanelList label="Prerequisites" items={prereqs} titleOf={titleOf} onPick={setSelected} />
            )}
            {dependents.length > 0 && (
              <PanelList label="Unlocks" items={dependents} titleOf={titleOf} onPick={setSelected} />
            )}
            {relatedCourses.length > 0 && (
              <PanelList label="Related courses" items={[...new Set(relatedCourses)]} titleOf={titleOf} onPick={setSelected} />
            )}

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Lessons</p>
            <ul className="mt-1 space-y-1">
              {selDetail!.lessons.map((l) => (
                <li key={l.href} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 flex shrink-0 gap-0.5">
                    {l.spineStages.map((s) => (
                      <span key={s} title={s}
                        className="rounded bg-surface-elevated px-1 text-[9px] font-medium text-brand-300">
                        {STAGE_ABBR[s] ?? s}
                      </span>
                    ))}
                  </span>
                  <Link href={l.href} className="text-slate-300 hover:text-white">{l.title}</Link>
                </li>
              ))}
            </ul>

            {selDetail!.deepDives.length > 0 && (
              <>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Wiki deep-dives</p>
                <ul className="mt-1 space-y-1">
                  {selDetail!.deepDives.map((d) => (
                    <li key={d.href} className="text-xs">
                      <Link href={d.href} className="text-accent-teal hover:underline">{d.title}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function PanelList({
  label, items, titleOf, onPick,
}: {
  label: string;
  items: string[];
  titleOf: (s: string) => string;
  onPick: (s: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-md bg-surface-elevated px-2 py-0.5 text-xs text-slate-300 hover:bg-surface-border hover:text-white"
          >
            {titleOf(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
