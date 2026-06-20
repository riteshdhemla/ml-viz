# Prompt: Add a New Wiki Page (Concept Wiki)

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add a new Concept Wiki page to the ml-viz website. Wiki pages are deep-dive
reference pages for algorithms/procedures that would clutter a lesson's
narrative flow — the lesson keeps a short summary and links out.

**File:** `src/content/wiki/[kebab-slug].mdx`

**Page details:**
- Title: [PAGE TITLE]
- Concept: [WHAT ALGORITHM/PROCEDURE IT COVERS]
- Source lesson(s): [courseSlug/lessonSlug THAT WILL LINK HERE]
- Estimated time: [N] minutes

**Frontmatter:**

```yaml
---
title: "..."
description: "..."
topics: ["topic-tag"]          # first tag = grouping key on the /wiki index
relatedLessons:
  - "courseSlug/lessonSlug"    # drives the "Referenced by" footer
estimatedMinutes: N
---
```

**Content requirements:**
- Full algorithm procedure as numbered steps — every step explicit
- At least one complete worked trace with concrete numbers
- LaTeX math (`$$...$$` display, `$...$` inline)
- A `<Callout>` for the key insight or common pitfall
- "Related concepts" section linking back to lessons with plain markdown links
- Visualization components from `mdxComponents.tsx` are available if relevant

**Companion notebook:** `notebooks/wiki/[kebab-slug].ipynb`
1. Markdown cell: title + back-link to `https://ml-viz-ruby.vercel.app/wiki/[slug]`
2. Code cell: imports + dark matplotlib style
3. From-scratch implementation of the procedure (NumPy, no frameworks)
4. A visualization of the algorithm's behaviour
5. "✏️ Your turn" scaffold: concept recap, `# TODO(you)` code outline, silent
   `assert` cell, `<details>` solution cell

**Lesson-side link:** trim the source lesson to a 2–4 sentence intuition
summary, then add:

```mdx
<WikiLink slug="[kebab-slug]" title="[PAGE TITLE]" />
```

(Plain string props only — lesson MDX runs with `blockJS: true`.)

**After trimming the lesson:** reduce its `estimatedMinutes` frontmatter and
recompute the course's `estimatedHours` (round to nearest 0.5 of
(Σ lesson minutes × 2.5) / 60).

**Verification:**
- `npm run type-check && npm run build`
- `npm test` — `wiki-integrity.test.ts` enforces: WikiLink slugs resolve,
  relatedLessons exist, notebook present
