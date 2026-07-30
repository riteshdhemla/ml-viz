# Task: Give a course the educative.io grounding treatment

Upgrade the lessons of an existing course to be **grounded in primary sources**,
matching the source-grounding the `/system-design` cases already have. This is
**additive**: the lessons already have worked examples, `*Viz` components,
`<Exercise>` blocks, callouts, key takeaways, and notebooks — **keep all of it**.
You are layering grounding + references on top, not rewriting.

> **Do NOT add `<ThinkFirst>` blocks to course lessons.** The predict-before-reveal
> component stays on the `/system-design` cases only; courses get grounding and
> references, not hidden-answer prompts.

## What to add to each **concept** lesson (`type: concept | playground`)

1. **Grounding + inline citations (~3–6 per lesson).** Where the lesson states a
   method's origin, a named result, or a best practice, cite the primary source
   inline as a sparse markdown link, e.g. `([He et al., 2015](https://arxiv.org/abs/1502.01852))`.
   Prefer the paper that *introduced* the idea. **Verify every URL** (arXiv id,
   DOI, or canonical page) before using it — no hallucinated links.

2. **`## Further reading` section**, placed after **Key takeaways** and before
   **Related concepts** (if present). 4–6 verified primary sources:

   ```mdx
   ## Further reading

   - [Exact Title](https://…) — Author/venue, one clause on what it grounds.
   ```

3. **Optional light prose tightening** where a claim is vague or hand-wavy —
   sharpen it against the source you're citing. Keep it concise and technical;
   do not pad or restructure a lesson that already reads well.

4. **Frontmatter:** bump `estimatedMinutes` by +1–2 only if the lesson grew
   materially. Do **not** change `title`, `order`, `type`, or `spineStages`.
   After finishing all lessons in the course, recompute the course
   `index.mdx` `estimatedHours` = round-to-nearest-0.5 of
   `(sum of lesson estimatedMinutes × 2.5) / 60`.

## Quizzes (`type: quiz`)

Leave them alone. Optionally add a short `## Further reading` if it genuinely
helps, but don't force it.

## Hard constraints

- **`blockJS: true`** — plain-string props only on components; no JS expressions
  or inline objects (they get stripped and crash the build).
- **No `<` immediately before a digit or letter in body text** — MDX parses `<5`
  or `<n` as a JSX tag and the build fails. Write "under 5", "sub-100 ms", or
  escape as `&lt;`. (Frontmatter and quoted `prop="<800ms"` values are fine.)
- **Registered components only:** `Callout`, `Details`, `WikiLink`, `Exercise`,
  and any `*Viz` already in `mdxComponents.tsx`. Do **not** add a new
  `<WikiLink slug>` unless `src/content/wiki/<slug>.mdx` exists.
- Preserve KaTeX (`$…$` / `$$…$$`) and all existing tags and structure.
- Keep the quality bar high: concise, technical, no filler, every added fact
  traceable to a Further-reading source.

## Verify (per course)

```bash
npm run type-check
npm test -- spine-integrity
npm run build            # compiles every MDX; catches stray-tag breaks
```
