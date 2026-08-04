# Prompt: Add a New Guided Walkthrough

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add a **guided walkthrough** for **[CONCEPT NAME]** to the ml-viz website.

**Location:** `src/components/visualizations/[ConceptName]/[ConceptName]Viz.tsx`

**The pipeline stages it should walk:**
[List the stages in order, and for each: what it produces, and what was broken
before it existed]

---

## When this format is the right one

The kit has three teaching formats. Pick deliberately:

| Format | Answers | Reach for it when |
|---|---|---|
| Plain viz (`VizFrame` + sliders) | *"What does this look like?"* | The concept is a **shape** and the lesson is "drag this, watch that" |
| `<AlgorithmTrace>` | *"What does this code do, line by line?"* | The concept is a **procedure** with real intermediate numbers |
| `<GuidedViz>` | *"What are the stages, and why does each exist?"* | The concept is a **pipeline of stages that build on each other** |

Use `GuidedViz` when a single static picture would have to show every stage at
once, and the reader can't understand stage *n* before seeing what stage *n−1*
produced. **Do not force it onto a parameter explorer** — if the whole point is
one slider and one curve, plain `VizSlider` controls are better and shorter.

## Requirements

- `"use client"`, plain SVG, `className?: string` prop — the standard viz rules
  from `prompts/new-visualization.md` all still apply
- Import from `../GuidedViz/GuidedViz`:
  `GuidedViz`, `GuidedCard`, `GuidedPayoff`, `GuidedEmpty`, `GuidedLegend`,
  `useStagger`, and the `GuidedPhase` / `GuidedStep` types
- Colours from the `VIZ` token map as usual

## Writing the steps — this is the actual work

The component is easy; the narrative is what makes it teach. Per step:

1. **`title`** — a claim, not a noun phrase. "Cluster the graph into communities"
   beats "Community detection".
2. **`body`** — one or two short paragraphs. Say what the stage *does*, then say
   **what was broken without it**. That second sentence is the whole pedagogy;
   a step that only describes machinery has wasted itself.
3. **`hint`** — one line telling the reader what to **do** ("Click any entity to
   expand its neighbourhood") or what to **notice** ("The shape readout below is
   identical at every step"). This is what turns a diagram into a walkthrough.
   Omit it only when the picture is genuinely self-evident.
4. **`label`** — two or three words for the tab strip.

**Group steps into phases.** A phase is a named part of the pipeline with its own
colour and its own numbering (`numberPrefix: "Q"` gives Q1, Q2 …). Two or three
phases is typical: offline vs. online, forward vs. backward, build vs. query.

**End with a payoff step.** The last step should change one thing and show the
consequence, or state plainly what the pipeline bought that the naive approach
could not reach. Put the punchline in a `<GuidedPayoff>` card so it reads as the
conclusion it is. A walkthrough that just stops after the last stage has thrown
away its ending.

**Make one step interactive** where you can. In `GraphRAGViz` the local-search
step lets you click any entity and recomputes the assembled context from the real
adjacency — the reader tests the claim instead of reading it.

## The pieces

```tsx
<GuidedViz
  title="…"
  caption="…"                     // the standing explanation, as in any VizFrame
  phases={PHASES}                 // GuidedPhase[]: id, label, tone, numberPrefix
  steps={STEPS}                   // GuidedStep[]: phase, label, title, body, hint
  controls={<VizButton … />}      // optional: applies to every step (a mode toggle)
  stage={(i) => <svg … />}        // the picture for step i
  stageNote={(i) => "…"}          // optional right-hand header, e.g. the live query
  panel={(i) => …}                // optional cards under the stage
  legend={(i) => <GuidedLegend … />}
  onStepChange={setStep}          // so the component can reset per-step state
/>
```

- **`panel`** should *accumulate* — show the state the pipeline has produced so
  far, so the reader sees the index being built rather than six unrelated
  pictures. `GuidedCard` for units of state, `GuidedEmpty` for "nothing here
  yet", `GuidedPayoff` for the punchline.
- **`useStagger(n, ms, key)`** reveals `n` cards one at a time so a fan-out or a
  map-reduce reads as a sequence. It jumps straight to the end under
  `prefers-reduced-motion` and resets when `key` changes — pass the step index.
- **Derive the numbers.** Same rule as algorithm traces: if the panel claims 67%
  of the parameters are in the FFN, compute it from the constants in the file.
  Hand-written numbers rot silently and teach the wrong thing.

## After creating the file

1. Import it in `src/components/mdx/mdxComponents.tsx` and add it to the
   `mdxComponents` object
2. Reference it from the lesson MDX with a self-closing tag, plus a lead-in
   sentence telling the reader what to look for while they walk it
3. Update the "Visualization Components Built" table in `CLAUDE.md` (mark the
   Format column **guided**)

**Reference implementations:**
`src/components/visualizations/GraphRAG/GraphRAGViz.tsx` — six steps in two
phases, an interactive step and an animated map-reduce step.
`src/components/visualizations/TransformerBlock/TransformerBlockViz.tsx` — a
single-phase walk down a stack, with an orthogonal mode toggle in `controls`.
