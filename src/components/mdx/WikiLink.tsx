import Link from "next/link";
import { BookMarked, ChevronRight, NotebookPen } from "lucide-react";

interface Props {
  /** Wiki page slug — must match a file in src/content/wiki/. */
  slug: string;
  /** Display title (plain string; MDX runs with blockJS so no fs lookup here). */
  title: string;
}

/**
 * "Deep dive" card linking a lesson to a Concept Wiki page. Lessons keep a
 * short prose summary above this card; the wiki page holds the full
 * procedure, worked trace, and runnable notebook.
 */
export function WikiLink({ slug, title }: Props) {
  return (
    <Link
      href={`/wiki/${slug}`}
      className="group not-prose my-6 flex items-center gap-4 card-glass p-4 border-brand-500/40 hover:border-brand-500/70 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center">
        <BookMarked size={20} className="text-brand-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-brand-300 uppercase tracking-wide">
          Deep dive
        </div>
        <div className="font-semibold text-white truncate">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
          <NotebookPen size={11} />
          Includes runnable notebook
        </div>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-slate-500 group-hover:text-brand-300 group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}
