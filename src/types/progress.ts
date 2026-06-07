export interface LessonProgress {
  lessonSlug: string;
  courseSlug: string;
  completed: boolean;
  completedAt?: string; // ISO date
  exerciseResults: Record<string, "correct" | "incorrect">;
}

export interface CourseProgress {
  courseSlug: string;
  startedAt: string;
  completedLessons: string[];
  totalLessons: number;
}

export interface UserProgress {
  courses: Record<string, CourseProgress>;
  lessons: Record<string, LessonProgress>;
}
