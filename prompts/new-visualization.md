# Prompt: Add a New ML Visualization

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add an interactive visualization for **[CONCEPT NAME]** to the ml-viz website.

**Location:** `src/components/visualizations/[ConceptName]/[ConceptName]Viz.tsx`

**What it should show:**
[Describe what the visualization should display and how it works]

**Interactive controls (if any):**
[List sliders, buttons, or inputs the user should be able to adjust]

**Requirements:**
- Mark `"use client"` at the top
- Draw with **plain SVG** — no D3. Map data → pixels with `scale()` from the kit
- Animate with React state + `useAnimationLoop` (or a `setInterval` for discrete
  steps like K-Means / gradient descent). Generate any data deterministically
  with `seededRandom` / `gaussian` so the viz looks identical on every render
- Accept a `className?: string` prop
- Wrap output in `<VizFrame title=... caption=... className={className}>` and use
  `VizSlider` / `VizButton` / `VizStat` for controls (all from
  `@/components/visualizations/viz-kit`)
- Use the `VIZ` colour tokens (they mirror tailwind.config.ts: brand, teal, rose…)
- Use a named export matching the filename (`export function KMeansViz`)

**After creating the file, also:**
1. Register it in **two** places. Both are required, and the split is what keeps
   the viz out of every other page's bundle (see "Bundle rules" in `CLAUDE.md`):
   - `src/components/visualizations/lazy-viz.tsx` — a `dynamic()` loader:
     ```ts
     KMeansViz: dynamic(() => import("@/components/visualizations/KMeans/KMeansViz").then((m) => m.KMeansViz)) as ComponentType<VizProps>,
     ```
   - `src/components/mdx/mdxComponents.tsx` — the tag binding:
     `KMeansViz: viz("KMeansViz"),`

   **Never import a viz directly into `mdxComponents.tsx`.** It is a server
   module reachable from all 331 content pages, so a direct import — or even
   `next/dynamic` used *there* — puts the component in the shared client graph
   of every lesson, wiki page and case study. The `import()` has to live in
   `lazy-viz.tsx`, which is a client module, for webpack to split it out.
2. Reference it from the relevant lesson MDX with a self-closing tag,
   e.g. `<KMeansViz />`
3. Update the "Visualization Components Built" table in `CLAUDE.md`
4. Run `npx vitest run viz-registry-integrity` — it fails if the two registries
   drift or if content references a viz that is not registered

See `src/components/visualizations/KMeans/KMeansViz.tsx` (animated, stepped) or
`src/components/visualizations/ActivationFunction/ActivationFunctionViz.tsx`
(slider-driven) as reference examples, and `viz-kit.tsx` for the shared helpers.
