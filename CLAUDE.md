# ML Viz — Claude Code Context

**Purpose:** Interactive ML education website inspired by Brilliant.org.
Every lesson teaches a concept visually, followed by an exercise.

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

---

## Project Structure

```
src/
├── app/                        # Next.js pages
│   ├── page.tsx                # Homepage
│   ├── courses/page.tsx        # Course list
│   ├── courses/[courseSlug]/   # Course overview
│   │   └── [lessonSlug]/       # Individual lesson
│   └── playground/page.tsx     # Free-form viz sandbox
│
├── components/
│   ├── layout/                 # SiteHeader, HeroSection
│   ├── lessons/                # CourseCard, LessonList, LessonLayout
│   ├── exercises/              # Exercise, MultipleChoiceExercise, SliderExercise
│   ├── mdx/                    # mdxComponents.tsx (registry), Callout
│   └── visualizations/         # One folder per viz (see below)
│
├── content/courses/            # MDX files — one folder per course
│   └── [course-slug]/
│       ├── index.mdx           # Course metadata (frontmatter only)
│       └── NN-title.mdx        # Lessons (NN = 2-digit order number)
│
├── lib/
│   ├── utils.ts                # cn(), clamp(), lerp(), range()
│   ├── content.ts              # File-system MDX loaders (server-side only)
│   └── progress.ts             # Zustand progress store
│
└── types/
    ├── course.ts               # CourseMeta, LessonMeta, CourseWithLessons
    ├── exercise.ts             # Exercise union type, ExerciseResult
    └── progress.ts             # UserProgress, LessonProgress
```

---

## Key Conventions

### Adding a visualization

1. Create `src/components/visualizations/[ConceptName]/[ConceptName]Viz.tsx`
2. Mark `"use client"` — all D3 code runs client-side
3. Use `useRef<SVGSVGElement>` + `useEffect` for D3 rendering
4. Accept a `className?: string` prop and spread with `cn()`
5. Wrap output in `<div className="not-prose card-glass p-4 my-6">`
6. Export from file, then add to `src/components/mdx/mdxComponents.tsx`

**Template:** see `prompts/new-visualization.md`

### Adding an exercise

All exercises use the `Exercise` component from `src/components/exercises/Exercise.tsx`.
In MDX, pass an inline `exercise` prop matching the `Exercise` union type from `src/types/exercise.ts`.

Supported types: `multiple-choice`, `slider` — add new types by:
1. Adding variant to `src/types/exercise.ts`
2. Creating `src/components/exercises/[Type]Exercise.tsx`
3. Adding a branch in `Exercise.tsx`

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
   ---
   ```
3. Use `<Callout type="tip|info|warning|success">` for highlighted blocks
4. Use `<Exercise exercise={{...}} />` for inline exercises
5. Use `$$...$$` for display math, `$...$` for inline math

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
   ---
   ```
2. Add lesson MDX files to the same folder

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

---

## Planned ML Concepts (prioritized)

### Tier 1 — Core (build first)
- [x] Neural Networks — perceptron, forward pass, backprop
- [ ] Gradient Descent — loss surfaces, SGD, Adam
- [ ] Linear & Logistic Regression

### Tier 2 — Intermediate
- [ ] Convolutional Neural Networks — kernels, pooling
- [ ] Recurrent Neural Networks — hidden state, vanishing gradient
- [ ] Attention & Transformers — self-attention visualization

### Tier 3 — Advanced
- [ ] Generative Models — VAE latent space
- [ ] Reinforcement Learning — policy gradient
- [ ] Diffusion Models — forward/reverse process

---

## Vibe Coding Tips for Claude Code

- **New viz?** Run: copy `prompts/new-visualization.md` into chat
- **New lesson?** Copy `prompts/new-lesson.md` into chat
- **New exercise type?** Copy `prompts/new-exercise-type.md` into chat
- **New course?** Copy `prompts/new-course.md` into chat

The `prompts/` directory contains ready-made task descriptions for each common operation.
Paste them directly into Claude Code to generate new content following established patterns.

When adding a visualization, always:
1. Check `src/components/mdx/mdxComponents.tsx` to see what's registered
2. Add the new component to that registry after creating it
3. Uncomment its import in `mdxComponents.tsx`
