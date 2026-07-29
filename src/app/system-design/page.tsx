import Link from "next/link";
import { Clock, Building2 } from "lucide-react";
import { getAllSystemDesignCases } from "@/lib/content";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { absoluteUrl } from "@/lib/site";
import type { SystemDesignCase } from "@/types/system-design";
import type { SpineId } from "@/types/course";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Design",
  description:
    "Worked ML and agentic system-design interview walkthroughs — clarify requirements, estimate scale, design the system, and reason through the tradeoffs, structured by the project loop.",
  alternates: { canonical: absoluteUrl("/system-design") },
};

/** The two interview tracks, in display order, keyed by spine. */
const TRACKS: { spine: SpineId; label: string; blurb: string }[] = [
  {
    spine: "ml",
    label: "ML System Design",
    blurb:
      "Ranking, retrieval, detection, and forecasting systems — walked through the ML project loop.",
  },
  {
    spine: "agentic",
    label: "Agentic System Design",
    blurb:
      "LLM agents, tools, and orchestration — walked through the agentic project loop.",
  },
];

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner: "bg-accent-teal/15 text-accent-teal border-accent-teal/30",
  intermediate: "bg-accent-yellow/15 text-yellow-300 border-accent-yellow/30",
  advanced: "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
};

function CaseCard({ page }: { page: SystemDesignCase }) {
  return (
    <Link
      href={`/system-design/${page.slug}`}
      className="group card-glass p-5 hover:border-brand-500/50 transition-all duration-200 hover:-translate-y-0.5 block"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors">
          {page.title}
        </h3>
        {page.difficulty && (
          <span
            className={`shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded border ${
              DIFFICULTY_STYLE[page.difficulty] ?? DIFFICULTY_STYLE.intermediate
            }`}
          >
            {page.difficulty}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-slate-400 line-clamp-2">{page.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        {page.company && (
          <span className="flex items-center gap-1">
            <Building2 size={12} />
            {page.company}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {page.estimatedMinutes} min
        </span>
      </div>
      {page.scale && <p className="mt-2 text-xs text-slate-600">{page.scale}</p>}
    </Link>
  );
}

export default function SystemDesignIndexPage() {
  const cases = getAllSystemDesignCases();

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white">System Design</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Interview-style walkthroughs of real ML and agentic systems. Each one
          clarifies requirements, estimates scale, designs the system, and reasons
          through the tradeoffs — structured as a walk through the project loop.
        </p>

        {cases.length === 0 && (
          <p className="mt-12 text-slate-500">No case studies yet — check back soon.</p>
        )}

        {TRACKS.map((track) => {
          const trackCases = cases.filter((c) => c.spine === track.spine);
          if (trackCases.length === 0) return null;
          return (
            <section key={track.spine} className="mt-12">
              <h2 className="text-lg font-semibold text-white">{track.label}</h2>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl">{track.blurb}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {trackCases.map((page) => (
                  <CaseCard key={page.slug} page={page} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
