import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();
const WIKI_DIR = path.join(ROOT, "src/content/wiki");
const COURSES_DIR = path.join(ROOT, "src/content/courses");
const NOTEBOOKS_DIR = path.join(ROOT, "notebooks");

function read(file: string) {
  return matter(fs.readFileSync(file, "utf-8"));
}

const wikiFiles = fs.existsSync(WIKI_DIR)
  ? fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".mdx")).sort()
  : [];

const wikiPages = wikiFiles.map((file) => {
  const { data, content } = read(path.join(WIKI_DIR, file));
  return { file, slug: file.replace(/\.mdx$/, ""), data, content };
});

const wikiSlugs = new Set(wikiPages.map((p) => p.slug));

// Every lesson file, for scanning <WikiLink> references.
const courseSlugs = fs
  .readdirSync(COURSES_DIR)
  .filter((d) => fs.statSync(path.join(COURSES_DIR, d)).isDirectory());

const lessons = courseSlugs.flatMap((courseSlug) =>
  fs
    .readdirSync(path.join(COURSES_DIR, courseSlug))
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .map((file) => {
      const { content } = read(path.join(COURSES_DIR, courseSlug, file));
      return { courseSlug, file, content };
    })
);

describe("wiki pages", () => {
  it.each(wikiPages.map((p) => [p.file, p] as const))(
    "%s has valid frontmatter",
    (_name, p) => {
      expect(typeof p.data.title).toBe("string");
      expect(typeof p.data.description).toBe("string");
      expect(Array.isArray(p.data.topics), "topics must be an array").toBe(true);
      expect(p.data.topics.length, "at least one topic required").toBeGreaterThan(0);
      expect(Array.isArray(p.data.relatedLessons), "relatedLessons must be an array").toBe(true);
      expect(typeof p.data.estimatedMinutes).toBe("number");
    }
  );

  it("every relatedLessons entry resolves to an existing lesson", () => {
    const broken: string[] = [];
    for (const p of wikiPages) {
      for (const ref of p.data.relatedLessons ?? []) {
        const [courseSlug, lessonSlug] = String(ref).split("/");
        const target = path.join(COURSES_DIR, courseSlug ?? "", `${lessonSlug}.mdx`);
        if (!courseSlug || !lessonSlug || !fs.existsSync(target)) {
          broken.push(`${p.file} -> ${ref}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("every wiki page has a companion notebook (unless it overrides notebookUrl)", () => {
    for (const p of wikiPages) {
      if (p.data.notebookUrl) continue;
      const nb = path.join(NOTEBOOKS_DIR, "wiki", `${p.slug}.ipynb`);
      expect(fs.existsSync(nb), `missing notebook: wiki/${p.slug}.ipynb`).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(nb, "utf-8"));
      expect(parsed.nbformat, `${nb} has no nbformat`).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(parsed.cells), `${nb} has no cells`).toBe(true);
    }
  });
});

describe("wiki references from lessons", () => {
  const WIKILINK_RE = /<WikiLink\s+slug="([^"]+)"/g;
  const MD_WIKI_LINK_RE = /\]\(\/wiki\/([a-z0-9-]+)\)/g;

  it("every <WikiLink slug> in a lesson resolves to a wiki page", () => {
    const broken: string[] = [];
    for (const l of lessons) {
      for (const m of l.content.matchAll(WIKILINK_RE)) {
        if (!wikiSlugs.has(m[1])) {
          broken.push(`${l.courseSlug}/${l.file} -> ${m[1]}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("every markdown /wiki/<slug> link resolves to a wiki page", () => {
    const broken: string[] = [];
    const allContent = [
      ...lessons.map((l) => ({ name: `${l.courseSlug}/${l.file}`, content: l.content })),
      ...wikiPages.map((p) => ({ name: `wiki/${p.file}`, content: p.content })),
    ];
    for (const { name, content } of allContent) {
      for (const m of content.matchAll(MD_WIKI_LINK_RE)) {
        if (!wikiSlugs.has(m[1])) broken.push(`${name} -> /wiki/${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
