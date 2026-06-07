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

## Deploy to Vercel

### One-click (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Friteshdhemla%2Fml-viz&env=NEXT_PUBLIC_SITE_URL&envDescription=Your%20production%20URL%20(e.g.%20https%3A%2F%2Fml-viz.vercel.app)&project-name=ml-viz&repository-name=ml-viz)

### Manual steps

1. Push this repo to GitHub (if not already there)
2. Go to [vercel.com/new](https://vercel.com/new) and import the `riteshdhemla/ml-viz` repo
3. Vercel auto-detects Next.js — no build settings needed
4. Add one environment variable:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` |

5. Click **Deploy**

> **Notebook Colab links:** Each lesson's "Open in Colab" button points to the notebook files on the `main` branch of this GitHub repo. Merge your changes to `main` before deploying to ensure the links resolve.

### Re-deploying after content changes

Vercel redeploys automatically on every push to the connected branch.
MDX content and notebooks are compiled at build time — no server restart needed.

## Adding content (vibe coding)

The `prompts/` directory has ready-made prompts for Claude Code:

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

notebooks/            # Jupyter notebooks (one per lesson)
└── [course-slug]/
    └── [lesson-slug].ipynb   # Auto-linked via Colab button
```

Full context for AI development: see `CLAUDE.md`.
