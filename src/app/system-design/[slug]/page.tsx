import { notFound } from "next/navigation";
import {
  getSystemDesignCase,
  getAllSystemDesignCases,
  getAllCourses,
  getLessonsForCourse,
} from "@/lib/content";
import {
  SystemDesignLayout,
  type ReferencedLesson,
} from "@/components/system-design/SystemDesignLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

// Only render cases known at build time — content is fully static.
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllSystemDesignCases().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getSystemDesignCase(slug);
  if (!result) return {};
  const url = absoluteUrl(`/system-design/${slug}`);
  return {
    title: result.meta.title,
    description: result.meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: result.meta.title,
      description: result.meta.description,
      url,
      type: "article",
    },
  };
}

/** Resolve "courseSlug/lessonSlug" entries to lesson titles + course titles. */
function resolveRelatedLessons(relatedLessons: string[]): ReferencedLesson[] {
  const courses = getAllCourses();
  return relatedLessons.flatMap((ref) => {
    const [courseSlug, lessonSlug] = ref.split("/");
    const course = courses.find((c) => c.slug === courseSlug);
    if (!course) return [];
    const lesson = getLessonsForCourse(courseSlug).find((l) => l.slug === lessonSlug);
    if (!lesson) return [];
    return [
      {
        href: `/courses/${courseSlug}/${lessonSlug}`,
        title: lesson.title,
        courseTitle: course.title,
      },
    ];
  });
}

export default async function SystemDesignPage({ params }: Props) {
  const { slug } = await params;
  const result = await getSystemDesignCase(slug);
  if (!result) notFound();

  const relatedLessons = resolveRelatedLessons(result.meta.relatedLessons ?? []);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: result.meta.title,
          description: result.meta.description,
          url: absoluteUrl(`/system-design/${slug}`),
          timeRequired: `PT${result.meta.estimatedMinutes}M`,
          isAccessibleForFree: true,
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        }}
      />
      <SystemDesignLayout
        meta={result.meta}
        source={result.source}
        relatedLessons={relatedLessons}
      />
    </>
  );
}
