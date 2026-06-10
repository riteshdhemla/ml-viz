import { getAllCourses, getLessonsForCourse } from "@/lib/content";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProgressDashboard } from "@/components/layout/ProgressDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your Progress" };

export interface CourseInfo {
  slug: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  prerequisites: string[];
  lessonCount: number;
}

export default function ProgressPage() {
  const courses = getAllCourses();
  const courseInfos: CourseInfo[] = courses.map((c) => ({
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty,
    order: c.order,
    prerequisites: c.prerequisites,
    lessonCount: getLessonsForCourse(c.slug).length,
  }));

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ProgressDashboard courses={courseInfos} />
      </main>
    </div>
  );
}
