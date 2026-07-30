# ML Viz

> Learn machine learning by seeing it, questioning it, and building it.

See every weight, gradient, and decision boundary come alive. Every concept is
taught three ways: an **interactive visualization** you can poke at, a
**runnable notebook** where you build it from scratch, and **exercises** that
check the intuition stuck. Two project loops — the ML loop and the agentic
loop — thread the whole curriculum, so every technique answers the same
question: *which slot does this fill, and what was breaking without it?*

What's inside:

- **30+ courses** from linear algebra to GPU programming, LLM engineering, and
  agent design — each lesson paired with an "Open in Colab" notebook
- **Interactive visualizations** (80+ pure-SVG components) for the ideas that
  only click when you can drag a slider
- **Concept wiki** of deep-dive reference pages with worked traces
- **System-design case studies** — Socratic, interview-style walkthroughs of
  real ML, agentic, and generative-AI systems that ask you to commit to an
  answer before revealing one
- **Concept map & spine navigation** generated from content metadata, plus
  local progress tracking and ⌘K search

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Pure-SVG React components** for ML visualizations (shared primitives in `viz-kit.tsx`)
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
| `NEXT_PUBLIC_SITE_URL` | `https://ml-viz-ruby.vercel.app` |

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
| Add a system-design case study | `prompts/new-system-design-case.md` |

Paste any prompt into Claude Code and fill in the brackets.

## Structure

```
src/
├── app/              # Next.js pages
├── components/
│   ├── visualizations/  # Pure-SVG ML diagrams
│   ├── exercises/       # Interactive exercises
│   ├── lessons/         # Course/lesson UI
│   └── mdx/             # MDX component registry
├── content/
│   ├── courses/      # MDX lesson files
│   ├── wiki/         # Concept-wiki deep dives
│   └── system-design/# Socratic system-design case studies
├── lib/              # Utilities, content loader, progress store
└── types/            # TypeScript types

notebooks/            # Jupyter notebooks (one per lesson)
└── [course-slug]/
    └── [lesson-slug].ipynb   # Auto-linked via Colab button
```

Full context for AI development: see `CLAUDE.md`.
