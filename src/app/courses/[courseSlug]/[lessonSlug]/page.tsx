import { notFound } from "next/navigation";
import { getLessonContent, getAllCourses, getLessonsForCourse } from "@/lib/content";
import { LessonLayout } from "@/components/lessons/LessonLayout";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}

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
  return { title: result.meta.title };
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
    <LessonLayout
      meta={result.meta}
      source={result.source}
      prev={prev}
      next={next}
      allLessons={allLessons}
    />
  );
}
