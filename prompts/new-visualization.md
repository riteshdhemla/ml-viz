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
- Export the component and add it to `src/components/mdx/mdxComponents.tsx`

**After creating the file, also:**
1. Import it in `src/components/mdx/mdxComponents.tsx` and add it to the
   `mdxComponents` object
2. Reference it from the relevant lesson MDX with a self-closing tag,
   e.g. `<KMeansViz />`
3. Update the "Visualization Components Built" table in `CLAUDE.md`

See `src/components/visualizations/KMeans/KMeansViz.tsx` (animated, stepped) or
`src/components/visualizations/ActivationFunction/ActivationFunctionViz.tsx`
(slider-driven) as reference examples, and `viz-kit.tsx` for the shared helpers.
