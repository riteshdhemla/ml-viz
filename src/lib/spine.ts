import type { SpineId } from "@/types/course";

/**
 * The curriculum "spines" — recurring project loops that every course and
 * lesson hangs off, so a learner always knows *where they are in a real
 * project* while studying any concept.
 *
 * Two loops:
 *   - "ml":      data → hypothesis space → objective → optimization →
 *                evaluation → deployment feedback
 *   - "agentic": task → context & tools → orchestration → evaluation →
 *                guardrails → operations feedback
 *
 * This registry is the single source of truth. Course frontmatter picks a
 * `spine`; each lesson tags 1–3 `spineStages`. The definitions here are the
 * contract — content references them, never restates them divergently.
 *
 * Framework-neutral (no React / no "use client") so it can be imported by
 * server components (LessonLayout), client viz (ProjectLoopViz), and tests.
 */

export type MlStageId =
  | "data"
  | "hypothesis-space"
  | "objective"
  | "optimization"
  | "evaluation"
  | "feedback";

export type AgenticStageId =
  | "task"
  | "context"
  | "orchestration"
  | "evaluation"
  | "guardrails"
  | "operations";

export type SpineStageId = MlStageId | AgenticStageId;

export interface SpineStage {
  /** kebab-case id used in lesson `spineStages` frontmatter. */
  id: SpineStageId;
  /** Human label for UI (strip, hub page). */
  label: string;
  /** One-line "what this stage means" — the canonical wording. */
  blurb: string;
  /** Accent colour (mirrors the VIZ design tokens in viz-kit.tsx). */
  color: string;
}

export interface Spine {
  id: SpineId;
  /** Human label for the loop. */
  label: string;
  /** Wiki slug of this loop's hub page (`/wiki/<hubSlug>`). */
  hubSlug: string;
  /** The six ordered stages of the loop. */
  stages: SpineStage[];
}

/**
 * Per-stage accent colours, cycled from the VIZ design tokens
 * (teal, brand, orange, yellow, rose, brand-light) so the loop viz and the
 * SpineNav strip render each stage distinctly. Kept as literals to avoid
 * pulling the "use client" viz-kit module into server code.
 */
const STAGE_COLORS = [
  "#14b8a6", // teal
  "#6366f1", // brand
  "#f97316", // orange
  "#eab308", // yellow
  "#f43f5e", // rose
  "#a5b4fc", // brand-light
] as const;

function withColors(
  stages: Array<Pick<SpineStage, "id" | "label" | "blurb">>,
): SpineStage[] {
  return stages.map((s, i) => ({ ...s, color: STAGE_COLORS[i % STAGE_COLORS.length] }));
}

export const SPINES: Record<SpineId, Spine> = {
  ml: {
    id: "ml",
    label: "ML project loop",
    hubSlug: "ml-project-loop",
    stages: withColors([
      {
        id: "data",
        label: "Data",
        blurb:
          "Collect, clean, label, split, and represent the raw material; sampling, leakage, features.",
      },
      {
        id: "hypothesis-space",
        label: "Hypothesis space",
        blurb:
          "Choose the family of functions the model can express — architecture, inductive bias, capacity.",
      },
      {
        id: "objective",
        label: "Objective",
        blurb:
          'Define what "good" means mathematically — loss, likelihood, regularization, constraints.',
      },
      {
        id: "optimization",
        label: "Optimization",
        blurb:
          "Search the hypothesis space for parameters that score well — GD variants, EM, convexity, compute.",
      },
      {
        id: "evaluation",
        label: "Evaluation",
        blurb:
          "Estimate generalization honestly — metrics, validation, calibration, error analysis.",
      },
      {
        id: "feedback",
        label: "Deployment feedback",
        blurb:
          "Ship, monitor, detect drift, collect new signal, retrain — the loop closes back into data.",
      },
    ]),
  },
  agentic: {
    id: "agentic",
    label: "Agentic project loop",
    hubSlug: "agentic-project-loop",
    stages: withColors([
      {
        id: "task",
        label: "Task definition",
        blurb:
          "Define the goal, environment, and success criteria; what the agent is for and when it should act.",
      },
      {
        id: "context",
        label: "Context & tools",
        blurb:
          "Design what the model sees and can do — prompts, retrieval/RAG, memory, tool schemas, MCP.",
      },
      {
        id: "orchestration",
        label: "Orchestration loop",
        blurb:
          "The runtime loop — plan → act → observe, reflection, model querying, multi-agent topologies.",
      },
      {
        id: "evaluation",
        label: "Evaluation",
        blurb:
          "Judge outcomes and trajectories — pass@k, tool-selection accuracy, LLM-as-judge, benchmarks.",
      },
      {
        id: "guardrails",
        label: "Guardrails",
        blurb:
          "Contain failure — input/output guardrails, injection defense, HITL gates, permissions.",
      },
      {
        id: "operations",
        label: "Operations feedback",
        blurb:
          "Deploy, trace, watch cost/latency, version prompts, learn from production — closes back into task.",
      },
    ]),
  },
};

export const SPINE_IDS = Object.keys(SPINES) as SpineId[];

/** Look up a spine by id. */
export function getSpine(id: string | undefined): Spine | undefined {
  if (!id) return undefined;
  return SPINES[id as SpineId];
}

/** Look up a single stage within a spine. */
export function getStage(
  spineId: string | undefined,
  stageId: string,
): SpineStage | undefined {
  return getSpine(spineId)?.stages.find((s) => s.id === stageId);
}

/** Is `stageId` a valid stage of `spineId`'s loop? */
export function isValidStage(spineId: string | undefined, stageId: string): boolean {
  return getStage(spineId, stageId) !== undefined;
}

/** Resolve a lesson's `spineStages` (ids) to full stage objects, order preserved. */
export function resolveStages(
  spineId: string | undefined,
  stageIds: string[] | undefined,
): SpineStage[] {
  if (!stageIds?.length) return [];
  return stageIds
    .map((id) => getStage(spineId, id))
    .filter((s): s is SpineStage => s !== undefined);
}
