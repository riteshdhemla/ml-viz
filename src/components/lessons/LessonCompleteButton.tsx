"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { LessonMeta } from "@/types/course";

interface Props {
  meta: LessonMeta;
  next: LessonMeta | null;
}

/**
 * Marks the lesson complete in the progress store and advances to the next
 * lesson (or back to the course page on the last lesson).
 */
export function LessonCompleteButton({ meta, next }: Props) {
  const router = useRouter();
  const markLessonComplete = useProgress((s) => s.markLessonComplete);
  const isLessonComplete = useProgress((s) => s.isLessonComplete);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  const done = hydrated && isLessonComplete(meta.courseSlug, meta.slug);

  function onClick() {
    markLessonComplete(meta.courseSlug, meta.slug);
    router.push(
      next
        ? `/courses/${meta.courseSlug}/${next.slug}`
        : `/courses/${meta.courseSlug}`
    );
  }

  return (
    <div className="mt-12 flex justify-center">
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
          done
            ? "bg-surface-elevated text-accent-teal border border-teal-500/30 hover:border-teal-500/60"
            : "bg-brand-500 text-white hover:bg-brand-400 hover:-translate-y-0.5"
        )}
      >
        <CheckCircle size={18} />
        {done
          ? next
            ? "Completed — next lesson"
            : "Completed — back to course"
          : next
            ? "Mark complete & continue"
            : "Mark complete & finish course"}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
