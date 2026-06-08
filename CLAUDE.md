# ML Viz — Claude Code Context

**Purpose:** Interactive ML education website inspired by Brilliant.org.
Every lesson teaches a concept visually, followed by an exercise.
Each lesson also links to a Jupyter/Colab notebook with runnable Python code.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15 (App Router) | `src/app/` directory |
| Language | TypeScript strict mode | All files `.ts` / `.tsx` |
| Styling | Tailwind CSS v4 | Dark-first, design tokens in `tailwind.config.ts` |
| Animations | Framer Motion | Transitions, entrance animations |
| Visualizations | D3.js | All SVG-based ML diagrams |
| Content | MDX via `next-mdx-remote` | Lessons in `src/content/courses/` |
| State | Zustand + `persist` | Progress in `src/lib/progress.ts` |
| Math | KaTeX | Rendered in MDX via rehype-katex |
| Notebooks | `.ipynb` + Colab | One notebook per lesson in `notebooks/` |
| Hosting | Vercel | Auto-deploy on push to `main` |

---

## Project Structure

```
src/
├── app/                        # Next.js pages
│   ├── page.tsx                # Homepage — Foundations strip + main courses grid
│   ├── courses/page.tsx        # Course list — Foundations section + by difficulty
│   ├── courses/[courseSlug]/   # Course overview
│   │   └── [lessonSlug]/       # Individual lesson
│   └── playground/page.tsx     # Free-form viz sandbox
│
├── components/
│   ├── layout/                 # SiteHeader, HeroSection
│   ├── lessons/                # CourseCard, LessonList, LessonLayout, NotebookLink
│   ├── exercises/              # Exercise, MultipleChoiceExercise, SliderExercise
│   ├── mdx/                    # mdxComponents.tsx (registry), Callout, CodeBlock
│   └── visualizations/         # One folder per viz (see below)
│
├── content/courses/            # MDX files — one folder per course
│   └── [course-slug]/
│       ├── index.mdx           # Course metadata (frontmatter only, no body)
│       └── NN-title.mdx        # Lessons (NN = 2-digit order number, e.g. 01, 02)
│
├── lib/
│   ├── utils.ts                # cn(), clamp(), lerp(), range(), getNotebookUrl()
│   ├── content.ts              # File-system MDX loaders (server-side only)
│   ├── exercises.ts            # Central exercise registry (allExercises array)
│   └── progress.ts             # Zustand progress store
│
└── types/
    ├── course.ts               # CourseMeta, LessonMeta, CourseWithLessons
    ├── exercise.ts             # Exercise union type, ExerciseResult
    └── progress.ts             # UserProgress, LessonProgress

notebooks/                      # Jupyter notebooks — one per lesson
└── [course-slug]/
    └── [lesson-slug].ipynb     # Auto-linked to lessons via getNotebookUrl()

.claude/
├── settings.json               # Stop hook: runs npm test after each response
└── commands/                   # Slash commands — type /command-name in chat
    ├── audit-content.md        # Full content quality audit across all lessons
    ├── audit-lesson.md         # Deep audit + fix a single lesson
    ├── write-tests.md          # Generate Vitest tests for course/component/util
    ├── clean-unused.md         # Find and remove dead code, orphan exercises
    ├── security-audit.md       # Security review of MDX rendering, URLs, deps
    ├── latex-check.md          # Scan + fix KaTeX rendering issues in all lessons
    ├── new-course.md           # Scaffold a complete new course end-to-end
    └── new-lesson.md           # Add a single lesson + notebook + exercises

src/lib/__tests__/              # Vitest test suite
    ├── content-integrity.test.ts   # All courses: frontmatter, cross-links, notebooks
    ├── foundation-courses.test.ts  # Foundation-specific: content quality, LaTeX, coverage
    ├── exercises.test.ts           # Registry: unique ids, correct options, valid ranges
    ├── utils.test.ts               # Pure function unit tests
    └── progress.test.ts            # Zustand store behaviour (jsdom environment)
```

---

## Hosting (Vercel)

The site is deployed to Vercel. Key facts:

- **Production URL:** `https://ml-viz.vercel.app` (set as `NEXT_PUBLIC_SITE_URL` in Vercel dashboard)
- **Auto-deploy:** every push to `main` triggers a rebuild
- **Build:** `npm run build` — all MDX content is compiled statically at build time
- **Environment variables** (set in Vercel dashboard → Settings → Environment Variables):

  | Variable | Value | Notes |
  |----------|-------|-------|
  | `NEXT_PUBLIC_SITE_URL` | `https://ml-viz.vercel.app` | Used in lesson back-links inside notebooks |

- **Colab links** point to notebooks on the `main` branch. Always merge to `main` before expecting Colab buttons to resolve in production.
- `src/lib/content.ts` uses `fs` (server-side only) — this works fine on Vercel serverless runtime.
- `vercel.json` is in the repo root; Vercel reads it automatically.

### CD pipeline

Production deploys are **tag-driven**, not branch-driven:

```bash
git tag v1.2.0 && git push origin v1.2.0
```

This triggers `.github/workflows/cd.yml`:
1. Quality gate: `npm run type-check` + `npm run build`
2. Vercel production deploy via CLI (`vercel build --prod` → `vercel deploy --prebuilt --prod`)
3. GitHub Release auto-created with changelog + deployment URL

A separate `.github/workflows/ci.yml` runs type-check + lint + build on every PR and `main` push.

**Required GitHub secrets** (Settings → Secrets → Actions):
- `VERCEL_TOKEN` — from Vercel dashboard → Settings → Tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after running `vercel link`
- `VERCEL_PROJECT_ID` — same file

**Required GitHub variable** (Settings → Variables → Actions):
- `NEXT_PUBLIC_SITE_URL` = `https://ml-viz.vercel.app`

When adding a feature that needs an environment variable, add it to: `.env.example`, Vercel dashboard, AND the `cd.yml` env block if it's needed at build time.

---

## Notebook / Colab Convention

Every lesson automatically gets an **"Open in Colab"** button in the header.

**Convention:** place the notebook at `notebooks/{courseSlug}/{lessonSlug}.ipynb`
→ The URL is auto-generated by `getNotebookUrl()` in `src/lib/utils.ts`.
→ No frontmatter needed unless you want to override to an external URL.

To override: add `notebookUrl: "https://..."` to the lesson frontmatter.

**Notebook structure to follow:**
1. Markdown cell: `# Title` + link back to the lesson URL
2. Code cell: imports + dark matplotlib style (use exact values below)
3. Alternating markdown (concept/equation) + code (implementation) cells
4. At least one `plt.show()` visualization
5. Final "try it yourself" cell

**Matplotlib dark style (use in every notebook, cell 2):**
```python
plt.rcParams['figure.facecolor'] = '#0f1117'
plt.rcParams['axes.facecolor']   = '#1a1d27'
plt.rcParams['text.color']       = 'white'
plt.rcParams['axes.labelcolor']  = '#94a3b8'
plt.rcParams['xtick.color']      = '#94a3b8'
plt.rcParams['ytick.color']      = '#94a3b8'
plt.rcParams['axes.edgecolor']   = '#2e3347'
```

---

## Key Conventions

### Lesson quality checklist

Every lesson MDX must have **all** of the following (tested automatically by the test suite):

- [ ] Frontmatter: `title`, `description`, `order`, `type`, `estimatedMinutes` — all present
- [ ] `order` integer matches the two-digit `NN-` prefix in the filename
- [ ] At least one `$$...$$` display math block (with blank lines before and after)
- [ ] At least one `<Callout type="tip|info|warning|success">` block
- [ ] At least one `<Exercise id="..." />` — id must exist in `src/lib/exercises.ts`
- [ ] At least one ` ```python ` code block with runnable numpy code
- [ ] `## Key takeaways` section with 4+ bullet points
- [ ] `## Related concepts` section with 2+ `/courses/<course>/<lesson>` links (all links must resolve)
- [ ] A companion notebook at `notebooks/<course>/<slug>.ipynb`

### KaTeX / LaTeX rules

- Display math: always surrounded by blank lines
  ```
  (blank line)
  $$
  \mathbf{y} = \mathbf{A}\mathbf{x}
  $$
  (blank line)
  ```
- Inline math: `$f(x)$` — no line breaks inside the delimiters
- Vectors: `\mathbf{v}`, matrices: `\mathbf{A}`, reals: `\mathbb{R}^n`
- Use `\top` for transpose (`\mathbf{w}^\top`), not `^T`
- Never mix `\(...\)` / `\[...\]` LaTeX delimiters — use `$` / `$$` only

Run `/latex-check` to scan and fix all lessons at once.

### Adding a visualization

1. Create `src/components/visualizations/[ConceptName]/[ConceptName]Viz.tsx`
2. Mark `"use client"` — all D3 code runs client-side
3. Use `useRef<SVGSVGElement>` + `useEffect` for D3 rendering
4. Accept a `className?: string` prop and spread with `cn()`
5. Wrap output in `<div className="not-prose card-glass p-4 my-6">`
6. Export from file, then add to `src/components/mdx/mdxComponents.tsx`

**Template:** see `prompts/new-visualization.md`

### Adding an exercise

Exercise **data** lives in the registry `src/lib/exercises.ts` (a typed
`Record<id, Exercise>`). Lessons **reference** an exercise by id:

```mdx
<Exercise id="neuron-weights-quiz" />
```

> ⚠️ **Never pass an inline `exercise={{...}}` object in MDX.** Lesson MDX is
> rendered with `next-mdx-remote`'s `blockJS: true` (the secure default, set
> in `LessonLayout.tsx`), which strips JS expressions to prevent arbitrary
> code execution. An inline object would be evaluated to `undefined` and crash
> the build. The `id` attribute is a plain string, so it is safe.

**Exercise id conventions:**
- Foundation courses: `linalg-*`, `calc-*`, `prob-*`, `mle-*`, `bayes-*`
- Neural networks: `neuron-*`, `gd-*`, `optimizer-*`
- General: `<course-prefix>-<concept>` (e.g. `knn-distance-metric`, `svm-c-parameter`)

**To add an exercise instance:**
1. Append a typed entry to the `allExercises` array in `src/lib/exercises.ts`
   (id must be unique across the whole site)
2. Reference it from a lesson with `<Exercise id="..." />`

**To add an exercise _type_** (`multiple-choice`, `slider` exist today):
1. Add the variant to `src/types/exercise.ts`
2. Create `src/components/exercises/[Type]Exercise.tsx`
3. Add a branch in `Exercise.tsx` (it resolves the id, then dispatches on `type`)

### Adding a lesson

Use `/new-lesson <course-slug> "<title>"` or follow these steps:

1. Create `src/content/courses/[course-slug]/NN-kebab-title.mdx`
2. Required frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."
   order: NN          # integer, matches filename prefix
   type: concept | exercise | quiz | playground
   estimatedMinutes: N
   ---
   ```
3. Create `notebooks/[course-slug]/NN-kebab-title.ipynb` (same slug as MDX)
4. Use `<Callout type="tip|info|warning|success">` for highlighted blocks
5. Reference exercises by id with `<Exercise id="..." />` — define the data in
   `src/lib/exercises.ts` (see "Adding an exercise"). Do **not** inline a JS
   object; MDX runs with `blockJS: true`.
6. Display math: `$$...$$` on its own line with blank lines; inline math: `$...$`

### Adding a course

Use `/new-course <slug>` or follow these steps:

1. Create `src/content/courses/[slug]/index.mdx` with frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."
   difficulty: beginner | intermediate | advanced
   topics: [...]
   estimatedHours: N
   prerequisites: []   # array of course slugs
   order: N            # negative = Foundation (shown in its own section); 1+ = regular
   coverColor: "bg-gradient-to-r from-brand-500 to-accent-teal"
   ---
   ```
2. Use only approved `coverColor` values (from `prompts/new-course.md`):
   - `bg-gradient-to-r from-brand-500 to-accent-teal`
   - `bg-gradient-to-r from-brand-600 to-accent-orange`
   - `bg-gradient-to-r from-brand-700 to-accent-rose`
   - `bg-gradient-to-r from-accent-teal to-brand-400`
3. Add lesson MDX files to the same folder
4. Add corresponding notebooks to `notebooks/[slug]/`

**Course ordering on the page:**
- Courses with `order < 0` → rendered in the "Foundations" section (homepage + /courses)
- Courses with `order >= 0` → grouped by `difficulty` (beginner / intermediate / advanced)

### Styling rules

- Dark background: `bg-surface` (#0f1117), cards: `bg-surface-card` (#1a1d27)
- Primary color: `brand-500` (#6366f1) — buttons, links, active states
- Accent colors for semantic use: `accent-teal` (success), `accent-yellow` (warning), `accent-rose` (error/advanced)
- Use `card-glass` utility class for bordered card containers
- Use `text-gradient` for hero/display text highlights
- Never use `prose` directly on lesson content — use the `prose-lesson` utility class

### Component rules

- All interactive components → `"use client"` directive
- Server components: pages, layout components that don't need state
- No `useState` in server components; no `fs` / file-system code in client components
- `src/lib/content.ts` is server-only (imports `fs`) — never import in client components

---

## Testing

**Runner:** Vitest v2 (`npm test`)  
**Watch mode:** `npm run test:watch`  
**Verbose output:** `npm test -- --reporter=verbose`

The Stop hook in `.claude/settings.json` runs `npm test` automatically after every Claude response.

### Test files

| File | What it covers |
|------|---------------|
| `content-integrity.test.ts` | All courses: frontmatter, cross-links, exercise refs, notebooks |
| `foundation-courses.test.ts` | Foundation quality: LaTeX, Callouts, exercises, notebook structure |
| `exercises.test.ts` | Registry: unique ids, correct answer count, valid slider ranges |
| `utils.test.ts` | Pure functions: cn, clamp, lerp, range, getNotebookUrl, getLessonUrl |
| `progress.test.ts` | Zustand store: mark complete, record results, course progress % |

### Writing new tests

Use `/write-tests <target>` or follow these patterns:

- **Content integrity tests:** extend `content-integrity.test.ts` or create `<course>.test.ts`
- **Per-course quality:** mirror `foundation-courses.test.ts` — check LaTeX, Callouts, exercises, notebook structure
- **Exercise tests:** add to `exercises.test.ts`
- **Utility tests:** add to `utils.test.ts`
- **DOM tests:** add `// @vitest-environment jsdom` at top of file

The `content-integrity.test.ts` suite automatically covers every new course that follows the conventions — no test additions needed for standard courses.

---

## Design System (Brilliant-inspired)

### Color tokens (Tailwind custom)

```
brand-{50..900}  — indigo/purple, primary actions
accent-orange    — highlights, CTA variants
accent-teal      — success, beginner difficulty
accent-yellow    — warning, intermediate difficulty
accent-rose      — error, advanced difficulty
surface          — page background
surface-card     — card background
surface-elevated — hover/active card background
surface-border   — borders
```

### Visual language

- **Dark background** everywhere (color scheme: dark)
- **Cards** with subtle borders, no drop shadows
- **Hover state**: slight border color lift + `-translate-y-0.5` transform
- **Difficulty indicators**: teal dot (beginner), yellow (intermediate), rose (advanced)
- **Progress**: teal check circles for completed lessons
- **Foundations indicator**: brand-400 diamond `◆` (not difficulty dot)

---

## Comprehensive ML Content Roadmap

### Foundations (order < 0 — shown in dedicated section)
- [x] **Linear Algebra for ML** — vectors, matrices, dot products, eigendecomposition *(3 lessons)*
- [x] **Calculus for ML** — derivatives, chain rule, Jacobians, Hessians *(3 lessons)*
- [x] **Probability & Statistics** — distributions, MLE, MAP, Bayes' theorem *(3 lessons)*

### Supervised Learning — Beginner
- [x] **Neural Networks** — perceptron, forward pass, backprop *(course + 2 lessons)*
- [ ] **Linear & Logistic Regression** — OLS, Ridge, Lasso, decision boundary *(course stub)*
- [ ] **KNN & Decision Trees** — distance metrics, info gain, Gini impurity *(course stub)*

### Supervised Learning — Intermediate
- [ ] **Convolutional Neural Networks** — kernels, feature maps, pooling *(course stub)*
- [ ] **Support Vector Machines** — max-margin, kernel trick, RBF *(course stub)*
- [ ] **Ensemble Methods** — bagging, boosting, Random Forest, XGBoost *(course stub)*

### Unsupervised Learning
- [ ] **Clustering** — K-Means, hierarchical, DBSCAN *(course stub)*
- [ ] **PCA & Dimensionality Reduction** — eigendecomposition, t-SNE, UMAP *(course stub)*
- [ ] **Probabilistic Models & EM** — GMM, EM algorithm, Naive Bayes *(course stub)*

### Sequence & Probabilistic
- [ ] **Recurrent Neural Networks** — hidden state, BPTT, vanishing gradient, LSTM *(course stub)*
- [ ] **Graphical Models** — Bayesian Networks, MRFs, HMMs, belief propagation *(course stub)*

### Advanced Deep Learning
- [ ] **Attention & Transformers** — self-attention, multi-head, positional encoding *(course stub)*
- [ ] **Generative Models** — VAE, GAN, Diffusion *(course stub)*

### Reinforcement Learning
- [ ] **Reinforcement Learning** — MDPs, Q-Learning, DQN, Policy Gradient, Actor-Critic *(course stub)*

---

## Visualization Components Built

| Component | File | Status |
|-----------|------|--------|
| NeuralNetworkViz | `visualizations/NeuralNetwork/` | ✅ |
| GradientDescentViz | `visualizations/GradientDescent/` | ✅ |
| LinearRegressionViz | `visualizations/LinearRegression/` | planned |
| SVMViz | `visualizations/SVM/` | planned |
| KMeansViz | `visualizations/KMeans/` | planned |
| PCAViz | `visualizations/PCA/` | planned |
| AttentionViz | `visualizations/Attention/` | planned |
| DecisionTreeViz | `visualizations/DecisionTree/` | planned |

---

## Slash Commands Reference

All commands live in `.claude/commands/`. Type `/command-name` in Claude Code.

| Command | Argument | What it does |
|---------|----------|-------------|
| `/audit-content` | — | Full quality scan of every lesson: frontmatter, LaTeX patterns, Callouts, exercises, cross-links, notebooks |
| `/audit-lesson` | `<course>/<lesson>` | Deep audit + auto-fix a single lesson and its notebook |
| `/write-tests` | `course:<slug>` or `component:<name>` | Generate Vitest tests following project patterns |
| `/clean-unused` | — | Find orphan exercises, unused imports, dead components |
| `/security-audit` | — | Review MDX safety, URL handling, deps, env vars |
| `/latex-check` | — | Scan and fix KaTeX rendering issues across all lessons |
| `/new-course` | `<slug>` | Scaffold a complete new course: MDX + notebooks + exercises |
| `/new-lesson` | `<course> "<title>"` | Add one lesson + notebook + exercises to an existing course |

The Stop hook (`.claude/settings.json`) runs `npm test` automatically and shows a compact result after every response. If tests fail, fix them before committing.
