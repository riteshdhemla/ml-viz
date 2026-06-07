# Prompt: Add a New ML Visualization

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add an interactive D3.js visualization for **[CONCEPT NAME]** to the ml-viz website.

**Location:** `src/components/visualizations/[ConceptName]/[ConceptName]Viz.tsx`

**What it should show:**
[Describe what the visualization should display and how it works]

**Interactive controls (if any):**
[List sliders, buttons, or inputs the user should be able to adjust]

**Requirements:**
- Mark `"use client"` at the top
- Use `useRef<SVGSVGElement>` and D3 in a `useEffect` for rendering
- Accept `className?: string` and `animated?: boolean` props
- Wrap in `<div className="not-prose card-glass p-4 my-6">`
- Use `cn()` from `@/lib/utils` for class merging
- Use the design tokens from tailwind.config.ts (brand-500, surface-card, etc.)
- Export the component and add it to `src/components/mdx/mdxComponents.tsx`

**After creating the file, also:**
1. Import it in `src/components/mdx/mdxComponents.tsx`
2. Add it to the `mdxComponents` object
3. Add it to the playground page at `src/app/playground/page.tsx`

See `src/components/visualizations/NeuralNetwork/NeuralNetworkViz.tsx` as a reference example.
