import type { MetadataRoute } from "next";
import {
  getAllCourses,
  getLessonsForCourse,
  getAllWikiPages,
  getAllSystemDesignCases,
} from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

// Required for the static-export (GitHub Pages) build; a no-op on Vercel.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const courses = getAllCourses();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/courses"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/path"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/wiki"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/system-design"), changeFrequency: "weekly", priority: 0.6 },
  ];

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

  const systemDesignPages: MetadataRoute.Sitemap = getAllSystemDesignCases().map(
    (c) => ({
      url: absoluteUrl(`/system-design/${c.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })
  );

  return [
    ...staticPages,
    ...coursePages,
    ...lessonPages,
    ...wikiPages,
    ...systemDesignPages,
  ];
}
