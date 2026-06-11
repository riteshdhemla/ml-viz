"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, MapPin } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/course";

export interface PathCourse {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  prerequisites: string[];
  estimatedHours: number;
  lessonCount: number;
  tier: number;
  order: number;
  coverColor?: string;
  cluster: string;
}

const DIFFICULTY_DOT: Record<Difficulty, string> = {
  beginner: "bg-accent-teal",
  intermediate: "bg-accent-yellow",
  advanced: "bg-accent-rose",
};

// Canonical cluster display order
const CLUSTER_ORDER = [
  "Math Foundations",
  "Classical ML",
  "Deep Learning",
  "Unsupervised & Probabilistic",
  "Applied ML",
  "Reinforcement Learning",
];

const CLUSTER_STYLES: Record<string, { accent: string; badge: string }> = {
  "Math Foundations":          { accent: "text-accent-teal",   badge: "bg-accent-teal/15 text-accent-teal" },
  "Classical ML":              { accent: "text-brand-300",     badge: "bg-brand-500/15 text-brand-300" },
  "Deep Learning":             { accent: "text-accent-orange", badge: "bg-accent-orange/15 text-accent-orange" },
  "Unsupervised & Probabilistic": { accent: "text-accent-rose", badge: "bg-accent-rose/15 text-accent-rose" },
  "Applied ML":                { accent: "text-accent-yellow", badge: "bg-accent-yellow/15 text-accent-yellow" },
  "Reinforcement Learning":    { accent: "text-brand-400",     badge: "bg-brand-400/15 text-brand-400" },
};

const DEFAULT_STYLE = { accent: "text-slate-400", badge: "bg-slate-500/15 text-slate-400" };

/**
 * Prerequisite-ordered course map grouped by logical cluster.
 * Within each cluster courses are sorted by prerequisite depth so the
 * natural study order is preserved. Progress, lock state, and "you are here"
 * markers are all live from the Zustand store.
 */
export function LearningPath({ courses }: { courses: PathCourse[] }) {
  const lessons = useProgress((s) => s.lessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const completedCount = (slug: string) =>
    mounted ? Object.values(lessons).filter((l) => l.courseSlug === slug && l.completed).length : 0;

  const pct = (c: PathCourse) =>
    c.lessonCount === 0 ? 0 : Math.min(100, Math.round((completedCount(c.slug) / c.lessonCount) * 100));

  const isDone = (slug: string) => {
    const c = courses.find((x) => x.slug === slug);
    return c ? pct(c) >= 100 : true;
  };

  let hereSlug: string | null = null;
  if (mounted) {
    hereSlug =
      courses.find((c) => pct(c) > 0 && pct(c) < 100)?.slug ??
      courses.find((c) => pct(c) === 0 && c.prerequisites.every(isDone))?.slug ??
      null;
  }

  // Group by cluster, preserving CLUSTER_ORDER; unknown clusters appended last
  const allClusters = [...new Set([...CLUSTER_ORDER, ...courses.map((c) => c.cluster)])];
  const grouped = allClusters
    .map((cluster) => ({
      cluster,
      courses: courses
        .filter((c) => c.cluster === cluster)
        .sort((a, b) => a.tier - b.tier || a.order - b.order),
    }))
    .filter((g) => g.courses.length > 0);

  return (
    <div className="mt-10 space-y-10">
      {grouped.map(({ cluster, courses: group }) => {
        const style = CLUSTER_STYLES[cluster] ?? DEFAULT_STYLE;
        return (
          <section key={cluster}>
            {/* Cluster header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className={cn("text-base font-semibold", style.accent)}>{cluster}</h2>
              <div className="h-px flex-1 bg-surface-border" />
              <span className="text-xs text-slate-600">{group.length} course{group.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((c) => {
                const progress = pct(c);
                const here = c.slug === hereSlug;
                const locked = mounted && progress === 0 && !c.prerequisites.every(isDone);
                return (
                  <Link
                    key={c.slug}
                    href={`/courses/${c.slug}`}
                    className={cn(
                      "card-glass group relative block p-4 transition-all hover:-translate-y-0.5",
                      here ? "border-brand-500/70" : "hover:border-surface-border"
                    )}
                  >
                    {here && (
                      <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        <MapPin size={10} /> you are here
                      </span>
                    )}
                    {c.coverColor && (
                      <div className={cn("h-0.5 w-8 rounded-full mb-3", c.coverColor)} />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white leading-snug">{c.title}</h3>
                      {progress >= 100 ? (
                        <CheckCircle2 size={16} className="shrink-0 text-accent-teal" />
                      ) : locked ? (
                        <Lock size={14} className="shrink-0 text-slate-600" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{c.description}</p>

                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className={cn("h-2 w-2 rounded-full", DIFFICULTY_DOT[c.difficulty])} />
                      <span className="capitalize">{c.difficulty}</span>
                      <span>·</span>
                      <span>{c.lessonCount} lessons</span>
                      <span>·</span>
                      <span>~{c.estimatedHours}h</span>
                      {mounted && progress > 0 && (
                        <span className="ml-auto tabular-nums text-slate-400">{progress}%</span>
                      )}
                    </div>

                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className={cn("h-full rounded-full", progress >= 100 ? "bg-accent-teal" : "bg-brand-500")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {c.prerequisites.length > 0 && (
                      <p className="mt-2 text-[10px] text-slate-600">
                        after: {c.prerequisites.join(", ")}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
