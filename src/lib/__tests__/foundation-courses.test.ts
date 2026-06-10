import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { exercises } from "@/lib/exercises";

const ROOT = process.cwd();
const COURSES_DIR = path.join(ROOT, "src/content/courses");
const NOTEBOOKS_DIR = path.join(ROOT, "notebooks");

const FOUNDATION_SLUGS = [
  "linear-algebra",
  "calculus-for-ml",
  "probability-statistics",
] as const;

// Approved coverColor values from prompts/new-course.md
const APPROVED_COVER_COLORS = new Set([
  "bg-gradient-to-r from-brand-500 to-accent-teal",
  "bg-gradient-to-r from-brand-600 to-accent-orange",
  "bg-gradient-to-r from-brand-700 to-accent-rose",
  "bg-gradient-to-r from-accent-teal to-brand-400",
]);

function readFrontmatter(filePath: string) {
  return matter(fs.readFileSync(filePath, "utf-8"));
}

function getLessonFiles(courseSlug: string): string[] {
  return fs
    .readdirSync(path.join(COURSES_DIR, courseSlug))
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .sort();
}

// ─── Course-level ────────────────────────────────────────────────────────────

describe("Foundation courses — existence", () => {
  it.each(FOUNDATION_SLUGS)("%s directory exists", (slug) => {
    expect(fs.existsSync(path.join(COURSES_DIR, slug))).toBe(true);
  });

  it.each(FOUNDATION_SLUGS)("%s has index.mdx", (slug) => {
    expect(fs.existsSync(path.join(COURSES_DIR, slug, "index.mdx"))).toBe(true);
  });

  it.each(FOUNDATION_SLUGS)("%s has at least 3 lessons", (slug) => {
    expect(getLessonFiles(slug).length).toBeGreaterThanOrEqual(3);
  });
});

describe("Foundation courses — course metadata", () => {
  it.each(FOUNDATION_SLUGS)("%s has negative order (renders before ML courses)", (slug) => {
    const { data } = readFrontmatter(path.join(COURSES_DIR, slug, "index.mdx"));
    expect(data.order, `${slug} order should be negative`).toBeLessThan(0);
  });

  it("foundation courses have distinct orders", () => {
    const orders = FOUNDATION_SLUGS.map((slug) => {
      const { data } = readFrontmatter(path.join(COURSES_DIR, slug, "index.mdx"));
      return data.order as number;
    });
    expect(new Set(orders).size).toBe(FOUNDATION_SLUGS.length);
  });

  it.each(FOUNDATION_SLUGS)("%s difficulty is beginner", (slug) => {
    const { data } = readFrontmatter(path.join(COURSES_DIR, slug, "index.mdx"));
    expect(data.difficulty).toBe("beginner");
  });

  it.each(FOUNDATION_SLUGS)("%s coverColor uses an approved gradient", (slug) => {
    const { data } = readFrontmatter(path.join(COURSES_DIR, slug, "index.mdx"));
    expect(
      APPROVED_COVER_COLORS.has(data.coverColor),
      `${slug} coverColor="${data.coverColor}" is not in the approved list from prompts/new-course.md`
    ).toBe(true);
  });

  it.each(FOUNDATION_SLUGS)("%s has a non-empty topics array", (slug) => {
    const { data } = readFrontmatter(path.join(COURSES_DIR, slug, "index.mdx"));
    expect(Array.isArray(data.topics)).toBe(true);
    expect(data.topics.length).toBeGreaterThan(0);
  });

  it.each(FOUNDATION_SLUGS)("%s has no prerequisites (it IS a prerequisite)", (slug) => {
    const { data } = readFrontmatter(path.join(COURSES_DIR, slug, "index.mdx"));
    expect(Array.isArray(data.prerequisites)).toBe(true);
    expect(data.prerequisites).toHaveLength(0);
  });
});

// ─── Lesson-level ────────────────────────────────────────────────────────────

describe("Foundation lessons — frontmatter", () => {
  const allLessons = FOUNDATION_SLUGS.flatMap((courseSlug) =>
    getLessonFiles(courseSlug).map((file) => {
      const full = path.join(COURSES_DIR, courseSlug, file);
      const { data, content } = readFrontmatter(full);
      return { courseSlug, file, slug: file.replace(/\.mdx$/, ""), data, content };
    })
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s has required frontmatter fields",
    (_name, l) => {
      expect(typeof l.data.title).toBe("string");
      expect(l.data.title.trim().length).toBeGreaterThan(0);
      expect(typeof l.data.description).toBe("string");
      expect(l.data.description.trim().length).toBeGreaterThan(0);
      expect(typeof l.data.order).toBe("number");
      expect(
        ["concept", "quiz"].includes(l.data.type as string),
        `type="${l.data.type}" must be concept or quiz`
      ).toBe(true);
      expect(typeof l.data.estimatedMinutes).toBe("number");
      expect(l.data.estimatedMinutes).toBeGreaterThan(0);
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s order matches its NN- filename prefix",
    (_name, l) => {
      const prefix = Number(l.file.slice(0, 2));
      expect(l.data.order).toBe(prefix);
    }
  );
});

// ─── Lesson content ──────────────────────────────────────────────────────────

describe("Foundation lessons — content quality", () => {
  // Quiz lessons are intentionally minimal (exercises only) — skip content checks for them.
  const allLessons = FOUNDATION_SLUGS.flatMap((courseSlug) =>
    getLessonFiles(courseSlug).map((file) => {
      const full = path.join(COURSES_DIR, courseSlug, file);
      const { data, content } = readFrontmatter(full);
      return { courseSlug, file, content, type: data.type as string };
    })
  ).filter((l) => l.type !== "quiz");

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s contains LaTeX math",
    (_name, l) => {
      const hasMath = l.content.includes("$$") || l.content.includes("$");
      expect(hasMath, "lesson should contain at least one LaTeX math expression").toBe(true);
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s contains a Callout block",
    (_name, l) => {
      expect(l.content).toContain("<Callout");
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s contains at least one Exercise reference",
    (_name, l) => {
      expect(l.content).toContain("<Exercise id=");
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s contains a Python code block",
    (_name, l) => {
      expect(l.content).toContain("```python");
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s has a Related concepts section",
    (_name, l) => {
      expect(l.content).toContain("## Related concepts");
    }
  );
});

// ─── Exercise registry ───────────────────────────────────────────────────────

describe("Foundation exercises — registry", () => {
  const FOUNDATION_PREFIXES = ["linalg-", "calc-", "prob-", "mle-", "bayes-"];

  const foundationExercises = Object.values(exercises).filter((ex) =>
    FOUNDATION_PREFIXES.some((p) => ex.id.startsWith(p))
  );

  it("registers exercises for all three foundation courses", () => {
    const hasLinAlg = foundationExercises.some((e) => e.id.startsWith("linalg-"));
    const hasCalc   = foundationExercises.some((e) => e.id.startsWith("calc-"));
    const hasProb   = foundationExercises.some(
      (e) => e.id.startsWith("prob-") || e.id.startsWith("mle-") || e.id.startsWith("bayes-")
    );
    expect(hasLinAlg).toBe(true);
    expect(hasCalc).toBe(true);
    expect(hasProb).toBe(true);
  });

  it("registers at least 3 exercises per foundation course", () => {
    const linAlgCount = foundationExercises.filter((e) => e.id.startsWith("linalg-")).length;
    const calcCount   = foundationExercises.filter((e) => e.id.startsWith("calc-")).length;
    const probCount   = foundationExercises.filter(
      (e) => e.id.startsWith("prob-") || e.id.startsWith("mle-") || e.id.startsWith("bayes-")
    ).length;
    expect(linAlgCount).toBeGreaterThanOrEqual(3);
    expect(calcCount).toBeGreaterThanOrEqual(3);
    expect(probCount).toBeGreaterThanOrEqual(3);
  });

  it.each(foundationExercises.map((e) => [e.id, e] as const))(
    "%s has exactly one correct option",
    (_id, ex) => {
      if (ex.type !== "multiple-choice") return;
      const correct = ex.options.filter((o) => o.isCorrect);
      expect(correct.length, `${ex.id} should have exactly 1 correct option`).toBe(1);
    }
  );

  it.each(foundationExercises.map((e) => [e.id, e] as const))(
    "%s exercise ids referenced in lessons resolve in registry",
    (_id, ex) => {
      expect(exercises[ex.id]).toBeDefined();
    }
  );
});

// ─── Companion notebooks ─────────────────────────────────────────────────────

describe("Foundation notebooks", () => {
  // Quiz lessons have no companion notebook — skip them.
  const allLessons = FOUNDATION_SLUGS.flatMap((courseSlug) =>
    getLessonFiles(courseSlug)
      .map((file) => {
        const full = path.join(COURSES_DIR, courseSlug, file);
        const { data } = readFrontmatter(full);
        return { courseSlug, slug: file.replace(/\.mdx$/, ""), type: data.type as string };
      })
      .filter((l) => l.type !== "quiz")
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.slug}`, l] as const))(
    "%s.ipynb exists",
    (_name, l) => {
      const nb = path.join(NOTEBOOKS_DIR, l.courseSlug, `${l.slug}.ipynb`);
      expect(fs.existsSync(nb), `missing: notebooks/${l.courseSlug}/${l.slug}.ipynb`).toBe(true);
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.slug}`, l] as const))(
    "%s.ipynb is valid JSON with cells",
    (_name, l) => {
      const nb = path.join(NOTEBOOKS_DIR, l.courseSlug, `${l.slug}.ipynb`);
      const parsed = JSON.parse(fs.readFileSync(nb, "utf-8"));
      expect(parsed.nbformat).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(parsed.cells)).toBe(true);
      expect(parsed.cells.length).toBeGreaterThan(0);
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.slug}`, l] as const))(
    "%s.ipynb first cell links back to the lesson",
    (_name, l) => {
      const nb = path.join(NOTEBOOKS_DIR, l.courseSlug, `${l.slug}.ipynb`);
      const parsed = JSON.parse(fs.readFileSync(nb, "utf-8"));
      const firstSource = parsed.cells[0].source.join?.("") ?? parsed.cells[0].source;
      expect(firstSource).toContain(l.courseSlug);
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.slug}`, l] as const))(
    "%s.ipynb contains a code cell with numpy import",
    (_name, l) => {
      const nb = path.join(NOTEBOOKS_DIR, l.courseSlug, `${l.slug}.ipynb`);
      const parsed = JSON.parse(fs.readFileSync(nb, "utf-8"));
      const codeCells = parsed.cells.filter((c: { cell_type: string }) => c.cell_type === "code");
      const hasNumpy = codeCells.some((c: { source: string | string[] }) => {
        const src = Array.isArray(c.source) ? c.source.join("") : c.source;
        return src.includes("import numpy");
      });
      expect(hasNumpy, `${l.courseSlug}/${l.slug}.ipynb should import numpy`).toBe(true);
    }
  );

  it.each(allLessons.map((l) => [`${l.courseSlug}/${l.slug}`, l] as const))(
    "%s.ipynb uses the dark matplotlib style",
    (_name, l) => {
      const nb = path.join(NOTEBOOKS_DIR, l.courseSlug, `${l.slug}.ipynb`);
      const parsed = JSON.parse(fs.readFileSync(nb, "utf-8"));
      const allCode = parsed.cells
        .filter((c: { cell_type: string }) => c.cell_type === "code")
        .map((c: { source: string | string[] }) =>
          Array.isArray(c.source) ? c.source.join("") : c.source
        )
        .join("\n");
      expect(allCode).toContain("#0f1117");
    }
  );
});
