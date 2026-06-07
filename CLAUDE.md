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
│   └── visualizations/         # One folder per viz
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
   order: NN
   type: concept | exercise | quiz | playground
   estimatedMinutes: N
   ---
   ```

### Adding a course

1. Create `src/content/courses/[slug]/index.mdx`
2. Add lesson MDX files to the same folder

### Styling rules

- Dark background: `bg-surface` (#0f1117), cards: `bg-surface-card` (#1a1d27)
- Primary color: `brand-500` (#6366f1)
- Use `card-glass` for bordered card containers
- Use `text-gradient` for hero/display text
- Use `prose-lesson` (never `prose`) on lesson content

### Component rules

- All interactive components → `"use client"` directive
- `src/lib/content.ts` is server-only — never import in client components

---

## Design System

### Color tokens

```
brand-{50..900}  — indigo/purple, primary actions
accent-teal      — success, beginner difficulty
accent-yellow    — warning, intermediate difficulty
accent-rose      — error, advanced difficulty
surface          — page background (#0f1117)
surface-card     — card background (#1a1d27)
surface-elevated — hover/active state
surface-border   — borders
```

### Visual language

- Dark background everywhere
- Cards with subtle borders, no drop shadows
- Hover: border color lift + `-translate-y-0.5`
- Difficulty: teal (beginner), yellow (intermediate), rose (advanced)
- Progress: teal check circles on completed lessons

---

## Vibe Coding Tips

- **New viz?** Copy `prompts/new-visualization.md` into chat
- **New lesson?** Copy `prompts/new-lesson.md` into chat
- **New exercise type?** Copy `prompts/new-exercise-type.md` into chat
- **New course?** Copy `prompts/new-course.md` into chat
