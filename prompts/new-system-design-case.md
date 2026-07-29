# Task: Add a System-Design Case Study

Add a worked **system-design interview walkthrough** to the `/system-design`
section. Each case lives at `src/content/system-design/{slug}.mdx` and is
structured by its **spine** (project loop). `spine` selects the track it appears
under on the index:

- `spine: ml` → **ML System Design** (ranking, retrieval, detection, forecasting)
- `spine: agentic` → **Agentic System Design** (LLM agents, tools, orchestration)

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

## 3. Conventions

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

## 4. Verify

```bash
npm run type-check
npm test -- system-design-integrity spine-integrity
npm run build
```

Then `npm run dev` and confirm the case appears under the right track on
`/system-design`, the `SpineNav` strip shows the loop, and the "Related lessons"
footer resolves.
