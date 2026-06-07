import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProgress } from "@/types/progress";

interface ProgressStore extends UserProgress {
  markLessonComplete: (courseSlug: string, lessonSlug: string) => void;
  recordExerciseResult: (
    courseSlug: string,
    lessonSlug: string,
    exerciseId: string,
    result: "correct" | "incorrect"
  ) => void;
  getCourseProgress: (courseSlug: string) => number; // 0-100
  isLessonComplete: (courseSlug: string, lessonSlug: string) => boolean;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      courses: {},
      lessons: {},

      markLessonComplete(courseSlug, lessonSlug) {
        set((state) => {
          const key = `${courseSlug}/${lessonSlug}`;
          const existing = state.lessons[key];
          return {
            lessons: {
              ...state.lessons,
              [key]: {
                lessonSlug,
                courseSlug,
                completed: true,
                completedAt: new Date().toISOString(),
                exerciseResults: existing?.exerciseResults ?? {},
              },
            },
          };
        });
      },

      recordExerciseResult(courseSlug, lessonSlug, exerciseId, result) {
        set((state) => {
          const key = `${courseSlug}/${lessonSlug}`;
          const existing = state.lessons[key];
          return {
            lessons: {
              ...state.lessons,
              [key]: {
                lessonSlug,
                courseSlug,
                completed: existing?.completed ?? false,
                exerciseResults: {
                  ...(existing?.exerciseResults ?? {}),
                  [exerciseId]: result,
                },
              },
            },
          };
        });
      },

      getCourseProgress(courseSlug) {
        const state = get();
        const courseLessons = Object.values(state.lessons).filter(
          (l) => l.courseSlug === courseSlug
        );
        const completed = courseLessons.filter((l) => l.completed).length;
        return courseLessons.length === 0 ? 0 : (completed / courseLessons.length) * 100;
      },

      isLessonComplete(courseSlug, lessonSlug) {
        const key = `${courseSlug}/${lessonSlug}`;
        return get().lessons[key]?.completed ?? false;
      },
    }),
    { name: "ml-viz-progress" }
  )
);
