"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MultipleChoiceExercise as MCExercise } from "@/types/exercise";

interface Props {
  exercise: MCExercise;
  onAnswer: (isCorrect: boolean) => void;
  locked: boolean;
}

export function MultipleChoiceExercise({ exercise, onAnswer, locked }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(optionId: string) {
    if (locked) return;
    setSelected(optionId);
    const option = exercise.options.find((o) => o.id === optionId);
    onAnswer(option?.isCorrect ?? false);
  }

  return (
    <div className="space-y-3">
      {exercise.options.map((opt) => {
        const isSelected = selected === opt.id;
        const showCorrect = locked && opt.isCorrect;
        const showWrong = locked && isSelected && !opt.isCorrect;

        return (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={locked}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
              !locked && "hover:border-brand-500/60 hover:bg-surface-elevated cursor-pointer",
              !isSelected && !showCorrect && "border-surface-border bg-surface-card text-slate-300",
              isSelected && !showWrong && !showCorrect && "border-brand-500 bg-brand-500/10 text-white",
              showCorrect && "border-accent-teal bg-accent-teal/10 text-teal-200",
              showWrong && "border-accent-rose bg-accent-rose/10 text-rose-200"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
