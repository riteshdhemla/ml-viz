import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourse, getAllCourses } from "@/lib/content";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LessonList } from "@/components/lessons/LessonList";
import { CourseProgressBar } from "@/components/lessons/CourseProgressBar";
import { CourseSpineStrip } from "@/components/lessons/CourseSpineStrip";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ courseSlug: string }>;
}

// Only render courses known at build time; unknown slugs 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllCourses().map((c) => ({ courseSlug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = getCourse(courseSlug);
  if (!course) return {};
  const url = absoluteUrl(`/courses/${courseSlug}`);
  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: url },
    openGraph: {
      title: course.title,
      description: course.description,
      url,
      type: "website",
    },
  };
}

export default async function CoursePage({ params }: Props) {
  const { courseSlug } = await params;
  const course = getCourse(courseSlug);
  if (!course) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.description,
          url: absoluteUrl(`/courses/${courseSlug}`),
          provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          educationalLevel: course.difficulty,
          about: course.topics,
          timeRequired: `PT${Math.round(course.estimatedHours * 60)}M`,
          isAccessibleForFree: true,
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: `PT${Math.round(course.estimatedHours * 60)}M`,
          },
        }}
      />
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

          <CourseSpineStrip spine={course.spine} lessons={course.lessons} />

          <CourseProgressBar courseSlug={courseSlug} totalLessons={course.lessons.length} />
        </div>

        {/* Lessons */}
        <LessonList courseSlug={courseSlug} lessons={course.lessons} />
      </main>
    </div>
  );
}
