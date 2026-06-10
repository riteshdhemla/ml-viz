# ML Viz — Improvement Checklist

Worked by the autonomous loop: pick the **first unchecked item**, complete it
fully, verify, ship, check it off. One item per iteration.

## Workflow rules (every item)

1. Work on a feature branch: `feature/<item-slug>`
2. Follow CLAUDE.md conventions exactly (viz: pure SVG + viz-kit, register in
   `mdxComponents.tsx`; exercises: registry in `src/lib/exercises.ts`, no orphans)
3. Verify before shipping: `npm run type-check && npm run test && npm run build`
4. Push branch, open PR to `main` with `gh pr create`
5. Check the item off here (include PR number) and commit the TODO update on the same branch

## Checklist

### User-reported fixes (priority)

- [x] **DistributionViz fixed y-scale + axis labels** — pinned y-domain per
      distribution (area-stays-1 now visible), x/y labels, ticks, gridlines,
      live uniform-height stat (PR #36)
- [x] **Axis labels audit (all viz)** — audited all components; added x/y
      labels to 12 chart-style viz (ActivationFunction, FunctionTangent, MLE,
      Bayes, KNNBoundary, DecisionBoundary, KMeans, PCA, Margin, BiasVariance,
      GMM, Perplexity). GradientDescent/LinearRegression/VanishingGradient/
      Distribution already had them; diagram-style viz (networks, pipelines,
      grids) intentionally unlabeled (PR #40)
- [x] **Probability course intro lesson** — added 01 "Thinking in
      Probabilities" (sample spaces, axioms, conditional probability, random
      variables, expectation) + notebook + exercise; renumbered lessons,
      notebooks, quiz, and all cross-links (PR #37)
- [x] **Collapsible content** — `<Details summary="...">` MDX component
      (native <details>, zero client JS); used for double-descent and
      density>1 deep dives (PR #38)
- [x] **Exercise notebooks (scaffold style) — pattern** — "✏️ Your turn"
      sections with `# TODO(you)` outlines, assert checks, and collapsible
      solutions added to all 3 knn-decision-trees notebooks; convention
      documented in CLAUDE.md (PR #39)
- [ ] **Exercise notebooks — rollout** — apply the knn-decision-trees scaffold
      pattern to the remaining 16 courses' notebooks (one course per
      iteration is fine)

### Visualizations for the 7 new lessons (one per iteration)

- [x] **BiasVarianceViz** — wired into `knn-decision-trees/03-bias-variance.mdx` (PR #35)
- [x] **RegularizationPathViz** — Ridge (closed form) vs Lasso (coordinate
      descent) paths over a log-λ grid, λ slider, non-zero-weight counter;
      wired into `linear-regression/03-regularization.mdx` (PR #41)
- [x] **SoftMarginViz** — hinge-loss SVM retrained per C value (log slider);
      margin band, violator/misclassified rings, margin-width and Σξ stats;
      wired into `svm/03-soft-margins.mdx` (PR #42)
- [x] **BoostingShrinkageViz** — stumps boosted on noisy sine; η + trees
      sliders, staged fit panel, train/test MSE curves with best-test marker;
      wired into `ensemble-methods/03-xgboost.mdx` (PR #43)
- [x] **SilhouetteViz** — k-means on 3 blobs with k slider (2-6), per-point
      silhouette bars grouped by cluster, mean-silhouette marker/stat; wired
      into `clustering/03-evaluating-clusters.mdx` (PR #44)
- [x] **PCAReconstructionViz** — closed-form 2x2 PCA, m toggle, error
      segments, variance-explained + MSE = discarded-λ₂ stats; wired into
      `pca-dimensionality/03-pca-in-practice.mdx` (PR #45)
- [x] **NaiveBayesVotesViz** — toggleable word buttons, Laplace-smoothed LLR
      vote bars + prior, live sum/P(spam)/verdict; wired into
      `probabilistic-models/03-naive-bayes.mdx` (PR #46)

### Presentation

- [ ] **Key-takeaways blocks** — add a closing "Key takeaways" section (3-5
      bullets) to every older concept lesson that lacks one (audit all 17
      courses; the 7 new lessons already have them)
- [x] **Reading progress bar** — rAF-throttled scroll indicator pinned to the
      sticky lesson header's bottom edge (PR #48)
- [x] **Quiz results summary** — quiz store records every exercise outcome;
      quiz pages show n/total progress, then a scored card (tone by score)
      with retry that resets all exercises via store epoch (PR #49)

### Ease of use

- [ ] **Learning path page** — `/path` route: courses ordered by
      `prerequisites` (topological), grouped in tiers, with per-course progress
      and a "you are here" marker
- [ ] **Mobile audit** — verify palette, sliders, viz, and quiz interactions at
      375px width; fix overflow/tap-target issues found

### Curriculum gaps — extend existing courses

- [ ] **probability-statistics: Entropy & KL divergence lesson** — entropy,
      cross-entropy, KL divergence; ties to loss functions. Lesson + notebook +
      exercise (insert before quiz, renumber quiz)
- [ ] **linear-algebra: SVD & matrix decompositions lesson** — SVD geometry,
      low-rank approximation, relation to eigendecomposition/PCA
- [ ] **calculus-for-ml: Jacobians & Hessians audit** — check lesson 03 depth;
      add explicit Jacobian/Hessian/curvature lesson if thin
- [ ] **neural-networks: XOR & MLP lesson** — perceptron learning rule, XOR
      failure, hidden-layer fix, softmax outputs
- [ ] **neural-networks: BatchNorm & Dropout lesson** — training stabilizers;
      dropout's relation to L1/L2 regularization
- [ ] **cnns: Architectures lesson** — AlexNet→VGG→ResNet→EfficientNet,
      residual connections, 1x1 convolutions
- [ ] **transformers: Modern attention lesson** — cross-attention, GQA,
      sliding-window, FlashAttention idea; RoPE, RMSNorm, SwiGLU
- [ ] **generative-models: ViT & modern GenAI lesson** — ViT, StyleGAN/CycleGAN
      taxonomy, Stable Diffusion pipeline overview

### Curriculum gaps — new courses

- [ ] **Optimization for ML course** — (1) GD variants: SGD, momentum, RMSprop,
      Adam; (2) convex optimization: convexity and why it matters;
      (3) constrained optimization: Lagrange multipliers, KKT intuition (links
      to SVM dual). + notebooks, exercises, quiz
- [ ] **Model Evaluation & Validation course** — (1) metrics: accuracy,
      precision/recall/F1, MAE/MSE, ROC-AUC vs PR curves; (2) validation:
      train/test split, k-fold CV, LOO, bootstrapping, data leakage;
      (3) training techniques: early stopping, LR schedules, grid/random/
      Bayesian search, augmentation. + notebooks, exercises, quiz
- [ ] **NLP course** — (1) text preprocessing: tokenization, stemming/
      lemmatization, stop words; (2) word embeddings: Word2Vec (CBOW/
      skip-gram), GloVe, FastText → contextual embeddings; (3) sequence models
      to BERT: why attention replaced RNNs; NER/POS/sentiment/translation
      overview. + notebooks, exercises, quiz
- [ ] **Computer Vision course** — (1) object detection: YOLO vs Faster R-CNN
      vs SSD, anchors, NMS; (2) segmentation: semantic vs instance vs
      panoptic, U-Net, RoI pooling; (3) backbones in practice: ResNet,
      MobileNet, EfficientNet. + notebooks, exercises, quiz
- [ ] **ML in Practice course** — (1) feature engineering: scaling, encoding,
      interactions, leakage traps; (2) deployment pitfalls: overfitting in
      prod, data/label leakage, drift, interpretability; (3) algorithms from
      scratch: interview-style notebook drills. + notebooks, exercises, quiz

### Done (this session, pre-loop)

- [x] Quizzes for all 17 courses — 70 exercises (PR #34)
- [x] 7 third lessons + notebooks for thin courses (PR #34)
- [x] Ctrl+K search palette (PR #34)
- [x] Lesson completion flow + continue-learning card (PR #34)
- [x] SEO: sitemap, robots, OG, JSON-LD (PR #34)
