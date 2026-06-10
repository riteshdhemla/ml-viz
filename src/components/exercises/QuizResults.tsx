"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";

interface Props {
  /** Ids of the exercises that make up this quiz page. */
  exerciseIds: string[];
}

/**
 * Score card shown on quiz lessons once every exercise on the page has been
 * answered. Reads results from the quiz store; retry clears them all (each
 * Exercise resets via the store epoch).
 */
export function QuizResults({ exerciseIds }: Props) {
  const results = useQuizStore((s) => s.results);
  const resetAll = useQuizStore((s) => s.resetAll);

  // hydration guard: zustand state is client-only
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || exerciseIds.length === 0) return null;

  const answered = exerciseIds.filter((id) => results[id] !== undefined);
  if (answered.length < exerciseIds.length) {
    return (
      <p className="not-prose text-center text-xs text-slate-500 mt-10">
        {answered.length} / {exerciseIds.length} questions answered
      </p>
    );
  }

  const correct = exerciseIds.filter((id) => results[id] === "correct").length;
  const total = exerciseIds.length;
  const fraction = correct / total;
  const tone =
    fraction === 1
      ? { color: "text-accent-teal", border: "border-teal-500/30", bg: "bg-accent-teal/10", message: "Perfect score — you've mastered this course's core ideas." }
      : fraction >= 0.6
        ? { color: "text-accent-yellow", border: "border-yellow-500/30", bg: "bg-accent-yellow/10", message: "Solid. Skim the explanations you missed, then move on." }
        : { color: "text-accent-rose", border: "border-rose-500/30", bg: "bg-accent-rose/10", message: "Worth a revisit — re-read the lessons and try again." };

  return (
    <div className={`not-prose card-glass mt-10 p-6 text-center border ${tone.border} ${tone.bg}`}>
      <Trophy className={`mx-auto mb-2 ${tone.color}`} size={28} />
      <p className={`text-3xl font-bold ${tone.color}`}>
        {correct} / {total}
      </p>
      <p className="mt-2 text-sm text-slate-300">{tone.message}</p>
      <button
        onClick={resetAll}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-elevated px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-surface-border"
      >
        <RotateCcw size={14} />
        Retry quiz
      </button>
    </div>
  );
}
