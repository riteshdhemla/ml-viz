# Task: Give a course the educative.io Socratic + grounding treatment

Upgrade the lessons of an existing course to teach **ask-first** (predict before
reveal) and to be **grounded in primary sources**, matching the treatment the
`/system-design` cases already have. This is **additive**: the lessons already
have worked examples, `*Viz` components, `<Exercise>` blocks, callouts, key
takeaways, and notebooks — **keep all of it**. You are layering three things on
top, not rewriting.

## What to add to each **concept** lesson (`type: concept | playground`)

1. **Predict-before-reveal (`<ThinkFirst>`), 2–4 per lesson.** Place each at the
   END of the section *before* the one that answers it, at a genuine conceptual
   fork — a computation whose result the reader should predict, a "why does X
   break?" moment, a design-choice fork. The question is concrete (numbers, a
   scenario, "what happens when…"), never a definition quiz; the collapsed answer
   is 2–4 sentences that reward having thought.

   ```mdx
   <ThinkFirst question="Push z = 7 through a sigmoid — closer to 0.5, 0.9, or 0.999? What does that say about the gradient there?">
   ≈0.999 — deep in saturation. The sigmoid derivative is y(1−y) ≈ 0.001, so a
   neuron in this regime passes almost no gradient back; this is the vanishing-
   gradient trap that motivates ReLU.
   </ThinkFirst>
   ```
   - Do **not** duplicate an existing `<Exercise>` — ThinkFirst is a lightweight
     mid-flow prediction; Exercises are graded checks. They complement.
   - **Never place two `<ThinkFirst>` back-to-back** — each needs elaboration after.

2. **Grounding + inline citations (~3–6 per lesson).** Where the lesson states a
   method's origin, a named result, or a best practice, cite the primary source
   inline as a sparse markdown link, e.g. `([He et al., 2015](https://arxiv.org/abs/1502.01852))`.
   Prefer the paper that *introduced* the idea. **Verify every URL** (arXiv id,
   DOI, or canonical page) before using it — no hallucinated links.

3. **`## Further reading` section**, placed after **Key takeaways** and before
   **Related concepts** (if present). 4–6 verified primary sources:

   ```mdx
   ## Further reading

   - [Exact Title](https://…) — Author/venue, one clause on what it grounds.
   ```

4. **Frontmatter:** bump `estimatedMinutes` by +2–4 if the lesson grew
   materially. Do **not** change `title`, `order`, `type`, or `spineStages`.
   After finishing all lessons in the course, recompute the course
   `index.mdx` `estimatedHours` = round-to-nearest-0.5 of
   `(sum of lesson estimatedMinutes × 2.5) / 60`.

## Quizzes (`type: quiz`)

Leave them alone — no `<ThinkFirst>`, no spineStages. Optionally add a short
`## Further reading` if it genuinely helps, but don't force it.

## Hard constraints

- **`blockJS: true`** — plain-string props only on components; no JS expressions
  or inline objects (they get stripped and crash the build).
- **No `<` immediately before a digit or letter in body text** — MDX parses `<5`
  or `<n` as a JSX tag and the build fails. Write "under 5", "sub-100 ms", or
  escape as `&lt;`. (Frontmatter and quoted `prop="<800ms"` values are fine.)
- **Registered components only:** `Callout`, `Details`, `ThinkFirst`,
  `WikiLink`, `Exercise`, and any `*Viz` already in `mdxComponents.tsx`. Do
  **not** add a new `<WikiLink slug>` unless `src/content/wiki/<slug>.mdx` exists.
- Preserve KaTeX (`$…$` / `$$…$$`) and all existing tags and structure.
- Keep the quality bar high: concise, technical, no filler, every added fact
  traceable to a Further-reading source.

## Verify (per course)

```bash
npm run type-check
npm test -- spine-integrity
npm run build            # compiles every MDX; catches stray-tag breaks
```
