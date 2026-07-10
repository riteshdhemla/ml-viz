import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, BarChart2, Layers } from "lucide-react";
import { getAllProjects, getProject, resolveProject } from "@/lib/projects";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProjectSpine } from "@/components/projects/ProjectSpine";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn, formatMinutes } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  const url = absoluteUrl(`/projects/${slug}`);
  const description = `${project.tagline} — ${project.builds}`;
  return {
    title: `${project.title} — Project`,
    description,
    alternates: { canonical: url },
    openGraph: { title: project.title, description, url, type: "website" },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const base = getProject(slug);
  if (!base) notFound();
  const project = resolveProject(base);

  return (
    <div className="min-h-screen bg-surface">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: `${project.title} (project)`,
          description: `${project.tagline} — ${project.builds}`,
          url: absoluteUrl(`/projects/${slug}`),
          provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          educationalLevel: project.difficulty,
          about: project.skills,
          timeRequired: `PT${Math.round(project.estimatedHours * 60)}M`,
          isAccessibleForFree: true,
        }}
      />
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/projects" className="hover:text-slate-300 transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-slate-300">{project.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className={cn("h-1 w-16 rounded-full mb-5", project.accent)} />
          <div className="flex items-center gap-3">
            <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-surface-elevated text-sm font-bold text-brand-300 tabular-nums">
              {project.number}
            </span>
            <h1 className="text-4xl font-bold text-white">{project.title}</h1>
          </div>
          <p className="mt-3 text-xl text-brand-300/90 font-medium">{project.tagline}</p>
          <p className="mt-3 text-slate-400 leading-relaxed">
            <span className="text-slate-500">You build: </span>
            {project.builds}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <BarChart2 size={14} className="text-accent-rose" />
              {project.difficulty}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {formatMinutes(project.estimatedHours * 60)}
            </span>
            <span className="flex items-center gap-1.5">
              <Layers size={14} />
              {project.stageCount} stages
            </span>
          </div>

          {project.prerequisites.length > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Recommended first:{" "}
              {project.prerequisites.map((slugp, i) => (
                <span key={slugp}>
                  {i > 0 && ", "}
                  <Link
                    href={`/courses/${slugp}`}
                    className="text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    {slugp}
                  </Link>
                </span>
              ))}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.skills.map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 text-xs rounded-full bg-surface-elevated text-slate-300 border border-surface-border"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <ProjectSpine project={project} />
      </main>
    </div>
  );
}
