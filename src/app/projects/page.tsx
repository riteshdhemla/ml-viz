import { Brain, Github, PlayCircle } from "lucide-react";
import { getResolvedProjects } from "@/lib/projects";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { absoluteUrl } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Six end-to-end builds that connect the courses into shippable systems — each stage links a concept lesson, a from-scratch explainer, and the open-source repo that implements it.",
  alternates: { canonical: absoluteUrl("/projects") },
};

export default function ProjectsPage() {
  const projects = getResolvedProjects();

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white">Projects</h1>
        <p className="mt-3 text-slate-400 max-w-2xl leading-relaxed">
          The courses teach concepts one at a time. Projects put them together.
          Each project is an <span className="text-white">end-to-end build</span> —
          a spine that threads lessons from several courses into one shippable
          system, stage by stage.
        </p>

        {/* Three-rail legend */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <Brain size={15} className="text-brand-400" /> Concept — on-site lessons
          </span>
          <span className="inline-flex items-center gap-2">
            <PlayCircle size={15} className="text-accent-orange" /> Explainer — built from scratch
          </span>
          <span className="inline-flex items-center gap-2">
            <Github size={15} className="text-slate-400" /> Implementation — open-source repo
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </main>
    </div>
  );
}
