# ML Viz — Claude Code Context

**Purpose:** ML Viz — an interactive, visual-first ML education site with its
own identity: every concept is taught by an interactive visualization, checked
by an exercise, and paired with a runnable Jupyter/Colab notebook. Two project
loops (the ML loop and the agentic loop) thread the entire curriculum, and the
system-design section teaches Socratically — ask first, reveal second.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15 (App Router) | `src/app/` directory |
| Language | TypeScript strict mode | All files `.ts` / `.tsx` |
| Styling | Tailwind CSS v4 | Dark-first, design tokens in `tailwind.config.ts` |
| Animations | CSS transitions + `useAnimationLoop` | From `viz-kit.tsx`; no animation library |
| Visualizations | Pure-SVG React components | No D3 — see `viz-kit.tsx` primitives |
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
│   ├── page.tsx                # Homepage
│   ├── courses/page.tsx        # Course list
│   └── courses/[courseSlug]/   # Course overview
│       └── [lessonSlug]/       # Individual lesson
│
├── components/
│   ├── layout/                 # SiteHeader, HeroSection
│   ├── lessons/                # CourseCard, LessonList, LessonLayout, NotebookLink
│   ├── exercises/              # Exercise, MultipleChoiceExercise, SliderExercise
│   ├── mdx/                    # mdxComponents.tsx (registry), Callout
│   └── visualizations/         # One folder per viz (see below)
│
├── content/
│   ├── courses/                # MDX files — one folder per course
│   │   └── [course-slug]/
│   │       ├── index.mdx       # Course metadata (frontmatter only)
│   │       └── NN-title.mdx    # Lessons (NN = 2-digit order number)
│   ├── wiki/                   # Concept-wiki deep dives — [slug].mdx
│   └── system-design/          # System-design case studies — [slug].mdx
│
├── lib/
│   ├── utils.ts                # cn(), clamp(), lerp(), range(), getNotebookUrl()
│   ├── content.ts              # File-system MDX loaders (server-side only)
│   └── progress.ts             # Zustand progress store
│
└── types/
    ├── course.ts               # CourseMeta, LessonMeta, CourseWithLessons
    ├── exercise.ts             # Exercise union type, ExerciseResult
    └── progress.ts             # UserProgress, LessonProgress

notebooks/                      # Jupyter notebooks — one per lesson
└── [course-slug]/
    └── [lesson-slug].ipynb     # Auto-linked to lessons via getNotebookUrl()
```

---

## Hosting (Vercel)

The site is deployed to Vercel. Key facts:

- **Production URL:** `https://ml-viz-ruby.vercel.app` (set as `NEXT_PUBLIC_SITE_URL` in Vercel dashboard)
- **Auto-deploy:** every push to `main` triggers a rebuild
- **Build:** `npm run build` — all MDX content is compiled statically at build time
- **Environment variables** (set in Vercel dashboard → Settings → Environment Variables):

  | Variable | Value | Notes |
  |----------|-------|-------|
  | `NEXT_PUBLIC_SITE_URL` | `https://ml-viz-ruby.vercel.app` | Used in lesson back-links inside notebooks |

- **Colab links** point to notebooks on the `main` branch. Always merge to `main` before expecting Colab buttons to resolve in production.
- `src/lib/content.ts` uses `fs` (server-side only) — this works fine on Vercel serverless runtime.
- `vercel.json` is in the repo root; Vercel reads it automatically.

### GitHub Pages mirror

A read-only mirror is deployed to `https://riteshdhemla.github.io/ml-viz` by
`.github/workflows/deploy-pages.yml` on every push to `main` (repo Settings →
Pages → Source must be set to **GitHub Actions**). Vercel stays canonical:

- The mirror is built with `GITHUB_PAGES=true BASE_PATH=/ml-viz npm run build` —
  `next.config.ts` then switches to `output: "export"` + `basePath` +
  `trailingSlash` and emits static HTML to `out/`.
- `NEXT_PUBLIC_SITE_URL` stays the Vercel URL on the mirror build, so canonical
  URLs, JSON-LD, and sitemap entries all point at Vercel; `robots.ts` emits
  `Disallow: /` on the mirror so the two deployments never compete in search.
- Static export means: no API routes, no middleware, every dynamic route needs
  `generateStaticParams`, and metadata routes (`sitemap.ts`, `robots.ts`,
  `icon.tsx`, `opengraph-image.tsx`) need `export const dynamic = "force-static"`.
  Keep new features within these constraints or the Pages build will fail.

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
- `NEXT_PUBLIC_SITE_URL` = `https://ml-viz-ruby.vercel.app`

When adding a feature that needs an environment variable, add it to: `.env.example`, Vercel dashboard, AND the `cd.yml` env block if it's needed at build time.

---

## Notebook / Colab Convention

Every lesson automatically gets an **"Open in Colab"** button in the header.

**Convention:** place the notebook at `notebooks/{courseSlug}/{lessonSlug}.ipynb`
→ The URL is auto-generated by `getNotebookUrl()` in `src/lib/utils.ts`.
→ No frontmatter needed unless you want to override to an external URL.

To override: add `notebookUrl: "https://..."` to the lesson frontmatter.

**Notebook structure to follow** (see `notebooks/neural-networks/` for examples):
1. Markdown cell: title + link back to the lesson
2. Code cell: imports + dark matplotlib style
3. Alternating markdown (concept/equation) + code (implementation) cells
4. End with a visualization or interactive demo
5. Then a **"✏️ Your turn"** scaffold section (see `notebooks/knn-decision-trees/`
   for the pattern): per exercise — concept recap markdown, code outline with
   `# TODO(you)` blanks, an `assert` cell that passes silently when correct,
   and a `<details>` markdown cell with the solution

### Walkthrough template (7 parts)

Every notebook is a **detailed, self-contained code walkthrough**: a reader who runs
the cells top-to-bottom should grasp the idea, see it built from scratch, see the
real library way, know when to reach for it, and get to code it themselves. For an
**algorithm / method** notebook, build to this shape:

0. **Header + intuition** — keep the title, lesson back-link, and Copy-to-Drive note;
   add 2–4 sentences: the problem it solves, the core idea in plain words, where it
   shows up.
1. **From scratch** — a NumPy implementation with math→code narration and shapes
   annotated, built incrementally across a few cells (each with a markdown lead-in),
   not one monolithic block.
2. **The library way** — the real equivalent (scikit-learn / PyTorch / SciPy /
   statsmodels …) **plus an explicit check that the from-scratch result matches** the
   library (`np.allclose`, side-by-side numbers, or overlaid plots).
3. **Visualize it** — the figure(s) that make it stick, each followed by a "what to
   notice" markdown cell.
4. **Tradeoffs & when to use it** — a scannable pros/cons table, time/space
   complexity, key hyperparameters and what they trade off, and common failure modes.
5. **Your turn** — the existing `✏️ Your turn` scaffolds (see above) and any extra
   practice banks.
6. **Key takeaways** — a short bullet recap + links to the next lesson / related wiki.

**Flex by notebook type — adapt, don't force:**
- **Foundations / concept explainers** (linear algebra, calculus): §1 is
  by-hand/from-first-principles; §2 is the library one-liner cross-checked; §4 becomes
  "limitations / when it breaks / numerical gotchas" (conditioning, float, degenerate
  inputs).
- **Applied / systems / LLM lessons** (RAG, agents, MLOps, prompting): §1 is a minimal
  working implementation of the pattern; §2 is the framework/SDK version; §4 is design
  tradeoffs, cost/latency, and failure modes.
- **Wiki deep-dives**: procedure from scratch + worked trace + gotchas + exercise;
  library section only if one genuinely applies.

**Invariants:** every code cell has a markdown lead-in; plots have a follow-up
takeaway; cells are runnable and deterministic (seeds set, imports precede use);
notebook JSON round-trips cleanly (source-as-string, `indent=1`). Colab runs Python
3.11 — avoid nested same-quote f-strings (3.12+ only).

---

## Key Conventions

### Adding a visualization

1. Create `src/components/visualizations/[ConceptName]/[ConceptName]Viz.tsx`
2. Mark `"use client"` — all viz render client-side
3. Draw with **plain SVG** (no D3). Animate via React state + `useAnimationLoop`
   from `viz-kit.tsx`; use `seededRandom`/`gaussian` for deterministic data and
   `scale()` to map data → pixels
4. Accept a `className?: string` prop
5. Wrap output in `<VizFrame title=... caption=... className={className}>` and
   reuse `VizSlider` / `VizButton` / `VizStat` for controls
6. Export from file, then add to `src/components/mdx/mdxComponents.tsx`
7. Reference it in a lesson MDX with a self-closing tag, e.g. `<KMeansViz />`

**Template:** see `prompts/new-visualization.md`

### Adding a guided walkthrough (the narrated pipeline)

The third teaching format, alongside the plain viz and the algorithm trace. A
plain viz answers *"what does this look like?"*; a trace answers *"what does this
code do, line by line?"*; a **guided walkthrough** answers *"what are the stages
of this pipeline, and why does each one exist?"* — by replacing the bag of
sliders with a narrated sequence: a stepper across the top, an explain panel that
changes with the step, and a **hint** telling the reader what to do or notice
right now.

Reach for it when a concept is a **sequence of stages that build on each other**
and one static picture would have to show all of them at once. Don't force it
onto a parameter explorer.

The shell is `src/components/visualizations/GuidedViz/GuidedViz.tsx`; a guided
viz is still one self-contained component that hands it render props:

```tsx
<GuidedViz
  title="…" caption="…"
  phases={PHASES}                 // named parts of the pipeline; own colour + numbering
  steps={STEPS}                   // phase, label, title, body, hint
  controls={…}                    // optional, applies to every step
  stage={(i) => <svg … />}
  stageNote={(i) => "…"} panel={(i) => …} legend={(i) => …}
  onStepChange={setStep}
/>
```

Rules that make it teach rather than just animate:

1. Every `body` says what the stage does **and what was broken without it**.
2. Every step carries a `hint` — the one line that turns a diagram into a
   walkthrough.
3. The `panel` **accumulates**: it shows the state the pipeline has produced so
   far (`GuidedCard`), not six unrelated pictures.
4. **End with a payoff step** — state in a `<GuidedPayoff>` what the pipeline
   bought that the naive approach cannot reach.
5. Make one step genuinely interactive where you can, so the reader tests the
   claim instead of reading it.
6. **Derive every number in the panel** from the constants in the file, same
   integrity rule as algorithm traces.
7. `useStagger(n, ms, key)` reveals cards in sequence (map-reduce, fan-out) and
   honours `prefers-reduced-motion`.

**Template:** see `prompts/new-guided-viz.md`.
**Reference:** `visualizations/GraphRAG/GraphRAGViz.tsx` (two phases, one
interactive step, one animated step),
`visualizations/TransformerBlock/TransformerBlockViz.tsx` (single phase, plus an
orthogonal mode toggle in `controls`), and
`visualizations/AudioFeatures/AudioFeaturesViz.tsx` (real DSP computed in the
browser; a `controls` toggle re-runs the whole pipeline so the trade-off it
teaches is testable rather than asserted), and
`visualizations/PreferenceTuning/PreferenceTuningViz.tsx` (two pipelines that
converge on one formula; the controls isolate *why* they differ, and the
component's doc comment records the 12-sample robustness check behind each
claim in the prose).

### Adding an algorithm trace (the steppable code player)

Standard viz answer *"what does this concept look like?"*. An **algorithm trace**
answers the different question *"what does this code actually do, line by
line?"* — the approach borrowed from the sibling **algo-viz** project: source on
the left with the executing line highlighted, live data structures on the right,
and play / step / seek controls. Reach for it whenever a wiki page or lesson
explains a **procedure** (a loop that transforms state) rather than a shape.

```mdx
<AlgorithmTrace id="bm25-scoring" />
```

Plain string `id` only — MDX runs with `blockJS: true`, same constraint as
`<Exercise id>` and `<WikiLink slug>`.

**To add one:**

1. Create `src/lib/algo-traces/<name>.ts` exporting a built `AlgoTrace`.
2. **Run the real algorithm and record frames** — never hand-write the numbers a
   step produces. If the trace and the prose disagree, the reader learns the
   wrong thing. Use `frameBuilder()` and `lineFinder()` from `./util`:
   `lineFinder` maps code *fragments* to line numbers, so edits to the listing
   never silently rot the highlights.
3. Each frame is `push(description, ln("fragment"), ...components)`:
   - `description` — one plain sentence saying what just happened, and *why it
     matters*. This is the teaching surface; a bare "i = 3" wastes the frame.
   - components — `tokens` / `kv` / `bars` / `matrix` / `table` / `graph` /
     `note` (see `src/types/algo-trace.ts`). Use `NaN` for matrix cells the
     algorithm has not filled in yet — they render as `·`, not a fake `0`.
4. Register it in `allAlgoTraces` in `src/lib/algo-traces/index.ts`.
5. Reference it from the MDX and write a short "what to notice" list under it.
6. **Keep code lines under ~46 characters** — the code panel is half of a
   two-column grid. Put comments on their own line rather than trailing. Longer
   lines scroll horizontally, but scrolling to read defeats the point.
7. **End with a payoff frame** that changes one thing and shows the consequence
   (BM25 re-scored with `b = 0`; attention softmax saturating at `d_k = 64`).
   That contrast is what makes the mechanism stick.

Integrity rules enforced by `src/lib/__tests__/algo-trace-integrity.test.ts`:
ids unique, every frame highlights an in-range code line and renders some state,
≥ 6 frames, every `<AlgorithmTrace id>` in content resolves, and no registered
trace is left unreferenced.

**Template:** see `prompts/new-algorithm-trace.md`

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

**To add an exercise instance:**
1. Append a typed entry to the `allExercises` array in `src/lib/exercises.ts`
   (id must be unique across the whole site)
2. Reference it from a lesson with `<Exercise id="..." />`

**To add an exercise _type_** (`multiple-choice`, `slider` exist today):
1. Add the variant to `src/types/exercise.ts`
2. Create `src/components/exercises/[Type]Exercise.tsx`
3. Add a branch in `Exercise.tsx` (it resolves the id, then dispatches on `type`)

### Adding a lesson

1. Create `src/content/courses/[course-slug]/NN-kebab-title.mdx`
2. Required frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."
   order: NN          # integer, matches filename prefix
   type: concept | exercise | quiz | playground
   estimatedMinutes: N
   spineStages: [<stage>, ...]   # REQUIRED for non-quiz lessons — see "The spine"
   ---
   ```
3. Create `notebooks/[course-slug]/NN-kebab-title.ipynb` (same slug as MDX)
4. Use `<Callout type="tip|info|warning|success">` for highlighted blocks
5. Reference exercises by id with `<Exercise id="..." />` — define the data in
   `src/lib/exercises.ts` (see "Adding an exercise"). Do **not** inline a JS
   object; MDX runs with `blockJS: true`.
6. Use `$$...$$` for display math, `$...$` for inline math
7. **Tag `spineStages`** (1–3 stage ids of the course's spine) and open with the
   **slot test** — see "The spine & the concept graph" below. `spine-integrity.test.ts`
   fails if a non-quiz lesson in a spine course is untagged.

### Adding a course

1. Create `src/content/courses/[slug]/index.mdx` with frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."
   difficulty: beginner | intermediate | advanced
   topics: [...]
   estimatedHours: N
   prerequisites: []   # array of course slugs
   order: N
   coverColor: "bg-gradient-to-r from-brand-500 to-accent-teal"
   spine: ml | agentic   # which project loop this course lives on
   # estimatedHours = round to nearest 0.5 of (sum of lesson estimatedMinutes × 2.5) / 60
   # — the 2.5× accounts for notebook and exercise time
   ---
   ```
2. Add lesson MDX files to the same folder (each tagged with `spineStages`)
3. Add corresponding notebooks to `notebooks/[slug]/`
4. Add the course to the `SPINE_COURSES` contract in
   `src/lib/__tests__/spine-integrity.test.ts` (spine + coverage are enforced),
   and set its `prerequisites` so the concept-graph DAG stays acyclic

### Adding a wiki page (Concept Wiki)

Deep-dive reference pages live at `/wiki/[slug]` — full algorithm procedures and
worked traces that would clutter the lesson narrative. Lessons keep a 2–4
sentence summary and link out with a styled card.

1. Create `src/content/wiki/[slug].mdx` with frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."
   topics: ["graphical-models"]   # first tag = grouping key on /wiki index
   relatedLessons:                # "courseSlug/lessonSlug" — drives "Referenced by" footer
     - "graphical-models/03-hidden-markov-models"
   estimatedMinutes: N
   ---
   ```
2. Create `notebooks/wiki/[slug].ipynb` — from-scratch implementation of the
   procedure, following the standard notebook structure (back-link to
   `/wiki/[slug]`, dark matplotlib, "✏️ Your turn" scaffold)
3. Link from the lesson: keep a short prose summary, then
   `<WikiLink slug="..." title="..." />` (plain string props — MDX runs with
   `blockJS: true`, same constraint as `<Exercise id>`)
4. Everything else is automatic: routing (`/wiki/[slug]`), search index,
   sitemap, Colab button (`notebooks/wiki/{slug}.ipynb` convention)
5. Integrity rules enforced by `src/lib/__tests__/wiki-integrity.test.ts`:
   every `<WikiLink slug>` must resolve, every `relatedLessons` entry must
   exist, every wiki page needs its notebook
6. When extracting a section from a lesson, reduce the lesson's
   `estimatedMinutes` and recompute the course `estimatedHours`

### Adding a system-design case study

Interview-style walkthroughs live at `/system-design/[slug]`, grouped into three
tracks: **ML System Design** (`spine: ml`), **Agentic System Design**
(`spine: agentic`), and **Generative AI System Design** (`track: genai`, usually
still `spine: ml`). Routing, search, sitemap, `SpineNav`, and the related-lesson
footer are wired automatically from `src/content/system-design/{slug}.mdx`.

1. Follow **`prompts/new-system-design-case.md`** — it has the frontmatter
   schema and the fixed section skeleton per track.
2. **Write Socratically.** Every case threads 3+ `<ThinkFirst question="…">`
   blocks (registered in `mdxComponents.tsx`) at its key decision points —
   the question stays visible, the model answer is collapsed until the reader
   commits. Place each at the end of the section *before* the one that answers
   it. Existing cases are the reference for tone and placement.
   **Ground every case in published primary sources** (engineering blogs,
   papers, system cards): cite sparsely inline with markdown links and end with
   a `## References` section listing 4–8 verified sources.
3. Components: `<SystemDesignMeta>` header card after the H1; `<Details>` for
   interviewer follow-ups; `<WikiLink>`/viz components as in lessons (plain
   string props only — `blockJS: true`).
4. Integrity rules enforced by `src/lib/__tests__/system-design-integrity.test.ts`:
   valid resolved track, `spineStages` (1–3) require a declared spine, every
   `relatedLessons` entry and `<WikiLink>` must resolve. Notebooks are optional.

### The spine & the concept graph

Two orthogonal structures thread the whole curriculum. Both are **generated from
metadata** — keep the metadata correct and they stay correct.

**1. The spine (functional lens).** Every course hangs off one of two recurring
**project loops**, and every technique is framed by the *slot test*: **"which
slot does this modify, and what was breaking before?"**

- **ML loop** (`spine: ml`): `data → hypothesis-space → objective → optimization
  → evaluation → feedback`.
- **Agentic loop** (`spine: agentic`): `task → context → orchestration →
  evaluation → guardrails → operations`.
- Canonical definitions + helpers live in **`src/lib/spine.ts`** (never restate
  the stage wording elsewhere — import it).
- **Frontmatter:** course `index.mdx` sets `spine:`; each non-quiz lesson sets
  `spineStages: [<1–3 stage ids>]`. Wiki pages *may* set `spine` + `spineStages`
  when they map to one loop. Quizzes carry none.
- **Prose convention:** open each lesson by naming its stage(s) *and* what the
  technique replaced / what was breaking — a light touch, never boilerplate.
  Add 1–2 **slot-placement exercises** to the course quiz (one a *transfer test*
  on a technique the course didn't teach).
- **UI (automatic from frontmatter):** `SpineNav` strip on lessons/wiki
  (`components/lessons/SpineNav.tsx`), `CourseSpineStrip` on course pages,
  `ProjectLoopViz` (`variant="ml"|"agentic"`) on the hub pages
  `/wiki/ml-project-loop` and `/wiki/agentic-project-loop`.
- **Enforcement:** `src/lib/__tests__/spine-integrity.test.ts` — every spine
  course must declare `spine` and tag every non-quiz lesson; stages must be
  valid for the spine; new courses go in its `SPINE_COURSES` contract.

**2. The concept graph (relational map).** The orthogonal axis: "what does this
build on / relate to / go deeper into?" Built in **`src/lib/knowledge-graph.ts`**
from *existing* content — `prerequisites`, `relatedLessons`, the `## Related
concepts` / `<WikiLink>` links in bodies, `topics`, and `spineStages`. No
re-authoring; just keep those links accurate.

- `/map` — interactive course-level concept map (`components/knowledge-graph/ConceptMap.tsx`).
- `ConceptNeighborhood` — per-page "concept map fragment" rendered below every
  lesson and wiki page (builds-on / related / go-deeper).
- `prerequisiteAudit()` — cycle check + topological learning order; the course
  prerequisite graph must stay an acyclic DAG (enforced in
  `knowledge-graph.test.ts`), so set new-course `prerequisites` carefully.

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

### Search & progress (site-wide UX)

- **Search palette** (Ctrl/⌘+K): `src/components/search/CommandPalette.tsx`,
  mounted globally in `src/app/layout.tsx`. The index is built server-side by
  `src/lib/search-index.ts` from MDX frontmatter — new courses/lessons are
  indexed automatically, no registration needed. Open state lives in
  `src/lib/search-store.ts` (Zustand) so any component (e.g. SiteHeader) can
  trigger it.
- **Lesson completion**: `LessonCompleteButton` (rendered by `LessonLayout`)
  is the only writer of `markLessonComplete`. It advances to the next lesson,
  or back to the course page on the last lesson. Progress bars, the
  `/progress` dashboard, and the homepage "Continue learning" card
  (`src/components/layout/ContinueLearning.tsx`) all read from the same
  Zustand store (`src/lib/progress.ts`, persisted as `ml-viz-progress`).
- **SEO**: canonical site URL helpers live in `src/lib/site.ts`
  (`SITE_URL`, `absoluteUrl()`); `sitemap.ts`/`robots.ts`/`icon.tsx`/
  `opengraph-image.tsx` under `src/app/` are generated from content at build
  time. Course/lesson pages emit JSON-LD via `src/components/seo/JsonLd.tsx`.

---

## Design System

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

---

## Comprehensive ML Content Roadmap

### Foundations
- [x] **Linear Algebra for ML** — vectors, matrices, dot products, eigendecomposition, SVD *(course + 4 lessons + quiz)*
- [x] **Calculus for ML** — derivatives, chain rule, Jacobians, Hessians *(course + 4 lessons + quiz)*
- [x] **Probability & Statistics** — distributions, MLE, MAP, Bayes, entropy/KL, inference, hypothesis testing *(course + 7 lessons + quiz)*
- [x] **Optimization for ML** — GD variants (SGD/momentum/Adam), convexity, KKT, loss functions, HPO *(course + 5 lessons + quiz)*

### Supervised Learning — Beginner
- [x] **Neural Networks** — neuron, gradient descent, forward pass, XOR/MLP, batchnorm & dropout, initialization *(course + 6 lessons + quiz)*
- [x] **Linear & Logistic Regression** — OLS, regularization, decision boundary, GLMs & GDA *(course + 4 lessons + quiz)*
- [x] **KNN & Decision Trees** — distance metrics, info gain, Gini impurity, bias-variance *(course + 3 lessons + quiz)*

### Supervised Learning — Intermediate
- [x] **Convolutional Neural Networks** — kernels, pooling, visualization & adversarial attacks, transfer learning, modern architectures *(course + 5 lessons + quiz)*
- [x] **Support Vector Machines** — max-margin, kernel trick, RBF, soft margins *(course + 3 lessons + quiz)*
- [x] **Ensemble Methods** — bagging, boosting, Random Forest, XGBoost *(course + 3 lessons + quiz)*

### Unsupervised Learning
- [x] **Clustering** — K-Means, hierarchical, DBSCAN, cluster evaluation *(course + 3 lessons + quiz)*
- [x] **PCA & Dimensionality Reduction** — eigendecomposition, t-SNE, UMAP, PCA in practice *(course + 3 lessons + quiz)*
- [x] **Probabilistic Models & EM** — GMM, EM algorithm, Naive Bayes *(course + 3 lessons + quiz)*

### Sequence & Probabilistic
- [x] **Recurrent Neural Networks** — hidden state, BPTT, vanishing gradient, LSTM/GRU, state-space models *(course + 4 lessons + quiz)*
- [x] **Graphical Models** — Bayesian Networks, MRFs, HMMs, belief propagation *(course + 3 lessons + quiz)*

### Advanced Deep Learning
- [x] **Attention & Transformers** — self-attention, multi-head & positional, architecture, modern attention (GQA/RoPE/FlashAttention), scaling laws, mixture of experts *(course + 6 lessons + quiz)*
- [x] **Generative Models** — discriminative vs generative, autoencoders, VAE, GAN, diffusion, ViT & modern GenAI (CFG, StyleGAN, latent diffusion) *(course + 6 lessons + quiz)*
- [x] **Graph Neural Networks** — graphs as data & message passing, GCN & GraphSAGE, graph attention/pooling/over-smoothing *(course + 3 lessons + quiz)*
- [x] **Computer Vision** — object detection (anchors/YOLO/FPN/NMS), segmentation (U-Net/Mask R-CNN), backbones, vision-language models (CLIP/BLIP-2), self-supervised learning *(course + 5 lessons + quiz)*
- [x] **NLP** — text preprocessing & BPE, word embeddings, seq2seq→BERT, LLM taxonomy, decoding & sampling, BERTopic, training embedding models *(course + 7 lessons + quiz)*
- [x] **Speech & Audio ML** — waveforms/STFT/mel spectrograms/MFCC, speech recognition (CTC, seq2seq, Whisper, WER) *(course + 2 lessons + quiz)*
- [x] **Recommender Systems** — the recommendation problem & ranking metrics, matrix factorization, two-tower retrieval, session-based & real-time, diversity/cold-start/exploration, ad ranking & CTR *(course + 6 lessons + quiz)*

### Reinforcement Learning
- [x] **Reinforcement Learning** — MDPs, Q-Learning, DQN, policy gradient & actor-critic, exploration & model-based RL, PPO→RLHF bridge *(course + 6 lessons + quiz)*

### Evaluation & Statistical ML
- [x] **Model Evaluation** — metrics, validation, training techniques, LLM & AI-system eval, learning theory, calibration *(course + 7 lessons + quiz)*
- [x] **Bayesian Methods** — Bayesian linear regression, Gaussian processes, Bayesian optimization *(course + 3 lessons + quiz)*
- [x] **Causal Inference** — confounding, Simpson's paradox, potential outcomes, do-calculus, backdoor adjustment *(course + 2 lessons + quiz)*
- [x] **Time Series** — stationarity/ACF, ARIMA/SARIMA, deep learning for forecasting, demand forecasting in production *(course + 4 lessons + quiz)*

### Applied & Production AI
- [x] **Building with LLMs** — prompting & in-context learning, CoT & structured output, embeddings & semantic search, RAG, RAG architectures (hybrid/contextual, GraphRAG, self-correcting, agentic, multimodal, structured), agents & tool use, AI-engineering architecture, reasoning models, LLM evaluation, observability, guardrails, code intelligence, voice & multimodal *(course + 14 lessons + quiz)*
- [x] **Fine-Tuning & Alignment** — SFT & instruction tuning, PEFT/LoRA/QLoRA, reward models, RLHF & DPO, model merging & quantization, knowledge distillation *(course + 6 lessons + quiz)*
- [x] **ML Systems & MLOps** — data engineering, deployment patterns, model compression, continual learning & test-in-production, monitoring, MLOps infra, CI/CD & continuous training (maturity levels), feature stores, model registry & governance *(integrated into `ml-in-practice`: 21 lessons + quiz, incl. fraud-detection, content-moderation & LLM-inference-optimization case studies)*
- [x] **LLMOps** — LLM evaluation & LLM-as-a-judge, observability/tracing & prompt management, guardrails & security (OWASP LLM Top 10) *(integrated into `building-with-llms` lessons 08–10)*
- [x] **Agentic System Design** — tool use/function calling & MCP, agent evaluation (outcome vs trajectory, pass@k), production deployment (orchestration, checkpointing, guardrails, cost/latency) *(integrated into `agent-design-patterns`: 11 lessons + quiz)*
- [x] **GPU Programming for ML** — GPU architecture & SIMT, the CUDA programming model, memory coalescing/tiling/occupancy/roofline, GPUs for deep learning (GEMM, tensor cores, mixed precision, fusion), distributed training (DP/ZeRO/FSDP, tensor & pipeline parallelism) *(course + 5 lessons + quiz)*

---

## Visualization Components Built

All viz are **pure-SVG React client components** (no D3 dependency). Shared
primitives live in `src/components/visualizations/viz-kit.tsx` (`VizFrame`,
`VizSlider`, `VizButton`, `VizStat`, `useAnimationLoop`, `seededRandom`,
`gaussian`, `scale`, `VIZ` colour tokens). Each viz is wired into a lesson via
`mdxComponents.tsx` and rendered with a `<ComponentName />` tag in the MDX.

| Component | File | Wired into lesson | Status |
|-----------|------|-------------------|--------|
| GradientDescentViz | `visualizations/GradientDescent/` | neural-networks/02-gradient-descent | ✅ |
| ActivationFunctionViz | `visualizations/ActivationFunction/` | neural-networks/01-what-is-a-neuron | ✅ |
| LinearRegressionViz | `visualizations/LinearRegression/` | linear-regression/01-linear-regression | ✅ |
| DecisionBoundaryViz | `visualizations/DecisionBoundary/` | linear-regression/02-logistic-regression | ✅ |
| KMeansViz | `visualizations/KMeans/` | clustering/01-k-means | ✅ |
| PCAViz | `visualizations/PCA/` | pca-dimensionality/01-pca | ✅ |
| VectorViz | `visualizations/Vector/` | linear-algebra/01-vectors-and-spaces | ✅ |
| MatrixTransformViz | `visualizations/MatrixTransform/` | linear-algebra/02-matrices-and-transformations | ✅ |
| EigenvectorViz | `visualizations/Eigenvector/` | linear-algebra/03-eigenvalues-and-eigenvectors | ✅ |
| FunctionTangentViz | `visualizations/FunctionTangent/` | calculus-for-ml/01-derivatives-and-gradients | ✅ |
| ComputationalGraphViz | `visualizations/ComputationalGraph/` | calculus-for-ml/02-chain-rule-and-backpropagation | ✅ |
| GradientFieldViz | `visualizations/GradientField/` | calculus-for-ml/03-multivariable-optimization | ✅ |
| DistributionViz | `visualizations/Distribution/` | probability-statistics/02-probability-distributions | ✅ |
| MLEViz | `visualizations/MLE/` | probability-statistics/03-maximum-likelihood-estimation | ✅ |
| BayesViz | `visualizations/Bayes/` | probability-statistics/04-bayesian-inference | ✅ |
| AttentionViz | `visualizations/Attention/` | transformers/01-self-attention | ✅ |
| ConvolutionViz | `visualizations/Convolution/` | cnns/01-convolution-operation | ✅ |
| VanishingGradientViz | `visualizations/VanishingGradient/` | rnns/02-bptt-and-vanishing-gradient | ✅ |
| KNNBoundaryViz | `visualizations/KNNBoundary/` | knn-decision-trees/01-knn | ✅ |
| MarginViz | `visualizations/Margin/` | svm/01-maximum-margin | ✅ |
| KernelViz | `visualizations/KernelViz/` | svm/02-kernel-trick | ✅ |
| DecisionTreeSplitViz | `visualizations/DecisionTreeSplit/` | knn-decision-trees/02-decision-trees | ✅ |
| NeuralNetworkViz | `visualizations/NeuralNetwork/` | neural-networks/03-layers-and-forward-pass | ✅ |
| LSTMGateViz | `visualizations/LSTMGate/` | rnns/03-lstm-and-gru | ✅ |
| DSeparationViz | `visualizations/DSeparation/` | graphical-models/01-bayesian-networks | ✅ |
| GridWorldViz | `visualizations/GridWorld/` | reinforcement-learning/01-markov-decision-processes | ✅ |
| DiffusionViz | `visualizations/Diffusion/` | generative-models/05-diffusion-models | ✅ |
| BaggingViz | `visualizations/Bagging/` | ensemble-methods/01-bagging-and-random-forests | ✅ |
| BoostingViz | `visualizations/Boosting/` | ensemble-methods/02-boosting | ✅ |
| QTableViz | `visualizations/QTable/` | reinforcement-learning/02-q-learning | ✅ |
| RNNUnrollViz | `visualizations/RNNUnroll/` | rnns/01-recurrent-neural-networks | ✅ |
| LatentSpaceViz | `visualizations/LatentSpace/` | generative-models/03-variational-autoencoders | ✅ |
| PoolingViz | `visualizations/Pooling/` | cnns/02-pooling-and-architectures | ✅ |
| CoalescingViz | `visualizations/Coalescing/` | gpu-programming/03-memory-and-performance | ✅ |
| SamplingDistributionViz | `visualizations/SamplingDistribution/` | probability-statistics/06-statistical-inference | ✅ |
| HypothesisTestViz | `visualizations/HypothesisTest/` | probability-statistics/07-hypothesis-testing | ✅ |
| MessagePassingViz | `visualizations/MessagePassing/` | graph-neural-networks/02-graph-convolutions | ✅ |
| MatrixFactorizationViz | `visualizations/MatrixFactorization/` | recommender-systems/02-matrix-factorization | ✅ |
| GaussianProcessViz | `visualizations/GaussianProcess/` | bayesian-methods/02-gaussian-processes | ✅ |
| MoERoutingViz | `visualizations/MoERouting/` | transformers/06-mixture-of-experts | ✅ |
| CalibrationViz | `visualizations/Calibration/` | model-evaluation/07-calibration-and-uncertainty | ✅ |
| TransferLearningViz | `visualizations/TransferLearning/` | cnns/04-transfer-learning | ✅ |
| PositionalEncodingViz | `visualizations/PositionalEncoding/` | transformers/02-multi-head-and-positional | ✅ |
| GMMResponsibilityViz | `visualizations/GMM/` | probabilistic-models/01-gaussian-mixture-models | ✅ |
| HMMViterbiViz | `visualizations/HMMViterbi/` | graphical-models/03-hidden-markov-models | ✅ |
| DendrogramViz | `visualizations/Dendrogram/` | clustering/02-hierarchical-and-dbscan | ✅ |
| GANTrainingViz | `visualizations/GANTraining/` | generative-models/04-generative-adversarial-networks | ✅ |
| TransformerBlockViz | `visualizations/TransformerBlock/` | transformers/03-transformer-architecture | ✅ **guided** |
| PerplexityViz | `visualizations/Perplexity/` | pca-dimensionality/02-t-sne-and-umap | ✅ |
| PolicyGradientViz | `visualizations/PolicyGradient/` | reinforcement-learning/04-policy-gradient | ✅ |
| BiasVarianceViz | `visualizations/BiasVariance/` | knn-decision-trees/03-bias-variance | ✅ |
| RegularizationPathViz | `visualizations/RegularizationPath/` | linear-regression/03-regularization | ✅ |
| SoftMarginViz | `visualizations/SoftMargin/` | svm/03-soft-margins | ✅ |
| BoostingShrinkageViz | `visualizations/BoostingShrinkage/` | ensemble-methods/03-xgboost | ✅ |
| SilhouetteViz | `visualizations/Silhouette/` | clustering/03-evaluating-clusters | ✅ |
| PCAReconstructionViz | `visualizations/PCAReconstruction/` | pca-dimensionality/03-pca-in-practice | ✅ |
| NaiveBayesVotesViz | `visualizations/NaiveBayesVotes/` | probabilistic-models/03-naive-bayes | ✅ |
| SamplingViz | `visualizations/Sampling/` | building-with-llms/01-prompt-engineering | ✅ |
| RAGRetrievalViz | `visualizations/RAGRetrieval/` | building-with-llms/04-retrieval-augmented-generation | ✅ |
| RAGArchitectureViz | `visualizations/RAGArchitecture/` | building-with-llms/14-rag-architectures | ✅ |
| GraphRAGViz | `visualizations/GraphRAG/` | building-with-llms/14-rag-architectures | ✅ **guided** |
| SamplingStrategiesViz | `visualizations/SamplingStrategies/` | ml-in-practice/06-training-data | ✅ |
| LoRAViz | `visualizations/LoRA/` | fine-tuning-alignment/02-peft-lora-qlora | ✅ |
| RewardModelViz | `visualizations/RewardModel/` | fine-tuning-alignment/03-reward-models | ✅ |
| QuantizationViz | `visualizations/Quantization/` | fine-tuning-alignment/05-model-merging-and-quantization | ✅ |
| ScalingLawViz | `visualizations/ScalingLaw/` | transformers/05-foundation-models-and-scaling | ✅ |
| ContrastiveViz | `visualizations/Contrastive/` | nlp/07-training-embedding-models | ✅ |
| CLIPSpaceViz | `visualizations/CLIPSpace/` | computer-vision/04-vision-language-models | ✅ |
| RolloutViz | `visualizations/Rollout/` | ml-in-practice/09-continual-learning-and-test-in-production | ✅ |
| AgentLoopViz | `visualizations/AgentLoop/` | agent-design-patterns/09-tool-use-and-mcp | ✅ |
| VCDimensionViz | `visualizations/VCDimension/` | wiki/vc-dimension | ✅ |
| LowRankViz | `visualizations/LowRank/` | linear-algebra/04-svd-and-low-rank | ✅ |
| KLDivergenceViz | `visualizations/KLDivergence/` | probability-statistics/05-entropy-and-kl-divergence | ✅ |
| OptimizerPathViz | `visualizations/OptimizerPath/` | optimization-ml/01-gradient-descent-variants | ✅ |
| TraceWaterfallViz | `visualizations/TraceWaterfall/` | building-with-llms/09-llm-observability-and-prompt-management (+ agent-design-patterns/11) | ✅ |
| CondorcetViz | `visualizations/Condorcet/` | agent-design-patterns/07-multi-agent-cooperation-patterns | ✅ |
| DecompositionViz | `visualizations/Decomposition/` | time-series/01-time-series-fundamentals | ✅ |
| ACFViz | `visualizations/ACF/` | time-series/02-arima-models | ✅ |
| ARIMAForecastViz | `visualizations/ARIMAForecast/` | time-series/03-deep-learning-for-time-series | ✅ |
| DistributedTrainingViz | `visualizations/DistributedTraining/` | gpu-programming/05-distributed-training-at-scale | ✅ |
| LatencyCriticalPathViz | `visualizations/LatencyCriticalPath/` | wiki/agent-metrics-taxonomy | ✅ |
| ProjectLoopViz | `visualizations/ProjectLoop/` | wiki/ml-project-loop + wiki/agentic-project-loop (`variant="ml"\|"agentic"`) | ✅ |
| AudioFeaturesViz | `visualizations/AudioFeatures/` | speech-audio/01-audio-representations | ✅ **guided** |
| BoxJenkinsViz | `visualizations/BoxJenkins/` | time-series/02-arima-models | ✅ **guided** |
| ContextAssemblyViz | `visualizations/ContextAssembly/` | agent-design-patterns/03-context-and-knowledge-patterns | ✅ **guided** |
| HierarchicalForecastViz | `visualizations/HierarchicalForecast/` | time-series/04-demand-forecasting-in-production | ✅ **guided** |
| AgentEvalViz | `visualizations/AgentEval/` | agent-design-patterns/10-evaluating-agents | ✅ **guided** |
| PreferenceTuningViz | `visualizations/PreferenceTuning/` | fine-tuning-alignment/04-rlhf-and-dpo | ✅ **guided** |
| ContinuousTrainingViz | `visualizations/ContinuousTraining/` | ml-in-practice/16-cicd-and-continuous-training | ✅ **guided** |

## Algorithm Traces Built

Steppable code players (`<AlgorithmTrace id="..." />`) — see "Adding an
algorithm trace". The player is `visualizations/AlgoTrace/AlgorithmTrace.tsx`;
each trace is a builder in `src/lib/algo-traces/` that runs the real algorithm
and records frames.

| Trace id | Builder | Wired into | Status |
|----------|---------|------------|--------|
| `bpe-merges` | `algo-traces/bpe.ts` | wiki/bpe-tokenization | ✅ |
| `scaled-dot-product-attention` | `algo-traces/attention.ts` | wiki/scaled-dot-product-attention | ✅ |
| `bm25-scoring` | `algo-traces/bm25.ts` | wiki/bm25-ranking | ✅ |
| `hnsw-search` | `algo-traces/hnsw.ts` | wiki/hnsw | ✅ |
| `kmeans-iterations` | `algo-traces/kmeans.ts` | wiki/kmeans-algorithm | ✅ |
| `dbscan-clustering` | `algo-traces/dbscan.ts` | wiki/dbscan-algorithm | ✅ |
| `decision-tree-split-search` | `algo-traces/decision-tree.ts` | wiki/decision-tree-information-gain | ✅ |
| `perceptron-learning` | `algo-traces/perceptron.ts` | wiki/perceptron-learning | ✅ |
| `em-gmm` | `algo-traces/em.ts` | wiki/em-algorithm | ✅ |
| `baum-welch` | `algo-traces/baum-welch.ts` | wiki/baum-welch | ✅ |
| `variable-elimination` | `algo-traces/variable-elimination.ts` | wiki/variable-elimination | ✅ |
| `metropolis-hastings` | `algo-traces/mcmc.ts` | wiki/mcmc-sampling | ✅ |
| `nms-suppression` | `algo-traces/nms.ts` | wiki/nms-algorithm | ✅ |
| `adaboost-rounds` | `algo-traces/adaboost.ts` | wiki/adaboost-algorithm | ✅ |
| `hierarchical-linkage` | `algo-traces/hierarchical.ts` | wiki/hierarchical-clustering | ✅ |
| `newtons-method` | `algo-traces/newton.ts` | wiki/newtons-method | ✅ |
| `hyperloglog` | `algo-traces/hyperloglog.ts` | wiki/hyperloglog | ✅ |
| `dgim-window` | `algo-traces/dgim.ts` | wiki/dgim-sliding-window | ✅ |
| `speculative-decoding` | `algo-traces/speculative-decoding.ts` | wiki/speculative-decoding | ✅ |
| `bptt-gradient-flow` | `algo-traces/bptt.ts` | wiki/bptt-algorithm | ✅ |
| `paged-attention` | `algo-traces/paged-attention.ts` | wiki/paged-attention | ✅ |
| `viterbi-decoding` | `algo-traces/viterbi.ts` | graphical-models/03-hidden-markov-models | ✅ |
| `value-iteration` | `algo-traces/value-iteration.ts` | reinforcement-learning/01-markov-decision-processes | ✅ |
| `continuous-batching` | `algo-traces/continuous-batching.ts` | wiki/continuous-batching | ✅ |
| `roc-construction` | `algo-traces/roc.ts` | wiki/roc-auc | ✅ |
| `bloom-filter` | `algo-traces/bloom-filter.ts` | streaming-ml/02-streaming-algorithms | ✅ |
| `pav-isotonic` | `algo-traces/isotonic.ts` | wiki/platt-scaling-and-isotonic-regression | ✅ |
| `beam-search` | `algo-traces/beam-search.ts` | nlp/05-decoding-and-sampling | ✅ |
| `q-learning` | `algo-traces/q-learning.ts` | reinforcement-learning/02-q-learning | ✅ |
| `optimizer-comparison` | `algo-traces/optimizers.ts` | optimization-ml/01-gradient-descent-variants | ✅ |
| `power-iteration` | `algo-traces/power-iteration.ts` | wiki/eigenvalue-computation | ✅ |
| `gradient-boosting-splits` | `algo-traces/gradient-boosting.ts` | ensemble-methods/03-xgboost | ✅ |
| `lasso-coordinate-descent` | `algo-traces/lasso-cd.ts` | wiki/ridge-lasso-paths | ✅ |
| `backprop-computational-graph` | `algo-traces/backprop-graph.ts` | calculus-for-ml/02-chain-rule-and-backpropagation | ✅ |

**Queue: see `prompts/algo-trace-checklist.md`** — built from an audit of all
untraced pages under `src/content`. Rounds 3 and 4 are complete; what remains is
**round 5**, a lower-priority list (DAgger, IVF search, walk-forward validation,
ARIMA order selection, FastICA, ADWIN, reservoir sampling, DDIM, Gibbs/ICM).

---

## Vibe Coding Tips for Claude Code

- **New viz?** Copy `prompts/new-visualization.md` into chat
- **New guided walkthrough?** Copy `prompts/new-guided-viz.md` into chat
- **New algorithm trace?** Copy `prompts/new-algorithm-trace.md` into chat
- **New lesson?** Copy `prompts/new-lesson.md` into chat
- **New exercise type?** Copy `prompts/new-exercise-type.md` into chat
- **New course?** Copy `prompts/new-course.md` into chat
- **New system-design case?** Copy `prompts/new-system-design-case.md` into chat

The `prompts/` directory contains ready-made task descriptions for each common operation.
Paste them directly into Claude Code to generate new content following established patterns.

When adding a visualization, always:
1. Check `src/components/mdx/mdxComponents.tsx` to see what's registered
2. Add the new component to that registry after creating it
3. Uncomment its import in `mdxComponents.tsx`

When adding a lesson, always:
1. Create both the `.mdx` and the `.ipynb` notebook with the same slug
2. The Colab link is auto-wired — no extra config needed
