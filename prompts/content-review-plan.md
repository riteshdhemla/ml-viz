# Content Review Plan — Understandability Audit

Goal: review **every lesson and wiki page** for one question — *can the target
learner actually grasp this on first read?* — and record improvement notes.
This is a **notes-only** pass: reviewing and fixing are separate queues, so
review iterations stay fast and the notes become a prioritised backlog.

Findings accumulate in **`prompts/content-review-notes.md`** (append-only,
one section per queue item). When the review queue is done, triage the notes
into a fix queue at the bottom of that file.

---

## How to run this on a loop

Run each iteration in a Claude Code session (use the strongest model available
— the review quality is the product):

```
/loop 15m Follow prompts/content-review-plan.md: review the NEXT single unchecked queue item, append notes to prompts/content-review-notes.md, then stop.
```

### Per-iteration protocol

1. **Sync state.** `git pull` the working branch; find the first `[ ]` item in
   the Review Queue below. Claim it (`[ ]` → `[~]`), commit the claim.
2. **Read like a learner, not an author.** Read every lesson/page in the item
   top-to-bottom *in order*, plus its exercises (`src/lib/exercises.ts`) and a
   skim of its notebook. Assume only the knowledge from the course's listed
   `prerequisites`.
3. **Score and note.** For each lesson/page, apply the rubric below: assign a
   **grasp score (1–5)** and write severity-tagged notes. No finding is also a
   finding — record `no issues` explicitly.
4. **Apply fixes in the same iteration** (mode changed 2026-07-04, previously
   notes-only): fix all P2s and cheap P3s immediately after writing the notes;
   record what was applied vs deferred in the item's notes section. Defer only
   large builds (new viz components, restructures spanning other courses).
5. **Append** the item's section to `prompts/content-review-notes.md`
   (format spec is at the top of that file). Check the item off (`[~]` → `[x]`).
6. **Commit + push** (`content review: <item>`), then stop.

---

## Rubric — what "understandable & easy to grasp" means here

Score each lesson/page 1–5 (5 = a motivated learner gets it first pass,
1 = requires outside material to follow). Check every dimension:

| # | Dimension | The question to ask |
|---|-----------|---------------------|
| 1 | **Hook** | Does the first paragraph give a concrete *why* (problem, example) before any mechanism? |
| 2 | **Prerequisite honesty** | Is any term used before it's defined or linked? Would the stated prereq courses actually cover it? |
| 3 | **Concrete before abstract** | Does every equation get (a) all symbols defined, (b) an intuition sentence, (c) a worked number nearby? |
| 4 | **Cognitive load** | New-concepts-per-section ≤ ~3? Any wall-of-jargon paragraphs that need splitting or a table? |
| 5 | **Visual support** | Is there a spatial/dynamic idea carried by text alone that begs for a viz (candidate for `viz-kit`)? Do existing viz actually teach the lesson's core claim? |
| 6 | **Exercise alignment** | Do the exercises test the *central* concept (not trivia)? Are they placed after the concept is complete? Do distractors catch real misconceptions? |
| 7 | **Worked trace** | For algorithm/procedure content: is there at least one end-to-end trace with real numbers? |
| 8 | **Flow & pacing** | Do sections build in order with no forward references? Does length match `estimatedMinutes`? |
| 9 | **Consistency** | Notation/terminology consistent with sibling lessons and linked wiki pages? |
| 10 | **Landing** | Do "Common mistakes" / "Key takeaways" match what the body actually taught, and would they make sense to someone who skimmed? |

### Severity tags for notes

- **P1** — blocks understanding (undefined concept, wrong/misleading claim,
  broken example, exercise unanswerable from the lesson).
- **P2** — real friction (missing intuition for an equation, missing worked
  example, viz that would carry the concept, confusing ordering).
- **P3** — polish (wording, redundancy, an extra callout, link opportunities).

---

## Review Queue

One iteration = one item. Courses cover all their lessons + quiz + exercises;
wiki batches cover the listed pages. Oversized items may be split in place
(replace with two sub-items) rather than half-reviewed.

### Courses — foundations
- [x] linear-algebra <!-- reviewed 2026-07-02 -->
- [x] calculus-for-ml <!-- reviewed 2026-07-02 -->
- [x] probability-statistics <!-- reviewed 2026-07-02 -->
- [x] optimization-ml <!-- reviewed 2026-07-02 -->

### Courses — classical ML
- [x] linear-regression <!-- reviewed 2026-07-02 -->
- [x] knn-decision-trees <!-- reviewed + fixed 2026-07-04 -->
- [x] svm <!-- reviewed + fixed 2026-07-04 -->
- [x] ensemble-methods <!-- reviewed + fixed 2026-07-04 -->
- [ ] clustering
- [ ] pca-dimensionality
- [ ] probabilistic-models
- [ ] model-evaluation
- [ ] bayesian-methods
- [ ] causal-inference
- [ ] time-series

### Courses — deep learning
- [ ] neural-networks
- [ ] cnns
- [ ] rnns
- [ ] transformers
- [ ] generative-models
- [ ] graph-neural-networks
- [ ] computer-vision
- [ ] nlp
- [ ] speech-audio
- [ ] graphical-models
- [ ] reinforcement-learning
- [ ] recommender-systems
- [ ] gpu-programming

### Courses — applied / production
- [ ] building-with-llms (13 lessons — consider splitting 01–06 / 07–13)
- [ ] agent-design-patterns
- [ ] fine-tuning-alignment
- [ ] ml-in-practice (18 lessons — consider splitting 01–09 / 10–18)

### Wiki batches (grouped by index topic)
- [ ] wiki: probability (10 pages)
- [ ] wiki: supervised-learning (8 pages)
- [ ] wiki: neural-networks (7 pages)
- [ ] wiki: time-series (5 pages)
- [ ] wiki: agents + building-with-llms (7 pages: agent-observability, agent-protocols-mcp-a2a, langgraph, sub-agent-orchestration, langfuse-and-opentelemetry, llm-as-judge, text-to-sql)
- [ ] wiki: reinforcement-learning + graphical-models (6 pages)
- [ ] wiki: nlp + transformers (7 pages)
- [ ] wiki: unsupervised + probabilistic-models (6 pages)
- [ ] wiki: recommender-systems + computer-vision + generative-models (6 pages)
- [ ] wiki: misc (9 pages: bptt-algorithm, vanishing-gradient-analysis, eigenvalue-computation, svd-low-rank, directional-derivative, newtons-method, random-walk, roc-auc, population-stability-index, graph-fraud-detection, uplift-modeling)

### After the queue
- [ ] Triage all P1s into a fix queue at the bottom of the notes file
- [ ] Roll recurring P2 themes into `prompts/new-lesson.md` / `new-wiki-page.md` so new content doesn't repeat them
