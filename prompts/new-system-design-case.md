# Task: Add a System-Design Case Study

Add a worked **system-design interview walkthrough** to the `/system-design`
section. Each case lives at `src/content/system-design/{slug}.mdx` and is
structured by its **spine** (project loop). The **resolved track** (`track ??
spine`) selects the section it appears under on the index:

- `spine: ml` → **ML System Design** (ranking, retrieval, detection, forecasting)
- `spine: agentic` → **Agentic System Design** (LLM agents, tools, orchestration)
- `track: genai` → **Generative AI System Design** (image/text/code/video/audio
  generation, inference serving, safety). GenAI cases usually still set
  `spine: ml` (training a generative model *is* the ML loop) so the SpineNav
  strip renders; a pure serving/infra GenAI case may omit `spine` entirely and
  simply render no strip.

Everything else (routing, search, sitemap, the `SpineNav` strip, the "Related
lessons" footer) is wired automatically — you only write the MDX.

## 1. Frontmatter

```yaml
---
title: "Design a <System>"
description: "One or two sentences — the system + its scale + the loop lens."
spine: ml                     # ml | agentic — REQUIRED; selects the track
spineStages: [data, hypothesis-space, evaluation]   # 1–3 stages this problem stresses most
company: "Pinterest / Netflix"    # optional — inspiration, shown in header + card
domain: "Recommendations"          # human sub-group label
scale: "300M+ users · billions of items · <200ms budget"   # one-line headline
difficulty: intermediate           # beginner | intermediate | advanced
relatedLessons:                    # "courseSlug/lessonSlug" — must resolve to real lessons
  - "recommender-systems/03-deep-and-two-tower"
estimatedMinutes: 20
---
```

Valid `spineStages` come from `src/lib/spine.ts`:
- **ml:** `data`, `hypothesis-space`, `objective`, `optimization`, `evaluation`, `feedback`
- **agentic:** `task`, `context`, `orchestration`, `evaluation`, `guardrails`, `operations`

Pick the **1–3** the problem leans on hardest (the integrity test rejects 0 or >3).

**Generative AI cases** add `track: genai` and keep `spine`/`spineStages` when a
loop applies (most do — usually `spine: ml`); omit `spine` only for pure
serving/infra cases (the strip then hides). Example GenAI frontmatter:

```yaml
---
title: "Design a Text-to-Image Generation Service"
description: "..."
track: genai                  # → Generative AI System Design
spine: ml                     # optional for genai; keep it when a loop applies
spineStages: [data, hypothesis-space, evaluation]
company: "Midjourney / Stable Diffusion"
domain: "Image generation"
scale: "..."
difficulty: intermediate
relatedLessons:
  - "generative-models/05-diffusion-models"
estimatedMinutes: 20
---
```

## 2. Body — start with the header card

Right after the `# H1`, add:

```mdx
<SystemDesignMeta track="ML System Design" company="…" scale="…" difficulty="intermediate" />
```

Then follow the fixed skeleton for the track. Each track uses the interview
framework educative.io teaches for that interview type, so the section headings
are a contract: `src/lib/system-design-frameworks.ts` defines them, the case
page renders them as a framework strip under the spine strip, and
`system-design-integrity.test.ts` fails if a case's `##` headings drift from
them (same order, same prefixes). Append a spine tag after the prefix where a
section fills a loop slot, e.g. `## 3. Metrics *(spine: evaluation)*`. Use `###`
subsections freely inside a step.

### Template 1: ML System Design (`spine: ml`) uses the 7-step ML framework

From *Grokking the Machine Learning Interview*:

1. **`## 1. Problem statement`**: goal, users/items, what we optimize (name the
   proxy-metric risk), scope; then `### Framing it as an ML problem` with the task
   type and *what slot was breaking before this system?*
2. **`## 2. Scale & latency requirements`**: latency, throughput, freshness,
   availability, plus a back-of-envelope that *forces* the architecture.
3. **`## 3. Metrics`** *(evaluation)*: offline metrics (iterate), online metrics
   (ship), guardrail metrics (harm). Metrics come *before* the design here.
4. **`## 4. Architecture`**: the high-level components and request flow (an ASCII
   diagram works well), funnel stages, latency-budget table.
5. **`## 5. Offline model building & evaluation`** *(data + hypothesis space +
   objective)*: `### Training data generation`, `### Feature engineering`,
   `### Model training` (baseline → chosen model, loss), `### Offline evaluation`.
6. **`## 6. Online model execution & evaluation`**: serving inside the budget,
   fallbacks, shadow/A-B/interleaving.
7. **`## 7. Iterative model improvement`** *(feedback)*: drift, retraining, cold
   start, feedback loops.

Then `## Tradeoffs & alternatives` (table), `## Interviewer follow-ups` (3–5
`<Details summary="…">`), `## Key takeaways`, `## References`.

### Template 2: Agentic System Design (`spine: agentic`) uses RESHADED

From *Grokking the Modern System Design Interview*, adapted to agents:

1. **`## R: Requirements`** *(task)*: **Functional** (goal, when it acts vs.
   escalates, success criteria, scope) and **Non-functional** (table: latency,
   cost, autonomy, accuracy, auditability).
2. **`## E: Estimation`**: a table of stated assumptions → results: tasks/day,
   model calls and tokens per task, tokens/day, concurrency, latency per task.
   End with what the numbers force.
3. **`## S: Storage schema`**: a table of entities (key fields, store): sessions,
   memory, checkpoints, traces, audit logs, eval cases. Name what is
   deliberately *not* stored.
4. **`## H: High-level design`** *(orchestration)*: component diagram and the
   plan → act → observe loop, single vs. multi-agent.
5. **`## A: APIs`**: typed tool schemas (a code block), reads vs. gated writes,
   and what the schemas deliberately leave out (e.g. identity comes from the
   session, never from a model argument).
6. **`## D: Detailed design`** *(context + guardrails)*: `### Context
   engineering`, `### Orchestration details`, `### Guardrails & safety`,
   `### Operations`.
7. **`## E: Evaluation`** *(evaluation)*: `### Evaluating the agent` (outcome +
   trajectory, pass@k / pass^k, LLM-as-judge), `### Does the design meet the
   requirements?` (walk the non-functional table, name the bottleneck), and
   `### Tradeoffs & alternatives` (table).
8. **`## D: Distinctive component`**: the one component that makes *this*
   system hard and how the design handles it.

Then `## Interviewer follow-ups`, `## Key takeaways`, `## References` (the
tradeoffs table lives inside E).

### Template 3: Generative AI System Design (`track: genai`) uses SCALED

From *Grokking the Generative AI System Design*:

1. **`## S: System requirements`**: **Functional** (what's generated, the quality
   bar, modality, product surface) and **Non-functional** (table).
2. **`## C: Choose the model`** *(hypothesis-space)*: model family (diffusion /
   autoregressive transformer / GAN / flow) + conditioning, size class,
   build vs. adapt; *what was the pre-generative baseline?*
3. **`## A: Acquire & prepare data`** *(data)*: curation, licensing/IP, dedup,
   captioning, fine-tuning and preference data.
4. **`## L: Leverage the model`** *(objective + evaluation)*: training and
   adaptation, generation (decoding, CFG, control), then `### Evaluation`
   (FID/CLIPScore, perplexity, human preference, LLM-judge, safety evals).
5. **`## E: Estimate resources`**: a table of stated assumptions → results: GPU
   time per output, outputs/day, GPU-hours and fleet size, memory, storage.
   **GPU cost is the defining GenAI constraint**; end with what the numbers
   force.
6. **`## D: Design the system`**: `### High-level design` (diagram),
   `### Serving & scaling` (batching, KV cache, quantization, distillation,
   speculative decoding, autoscaling), `### Safety & guardrails` (harmful
   content, IP & memorization, watermarking/provenance, jailbreaks), and a
   feedback subsection where it applies.

Then `## Tradeoffs & alternatives`, `## Interviewer follow-ups`,
`## Key takeaways`, `## References`.

**Estimation tables** (RESHADED's E, SCALED's E) must state every assumption
in its own column, so an interviewer can move one and the reader can redo the
arithmetic. Derive every result from the stated assumptions or a cited number;
never present an assumed number as a measured one.

## 3. Socratic pause-points (required)

Cases are written **ask-first**: before each major reveal, pose the question an
interviewer would and let the reader commit to an answer before scrolling.
Thread **3+ `<ThinkFirst>` blocks** through every case:

```mdx
<ThinkFirst question="Billions of items, a 200ms budget — what does the arithmetic alone force?">
The short model answer, revealed only after the reader commits. 2–5 sentences:
the crux, not a restatement of the next section.
</ThinkFirst>
```

- **Placement:** at the end of the section *before* the one that answers the
  question (the following section is then the full elaboration).
- **Target the cruxes:** the constraint that forces the architecture, the
  labels/data trap, the model-choice fork, the "which metric — and how it
  misleads" question, the defining failure mode or attack.
- **Make questions concrete** (numbers, scenarios, "what happens when…"), not
  quiz-like definitions; the reveal should reward having actually thought.
- Don't duplicate an existing `<Details>` follow-up verbatim — follow-ups are
  retrospective curveballs, ThinkFirst is prospective.
- **Density:** aim for 6–8 per case — roughly one before every major reveal.
  Never place two back-to-back; each needs a section of elaboration after it.

## 3b. Research grounding & References (required)

Cases are **grounded in published primary sources** — the engineering blogs and
papers behind the real systems (e.g. Stripe Radar, Uber DeepETA, vLLM,
Anthropic's agent posts). Before writing:

1. Research 4–8 authoritative sources for the domain: company engineering blog
   posts, papers, system cards, benchmark reports. Verify every URL resolves.
2. Use them to make the case *specific*: named production systems, real scale
   numbers, latency budgets, published metric wins — not generic hand-waving.
3. Cite sparsely inline (~4–8 markdown links per case) where a claim leans on a
   source, e.g. `([Uber Engineering](https://…))`.
4. End the case with a `## References` section (after Key takeaways):

   ```mdx
   ## References

   - [Exact Source Title](https://…) — Publisher, what it grounds.
   ```

## 4. Conventions

- **Components:** reuse `<Callout>`, `<Details>` (perfect for follow-up Q&A),
  markdown tables, KaTeX (`$…$` / `$$…$$`), any registered `*Viz`
  (e.g. `MatrixFactorizationViz`, `AgentLoopViz`), and `<WikiLink slug="…" title="…" />`.
  Only plain-string props — MDX runs with `blockJS: true`.
- **WikiLinks must resolve** to a real `src/content/wiki/{slug}.mdx` or they 404.
- **Cross-link `relatedLessons`** to real lessons — the integrity test enforces it.
- **Notebooks are optional.** MDX-only by default. Only set `notebookUrl` (or add
  `notebooks/system-design/{slug}.ipynb` and pass it) if a runnable notebook
  genuinely adds value.
- **No new nav/route/search wiring needed** — the section is content-driven.

## 5. Verify

```bash
npm run type-check
npm test -- system-design-integrity spine-integrity
npm run build
```

Then `npm run dev` and confirm the case appears under the right track on
`/system-design`, the `SpineNav` strip shows the loop, and the "Related lessons"
footer resolves.
