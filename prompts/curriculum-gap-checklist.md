# Curriculum Gap Checklist — What's Missing for Complete ML/DL Understanding

A gap analysis of the existing 27-course curriculum against (a) *Mathematics for
Machine Learning* (Deisenroth, Faisal & Ong, 2019) — the canonical math-foundations
syllabus — and (b) the broader set of architectures/methods expected for a complete
modern ML/DL education. Each unchecked item is a **loop-executable** unit, following
the same protocol and Definition of Done as `prompts/content-build-checklist.md`.

> **How to run:** `/loop 20m Follow prompts/curriculum-gap-checklist.md: do the NEXT
> single unchecked item, then stop.` One item = one iteration = one commit. The file
> is the state. Verify gate (`npm run type-check && npm run build && npm test`) is
> mandatory before checking anything off.

Legend: `[ ]` todo · `[~]` in-progress · `[x]` done.

---

## Coverage audit — what is already solid (do NOT re-add)

Cross-referencing the *Mathematics for ML* table of contents, every chapter is
already covered:

| MML chapter | Covered by |
|---|---|
| 2 Linear Algebra | `linear-algebra/01-02` |
| 3 Analytic Geometry (norms, inner products, projections) | `linear-algebra/01`, `linear-regression/01` |
| 4 Matrix Decompositions (eigen, **SVD**, low-rank) | `linear-algebra/03-04` |
| 5 Vector Calculus (gradients, chain rule, Jacobians, Taylor) | `calculus-for-ml/01-04` |
| 6 Probability & Distributions (MLE, Bayes, exp. family) | `probability-statistics/01-05` |
| 7 Continuous Optimization (GD, **convex**, **constrained/Lagrange**) | `optimization-ml/01-03` |
| 8 When Models Meet Data (ERM, model selection, MAP) | `knn-decision-trees/03`, `model-evaluation/02`, `linear-regression/03` |
| 9 Linear Regression | `linear-regression/01-03` |
| 10 PCA | `pca-dimensionality/01-03` |
| 11 Density Estimation / GMM / EM | `probabilistic-models/01-02` |
| 12 SVM (margin, dual, kernels) | `svm/01-03` |

**Conclusion:** the math foundations have no critical holes. The gaps below are
*architecture families* and *method classes* with **zero or mention-only** coverage
(verified by grep across `src/content/courses`).

---

## Tier 1 — Critical gaps (core to overall ML/DL understanding)

- [x] **NEW COURSE `graph-neural-networks`** *(cluster Deep Learning)* — **zero coverage today.** A major architecture family absent from the curriculum. Course index + Lesson 01 (graphs as data; node/edge/graph features; the message-passing framework). Course frontmatter: difficulty `advanced`, prerequisites `["neural-networks"]`.
- [x] **`graph-neural-networks` Lesson 02 — Graph Convolutions & GraphSAGE** · spectral vs spatial convolutions, neighborhood aggregation, the GCN layer $H^{(l+1)} = \sigma(\hat A H^{(l)} W)$, inductive vs transductive · viz: **new `MessagePassingViz`** (a node aggregating neighbor features over rounds) · notebook (GCN forward pass on a small graph in NumPy).
- [x] **`graph-neural-networks` Lesson 03 — Graph Attention & Pooling + Quiz** · GAT attention over neighbors, readout/pooling for graph-level tasks, over-smoothing; then a 5-question quiz · notebook.
- [x] **NEW COURSE `recommender-systems`** *(cluster Applied ML)* — only mentioned in passing today. Index + Lesson 01 (the recommendation problem; explicit vs implicit feedback; content-based vs collaborative filtering; evaluation: recall@k, NDCG). Prereqs `["linear-algebra"]`.
- [x] **`recommender-systems` Lesson 02 — Matrix Factorization** · user/item latent factors, the SVD/ALS connection (ties directly to `linear-algebra/04-svd-and-low-rank`), regularized objective, cold start · viz: **new `MatrixFactorizationViz`** (rating matrix → low-rank U·Vᵀ reconstruction) · notebook (implement ALS/SGD matrix factorization on a toy ratings matrix).
- [x] **`recommender-systems` Lesson 03 — Deep & Two-Tower Recommenders + Quiz** · neural CF, two-tower retrieval (reuse the embedding/ANN ideas from `building-with-llms/03`), ranking vs retrieval; 5-question quiz · notebook.
- [x] **NEW COURSE `bayesian-methods`** *(cluster Unsupervised & Probabilistic)* — Gaussian Processes have zero dedicated coverage; this also fills MML §9.3 (Bayesian linear regression). Index + Lesson 01 (Bayesian linear regression: posterior over weights, predictive distribution, why uncertainty matters). Prereqs `["probability-statistics", "linear-regression"]`.
- [x] **`bayesian-methods` Lesson 02 — Gaussian Processes** · function-space view, kernels as covariance, GP regression posterior mean/variance, the role of the kernel · viz: **new `GaussianProcessViz`** (prior samples → posterior conditioned on observed points, with uncertainty bands) · notebook (GP regression from scratch in NumPy).
- [x] **`bayesian-methods` Lesson 03 — Bayesian Optimization + Quiz** · surrogate model + acquisition function (EI/UCB), the explore/exploit trade-off, application to hyperparameter tuning; 5-question quiz · notebook.
- [x] **`optimization-ml` + Loss Functions** *(new concept lesson, insert before the quiz, renumber)* — currently scattered across many lessons with no unifying treatment. Regression losses (MSE/MAE/Huber), classification losses (cross-entropy/hinge/focal), the MLE↔loss connection, when to use which · viz: *reuse `GradientDescentViz`* or new loss-surface comparison · ~3 exercises · notebook · recompute `estimatedHours`.
- [x] **`model-evaluation` + Learning Theory & Generalization** *(new concept lesson, insert before quiz, renumber)* — ERM, the bias-variance decomposition as theory (links `knn-decision-trees/03`), generalization gap, PAC/VC intuition, **double descent** · viz: *reuse `BiasVarianceViz`* or new train/test-vs-capacity curve · ~3 exercises · notebook.
- [x] **`neural-networks` + Weight Initialization & Training Dynamics** *(new concept lesson, insert before quiz, renumber)* — Xavier/He initialization, vanishing/exploding signals, why residual connections and normalization stabilize training, LR warmup/schedules · viz: *reuse `VanishingGradientViz`* · ~3 exercises · notebook.

## Tier 2 — Important / modern (fills out the frontier)

- [x] **`transformers` + Mixture of Experts (MoE)** *(new concept lesson, insert before quiz, renumber)* — zero coverage; central to modern LLM scaling. Sparse routing, top-k gating, expert capacity, load balancing, why MoE decouples params from FLOPs · viz: **new `MoERoutingViz`** (tokens routed to top-k experts) · ~3 exercises · notebook.
- [x] **`rnns` (or `transformers`) + State Space Models (S4/Mamba)** *(new concept lesson, insert before quiz, renumber)* — currently mention-only. Linear recurrence, the convolutional/recurrent duality, selective SSMs (Mamba), sub-quadratic sequence modeling vs attention · viz: *reuse `RNNUnrollViz`* · ~3 exercises · notebook.
- [x] **`computer-vision` (or `nlp`) + Self-Supervised Learning** *(new concept lesson, insert before quiz, renumber)* — only mentioned. Pretext tasks, masked modeling (MAE/BERT), contrastive (SimCLR/MoCo) recap, why SSL scales · viz: *reuse `ContrastiveViz`* · ~3 exercises · notebook.
- [x] **`model-evaluation` + Calibration & Uncertainty** *(new concept lesson)* — calibration is mentioned in many lessons but never developed. Reliability diagrams, ECE, temperature scaling, aleatoric vs epistemic uncertainty · viz: **new `CalibrationViz`** (reliability diagram + temperature slider) · ~3 exercises · notebook.

## Tier 3 — Breadth / advanced (nice-to-have, lower urgency)

- [ ] **NEW COURSE `causal-inference`** *(cluster Applied ML)* — correlation vs causation, interventions/do-calculus, confounding, A/B testing link to `ml-in-practice/09`, potential outcomes. Index + 2–3 lessons.
- [x] **`ml-in-practice` + Anomaly & Outlier Detection** *(new concept lesson)* — density/distance/isolation-forest/autoencoder methods, the imbalance problem, threshold selection · viz: reuse · notebook.
- [ ] **`ml-in-practice` + Privacy & Federated Learning** *(new concept lesson)* — differential privacy intuition (ε), DP-SGD, federated averaging, the privacy/utility trade-off · viz: optional · notebook.
- [ ] **NEW COURSE or lessons — Speech & Audio** — spectrograms/MFCC, CTC, Whisper-style ASR; an unrepresented modality.
- [ ] **`optimization-ml` (or `model-evaluation`) + Hyperparameter Optimization / AutoML** *(new concept lesson)* — grid/random/Bayesian search (links `bayesian-methods/03`), Hyperband/ASHA, neural architecture search overview · notebook.

---

## Notes on placement & conventions

- **New course** items must ship their **index + first lesson together** (the
  `content-integrity` test requires every course to have ≥1 lesson). Remaining
  lessons are separate queue items.
- When inserting a lesson into a course that **ends in a quiz**, place it *before*
  the quiz, renumber so the quiz stays last, and keep `order` frontmatter in sync
  with the `NN-` filename prefix.
- After adding lessons, **recompute the course `estimatedHours`**:
  `round_to_0.5( sum(lesson estimatedMinutes) × 2.5 / 60 )`.
- New viz → pure SVG, `"use client"`, `viz-kit` primitives; register in
  `mdxComponents.tsx` and add to the table in `CLAUDE.md`. Reuse an existing viz
  when one fits.
- Notebooks must be **self-contained** (NumPy/Matplotlib, no network/API keys) with
  a "✏️ Your turn" scaffold (TODO + assert + `<details>` solution).
- All authoritative rules: `CLAUDE.md`. Integrity tests to satisfy:
  `content-integrity.test.ts`, `wiki-integrity.test.ts`, `exercises.test.ts`.
