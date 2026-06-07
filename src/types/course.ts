export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface CourseMeta {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  topics: string[];
  estimatedHours: number;
  prerequisites: string[]; // course slugs
  order: number;
  coverColor: string; // tailwind gradient class
}

export interface LessonMeta {
  slug: string;
  courseSlug: string;
  title: string;
  description: string;
  order: number;
  type: "concept" | "exercise" | "quiz" | "playground";
  estimatedMinutes: number;
}

export interface CourseWithLessons extends CourseMeta {
  lessons: LessonMeta[];
}
