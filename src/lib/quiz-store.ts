"use client";

import { create } from "zustand";

/**
 * Session-scoped exercise results, keyed by exercise id. Powers the quiz
 * score summary: every <Exercise> records its outcome here, and the quiz
 * page aggregates the ids it contains. `epoch` increments on retry so
 * exercise components can reset their local answer state.
 */
interface QuizState {
  results: Record<string, "correct" | "incorrect">;
  epoch: number;
  record: (id: string, result: "correct" | "incorrect") => void;
  resetAll: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  results: {},
  epoch: 0,
  record: (id, result) =>
    set((s) => ({ results: { ...s.results, [id]: result } })),
  resetAll: () => set((s) => ({ results: {}, epoch: s.epoch + 1 })),
}));
