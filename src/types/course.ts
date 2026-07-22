export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Which project-loop "spine" a course hangs off. See `src/lib/spine.ts`. */
export type SpineId = "ml" | "agentic";

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
  cluster: string;
  /** The project loop this course lives on. Stage ids come from `src/lib/spine.ts`. */
  spine?: SpineId;
}

export interface LessonMeta {
  slug: string;
  courseSlug: string;
  title: string;
  description: string;
  order: number;
  type: "concept" | "exercise" | "quiz" | "playground";
  estimatedMinutes: number;
  /** Override the auto-generated Colab URL. Leave unset to use the convention-based path. */
  notebookUrl?: string;
  /**
   * The 1–3 loop stages this lesson chiefly advances (stage ids from the
   * course's spine — see `src/lib/spine.ts`). Validated in
   * `spine-integrity.test.ts`. Quizzes carry none.
   */
  spineStages?: string[];
}

export interface CourseWithLessons extends CourseMeta {
  lessons: LessonMeta[];
}
