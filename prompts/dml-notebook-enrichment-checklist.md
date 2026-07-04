# DML-OpenProblem Notebook Enrichment Checklist — Loop Queue

A course-by-course mapping of `notebooks/<course>/*.ipynb` against every problem
in a **full local clone** of
[Open-Deep-ML/DML-OpenProblem](https://github.com/Open-Deep-ML/DML-OpenProblem)
(`questions/<id>_<slug>/meta.json` + `description.md`), used to strengthen
existing "✏️ Your turn" exercises and add short DML-sourced extra-practice
sections. Each unchecked item is a **loop-executable** unit, following the same
protocol as `prompts/content-build-checklist.md`.

> **How to run:** `/loop 20m Follow prompts/dml-notebook-enrichment-checklist.md:
> do the NEXT single unchecked item, then stop.` One item = one course = one
> commit. The file is the state.

Legend: `[ ]` todo · `[~]` in-progress · `[x]` done.

## Data provenance

This mapping was built by `git clone --depth 1
https://github.com/Open-Deep-ML/DML-OpenProblem.git` and reading every
`questions/*/meta.json` (id, title, category, difficulty) directly off disk —
**not** from web-summarized listings. (An earlier pass at this same research,
before the clone, got a WebFetch summary that hallucinated a sequential run of
fake "nature-inspired optimization algorithm" problems for the id range
42–99 — the clone confirmed the real 42–99 range is completely different and
does not contain those. All IDs below are ground-truth verified against the
cloned repo, 164 real problems across ids 1–188 with some gaps from
deletions/renumbering.) If a future loop iteration wants to cite a DML problem
not listed here, re-clone and check `meta.json` — don't trust a web summary.

Two folders share id `158` (`158_epsilon-greedy-action-selection-for-n-armed-bandit`
and `158_incremental-mean-for-online-reward-estimation`) — a real quirk in the
upstream repo, not a typo here. Problem `186` has a misleading slug
(`186_guassian_mixture_regression`) but its `description.md` confirms the task
is actually **Gaussian Process Regression** — mapped accordingly below, not to
GMM.

## Definition of Done (per course item)

For each notebook touched:
1. **Strengthen the existing "✏️ Your turn" scaffold** — replace or extend the
   TODO+assert cell with edge cases in the spirit of DML's `tests.json` style
   (multiple inputs, boundary conditions: empty/single-element input, ties,
   zero variance, extreme values) rather than a single happy-path assert.
2. **Add a short new cell/section** implementing the specific DML problem(s)
   named for that notebook below, framed as extra practice (a markdown cell
   naming the DML problem + a `# TODO(you)` code cell + assert(s) + a
   `<details>` solution) — mirror the notebook's existing "Your turn" pattern.
   Where several small DML problems are grouped for one notebook (e.g. an
   activation-function or classification-metrics bank), one combined
   extra-practice section covering all of them is fine — don't create a
   separate full scaffold per one-liner function.
3. Keep notebooks **self-contained** (NumPy/Matplotlib only, no network/API
   keys, no downloading pretrained weights) and consistent with the existing
   dark-matplotlib style. **DML problem 88 (GPT-2 text generation) requires
   adaptation** — its reference solution loads real GPT-2 weights via a
   network call; if used at all, reimplement with small random/dummy weights
   instead, never a real download.
4. Do not touch lesson `.mdx` files unless a one-line pointer to the new
   section genuinely helps orientation — this task is scoped to notebooks.

**Verify gate (lighter than the content checklists — no MDX/build changes expected):**
- Parse every touched `.ipynb` as JSON and confirm `nbformat >= 4` and `cells`
  is an array (what `content-integrity.test.ts` checks).
- Extract each touched notebook's code cells and run them standalone (with the
  TODO cells' solutions substituted in) to confirm the added exercise's
  solution actually executes and its asserts pass. The shipped (unsolved) TODO
  cell is *expected* to error/no-op — that's normal, don't "fix" it away.
- `npm test` — must stay green.
- `npm run type-check && npm run build` only if you touched any `.mdx` file.

---

## Build Queue

- [x] **`linear-algebra`** — `01-vectors-and-spaces.ipynb`: add DML `76_calculate-cosine-similarity-between-vectors`, `83_dot-product-calculator`, `117_compute-orthonormal-basis-for-2d-vectors`, `118_compute-the-cross-product-of-two-3d-vectors`, `121_vector-element-wise-sum`, `66_implement-orthogonal-projection-of-a-vector-onto-a`. `02-matrices-and-transformations.ipynb`: add DML `1_matrix-vector-dot-product`, `2_transpose-of-a-matrix`, `3_reshape-matrix`, `4_calculate-mean-by-row-or-column`, `5_scalar-multiplication-of-a-matrix`, `7_matrix-transformation`, `9_matrix-times-matrix`, `27_transformation-matrix-from-basis-b-to-c`, `35_convert-vector-to-diagonal-matrix`, `55_2d-translation-matrix-implementation`, `119_solve-system-of-linear-equations-using-cramer-s-ru`; add a "solving linear systems" bank: `11_solve-linear-equations-using-jacobi-method`, `48_implement-reduced-row-echelon-form-rref-function`, `57_gauss-seidel-method-for-solving-linear-systems`, `58_gaussian-elimination-for-solving-linear-systems`, `63_implement-the-conjugate-gradient-method-for-solvin`, `68_find-the-image-of-a-matrix-using-row-echelon-form`. `03-eigenvalues-and-eigenvectors.ipynb`: add DML `6_calculate-eigenvalues-of-a-matrix`, `8_calculate-2x2-matrix-inverse`, `13_determinant-of-a-4x4-matrix-using-laplace-s-expans`, `28_svd-of-a-2x2-matrix-using-eigen-values-vectors`. `04-svd-and-low-rank.ipynb`: add DML `12_singular-value-decomposition-svd`, `10_calculate-covariance-matrix`, `37_calculate-correlation-matrix`, `65_implement-compressed-row-sparse-matrix-csr-format-`, `67_implement-compressed-column-sparse-matrix-format-c`.

- [x] **`calculus-for-ml`** — `01-derivatives-and-gradients.ipynb`: add DML `116_derivative-of-a-polynomial` as extra practice (symbolic/numeric polynomial derivative, cross-check against the notebook's existing numerical-gradient code).

- [x] **`probability-statistics`** — `02-probability-distributions.ipynb`: add DML `79_binomial-distribution-probability`, `80_normal-distribution-pdf-calculator`, `81_poisson-distribution-probability-calculator`. `05-entropy-and-kl-divergence.ipynb`: add DML `108_measure-disorder-in-apple-colors` (categorical entropy toy problem), `56_kl-divergence-between-two-normal-distributions` (simpler univariate case, good lead-in before the multivariate one), `136_calculate-kl-divergence-between-two-multivariate-g`, `120_bhattacharyya-distance-between-two-distributions`. `01-thinking-in-probabilities.ipynb` or `06-statistical-inference.ipynb`: add DML `78_descriptive-statistics-calculator`, `95_calculate-the-phi-coefficient` (pick whichever notebook's narrative fits better).

- [x] **`linear-regression`** — `01-linear-regression.ipynb`: add DML `14_linear-regression-using-normal-equation` (closed-form, alongside the notebook's existing gradient-descent version), `16_feature-scaling-implementation`, and a regression-metrics bank `69_calculate-r-squared-for-regression-analysis`, `71_calculate-root-mean-square-error-rmse`, `93_calculate-mean-absolute-error-mae`. `02-logistic-regression.ipynb`: add DML `104_binary-classification-with-logistic-regression`, `106_train-logistic-regression-with-gradient-descent`. `03-regularization.ipynb`: add DML `43_implement-ridge-regression-loss-function`, `50_implement-lasso-regression-using-gradient-descent`, `139_elastic-net-regression-via-gradient-descent`. `04-generalized-linear-models.ipynb`: add DML `105_train-softmax-regression-with-gradient-descent` (multinomial logistic regression).

- [x] **`knn-decision-trees`** — `01-knn.ipynb`: add DML `173_implement-k-nearest-neighbors` matching DML's exact function signature; strengthen exercise with tie-breaking and k=1/k=n edge cases. `02-decision-trees.ipynb`: add DML `20_decision-tree-learning`, `138_find-the-best-gini-based-split-for-a-binary-decisi`, `64_implement-gini-impurity-calculation-for-a-set-of-c`. `03-bias-variance.ipynb`: add DML `86_detect-overfitting-or-underfitting` as extra practice — a near-exact thematic match.

- [x] **`clustering`** — `01-k-means.ipynb`: add DML `17_k-means-clustering` as extra practice; strengthen exercise with edge cases (k > n_points, all-identical points, empty-cluster reassignment).

- [~] **`pca-dimensionality`** — `01-pca.ipynb`: add DML `19_principal-component-analysis-pca-implementation` as extra practice matching DML's function signature (variance-explained ratio check).

- [~] **`svm`** — `02-kernel-trick.ipynb`: add DML `21_pegasos-kernel-svm-implementation` (sub-gradient Pegasos solver with a kernel), `45_linear-kernel-function`.

- [~] **`ensemble-methods`** — `02-boosting.ipynb`: add DML `38_implement-adaboost-fit-method` matching DML's exact fit-method signature (weighted error, alpha computation, weight update).

- [~] **`model-evaluation`** — `01-classification-metrics.ipynb`: add a classification-metrics bank — DML `36_calculate-accuracy-score`, `46_implement-precision-metric`, `52_implement-recall-metric-in-binary-classification`, `61_implement-f-score-calculation-for-binary-classific`, `91_calculate-f1-score-from-predicted-and-true-labels`, `72_calculate-jaccard-index-for-binary-classification`, `73_calculate-dice-score-for-classification`, `75_generate-a-confusion-matrix-for-binary-classificat`, `77_calculate-performance-metrics-for-a-classification` — this is a large bank, group into one combined "implement every classification metric from its confusion-matrix counts" section rather than 9 separate scaffolds. `02-validation-strategies.ipynb`: add DML `18_implement-k-fold-cross-validation`. `03-training-techniques.ipynb`: add DML `135_implement-early-stopping-based-on-validation-loss` (patience counter, best-checkpoint tracking).

- [~] **`neural-networks`** — `01-what-is-a-neuron.ipynb`: add an activation-function bank — DML `22_sigmoid-activation-function-understanding`, `23_softmax-activation-function-implementation`, `24_single-neuron`, `42_implement-relu-activation-function`, `44_leaky-relu-activation-function`, `96_implement-the-hard-sigmoid-activation-function`, `97_implement-the-elu-activation-function`, `98_implement-the-prelu-activation-function`, `99_implement-the-softplus-activation-function`, `100_implement-the-softsign-activation-function`, `102_implement-the-swish-activation-function`, `103_implement-the-selu-activation-function` (group as one bank with a shared plotting cell comparing all curves — don't write 12 separate scaffolds). `02-gradient-descent.ipynb`: add DML `25_single-neuron-with-backpropagation`, `26_implementing-basic-autograd-operations` (a tiny scalar autograd engine), `47_implement-gradient-descent-variants-with-mse-loss`, `49_implement-adam-optimization-algorithm`. `03-layers-and-forward-pass.ipynb`: add DML `39_implementation-of-log-softmax-function`, `40_implementing-a-custom-dense-layer-in-python`. `05-batchnorm-and-dropout.ipynb`: add DML `151_dropout-layer` matching DML's exact inverted-dropout signature; add a short pointer to DML `128_dynamic-tanh-normalization-free-transformer-activa` (DyT — a 2024 LayerNorm-free alternative) as a "beyond this lesson" note, not a full re-derivation.

- [~] **`cnns`** — `01-convolution-operation.ipynb`: add DML `41_simple-convolutional-2d-layer` matching DML's exact conv2d signature (stride/padding params). `02-pooling-and-architectures.ipynb`: add DML `114_implement-global-average-pooling`, `130_implement-a-simple-cnn-training-function-with-back` (a full toy CNN forward+backward loop). `05-modern-architectures.ipynb`: add DML `113_implement-a-simple-residual-block-with-shortcut-co` (ResNet-style), `137_implement-a-dense-block-with-2d-convolutions` (DenseNet-style). Optional/low-priority: `70_calculate-image-brightness`, `82_grayscale-image-contrast-calculator` as trivial image-stat warm-ups if a notebook has room — skip if they don't fit naturally, they're minor.

- [ ] **`transformers`** — `01-self-attention.ipynb`: add DML `53_implement-self-attention-mechanism`, `107_implement-masked-self-attention` (causal mask — the notebook likely only has unmasked/bidirectional attention). `02-multi-head-and-positional.ipynb`: add DML `94_implement-multi-head-attention`, `85_positional-encoding-calculator` — both exact-match titles for this lesson. `03-transformer-architecture.ipynb`: add DML `109_implement-layer-normalization-for-sequence-data` matching DML's exact signature; note DML `128_dynamic-tanh-normalization-free-transformer-activa` (DyT) as a "recent alternative to LayerNorm" pointer (shared with the neural-networks item above — do whichever lands first, don't duplicate the derivation in both). `04-modern-attention.ipynb`: add DML `131_implement-efficient-sparse-window-attention`. `06-mixture-of-experts.ipynb`: add DML `123_calculate-computational-efficiency-of-moe`, `124_implement-the-noisy-top-k-gating-function`, `125_implement-a-sparse-mixture-of-experts-layer`.

- [ ] **`rnns`** — `01-recurrent-neural-networks.ipynb`: add DML `54_implementing-a-simple-rnn` as extra practice matching DML's exact signature. `02-bptt-and-vanishing-gradient.ipynb`: add DML `62_implement-a-simple-rnn-with-backpropagation-throug` (RNN + BPTT — a direct match for this lesson's topic). `03-lstm-and-gru.ipynb`: add DML `59_implement-long-short-term-memory-lstm-network`.

- [ ] **`reinforcement-learning`** — `01-markov-decision-processes.ipynb`: add DML `157_implement-the-bellman-equation-for-value-iteration`, `142_gridworld-policy-evaluation`. `02-q-learning.ipynb`: add DML `133_implement-q-learning-algorithm-for-mdps` matching DML's exact signature; add a bandit-methods bank `158_epsilon-greedy-action-selection-for-n-armed-bandit`, `158_incremental-mean-for-online-reward-estimation`, `161_exponential-weighted-average-of-rewards`. `04-policy-gradient.ipynb`: add DML `122_policy-gradient-with-reinforce` matching DML's exact REINFORCE signature. `06-from-policy-gradient-to-rlhf.ipynb`: add DML `101_implement-the-grpo-objective-function` as a notebook-level companion to the already-shipped `wiki/grpo-objective` page (this notebook can be lighter — link to the wiki notebook for the full derivation, and just add a short applied exercise here).

- [ ] **`optimization-ml`** — `01-gradient-descent-variants.ipynb`: add an optimizer-implementation bank matching each DML signature (ties directly to `wiki/gradient-descent-optimizers`) — DML `145_adagrad-optimizer`, `146_momentum-optimizer`, `148_adamax-optimizer`, `149_adadelta-optimizer`, `150_nesterov-accelerated-gradient-optimizer`, `87_adam-optimizer` (the single-step stateful signature — note DML `49` is a different, loop-based framing of Adam already used in the `neural-networks` item; use `87`'s per-step `(parameter, grad, m, v, t) -> (parameter, m, v)` signature here to avoid duplicating the same exercise). `05-hyperparameter-optimization.ipynb`: add a schedule-implementation bank (ties to `wiki/learning-rate-schedules`) — DML `153_stepLR`, `154_exponentialLR`, `155_CossineAnnealingLR`.

- [ ] **`generative-models`** — `04-generative-adversarial-networks.ipynb`: add DML `174_train-a-simple-gan-on-1d-gaussian-data` as extra practice (a minimal 1D GAN — complements whatever toy GAN the notebook already trains).

- [ ] **`nlp`** — `01-text-preprocessing.ipynb`: add DML `129_calculate-unigram-probability-from-corpus`, `51_optimal-string-alignment-distance` (edit distance — a natural fit for text-preprocessing/spell-check framing). `02-word-embeddings.ipynb`: add DML `111_compute-pointwise-mutual-information` (PMI — classic for word-association context, motivates why embeddings beat raw co-occurrence counts). `06-topic-modeling-bertopic.ipynb`: add DML `60_implement-tf-idf-term-frequency-inverse-document-f`, `90_bm25-ranking` (both are the retrieval/ranking building blocks BERTopic's c-TF-IDF step builds on).

- [ ] **`building-with-llms`** — `08-llm-evaluation.ipynb`: add DML `134_compute-multi-class-cross-entropy-loss` as extra practice alongside the notebook's existing perplexity/entropy material; check it already links to `wiki/text-generation-metrics` (added when that wiki page shipped) and add a worked BLEU or ROUGE-L cell here if that page's exercise isn't already surfaced in this notebook. Optional/advanced, only if it fits: DML `88_gpt-2-text-generation` reframed with small random weights (no real download) as a "minimal transformer decoder end-to-end" capstone — skip if it doesn't fit cleanly within the self-contained/no-network constraint.

- [ ] **`probabilistic-models`** — `03-naive-bayes.ipynb`: add DML `140_bernoulli-naive-bayes-classifier` matching DML's exact signature (the notebook likely already covers Gaussian/Multinomial variants — Bernoulli is the missing one).

- [ ] **`bayesian-methods`** — `02-gaussian-processes.ipynb`: add DML `186_guassian_mixture_regression` as extra practice — **note the misleading slug**: its `description.md` confirms this is actually a `GaussianProcessRegression` class implementation, not GMM, so it belongs here rather than in `probabilistic-models`.

- [ ] **`graphical-models`** — `03-hidden-markov-models.ipynb`: add DML `132_simulate-markov-chain-transitions` as a prerequisite warm-up exercise (plain Markov chain simulation before the HMM's hidden-state complication).

- [ ] **`ml-in-practice`** — `01-feature-engineering.ipynb`: add DML `32_generate-sorted-polynomial-features`, `84_phi-transformation-for-polynomial-features` (a closely related polynomial-feature variant — use whichever fits better, or both if genuinely distinct), `34_one-hot-encoding-of-nominal-values`, `112_min-max-normalization-of-feature-values`, `141_shift-and-scale-array-to-target-range`. `03-algorithms-from-scratch.ipynb`: add a dataset-utilities bank — DML `29_random-shuffle-of-dataset`, `30_batch-iterator-for-dataset`, `31_divide-dataset-based-on-feature-threshold`, `33_generate-random-subsets-of-a-dataset`. `05-data-engineering-fundamentals.ipynb`: add DML `187_mlops-etl-pipeline` as extra practice (a minimal toy ETL pipeline).

- [ ] **`gpu-programming`** — `04-gpus-for-deep-learning.ipynb`: add DML `160_mixed_precision_training` matching DML's exact signature (loss-scaling / FP16 cast logic) — complements the lesson's existing conceptual mixed-precision coverage and the new `wiki/gradient-checkpointing` companion page.

---

## Considered and intentionally excluded

- DML `89_the-pattern-weaver-s-code` — a fictionalized re-skin of self-attention (same algorithm as `53`, already used in `transformers/01-self-attention`). Skip as a substance-duplicate.
- DML `127_find-captain-redbeard-s-hidden-treasure` — a narrative/puzzle problem, not a clean fit for any lesson's concept. Skip.
- DML `74_create-composite-hypervector-for-a-dataset-row` — hyperdimensional computing; no ml-viz course covers this. Skip.
- DML `70_calculate-image-brightness`, `82_grayscale-image-contrast-calculator` — real but trivial single-function image-stat calculators; listed as optional/low-priority under `cnns` above rather than their own item.

## Courses with no real DML match (do not force one)

`causal-inference`, `computer-vision`, `graph-neural-networks`,
`agent-design-patterns`, `recommender-systems`, `speech-audio`, `time-series`,
`fine-tuning-alignment` — no problem in the full 164-problem DML set maps
cleanly to these. Skip; do not invent a mapping to fill this list out.

---

## Conventions quick-reference

- Notebook structure/"Your turn" scaffold conventions: `CLAUDE.md`.
- Existing notebook to mirror for exercise-bank style: any already-shipped
  notebook with multiple DML-style exercises, e.g. `notebooks/wiki/grpo-objective.ipynb`.
- Wiki pages already shipped from the companion checklist
  (`prompts/dml-openproblem-checklist.md`) that some of these items should
  cross-link to: `wiki/grpo-objective`, `wiki/gradient-checkpointing`,
  `wiki/groupnorm-and-instancenorm`, `wiki/text-generation-metrics`,
  `wiki/gradient-descent-optimizers`, `wiki/learning-rate-schedules`.
- **Never fabricate a DML problem number or signature.** Every ID above was
  read directly from a local clone's `meta.json`/`description.md` — see
  "Data provenance." If a loop iteration is unsure of a signature, `git clone
  --depth 1 https://github.com/Open-Deep-ML/DML-OpenProblem.git` and read
  `questions/<id>_<slug>/starter_code.py` directly rather than guessing.
