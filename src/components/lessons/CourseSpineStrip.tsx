import Link from "next/link";
import { getSpine } from "@/lib/spine";
import type { LessonMeta } from "@/types/course";

interface Props {
  /** The course's spine id. */
  spine?: string;
  /** The course's lessons (their spineStages are unioned to show coverage). */
  lessons: LessonMeta[];
}

/**
 * Compact strip on a course page showing which stages of its project loop the
 * course covers (the union of its lessons' `spineStages`). Covered stages are
 * lit in their accent colour; the rest are dimmed. Links to the loop's hub.
 */
export function CourseSpineStrip({ spine, lessons }: Props) {
  const s = getSpine(spine);
  if (!s) return null;

  const covered = new Set<string>();
  for (const l of lessons) for (const stage of l.spineStages ?? []) covered.add(stage);
  if (covered.size === 0) return null;

  return (
    <Link
      href={`/wiki/${s.hubSlug}`}
      className="group mt-6 block rounded-lg border border-surface-border bg-surface-card/40 px-4 py-3 transition-colors hover:border-brand-500/40"
      title={`${s.label} — the stages this course covers`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 group-hover:text-slate-400">
          {s.label}
        </span>
        <span className="text-[11px] text-slate-600 group-hover:text-slate-500">
          {covered.size}/{s.stages.length} stages →
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {s.stages.map((stage) => {
          const on = covered.has(stage.id);
          return (
            <span
              key={stage.id}
              className={`flex items-center gap-1.5 text-xs ${on ? "text-white" : "text-slate-600"}`}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: on ? stage.color : "#334155" }}
                aria-hidden
              />
              {stage.label}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
