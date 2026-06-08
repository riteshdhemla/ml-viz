# Add a New Course

Argument: `$ARGUMENTS` — course slug, e.g. `attention-transformers` or a description like `"reinforcement learning basics"`.

Add a complete new course to ml-viz following all established conventions.

## Step 1 — Determine course metadata

If `$ARGUMENTS` is a description rather than a slug, derive the kebab-case slug first.

Ask yourself (or infer from `CLAUDE.md` roadmap):
- What is the course slug? (kebab-case, matches a directory name)
- What difficulty level: `beginner` | `intermediate` | `advanced`?
- What order number puts it correctly in the roadmap sequence?
  - Foundation courses: negative numbers (-3, -2, -1)
  - Beginner ML: 1–5
  - Intermediate ML: 6–10
  - Advanced ML: 11+
- What `coverColor` to use (pick from approved list):
  - `bg-gradient-to-r from-brand-500 to-accent-teal`
  - `bg-gradient-to-r from-brand-600 to-accent-orange`
  - `bg-gradient-to-r from-brand-700 to-accent-rose`
  - `bg-gradient-to-r from-accent-teal to-brand-400`

## Step 2 — Create files

Create the following:

```
src/content/courses/<slug>/
  index.mdx          ← course metadata (frontmatter only, no body)
  01-<title>.mdx     ← lesson 1
  02-<title>.mdx     ← lesson 2
  03-<title>.mdx     ← lesson 3

notebooks/<slug>/
  01-<title>.ipynb   ← companion notebook for lesson 1
  02-<title>.ipynb   ← companion notebook for lesson 2
  03-<title>.ipynb   ← companion notebook for lesson 3
```

### index.mdx frontmatter template
```yaml
---
title: "..."
description: "..."
difficulty: beginner | intermediate | advanced
topics:
  - Topic1
  - Topic2
estimatedHours: N
prerequisites: []
order: N
coverColor: "bg-gradient-to-r from-... to-..."
---
```

### Lesson MDX structure (all lessons must follow this exactly)
1. Strong opening hook (real-world relevance in 1-2 sentences)
2. Concept with intuition before math
3. Display equations with blank lines: `\n\n$$\n...\n$$\n\n`
4. Worked numeric example under `### Worked example`
5. Python code block (runnable, uses `numpy`)
6. At least one `<Callout type="tip|info|warning|success">`
7. `## Key takeaways` section with 4+ bullet points
8. `## Related concepts` section with 2+ `/courses/...` links
9. `<Exercise id="..." />` references (add exercises to registry first)

### Notebook structure (from `prompts/new-lesson.md`)
1. Markdown cell: `# Title` + companion lesson link
2. Code cell: numpy/matplotlib imports + dark style (`plt.rcParams['figure.facecolor'] = '#0f1117'` etc.)
3. Alternating markdown (concept) + code (implementation) cells
4. At least one `plt.show()` visualization
5. Final cell: "try it yourself" mini-challenge

## Step 3 — Add exercises to the registry

Append typed entries to `src/lib/exercises.ts` for every `<Exercise id>` referenced in lessons.
ID convention: `<course-prefix>-<concept>`, e.g. `attn-self-attention`, `rl-q-learning`.
Each lesson should have 2–3 exercises.

## Step 4 — Update courses page (if needed)

- If the course has `order < 0`: it automatically appears in the Foundations section (no code change needed)
- Otherwise: it automatically appears under the correct difficulty section

## Step 5 — Verify

Run:
```bash
npm test
npm run build
```

Both must pass with no errors before considering the course complete.
