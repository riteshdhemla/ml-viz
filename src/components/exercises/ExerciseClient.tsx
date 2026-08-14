"use client";

import { useState } from "react";
import type { Exercise as ExerciseData } from "@/types/exercise";
import { useQuizStore } from "@/lib/quiz-store";
import { MultipleChoiceExercise } from "./MultipleChoiceExercise";
import { SliderExercise } from "./SliderExercise";

interface Props {
  /**
   * The resolved exercise, passed in from the server component that looked it
   * up. Taking the data rather than the id is what keeps `src/lib/exercises.ts`
   * (771 exercises, ~800 KB) out of the client bundle: only the handful of
   * exercises a page actually renders cross the boundary.
   */
  exercise: ExerciseData;
  onComplete?: (result: "correct" | "incorrect") => void;
}

export function ExerciseClient({ exercise, onComplete }: Props) {
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const record = useQuizStore((s) => s.record);
  const epoch = useQuizStore((s) => s.epoch);

  // Reset local answer state when the quiz store epoch bumps (retry).
  const [seenEpoch, setSeenEpoch] = useState(epoch);
  if (epoch !== seenEpoch) {
    setSeenEpoch(epoch);
    setResult(null);
    setShowExplanation(false);
  }

  function handleAnswer(isCorrect: boolean) {
    const r = isCorrect ? "correct" : "incorrect";
    setResult(r);
    setShowExplanation(true);
    record(exercise.id, r);
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
          key={epoch}
          exercise={exercise}
          onAnswer={handleAnswer}
          locked={result !== null}
        />
      )}
      {exercise.type === "slider" && (
        <SliderExercise
          key={epoch}
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
