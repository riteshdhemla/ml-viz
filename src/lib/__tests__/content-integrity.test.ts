import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { exercises } from "@/lib/exercises";

const ROOT = process.cwd();
const COURSES_DIR = path.join(ROOT, "src/content/courses");
const NOTEBOOKS_DIR = path.join(ROOT, "notebooks");

const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
const LESSON_TYPES = new Set(["concept", "exercise", "quiz", "playground"]);

const courseSlugs = fs
  .readdirSync(COURSES_DIR)
  .filter((d) => fs.statSync(path.join(COURSES_DIR, d)).isDirectory());

function lessonFiles(courseSlug: string): string[] {
  return fs
    .readdirSync(path.join(COURSES_DIR, courseSlug))
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .sort();
}

function read(file: string) {
  return matter(fs.readFileSync(file, "utf-8"));
}

describe("courses", () => {
  it("at least one course exists", () => {
    expect(courseSlugs.length).toBeGreaterThan(0);
  });

  it.each(courseSlugs)("%s has a valid index.mdx", (slug) => {
    const indexPath = path.join(COURSES_DIR, slug, "index.mdx");
    expect(fs.existsSync(indexPath), `${slug}/index.mdx missing`).toBe(true);

    const { data } = read(indexPath);
    expect(typeof data.title, slug).toBe("string");
    expect(typeof data.description, slug).toBe("string");
    expect(DIFFICULTIES.has(data.difficulty), `${slug} difficulty=${data.difficulty}`).toBe(true);
    expect(Array.isArray(data.topics), slug).toBe(true);
    expect(typeof data.estimatedHours, slug).toBe("number");
    expect(Array.isArray(data.prerequisites), slug).toBe(true);
    expect(typeof data.order, slug).toBe("number");
  });

  it("course prerequisites reference existing courses", () => {
    const known = new Set(courseSlugs);
    for (const slug of courseSlugs) {
      const { data } = read(path.join(COURSES_DIR, slug, "index.mdx"));
      for (const pre of data.prerequisites ?? []) {
        expect(known.has(pre), `${slug} -> unknown prerequisite "${pre}"`).toBe(true);
      }
    }
  });

  it("has no stray non-mdx files in course dirs", () => {
    for (const slug of courseSlugs) {
      const stray = fs
        .readdirSync(path.join(COURSES_DIR, slug))
        .filter((f) => !f.endsWith(".mdx"));
      expect(stray, `${slug} has stray files`).toEqual([]);
    }
  });
});

// Flatten every lesson for per-lesson assertions.
const lessons = courseSlugs.flatMap((courseSlug) =>
  lessonFiles(courseSlug).map((file) => {
    const full = path.join(COURSES_DIR, courseSlug, file);
    const { data, content } = read(full);
    return { courseSlug, file, slug: file.replace(/\.mdx$/, ""), data, content };
  })
);

describe("lessons", () => {
  it("every course has at least one lesson", () => {
    for (const slug of courseSlugs) {
      expect(lessonFiles(slug).length, `${slug} has no lessons`).toBeGreaterThan(0);
    }
  });

  it.each(lessons.map((l) => [`${l.courseSlug}/${l.file}`, l] as const))(
    "%s has valid frontmatter",
    (_name, l) => {
      expect(typeof l.data.title).toBe("string");
      expect(typeof l.data.description).toBe("string");
      expect(typeof l.data.order).toBe("number");
      expect(LESSON_TYPES.has(l.data.type), `type=${l.data.type}`).toBe(true);
      expect(typeof l.data.estimatedMinutes).toBe("number");
    }
  );

  it("lesson order matches its NN- filename prefix", () => {
    for (const l of lessons) {
      const prefix = Number(l.file.slice(0, 2));
      expect(l.data.order, `${l.courseSlug}/${l.file}`).toBe(prefix);
    }
  });

  it("lesson order is unique within each course", () => {
    for (const slug of courseSlugs) {
      const orders = lessons
        .filter((l) => l.courseSlug === slug)
        .map((l) => l.data.order);
      expect(new Set(orders).size, `${slug} has duplicate orders`).toBe(orders.length);
    }
  });
});

describe("exercise references", () => {
  const EX_RE = /<Exercise\s+id="([^"]+)"/g;

  const referenced = new Set<string>();
  for (const l of lessons) {
    for (const m of l.content.matchAll(EX_RE)) referenced.add(m[1]);
  }

  it("every <Exercise id> in a lesson resolves to the registry", () => {
    const missing: string[] = [];
    for (const l of lessons) {
      for (const m of l.content.matchAll(EX_RE)) {
        if (!exercises[m[1]]) missing.push(`${l.courseSlug}/${l.file}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("has no orphan exercises (every registry entry is referenced)", () => {
    const orphans = Object.keys(exercises).filter((id) => !referenced.has(id));
    expect(orphans).toEqual([]);
  });
});

describe("cross-links", () => {
  const LINK_RE = /\]\(\/courses\/([a-z0-9-]+)\/([a-z0-9-]+)\)/g;

  it("every /courses/<course>/<lesson> link resolves to an existing lesson", () => {
    const broken: string[] = [];
    for (const l of lessons) {
      for (const m of l.content.matchAll(LINK_RE)) {
        const target = path.join(COURSES_DIR, m[1], `${m[2]}.mdx`);
        if (!fs.existsSync(target)) {
          broken.push(`${l.courseSlug}/${l.file} -> /courses/${m[1]}/${m[2]}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("every lesson links to at least one related concept", () => {
    const noLinks = lessons
      .filter((l) => !l.content.includes("](/courses/"))
      .map((l) => `${l.courseSlug}/${l.file}`);
    expect(noLinks).toEqual([]);
  });
});

describe("companion notebooks", () => {
  it("every lesson has a valid .ipynb (unless it overrides notebookUrl)", () => {
    for (const l of lessons) {
      if (l.data.notebookUrl) continue; // external override, no local file required
      const nb = path.join(NOTEBOOKS_DIR, l.courseSlug, `${l.slug}.ipynb`);
      expect(fs.existsSync(nb), `missing notebook: ${l.courseSlug}/${l.slug}.ipynb`).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(nb, "utf-8"));
      expect(parsed.nbformat, `${nb} has no nbformat`).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(parsed.cells), `${nb} has no cells`).toBe(true);
    }
  });
});
