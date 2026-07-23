# Prompt: Add a New Lesson

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add a new lesson to the **[COURSE SLUG]** course in the ml-viz website.

**File:** `src/content/courses/[course-slug]/[NN]-[kebab-title].mdx`
(NN = two-digit order number, e.g. 03)

**Lesson details:**
- Title: [LESSON TITLE]
- Type: [concept | exercise | quiz | playground]
- Estimated time: [N] minutes
- What it covers: [DESCRIPTION]

**Content requirements:**
- Explain the concept clearly, building from intuition before math
- Include LaTeX math using `$$...$$` for display and `$...$` for inline
- Add at least one `<Callout>` block (type: tip, info, warning, or success)
- Add at least one `<Exercise>` block (type: multiple-choice or slider)
- If there is a relevant visualization component, embed it with `<[Name]Viz />`
- **Spine (required for non-quiz lessons):** add `spineStages: [<1–3 stage ids>]`
  to the frontmatter (valid stages come from the course's `spine` — see the
  "The spine & the concept graph" section of `CLAUDE.md`), and open by applying
  the **slot test**: name the stage(s) this lesson advances *and* what was
  breaking before / what it replaced — a light one-clause touch, not boilerplate.
  `spine-integrity.test.ts` fails if the lesson is untagged.

**Exercise format reference:**

Exercise data lives in the registry `src/lib/exercises.ts`. Lessons reference it
by id — **never inline a JS object** (MDX runs with `blockJS: true`, which would
strip it to `undefined` and break the build).

1. Add a typed entry to the `allExercises` array in `src/lib/exercises.ts`:

   Multiple choice:
   ```ts
   {
     id: "unique-id",
     type: "multiple-choice",
     question: "...",
     hint: "...",
     explanation: "Full explanation shown after answering.",
     options: [
       { id: "a", label: "Option A", isCorrect: false },
       { id: "b", label: "Option B", isCorrect: true },
       { id: "c", label: "Option C", isCorrect: false },
     ],
   }
   ```

   Slider:
   ```ts
   {
     id: "unique-id",
     type: "slider",
     question: "...",
     hint: "...",
     explanation: "...",
     min: 0, max: 1, step: 0.01,
     correctRange: [0.3, 0.7],
     unit: "",
   }
   ```

2. Reference it from the lesson MDX:
   ```mdx
   <Exercise id="unique-id" />
   ```

See `src/content/courses/neural-networks/01-what-is-a-neuron.mdx` and
`src/lib/exercises.ts` as references.

---

## Also create the companion notebook

Create `notebooks/[course-slug]/[NN]-[kebab-title].ipynb` with the **same slug** as the MDX file.
The "Open in Colab" button is auto-wired — no frontmatter needed.

**Notebook structure:**
1. Markdown cell: `# [Lesson Title]` + `**Companion lesson:** https://ml-viz-ruby.vercel.app/courses/[course-slug]/[lesson-slug]`
2. Code cell: `import numpy as np; import matplotlib.pyplot as plt` + dark plot style
3. Alternating markdown cells (concept/equation in LaTeX) + code cells (clean Python implementation)
4. At least one visualization using matplotlib
5. Final cell: a mini exercise the user can modify (change a parameter and re-run)

**Matplotlib dark style to use at the top:**
```python
plt.rcParams['figure.facecolor'] = '#0f1117'
plt.rcParams['axes.facecolor'] = '#1a1d27'
plt.rcParams['text.color'] = 'white'
plt.rcParams['axes.labelcolor'] = '#94a3b8'
plt.rcParams['xtick.color'] = '#94a3b8'
plt.rcParams['ytick.color'] = '#94a3b8'
plt.rcParams['axes.edgecolor'] = '#2e3347'
```

See `notebooks/neural-networks/01-what-is-a-neuron.ipynb` as a reference.

---

## Exercise placement

Place each `<Exercise />` **immediately after the section that teaches its
concept** (or, at latest, after the last content section — always *before*
"## Common mistakes" / "## Key takeaways"). Never stack exercises at the very
bottom after "Related concepts": learners navigate away at the link list and
miss them. Quizzes are the exception — they are exercise-only pages.

---

## When inserting a lesson into an existing course

Content added later creates **redundancy seams**. Before finishing:

1. **Sweep the neighbours.** Read the lessons immediately before and after the
   new one; trim anything they teach that the new lesson now covers better
   (leave a 2–3 line recall + link, not a re-teach), and remove any forward
   material the new lesson supersedes.
2. **Update the quiz.** Add coverage for the new lesson (prefer fresh
   quiz-only exercise ids over reusing in-lesson ids).
3. **Back-link (make it reciprocal).** Add the new lesson to the
   `relatedLessons` of any wiki page that covers the same topic **and** add a
   `<WikiLink>` / `/wiki/[slug]` link from the lesson back to each such page.
   Both directions are required: a wiki page's "Referenced by" footer asserts
   the lesson links back, and the integrity test does *not* verify it — a
   one-sided link silently overstates. (This was the single most common defect
   found in the site-wide content review.)
4. **Recompute** the course's `estimatedHours` and update `CLAUDE.md`'s
   roadmap lesson count.
