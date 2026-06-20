import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LessonMeta } from "@/types/course";
import { MdxContent } from "@/components/mdx/MdxContent";
import { NotebookLink } from "@/components/lessons/NotebookLink";
import { AskAiButton } from "@/components/lessons/AskAiButton";
import { LessonCompleteButton } from "@/components/lessons/LessonCompleteButton";
import { ReadingProgressBar } from "@/components/lessons/ReadingProgressBar";
import { QuizResults } from "@/components/exercises/QuizResults";
import { getNotebookUrl, getLessonUrl } from "@/lib/utils";
import { buildDeepDivePrompt, extractHeadings } from "@/lib/ai-deep-dive";

interface Props {
  meta: LessonMeta;
  source: string;
  prev: LessonMeta | null;
  next: LessonMeta | null;
  allLessons: LessonMeta[];
}

const LESSON_TYPE_BADGE: Partial<Record<LessonMeta["type"], { label: string; className: string }>> = {
  quiz: { label: "Quiz", className: "bg-brand-500/20 text-brand-300 border-brand-500/30" },
  exercise: { label: "Exercise", className: "bg-teal-500/10 text-accent-teal border-teal-500/20" },
  playground: { label: "Playground", className: "bg-orange-500/10 text-accent-orange border-orange-500/20" },
};

export function LessonLayout({ meta, source, prev, next, allLessons }: Props) {
  const isQuiz = meta.type === "quiz";
  const notebookUrl = isQuiz ? null : getNotebookUrl(meta.courseSlug, meta.slug, meta.notebookUrl);
  const badge = LESSON_TYPE_BADGE[meta.type];
  const position = allLessons.findIndex((l) => l.slug === meta.slug) + 1;
  const deepDivePrompt = buildDeepDivePrompt({
    title: meta.title,
    description: meta.description,
    url: getLessonUrl(meta.courseSlug, meta.slug),
    headings: extractHeadings(source),
    kind: "lesson",
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Lesson top bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href={`/courses/${meta.courseSlug}`}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="text-slate-400 text-sm truncate flex-1">{meta.title}</span>
          {position > 0 && (
            <span className="hidden sm:inline text-xs text-slate-600 tabular-nums shrink-0">
              {position} / {allLessons.length} · {meta.estimatedMinutes} min
            </span>
          )}
          {badge && (
            <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded border ${badge.className}`}>
              {badge.label}
            </span>
          )}
          {notebookUrl && <NotebookLink href={notebookUrl} />}
          <AskAiButton prompt={deepDivePrompt} />
        </div>
        <ReadingProgressBar />
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <article className="prose-lesson">
          <MdxContent source={source} />
        </article>

        {isQuiz && (
          <QuizResults
            exerciseIds={[...source.matchAll(/<Exercise\s+id="([^"]+)"/g)].map((m) => m[1])}
          />
        )}

        <LessonCompleteButton meta={meta} next={next} />

        {/* Prev / Next navigation */}
        <div className="mt-16 pt-8 border-t border-surface-border flex items-center justify-between gap-4">
          {prev ? (
            <Link
              href={`/courses/${meta.courseSlug}/${prev.slug}`}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ChevronLeft size={16} />
              <span>{prev.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/courses/${meta.courseSlug}/${next.slug}`}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm ml-auto"
            >
              <span>{next.title}</span>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </main>
    </div>
  );
}
