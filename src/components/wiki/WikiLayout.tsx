import Link from "next/link";
import { ChevronLeft, BookOpen } from "lucide-react";
import type { WikiPageMeta } from "@/types/wiki";
import { MdxContent } from "@/components/mdx/MdxContent";
import { NotebookLink } from "@/components/lessons/NotebookLink";
import { AskAiButton } from "@/components/lessons/AskAiButton";
import { ReadingProgressBar } from "@/components/lessons/ReadingProgressBar";
import { getNotebookUrl } from "@/lib/utils";
import { absoluteUrl } from "@/lib/site";
import { buildDeepDivePrompt, extractHeadings } from "@/lib/ai-deep-dive";

export interface ReferencedLesson {
  href: string;
  title: string;
  courseTitle: string;
}

interface Props {
  meta: WikiPageMeta;
  source: string;
  /** Resolved from meta.relatedLessons server-side so this layout stays fs-free. */
  referencedBy: ReferencedLesson[];
}

export function WikiLayout({ meta, source, referencedBy }: Props) {
  const notebookUrl = getNotebookUrl("wiki", meta.slug, meta.notebookUrl);
  const deepDivePrompt = buildDeepDivePrompt({
    title: meta.title,
    description: meta.description,
    url: absoluteUrl(`/wiki/${meta.slug}`),
    headings: extractHeadings(source),
    kind: "wiki",
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Wiki top bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/wiki"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="text-slate-400 text-sm truncate flex-1">{meta.title}</span>
          <span className="hidden sm:inline text-xs text-slate-600 tabular-nums shrink-0">
            {meta.estimatedMinutes} min
          </span>
          {meta.advanced && (
            <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded border bg-accent-rose/15 text-accent-rose border-accent-rose/30">
              Advanced
            </span>
          )}
          <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded border bg-brand-500/20 text-brand-300 border-brand-500/30">
            Wiki
          </span>
          <NotebookLink href={notebookUrl} />
          <AskAiButton prompt={deepDivePrompt} />
        </div>
        <ReadingProgressBar />
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <article className="prose-lesson">
          <MdxContent source={source} />
        </article>

        {/* Referenced by */}
        {referencedBy.length > 0 && (
          <div className="mt-16 pt-8 border-t border-surface-border">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
              <BookOpen size={16} />
              Referenced by
            </h2>
            <ul className="mt-4 space-y-2">
              {referencedBy.map((lesson) => (
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
