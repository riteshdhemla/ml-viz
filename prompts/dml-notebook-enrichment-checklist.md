# DML-OpenProblem Notebook Enrichment Checklist — Loop Queue

A course-by-course mapping of `notebooks/<course>/*.ipynb` against verified
[Open-Deep-ML/DML-OpenProblem](https://github.com/Open-Deep-ML/DML-OpenProblem)
problems (`questions/<id>_<slug>/`), built to strengthen existing "✏️ Your turn"
exercises and add short DML-sourced extra-practice sections. Each unchecked item
is a **loop-executable** unit, following the same protocol as
`prompts/content-build-checklist.md`.

> **How to run:** `/loop 20m Follow prompts/dml-notebook-enrichment-checklist.md:
> do the NEXT single unchecked item, then stop.` One item = one course = one
> commit. The file is the state.

Legend: `[ ]` todo · `[~]` in-progress · `[x]` done.

## ⚠️ Data-integrity note (read before using DML problem numbers below)

The DML problem IDs/slugs in this file were fetched from GitHub's directory
listing across several requests and **cross-checked for internal consistency**
(same numbers recurring across independent fetches). One fetch attempt for the
`42-99` id range returned a suspiciously clean, sequential list of exotic
"nature-inspired optimization algorithm" problems (Grey Wolf, Whale, Harris
Hawks, Jellyfish Search, etc.) — a re-fetch with a stricter prompt confirmed
this was **hallucinated**, not real repository content, and it has been
discarded entirely. IDs 4-9 (matrix inverse/multiplication/determinant/etc.)
came from that same tainted response and are also excluded, even though they
sound plausible. **Only IDs 1-3, 10-41, and 100-188 below are used**, verified
across multiple independent fetches. If a loop iteration wants to cite a DML
problem number not listed here, verify it against the live repo first — do not
extrapolate a plausible-sounding one.

## Definition of Done (per course item)

For each notebook touched:
1. **Strengthen the existing "✏️ Your turn" scaffold** — replace or extend the
   TODO+assert cell with edge cases in the spirit of DML's `tests.json` style
   (multiple inputs, boundary conditions: empty/single-element input, ties,
   zero variance, extreme values) rather than a single happy-path assert.
2. **Add a short new cell/section** implementing the specific DML problem
   variant named for that notebook below, framed as extra practice (a markdown
   cell naming the DML problem + a `# TODO(you)` code cell + assert(s) + a
   `<details>` solution) — mirror the existing notebook's established
   "Your turn" pattern, don't invent a new structure.
3. Keep notebooks **self-contained** (NumPy/Matplotlib only, no network/API
   keys) and consistent with the dark-matplotlib style already used.
4. Do not touch lesson `.mdx` files unless a one-line pointer to the new
   section genuinely helps orientation — this task is scoped to notebooks.

**Verify gate (lighter than the content checklists — no MDX/build changes expected):**
- Parse every touched `.ipynb` as JSON and confirm `nbformat >= 4` and `cells`
  is an array (what `content-integrity.test.ts` / `wiki-integrity.test.ts` check).
- Extract each touched notebook's code cells and run them standalone (with the
  TODO cells' solutions substituted in) to confirm the added exercise's
  solution actually executes and its asserts pass. The shipped (unsolved) TODO
  cell is *expected* to error/no-op — that's normal, don't "fix" it away.
- `npm test` — must stay green (`content-integrity.test.ts` only checks
  notebook existence + valid JSON, so this is a fast sanity check, not deep
  validation).
- `npm run type-check && npm run build` only if you touched any `.mdx` file.

---

## Build Queue

- [ ] **`linear-algebra`** — `01-vectors-and-spaces.ipynb`: add DML `117_compute-orthonormal-basis-for-2d-vectors` + `118_compute-the-cross-product-of-two-3d-vectors` + `121_vector-element-wise-sum` as extra practice; strengthen existing exercise with edge cases (zero vector, parallel vectors). `02-matrices-and-transformations.ipynb`: add DML `1_matrix-vector-dot-product`, `2_transpose-of-a-matrix`, `3_reshape-matrix`, `27_transformation-matrix-from-basis-b-to-c`, `119_solve-system-of-linear-equations-using-cramer-s-rule`. `03-eigenvalues-and-eigenvectors.ipynb`: add DML `13_determinant-of-a-4x4-matrix-using-laplace-s-expansion`, `28_svd-of-a-2x2-matrix-using-eigen-values-vectors`. `04-svd-and-low-rank.ipynb`: add DML `12_singular-value-decomposition-svd`, `10_calculate-covariance-matrix`.

- [ ] **`calculus-for-ml`** — `01-derivatives-and-gradients.ipynb`: add DML `116_derivative-of-a-polynomial` as extra practice (symbolic/numeric polynomial derivative, cross-check against the notebook's existing numerical-gradient code).

- [ ] **`probability-statistics`** — `05-entropy-and-kl-divergence.ipynb`: add DML `108_measure-disorder-in-apple-colors` (categorical entropy toy problem), `111_compute-pointwise-mutual-information`, `136_calculate-kl-divergence-between-two-multivariate-gaussians` (the notebook likely only has 1D KL — this generalizes it). `02-probability-distributions.ipynb`: add DML `120_bhattacharyya-distance-between-two-distributions` as a distribution-similarity extra-practice section.

- [ ] **`linear-regression`** — `01-linear-regression.ipynb`: add DML `14_linear-regression-using-normal-equation` (closed-form) alongside the notebook's existing gradient-descent version, `16_feature-scaling-implementation`. `02-logistic-regression.ipynb`: add DML `104_binary-classification-with-logistic-regression`, `106_train-logistic-regression-with-gradient-descent`, `105_train-softmax-regression-with-gradient-descent` (multiclass extension). `03-regularization.ipynb`: add DML `139_elastic-net-regression-via-gradient-descent` (combines L1+L2 — the notebook likely covers Ridge/Lasso separately already).

- [ ] **`knn-decision-trees`** — `01-knn.ipynb`: add DML `173_implement-k-nearest-neighbors` as extra practice matching DML's exact function signature; strengthen exercise with tie-breaking and k=1/k=n edge cases. `02-decision-trees.ipynb`: add DML `20_decision-tree-learning`, `138_find-the-best-gini-based-split-for-a-binary-decision-tree`.

- [ ] **`clustering`** — `01-k-means.ipynb`: add DML `17_k-means-clustering` as extra practice; strengthen exercise with edge cases (k > n_points, all-identical points, empty-cluster reassignment).

- [ ] **`pca-dimensionality`** — `01-pca.ipynb`: add DML `19_principal-component-analysis-pca-implementation` as extra practice matching DML's function signature (variance-explained ratio check).

- [ ] **`svm`** — `02-kernel-trick.ipynb`: add DML `21_pegasos-kernel-svm-implementation` (sub-gradient Pegasos solver with a kernel) as extra practice.

- [ ] **`ensemble-methods`** — `02-boosting.ipynb`: add DML `38_implement-adaboost-fit-method` as extra practice matching DML's exact fit-method signature (weighted error, alpha computation, weight update).

- [ ] **`model-evaluation`** — `02-validation-strategies.ipynb`: add DML `18_implement-k-fold-cross-validation`. `01-classification-metrics.ipynb`: add DML `36_calculate-accuracy-score`; strengthen with edge cases (all-correct, all-wrong, empty input mismatch). `03-training-techniques.ipynb`: add DML `135_implement-early-stopping-based-on-validation-loss` (patience counter, best-checkpoint tracking).

- [ ] **`neural-networks`** — `01-what-is-a-neuron.ipynb`: add DML `22_sigmoid-activation-function-understanding`, `23_softmax-activation-function-implementation`, `24_single-neuron`, `100_implement-the-softsign-activation-function`, `102_implement-the-swish-activation-function`, `103_implement-the-selu-activation-function` as a bank of activation-function extra-practice exercises (the notebook likely covers ReLU/sigmoid already — these add breadth). `02-gradient-descent.ipynb`: add DML `25_single-neuron-with-backpropagation`, `26_implementing-basic-autograd-operations` (a tiny scalar autograd engine — ties directly to the chain-rule material). `03-layers-and-forward-pass.ipynb`: add DML `39_implementation-of-log-softmax-function`, `40_implementing-a-custom-dense-layer-in-python`. `05-batchnorm-and-dropout.ipynb`: add DML `151_dropout-layer` matching DML's exact inverted-dropout signature; add DML `128_dynamic-tanh-normalization-free-transformer-activa` (DyT — a 2024 LayerNorm-free alternative) as a "beyond this lesson" pointer note, not a full re-derivation.

- [ ] **`cnns`** — `01-convolution-operation.ipynb`: add DML `41_simple-convolutional-2d-layer` as extra practice matching DML's exact conv2d signature (stride/padding params). `02-pooling-and-architectures.ipynb`: add DML `114_implement-global-average-pooling`, `130_implement-a-simple-cnn-training-function-with-back` (a full toy CNN forward+backward loop). `05-modern-architectures.ipynb`: add DML `113_implement-a-simple-residual-block-with-shortcut-co` (ResNet-style), `137_implement-a-dense-block-with-2d-convolutions` (DenseNet-style).

- [ ] **`transformers`** — `01-self-attention.ipynb`: add DML `107_implement-masked-self-attention` (causal mask) as extra practice — the notebook likely only has unmasked/bidirectional attention. `03-transformer-architecture.ipynb`: add DML `109_implement-layer-normalization-for-sequence-data` matching DML's exact signature; note DML `128_dynamic-tanh-normalization-free-transformer-activa` (DyT) as a "recent alternative to LayerNorm" pointer. `04-modern-attention.ipynb`: add DML `131_implement-efficient-sparse-window-attention` (sliding-window attention). `06-mixture-of-experts.ipynb`: add DML `123_calculate-computational-efficiency-of-moe`, `124_implement-the-noisy-top-k-gating-function`, `125_implement-a-sparse-mixture-of-experts-layer`.

- [ ] **`reinforcement-learning`** — `01-markov-decision-processes.ipynb`: add DML `157_implement-the-bellman-equation-for-value-iteration`, `142_gridworld-policy-evaluation`. `02-q-learning.ipynb`: add DML `133_implement-q-learning-algorithm-for-mdps` matching DML's exact signature; add DML `158_epsilon-greedy-action-selection-for-n-armed-bandit`, `158_incremental-mean-for-online-reward-estimation`, `161_exponential-weighted-average-of-rewards` as a bandit-methods extra-practice bank. `04-policy-gradient.ipynb`: add DML `122_policy-gradient-with-reinforce` matching DML's exact REINFORCE signature.

- [ ] **`optimization-ml`** — `01-gradient-descent-variants.ipynb`: add DML `145_adagrad-optimizer`, `146_momentum-optimizer`, `148_adamax-optimizer`, `149_adadelta-optimizer`, `150_nesterov-accelerated-gradient-optimizer` as an optimizer-implementation bank matching each DML signature (ties directly to `wiki/gradient-descent-optimizers`); add DML `153_stepLR`, `154_exponentialLR`, `155_CossineAnnealingLR` as a schedule-implementation bank (ties to `wiki/learning-rate-schedules`).

- [ ] **`generative-models`** — `04-generative-adversarial-networks.ipynb`: add DML `174_train-a-simple-gan-on-1d-gaussian-data` as extra practice (a minimal 1D GAN — complements whatever toy GAN the notebook already trains).

- [ ] **`nlp`** — `01-text-preprocessing.ipynb`: add DML `129_calculate-unigram-probability-from-corpus` as extra practice (basic corpus statistics, a natural lead-in to the notebook's tokenization material).

- [ ] **`building-with-llms`** — `08-llm-evaluation.ipynb`: add DML `134_compute-multi-class-cross-entropy-loss` as extra practice alongside the notebook's existing perplexity/entropy material; this notebook should also already link to the new `wiki/text-generation-metrics` page — check it does (added when that wiki page shipped) and add the ROUGE-L or BLEU worked example as an extra-practice cell if it isn't already exercised here.

- [ ] **`probabilistic-models`** — `01-gaussian-mixture-models.ipynb`: add DML `186_guassian_mixture_regression` as extra practice (GMM used for regression, not just clustering — a genuine extension). `03-naive-bayes.ipynb`: add DML `140_bernoulli-naive-bayes-classifier` matching DML's exact signature (the notebook may already cover Gaussian/Multinomial variants — Bernoulli is the missing one).

- [ ] **`graphical-models`** — `03-hidden-markov-models.ipynb`: add DML `132_simulate-markov-chain-transitions` as a prerequisite warm-up exercise (plain Markov chain simulation before the HMM's hidden-state complication).

- [ ] **`ml-in-practice`** — `01-feature-engineering.ipynb`: add DML `32_generate-sorted-polynomial-features`, `34_one-hot-encoding-of-nominal-values`, `112_min-max-normalization-of-feature-values`, `141_shift-and-scale-array-to-target-range`, `37_calculate-correlation-matrix` as a feature-engineering exercise bank. `03-algorithms-from-scratch.ipynb`: add DML `29_random-shuffle-of-dataset`, `30_batch-iterator-for-dataset`, `31_divide-dataset-based-on-feature-threshold`, `33_generate-random-subsets-of-a-dataset` as a dataset-utilities exercise bank. `05-data-engineering-fundamentals.ipynb`: add DML `187_mlops-etl-pipeline` as extra practice (a minimal toy ETL pipeline).

- [ ] **`gpu-programming`** — `04-gpus-for-deep-learning.ipynb`: add DML `160_mixed_precision_training` as extra practice matching DML's exact signature (loss-scaling / FP16 cast logic) — complements the lesson's existing conceptual mixed-precision coverage and the new `wiki/gradient-checkpointing` companion page.

---

## Courses with no verified DML match (do not force one)

`bayesian-methods`, `causal-inference`, `computer-vision`, `graph-neural-networks`,
`agent-design-patterns`, `recommender-systems`, `speech-audio`, `time-series`,
`fine-tuning-alignment`, `rnns` — no problem in the verified DML id ranges
(1-3, 10-41, 100-188) maps cleanly to these. Skip; do not invent a mapping to
fill this list out. If a future DML sync reveals real matches, add them here
following the same format.

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
- **Never fabricate a DML problem number.** Every ID in the Build Queue above
  was cross-verified across independent fetches — see the data-integrity note.
