"use client";

import Link from "next/link";
import { CheckCircle, BookOpen, TrendingUp, ChevronRight } from "lucide-react";
import { useProgress } from "@/lib/progress";
import type { CourseInfo } from "@/app/progress/page";

interface Props {
  courses: CourseInfo[];
}

const DIFFICULTY_DOT: Record<CourseInfo["difficulty"], string> = {
  beginner: "bg-accent-teal",
  intermediate: "bg-accent-yellow",
  advanced: "bg-accent-rose",
};

const DIFFICULTY_TEXT: Record<CourseInfo["difficulty"], string> = {
  beginner: "text-accent-teal",
  intermediate: "text-accent-yellow",
  advanced: "text-accent-rose",
};

export function ProgressDashboard({ courses }: Props) {
  const { getCompletedLessonCount } = useProgress();

  const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0);

  const coursesWithProgress = courses.map((c) => {
    const completed = getCompletedLessonCount(c.slug);
    const pct = c.lessonCount > 0 ? Math.round((completed / c.lessonCount) * 100) : 0;
    return { ...c, completed, pct, isComplete: completed >= c.lessonCount && c.lessonCount > 0 };
  });

  const startedCourses = coursesWithProgress.filter((c) => c.completed > 0);
  const completedCourses = coursesWithProgress.filter((c) => c.isComplete);
  const totalCompletedLessons = coursesWithProgress.reduce((sum, c) => sum + c.completed, 0);

  // Compute slug → isComplete lookup for prerequisites check
  const completionMap = Object.fromEntries(coursesWithProgress.map((c) => [c.slug, c.isComplete]));

  // Recommended: first not-started course whose prerequisites are all met
  const recommended = courses
    .filter((c) => {
      const prog = getCompletedLessonCount(c.slug);
      if (prog > 0) return false; // already started
      return c.prerequisites.every((prereq) => completionMap[prereq] ?? false);
    })
    .sort((a, b) => a.order - b.order)[0] ?? null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Your Progress</h1>
      <p className="text-slate-400 mb-8">Track your journey through the ML curriculum.</p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card-glass p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
            <BookOpen size={12} />
            Courses started
          </div>
          <div className="text-3xl font-bold text-white">
            {startedCourses.length}
            <span className="text-slate-500 text-lg font-normal"> / {courses.length}</span>
          </div>
        </div>
        <div className="card-glass p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
            <CheckCircle size={12} />
            Lessons done
          </div>
          <div className="text-3xl font-bold text-white">
            {totalCompletedLessons}
            <span className="text-slate-500 text-lg font-normal"> / {totalLessons}</span>
          </div>
        </div>
        <div className="card-glass p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
            <TrendingUp size={12} />
            Courses complete
          </div>
          <div className="text-3xl font-bold text-accent-teal">
            {completedCourses.length}
            <span className="text-slate-500 text-lg font-normal text-slate-500"> / {courses.length}</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {recommended && (
        <div className="mb-8 p-4 rounded-xl border border-brand-500/30 bg-brand-500/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-brand-400 uppercase tracking-wide font-medium mb-1">
              Recommended next
            </p>
            <p className="font-semibold text-white">{recommended.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{recommended.difficulty}</p>
          </div>
          <Link
            href={`/courses/${recommended.slug}`}
            className="flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors shrink-0"
          >
            Start <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Per-course progress bars */}
      <h2 className="text-lg font-semibold text-white mb-4">All Courses</h2>
      <div className="space-y-3">
        {coursesWithProgress.map((c) => (
          <Link
            key={c.slug}
            href={`/courses/${c.slug}`}
            className="block card-glass p-4 hover:border-brand-500/40 transition-all group"
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${DIFFICULTY_DOT[c.difficulty]}`} />
                <span className="font-medium text-slate-200 group-hover:text-white transition-colors truncate text-sm">
                  {c.title}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.isComplete && <CheckCircle size={14} className="text-accent-teal" />}
                <span className="text-xs font-mono text-slate-400">
                  {c.completed}/{c.lessonCount}
                </span>
                <span className={`text-xs font-medium ${c.pct > 0 ? DIFFICULTY_TEXT[c.difficulty] : "text-slate-600"}`}>
                  {c.pct}%
                </span>
              </div>
            </div>
            <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
              {c.pct > 0 && (
                <div
                  className="h-full bg-accent-teal rounded-full transition-all duration-500"
                  style={{ width: `${c.pct}%` }}
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
