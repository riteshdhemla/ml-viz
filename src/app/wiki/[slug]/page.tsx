import { notFound } from "next/navigation";
import {
  getWikiContent,
  getAllWikiPages,
  getAllCourses,
  getLessonsForCourse,
} from "@/lib/content";
import { WikiLayout, type ReferencedLesson } from "@/components/wiki/WikiLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

// Only render wiki pages known at build time — content is fully static.
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllWikiPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getWikiContent(slug);
  if (!result) return {};
  const url = absoluteUrl(`/wiki/${slug}`);
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
function resolveReferencedBy(relatedLessons: string[]): ReferencedLesson[] {
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

export default async function WikiPage({ params }: Props) {
  const { slug } = await params;
  const result = await getWikiContent(slug);
  if (!result) notFound();

  const referencedBy = resolveReferencedBy(result.meta.relatedLessons ?? []);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: result.meta.title,
          description: result.meta.description,
          url: absoluteUrl(`/wiki/${slug}`),
          timeRequired: `PT${result.meta.estimatedMinutes}M`,
          isAccessibleForFree: true,
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        }}
      />
      <WikiLayout meta={result.meta} source={result.source} referencedBy={referencedBy} />
    </>
  );
}
