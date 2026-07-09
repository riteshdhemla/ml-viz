import type { Difficulty } from "./course";

/** A reference to an existing on-site lesson (the "concept" rail). */
export interface LessonRef {
  course: string; // course slug
  lesson: string; // lesson slug (with NN- prefix)
}

/** An external resource — a video explainer or an open-source repo. */
export interface StageResource {
  name: string;
  url: string;
  blurb?: string;
}

/**
 * One milestone in a project's end-to-end build. Up to three "rails":
 * concept (on-site lessons), explainer (video), and implementation (repo).
 */
export interface ProjectStage {
  title: string;
  blurb: string;
  /** Concept rail — existing lessons/wiki. May be empty for capstone stages. */
  lessons: LessonRef[];
  /** Video rail — a canonical from-scratch explainer. */
  explainer?: StageResource;
  /** Implementation rail — a reference open-source repo. */
  repo?: StageResource;
  /** Set when the concept has no dedicated lesson yet. */
  gap?: string;
  /** Capstone stages link to another project instead of lessons. */
  projectLink?: string;
}

export interface Project {
  slug: string;
  number: number;
  title: string;
  tagline: string;
  /** The concrete thing the learner ships. */
  builds: string;
  difficulty: Difficulty;
  estimatedHours: number;
  prerequisites: string[]; // course slugs, reuses course gating
  skills: string[];
  /** Tailwind gradient class for the cover strip. */
  accent: string;
  stages: ProjectStage[];
}

// --- Resolved shapes handed to client components (titles + hrefs baked in) ---

export interface ResolvedLesson {
  course: string;
  lesson: string;
  title: string;
  href: string;
  /** true when the lesson slug did not resolve (author typo / renamed file). */
  missing?: boolean;
}

export interface ResolvedStage extends Omit<ProjectStage, "lessons"> {
  lessons: ResolvedLesson[];
}

export interface ResolvedProject extends Omit<Project, "stages"> {
  stages: ResolvedStage[];
  /** Unique "course/lesson" keys across all stages — drives progress. */
  lessonKeys: string[];
  stageCount: number;
}
