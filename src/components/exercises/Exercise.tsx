"use client";

import { useState } from "react";
import { getExercise } from "@/lib/exercises";
import { MultipleChoiceExercise } from "./MultipleChoiceExercise";
import { SliderExercise } from "./SliderExercise";

interface Props {
  /** Id of an exercise defined in the registry (`src/lib/exercises.ts`). */
  id: string;
  onComplete?: (result: "correct" | "incorrect") => void;
}

export function Exercise({ id, onComplete }: Props) {
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const exercise = getExercise(id);
  if (!exercise) {
    return (
      <div className="not-prose card-glass p-6 my-8 border-accent-rose/40 text-rose-300 text-sm">
        Unknown exercise id: <code>{id}</code>. Add it to{" "}
        <code>src/lib/exercises.ts</code>.
      </div>
    );
  }

  function handleAnswer(isCorrect: boolean) {
    const r = isCorrect ? "correct" : "incorrect";
    setResult(r);
    setShowExplanation(true);
    onComplete?.(r);
  }

  return (
    <div className="not-prose card-glass p-6 my-8">
      <p className="text-xs uppercase tracking-wider text-brand-400 font-semibold mb-4">
        Exercise
      </p>
      <p className="text-white font-medium mb-6 text-lg leading-relaxed">
        {exercise.question}
      </p>

      {exercise.type === "multiple-choice" && (
        <MultipleChoiceExercise
          exercise={exercise}
          onAnswer={handleAnswer}
          locked={result !== null}
        />
      )}
      {exercise.type === "slider" && (
        <SliderExercise
          exercise={exercise}
          onAnswer={handleAnswer}
          locked={result !== null}
        />
      )}

      {showExplanation && (
        <div
          className={`mt-6 p-4 rounded-xl text-sm leading-relaxed ${
            result === "correct"
              ? "bg-accent-teal/10 border border-accent-teal/30 text-teal-200"
              : "bg-accent-rose/10 border border-accent-rose/30 text-rose-200"
          }`}
        >
          <p className="font-semibold mb-1">{result === "correct" ? "Correct!" : "Not quite."}</p>
          <p className="opacity-90">{exercise.explanation}</p>
        </div>
      )}

      {exercise.hint && result === null && (
        <details className="mt-4">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
            Need a hint?
          </summary>
          <p className="mt-2 text-sm text-slate-400">{exercise.hint}</p>
        </details>
      )}
    </div>
  );
}
