# DML-OpenProblem Review Checklist — Loop Queue

A gap analysis of `ml-viz`'s course/wiki content against
[Open-Deep-ML/DML-OpenProblem](https://github.com/Open-Deep-ML/DML-OpenProblem)
— a community-maintained bank of ~190 ML coding problems (`questions/<id>_<slug>/`
with `meta.json`, `description.md`, `learn.md`, `starter_code.py`, `solution.py`,
`tests.json`) that feeds deep-ml.com. Each unchecked item is a **loop-executable**
unit, following the same protocol and Definition of Done as
`prompts/content-build-checklist.md` / `prompts/curriculum-gap-checklist.md`.

> **How to run:** `/loop 20m Follow prompts/dml-openproblem-checklist.md: do the
> NEXT single unchecked item, then stop.` One item = one iteration = one commit.
> The file is the state. Verify gate (`npm run type-check && npm run build &&
> npm test`) is mandatory before checking anything off.

Legend: `[ ]` todo · `[~]` in-progress · `[x]` done.

---

## Coverage audit — what DML-OpenProblem covers that ml-viz already has (do NOT re-add)

Cross-referenced against DML's problem categories (linear algebra, classical ML,
neural-net basics, normalization, attention/transformers, RL, optimizers,
activation functions, MoE) — verified by grep across `src/content`:

| DML topic cluster | Already covered by |
|---|---|
| Matrix ops, SVD, eigendecomposition | `linear-algebra/01-04`, `wiki/svd-low-rank`, `wiki/eigenvalue-computation` |
| K-Means, KNN, decision trees, PCA, SVM | `clustering/01`, `knn-decision-trees/01-02`, `pca-dimensionality/01`, `svm/01-03` |
| Sigmoid/Softmax/ReLU/GELU/Swish/SiLU activations | `wiki/activation-functions` (covers modern smooth activations incl. Swish/SiLU used in SwiGLU) |
| BatchNorm, Dropout | `wiki/batchnorm-algorithm`, `wiki/dropout`, `neural-networks/05-batchnorm-and-dropout` |
| LayerNorm (incl. Pre-LN vs Post-LN derivation) | `transformers/03-transformer-architecture` (full derivation already present) |
| Masked self-attention, scaled dot-product attention | `wiki/scaled-dot-product-attention`, `wiki/attention-mechanisms`, `transformers/01,04` |
| Optimizers: SGD, Momentum, Nesterov, Adagrad, RMSprop, Adadelta, Adam/AdamW | `wiki/gradient-descent-optimizers` (full update-rule derivations for all variants) |
| Mixture of Experts, noisy top-k gating | `transformers/06-mixture-of-experts`, `MoERoutingViz` |
| Q-learning, policy gradient, Bellman/value iteration, epsilon-greedy | `reinforcement-learning/01-04`, `QTableViz`, `GridWorldViz`, `PolicyGradientViz` |
| Mixed precision training (FP16/BF16, loss scaling) | `gpu-programming/04-gpus-for-deep-learning` |
| Cross-entropy / softmax loss | `wiki/softmax-cross-entropy` |

**Conclusion:** the curriculum has no critical holes against DML's core ML/DL
syllabus. The gaps below are **narrow, verified zero-coverage techniques** —
each confirmed absent by grep across `src/content` before being added here.

---

## Build Queue

- [ ] **NEW WIKI `grpo-objective.mdx`** — GRPO (Group Relative Policy Optimization, DML problem `101_implement-the-grpo-objective-function`) is currently name-dropped in `building-with-llms/07-reasoning-models.mdx` (mentions "GRPO, used by DeepSeek") with **no formula or derivation**. Write the full deep-dive: sample a *group* of $G$ completions per prompt, compute the group-relative advantage $\hat A_i = (r_i - \text{mean}(r))/\text{std}(r)$ (no learned value network/critic — this is GRPO's key simplification vs PPO), the PPO-style clipped surrogate objective over the group, and the KL penalty term against a frozen reference policy. Include one fully worked numeric trace (e.g. 4 sampled completions with toy rewards → advantages → clipped objective). `topics: ["reinforcement-learning"]`. `relatedLessons: ["building-with-llms/07-reasoning-models", "fine-tuning-alignment/04-rlhf-and-dpo", "reinforcement-learning/06-from-policy-gradient-to-rlhf"]`. Notebook: from-scratch NumPy implementation of the GRPO advantage + clipped-objective computation on a toy reward vector, dark-matplotlib bar chart of raw rewards vs normalized advantages, "✏️ Your turn" scaffold. Add `<WikiLink slug="grpo-objective" .../>` to `building-with-llms/07-reasoning-models.mdx` where GRPO is currently just named. Recompute that lesson's `estimatedMinutes`/course `estimatedHours` if trimmed.

- [ ] **NEW WIKI `gradient-checkpointing.mdx`** — Zero coverage today (verified: no mention anywhere in `src/content` or `notebooks`). DML problem `188_gradient-checkpointing`. Covers the memory/compute trade-off of large-model training: instead of caching every layer's activations for the backward pass (memory $O(L)$ in depth $L$), only cache activations at select checkpoints and **recompute** the rest during backprop (memory $O(\sqrt L)$, ~30-40% extra forward compute). Include the segment-boundary selection heuristic (checkpoint every $\sqrt L$ layers) and a worked memory-vs-recompute-cost table for a toy $L$-layer MLP. `topics: ["ml-systems"]`. `relatedLessons: ["gpu-programming/04-gpus-for-deep-learning", "ml-in-practice/11-mlops-infrastructure-and-orchestration"]`. Notebook: NumPy toy MLP forward/backward that compares peak activation memory with vs without checkpointing at a few depths, dark-matplotlib memory-vs-depth plot, "✏️ Your turn" scaffold. Add a short pointer + `<WikiLink slug="gradient-checkpointing" .../>` from `gpu-programming/04-gpus-for-deep-learning.mdx`'s "Mixed precision" section (sibling memory-saving technique) — 1-2 sentence intro, no lesson restructuring needed.

- [ ] **NEW WIKI `groupnorm-and-instancenorm.mdx`** — GroupNorm (DML `126`) and InstanceNorm (DML `143`) have zero dedicated coverage (verified: BatchNorm and LayerNorm are both already deep-dived, but these two normalization variants are absent). Cover: GroupNorm splits channels into $G$ groups and normalizes within each group per-sample (batch-size-independent, used in vision models with small batches, e.g. detection/segmentation); InstanceNorm normalizes each channel per-sample independently (used in style transfer/GANs to remove instance-specific contrast). Give the shared normalization formula with each one's reduction axes made explicit, and a comparison table against BatchNorm/LayerNorm (what's averaged over: batch+spatial vs channel vs group vs single-channel-spatial). `topics: ["neural-networks"]`. `relatedLessons: ["neural-networks/05-batchnorm-and-dropout", "cnns/05-modern-architectures"]`. Notebook: NumPy implementation of all four normalization variants (Batch/Layer/Group/Instance) on the same toy `(N,C,H,W)` tensor, dark-matplotlib bar chart of activation stats per variant, "✏️ Your turn" scaffold. Add `<WikiLink slug="groupnorm-and-instancenorm" .../>` from `neural-networks/05-batchnorm-and-dropout.mdx`'s existing "Modern substitute" table row.

- [ ] **NEW WIKI `text-generation-metrics.mdx`** — BLEU, ROUGE, and METEOR (DML `152_implementing-rouge-score`, `110_evaluate-translation-quality-with-meteor-score`) have zero coverage (verified: `building-with-llms/08-llm-evaluation.mdx` covers perplexity/LLM-as-judge/benchmarks but no n-gram overlap metrics). Cover: BLEU (modified n-gram precision + brevity penalty), ROUGE-N/L (recall-oriented n-gram/LCS overlap, used for summarization), METEOR (precision/recall harmonic mean with stemming/synonym matching + a fragmentation penalty) — with one worked example scoring a candidate sentence against a reference. Note where these metrics fail for open-ended generation (motivating the LLM-as-judge approach already covered in `08-llm-evaluation`). `topics: ["nlp"]`. `relatedLessons: ["building-with-llms/08-llm-evaluation", "nlp/03-sequence-models-to-bert"]`. Notebook: from-scratch NumPy/Python BLEU + ROUGE-L implementation scored against a few candidate/reference pairs, "✏️ Your turn" scaffold. Add `<WikiLink slug="text-generation-metrics" .../>` from `building-with-llms/08-llm-evaluation.mdx` (brief intro sentence noting these predate LLM-as-judge).

---

## Conventions quick-reference

- Wiki-page rules/template: **`prompts/new-wiki-page.md`** (authoritative for
  frontmatter, notebook structure, `<WikiLink>` usage).
- Lesson/viz/exercise/course rules: **`CLAUDE.md`**.
- Integrity tests to satisfy: `src/lib/__tests__/wiki-integrity.test.ts` (every
  `<WikiLink slug>` resolves, every `relatedLessons` entry exists, every wiki
  page has a notebook), plus `content-integrity.test.ts` and `exercises.test.ts`.
- Notebooks must be self-contained (NumPy/Matplotlib only; no API keys, no
  network calls).
- **Never re-derive already-covered material** — the coverage audit above is
  there so a loop iteration doesn't duplicate `wiki/batchnorm-algorithm`,
  `wiki/gradient-descent-optimizers`, etc. If a "NEW WIKI" item turns out to
  already exist by the time it's picked up, just check it off.
