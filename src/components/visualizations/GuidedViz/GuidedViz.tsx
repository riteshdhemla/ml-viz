"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VizFrame } from "../viz-kit";
import { cn } from "@/lib/utils";

/**
 * The guided-walkthrough shell: the second teaching format in the kit.
 *
 * A standard viz answers *"what does this concept look like?"* and hands the
 * reader a bag of sliders. `<AlgorithmTrace>` answers *"what does this code do,
 * line by line?"*. `<GuidedViz>` answers the third question — *"what are the
 * stages of this pipeline, and why does each one exist?"* — by turning the viz
 * into a narrated walkthrough:
 *
 *   - a **stepper** across the top, steps grouped into named phases, so the
 *     reader can see the whole shape of the pipeline before walking it;
 *   - an **explain panel** that changes with the step: a phase pill, a headline,
 *     two short paragraphs, and a **hint** telling the reader exactly what to do
 *     or notice in the picture right now;
 *   - a **stage** the step controls, and an optional **panel** of cards beneath
 *     it that accumulate the state the pipeline has produced so far.
 *
 * Reach for it when a concept is a *sequence of stages that build on each other*
 * and a single static picture would have to show all of them at once. Don't
 * force it onto parameter explorers — a viz whose whole point is "drag this and
 * watch that move" is better served by plain `VizSlider` controls.
 *
 * The caller owns the drawing; this component owns the narrative. Stage and
 * panel are render props receiving the active step index, so a viz stays a
 * single self-contained file.
 */

export type GuidedTone = "brand" | "teal" | "yellow" | "rose" | "orange";

const TONE: Record<GuidedTone, { pill: string; num: string; hint: string; rule: string }> = {
  brand: {
    pill: "border-brand-500/35 bg-brand-500/10 text-brand-300",
    num: "text-brand-400",
    hint: "border-brand-500/25 bg-brand-500/[0.07] text-brand-200",
    rule: "bg-brand-500",
  },
  teal: {
    pill: "border-accent-teal/35 bg-accent-teal/10 text-accent-teal",
    num: "text-accent-teal",
    hint: "border-accent-teal/25 bg-accent-teal/[0.07] text-accent-teal",
    rule: "bg-accent-teal",
  },
  yellow: {
    pill: "border-accent-yellow/35 bg-accent-yellow/10 text-accent-yellow",
    num: "text-accent-yellow",
    hint: "border-accent-yellow/25 bg-accent-yellow/[0.07] text-accent-yellow",
    rule: "bg-accent-yellow",
  },
  rose: {
    pill: "border-accent-rose/35 bg-accent-rose/10 text-accent-rose",
    num: "text-accent-rose",
    hint: "border-accent-rose/25 bg-accent-rose/[0.07] text-accent-rose",
    rule: "bg-accent-rose",
  },
  orange: {
    pill: "border-accent-orange/35 bg-accent-orange/10 text-accent-orange",
    num: "text-accent-orange",
    hint: "border-accent-orange/25 bg-accent-orange/[0.07] text-accent-orange",
    rule: "bg-accent-orange",
  },
};

export interface GuidedPhase {
  id: string;
  /** Pill text in the explain panel, e.g. "Indexing · offline". */
  label: string;
  /** Colour family for the pill, hint and step numbers. Defaults to brand. */
  tone?: GuidedTone;
  /**
   * Prefix on the step number in the tab strip. Steps are numbered from 1
   * *within* their phase, so `numberPrefix: "Q"` yields Q1, Q2 …
   */
  numberPrefix?: string;
}

export interface GuidedStep {
  /** Short label for the tab strip — two or three words. */
  label: string;
  /** Id of the phase this step belongs to. */
  phase: string;
  /** Headline in the explain panel. */
  title: string;
  /** The teaching prose. One or two short paragraphs. */
  body: React.ReactNode;
  /**
   * One line telling the reader what to *do* or what to *notice* right now.
   * This is what turns a diagram into a walkthrough — skip it only when the
   * step's picture is entirely self-evident.
   */
  hint?: string;
}

interface GuidedVizProps {
  title: string;
  caption?: string;
  className?: string;
  phases: GuidedPhase[];
  steps: GuidedStep[];
  /**
   * Controls that apply to *every* step — a mode toggle, a size slider. Keep
   * step-specific interaction inside the stage itself; anything up here should
   * still make sense whichever step the reader is on.
   */
  controls?: React.ReactNode;
  /** The picture for step `i`. */
  stage: (i: number) => React.ReactNode;
  /** Right-hand side of the stage header — e.g. the query being answered. */
  stageNote?: (i: number) => React.ReactNode;
  /** Cards beneath the stage — the state the pipeline has produced so far. */
  panel?: (i: number) => React.ReactNode;
  /** Legend chips under the whole thing. */
  legend?: (i: number) => React.ReactNode;
  /** Fired on every step change, so callers can reset per-step interaction state. */
  onStepChange?: (i: number) => void;
}

/** Number each step within its phase: 01, 02 … then Q1, Q2 … */
function numberSteps(steps: GuidedStep[], phases: GuidedPhase[]): string[] {
  const seen: Record<string, number> = {};
  return steps.map((s) => {
    const n = (seen[s.phase] = (seen[s.phase] ?? 0) + 1);
    const prefix = phases.find((p) => p.id === s.phase)?.numberPrefix ?? "";
    return prefix ? `${prefix}${n}` : String(n).padStart(2, "0");
  });
}

export function GuidedViz({
  title,
  caption,
  className,
  phases,
  steps,
  controls,
  stage,
  stageNote,
  panel,
  legend,
  onStepChange,
}: GuidedVizProps) {
  const [i, setI] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, next));
      setI(clamped);
      onStepChange?.(clamped);
    },
    [steps.length, onStepChange],
  );

  // Arrow keys are scoped to the tab strip rather than the document: a lesson
  // page renders several viz, and a document listener would move all of them.
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(steps.length - 1, i + delta));
    go(next);
    tabsRef.current[next]?.focus();
  };

  const step = steps[i];
  const phase = phases.find((p) => p.id === step.phase) ?? phases[0];
  const tone = TONE[phase?.tone ?? "brand"];
  const numbers = numberSteps(steps, phases);

  return (
    <VizFrame title={title} caption={caption} className={className}>
      {/* stepper — the whole pipeline, visible before you walk it */}
      <div
        role="tablist"
        aria-label={`${title} — pipeline stages`}
        onKeyDown={onTabKeyDown}
        className="flex flex-wrap gap-1 border-y border-surface-border py-2"
      >
        {steps.map((s, k) => {
          const on = k === i;
          const stepTone = TONE[phases.find((p) => p.id === s.phase)?.tone ?? "brand"];
          return (
            <button
              key={s.label + k}
              ref={(el) => {
                tabsRef.current[k] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => go(k)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-colors",
                on
                  ? "border-surface-border bg-surface-elevated text-white"
                  : "border-transparent text-slate-500 hover:bg-surface-elevated/50 hover:text-slate-300",
              )}
            >
              <span className={cn("font-semibold", on ? stepTone.num : "text-slate-600")}>
                {numbers[k]}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* explain panel */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
              tone.pill,
            )}
          >
            {phase?.label}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            step {i + 1} of {steps.length}
          </span>
        </div>

        <h5 className="mt-2.5 text-base font-semibold text-white">{step.title}</h5>
        <div className="mt-1.5 max-w-[68ch] space-y-2 text-sm leading-relaxed text-slate-400 [&_code]:rounded [&_code]:bg-surface-elevated [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-brand-300 [&_strong]:font-semibold [&_strong]:text-slate-200">
          {step.body}
        </div>

        {step.hint && (
          <p
            className={cn(
              "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-[11.5px] leading-relaxed",
              tone.hint,
            )}
          >
            <span aria-hidden>▸</span>
            {step.hint}
          </p>
        )}
      </div>

      {controls && <div className="mt-4 flex flex-wrap gap-2">{controls}</div>}

      {/* stage */}
      <div className="mt-4 overflow-hidden rounded-xl border border-surface-border bg-surface/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            {step.label}
          </span>
          {stageNote && <span className="font-mono text-[11px] text-slate-400">{stageNote(i)}</span>}
        </div>
        <div className="relative">{stage(i)}</div>
        {panel && <div className="border-t border-surface-border px-3 py-3">{panel(i)}</div>}
      </div>

      {legend && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">{legend(i)}</div>}

      {/* transport */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={i === 0}
          className="flex-1 rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 font-mono text-xs text-slate-200 transition-colors hover:border-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-surface-border disabled:hover:text-slate-200"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => go(i + 1)}
          disabled={i === steps.length - 1}
          className="flex-1 rounded-lg bg-brand-500 px-3 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-brand-500"
        >
          Next →
        </button>
      </div>
    </VizFrame>
  );
}

/* ------------------------------------------------------------- side panels */

/**
 * A card in the panel under the stage — one unit of state the pipeline has
 * produced (a community summary, a partial answer, an assembled context).
 */
export function GuidedCard({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-w-[9.5rem] flex-1 rounded-lg border border-l-[3px] border-surface-border bg-surface-elevated/70 px-3 py-2.5"
      style={{ borderLeftColor: accent }}
    >
      <h6 className="font-mono text-[11.5px] font-semibold" style={{ color: accent }}>
        {label}
      </h6>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

/** The highlighted "and here is what it bought you" card. Use it sparingly. */
export function GuidedPayoff({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 rounded-lg border border-brand-500/30 bg-gradient-to-b from-brand-500/[0.12] to-brand-500/[0.03] px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-300">
        {label}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-200">{children}</p>
    </div>
  );
}

/** Placeholder text for a panel that has nothing in it yet at this step. */
export function GuidedEmpty({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11.5px] text-slate-600">{children}</p>;
}

/** Legend chip — a colour swatch and what it means. */
export function GuidedLegend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {children}
    </span>
  );
}

/**
 * Reveals `n` items one at a time, so a map-reduce or a fan-out reads as a
 * sequence rather than appearing all at once. Jumps straight to the end when
 * the reader has asked for reduced motion, and resets whenever `key` changes.
 */
export function useStagger(n: number, ms: number, key: unknown): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || n === 0) {
      setShown(n);
      return;
    }
    setShown(0);
    let k = 0;
    const t = setInterval(() => {
      k += 1;
      setShown(k);
      if (k >= n) clearInterval(t);
    }, ms);
    return () => clearInterval(t);
  }, [n, ms, key]);

  return shown;
}
