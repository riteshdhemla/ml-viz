# Improvement Task Backlog

Derived from [`docs/CONTENT-REVIEW.md`](./CONTENT-REVIEW.md). Each task is **self-contained and sized for ~1 hour of agent work** — pick the first unchecked task in order, finish it end-to-end, check it off, commit.

## Agent protocol (read first)

1. Read `CLAUDE.md` in the repo root — all conventions apply (viz-kit patterns, `blockJS` exercise rule, notebook structure, styling tokens).
2. Pick the **first unchecked task** below. Do only that task.
3. Definition of done for every task:
   - `npm run type-check` passes and `npm run build` passes.
   - New viz components are registered in `src/components/mdx/mdxComponents.tsx` AND added to the CLAUDE.md viz table.
   - New exercises are added to `src/lib/exercises.ts` and referenced only via `<Exercise id="..." />` (never inline objects).
   - Edited notebooks remain valid JSON (`python3 -m json.tool < file.ipynb`).
4. Check the task's box in this file, commit everything with a descriptive message, push to the current branch.
5. Calibration references — gold standard lesson: `src/content/courses/neural-networks/01-what-is-a-neuron.mdx`; gold standard viz: `src/components/visualizations/ActivationFunction/ActivationFunctionViz.tsx`; shared primitives: `src/components/visualizations/viz-kit.tsx`.

Viz tasks (T09+) all follow the same shape: create `src/components/visualizations/<Name>/<Name>Viz.tsx` ("use client", pure SVG, `VizFrame`/`VizSlider`/`VizButton`/`VizStat`, `VIZ` tokens, deterministic via `seededRandom`), register it, embed `<NameViz />` at the natural point in the target lesson, update the CLAUDE.md table.

---

## Wave 1 — Metadata & text consistency

- [x] **T01 — Fix `estimatedHours` in all 17 course `index.mdx` files.**
  Convention: `estimatedHours = round to nearest 0.5 of (sum of lesson estimatedMinutes × 2.5) / 60` (the 2.5× covers notebook + exercises). Compute per course from actual lesson frontmatter. Document this convention in CLAUDE.md under "Adding a course".

- [x] **T02 — Declare foundational prerequisites.**
  Edit `prerequisites:` in `index.mdx` of: neural-networks → `["linear-algebra", "calculus-for-ml"]`; cnns, rnns → keep `neural-networks` (transitively covers math); svm → add `"linear-algebra"`; clustering → keep; pca-dimensionality → add `"linear-algebra"`; probabilistic-models → add `"probability-statistics"`; graphical-models → keep; reinforcement-learning → keep. Verify each added slug is a real course folder and the DAG stays acyclic.

- [x] **T03 — linear-algebra house-style sections + notebook endings.**
  Add `## Common mistakes` (2–3 bullets, before "Key takeaways") to all 3 lessons; add a `**Real-world examples:**` line to the intro of lessons 02 and 03. Fix `notebooks/linear-algebra/01` and `02` to end with a matplotlib visualization cell instead of prints.

- [x] **T04 — calculus-for-ml house-style sections.**
  Add `## Common mistakes` to all 3 lessons and `**Real-world examples:**` intro lines to all 3. Also smooth the lesson-01 mention of directional derivatives (define briefly or forward-reference lesson 03).

- [x] **T05 — probability-statistics house-style sections.**
  Add `## Common mistakes` and `**Real-world examples:**` intro lines to all 3 lessons (e.g. PDF > 1 confusion, likelihood ≠ probability, prior overconfidence).

- [x] **T06 — generative-models consistency pass.**
  Add `## Common mistakes` to lessons 01–04. Add a worked numeric example to lesson 01 (compute $P(x)$ for a 2D Gaussian, contrast with GAN's implicit density). Align lesson 02's code with its narrative (mean MSE, not summed). After lesson 05's comparison table, add an info Callout explaining why diffusion displaced GANs (stability + quality vs. sampling speed; DDIM/distillation closing the gap).

- [x] **T07 — reinforcement-learning DQN depth.**
  Add a step-by-step worked example to `03-deep-q-networks.mdx`: one full DQN training step with concrete numbers (state → action → reward → target-net bootstrap → TD target → loss → gradient direction). Expand `notebooks/reinforcement-learning/03-deep-q-networks.ipynb` with a replay-buffer demo (store ~100 transitions, sample a minibatch, show correlation breaking).

- [x] **T08 — Clarity polish across 4 lessons.**
  (a) `graphical-models/01`: add a mini-table giving a concrete sprinkler-network example for each d-separation pattern (chain/fork/collider). (b) `graphical-models/03`: add an explicit backpointer table to the Viterbi worked example. (c) `probabilistic-models/02`: add the post-M-step responsibility table so the iteration-to-iteration change is visible. (d) `neural-networks/01`: add a "Related concepts" link forward to `03-layers-and-forward-pass`.

## Wave 2 — Visualization gaps (one viz per task)

Ordered by how hard the concept is without animation.

- [x] **T09 — KernelViz → `svm/02-kernel-trick.mdx`.** 2D points in concentric circles; toggle linear/poly/RBF; show the implicit feature-space separation (e.g. plot $\phi(x) = (x_1^2, x_2^2)$ projection or RBF similarity contours); γ slider.
- [x] **T10 — LSTMGateViz → `rnns/03-lstm-and-gru.mdx`.** Animate a cell over ~8 timesteps: forget/input/output gate values as opacity, cell state as a horizontal "highway"; sliders for gate biases showing memory retention vs. erasure.
- [x] **T11 — DSeparationViz → `graphical-models/01-bayesian-networks.mdx`.** Small fixed DAG; click nodes to condition (shade them); paths recolor as blocked/unblocked per chain/fork/collider rules; readout naming the active rule.
- [x] **T12 — GridWorldViz → `reinforcement-learning/01-markov-decision-processes.mdx`.** 4×4 gridworld; step button runs value iteration sweeps; cells show $V(s)$ as color+number, arrows show the greedy policy; γ slider.
- [x] **T13 — DiffusionViz → `generative-models/05-diffusion-models.mdx`.** 2D point cloud (two moons via `seededRandom`); slider over timestep t shows forward noising; play button animates reverse denoising (precomputed trajectory); β-schedule toggle.
- [x] **T14 — BoostingViz → `ensemble-methods/02-boosting.mdx`.** 1D/2D points with stump classifiers; step button runs AdaBoost rounds; point radius = sample weight; show ensemble boundary tightening and per-round α.
- [x] **T15 — QTableViz → `reinforcement-learning/02-q-learning.mdx`.** Q-table heatmap for the gridworld; play button runs ε-greedy episodes; cells flash on TD updates; ε and α sliders; episode/return stats.
- [x] **T16 — PoolingViz → `cnns/02-pooling-and-architectures.mdx`.** Animate a 2×2 window sliding over a 6×6 feature map; max/avg toggle; stride slider; highlight the surviving value; show output dimensions.
- [x] **T17 — LatentSpaceViz → `generative-models/03-variational-autoencoders.mdx`.** 2D latent grid; drag a point in latent space, show the "decoded" output (parametric shape morphing); AE vs VAE toggle showing holes vs. smooth coverage. Also link from lesson 02.
- [x] **T18 — RNNUnrollViz → `rnns/01-recurrent-neural-networks.mdx`.** Unrolled RNN over a short input sequence; step through timesteps showing hidden-state vector evolving (bars), with shared-weight highlighting on every step.
- [x] **T19 — BaggingViz → `ensemble-methods/01-bagging-and-random-forests.mdx`.** Show bootstrap resamples (which points each tree sees), individual wiggly boundaries vs. the smoothed majority-vote boundary; n_trees slider.
- [ ] **T20 — GMMResponsibilityViz → `probabilistic-models/01-gaussian-mixture-models.mdx`.** 2D points colored by soft responsibilities (blended colors); step button runs EM iterations; ellipses show component covariances; log-likelihood VizStat increasing monotonically. Also link from lesson 02.
- [ ] **T21 — TransferLearningViz → `cnns/03-transfer-learning.mdx`.** Layer-block diagram of a CNN; slider for "unfreeze depth" shades frozen (gray) vs trainable (brand) blocks; live trainable-parameter count; strategy preset buttons.
- [ ] **T22 — PositionalEncodingViz → `transformers/02-multi-head-and-positional.mdx`.** Heatmap of sinusoidal PE matrix (position × dimension); slider to highlight one position's vector; show how nearby positions get similar codes.
- [ ] **T23 — HMMViterbiViz → `graphical-models/03-hidden-markov-models.mdx`.** Trellis diagram; step button fills the Viterbi table column by column; backpointer arrows; highlight the recovered best path at the end.
- [ ] **T24 — DendrogramViz → `clustering/02-hierarchical-and-dbscan.mdx`.** Small dataset; dendrogram with a draggable cut height slider; points recolor by resulting clusters; linkage toggle (single/complete/average).
- [ ] **T25 — GANTrainingViz → `generative-models/04-generative-adversarial-networks.mdx`.** 1D data distribution vs. generator distribution (precomputed training trajectory); play button; show mode collapse with a toggle; D confidence curve overlay.
- [ ] **T26 — TransformerBlockViz → `transformers/03-transformer-architecture.mdx`.** Block diagram of one transformer layer; hover/click each sub-block (attention, FFN, residual, layernorm) to highlight the data path; toggle encoder vs decoder (masked) mode.
- [ ] **T27 — PerplexityViz → `pca-dimensionality/02-t-sne-and-umap.mdx`.** Precomputed t-SNE-style embeddings of the same dataset at 3–4 perplexity values; slider morphs between them; caption warning about over-interpreting cluster sizes/distances.
- [ ] **T28 — PolicyGradientViz → `reinforcement-learning/04-policy-gradient.mdx`.** 1D/bandit policy as a softmax over actions; step button samples actions, shows advantage sign pushing probabilities up/down; baseline toggle showing variance reduction.

## Wave 3 — Structural features

- [ ] **T29 — Course progress UI.** Call the existing `getCourseProgress()` (`src/lib/progress.ts`) from `CourseCard.tsx` (progress bar overlay) and the course overview page. Client component boundaries per CLAUDE.md (no fs in client, "use client" where state is read).
- [ ] **T30 — Slider exercise expansion.** Add ~10 slider-type exercises to `src/lib/exercises.ts` for parameter-tuning intuition (learning rate, k in KNN, C in SVM, γ in RBF, perplexity, ε-greedy, β-VAE weight…), and reference each from the relevant lesson next to the related section.
- [ ] **T31 — Quiz lessons.** Add an end-of-course `type: quiz` lesson to the 3 foundations courses (e.g. `04-quiz.mdx`, frontmatter type `quiz`, 5–6 `<Exercise>` refs reusing/adding registry entries, minimal prose). Verify LessonLayout renders type `quiz` correctly (adjust badge/styling branch if needed). Create matching minimal notebooks only if the build requires them — otherwise set `notebookUrl` override or confirm the Colab button degrades gracefully.
- [ ] **T32 — Progress dashboard page.** New `/progress` page: courses started/completed (X/17), lessons completed (Y/47), per-course bars, "recommended next course" computed from the prerequisites DAG + completion state. Client component reading the Zustand store; match dark design tokens.

---

*Generated from the 2026-06-10 content review. Re-run a review after Wave 2 completes — viz wiring changes lesson structure findings.*
