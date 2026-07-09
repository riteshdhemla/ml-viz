"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Github,
  PlayCircle,
  ExternalLink,
  CheckCircle2,
  Circle,
  ArrowRight,
  Wrench,
} from "lucide-react";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { ResolvedProject, ResolvedStage } from "@/types/project";

function Stage({
  stage,
  index,
  isLast,
  complete,
}: {
  stage: ResolvedStage;
  index: number;
  isLast: boolean;
  complete: (course: string, lesson: string) => boolean;
}) {
  const stageDone =
    stage.lessons.length > 0 && stage.lessons.every((l) => complete(l.course, l.lesson));

  return (
    <div className="relative flex gap-4 sm:gap-6">
      {/* Rail + node */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "grid place-items-center h-9 w-9 shrink-0 rounded-full border text-sm font-bold tabular-nums transition-colors",
            stageDone
              ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
              : "border-surface-border bg-surface-card text-slate-300"
          )}
        >
          {stageDone ? <CheckCircle2 size={18} /> : index + 1}
        </div>
        {!isLast && <div className="w-px flex-1 bg-surface-border my-1" />}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", isLast ? "pb-2" : "pb-10")}>
        <h3 className="text-lg font-semibold text-white">{stage.title}</h3>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">{stage.blurb}</p>

        {/* Capstone: link to another project */}
        {stage.projectLink && (
          <Link
            href={`/projects/${stage.projectLink}`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-brand-300 hover:border-brand-500/50 transition-colors"
          >
            <ArrowRight size={14} /> Go to that track
          </Link>
        )}

        {/* Concept rail — on-site lessons */}
        {stage.lessons.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Brain size={12} className="text-brand-400" /> Concept
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {stage.lessons.map((l) => {
                const done = complete(l.course, l.lesson);
                return (
                  <Link
                    key={`${l.course}/${l.lesson}`}
                    href={l.href}
                    className="group flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-200 hover:border-brand-500/50 hover:text-white transition-colors"
                  >
                    {done ? (
                      <CheckCircle2 size={14} className="shrink-0 text-accent-teal" />
                    ) : (
                      <Circle size={14} className="shrink-0 text-slate-600" />
                    )}
                    <span className="truncate">{l.title}</span>
                    {l.missing && (
                      <span className="ml-auto shrink-0 text-[10px] text-accent-rose">?</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Gap note */}
        {stage.gap && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-accent-yellow/30 bg-accent-yellow/5 px-3 py-2 text-xs text-accent-yellow">
            <Wrench size={13} className="mt-0.5 shrink-0" /> {stage.gap}
          </p>
        )}

        {/* External rails — explainer + repo */}
        {(stage.explainer || stage.repo) && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {stage.explainer && (
              <a
                href={stage.explainer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-300 hover:border-accent-orange/50 hover:text-white transition-colors"
              >
                <PlayCircle size={15} className="shrink-0 text-accent-orange" />
                <span className="truncate">{stage.explainer.name}</span>
                <ExternalLink size={12} className="shrink-0 text-slate-600" />
              </a>
            )}
            {stage.repo && (
              <a
                href={stage.repo.url}
                target="_blank"
                rel="noopener noreferrer"
                title={stage.repo.blurb}
                className="group inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-300 hover:border-brand-500/50 hover:text-white transition-colors"
              >
                <Github size={15} className="shrink-0 text-slate-400" />
                <span className="truncate">{stage.repo.name}</span>
                <ExternalLink size={12} className="shrink-0 text-slate-600" />
              </a>
            )}
          </div>
        )}
        {stage.repo?.blurb && (
          <p className="mt-1.5 text-xs text-slate-500">{stage.repo.blurb}</p>
        )}
      </div>
    </div>
  );
}

export function ProjectSpine({ project }: { project: ResolvedProject }) {
  const lessons = useProgress((s) => s.lessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const complete = (course: string, lesson: string) =>
    mounted ? Boolean(lessons[`${course}/${lesson}`]?.completed) : false;

  const total = project.lessonKeys.length;
  const done = mounted ? project.lessonKeys.filter((k) => lessons[k]?.completed).length : 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div>
      {total > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {mounted ? `${done} / ${total} concept lessons` : `${total} concept lessons`}
            </span>
            {mounted && <span className="tabular-nums text-accent-teal font-medium">{pct}%</span>}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className={cn("h-full rounded-full transition-all duration-500", pct >= 100 ? "bg-accent-teal" : "bg-brand-500")}
              style={{ width: `${mounted ? pct : 0}%` }}
            />
          </div>
        </div>
      )}

      <div>
        {project.stages.map((stage, i) => (
          <Stage
            key={stage.title}
            stage={stage}
            index={i}
            isLast={i === project.stages.length - 1}
            complete={complete}
          />
        ))}
      </div>
    </div>
  );
}
