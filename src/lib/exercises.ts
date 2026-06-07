import type { Exercise } from "@/types/exercise";

/**
 * Central exercise registry.
 *
 * Lesson MDX references exercises by id — `<Exercise id="..." />` — rather than
 * passing an inline object. This keeps lesson MDX free of JavaScript
 * expressions so it can be rendered with `next-mdx-remote`'s `blockJS: true`
 * (the secure default that prevents arbitrary code execution from MDX content).
 *
 * To add an exercise: append a typed entry below and reference its `id` from a
 * lesson. Ids must be unique across the whole site.
 */
const allExercises: Exercise[] = [
  {
    id: "neuron-weights-quiz",
    type: "multiple-choice",
    question:
      "A neuron has weights [2, -1, 0.5] and bias 1. Its inputs are [1, 1, 1]. What is the pre-activation value?",
    hint: "Compute the dot product w·x + b.",
    explanation:
      "2×1 + (−1)×1 + 0.5×1 + 1 = 2.5. The bias shifts the total regardless of input.",
    options: [
      { id: "a", label: "1.5", isCorrect: false },
      { id: "b", label: "2.5", isCorrect: true },
      { id: "c", label: "3.5", isCorrect: false },
      { id: "d", label: "0.5", isCorrect: false },
    ],
  },
  {
    id: "lr-effect",
    type: "slider",
    question:
      "What learning rate is generally a good starting point for gradient descent?",
    hint: "Think about the scale: 0.001, 0.01, 0.1, or 10?",
    explanation:
      "0.01 is a common safe default. Values like 0.001 are conservative but stable; 0.1+ can be unstable without careful tuning.",
    min: 0.0001,
    max: 1.0,
    step: 0.0001,
    correctRange: [0.001, 0.1],
    unit: "",
  },
];

export const exercises: Record<string, Exercise> = Object.fromEntries(
  allExercises.map((exercise) => [exercise.id, exercise])
);

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}
