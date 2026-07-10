"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, BarChart2, Layers, CheckCircle2 } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { cn, formatMinutes } from "@/lib/utils";
import type { ResolvedProject } from "@/types/project";

const DIFFICULTY_COLORS = {
  beginner: "text-accent-teal",
  intermediate: "text-accent-yellow",
  advanced: "text-accent-rose",
};

export function ProjectCard({ project }: { project: ResolvedProject }) {
  const lessons = useProgress((s) => s.lessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const total = project.lessonKeys.length;
  const done = mounted
    ? project.lessonKeys.filter((k) => lessons[k]?.completed).length
    : 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group card-glass p-6 hover:border-brand-500/50 transition-all duration-200 hover:-translate-y-0.5 block relative overflow-hidden"
    >
      <div className={cn("h-1 w-12 rounded-full mb-5", project.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-surface-elevated text-xs font-bold text-brand-300 tabular-nums">
            {project.number}
          </span>
          <h3 className="text-lg font-semibold text-white group-hover:text-brand-300 transition-colors">
            {project.title}
          </h3>
        </div>
        {mounted && total > 0 && pct >= 100 && (
          <CheckCircle2 size={18} className="shrink-0 text-accent-teal" />
        )}
      </div>

      <p className="mt-2 text-sm text-brand-300/90 font-medium">{project.tagline}</p>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-2">
        <span className="text-slate-500">You build: </span>
        {project.builds}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 text-[11px] rounded-full bg-surface-elevated text-slate-300 border border-surface-border"
          >
            {s}
          </span>
        ))}
        {project.skills.length > 4 && (
          <span className="px-2 py-0.5 text-[11px] text-slate-500">
            +{project.skills.length - 4}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-4 text-xs text-slate-500">
        <span className={cn("flex items-center gap-1", DIFFICULTY_COLORS[project.difficulty])}>
          <BarChart2 size={12} />
          {project.difficulty}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatMinutes(project.estimatedHours * 60)}
        </span>
        <span className="flex items-center gap-1">
          <Layers size={12} />
          {project.stageCount} stages
        </span>
        {mounted && total > 0 && pct > 0 && (
          <span className="ml-auto text-accent-teal font-medium tabular-nums">{pct}%</span>
        )}
      </div>

      {mounted && total > 0 && pct > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-border">
          <div
            className="h-full bg-accent-teal transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Link>
  );
}
