"use client";

import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import type { SliderExercise as SliderEx } from "@/types/exercise";
import { cn } from "@/lib/utils";

interface Props {
  exercise: SliderEx;
  onAnswer: (isCorrect: boolean) => void;
  locked: boolean;
}

export function SliderExercise({ exercise, onAnswer, locked }: Props) {
  const [value, setValue] = useState(
    [(exercise.min + exercise.max) / 2]
  );
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (locked || submitted) return;
    setSubmitted(true);
    const v = value[0];
    const [lo, hi] = exercise.correctRange;
    onAnswer(v >= lo && v <= hi);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm text-slate-400">
        <span>{exercise.min}{exercise.unit}</span>
        <span className="text-white font-mono text-lg">
          {value[0].toFixed(2)}{exercise.unit}
        </span>
        <span>{exercise.max}{exercise.unit}</span>
      </div>

      <Slider.Root
        min={exercise.min}
        max={exercise.max}
        step={exercise.step}
        value={value}
        onValueChange={setValue}
        disabled={locked}
        className="relative flex items-center select-none touch-none w-full h-5 mb-6"
      >
        <Slider.Track className="bg-surface-elevated relative grow rounded-full h-1.5">
          <Slider.Range className="absolute bg-brand-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            "block w-5 h-5 bg-white rounded-full shadow-md focus:outline-none",
            "hover:scale-110 transition-transform",
            locked && "opacity-60"
          )}
        />
      </Slider.Root>

      {!locked && (
        <button
          onClick={handleSubmit}
          className="px-6 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
        >
          Submit
        </button>
      )}
    </div>
  );
}
