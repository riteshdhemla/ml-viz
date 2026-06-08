# Content Comprehensiveness Audit

Run a full quality audit across every MDX lesson in `src/content/courses/`. Report issues grouped by course, with a severity level for each finding.

## What to check

### 1. Frontmatter completeness
For every `*.mdx` lesson file (not `index.mdx`):
- `title`, `description`, `order`, `type`, `estimatedMinutes` are all present and non-empty
- `type` is one of: `concept | exercise | quiz | playground`
- `order` matches the two-digit `NN-` filename prefix exactly
- `estimatedMinutes` is a positive integer

### 2. Structural sections (all lessons should have all of these)
- At least one `##` heading (H2 section)
- A "Key takeaways" section (`## Key takeaways`) with ≥ 3 bullet points
- A "Related concepts" section (`## Related concepts`) with ≥ 2 cross-links
- At least one `<Callout type="...">` block
- At least one `<Exercise id="..." />` reference
- A fenced Python code block (` ```python `)

### 3. LaTeX rendering — common breakage patterns
Scan for these patterns that cause KaTeX to silently fail or produce garbled output:
- Display math `$$...$$` on a single line without blank lines before and after it (MDX requires blank lines around block-level elements)
- Unescaped `\` in inline math — e.g., `$\sum_{i=1}^n$` requires no extra escaping in MDX, but bare `\n` inside `$...$` will break
- Opening `$$` without a matching closing `$$` on a later line
- Mixed `$...$` and `\(...\)` syntax in the same file (pick one)
- Nested dollar signs like `$a$b$` which are ambiguous

### 4. Exercise cross-references
- Every `<Exercise id="xyz" />` must have a matching entry in `src/lib/exercises.ts`
- Exercises referenced in foundation courses (`linear-algebra`, `calculus-for-ml`, `probability-statistics`) should have IDs prefixed `linalg-`, `calc-`, or `prob-`/`mle-`/`bayes-`

### 5. Internal cross-links
- Every `/courses/<course>/<lesson>` link must point to a file that exists at `src/content/courses/<course>/<lesson>.mdx`
- Links using just `/courses/<course>` (no lesson) should also resolve

### 6. Notebook presence
- Each lesson `src/content/courses/<course>/NN-slug.mdx` must have a matching `notebooks/<course>/NN-slug.ipynb`
- Each notebook must be valid JSON with `nbformat >= 4` and at least one cell

### 7. Content length heuristics
Flag any lesson where:
- Total word count < 300 words (too thin — likely a stub)
- No worked example (no bold **Example** or `### Worked example` heading)
- `estimatedMinutes` > 30 but the lesson is under 600 words (time estimate is inflated)

## Output format

For each finding, output:

```
[SEVERITY] course/lesson.mdx — <what is missing or broken>
```

Severity levels:
- `[ERROR]` — blocks correct rendering (broken exercise id, missing notebook, broken link)
- `[WARN]`  — degrades quality (missing section, LaTeX pattern, too short)
- `[INFO]`  — minor suggestion (estimatedMinutes mismatch, naming inconsistency)

After listing all findings, output a summary table:

```
Course                    Lessons   Errors   Warnings   Infos
────────────────────────  ───────   ──────   ────────   ─────
linear-algebra                 3        0          1       0
...
TOTAL                         42        0          5       3
```

If there are zero findings, say "All lessons pass the content audit."

Do NOT fix anything — report only. If the user wants fixes, they should run `/audit-lesson <slug>` on the flagged lesson.
