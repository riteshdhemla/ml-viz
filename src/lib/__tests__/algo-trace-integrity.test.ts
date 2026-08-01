import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { allAlgoTraces, getAlgoTrace } from "@/lib/algo-traces";
import { validateTrace } from "@/lib/algo-traces/util";

/**
 * Integrity rules for algorithm traces (the algo-viz-style steppable players):
 * every registered trace must be internally consistent, every
 * `<AlgorithmTrace id>` used in content must resolve, and every registered
 * trace must actually be referenced somewhere — an unreferenced trace is dead
 * weight in the client bundle.
 */

const ROOT = process.cwd();
const CONTENT_DIRS = ["src/content/wiki", "src/content/courses", "src/content/system-design"];

/** Every .mdx file under src/content, recursively. */
function mdxFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return mdxFiles(rel);
    return entry.name.endsWith(".mdx") ? [rel] : [];
  });
}

const contentFiles = CONTENT_DIRS.flatMap(mdxFiles);

/** Every `<AlgorithmTrace id="..." />` reference in content, with its source file. */
const references = contentFiles.flatMap((file) => {
  const body = fs.readFileSync(path.join(ROOT, file), "utf-8");
  return [...body.matchAll(/<AlgorithmTrace\s+id="([^"]+)"/g)].map((m) => ({ file, id: m[1] }));
});

describe("algo traces", () => {
  it("registers at least one trace", () => {
    expect(allAlgoTraces.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = allAlgoTraces.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allAlgoTraces.map((t) => [t.id, t] as const))("%s is internally consistent", (_id, trace) => {
    expect(validateTrace(trace)).toEqual([]);
  });

  it.each(allAlgoTraces.map((t) => [t.id, t] as const))("%s has usable metadata", (_id, trace) => {
    expect(trace.title.length).toBeGreaterThan(10);
    // The caption carries the "what to watch for" framing — keep it substantial.
    expect(trace.caption.length).toBeGreaterThan(80);
    expect(trace.code.length).toBeGreaterThan(3);
  });

  it.each(allAlgoTraces.map((t) => [t.id, t] as const))(
    "%s highlights a code line on every frame",
    (_id, trace) => {
      // The point of the player is code ↔ state correspondence; a frame with no
      // line leaves the code panel blank and breaks the illusion of execution.
      const blank = trace.frames.filter((f) => !f.l || f.l.length === 0);
      expect(blank).toEqual([]);
    }
  );

  it.each(allAlgoTraces.map((t) => [t.id, t] as const))(
    "%s steps through enough of the algorithm to be worth stepping",
    (_id, trace) => {
      expect(trace.frames.length).toBeGreaterThanOrEqual(6);
    }
  );
});

describe("algo trace references in content", () => {
  it("resolves every <AlgorithmTrace id> used in content", () => {
    const broken = references.filter((r) => !getAlgoTrace(r.id));
    expect(broken).toEqual([]);
  });

  it("has no unreferenced traces", () => {
    const used = new Set(references.map((r) => r.id));
    const orphans = allAlgoTraces.map((t) => t.id).filter((id) => !used.has(id));
    expect(orphans).toEqual([]);
  });
});
