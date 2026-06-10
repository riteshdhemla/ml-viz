"use client";

import { CheckCircle } from "lucide-react";
import { useProgress } from "@/lib/progress";

interface Props {
  courseSlug: string;
  totalLessons: number;
}

export function CourseProgressBar({ courseSlug, totalLessons }: Props) {
  const { getCompletedLessonCount } = useProgress();
  const completed = getCompletedLessonCount(courseSlug);
  if (completed === 0 || totalLessons === 0) return null;

  const pct = Math.round((completed / totalLessons) * 100);
  const done = completed >= totalLessons;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-1.5 text-slate-400">
          {done && <CheckCircle size={14} className="text-accent-teal" />}
          <span className={done ? "text-accent-teal font-medium" : ""}>
            {completed} / {totalLessons} lessons complete
          </span>
        </span>
        <span className="font-mono text-slate-400 text-xs">{pct}%</span>
      </div>
      <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-teal rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
