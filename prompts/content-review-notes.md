# Content Review Notes

Append-only findings from `prompts/content-review-plan.md`. **Format per item:**

```
## <queue item> — <date>
### <course/lesson-slug or wiki/slug> — grasp N/5
- P1|P2|P3: <finding> → <proposed improvement>
- no issues            (when clean — say so explicitly)
```

Severity: **P1** blocks understanding · **P2** real friction · **P3** polish.
Notes are proposals, not commitments — triage happens after the queue completes.

---

## Seed notes (spot review during Langfuse/OTel/sub-agent content addition) — 2026-07-02

Scope: only the four pieces read end-to-end while adding the new wiki pages.
The full course items in the queue remain unchecked — these are early samples,
not substitutes for the full pass.

### building-with-llms/09-llm-observability-and-prompt-management — grasp 4/5
- P2: The trace/span tree — the lesson's central mental model — is described in
  text only. A small static trace-waterfall figure (or a `viz-kit` component
  showing spans nesting under a request) would carry the concept in seconds.
  → candidate `TraceWaterfallViz`, reusable by agent-design-patterns/11.
- P2: Drift section names three drift types but shows no concrete "proxy
  catches it" example → add one 2-line example (e.g. format-validity rate
  dropping after a provider model update).
- P3: In the cost formula, $n$ and $p$ are only defined by subscript naming
  → add "where $n$ = tokens, $p$ = price per token" inline.
- P3: (addressed 2026-07-02) no pointer to concrete tooling/standards
  → `<WikiLink slug="langfuse-and-opentelemetry">` added.

### agent-design-patterns/07-multi-agent-cooperation-patterns — grasp 4/5
- P2: Condorcet's jury theorem is the lesson's one mathematical claim, given as
  a formula plus two spot values. A tiny plot of $P(\text{majority correct})$
  vs $N$ for a few $p$ curves would make "approaches 1" *visible* → candidate
  mini-viz or static figure; at minimum a 3-row table ($N$=1,5,11).
- P2: The debate synthesis equation uses $\text{score}(A_r)$ without ever
  defining the score function; as written the equation adds confusion, not
  rigor → either define it ("mediator's per-round rubric grade") or drop the
  equation and keep the 3-step protocol.
- P3: Borda count appears in the table without a worked one-liner; it's the
  only aggregation rule a newcomer likely hasn't met → 1-sentence example
  (3 options, 3 voters).
- P3: (addressed 2026-07-02) control-flow axis (sequential/parallel/loop) was
  absent → `<WikiLink slug="sub-agent-orchestration">` added.

### agent-design-patterns/11-deploying-agents — grasp 4/5
- P2: Six systems topics (topology, checkpointing, HITL, guardrails,
  observability, cost) in one 20-minute lesson is the densest pacing in the
  course; the checkpointing/state-graph section in particular compresses a big
  idea into four bullets → link the state-graph paragraph to `/wiki/langgraph`
  (page exists, currently only linked from building-with-llms/05).
- P3: "Thought / Action / Observation" loop vocabulary is used here but defined
  two courses away (building-with-llms/05) → add the back-link at first use.
- P3: (addressed 2026-07-02) observability bullet now links to
  `<WikiLink slug="agent-observability">`.

### wiki/agent-protocols-mcp-a2a — grasp 5/5
- P3: JSON-RPC 2.0 is assumed known; a half-sentence gloss ("a minimal
  request/response format over any transport — method, params, id") would cover
  the beginner reading this from the agents lesson.
- P3: The A2A task lifecycle states are listed inline; a tiny state diagram
  (`submitted → working → input-required → completed/failed`) as a code block
  would make mistake #4 ("ignoring task lifecycle") land harder.
- Otherwise a model example of the wiki format: concrete wire examples, a
  composition diagram, a comparison table, and security framing.

### Recurring themes to watch for in the full pass
1. **Applied-course lessons are viz-poor**: foundations/classical courses
   average ~1 viz per lesson; building-with-llms and agent-design-patterns
   lessons are mostly text + tables. Where a concept is a *tree, flow, or
   loop* (traces, orchestration topologies, agent loops), a small SVG viz is
   likely the single highest-impact improvement.
2. **Equations without defined symbols** show up even in otherwise strong
   lessons — rubric dimension 3 deserves explicit attention.
3. **Cross-course vocabulary** (ReAct loop, trace, span, HITL) is defined once
   and reused across courses without back-links; learners entering via search
   land mid-vocabulary. Consider a "first use in this lesson → link" rule.

---

## linear-algebra — 2026-07-02

Scope: index + 4 lessons + quiz, 10 registry exercises, all 4 notebooks
(skimmed for structure). Assumed prerequisites: none (course lists `[]`).

### linear-algebra/01-vectors-and-spaces — grasp 5/5
- P3: the house example packs the *target* (price) into the feature vector
  `[1500, 3, 300000]`; every later lesson separates x and y → add a clause
  ("here we treat price as just another coordinate") or drop price.
- P3: "linearly independent" is used in the basis definition one section
  *before* it is defined → swap the two sections or add "(defined below)".
- P3: all three exercises sit below "Related concepts" at the very bottom;
  `linalg-dot-product` would land better right after the projection section
  (course-wide pattern — see themes).
- Otherwise exemplary: numeric worked examples, VectorViz placed exactly where
  the dot product is taught, and the "Connection to ML" section is the best
  motivation block in the foundations cluster.

### linear-algebra/02-matrices-and-transformations — grasp 4/5
- P2: the worked example composes "do S (scale), then R (rotate)" as RS, but
  the code block beneath uses different letters *and the opposite order*
  (A=scale, B=rotate, `A @ B` = rotate-then-scale). A learner checking the code
  against the math gets a false confirmation → reuse R/S and compose `R @ S`.
- P3: the composition snippet prints a result with no expected-output comment;
  every other snippet in the course annotates results inline.
- P3: PSD appears in the special-matrices table as a bare quadratic form with
  no intuition, then resurfaces in lesson 03's SVD callout → one clause
  ("directions are never flipped; variances can't be negative").
- P3: MatrixTransformViz sits directly under the "The determinant" heading
  *before* the determinant is defined → move it after the definition paragraph
  or give it a one-line lead-in.

### linear-algebra/03-eigenvalues-and-eigenvectors — grasp 4/5
- P2: "We used SVD briefly in the PCA connection above" is false — the PCA
  section never mentions SVD; the dangling reference sends the reader scrolling
  back for something that isn't there → rewrite the SVD section opener.
- P2: the SVD section predates lesson 04 and now duplicates it (worse) — trim
  to a 3-sentence teaser + forward link to
  `/courses/linear-algebra/04-svd-and-low-rank`, and add lesson 04 to Related
  concepts (currently absent). This also fixes the P2 above.
- P3: PCA snippet lacks `import numpy as np` and an rng seed (course
  convention elsewhere is seeded, self-contained snippets).
- P3: "Trace = total variance preserved" is asserted for general matrices;
  it's a covariance-matrix statement → qualify.
- Good: the `eigenvalue-computation` WikiLink is exactly the right extraction;
  the 2×2 worked example including the null-space step is complete.

### linear-algebra/04-svd-and-low-rank — grasp 5/5
- Strongest lesson in the course: geometric rotate–stretch–rotate framing,
  numeric Eckart–Young example, code that *verifies* the theorem, viz sweep,
  and a genuinely transfer-level exercise.
- P3: it name-drops "the spectral theorem" as if known; lesson 03's symmetric
  callout teaches the fact but never names it → add the name in 03 for
  continuity.

### linear-algebra/05-quiz — grasp 3/5
- P2: the quiz reuses six exercise ids the learner already answered inline in
  lessons 01–03 — zero new assessment, and since results key by exercise id in
  the progress store they can render pre-answered. → new ids with fresh
  numbers/scenarios, ideally at the transfer level of `linalg-svd-rank`.
- P2: no question covers lesson 04 even though `linalg-svd-rank` exists →
  add it to the quiz.

### Exercises (registry)
- Well-formed throughout: hints, explanations, plausible distractors (e.g.
  `linalg-dot-product`'s 14 = catching pairwise-max confusion). Mostly
  recall/compute level; `linalg-svd-rank` shows the transfer-level bar the
  rest could aim for. `linalg-orthogonality`'s distractor "Depends on the
  norms" is a nice misconception catch.

### Notebooks
- All four follow the standard structure (back-link, dark style, "Your turn"
  with `TODO(you)` + silent asserts). No issues found on structural skim.

### Course meta
- P3: `CLAUDE.md` roadmap says "course + 3 lessons" (it's 4 + quiz), and
  LowRankViz is missing from the viz registry table.
- `estimatedHours: 3` checks out (68 lesson-min × 2.5 / 60 ≈ 2.83 → 3.0). ✓

### Themes reinforced
- Exercises stacked at lesson bottom instead of after the concept they test
  (also seen in seed notes) — worth a course-wide convention decision.
- Snippets should be self-contained (imports + seed) — violated once here.

---

## Fix queue (populate after review queue completes)

*(empty — triage P1s first, then high-frequency P2 themes)*
