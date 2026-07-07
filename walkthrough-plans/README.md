# Colab Notebook Walkthrough Program

**Goal:** turn every notebook in `notebooks/` from a "here's the code" reference
into a **detailed code walkthrough** — a reader who runs the cells top-to-bottom
should understand *what each block does, why it's written that way, and what to
look for in the output*, without needing the companion lesson open.

This directory tracks that work:

- **`CHECKLIST.md`** — master status list of all notebooks, grouped by course in
  roadmap order. One line per notebook: `[ ]` todo, `[~]` plan written, `[x]` done.
- **`<course>/<lesson>.md`** — a short content plan written *before* editing each
  notebook. Scopes the walkthrough: current gaps, target cell-by-cell narration,
  and any new cells to add. The notebook is then updated to match the plan.

## What "detailed code walkthrough" means (the standard)

Every notebook is edited to satisfy these rules. Existing good content is kept;
we add narration and structure, we do **not** rewrite working code for its own sake.

1. **Every non-trivial code cell is preceded by a markdown cell** that says, in
   plain language: what this cell computes, and why it's the next step. One or two
   short paragraphs — not a heading alone.
2. **Walk the code, not just the concept.** The prose names the key variables and
   operations the reader will see in the cell ("we build `W1` with He scaling,
   then...") so the code reads as an illustration of the sentence above it.
3. **Inline comments explain the non-obvious line**, especially array shapes,
   broadcasting, indexing tricks, and any math-to-code translation. Shapes are
   annotated (`# (batch, seq, d_model)`).
4. **After a plot or a computation with output, a markdown cell says what to
   observe** — the takeaway the visualization or numbers are meant to land.
5. **Structure is scannable:** a `##` section per concept, short markdown lead-ins,
   a "Key takeaways" recap near the end.
6. **Preserve the existing scaffolds:** the standard header (title + lesson
   back-link + Copy-to-Drive note), the dark matplotlib style cell, the
   "✏️ Your turn" exercise section, and any "🔬 Extra practice" bank stay intact.
7. **Cells stay runnable and deterministic** — seeds are set, no cell depends on
   state defined only in prose, imports precede use.

## Definition of done (per notebook)

- [ ] Plan file exists under `walkthrough-plans/<course>/<lesson>.md`
- [ ] Every code cell has a markdown lead-in that walks through it
- [ ] Plots/outputs have a "what to notice" follow-up
- [ ] Shapes/non-obvious lines are commented
- [ ] Header, style cell, and exercise scaffolds preserved
- [ ] Notebook JSON is valid and re-serialized cleanly
- [ ] Checkbox flipped to `[x]` in `CHECKLIST.md`

## Working order

Course-by-course in roadmap order (foundations first), finishing with the
`wiki/` deep-dives. Within a course, lesson order.
