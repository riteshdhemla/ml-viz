# Colab Notebook Walkthrough Program

**Goal:** turn every notebook in `notebooks/` into a **detailed, self-contained code
walkthrough** — a reader who runs the cells top-to-bottom should understand the idea,
see it built from scratch, see how it's done for real with a library, know when to
reach for it and when not to, and get a chance to code it themselves.

This directory tracks the work:

- **`CHECKLIST.md`** — master status list, grouped by course in roadmap order.
  `[ ]` todo · `[~]` plan written · `[x]` done.
- **`<course>/<lesson>.md`** — a content plan written *before* editing each notebook:
  which of the template sections it needs, what each will contain, and the gaps in
  the current version. The notebook is then updated to match.

## The template (7 parts)

Every **algorithm / method** notebook is built to this shape:

0. **Header + Intuition** — keep the existing title, lesson back-link, and
   Copy-to-Drive note; add a 2–4 sentence *intuition*: the problem it solves, the
   core idea in plain words, and where it shows up in practice.
1. **From scratch** — a NumPy implementation with **math→code narration** and shapes
   annotated (`# (batch, seq, d_model)`). Built up incrementally over a few cells,
   each with a markdown lead-in that walks the code — not one monolithic block.
2. **The library way** — the real-world equivalent (scikit-learn / PyTorch / SciPy /
   statsmodels …), **plus an explicit check that the from-scratch result matches**
   the library (`np.allclose(...)`, side-by-side numbers, or overlaid plots). This
   teaches the production API *and* validates the hand-rolled version.
3. **Visualize it** — the figure(s) that make the algorithm stick (decision boundary,
   convergence curve, geometry, learned representation). Each plot is followed by a
   "what to notice" markdown cell. Visuals may be interleaved with §1 where natural.
4. **Tradeoffs & when to use it** — a scannable **pros/cons table**, the
   **computational complexity** (time and space), the **key hyperparameters** and
   what they trade off, and the **common failure modes / pitfalls**. This is the
   section most references skip and the one that sticks best.
5. **Your turn** — the coding exercise: keep the existing `✏️ Your turn` scaffolds
   (concept recap → `# TODO(you)` outline → silent `assert` check → `<details>`
   solution) and any `🔬 / 🎯 Extra practice` DML banks.
6. **Key takeaways** — a short recap (bullets) + links to the next lesson / related
   wiki.

### Flex by notebook type

Not every notebook is an algorithm. Adapt, don't force:

- **Algorithm / model lessons** (k-means, SVM, backprop, attention, PPO, …): full
  7-part template.
- **Foundations & concept explainers** (linear algebra, calculus, "what is a
  neuron"): §1 becomes *by-hand / from-first-principles*; §2 becomes *the library
  one-liner that does the same thing, cross-checked*; §4 becomes
  **"limitations / when it breaks / numerical gotchas"** (conditioning, floating
  point, degenerate inputs) rather than pros/cons; keep intuition, viz, exercise,
  takeaways.
- **Applied / systems / LLM lessons** (RAG, agents, MLOps, prompting): §1 is a
  minimal working implementation of the pattern; §2 is the framework/SDK version;
  §4 is *design tradeoffs, cost/latency, and failure modes*.
- **Wiki deep-dives**: procedure from scratch + worked trace + gotchas + exercise;
  library section only if one genuinely applies.

## Invariants (all notebooks)

- Every code cell has a markdown lead-in that walks it; plots/outputs have a
  follow-up takeaway.
- Cells stay runnable and deterministic (seeds set; imports precede use). No cell
  depends on state defined only in prose.
- Preserve the header, the dark-matplotlib style cell, and the exercise scaffolds.
- Notebook JSON stays valid and round-trips cleanly (source-as-string, `indent=1`).

## Definition of done (per notebook)

- [ ] Plan file exists and lists the template sections used
- [ ] Intuition opener present
- [ ] From-scratch implementation, narrated
- [ ] Library version **with a match/validation check** (where applicable)
- [ ] Visualization(s) with "what to notice"
- [ ] Tradeoffs / gotchas section (pros-cons table + complexity + pitfalls)
- [ ] Exercise scaffolds preserved
- [ ] Key takeaways recap
- [ ] Concept cells verified to run; JSON valid
- [ ] Checkbox flipped to `[x]` in `CHECKLIST.md`

## Working order

Course-by-course in roadmap order (foundations first), finishing with `wiki/`.
Within a course, lesson order.
