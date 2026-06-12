import { getAllCourses, getLessonsForCourse, getAllWikiPages } from "./content";
import type { SearchItem } from "@/types/search";

/**
 * Builds the site-wide search index from MDX frontmatter.
 * Server-only (imports content.ts, which uses fs).
 */
export function buildSearchIndex(): SearchItem[] {
  const courses = getAllCourses();

  const courseAndLessonItems = courses.flatMap((course): SearchItem[] => [
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

  const wikiItems = getAllWikiPages().map(
    (page): SearchItem => ({
      href: `/wiki/${page.slug}`,
      title: page.title,
      description: page.description,
      courseTitle: "Concept Wiki",
      kind: "wiki",
      estimatedMinutes: page.estimatedMinutes,
    })
  );

  return [...courseAndLessonItems, ...wikiItems];
}
