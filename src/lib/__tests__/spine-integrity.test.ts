import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { SPINE_IDS, getSpine, isValidStage } from "@/lib/spine";
import type { SpineId } from "@/types/course";

const ROOT = process.cwd();
const COURSES_DIR = path.join(ROOT, "src/content/courses");
const WIKI_DIR = path.join(ROOT, "src/content/wiki");

function read(file: string) {
  return matter(fs.readFileSync(file, "utf-8"));
}

const courseSlugs = fs
  .readdirSync(COURSES_DIR)
  .filter((d) => fs.statSync(path.join(COURSES_DIR, d)).isDirectory());

function lessonFiles(courseSlug: string): string[] {
  return fs
    .readdirSync(path.join(COURSES_DIR, courseSlug))
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .sort();
}

/**
 * The contract from the spine-revamp plan (§3): every course that should live on
 * a spine, and which one. This is the source of truth for coverage — a course
 * here must eventually carry `spine:` frontmatter and tag all its lessons.
 */
const SPINE_COURSES: Record<string, SpineId> = {
  // ml spine
  "linear-algebra": "ml",
  "calculus-for-ml": "ml",
  "probability-statistics": "ml",
  "optimization-ml": "ml",
  "linear-regression": "ml",
  "knn-decision-trees": "ml",
  "svm": "ml",
  "ensemble-methods": "ml",
  "clustering": "ml",
  "pca-dimensionality": "ml",
  "probabilistic-models": "ml",
  "bayesian-methods": "ml",
  "causal-inference": "ml",
  "time-series": "ml",
  "model-evaluation": "ml",
  "neural-networks": "ml",
  "cnns": "ml",
  "rnns": "ml",
  "transformers": "ml",
  "generative-models": "ml",
  "graph-neural-networks": "ml",
  "computer-vision": "ml",
  "nlp": "ml",
  "speech-audio": "ml",
  "graphical-models": "ml",
  "reinforcement-learning": "ml",
  "recommender-systems": "ml",
  "gpu-programming": "ml",
  "ml-in-practice": "ml",
  "streaming-ml": "ml",
  "fine-tuning-alignment": "ml",
  // agentic spine
  "building-with-llms": "agentic",
  "agent-design-patterns": "agentic",
};

/**
 * Coverage allowlist — courses NOT yet fully tagged by a Phase B pass. A course
 * in this set is exempt from the "every non-quiz lesson has spineStages"
 * requirement. Each Phase B item removes its course; when the set is empty,
 * Phase C flips coverage to unconditional. This test is the progress tracker.
 */
const COVERAGE_ALLOWLIST = new Set<string>(
  Object.keys(SPINE_COURSES).filter(
    (slug) =>
      // Phase B removes each course here once fully tagged:
      ![
        "linear-algebra",
        "calculus-for-ml",
        "probability-statistics",
        "optimization-ml",
        "linear-regression",
        "knn-decision-trees",
        "svm",
        "ensemble-methods",
        "clustering",
        "pca-dimensionality",
        "probabilistic-models",
        "bayesian-methods",
        "causal-inference",
        "time-series",
        "model-evaluation",
        "neural-networks",
        "cnns",
        "rnns",
        "transformers",
        "generative-models",
        "graph-neural-networks",
        "computer-vision",
        "nlp",
        "speech-audio",
        "graphical-models",
        "reinforcement-learning",
        "recommender-systems",
        "gpu-programming",
        "ml-in-practice",
        "streaming-ml",
      ].includes(slug),
  ),
);

describe("spine frontmatter is well-formed (always enforced)", () => {
  it("every course `spine` value, when present, is a known spine", () => {
    for (const slug of courseSlugs) {
      const { data } = read(path.join(COURSES_DIR, slug, "index.mdx"));
      if (data.spine !== undefined) {
        expect(SPINE_IDS.includes(data.spine), `${slug} spine=${data.spine}`).toBe(true);
      }
    }
  });

  it("every lesson `spineStages` entry is valid for its course's spine", () => {
    const problems: string[] = [];
    for (const slug of courseSlugs) {
      const courseSpine = read(path.join(COURSES_DIR, slug, "index.mdx")).data.spine;
      for (const file of lessonFiles(slug)) {
        const { data } = read(path.join(COURSES_DIR, slug, file));
        const stages = data.spineStages;
        if (stages === undefined) continue;

        if (!Array.isArray(stages)) {
          problems.push(`${slug}/${file}: spineStages is not an array`);
          continue;
        }
        // Quizzes span the whole course — they must not claim stages.
        if (data.type === "quiz") {
          problems.push(`${slug}/${file}: quiz must not carry spineStages`);
          continue;
        }
        if (stages.length < 1 || stages.length > 3) {
          problems.push(`${slug}/${file}: spineStages must have 1–3 entries, has ${stages.length}`);
        }
        if (new Set(stages).size !== stages.length) {
          problems.push(`${slug}/${file}: spineStages has duplicates`);
        }
        // A lesson with stages requires its course to declare a spine.
        if (courseSpine === undefined) {
          problems.push(`${slug}/${file}: has spineStages but course has no spine`);
          continue;
        }
        for (const stage of stages) {
          if (!isValidStage(courseSpine, stage)) {
            problems.push(`${slug}/${file}: "${stage}" is not a stage of the "${courseSpine}" spine`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("spine hub pages exist", () => {
  it.each(SPINE_IDS)("the %s spine has its hub wiki page", (id) => {
    const hub = getSpine(id)!.hubSlug;
    expect(fs.existsSync(path.join(WIKI_DIR, `${hub}.mdx`)), `missing wiki/${hub}.mdx`).toBe(true);
  });
});

describe("spine coverage (enforced as Phase B removes courses from the allowlist)", () => {
  const enforced = Object.keys(SPINE_COURSES).filter((s) => !COVERAGE_ALLOWLIST.has(s));

  it("every enforced course declares the expected spine", () => {
    for (const slug of enforced) {
      const { data } = read(path.join(COURSES_DIR, slug, "index.mdx"));
      expect(data.spine, `${slug} should declare spine`).toBe(SPINE_COURSES[slug]);
    }
  });

  it("every non-quiz lesson of an enforced course carries spineStages", () => {
    const missing: string[] = [];
    for (const slug of enforced) {
      for (const file of lessonFiles(slug)) {
        const { data } = read(path.join(COURSES_DIR, slug, file));
        if (data.type === "quiz") continue;
        if (!Array.isArray(data.spineStages) || data.spineStages.length === 0) {
          missing.push(`${slug}/${file}`);
        }
      }
    }
    expect(missing, "untagged non-quiz lessons in enforced courses").toEqual([]);
  });

  it("the allowlist only names real spine courses", () => {
    for (const slug of COVERAGE_ALLOWLIST) {
      expect(SPINE_COURSES[slug], `allowlist has unknown course "${slug}"`).toBeDefined();
    }
  });
});
