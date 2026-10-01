import type { SystemDesignTrack } from "@/types/system-design";

/**
 * The interview frameworks that structure every system-design case study.
 *
 * Each track borrows the framework educative.io teaches for that interview
 * type, so a reader who has drilled one of those courses recognises the shape
 * of every walkthrough here:
 *
 *   - ML System Design → the 7-step ML framework from *Grokking the Machine
 *     Learning Interview* (problem → scale → metrics → architecture → offline
 *     build → online execution → iteration).
 *   - Generative AI System Design → **SCALED**, from *Grokking the Generative
 *     AI System Design* (System requirements, Choose the model, Acquire data,
 *     Leverage the model, Estimate resources, Design the system).
 *   - Agentic System Design → **RESHADED**, from *Grokking the Modern System
 *     Design Interview* (Requirements, Estimation, Storage schema, High-level
 *     design, APIs, Detailed design, Evaluation, Distinctive component).
 *
 * This registry is the contract: `heading` is the exact `## ` prefix each case
 * must use, in order, and `system-design-integrity.test.ts` enforces it. A
 * section may append a spine tag after the prefix, e.g.
 * `## 3. Metrics *(spine: evaluation)*`.
 *
 * Framework-neutral (no React) so tests and server components can import it.
 */

export interface FrameworkStep {
  /** Short badge shown in the strip: a step number or the framework letter. */
  badge: string;
  /** Step name as it reads in the strip. */
  label: string;
  /** The exact `## ` heading prefix a case uses for this step. */
  heading: string;
  /** One line on what the step must establish. Shown as the chip tooltip. */
  summary: string;
}

export interface SystemDesignFramework {
  id: "ml-7-step" | "scaled" | "reshaded";
  /** Display name, e.g. "RESHADED". */
  name: string;
  /** Where the framework comes from. */
  source: string;
  steps: FrameworkStep[];
  /**
   * `## ` headings that close every case after the framework steps, in order.
   * They are not framework steps, but the skeleton test checks them too.
   */
  tail: string[];
}

const ML_7_STEP: SystemDesignFramework = {
  id: "ml-7-step",
  name: "7-step ML framework",
  source: "educative.io · Grokking the Machine Learning Interview",
  steps: [
    {
      badge: "1",
      label: "Problem statement",
      heading: "1. Problem statement",
      summary: "Narrow the ask to a precise ML problem: goal, scope, and what was breaking before.",
    },
    {
      badge: "2",
      label: "Scale & latency",
      heading: "2. Scale & latency requirements",
      summary: "Volume, latency budget, and freshness: the numbers that force the architecture.",
    },
    {
      badge: "3",
      label: "Metrics",
      heading: "3. Metrics",
      summary: "Offline metrics for iterating, online metrics for shipping, guardrails for harm.",
    },
    {
      badge: "4",
      label: "Architecture",
      heading: "4. Architecture",
      summary: "The high-level components and how a request flows through them.",
    },
    {
      badge: "5",
      label: "Offline build",
      heading: "5. Offline model building & evaluation",
      summary: "Training data generation, feature engineering, model training, offline evaluation.",
    },
    {
      badge: "6",
      label: "Online execution",
      heading: "6. Online model execution & evaluation",
      summary: "Serving inside the budget, then proving the win with an online experiment.",
    },
    {
      badge: "7",
      label: "Iterate",
      heading: "7. Iterative model improvement",
      summary: "Monitoring, drift, retraining, and the feedback loop that keeps it working.",
    },
  ],
  tail: ["Tradeoffs & alternatives", "Interviewer follow-ups", "Key takeaways", "References"],
};

const SCALED: SystemDesignFramework = {
  id: "scaled",
  name: "SCALED",
  source: "educative.io · Grokking the Generative AI System Design",
  steps: [
    {
      badge: "S",
      label: "System requirements",
      heading: "S: System requirements",
      summary: "What is generated, for whom, at what quality bar: functional and non-functional needs.",
    },
    {
      badge: "C",
      label: "Choose the model",
      heading: "C: Choose the model",
      summary: "Model family, size, and build-vs-buy, against the pre-generative baseline.",
    },
    {
      badge: "A",
      label: "Acquire data",
      heading: "A: Acquire & prepare data",
      summary: "Dataset sourcing, licensing, filtering, dedup, and the training mixture.",
    },
    {
      badge: "L",
      label: "Leverage the model",
      heading: "L: Leverage the model",
      summary: "Training and adaptation, generation and decoding, and how quality is evaluated.",
    },
    {
      badge: "E",
      label: "Estimate resources",
      heading: "E: Estimate resources",
      summary: "Back-of-envelope GPU, memory, storage, and cost: the defining GenAI constraint.",
    },
    {
      badge: "D",
      label: "Design the system",
      heading: "D: Design the system",
      summary: "High-level and detailed design: serving, safety, and the feedback loop.",
    },
  ],
  tail: ["Tradeoffs & alternatives", "Interviewer follow-ups", "Key takeaways", "References"],
};

const RESHADED: SystemDesignFramework = {
  id: "reshaded",
  name: "RESHADED",
  source: "educative.io · Grokking the Modern System Design Interview",
  steps: [
    {
      badge: "R",
      label: "Requirements",
      heading: "R: Requirements",
      summary: "Functional (what the agent does, when it escalates) and non-functional requirements.",
    },
    {
      badge: "E",
      label: "Estimation",
      heading: "E: Estimation",
      summary: "Tokens, steps, cost, and latency per task, and the load the system must carry.",
    },
    {
      badge: "S",
      label: "Storage schema",
      heading: "S: Storage schema",
      summary: "The state the agent keeps: sessions, memory, checkpoints, traces, and audit logs.",
    },
    {
      badge: "H",
      label: "High-level design",
      heading: "H: High-level design",
      summary: "The main components and the plan → act → observe loop that connects them.",
    },
    {
      badge: "A",
      label: "APIs",
      heading: "A: APIs",
      summary: "The tool contracts the model calls: typed schemas, reads versus gated writes.",
    },
    {
      badge: "D",
      label: "Detailed design",
      heading: "D: Detailed design",
      summary: "Context engineering, orchestration details, guardrails, and operations.",
    },
    {
      badge: "E",
      label: "Evaluation",
      heading: "E: Evaluation",
      summary: "How the agent is measured, whether the design meets its requirements, and the tradeoffs.",
    },
    {
      badge: "D",
      label: "Distinctive component",
      heading: "D: Distinctive component",
      summary: "The one component that makes this system hard, and how the design handles it.",
    },
  ],
  tail: ["Interviewer follow-ups", "Key takeaways", "References"],
};

const BY_TRACK: Record<SystemDesignTrack, SystemDesignFramework> = {
  ml: ML_7_STEP,
  genai: SCALED,
  agentic: RESHADED,
};

/** The framework a case follows, chosen by its resolved track (`track ?? spine`). */
export function getFramework(track: string | undefined): SystemDesignFramework | undefined {
  return track && track in BY_TRACK ? BY_TRACK[track as SystemDesignTrack] : undefined;
}

/** Every framework, for docs and the index page. */
export const ALL_FRAMEWORKS: SystemDesignFramework[] = [ML_7_STEP, SCALED, RESHADED];
