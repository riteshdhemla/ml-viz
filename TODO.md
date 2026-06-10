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

- [ ] **DistributionViz fixed y-scale + axis labels** — uniform (and gaussian)
      look wrong because `ymax` rescales with the peak, so the curve height
      never visibly changes as [a,b] widens; pin the y-domain per distribution
      so widening visibly lowers the density (area stays 1). Add x/y axis
      labels + tick values.
- [ ] **Axis labels audit (all viz)** — every plot-style viz gets x/y axis
      labels (and ticks where meaningful). Audit all ~40 components in
      `src/components/visualizations/`.
- [ ] **Probability course intro lesson** — course jumps straight into
      distributions. Add new lesson 01 "Thinking in Probabilities" (sample
      spaces, events, random variables, expectation intuition); renumber
      existing lessons/notebooks/quiz accordingly.
- [ ] **Collapsible content** — `<Details summary="...">` MDX component
      (collapsible deep-dive section, dark-theme styled); use in long lessons.
- [ ] **Exercise notebooks (scaffold style)** — notebooks teach concept recap +
      code outline with `# TODO(you)` blanks and asserts that check answers.
      Convert one course as the pattern, then roll out to all.

### Visualizations for the 7 new lessons (one per iteration)

- [x] **BiasVarianceViz** — wired into `knn-decision-trees/03-bias-variance.mdx` (PR #35)
- [ ] **RegularizationPathViz** — Ridge vs Lasso weight paths as λ slider moves;
      show Lasso weights snapping to exactly zero. Wire into
      `linear-regression/03-regularization.mdx`
- [ ] **SoftMarginViz** — 2D points with margin band; C slider reshapes
      boundary/margin; highlight violators (ξ > 0) and misclassified (ξ > 1).
      Wire into `svm/03-soft-margins.mdx`
- [ ] **BoostingShrinkageViz** — staged boosting fit on 1D sine data; sliders
      for η and number of trees; train vs test error curves. Wire into
      `ensemble-methods/03-xgboost.mdx`
- [ ] **SilhouetteViz** — blobs clustered at chosen k; per-point silhouette bars
      grouped by cluster; k slider, mean-silhouette stat. Wire into
      `clustering/03-evaluating-clusters.mdx`
- [ ] **PCAReconstructionViz** — 2D points projected onto first PC; m toggle
      (1 vs 2 components); show reconstruction segments + error stat. Wire into
      `pca-dimensionality/03-pca-in-practice.mdx`
- [ ] **NaiveBayesVotesViz** — toy spam classifier; type/select words, show
      per-word log-likelihood-ratio vote bars summing to a verdict. Wire into
      `probabilistic-models/03-naive-bayes.mdx`

### Presentation

- [ ] **Key-takeaways blocks** — add a closing "Key takeaways" section (3-5
      bullets) to every older concept lesson that lacks one (audit all 17
      courses; the 7 new lessons already have them)
- [ ] **Reading progress bar** — thin top-of-viewport scroll progress indicator
      on lesson pages (client component in `LessonLayout`)
- [ ] **Quiz results summary** — on quiz lessons, show score (n/total correct)
      once all exercises answered, with retry option

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
