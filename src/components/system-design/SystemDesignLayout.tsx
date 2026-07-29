import Link from "next/link";
import { ChevronLeft, BookOpen } from "lucide-react";
import type { SystemDesignCase } from "@/types/system-design";
import { MdxContent } from "@/components/mdx/MdxContent";
import { NotebookLink } from "@/components/lessons/NotebookLink";
import { AskAiButton } from "@/components/lessons/AskAiButton";
import { ReadingProgressBar } from "@/components/lessons/ReadingProgressBar";
import { getNotebookUrl } from "@/lib/utils";
import { absoluteUrl } from "@/lib/site";
import { getSpine } from "@/lib/spine";
import { buildDeepDivePrompt, extractHeadings } from "@/lib/ai-deep-dive";
import { SpineNav } from "@/components/lessons/SpineNav";

export interface ReferencedLesson {
  href: string;
  title: string;
  courseTitle: string;
}

interface Props {
  meta: SystemDesignCase;
  source: string;
  /** Resolved from meta.relatedLessons server-side so this layout stays fs-free. */
  relatedLessons: ReferencedLesson[];
}

export function SystemDesignLayout({ meta, source, relatedLessons }: Props) {
  const trackLabel =
    getSpine(meta.spine)?.id === "agentic"
      ? "Agentic System Design"
      : "ML System Design";
  // Notebooks are optional for case studies — only surface the button when one
  // is explicitly provided via `notebookUrl`.
  const notebookUrl = meta.notebookUrl
    ? getNotebookUrl("system-design", meta.slug, meta.notebookUrl)
    : null;
  const deepDivePrompt = buildDeepDivePrompt({
    title: meta.title,
    description: meta.description,
    url: absoluteUrl(`/system-design/${meta.slug}`),
    headings: extractHeadings(source),
    kind: "wiki",
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Case-study top bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/system-design"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="text-slate-400 text-sm truncate flex-1">{meta.title}</span>
          <span className="hidden sm:inline text-xs text-slate-600 tabular-nums shrink-0">
            {meta.estimatedMinutes} min
          </span>
          <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded border bg-brand-500/20 text-brand-300 border-brand-500/30">
            {trackLabel}
          </span>
          {notebookUrl && <NotebookLink href={notebookUrl} />}
          <AskAiButton prompt={deepDivePrompt} />
        </div>
        <ReadingProgressBar />
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <SpineNav spine={meta.spine} stageIds={meta.spineStages} />
        <article className="prose-lesson">
          <MdxContent source={source} />
        </article>

        {/* Related lessons */}
        {relatedLessons.length > 0 && (
          <div className="mt-16 pt-8 border-t border-surface-border">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
              <BookOpen size={16} />
              Related lessons
            </h2>
            <ul className="mt-4 space-y-2">
              {relatedLessons.map((lesson) => (
                <li key={lesson.href}>
                  <Link
                    href={lesson.href}
                    className="text-slate-300 hover:text-white transition-colors text-sm"
                  >
                    {lesson.title}
                    <span className="text-slate-500"> — {lesson.courseTitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
