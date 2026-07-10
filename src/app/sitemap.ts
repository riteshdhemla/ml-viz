import type { MetadataRoute } from "next";
import { getAllCourses, getLessonsForCourse, getAllWikiPages } from "@/lib/content";
import { getAllProjects } from "@/lib/projects";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const courses = getAllCourses();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/courses"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/projects"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/path"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/wiki"), changeFrequency: "weekly", priority: 0.6 },
  ];

  const projectPages: MetadataRoute.Sitemap = getAllProjects().map((project) => ({
    url: absoluteUrl(`/projects/${project.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
    url: absoluteUrl(`/courses/${course.slug}`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const lessonPages: MetadataRoute.Sitemap = courses.flatMap((course) =>
    getLessonsForCourse(course.slug).map((lesson) => ({
      url: absoluteUrl(`/courses/${course.slug}/${lesson.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
  );

  const wikiPages: MetadataRoute.Sitemap = getAllWikiPages().map((page) => ({
    url: absoluteUrl(`/wiki/${page.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...projectPages, ...coursePages, ...lessonPages, ...wikiPages];
}
