"use client";

import { useRouter } from "next/navigation";
import { VIZ } from "@/components/visualizations/viz-kit";
import type { Neighborhood, NeighborRelation } from "@/lib/knowledge-graph";

/**
 * ConceptNeighborhood — a small "concept map fragment" for the current lesson
 * or wiki page: this concept in the centre, its typed neighbours around it.
 * Seeing the local relational structure at the point of study (what this builds
 * on, relates to, and goes deeper into) is a retention aid distinct from the
 * project-loop spine. Data comes from `getNeighborhood()`.
 */

const REL_LABEL: Record<NeighborRelation, string> = {
  "builds-on": "Builds on",
  related: "Related",
  deeper: "Go deeper",
  "referenced-by": "Referenced by",
};

const REL_COLOR: Record<NeighborRelation, string> = {
  "builds-on": VIZ.yellow,
  related: VIZ.brand,
  deeper: VIZ.teal,
  "referenced-by": VIZ.teal,
};

const W = 720;
const H = 300;
const CX = W / 2;
const CY = H / 2;

export function ConceptNeighborhood({ data }: { data: Neighborhood }) {
  const router = useRouter();
  const items = data.neighbors;
  const n = items.length;
  const radius = Math.min(120, 60 + n * 6);
  const relations = [...new Set(items.map((i) => i.relation))];

  return (
    <section className="not-prose mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Concept neighbourhood
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        How this concept connects — click any node to jump there, or explore the whole{" "}
        <a href="/map" className="text-brand-300 hover:underline">concept map</a>.
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {relations.map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REL_COLOR[r] }} />
            {REL_LABEL[r]}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full rounded-xl border border-surface-border bg-surface-card"
        role="img"
        aria-label={`Concept neighbourhood of ${data.center.title}.`}
      >
        {items.map((it, i) => {
          const a = (i / n) * 2 * Math.PI - Math.PI / 2;
          const x = CX + radius * Math.cos(a);
          const y = CY + radius * Math.sin(a);
          return (
            <line key={`l${i}`} x1={CX} y1={CY} x2={x} y2={y} stroke={VIZ.grid} strokeWidth={1} />
          );
        })}

        {/* Centre concept. */}
        <circle cx={CX} cy={CY} r={16} fill={VIZ.card} stroke="#fff" strokeWidth={2} />
        <text x={CX} y={CY + 34} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ.textBright}>
          {truncate(data.center.title, 34)}
        </text>

        {/* Neighbours. */}
        {items.map((it, i) => {
          const a = (i / n) * 2 * Math.PI - Math.PI / 2;
          const x = CX + radius * Math.cos(a);
          const y = CY + radius * Math.sin(a);
          const anchor = x > CX + 4 ? "start" : x < CX - 4 ? "end" : "middle";
          return (
            <g
              key={`n${i}`}
              className="cursor-pointer"
              onClick={() => router.push(it.href)}
              role="link"
              aria-label={it.title}
            >
              <circle cx={x} cy={y} r={7} fill={REL_COLOR[it.relation]} />
              <text
                x={x + (anchor === "start" ? 11 : anchor === "end" ? -11 : 0)}
                y={y + 4}
                textAnchor={anchor}
                fontSize={10}
                fill={VIZ.text}
              >
                {truncate(it.title, 26)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
