import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { getAllProjects } from "@/lib/projects";

const ROOT = process.cwd();
const COURSES_DIR = path.join(ROOT, "src/content/courses");

const projects = getAllProjects();
const slugs = projects.map((p) => p.slug);

describe("projects registry", () => {
  it("has projects", () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it("every project slug is unique", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(projects.map((p) => [p.slug, p] as const))(
    "%s has valid metadata",
    (_slug, p) => {
      expect(typeof p.title).toBe("string");
      expect(typeof p.tagline).toBe("string");
      expect(typeof p.builds).toBe("string");
      expect(typeof p.number).toBe("number");
      expect(["beginner", "intermediate", "advanced"]).toContain(p.difficulty);
      expect(p.skills.length).toBeGreaterThan(0);
      expect(p.stages.length).toBeGreaterThan(0);
    }
  );

  it("every stage references a lesson, a project, or is flagged as a gap", () => {
    const orphans: string[] = [];
    for (const p of projects) {
      for (const s of p.stages) {
        if (s.lessons.length === 0 && !s.projectLink && !s.gap) {
          orphans.push(`${p.slug} -> "${s.title}"`);
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it("every lesson reference resolves to an existing lesson file", () => {
    const broken: string[] = [];
    for (const p of projects) {
      for (const s of p.stages) {
        for (const l of s.lessons) {
          const target = path.join(COURSES_DIR, l.course, `${l.lesson}.mdx`);
          if (!fs.existsSync(target)) {
            broken.push(`${p.slug} / "${s.title}" -> ${l.course}/${l.lesson}`);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("every projectLink resolves to a known project", () => {
    const broken: string[] = [];
    for (const p of projects) {
      for (const s of p.stages) {
        if (s.projectLink && !slugs.includes(s.projectLink)) {
          broken.push(`${p.slug} / "${s.title}" -> ${s.projectLink}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("every external resource URL is a well-formed https URL", () => {
    const bad: string[] = [];
    for (const p of projects) {
      for (const s of p.stages) {
        for (const res of [s.explainer, s.repo]) {
          if (!res) continue;
          if (!/^https:\/\/\S+$/.test(res.url)) {
            bad.push(`${p.slug} / "${s.title}" -> ${res.name}: ${res.url}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("every prerequisite is an existing course", () => {
    const courseDirs = new Set(
      fs
        .readdirSync(COURSES_DIR)
        .filter((d) => fs.statSync(path.join(COURSES_DIR, d)).isDirectory())
    );
    const broken: string[] = [];
    for (const p of projects) {
      for (const pre of p.prerequisites) {
        if (!courseDirs.has(pre)) broken.push(`${p.slug} -> ${pre}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
