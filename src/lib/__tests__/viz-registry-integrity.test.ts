import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Visualizations are registered in two places, because that is what keeps them
 * out of every page's bundle:
 *
 *   - `visualizations/lazy-viz.tsx` — the client module holding the `import()`
 *     for each viz, so webpack gives each one its own chunk.
 *   - `mdx/mdxComponents.tsx` — the MDX tag → `LazyViz` binding.
 *
 * A viz present in one and missing from the other fails at runtime, not at
 * build time, so it is checked here instead.
 */

const ROOT = process.cwd();
const LAZY_VIZ = path.join(ROOT, "src/components/visualizations/lazy-viz.tsx");
const MDX_COMPONENTS = path.join(ROOT, "src/components/mdx/mdxComponents.tsx");
const CONTENT_DIR = path.join(ROOT, "src/content");

const lazyVizSource = fs.readFileSync(LAZY_VIZ, "utf-8");
const mdxComponentsSource = fs.readFileSync(MDX_COMPONENTS, "utf-8");

/** Names with a lazy loader: `  KMeansViz: dynamic(() => import("…")…` */
const loaderNames = new Set(
  [...lazyVizSource.matchAll(/^ {2}(\w+): dynamic\(/gm)].map((m) => m[1])
);

/** Names bound to an MDX tag: `  KMeansViz: viz("KMeansViz"),` */
const registeredNames = new Set(
  [...mdxComponentsSource.matchAll(/^ {2}(\w+): viz\("(\w+)"\),$/gm)].map((m) => {
    expect(m[1], "MDX tag and LazyViz name must match").toBe(m[2]);
    return m[1];
  })
);

/** Every `<SomethingViz …>` tag used anywhere in content. */
function mdxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return mdxFiles(full);
    return entry.name.endsWith(".mdx") ? [full] : [];
  });
}

const usedInContent = mdxFiles(CONTENT_DIR).flatMap((file) =>
  [...fs.readFileSync(file, "utf-8").matchAll(/<(\w+Viz)[\s/>]/g)].map((m) => ({
    file: path.relative(ROOT, file),
    name: m[1],
  }))
);

describe("visualization registry", () => {
  it("registers a lazy loader for every MDX viz tag", () => {
    const missing = [...registeredNames].filter((n) => !loaderNames.has(n));
    expect(missing, `no loader in lazy-viz.tsx for: ${missing.join(", ")}`).toEqual([]);
  });

  it("binds an MDX tag for every lazy loader", () => {
    const missing = [...loaderNames].filter((n) => !registeredNames.has(n));
    expect(missing, `no MDX tag in mdxComponents.tsx for: ${missing.join(", ")}`).toEqual([]);
  });

  it("resolves every viz used in content", () => {
    const unresolved = usedInContent.filter((u) => !registeredNames.has(u.name));
    expect(
      unresolved.map((u) => `${u.file}: <${u.name}>`),
      "content references a visualization that is not registered"
    ).toEqual([]);
  });

  it("has at least one loader", () => {
    expect(loaderNames.size).toBeGreaterThan(50);
  });
});
