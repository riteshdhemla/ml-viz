import Link from "next/link";
import { getAllCourses } from "@/lib/content";
import { CourseCard } from "@/components/lessons/CourseCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroSection } from "@/components/layout/HeroSection";

export default function HomePage() {
  const courses = getAllCourses();

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <HeroSection />

        {/* Courses grid */}
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

          {courses.length === 0 ? (
            <p className="text-slate-500 text-center py-16">
              Courses coming soon. Check back shortly.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.slug} course={course} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
