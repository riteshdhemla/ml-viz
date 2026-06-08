# Single-Lesson Deep Audit

Argument: `$ARGUMENTS` — the lesson path, e.g. `linear-algebra/01-vectors-and-spaces` or just the full slug `courses/linear-algebra/01-vectors-and-spaces`.

Read `src/content/courses/$ARGUMENTS.mdx` and its companion notebook `notebooks/$ARGUMENTS.ipynb`. Perform a thorough audit, then **fix every issue you find** in a single edit.

## Audit checklist

### Frontmatter
- [ ] All required fields present: `title`, `description`, `order`, `type`, `estimatedMinutes`
- [ ] `order` matches the `NN-` filename prefix
- [ ] `estimatedMinutes` is realistic (roughly 1 min per 100 words + 3 min per exercise)

### Content structure (in order)
- [ ] Opens with a strong 1-2 sentence hook explaining real-world relevance
- [ ] Concept introduced with intuition before math
- [ ] Every equation displayed with `$$...$$` on its own line, with blank lines before/after
- [ ] Every inline math uses `$...$` with no line breaks inside
- [ ] At least one worked numeric example with step-by-step arithmetic shown
- [ ] Python code block that implements the concept (with `import numpy as np` at the top)
- [ ] At least one `<Callout type="tip|info|warning|success">` that adds insight not in the prose
- [ ] "## Key takeaways" section with 4 concise bullet points
- [ ] "## Related concepts" section with ≥ 2 links to other lessons in the form `[Title](/courses/course/lesson)`
- [ ] At least 2 `<Exercise id="..." />` references — each id must exist in `src/lib/exercises.ts`

### LaTeX hygiene
- No `$$` blocks on the same line as prose
- No unmatched `$` delimiters
- Fractions use `\frac{a}{b}` not `a/b` inside math
- Vectors bold with `\mathbf{v}` not just `v`
- Matrices bold with `\mathbf{A}`

### Cross-links validity
- Every `/courses/course/lesson` link resolves to an existing `.mdx` file

### Notebook
- First cell: markdown with title and link back to the lesson URL
- Second cell: imports (`numpy`, `matplotlib`) + dark style setup using `plt.rcParams`
- At least 3 code cells with working Python (no pseudocode, actual runnable code)
- At least one `plt.show()` or inline visualization
- Final cell: a "try it yourself" mini-challenge comment

## After auditing

1. List all issues found in a numbered list before making any edits
2. Fix all issues in the MDX file and notebook
3. Run `npm test` and confirm the test suite is green
4. Report what was changed
