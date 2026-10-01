import { Fragment } from "react";
import { getFramework } from "@/lib/system-design-frameworks";

interface Props {
  /** The case's resolved track (`track ?? spine`). */
  track?: string;
  /** Pull up under a `SpineNav` strip so the two read as one header block. */
  tight?: boolean;
}

/**
 * One-line strip naming the interview framework a case follows (7-step ML,
 * SCALED, or RESHADED) and its steps in order, so the reader knows the shape
 * of the walkthrough before reading it. Sits under `SpineNav`: the spine says
 * which loop the system lives on; this says how the interview answer is built.
 */
export function FrameworkStrip({ track, tight = false }: Props) {
  const fw = getFramework(track);
  if (!fw) return null;

  return (
    <div
      className={`not-prose ${tight ? "-mt-6" : ""} mb-8 rounded-lg border border-surface-border bg-surface-card/40 px-3 py-2`}
      title={`Structured with the ${fw.name} framework (${fw.source})`}
    >
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {fw.name}
        </span>
        <div className="flex items-center gap-1">
          {fw.steps.map((step, i) => (
            <Fragment key={step.heading}>
              {i > 0 && <span className="text-slate-700">·</span>}
              <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400" title={step.summary}>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-brand-500/20 px-1 text-[10px] font-semibold text-brand-300">
                  {step.badge}
                </span>
                {step.label}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
