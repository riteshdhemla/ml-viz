import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LearningPath, type PathCourse } from "@/components/layout/LearningPath";
import { getAllCourses, getLessonsForCourse } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Learning Path",
  description: "Every ML Viz course ordered by prerequisites — see where you are and what unlocks next.",
  alternates: { canonical: absoluteUrl("/path") },
};

/** Tier = longest prerequisite chain above the course (0 for foundations). */
function computeTiers(courses: { slug: string; prerequisites: string[] }[]): Record<string, number> {
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const tiers: Record<string, number> = {};
  const visiting = new Set<string>();
  const tierOf = (slug: string): number => {
    if (slug in tiers) return tiers[slug];
    if (visiting.has(slug)) return 0; // defensive: cycle in frontmatter
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

export default function PathPage() {
  const courses = getAllCourses();
  const tiers = computeTiers(courses);

  const pathCourses: PathCourse[] = courses
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
    }))
    .sort((a, b) => a.tier - b.tier || a.order - b.order);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-white">Learning path</h1>
        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          Courses ordered by prerequisites: everything in a tier only assumes material from the
          tiers above it. Start at the top, or jump in wherever your background ends.
        </p>
        <LearningPath courses={pathCourses} />
      </main>
    </div>
  );
}
