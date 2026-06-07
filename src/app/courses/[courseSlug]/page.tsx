import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourse, getAllCourses } from "@/lib/content";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LessonList } from "@/components/lessons/LessonList";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ courseSlug: string }>;
}

export async function generateStaticParams() {
  return getAllCourses().map((c) => ({ courseSlug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = getCourse(courseSlug);
  if (!course) return {};
  return { title: course.title, description: course.description };
}

export default async function CoursePage({ params }: Props) {
  const { courseSlug } = await params;
  const course = getCourse(courseSlug);
  if (!course) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/courses" className="hover:text-slate-300 transition-colors">
            Courses
          </Link>
          <span>/</span>
          <span className="text-slate-300">{course.title}</span>
        </nav>

        {/* Course header */}
        <div className="mb-10">
          <span className="inline-block text-xs font-medium uppercase tracking-wider text-brand-400 mb-3">
            {course.difficulty}
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">{course.title}</h1>
          <p className="text-xl text-slate-400 leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap gap-2 mt-6">
            {course.topics.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1 text-xs rounded-full bg-surface-elevated text-slate-300 border border-surface-border"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Lessons */}
        <LessonList courseSlug={courseSlug} lessons={course.lessons} />
      </main>
    </div>
  );
}
