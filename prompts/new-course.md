# Prompt: Add a New Course

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add a new course to the ml-viz website.

**Course slug:** `[kebab-case-name]`
**Location:** `src/content/courses/[slug]/`

**Course details:**
- Title: [TITLE]
- Description: [1-2 sentence description]
- Difficulty: [beginner | intermediate | advanced]
- Topics: [comma-separated list]
- Estimated hours: [N]
- Prerequisites: [list of course slugs, or empty]
- Order: [N] (determines sort order on the courses page)
- Cover color: pick from these gradients:
  - `bg-gradient-to-r from-brand-500 to-accent-teal`
  - `bg-gradient-to-r from-brand-600 to-accent-orange`
  - `bg-gradient-to-r from-brand-700 to-accent-rose`
  - `bg-gradient-to-r from-accent-teal to-brand-400`

**Lessons to create:** [list 3-6 lesson titles with types]

**Steps:**
1. Create `src/content/courses/[slug]/index.mdx` with the frontmatter above
2. Create at least 2 lesson MDX files following the `new-lesson.md` template
3. The course will automatically appear on the /courses page

See `src/content/courses/neural-networks/` as a reference.
