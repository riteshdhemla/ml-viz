import Link from "next/link";
import { Fragment } from "react";
import { getSpine } from "@/lib/spine";

interface Props {
  /** The course's spine id (`ml` | `agentic`). */
  spine?: string;
  /** The lesson's tagged stage ids. */
  stageIds?: string[];
}

/**
 * Compact one-line strip showing where a lesson sits in its project loop.
 * Renders nothing until a lesson is tagged with `spineStages`, so untagged
 * content is visually unchanged. The whole strip links to the loop's hub page.
 */
export function SpineNav({ spine, stageIds }: Props) {
  const s = getSpine(spine);
  if (!s || !stageIds?.length) return null;
  const active = new Set(stageIds);

  return (
    <Link
      href={`/wiki/${s.hubSlug}`}
      className="group not-prose mb-8 block rounded-lg border border-surface-border bg-surface-card/40 px-3 py-2 transition-colors hover:border-brand-500/40"
      title={`${s.label} — where this lesson sits`}
    >
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 group-hover:text-slate-400">
          {s.label}
        </span>
        <div className="flex items-center gap-1">
          {s.stages.map((stage, i) => {
            const isActive = active.has(stage.id);
            return (
              <Fragment key={stage.id}>
                {i > 0 && <span className="text-slate-700">·</span>}
                <span
                  className={`flex shrink-0 items-center gap-1 text-xs ${
                    isActive ? "font-medium text-white" : "text-slate-600"
                  }`}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: isActive ? stage.color : "#334155" }}
                    aria-hidden
                  />
                  {stage.label}
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
