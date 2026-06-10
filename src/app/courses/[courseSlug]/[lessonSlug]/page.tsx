import { notFound } from "next/navigation";
import { getLessonContent, getAllCourses, getLessonsForCourse } from "@/lib/content";
import { LessonLayout } from "@/components/lessons/LessonLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}

// Only render lessons known at build time. Unknown slugs 404 instead of
// reaching the filesystem on demand — content is fully static.
export const dynamicParams = false;

export async function generateStaticParams() {
  const courses = getAllCourses();
  return courses.flatMap((course) =>
    getLessonsForCourse(course.slug).map((lesson) => ({
      courseSlug: course.slug,
      lessonSlug: lesson.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  const result = await getLessonContent(courseSlug, lessonSlug);
  if (!result) return {};
  const url = absoluteUrl(`/courses/${courseSlug}/${lessonSlug}`);
  return {
    title: result.meta.title,
    description: result.meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: result.meta.title,
      description: result.meta.description,
      url,
      type: "article",
    },
  };
}

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;
  const result = await getLessonContent(courseSlug, lessonSlug);
  if (!result) notFound();

  const allLessons = getLessonsForCourse(courseSlug);
  const currentIndex = allLessons.findIndex((l) => l.slug === lessonSlug);
  const prev = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const next = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: result.meta.title,
          description: result.meta.description,
          url: absoluteUrl(`/courses/${courseSlug}/${lessonSlug}`),
          learningResourceType: result.meta.type,
          timeRequired: `PT${result.meta.estimatedMinutes}M`,
          isAccessibleForFree: true,
          provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          isPartOf: {
            "@type": "Course",
            url: absoluteUrl(`/courses/${courseSlug}`),
          },
        }}
      />
      <LessonLayout
        meta={result.meta}
        source={result.source}
        prev={prev}
        next={next}
        allLessons={allLessons}
      />
    </>
  );
}
