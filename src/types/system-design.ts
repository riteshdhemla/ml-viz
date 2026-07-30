import type { SpineId } from "./course";

/** The three interview tracks on the /system-design index. */
export type SystemDesignTrack = "ml" | "agentic" | "genai";

/**
 * A worked system-design interview walkthrough. Each case lives under
 * `src/content/system-design/{slug}.mdx` and is structured by its project loop
 * (`spine`) — the ML loop or the agentic loop — so the interview reads as a walk
 * through the stages.
 *
 * The **resolved track** (`track ?? spine`) selects which section the case
 * appears under on the index: "ML System Design", "Agentic System Design", or
 * "Generative AI System Design". Track is orthogonal to spine: most GenAI cases
 * still carry `spine: ml` (training a generative model is the ML loop) so the
 * SpineNav strip renders; serving/infra GenAI cases may omit `spine` entirely.
 */
export interface SystemDesignCase {
  slug: string;
  title: string;
  description: string;
  /**
   * Overrides the track grouping when it differs from the spine. Set
   * `track: "genai"` for Generative AI cases. When omitted, the track resolves
   * to `spine`.
   */
  track?: SystemDesignTrack;
  /**
   * The project loop this case walks through. Drives the SpineNav strip.
   * Required for ML/agentic cases; optional for `track: "genai"` cases that are
   * pure serving/infra with no natural loop.
   */
  spine?: SpineId;
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
