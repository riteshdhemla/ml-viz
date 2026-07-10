"use client";

import { useState } from "react";
import Link from "next/link";
import { Map, LayoutGrid, Rocket, ArrowRight } from "lucide-react";
import { LearningPath, type PathCourse } from "@/components/layout/LearningPath";
import { CourseCard } from "@/components/lessons/CourseCard";
import { cn } from "@/lib/utils";
import type { CourseMeta } from "@/types/course";

interface Props {
  pathCourses: PathCourse[];
  allCourses: CourseMeta[];
}

type View = "path" | "browse";

const VIEWS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "path", label: "Learning path", icon: Map },
  { id: "browse", label: "Browse all", icon: LayoutGrid },
];

export function CoursesView({ pathCourses, allCourses }: Props) {
  const [view, setView] = useState<View>("path");

  const foundations = allCourses.filter((c) => (c.order ?? 0) < 0);
  const byDifficulty = {
    beginner: allCourses.filter((c) => (c.order ?? 0) >= 0 && c.difficulty === "beginner"),
    intermediate: allCourses.filter((c) => c.difficulty === "intermediate"),
    advanced: allCourses.filter((c) => c.difficulty === "advanced"),
  };

  return (
    <>
      {/* View toggle */}
      <div className="mt-6 inline-flex items-center rounded-lg border border-surface-border bg-surface-card p-1 gap-1">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === id
                ? "bg-brand-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-surface-elevated"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Cross-link to project-based tracks */}
      <Link
        href="/projects"
        className="group mt-6 flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3 hover:border-brand-500/60 transition-colors"
      >
        <Rocket size={16} className="shrink-0 text-brand-400" />
        <span className="text-sm text-slate-300">
          <span className="font-medium text-white">Prefer to build?</span> Follow a
          project — end-to-end tracks that connect these courses into shippable systems.
        </span>
        <ArrowRight
          size={15}
          className="ml-auto shrink-0 text-brand-400 transition-transform group-hover:translate-x-0.5"
        />
      </Link>

      {view === "path" ? (
        <LearningPath courses={pathCourses} />
      ) : (
        <div className="mt-10 space-y-14">
          {foundations.length > 0 && (
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="text-brand-400">◆</span>
                  Foundations
                </h2>
                <p className="text-sm text-slate-500 mt-1 ml-7">
                  Essential math before diving into ML algorithms
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {foundations.map((course) => (
                  <CourseCard key={course.slug} course={course} />
                ))}
              </div>
            </section>
          )}

          {(["beginner", "intermediate", "advanced"] as const).map((level) => {
            const group = byDifficulty[level];
            if (group.length === 0) return null;
            return (
              <section key={level}>
                <h2 className="text-xl font-semibold text-white capitalize mb-6 flex items-center gap-3">
                  <span
                    className={
                      level === "beginner"
                        ? "text-accent-teal"
                        : level === "intermediate"
                        ? "text-accent-yellow"
                        : "text-accent-rose"
                    }
                  >
                    ●
                  </span>
                  {level}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.map((course) => (
                    <CourseCard key={course.slug} course={course} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
