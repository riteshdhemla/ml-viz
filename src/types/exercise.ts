export type ExerciseType =
  | "multiple-choice"
  | "slider"
  | "drag-drop"
  | "fill-blank"
  | "code"
  | "interactive-viz";

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

export interface FillBlankExercise extends BaseExercise {
  type: "fill-blank";
  blanks: { id: string; answer: string; caseSensitive?: boolean }[];
}

export type Exercise =
  | MultipleChoiceExercise
  | SliderExercise
  | FillBlankExercise;

export type ExerciseResult = "correct" | "incorrect" | "unanswered";
