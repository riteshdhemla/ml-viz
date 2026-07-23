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

// Phase B is complete: every spine course is fully tagged, so coverage is
// enforced unconditionally (the progress-tracking allowlist was retired in
// Phase C3). A new spine course therefore fails this suite until it declares
// its spine and tags every non-quiz lesson.

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

  it("every wiki `spine`/`spineStages`, when present, is well-formed", () => {
    const problems: string[] = [];
    const wikiFiles = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".mdx"));
    for (const file of wikiFiles) {
      const { data } = read(path.join(WIKI_DIR, file));
      if (data.spine === undefined && data.spineStages === undefined) continue;
      if (data.spine !== undefined && !SPINE_IDS.includes(data.spine)) {
        problems.push(`wiki/${file}: unknown spine "${data.spine}"`);
      }
      if (data.spineStages !== undefined) {
        if (!Array.isArray(data.spineStages)) {
          problems.push(`wiki/${file}: spineStages is not an array`);
          continue;
        }
        if (data.spine === undefined) {
          problems.push(`wiki/${file}: has spineStages but no spine`);
          continue;
        }
        for (const stage of data.spineStages) {
          if (!isValidStage(data.spine, stage)) {
            problems.push(`wiki/${file}: "${stage}" is not a stage of the "${data.spine}" spine`);
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

describe("spine coverage (enforced for every spine course)", () => {
  const enforced = Object.keys(SPINE_COURSES);

  it("every spine course exists as a real course directory", () => {
    for (const slug of enforced) {
      expect(fs.existsSync(path.join(COURSES_DIR, slug, "index.mdx")), slug).toBe(true);
    }
  });

  it("every spine course declares the expected spine", () => {
    for (const slug of enforced) {
      const { data } = read(path.join(COURSES_DIR, slug, "index.mdx"));
      expect(data.spine, `${slug} should declare spine`).toBe(SPINE_COURSES[slug]);
    }
  });

  it("every course that declares a spine is in the SPINE_COURSES contract", () => {
    for (const slug of courseSlugs) {
      const { data } = read(path.join(COURSES_DIR, slug, "index.mdx"));
      if (data.spine !== undefined) {
        expect(SPINE_COURSES[slug], `${slug} declares a spine but isn't in the contract`).toBeDefined();
      }
    }
  });

  it("every non-quiz lesson of a spine course carries spineStages", () => {
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
    expect(missing, "untagged non-quiz lessons").toEqual([]);
  });
});
