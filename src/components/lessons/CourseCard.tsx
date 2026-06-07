import Link from "next/link";
import { Clock, BarChart2 } from "lucide-react";
import type { CourseMeta } from "@/types/course";
import { formatMinutes } from "@/lib/utils";

interface Props {
  course: CourseMeta;
}

const DIFFICULTY_COLORS = {
  beginner: "text-accent-teal",
  intermediate: "text-accent-yellow",
  advanced: "text-accent-rose",
};

export function CourseCard({ course }: Props) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group card-glass p-6 hover:border-brand-500/50 transition-all duration-200 hover:-translate-y-0.5 block"
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
      </div>
    </Link>
  );
}
