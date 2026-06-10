import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { LessonMeta } from "@/types/course";
import { mdxComponents } from "@/components/mdx/mdxComponents";
import { NotebookLink } from "@/components/lessons/NotebookLink";
import { getNotebookUrl } from "@/lib/utils";

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

export function LessonLayout({ meta, source, prev, next }: Props) {
  const isQuiz = meta.type === "quiz";
  const notebookUrl = isQuiz ? null : getNotebookUrl(meta.courseSlug, meta.slug, meta.notebookUrl);
  const badge = LESSON_TYPE_BADGE[meta.type];

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
          {badge && (
            <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded border ${badge.className}`}>
              {badge.label}
            </span>
          )}
          {notebookUrl && <NotebookLink href={notebookUrl} />}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <article className="prose-lesson">
          <MDXRemote
            source={source}
            components={mdxComponents}
            options={{
              // Lesson MDX must not evaluate JS expressions: exercises are
              // referenced by id (`<Exercise id="..." />`) and resolved from
              // the registry in `src/lib/exercises.ts`, never passed inline.
              // blockJS defaults to true in next-mdx-remote v6; keep it on to
              // prevent arbitrary code execution from MDX content.
              blockJS: true,
              mdxOptions: {
                remarkPlugins: [remarkMath, remarkGfm],
                rehypePlugins: [
                  rehypeKatex,
                  // detect:false → only highlight blocks with an explicit
                  // ```lang fence. Plain fences (ASCII diagrams, sample
                  // output) render as-is instead of being mis-guessed.
                  [rehypeHighlight, { detect: false, ignoreMissing: true }],
                ],
              },
            }}
          />
        </article>

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
