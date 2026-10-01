import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { SPINE_IDS, isValidStage } from "@/lib/spine";
import { getFramework } from "@/lib/system-design-frameworks";

const ROOT = process.cwd();
const SYSTEM_DESIGN_DIR = path.join(ROOT, "src/content/system-design");
const COURSES_DIR = path.join(ROOT, "src/content/courses");
const WIKI_DIR = path.join(ROOT, "src/content/wiki");

function read(file: string) {
  return matter(fs.readFileSync(file, "utf-8"));
}

const caseFiles = fs.existsSync(SYSTEM_DESIGN_DIR)
  ? fs.readdirSync(SYSTEM_DESIGN_DIR).filter((f) => f.endsWith(".mdx")).sort()
  : [];

const cases = caseFiles.map((file) => {
  const { data, content } = read(path.join(SYSTEM_DESIGN_DIR, file));
  return { file, slug: file.replace(/\.mdx$/, ""), data, content };
});

const wikiSlugs = new Set(
  fs.existsSync(WIKI_DIR)
    ? fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""))
    : []
);

describe("system-design cases", () => {
  const TRACKS = ["ml", "agentic", "genai"];

  it.each(cases.map((c) => [c.file, c] as const))(
    "%s has valid frontmatter",
    (_name, c) => {
      expect(typeof c.data.title).toBe("string");
      expect(typeof c.data.description).toBe("string");
      expect(typeof c.data.domain, "domain must be a string").toBe("string");
      expect(typeof c.data.estimatedMinutes).toBe("number");
      expect(Array.isArray(c.data.relatedLessons), "relatedLessons must be an array").toBe(true);

      // `track` (when present) must be a known track.
      if (c.data.track !== undefined) {
        expect(TRACKS.includes(c.data.track), `${c.file} track=${c.data.track}`).toBe(true);
      }
      // The resolved track (`track ?? spine`) must exist and be valid.
      const resolvedTrack = c.data.track ?? c.data.spine;
      expect(TRACKS.includes(resolvedTrack), `${c.file} has no valid track (track ?? spine)`).toBe(true);
      // `spine` is required unless this is a GenAI case (which may be serving/infra).
      if (resolvedTrack !== "genai") {
        expect(SPINE_IDS.includes(c.data.spine), `${c.file} spine=${c.data.spine}`).toBe(true);
      } else if (c.data.spine !== undefined) {
        // A GenAI case that declares a spine must still declare a valid one.
        expect(SPINE_IDS.includes(c.data.spine), `${c.file} spine=${c.data.spine}`).toBe(true);
      }
    }
  );

  it("every spineStages entry is valid for the case's spine", () => {
    const problems: string[] = [];
    for (const c of cases) {
      const stages = c.data.spineStages;
      if (stages === undefined) continue;
      // spineStages require a declared spine to validate against.
      if (c.data.spine === undefined) {
        problems.push(`${c.file}: has spineStages but no spine`);
        continue;
      }
      if (!Array.isArray(stages)) {
        problems.push(`${c.file}: spineStages is not an array`);
        continue;
      }
      if (stages.length < 1 || stages.length > 3) {
        problems.push(`${c.file}: spineStages must have 1–3 entries, has ${stages.length}`);
      }
      if (new Set(stages).size !== stages.length) {
        problems.push(`${c.file}: spineStages has duplicates`);
      }
      for (const stage of stages) {
        if (!isValidStage(c.data.spine, stage)) {
          problems.push(`${c.file}: "${stage}" is not a stage of the "${c.data.spine}" spine`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(cases.map((c) => [c.file, c] as const))(
    "%s follows its track's interview framework skeleton",
    (_name, c) => {
      const fw = getFramework(c.data.track ?? c.data.spine);
      expect(fw, `${c.file} has no framework for its track`).toBeDefined();
      // Only top-level sections; fenced code is stripped so a `## ` inside a
      // code block can never count as a heading.
      const body = c.content.replace(/```[\s\S]*?```/g, "");
      const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
      const expected = [...fw!.steps.map((s) => s.heading), ...fw!.tail];
      expect(headings.length, `${c.file} headings: ${headings.join(" | ")}`).toBe(expected.length);
      expected.forEach((prefix, i) => {
        expect(
          headings[i]?.startsWith(prefix),
          `${c.file}: section ${i + 1} is "${headings[i]}", expected "${prefix}…"`
        ).toBe(true);
      });
    }
  );

  it("every case threads at least 3 <ThinkFirst> pause-points", () => {
    const thin = cases
      .map((c) => [c.file, (c.content.match(/<ThinkFirst\s/g) ?? []).length] as const)
      .filter(([, n]) => n < 3);
    expect(thin).toEqual([]);
  });

  it("every relatedLessons entry resolves to an existing lesson", () => {
    const broken: string[] = [];
    for (const c of cases) {
      for (const ref of c.data.relatedLessons ?? []) {
        const [courseSlug, lessonSlug] = String(ref).split("/");
        const target = path.join(COURSES_DIR, courseSlug ?? "", `${lessonSlug}.mdx`);
        if (!courseSlug || !lessonSlug || !fs.existsSync(target)) {
          broken.push(`${c.file} -> ${ref}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("every <WikiLink slug> and /wiki/<slug> link resolves to a wiki page", () => {
    const WIKILINK_RE = /<WikiLink\s+slug="([^"]+)"/g;
    const MD_WIKI_LINK_RE = /\]\(\/wiki\/([a-z0-9-]+)\)/g;
    const broken: string[] = [];
    for (const c of cases) {
      for (const m of c.content.matchAll(WIKILINK_RE)) {
        if (!wikiSlugs.has(m[1])) broken.push(`${c.file} -> <WikiLink ${m[1]}>`);
      }
      for (const m of c.content.matchAll(MD_WIKI_LINK_RE)) {
        if (!wikiSlugs.has(m[1])) broken.push(`${c.file} -> /wiki/${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
