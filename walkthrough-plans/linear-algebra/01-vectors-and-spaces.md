# Plan — linear-algebra/01-vectors-and-spaces  (foundations flex)

## Type: Foundations / concept explainer → flexed template

## Sections
0. **Header + Intuition** — keep header; add: every feature row, embedding, and
   gradient in ML *is* a vector; the dot product is the one primitive that length,
   angle, similarity, and projection are all built from.
1. **From scratch** — implement `add`, `scale`, `dot`, `norm` by hand (explicit
   formulas / a Python loop for the dot product) and print them for `u,v`.
2. **The library way + validation** — the same four via `np.dot` / `np.linalg.norm`,
   with `assert`s that the hand versions match; then the dot→angle formula with the
   `np.clip` guard.
3. **Visualize** — keep both existing figures (addition + orthogonality; three
   vectors + unit circle), each with a "what to notice"; plus the norms, cosine
   (word embeddings), projection, and rank/span sections.
4. **Limitations & numerical gotchas** (replaces pros/cons for a concept nb) —
   zero-vector normalization divides by zero; `arccos` needs the clip; cosine
   ignores magnitude by design; distances concentrate in high dimensions.
   Small runnable demo for the first two.
5. **Your turn** — keep Exercise 1 (cosine), Exercise 2 (projection), and the DML
   vector-operations bank untouched.
6. **Key takeaways** — new recap bullets + link to Matrices lesson.

## Gaps vs current
Current version (already narrated) lacks: intuition opener, an explicit
scratch-vs-library framing with a validation check, a gotchas/limitations section,
and a key-takeaways recap. Reuse existing figures, norms/cosine/projection/rank
code, and all exercises verbatim.

## Done when
All 7 (flexed) sections present; scratch matches library via assert; figures have
takeaways; gotchas + recap added; concept cells run; JSON valid.
