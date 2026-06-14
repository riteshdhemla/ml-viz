# Content Build Checklist — Loop Queue

This file is the **single source of truth** for incrementally building out the
remaining LLM / AI-engineering / ML-systems content (Phases 2–5 of the
categorization plan). It is designed to be executed by a **`/loop`**: each
iteration completes **exactly one** unchecked item, verifies it, checks it off,
and pushes.

> Phase 1 (**Building with LLMs**) is already shipped — see the viz registry and
> roadmap in `CLAUDE.md`.

---

## How to run this on a loop

### The loop command

```
/loop 20m Follow prompts/content-build-checklist.md: do the NEXT single unchecked item, then stop.
```

`20m` is a spacing interval, not a deadline — pick a value comfortably longer
than one item takes so iterations don't overlap. The loop re-invokes the prompt
each interval; the **checklist file is the state**, so every run resumes exactly
where the last left off.

### Per-iteration protocol (what each run must do)

1. **Sync state.** `git pull` the working branch, then read this file top to
   bottom and find the **first unchecked `[ ]`** item in the Build Queue.
2. **Claim it.** Change `[ ]` → `[~]` (in-progress) for that one item and note
   the time. This prevents a second run from grabbing the same item. Commit this
   one-line change immediately *before* starting the work, or skip claiming and
   rely on the interval being long enough — but claiming is safer.
3. **Build exactly that item**, following the Definition of Done below and the
   conventions in `CLAUDE.md`. Do **not** start a second item in the same run.
4. **Verify (hard gate):** run `npm run type-check && npm run build && npm test`.
   All must pass. If red, fix forward; if you can't make it green, revert the
   item's changes, set it back to `[ ]`, append a `<!-- blocked: reason -->`
   note, and stop.
5. **Check it off:** `[~]` → `[x]`. Update `CLAUDE.md`'s roadmap/viz registry if
   the item added a course or a visualization.
6. **Commit + push** to the working branch with a descriptive message. One item
   = one commit. Then **stop** (the loop fires the next iteration).
7. **Termination:** if no `[ ]` items remain, do nothing except report "queue
   complete" and suggest stopping the loop.

### Rules that make the loop safe

- **One atomic unit per iteration** — never batch items. Small diffs stay
  reviewable and keep the build green.
- **Never push red.** The verify gate is mandatory; a broken push poisons every
  later iteration (and Vercel).
- **Commit per item** — the container is ephemeral; unpushed work is lost.
- **Idempotent** — if an item looks already done (files exist, tests green),
  just check it off and move on.
- **Stay in scope** — only touch files this item needs. Shared files
  (`mdxComponents.tsx`, `exercises.ts`) are append-mostly; don't reorder.
- **Stop, don't spin** — if blocked, leave a note and stop rather than retrying
  forever or improvising a different item.

---

## Definition of Done (per item type)

**A `concept` lesson is done when:**
- `src/content/courses/<course>/NN-<slug>.mdx` exists with required frontmatter
  (`title, description, order, type: concept, estimatedMinutes`), intro +
  "Real-world examples", body with `$…$`/`$$…$$` math where useful,
  `<Callout>`s, a "Common mistakes" and "Key takeaways" section, and a
  "Related concepts" block with **at least one** `](/courses/…)` link (enforced
  by `content-integrity.test.ts`).
- Any referenced `<Exercise id="…" />` exists in `src/lib/exercises.ts`
  (append ~3 typed entries; unique ids).
- Any referenced `<VizName />` is created under
  `src/components/visualizations/<Name>/` (pure SVG, `"use client"`, uses
  `viz-kit`) **and** registered in `src/components/mdx/mdxComponents.tsx`
  (import + map entry). Reuse an existing viz when one fits; not every lesson
  needs a new one.
- Companion notebook `notebooks/<course>/NN-<slug>.ipynb` exists: backlink
  markdown cell, dark-matplotlib style cell, alternating concept/code cells,
  and a "✏️ Your turn" scaffold (TODO + assert + `<details>` solution).
  Self-contained (NumPy/Matplotlib; **no API keys, no network**).
- If appending to a course that **ends in a quiz**, insert the new concept
  lesson *before* the quiz and renumber so the quiz stays last; keep `order`
  frontmatter in sync with filename prefixes.
- After adding lessons, **recompute the course `estimatedHours`** in its
  `index.mdx`: `round_to_0.5( sum(lesson estimatedMinutes) × 2.5 / 60 )`.

**A new `course` (index) item is done when:**
- `src/content/courses/<slug>/index.mdx` exists with full frontmatter
  (`title, description, difficulty, topics, estimatedHours, prerequisites,
  order, coverColor, cluster`). Lessons are separate queue items.

**A `quiz` lesson is done when:**
- `NN-quiz.mdx` (`type: quiz`) references 5 quiz-specific `<Exercise>` ids that
  exist in the registry. (Quizzes need no notebook and no `/courses/` link.)

---

## Build Queue

Legend: `[ ]` todo · `[~]` in-progress · `[x]` done. **viz** = new component to
create (or *reuse* / *none*). Each line is one loop iteration.

### Phase 2 — Fine-Tuning & Alignment  *(new course `fine-tuning-alignment`)*
Course frontmatter: difficulty `advanced`, order `21`, cluster `Applied ML`,
prerequisites `["transformers", "reinforcement-learning"]`,
coverColor `bg-gradient-to-r from-accent-rose to-brand-500`.

- [x] **Course index** — create `fine-tuning-alignment/index.mdx` (topics: SFT, Instruction Tuning, PEFT, LoRA, QLoRA, Reward Models, RLHF, DPO, Quantization). <!-- shipped together with Lesson 01 — content-integrity requires every course have ≥1 lesson, so future course-index items in this queue must also bundle their first lesson. -->
- [x] **Lesson 01 — Supervised Fine-Tuning & Instruction Tuning** · concepts: when to fine-tune vs prompt/RAG, SFT loss, instruction datasets, chat templates, catastrophic forgetting · viz: *none (reuse `GradientDescentViz`)* · ~3 exercises · notebook.
- [x] **Lesson 02 — PEFT: LoRA & QLoRA** · concepts: full vs parameter-efficient FT, low-rank update W+BA, rank/alpha, adapters, 4-bit quantized base (QLoRA) · viz: **LoRAViz** (low-rank decomposition of a weight-update matrix; sliders for rank r) · ~3 exercises · notebook (implement a LoRA layer in NumPy).
- [x] **Lesson 03 — Reward Models** · concepts: preference data (chosen vs rejected), Bradley–Terry objective, scalar reward head, reward hacking · viz: **RewardModelViz** (pairwise preference → reward margin) · ~3 exercises · notebook.
- [x] **Lesson 04 — Preference Tuning: RLHF & DPO** · concepts: RLHF pipeline (SFT→RM→PPO), KL penalty, DPO as a closed-form alternative, trade-offs · viz: *reuse `PolicyGradientViz`* + a DPO loss curve (optional new **DPOViz**) · ~3 exercises · notebook.
- [x] **Lesson 05 — Model Merging & Quantization** · concepts: weight averaging/SLERP, task vectors, post-training quantization (INT8/INT4), QAT, accuracy/size trade-off · viz: **QuantizationViz** (bit-width vs accuracy/size) · ~3 exercises · notebook.
- [x] **Lesson 06 — Quiz** · 5 quiz exercises spanning the course.
- [x] **Bridge lesson in `reinforcement-learning`** — "From Policy Gradient to RLHF (PPO)" · concepts: policy gradient recap → PPO clip objective → RLHF as PPO on an LLM with a reward model · viz: *reuse `PolicyGradientViz`* · ~2 exercises · notebook · (append after current last lesson; keep any quiz last; recompute `estimatedHours`).

### Phase 3 — LLM internals & evaluation  *(integrate)*
- [x] **`transformers` + Foundation Models & Scaling** · concepts: pretraining objectives (causal LM), training data scale, scaling laws, context window, post-training overview · viz: **ScalingLawViz** (loss vs compute/params, log-log) · ~3 exercises · notebook.
- [x] **`nlp` + LLM Model Taxonomy** · concepts: encoder-only (BERT) vs decoder-only (GPT) vs encoder-decoder (T5); what "large" means · viz: *reuse `TransformerBlockViz`* · ~3 exercises · notebook.
- [x] **`nlp` + Decoding & Sampling Strategies** · concepts: greedy, beam, temperature, top-k, top-p; determinism · viz: *reuse `SamplingViz`* · ~3 exercises · notebook.
- [x] **`nlp` + Topic Modeling (BERTopic)** · concepts: embed→reduce→cluster→c-TF-IDF labels · viz: *reuse `KMeansViz` or `PerplexityViz`* · ~3 exercises · notebook.
- [x] **`nlp` + Training Embedding Models** · concepts: SBERT, contrastive/triplet loss, hard negatives, TSDAE · viz: **ContrastiveViz** (pull-positive/push-negative in 2D) · ~3 exercises · notebook.
- [x] **`model-evaluation` + LLM Evaluation** · concepts: entropy/cross-entropy, perplexity, bits-per-byte, AI-as-a-judge, pairwise/comparative eval, benchmarks · viz: *reuse `PerplexityViz`* · ~3 exercises · notebook.
- [x] **`model-evaluation` + Evaluating AI Systems** · concepts: model selection workflow, build-vs-buy, public benchmarks & their limits, cost/latency · viz: *none* · ~3 exercises · notebook.

### Phase 4 — Multimodal  *(integrate)*
- [x] **`computer-vision` + Vision-Language Models** · concepts: CLIP contrastive image-text training, shared embedding space, zero-shot classification, BLIP-2 captioning · viz: **CLIPSpaceViz** (image & text points in one embedding space) · ~3 exercises · notebook.

### Phase 5 — ML Systems / MLOps  *(integrate into `ml-in-practice`; split into a new `ml-systems` course if it passes ~10 lessons)*
- [x] **`ml-in-practice` + ML Systems Design & Problem Framing** · reliability, scalability, maintainability, objective functions, research-vs-production · viz: *none* · notebook.
- [ ] **`ml-in-practice` + Data Engineering Fundamentals** · sources, formats, row vs column, OLTP vs OLAP, ETL, batch vs stream · viz: *none* · notebook.
- [ ] **`ml-in-practice` + Training Data** · sampling strategies, labeling/weak supervision, class imbalance · viz: **SamplingStrategiesViz** (or reuse) · notebook.
- [ ] **`ml-in-practice` + Experiment Tracking & Versioning** · runs, metrics, artifacts, data/model versioning, reproducibility · viz: *none* · notebook.
- [ ] **`ml-in-practice` + Deployment Patterns & Model Compression** · batch vs online vs edge; quantization/pruning/distillation · viz: *reuse `QuantizationViz`* · notebook.
- [ ] **`ml-in-practice` + Continual Learning & Test in Production** · stateless vs stateful, A/B testing, canary, shadow, bandits · viz: **RolloutViz** (A/B vs canary vs shadow traffic split) · notebook.
- [ ] **`ml-in-practice` + Monitoring & Observability** · latency/throughput, degradation, drift recap, alerting · viz: *none / reuse* · notebook.
- [ ] **`ml-in-practice` + MLOps Infrastructure & Orchestration** · storage/compute, dev env, resource mgmt, orchestrators, ML platform · viz: *none* · notebook.
- [ ] **`ml-in-practice` + Inference Optimization & Serving** · KV-cache, batching, accelerators, serving (e.g. vLLM), cost/latency · viz: *none* · notebook.
- [ ] **`ml-in-practice` + Responsible AI & the Human Side** · UX for ML, team structure, responsible/ethical AI · viz: *none* · notebook.
- [ ] **`ml-in-practice` quiz** (or per-split-course quiz) — 5 quiz exercises. *(Only if `ml-in-practice` doesn't already have one; otherwise extend it.)*

---

## Conventions quick-reference
- Lesson/viz/exercise/course/notebook rules: **`CLAUDE.md`** (authoritative).
- Viz primitives: `src/components/visualizations/viz-kit.tsx`.
- Exercise types: `src/types/exercise.ts`; registry: `src/lib/exercises.ts`.
- Component registry: `src/components/mdx/mdxComponents.tsx`.
- Integrity tests to satisfy: `src/lib/__tests__/content-integrity.test.ts`,
  `src/lib/__tests__/wiki-integrity.test.ts`, `src/lib/__tests__/exercises.test.ts`.
- Reference example to mirror (style/length): the shipped
  `src/content/courses/building-with-llms/` lessons and notebooks.
