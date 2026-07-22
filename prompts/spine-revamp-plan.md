# Spine Revamp Plan — Threading the Project Loop Through All Material

**Goal:** give the curriculum a *spine* — a recurring project-loop framework that
every course, lesson, and wiki page visibly hangs off — so a learner always knows
*where they are in a real project* while studying any concept.

Two spines, two loops:

1. **ML project loop** (all classical/deep/statistical ML material):

   > **data → hypothesis space → objective → optimization → evaluation → deployment feedback**

2. **Agentic project loop** (agent/LLM-engineering material), reflecting how
   agentic projects actually work:

   > **task definition → context & tools → orchestration loop → evaluation → guardrails → operations feedback**

This file is the **single source of truth** for the revamp. It follows the same
loop-executable conventions as `prompts/content-build-checklist.md`: one queue
item = one iteration = one commit, verify gate mandatory. It is written so a
strong model (Opus) can pick any item and refine the material without
re-deriving context.

---

## How to run this

```
/loop 20m Follow prompts/spine-revamp-plan.md: do the NEXT single unchecked item, then stop.
```

### Per-iteration protocol

1. **Sync state.** `git pull` the working branch; find the first `[ ]` item.
2. **Claim it** (`[ ]` → `[~]`), commit the claim.
3. **Build exactly that item** per its Definition of Done below and the
   conventions in `CLAUDE.md`. Phase A must be complete before Phase B items;
   Phase B before Phase C.
4. **Verify (hard gate):** `npm run type-check && npm run build && npm test`.
   Never push red. If blocked: revert, `[~]` → `[ ]`, append
   `<!-- blocked: reason -->`, stop.
5. **Check off** (`[~]` → `[x]`), update `CLAUDE.md` if the item added a
   component/wiki page, commit + push, stop.

Legend: `[ ]` todo · `[~]` in-progress · `[x]` done.

---

## 1. The two spines (canonical definitions)

These definitions are the contract. All stage ids, labels, and one-liners below
go verbatim into `src/lib/spine.ts` (Phase A). Refine wording only there —
content must always import/reference, never restate divergently.

### ML project loop (`spine: "ml"`)

| # | Stage id | Label | What the stage means |
|---|----------|-------|----------------------|
| 1 | `data` | Data | Collect, clean, label, split, and represent the raw material; sampling, leakage, features |
| 2 | `hypothesis-space` | Hypothesis space | Choose the family of functions the model can express — architecture, inductive bias, capacity |
| 3 | `objective` | Objective | Define what "good" means mathematically — loss, likelihood, regularization, constraints |
| 4 | `optimization` | Optimization | Search the hypothesis space for parameters that score well — GD variants, EM, convexity, compute |
| 5 | `evaluation` | Evaluation | Estimate generalization honestly — metrics, validation, calibration, error analysis |
| 6 | `feedback` | Deployment feedback | Ship, monitor, detect drift, collect new signal, retrain — the loop closes back into *data* |

### Agentic project loop (`spine: "agentic"`)

Grounded in what the existing agentic courses already teach (see §3 mapping):

| # | Stage id | Label | What the stage means |
|---|----------|-------|----------------------|
| 1 | `task` | Task definition | Define the goal, environment, and success criteria; what the agent is *for* and when it should act |
| 2 | `context` | Context & tools | Design what the model sees and can do — prompts, retrieval/RAG, memory, tool schemas, MCP |
| 3 | `orchestration` | Orchestration loop | The runtime loop — plan → act → observe, reflection, model querying, multi-agent topologies |
| 4 | `evaluation` | Evaluation | Judge outcomes *and* trajectories — pass@k, tool-selection accuracy, LLM-as-judge, benchmarks |
| 5 | `guardrails` | Guardrails | Contain failure — input/output guardrails, injection defense, HITL gates, permissions |
| 6 | `operations` | Operations feedback | Deploy, trace, watch cost/latency, version prompts, learn from production — closes back into *task* |

**Deliberate parallels** (teach these explicitly in the hub pages): stage 4↔4
(evaluation is evaluation, but agents add trajectory), stage 6↔6 (both loops
close via production feedback), agentic `context` ≈ ML `data` (what the system
consumes), agentic `orchestration` ≈ ML `optimization` (the search process at
runtime instead of training time).

### The slot test (the pedagogical contract)

The reason the spine exists: ML curricula organized as a catalog leave learners
with fifty disconnected techniques and no way to place a fifty-first. The fix
is that **every technique modifies exactly one or two slots of its loop** —
focal loss is an `objective` change; Adam is an `optimization` change; a
transformer is a `hypothesis-space` change; dropout is capacity control
(`hypothesis-space`); reranking is a `context` change; reflection is an
`orchestration` change. The framing to repeat in every lesson:

> **"Which slot does this modify, and what was breaking before?"**

The `spineStages` tag names the slot; the prose names the failure the
technique fixes and what it replaced. The repetition is the point — a new
paper should become "which slot, and what was breaking?" rather than another
thing to memorize. The transfer test of the whole revamp: a learner can place
a technique they have *not* been taught (§2.9 makes this an exercise pattern).

---

## 2. Architecture (what Phase A builds)

Grounding facts from the codebase (verified 2026-07-22):

- Frontmatter is parsed by `gray-matter` in `src/lib/content.ts` and **cast**
  (`{ ...data, slug } as LessonMeta`) — new YAML keys flow through with zero
  parser changes. Add optional fields to `src/types/course.ts` for typing.
- Validation lives in vitest, not a schema lib:
  `src/lib/__tests__/content-integrity.test.ts` asserts known fields with
  closed sets (`DIFFICULTIES`, `LESSON_TYPES`). Spine enforcement goes in a
  **new** `src/lib/__tests__/spine-integrity.test.ts`.
- Lesson MDX renders via `next-mdx-remote` with **`blockJS: true`**
  (`src/components/mdx/MdxContent.tsx`) — MDX component props must be literal
  strings; structured data must resolve from a registry keyed by string,
  exactly like `<Exercise id>` / `src/lib/exercises.ts`.
- `LessonLayout.tsx` (`src/components/lessons/`) is a server component that
  already renders per-lesson chrome from `meta` — the spine strip renders
  there automatically from frontmatter, **no per-MDX-body tag needed**.
- Course folders may contain **only `.mdx` files** (content-integrity test) —
  spine data lives in frontmatter + `src/lib/spine.ts`, never sidecar files.
- Wiki pages group by `topics[0]` on `/wiki`; every wiki page requires a
  companion `notebooks/wiki/<slug>.ipynb` (wiki-integrity test).

### Design decisions

1. **Frontmatter, not body tags, carries the mechanics.**
   - Course `index.mdx`: `spine: ml | agentic` (which loop the course lives on).
   - Lesson: `spineStages: [objective, optimization]` — the 1–3 stages the
     lesson chiefly advances. Quizzes get none (they span the course).
   - Types: `CourseMeta.spine?: SpineId`, `LessonMeta.spineStages?: SpineStageId[]`.
2. **`SpineNav`** — small server component rendered by `LessonLayout` between
   the header and `<article>` when the lesson has `spineStages`: a compact
   horizontal 6-stage strip (stage dots + labels, current stage(s) highlighted
   in `brand-500`, others `text-slate-600`), whole strip links to the hub wiki
   page (`/wiki/ml-project-loop` or `/wiki/agentic-project-loop`). Style like
   the existing top-bar chrome: subtle, one line, no card.
3. **`ProjectLoopViz`** — one pure-SVG client viz
   (`src/components/visualizations/ProjectLoop/ProjectLoopViz.tsx`, per
   `prompts/new-visualization.md` conventions: `VizFrame`, `useAnimationLoop`,
   `className?`), with a **string prop** `variant="ml" | "agentic"`
   (blockJS-safe). Shows the six stages as an animated cycle with a pulse
   traveling the loop; clicking a stage shows its one-liner and the "arrow
   back" from stage 6 to stage 1 is visually emphasized — *the* image of the
   whole revamp. Registered in `mdxComponents.tsx`, used on both hub pages.
4. **Two hub wiki pages** are the spine's home (wiki, not lessons, so every
   course can link without ordering constraints):
   - `/wiki/ml-project-loop` — walks one tiny end-to-end project (e.g. spam
     classifier) through all six stages; each stage section ends with a
     curated "where to go deeper" link list into courses.
   - `/wiki/agentic-project-loop` — walks one tiny tool-using agent (e.g.
     "answer questions over a docs folder") through all six stages; links into
     `building-with-llms` / `agent-design-patterns`.
5. **Prose convention (Phase B)** — the narrative connection lives in the
   lesson text, lightweight: refine the **opening paragraphs** so the hook
   names the loop stage(s) naturally ("Once you've fixed a hypothesis space,
   the next question is what *good* means — that's the objective."), and add
   **one loop-referencing bullet to Key takeaways** where it genuinely
   strengthens the landing. Do **not** stamp a boilerplate callout into every
   lesson — the `SpineNav` strip already does the mechanical signposting;
   duplicated banners would read as noise.
6. **Moving-bottleneck narrative** — the ML hub page's organizing story, and
   the ordering logic learners are told out loud: classical ML is where all
   six slots are simultaneously visible and the math is tractable; deep
   learning is where the hypothesis space became expressive enough that
   *optimization* became the hard part; scale is where the bottleneck moved
   into memory bandwidth and communication (`gpu-programming`); production is
   where it moved into *data and feedback loops* (`ml-in-practice`,
   `streaming-ml`). Each era's fix creates the next era's constraint — a
   narrative, not a list, and it lets learners predict what comes next. This
   lives in the hub page (and one paragraph in `ml-in-practice/04`), **not**
   in course reordering — existing `cluster`/`order` stay untouched.
7. **One running problem: demand forecasting.** A single task revisited at
   every layer does more for cohesion than any cross-referencing. Forecasting
   carries unusually far: tabular baseline (`linear-regression`), a natural
   sequence-model version (`rnns`, `transformers`, `time-series/03`), a
   distribution-shift story (`streaming-ml/04`, `ml-in-practice/10`), a
   quantile/uncertainty story (`bayesian-methods`, `model-evaluation/07`),
   and a live-serving story with a real feedback loop (`time-series/04`,
   `streaming-ml/05`). The canonical dataset/task is **defined once on the ML
   hub page** (a small synthetic daily-demand series with trend, seasonality,
   promotions, and a mid-series regime shift — spec'd precisely enough that
   notebooks can regenerate it from a seed). Anchor lessons revisit it via a
   conventional `<Callout type="info" title="The forecasting thread">` — 4–8
   sentences: what the technique of this lesson does to *that* problem and
   why it beats the previous visit. Target ~10 visits across the curriculum
   (listed per B item), not a stamp on every lesson.
8. **Inductive bias as a second, orthogonal thread for architectures.** CNNs
   = translation equivariance; RNNs = weight sharing across time;
   transformers = permutation equivariance plus injected position signal;
   GNNs = permutation equivariance over graphs. Four topics collapse into one
   idea with four instantiations — and attention becomes inevitable rather
   than magical. Built as a wiki page (A7) and woven into the architecture
   courses' `hypothesis-space` framing during their B passes.
9. **Synthesis via slot-placement exercises.** Retrieval practice at
   intervals: every course quiz gains 1–2 registry exercises of the shape
   *"technique X — which slot does it modify, and what failure does it
   address?"*, at least one using a technique **not taught in that course**
   (the transfer test). Quizzes already exist per course, so this needs no
   lesson renumbering — just `src/lib/exercises.ts` entries + `<Exercise>`
   tags in the quiz MDX. Distractors must be *plausible wrong slots* (e.g.
   "is dropout an optimization change?"), which is where the learning is.
10. **Enforcement** — `spine-integrity.test.ts` asserts: every course `spine`
   value is valid; every lesson `spineStages` entry belongs to its course's
   spine; stages arrays are non-empty when present and have ≤3 entries;
   `type: quiz` lessons carry no `spineStages`; both hub wiki pages exist.
   After Phase B completes, flip on the coverage assertion (kept in the test
   behind an explicit allowlist that Phase B items shrink): every non-quiz
   lesson of every spine-tagged course has `spineStages`.

---

## 3. Course → spine mapping (the contract for Phase B)

Per-course spine + **dominant** stages. Per-lesson tagging is the Phase B
item's judgment call, guided by these dominants and the per-lesson examples.
A lesson may tag 1–3 stages; tag what the lesson *advances*, not everything it
mentions.

### `spine: ml` (31 courses)

| Course | Dominant stages | Notes for tagging |
|--------|-----------------|-------------------|
| linear-algebra | hypothesis-space | Representation machinery; SVD/low-rank also `data` (compression) |
| calculus-for-ml | optimization | Chain rule/backprop lessons are pure `optimization` |
| probability-statistics | objective, evaluation | MLE/Bayes → `objective`; inference/hypothesis-testing → `evaluation`; distributions → `data` |
| optimization-ml | objective, optimization | Loss-functions lesson → `objective`; GD variants/convexity/KKT/HPO → `optimization` |
| neural-networks | hypothesis-space, optimization | Neuron/layers/XOR → `hypothesis-space`; GD/init/batchnorm → `optimization` |
| linear-regression | hypothesis-space, objective | OLS/GLM → both; regularization → `objective`; logistic boundary → `hypothesis-space` |
| knn-decision-trees | hypothesis-space, evaluation | Bias-variance → `evaluation` |
| svm | hypothesis-space, objective | Margin/soft-margin → `objective`; kernels → `hypothesis-space` |
| ensemble-methods | hypothesis-space, optimization | Boosting is sequential `optimization` of an ensemble space |
| clustering | objective, evaluation | K-means objective; evaluating-clusters → `evaluation` |
| pca-dimensionality | data, hypothesis-space | Dim. reduction as `data` transformation |
| probabilistic-models | hypothesis-space, optimization | GMM → `hypothesis-space`; EM → `optimization` |
| cnns | hypothesis-space | Transfer learning also `data`/`feedback` |
| rnns | hypothesis-space, optimization | BPTT/vanishing → `optimization` |
| graphical-models | hypothesis-space | Inference lessons → `evaluation`-adjacent, keep `hypothesis-space` primary |
| transformers | hypothesis-space | Scaling laws → `evaluation`; MoE → `hypothesis-space`+`optimization` |
| generative-models | hypothesis-space, objective | VAE/GAN/diffusion objectives are the teaching core |
| graph-neural-networks | hypothesis-space | |
| computer-vision | hypothesis-space, data | SSL lesson → `data` (labels for free) |
| nlp | data, hypothesis-space | Preprocessing/BPE/embeddings → `data` |
| speech-audio | data, hypothesis-space | Signal representations → `data` |
| recommender-systems | objective, evaluation, feedback | Real-time/session lessons → `feedback` |
| reinforcement-learning | objective, optimization, feedback | Exploration *is* data collection — say so; RLHF bridge → `objective` |
| time-series | data, hypothesis-space, feedback | Production forecasting lesson → `feedback` |
| model-evaluation | evaluation | The spine's `evaluation` anchor course |
| bayesian-methods | objective, evaluation | GP/BayesOpt → uncertainty-aware `evaluation`; BayesOpt also `optimization` (of HPO) |
| causal-inference | data, evaluation | Confounding is a `data` problem; estimation → `evaluation` |
| ml-in-practice | data, evaluation, feedback | The spine's `data`+`feedback` anchor course; deployment/monitoring/CI-CD → `feedback` |
| streaming-ml | data, feedback | |
| gpu-programming | optimization | Systems side of `optimization` (making the search feasible) |
| fine-tuning-alignment | (full loop) | Teach as *the ML loop applied to LLMs*: SFT data → `data`; LoRA → `hypothesis-space`; RM/DPO → `objective`; RLHF → `optimization`; merging/quantization/distillation → `feedback`. Call this out in the course's first lesson — it's the best whole-loop showcase |

### `spine: agentic` (2 courses)

**building-with-llms** — per-lesson: 01 prompt-engineering → `context` ·
02 CoT/structured-output → `context, orchestration` · 03 embeddings → `context` ·
04 RAG → `context` · 05 agents-and-tool-use → `orchestration` ·
06 ai-engineering-architecture → `guardrails, operations` · 07 reasoning-models
→ `orchestration` · 08 llm-evaluation → `evaluation` · 09 observability →
`operations` · 10 guardrails → `guardrails` · 12 code-intelligence →
`context, orchestration` · 13 voice-multimodal → `context`.

**agent-design-patterns** — per-lesson: 01 foundation-model-agents → `task`
(also introduces the whole loop — see B-items) · 02 goal-creation → `task` ·
03 context-and-knowledge → `context` · 04 planning → `orchestration` ·
05 model-querying → `orchestration` · 06 reflection → `orchestration` ·
07 multi-agent-cooperation → `orchestration` · 08 safety-registry-adaptation →
`guardrails` · 09 tool-use-and-mcp → `context, orchestration` ·
10 evaluating-agents → `evaluation` · 11 deploying-agents → `operations`.

Existing agent wiki pages slot in cleanly (link them from the agentic hub):
`agent-metrics-taxonomy` → evaluation · `agent-observability` → operations ·
`agent-protocols-mcp-a2a` → context · `sub-agent-orchestration` →
orchestration · `prompt-injection-attacks-and-defenses` → guardrails ·
`llm-as-judge` → evaluation.

---

## 4. Build Queue

### Phase A — Spine infrastructure

- [x] **A1 · `src/lib/spine.ts` + types** — the typed registry: `SpineId`,
  `MlStageId`/`AgenticStageId`, `SPINES` record with the §1 tables verbatim
  (id, label, one-liner, hub slug, per-stage accent color from existing
  tokens), helpers `getSpine`, `getStage`, `isValidStage(spine, stage)`. Add
  `spine?: SpineId` to `CourseMeta` and `spineStages?: string[]` to
  `LessonMeta` in `src/types/course.ts`. Unit test `src/lib/__tests__/spine.test.ts`
  (registry invariants: 6 stages each, unique ids, hub slugs well-formed).
- [x] **A2 · `SpineNav` component wired into `LessonLayout`** — per design
  decision §2.2. Renders nothing when the lesson has no `spineStages` (site
  stays unchanged until Phase B tags content). Handles 1–3 highlighted stages;
  links to hub page. Follow existing top-bar styling in `LessonLayout.tsx`.
- [x] **A3 · `ProjectLoopViz`** — per §2.3 and `prompts/new-visualization.md`;
  string prop `variant`; register in `mdxComponents.tsx`; add to the viz
  registry table in `CLAUDE.md`.
- [x] **A4 · Hub wiki page: `ml-project-loop`** — `src/content/wiki/ml-project-loop.mdx`
  (topics `["ml-fundamentals"]`, relatedLessons: `ml-in-practice/04-ml-systems-design`
  + `model-evaluation` lesson 01) embedding `<ProjectLoopViz variant="ml" />`.
  Contents: the slot test (§1) with 5–6 worked placements; the six stages
  walked end-to-end on the **canonical demand-forecasting problem** (this
  page also *defines* the running thread per §2.7 — dataset spec + seed);
  the **moving-bottleneck narrative** (§2.6); per-stage "go deeper" link
  lists using §3's anchor courses. No `<Exercise>` embeds — none of the 88
  existing wiki pages embed exercises; practice lives in the notebook.
  Companion `notebooks/wiki/ml-project-loop.ipynb` per the 7-part walkthrough
  template (§1 from-scratch = the six stages as ~60 lines of NumPy/sklearn on
  the forecasting data; "Your turn" = slot-placement of unseen techniques).
- [x] **A5 · Hub wiki page: `agentic-project-loop`** — same shape;
  `topics: ["agents"]`; relatedLessons: `agent-design-patterns/01-foundation-model-agents`,
  `building-with-llms/05-agents-and-tool-use`; `<ProjectLoopViz variant="agentic" />`;
  docs-Q&A agent walkthrough; the slot test with agentic examples (reranking
  → context, reflection → orchestration, HITL gate → guardrails); explicit
  "parallels & differences vs the ML loop" section (§1 parallels table);
  notebook = minimal tool-using agent loop in plain Python (no framework),
  then the six stages annotated on it.
- [x] **A6 · Wiki page: `inductive-bias`** — the orthogonal architecture
  thread (§2.8): symmetry/equivariance table (CNN/RNN/transformer/GNN), why
  matching bias to data structure buys sample efficiency, what breaks when
  the bias is wrong, attention as the "remove the bias, inject position"
  move. `topics: ["neural-networks"]`; relatedLessons: the four architecture
  courses' first lessons; companion notebook (demonstrate equivariance
  numerically: shift an image → CNN features shift; permute nodes → GNN
  output invariant). B17/B18/B19/B21 then `<WikiLink>` to it.
- [x] **A7 · `spine-integrity.test.ts`** — per §2.10, with the coverage
  assertion behind an allowlist initialized to *all* spine-tagged courses
  (each Phase B item removes its course from the allowlist — the test is the
  progress tracker).

### Phase B — Course passes (tag + weave)

**Definition of Done for every B item:**
(a) course `index.mdx` gets `spine:` per §3;
(b) every non-quiz lesson gets `spineStages` per §3's dominants/examples;
(c) refine each lesson's opening so the hook applies the **slot test** —
names its stage(s) naturally *and* states what was breaking before / what
this technique replaced (rewrite sentences, don't prepend boilerplate);
(d) add a loop bullet to Key takeaways where it strengthens the landing
(skip where forced);
(e) where a lesson hands off across stages, make the bridge explicit in
"Related concepts" (e.g. objective→optimization lessons link forward);
(f) add a `<WikiLink slug="ml-project-loop" ...>` (or agentic) card to the
course's **first lesson only**;
(g) add 1–2 **slot-placement exercises to the course quiz** per §2.9 (one
using a technique not taught in the course);
(h) if the item's entry below names a **forecasting-thread visit**, add the
`<Callout type="info" title="The forecasting thread">` per §2.7 to the named
lesson;
(i) where the body asserts a contested explanation, mark **settled vs
folklore** honestly (one sentence is enough);
(j) log any **forward reference** you notice (a term used before any listed
prerequisite teaches it) as a one-liner under "DAG audit log" at the bottom
of this file — do not fix it in this item;
(k) remove the course from the A7 allowlist; verify gate.
Touch notebooks only if their intro contradicts the new framing — this is a
lesson-text pass, not a notebook rewrite.

Foundations (stage-anchor framing: "the math *of* stage X"):
- [ ] B1 · linear-algebra
- [ ] B2 · calculus-for-ml
- [ ] B3 · probability-statistics
- [ ] B4 · optimization-ml

Classical ML:
- [ ] B5 · linear-regression *(forecasting-thread visit in lesson 01: the
  tabular baseline — lags/calendar features + OLS is the first trip around
  the loop)*
- [ ] B6 · knn-decision-trees
- [ ] B7 · svm
- [ ] B8 · ensemble-methods
- [ ] B9 · clustering
- [ ] B10 · pca-dimensionality
- [ ] B11 · probabilistic-models
- [ ] B12 · bayesian-methods *(forecasting-thread visit in lesson 02: GPs
  give the demand forecast honest uncertainty bands — same problem, better
  for a new reason)*
- [ ] B13 · causal-inference
- [ ] B14 · time-series *(the forecasting thread's home course — visits in
  lessons 02 (ARIMA on the canonical series) and 04 (its serving/feedback
  story); make the canonical dataset THE course example where it already
  nearly is)*
- [ ] B15 · model-evaluation *(the `evaluation` anchor — its lesson 01 should
  explicitly place evaluation inside the loop and link the hub;
  forecasting-thread visit in 07-calibration: quantile/coverage on the
  demand forecasts)*

Deep learning:
- [ ] B16 · neural-networks *(settled-vs-folklore exemplar: 05-batchnorm must
  present the original internal-covariate-shift story as the historical
  motivation and the smoother-loss-surface account as the current
  understanding — the classic case per §5)*
- [ ] B17 · cnns *(inductive-bias thread: frame `hypothesis-space` tagging as
  translation equivariance; `<WikiLink slug="inductive-bias">` in lesson 01)*
- [ ] B18 · rnns *(inductive bias: weight sharing across time; WikiLink in
  lesson 01; forecasting-thread visit in lesson 01 or 04: the sequence-model
  version of the demand problem)*
- [ ] B19 · transformers *(inductive bias: permutation equivariance +
  injected position signal — "attention as the inevitable move" framing from
  the wiki page; WikiLink in lesson 01)*
- [ ] B20 · generative-models
- [ ] B21 · graph-neural-networks *(inductive bias: permutation equivariance
  over graphs; WikiLink in lesson 01)*
- [ ] B22 · computer-vision
- [ ] B23 · nlp
- [ ] B24 · speech-audio
- [ ] B25 · graphical-models
- [ ] B26 · reinforcement-learning *(call out "exploration is the data stage
  happening at train time" — the loop's most instructive edge case)*
- [ ] B27 · recommender-systems
- [ ] B28 · gpu-programming

Production ML:
- [ ] B29 · ml-in-practice *(the `data`+`feedback` anchor; its 04-ml-systems-design
  lesson becomes the loop's "why" lesson — add a short section presenting the
  full six-stage loop with `<ProjectLoopViz variant="ml" />`, the
  moving-bottleneck paragraph (§2.6), and the hub link; forecasting-thread
  visit in 10-monitoring: drift on the demand series)*
- [ ] B30 · streaming-ml *(forecasting-thread visits in 04-concept-drift —
  the canonical series' regime shift is literally the lesson topic — and
  05-production: the loop closing in real time)*
- [ ] B31 · fine-tuning-alignment *(frame the whole course as one trip around
  the ML loop applied to LLMs — add a short roadmap section to lesson 01
  mapping lessons→stages per §3)*

Agentic:
- [ ] B32 · building-with-llms *(per-lesson stages from §3; lesson 06
  ai-engineering-architecture gets a short section presenting the agentic
  loop with `<ProjectLoopViz variant="agentic" />`)*
- [ ] B33 · agent-design-patterns *(lesson 01 already introduces the five
  agent components — add the agentic loop alongside, mapping the pattern
  groups to loop stages; embed `<ProjectLoopViz variant="agentic" />` and hub
  WikiLink)*

### Phase C — Surfacing & docs

- [ ] **C1 · Course-page spine strip** — on `/courses/[courseSlug]`, render
  the course's stage coverage (union of its lessons' `spineStages`, via
  `spine.ts` helpers) as a compact strip near the course header, linking to
  the hub. Also show each lesson's stage dot(s) in `LessonList` if it stays
  visually quiet; drop that sub-item if it clutters.
- [ ] **C2 · Wiki spine tagging (light)** — add `spineStages` support to
  `WikiPageMeta` and tag only the obviously-staged wiki pages (the agent
  cluster per §3; evaluation/metrics pages; deployment/inference pages).
  Render the same `SpineNav` strip on `/wiki/[slug]` when present. No prose
  edits to wiki pages in this item.
- [ ] **C3 · Flip A7 coverage assertion to unconditional** (allowlist should
  be empty after B33; delete the allowlist mechanism) + reconcile hub pages'
  "go deeper" links against the final tagging (every stage section links ≥3
  lessons that actually carry that stage).
- [ ] **C4 · DAG audit triage** — read the "DAG audit log" accumulated by
  Phase B (clause j): for each forward reference decide fix-in-place (add a
  defining clause or a link at first use), add-prerequisite (course
  `prerequisites` field), or accept-with-note. Apply the cheap fixes in this
  item; spawn `<!-- follow-up -->` notes for structural ones (e.g. a concept
  that genuinely needs a new lesson). This is the lightweight version of
  building the prerequisite DAG: the B passes *collect* the violations, this
  item resolves them.
- [ ] **C5 · Docs & templates** — document the spine convention in `CLAUDE.md`
  (new "Spine" section: the two loops, the slot test, frontmatter fields,
  SpineNav/hub architecture, "new lessons must carry `spineStages` and pass
  the slot test in their opener"); require the field in
  `prompts/new-lesson.md` and `prompts/new-course.md`; add "Spine/slot
  framing" and "settled vs folklore" rows to the `content-review-plan.md`
  rubric so future review passes check them.

---

## 5. Editorial guardrails (for the model refining content)

- **The spine is a lens, not a chore.** If a lesson's opener already flows,
  a one-clause touch ("…this is the *objective* half of the story") beats a
  new paragraph. Never open two consecutive lessons with the same formula.
- **No stage-stuffing.** ≤3 stages per lesson; if you want 4, you're tagging
  mentions, not the lesson's contribution.
- **Don't restate the loop in prose repeatedly** — the strip + hub own the
  mechanics; prose earns its place only where the connection is genuinely
  clarifying.
- **Respect the existing coda contract** — `## Common mistakes`, `## Key
  takeaways`, `## Related concepts` must survive every edit
  (foundation-courses test enforces content-quality assertions on foundation
  lessons: LaTeX, Callout, Exercise, python block, Related concepts).
- **Teach the delta, not just the technique.** Always say what a technique
  *replaced* and why — the delta is the understanding; the technique alone is
  trivia. This is the "what was breaking before?" half of the slot test and
  it belongs in the opener, not buried in Common mistakes.
- **Settled vs folklore, honestly.** When a standard explanation is
  contested, say so in one sentence (batch norm's internal-covariate-shift
  story is the canonical case — B16). Learners who later discover the field
  was unsure will trust the rest of the structure *more* for having been told.
- **Consistent lesson shape reads as coherence.** The existing contract
  (hook → real-world examples → body with viz → exercises → Common mistakes →
  Key takeaways → Related concepts) is part of the spine's effect — never let
  an edit erode it, and prefer strengthening a weak instance of the contract
  over inventing a new section type.
- **blockJS everywhere** — any new MDX usage takes literal-string props only.
- **`estimatedMinutes` unchanged** unless an edit materially lengthens a
  lesson (it shouldn't — this is a weave, not an expansion).
- Keep diffs reviewable: a B item should touch its course folder, the A7
  allowlist, `exercises.ts` (slot-placement quiz questions), and this file's
  DAG audit log — nothing else.

---

## DAG audit log (appended by Phase B, triaged by C4)

Format: `- <course>/<lesson>: "<term>" used before taught; taught in <where> — <suggested action>`

(empty — Phase B populates this)
