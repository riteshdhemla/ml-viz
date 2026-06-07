# ML Viz

> Interactive machine learning education, inspired by Brilliant.org.

See every weight, gradient, and decision boundary come alive.
Concepts are taught visually, followed by exercises that build real intuition.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **D3.js** for ML visualizations
- **Framer Motion** for animations
- **MDX** for lesson content with embedded interactive components
- **Tailwind CSS v4** with dark-first design system
- **KaTeX** for math rendering
- **Zustand** for local progress tracking

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding content (vibe coding)

The `prompts/` directory contains ready-made prompts for Claude Code:

| Task | Prompt file |
|------|-------------|
| Add a new ML visualization | `prompts/new-visualization.md` |
| Add a new lesson | `prompts/new-lesson.md` |
| Add a new course | `prompts/new-course.md` |
| Add a new exercise type | `prompts/new-exercise-type.md` |

Paste any prompt into Claude Code and fill in the brackets.

## Structure

```
src/
├── app/              # Next.js pages
├── components/
│   ├── visualizations/  # D3.js ML diagrams
│   ├── exercises/       # Interactive exercises
│   ├── lessons/         # Course/lesson UI
│   └── mdx/             # MDX component registry
├── content/courses/  # MDX lesson files
├── lib/              # Utilities, content loader, progress store
└── types/            # TypeScript types
```

Full context for AI development: see `CLAUDE.md`.
