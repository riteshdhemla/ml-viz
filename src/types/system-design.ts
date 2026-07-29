import type { SpineId } from "./course";

/**
 * A worked system-design interview walkthrough. Each case lives under
 * `src/content/system-design/{slug}.mdx` and is structured by its project loop
 * (`spine`) — the ML loop or the agentic loop — so the interview reads as a walk
 * through the stages. `spine` also selects which **track** the case appears
 * under on the `/system-design` index: "ML System Design" or "Agentic System
 * Design".
 */
export interface SystemDesignCase {
  slug: string;
  title: string;
  description: string;
  /** Selects the track. `ml` → "ML System Design", `agentic` → "Agentic System Design". */
  spine: SpineId;
  /** Loop stages this problem chiefly stresses (stage ids of `spine`). Drives the SpineNav strip. */
  spineStages?: string[];
  /** Company the design is inspired by, e.g. "Pinterest". Shown in the header + card. */
  company?: string;
  /** Human sub-group within a track, e.g. "Recommendations", "Support agents". */
  domain: string;
  /** One-line scale headline for the card, e.g. "300M+ users, <200ms budget". */
  scale?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  /** "courseSlug/lessonSlug" entries — drive the "Related lessons" footer. */
  relatedLessons: string[];
  estimatedMinutes: number;
  /** Optional Colab override. Case studies do NOT require a notebook. */
  notebookUrl?: string;
}
