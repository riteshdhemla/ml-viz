"use client";

import Link from "next/link";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { useProgress } from "@/lib/progress";
import type { LessonMeta } from "@/types/course";
import { formatMinutes } from "@/lib/utils";

interface Props {
  courseSlug: string;
  lessons: LessonMeta[];
}

const LESSON_TYPE_LABEL = {
  concept: "Concept",
  exercise: "Exercise",
  quiz: "Quiz",
  playground: "Playground",
};

export function LessonList({ courseSlug, lessons }: Props) {
  const { isLessonComplete } = useProgress();

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-white mb-4">
        {lessons.length} lessons
      </h2>
      {lessons.map((lesson, i) => {
        const done = isLessonComplete(courseSlug, lesson.slug);
        return (
          <Link
            key={lesson.slug}
            href={`/courses/${courseSlug}/${lesson.slug}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-surface-border hover:border-brand-500/50 bg-surface-card hover:bg-surface-elevated transition-all group"
          >
            <span className="text-slate-600 text-sm w-6 text-right shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>

            {done ? (
              <CheckCircle size={18} className="text-accent-teal shrink-0" />
            ) : (
              <Circle size={18} className="text-slate-600 shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200 group-hover:text-white transition-colors">
                {lesson.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{lesson.description}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline text-xs text-slate-600 border border-surface-border rounded px-2 py-0.5">
                {LESSON_TYPE_LABEL[lesson.type]}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <Clock size={11} />
                {formatMinutes(lesson.estimatedMinutes)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
