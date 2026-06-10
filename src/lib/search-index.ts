import { getAllCourses, getLessonsForCourse } from "./content";
import type { SearchItem } from "@/types/search";

/**
 * Builds the site-wide search index from MDX frontmatter.
 * Server-only (imports content.ts, which uses fs).
 */
export function buildSearchIndex(): SearchItem[] {
  const courses = getAllCourses();

  return courses.flatMap((course): SearchItem[] => [
    {
      href: `/courses/${course.slug}`,
      title: course.title,
      description: course.description,
      courseTitle: course.title,
      kind: "course",
    },
    ...getLessonsForCourse(course.slug).map(
      (lesson): SearchItem => ({
        href: `/courses/${course.slug}/${lesson.slug}`,
        title: lesson.title,
        description: lesson.description,
        courseTitle: course.title,
        kind: "lesson",
        lessonType: lesson.type,
        estimatedMinutes: lesson.estimatedMinutes,
      })
    ),
  ]);
}
