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

Then follow the fixed skeleton for the track. Sections are plain `##` headings;
annotate deep-dive sections with the spine slot they fill.

### Template 1 — ML System Design (`spine: ml`)
1. **Clarify the problem** — goal, users/items, what we optimize (name the proxy-metric risk), scope.
2. **Requirements & scale** — latency, throughput, freshness, availability + a back-of-envelope that *forces* the architecture.
3. **ML problem framing** — task type; *what slot was breaking before this system?*
4. **Data & features** *(data)* — labels, features, feature store, training-serving skew, bias.
5. **Model** *(hypothesis space + objective + optimization)* — baseline → chosen model, loss, cadence.
6. **Serving & scaling** — latency-budget table, funnel, caching, fallback.
7. **Evaluation** *(evaluation)* — offline metrics, online A/B, guardrail metrics.
8. **Monitoring & feedback** *(feedback)* — drift, retraining, cold start.
9. **Tradeoffs & alternatives** — a table of choice vs. rejected alternative.
10. **Interviewer follow-ups** — 3–5 curveballs, each in a `<Details summary="…">` with a short model answer.
11. **Key takeaways** — a short bullet recap.

### Template 2 — Agentic System Design (`spine: agentic`)
1. **Clarify the task** *(task)* — goal, when it acts vs. escalates, success criteria, scope.
2. **Requirements & constraints** — latency/cost, autonomy level, accuracy, auditability.
3. **Context & tools** *(context)* — prompt design, RAG grounding, memory, typed tool schemas (reads vs. gated writes).
4. **Orchestration** *(orchestration)* — plan→act→observe loop, step budget, reflection, stop conditions, single vs. multi-agent.
5. **Evaluation** *(evaluation)* — outcome + trajectory, pass@k, tool-selection accuracy, LLM-as-judge.
6. **Guardrails & safety** *(guardrails)* — permissioned tools, human-in-the-loop, prompt-injection defense (untrusted input!), output filters.
7. **Operations** *(operations)* — tracing, cost/latency, model tiering, prompt versioning, feedback loop.
8. **Tradeoffs & alternatives** — a table.
9. **Interviewer follow-ups** — 3–5 `<Details>` curveballs.
10. **Key takeaways.**

### Template 3 — Generative AI System Design (`track: genai`, usually `spine: ml`)
1. **Clarify the problem** — what's generated, the quality bar, modality, product surface.
2. **Requirements & scale** — latency/throughput and **GPU cost** (the defining GenAI constraint); quality vs. cost.
3. **GenAI problem framing** — model family (diffusion / autoregressive transformer / GAN / flow) + conditioning; *what was the pre-generative baseline?*
4. **Data & training** *(data / optimization)* — dataset curation, licensing/IP, dedup, pretraining vs. fine-tuning.
5. **Model & generation** *(hypothesis-space + objective)* — architecture, conditioning (CFG/control), decoding/sampling.
6. **Serving & scaling** — the GenAI crux: **inference optimization** (batching, KV cache, quantization, distillation, speculative decoding), GPU autoscaling, caching.
7. **Evaluation** *(evaluation)* — generation quality is hard: FID/CLIPScore (image), perplexity/human-pref/LLM-judge (text), plus safety evals.
8. **Safety & guardrails** — harmful content, **IP/copyright & memorization**, watermarking/provenance, hallucination, jailbreak defense.
9. **Feedback & iteration** *(feedback)* — preference data → RLHF/DPO, drift, model updates.
10. **Tradeoffs & alternatives** — quality vs. latency vs. cost; closed vs. open; fine-tune vs. prompt.
11. **Interviewer follow-ups** — 3–5 `<Details>` curveballs.
12. **Key takeaways.**

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
