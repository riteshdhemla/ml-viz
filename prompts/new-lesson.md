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

**Exercise format reference:**

Multiple choice:
```mdx
<Exercise exercise={{
  id: "unique-id",
  type: "multiple-choice",
  question: "...",
  hint: "...",
  explanation: "Full explanation shown after answering.",
  options: [
    { id: "a", label: "Option A", isCorrect: false },
    { id: "b", label: "Option B", isCorrect: true },
    { id: "c", label: "Option C", isCorrect: false },
  ]
}} />
```

Slider:
```mdx
<Exercise exercise={{
  id: "unique-id",
  type: "slider",
  question: "...",
  hint: "...",
  explanation: "...",
  min: 0, max: 1, step: 0.01,
  correctRange: [0.3, 0.7],
  unit: ""
}} />
```

See `src/content/courses/neural-networks/01-what-is-a-neuron.mdx` as a reference.
