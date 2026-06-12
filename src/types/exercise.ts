export type ExerciseType = "multiple-choice" | "slider";

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  question: string;
  hint?: string;
  explanation: string; // shown after answering
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple-choice";
  options: { id: string; label: string; isCorrect: boolean }[];
}

export interface SliderExercise extends BaseExercise {
  type: "slider";
  min: number;
  max: number;
  step: number;
  correctRange: [number, number]; // tolerance band
  unit?: string;
}

export type Exercise = MultipleChoiceExercise | SliderExercise;

export type ExerciseResult = "correct" | "incorrect" | "unanswered";
