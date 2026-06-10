"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useProgress } from "@/lib/progress";
import type { SearchItem } from "@/types/search";

interface Props {
  /** All lessons in site order; reused from the search index. */
  items: SearchItem[];
}

/**
 * Shows a "Continue learning" card pointing at the next incomplete lesson
 * in the course the user most recently worked on. Hidden until hydrated
 * and hidden entirely for brand-new visitors.
 */
export function ContinueLearning({ items }: Props) {
  const lessons = useProgress((s) => s.lessons);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;

  const records = Object.values(lessons);
  if (records.length === 0) return null;

  // Most recently completed lesson decides which course to resume.
  const latest = records
    .filter((r) => r.completed && r.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
  if (!latest) return null;

  const lessonItems = items.filter((i) => i.kind === "lesson");
  const completedHrefs = new Set(
    records
      .filter((r) => r.completed)
      .map((r) => `/courses/${r.courseSlug}/${r.lessonSlug}`)
  );

  // Next incomplete lesson in that course, else first incomplete anywhere.
  const courPrefix = `/courses/${latest.courseSlug}/`;
  const next =
    lessonItems.find(
      (i) => i.href.startsWith(courPrefix) && !completedHrefs.has(i.href)
    ) ?? lessonItems.find((i) => !completedHrefs.has(i.href));
  if (!next) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <Link
        href={next.href}
        className="card-glass group flex items-center gap-4 p-5 rounded-xl border border-surface-border hover:border-brand-500/50 hover:-translate-y-0.5 transition-all"
      >
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/15 text-brand-400 shrink-0">
          <Play className="w-4 h-4 ml-0.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs uppercase tracking-wider text-slate-500 mb-0.5">
            Continue learning · {next.courseTitle}
          </span>
          <span className="block text-white font-medium truncate">
            {next.title}
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
    </section>
  );
}
