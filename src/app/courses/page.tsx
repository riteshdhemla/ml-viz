import { getAllCourses } from "@/lib/content";
import { CourseCard } from "@/components/lessons/CourseCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  const courses = getAllCourses();

  // Courses with order < 0 are prerequisite foundations; rest group by difficulty
  const foundations = courses.filter((c) => (c.order ?? 0) < 0);
  const byDifficulty = {
    beginner: courses.filter((c) => (c.order ?? 0) >= 0 && c.difficulty === "beginner"),
    intermediate: courses.filter((c) => c.difficulty === "intermediate"),
    advanced: courses.filter((c) => c.difficulty === "advanced"),
  };

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-2">All Courses</h1>
        <p className="text-slate-400 mb-12">
          Interactive visual lessons for every stage of the ML journey.
        </p>

        {/* Foundations — prerequisite math courses */}
        {foundations.length > 0 && (
          <section className="mb-14">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <span className="text-brand-400">◆</span>
                Foundations
              </h2>
              <p className="text-sm text-slate-500 mt-1 ml-7">
                Essential math before diving into ML algorithms
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {foundations.map((course) => (
                <CourseCard key={course.slug} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Courses grouped by difficulty */}
        {(["beginner", "intermediate", "advanced"] as const).map((level) => {
          const group = byDifficulty[level];
          if (group.length === 0) return null;
          return (
            <section key={level} className="mb-14">
              <h2 className="text-xl font-semibold text-white capitalize mb-6 flex items-center gap-3">
                <span
                  className={
                    level === "beginner"
                      ? "text-accent-teal"
                      : level === "intermediate"
                      ? "text-accent-yellow"
                      : "text-accent-rose"
                  }
                >
                  ●
                </span>
                {level}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.map((course) => (
                  <CourseCard key={course.slug} course={course} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
