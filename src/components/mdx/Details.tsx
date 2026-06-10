import { ChevronRight } from "lucide-react";

interface Props {
  summary: string;
  children: React.ReactNode;
}

/**
 * Collapsible deep-dive block for lesson MDX:
 *
 *   <Details summary="Why this works (optional math)">...</Details>
 *
 * Uses the native <details> element, so it needs no client JS and stays
 * keyboard-accessible. Intended for optional tangents that would otherwise
 * bloat a lesson's reading length.
 */
export function Details({ summary, children }: Props) {
  return (
    <details className="not-prose group card-glass my-6 overflow-hidden">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-surface-elevated [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={16}
          className="shrink-0 text-brand-400 transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="border-t border-surface-border px-4 py-3 text-sm leading-relaxed text-slate-300 [&>p]:my-2">
        {children}
      </div>
    </details>
  );
}
