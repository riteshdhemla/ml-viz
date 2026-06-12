"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, BarChart2 } from "lucide-react";
import type { CourseMeta } from "@/types/course";
import { formatMinutes } from "@/lib/utils";
import { useProgress } from "@/lib/progress";

interface Props {
  course: CourseMeta;
}

const DIFFICULTY_COLORS = {
  beginner: "text-accent-teal",
  intermediate: "text-accent-yellow",
  advanced: "text-accent-rose",
};

export function CourseCard({ course }: Props) {
  const { getCourseProgress } = useProgress();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const progress = hydrated ? getCourseProgress(course.slug) : 0;
  const started = progress > 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group card-glass p-6 hover:border-brand-500/50 transition-all duration-200 hover:-translate-y-0.5 block relative overflow-hidden"
    >
      {/* Color accent strip */}
      <div className={`h-1 w-12 rounded-full mb-5 ${course.coverColor}`} />

      <h3 className="text-lg font-semibold text-white group-hover:text-brand-300 transition-colors mb-2">
        {course.title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-2">
        {course.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className={`flex items-center gap-1 ${DIFFICULTY_COLORS[course.difficulty]}`}>
          <BarChart2 size={12} />
          {course.difficulty}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatMinutes(course.estimatedHours * 60)}
        </span>
        {started && (
          <span className="ml-auto text-accent-teal font-medium">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Progress bar at bottom of card */}
      {started && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-border">
          <div
            className="h-full bg-accent-teal transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Link>
  );
}
