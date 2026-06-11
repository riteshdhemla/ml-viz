import { getAllCourses, getLessonsForCourse } from "@/lib/content";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CoursesView } from "./CoursesView";
import { absoluteUrl } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses",
  description: "Every ML Viz course — browse by topic or follow the prerequisite-ordered learning path.",
  alternates: { canonical: absoluteUrl("/courses") },
};

/** Longest prerequisite chain above a course (0 for roots). */
function computeTiers(courses: { slug: string; prerequisites: string[] }[]): Record<string, number> {
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const tiers: Record<string, number> = {};
  const visiting = new Set<string>();
  const tierOf = (slug: string): number => {
    if (slug in tiers) return tiers[slug];
    if (visiting.has(slug)) return 0;
    visiting.add(slug);
    const course = bySlug.get(slug);
    const prereqs = (course?.prerequisites ?? []).filter((p) => bySlug.has(p));
    tiers[slug] = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(tierOf));
    visiting.delete(slug);
    return tiers[slug];
  };
  for (const c of courses) tierOf(c.slug);
  return tiers;
}

export default function CoursesPage() {
  const courses = getAllCourses();
  const tiers = computeTiers(courses);

  const pathCourses = courses
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      prerequisites: c.prerequisites,
      estimatedHours: c.estimatedHours,
      lessonCount: getLessonsForCourse(c.slug).length,
      tier: tiers[c.slug],
      order: c.order,
      coverColor: c.coverColor,
      cluster: c.cluster,
    }))
    .sort((a, b) => a.tier - b.tier || a.order - b.order);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white">Courses</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Follow the learning path for a structured journey — or browse all courses by
          difficulty and jump in wherever your background fits.
        </p>
        <CoursesView pathCourses={pathCourses} allCourses={courses} />
      </main>
    </div>
  );
}
