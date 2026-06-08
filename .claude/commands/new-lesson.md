# Add a New Lesson

Argument: `$ARGUMENTS` — course slug and lesson description, e.g. `linear-algebra "singular value decomposition"`.

Add a single lesson to an existing course, with companion notebook and exercises.

## Derive the lesson slug

1. Check existing lessons in `src/content/courses/<course>/` to find the next order number
2. Slug format: `NN-kebab-title.mdx` where NN is the two-digit order (01, 02, 03...)
3. Set `order` in frontmatter to the same integer as NN

## Create the MDX lesson file

`src/content/courses/<course>/NN-<slug>.mdx`

Required frontmatter:
```yaml
---
title: "..."
description: "One sentence that appears in the lesson list."
order: NN
type: concept
estimatedMinutes: N
---
```

### Lesson body must include (in this order):
1. `# Title` — matches frontmatter title
2. Opening hook: 2-3 sentences on real-world relevance
3. Core content: intuition → math → code
4. Every display equation surrounded by blank lines:
   ```
   
   $$
   f(x) = ...
   $$
   
   ```
5. `### Worked example` — numeric step-by-step
6. ` ```python ` code block with runnable numpy code
7. `<Callout type="tip|info|warning|success">` block
8. `## Key takeaways` with 4+ bullet points
9. `## Related concepts` with 2+ `/courses/<course>/<lesson>` links
10. `<Exercise id="..." />` blocks (reference registry, never inline objects)

## Create the companion notebook

`notebooks/<course>/NN-<slug>.ipynb`

Valid nbformat v4 JSON. Cells in order:
1. Markdown: `# Lesson Title` + `**Companion lesson:** <url>`
2. Code: imports + dark matplotlib style
3. 3+ pairs of (markdown concept cell, runnable code cell)
4. Code cell with `plt.show()` visualization
5. Markdown + code "try it yourself" cell

Dark style to use in every notebook:
```python
import matplotlib.pyplot as plt
plt.rcParams['figure.facecolor'] = '#0f1117'
plt.rcParams['axes.facecolor']   = '#1a1d27'
plt.rcParams['text.color']       = 'white'
plt.rcParams['axes.labelcolor']  = '#94a3b8'
plt.rcParams['xtick.color']      = '#94a3b8'
plt.rcParams['ytick.color']      = '#94a3b8'
plt.rcParams['axes.edgecolor']   = '#2e3347'
```

## Add exercises to the registry

In `src/lib/exercises.ts`, append entries to `allExercises`:
- IDs must be globally unique across the entire registry
- Convention: `<course-prefix>-<concept-keyword>`
- Each lesson should reference 2–3 exercises
- Multiple-choice: exactly one `isCorrect: true` option

## Verify

```bash
npm test
```

The existing `content-integrity.test.ts` will automatically catch:
- Missing frontmatter fields
- Broken exercise IDs
- Broken cross-links
- Missing notebooks
