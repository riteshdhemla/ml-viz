import { CircleHelp, ChevronRight } from "lucide-react";

interface Props {
  question: string;
  children: React.ReactNode;
}

/**
 * Socratic pause-point for system-design cases and lessons:
 *
 *   <ThinkFirst question="What single constraint dictates the architecture?">
 *     The 200ms budget — it rules out scoring every item…
 *   </ThinkFirst>
 *
 * The question is always visible; the model answer stays collapsed until the
 * reader has committed to their own. Native <details>, so no client JS and
 * keyboard-accessible. Place it at the end of the section *before* the one
 * that answers it.
 */
export function ThinkFirst({ question, children }: Props) {
  return (
    <details className="not-prose group my-6 overflow-hidden rounded-xl border border-brand-500/40 bg-brand-500/5">
      <summary className="flex cursor-pointer select-none items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-500/10 [&::-webkit-details-marker]:hidden">
        <CircleHelp size={18} className="mt-0.5 shrink-0 text-brand-400" />
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-400">
            Think first
          </span>
          <span className="text-sm font-semibold leading-snug text-slate-200">{question}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
            <span className="group-open:hidden">Commit to an answer, then reveal</span>
            <span className="hidden group-open:inline">Hide</span>
          </span>
        </span>
      </summary>
      <div className="border-t border-brand-500/20 px-4 py-3 text-sm leading-relaxed text-slate-300 [&>p]:my-2">
        {children}
      </div>
    </details>
  );
}
