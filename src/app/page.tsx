import Link from "next/link";
import { getAllCourses } from "@/lib/content";
import { CourseCard } from "@/components/lessons/CourseCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroSection } from "@/components/layout/HeroSection";

export default function HomePage() {
  const courses = getAllCourses();
  const foundations = courses.filter((c) => (c.order ?? 0) < 0);
  const mainCourses = courses.filter((c) => (c.order ?? 0) >= 0);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <HeroSection />

        {/* Foundations strip */}
        {foundations.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span className="text-brand-400">◆</span> Foundations
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Start here — the math every ML practitioner needs
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {foundations.map((course) => (
                <CourseCard key={course.slug} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Main courses grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white">Courses</h2>
              <p className="mt-1 text-slate-400">
                Structured paths from intuition to mastery
              </p>
            </div>
            <Link
              href="/courses"
              className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
            >
              View all →
            </Link>
          </div>

          {mainCourses.length === 0 ? (
            <p className="text-slate-500 text-center py-16">
              Courses coming soon. Check back shortly.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mainCourses.map((course) => (
                <CourseCard key={course.slug} course={course} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
