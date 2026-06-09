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

### CD pipeline — auto-deploy on release tag

Pushes to `main` **do not** auto-deploy. Production deploys are triggered by a release tag.

```bash
git tag v1.0.0
git push origin v1.0.0
```

This runs `.github/workflows/cd.yml` which:
1. Type-checks and builds (quality gate)
2. Deploys to Vercel production via Vercel CLI
3. Creates a GitHub Release with auto-generated changelog and deployment URL

A CI workflow (`.github/workflows/ci.yml`) also runs on every PR and `main` push to catch type errors and build failures early.

### One-time secrets setup (required before first tag deploy)

Add these in **GitHub → Settings → Secrets and variables**:

**Repository secrets** (`Settings → Secrets → Actions`):

| Secret | Where to get it |
|--------|----------------|
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Run `vercel link` locally, then check `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Same file → `projectId` |

**Repository variables** (`Settings → Variables → Actions`):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://ml-viz.vercel.app` |

> Tip: run `npx vercel link` in the repo root once to generate `.vercel/project.json`, copy the IDs, then delete the file (it is gitignored).

### Initial Vercel project setup (do this once)

```bash
npm i -g vercel
vercel login
vercel link          # connects local repo to a Vercel project
vercel env add NEXT_PUBLIC_SITE_URL production   # set the env var in Vercel too
```

> **Notebook Colab links:** Each lesson's "Open in Colab" button points to notebooks on the `main` branch. Merge your branch to `main` before tagging so Colab links resolve in production.

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
