import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { LessonMeta } from "@/types/course";
import { mdxComponents } from "@/components/mdx/mdxComponents";

interface Props {
  meta: LessonMeta;
  source: string;
  prev: LessonMeta | null;
  next: LessonMeta | null;
  allLessons: LessonMeta[];
}

export function LessonLayout({ meta, source, prev, next }: Props) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href={`/courses/${meta.courseSlug}`}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="text-slate-400 text-sm truncate">{meta.title}</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <article className="prose-lesson">
          {/* @ts-expect-error — RSC async component */}
          <MDXRemote source={source} components={mdxComponents} />
        </article>

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
