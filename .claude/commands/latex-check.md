# LaTeX Rendering Check

Scan all lesson MDX files for KaTeX patterns that render incorrectly or silently break. Fix every issue found.

## KaTeX rules for next-mdx-remote + rehype-katex

### Block math (display equations)
**Correct** — blank line before and after the `$$` block:
```
...prose text.

$$
\mathbf{y} = \mathbf{A}\mathbf{x}
$$

Next paragraph...
```

**Wrong** — inline with prose (the block element breaks MDX parsing):
```
The formula $$y = Ax$$ is...          ← BAD: $$ on prose line
```

### Inline math
**Correct:** `$\mathbf{w}^\top \mathbf{x} + b$`  
**Wrong patterns:**
- Line breaks inside `$...$`: `$\sum_{i=1}^n` ← newline → `x_i$`
- Unescaped percent: `$100\%$` → use `$100\%$` (actually `\%` is correct) — but bare `$100%$` is wrong
- Dollar signs in prose not meant as math: "costs $5 per unit" must use `\$` or be outside a math block

### Common symbol patterns to check and correct
| Wrong | Correct |
|-------|---------|
| `w^T` | `\mathbf{w}^\top` |
| `||v||` | `\|\mathbf{v}\|` or `\lVert \mathbf{v} \rVert` |
| `sum_i` | `\sum_{i}` |
| `->` in math | `\to` or `\rightarrow` |
| `...` in math | `\ldots` or `\cdots` |
| `R^n` | `\mathbb{R}^n` |
| `theta` | `\theta` |

### Table of what to scan for in each file

1. Find all `$$` — count opening vs closing (must be even)
2. Find all `$...$` spans — check none contain a bare newline
3. Find any `$$` that appears on a line with other prose characters
4. Find any `$` that appears in text that looks like currency (number followed by $) — flag for review
5. Find `\[...\]` or `\(...\)` — the project uses `$$` and `$`, not LaTeX delimiters; flag for consistency
6. Find `\begin{align}` — KaTeX supports this but only inside `$$` blocks, not standalone
7. Find bare matrix/vector names used as single letters where `\mathbf{}` should be used (heuristic: single uppercase letter `A`, `B`, `W`, `X` in a math context that isn't already `\mathbf{...}`)

## Output

For each file with issues:
```
src/content/courses/linear-algebra/02-matrices-and-transformations.mdx
  Line 18: display math block missing blank line before $$
  Line 42: inline math contains newline → will break rendering
  Line 67: $W$ should be $\mathbf{W}$ for consistency
```

Fix all issues in the files. Then run `npm run build` to confirm MDX compilation succeeds. If a fix requires a judgment call (e.g. whether a letter is a matrix), flag it as `[REVIEW]` and leave it unchanged.
