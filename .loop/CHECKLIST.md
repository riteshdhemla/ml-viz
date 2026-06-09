# Lesson-Improvement Loop Checklist

Branch: `feat/thorough-notebooks`. Per item: (a) make lesson easy-to-follow + comprehensive, rewrite hard examples; (b) ensure the matching notebook has the derivations + math worked in its coding cells. Then type-check + test + commit + push.

Mark `[x]` when both lesson + notebook done. Add notes inline.

## Foundations
- [x] linear-algebra/01-vectors-and-spaces — lesson: Projection derivation + dependent/independent worked example + rank callout. notebook: +projection-derivation cell (residual ⟂ a) +linear-independence/rank/solve cell.
- [x] linear-algebra/02-matrices-and-transformations — lesson: worked RS matmul example + determinant subsection (area scaling, det=0⇒singular). notebook: determinant-as-area cell (ad-bc vs shoelace area vs np.det).
- [ ] linear-algebra/03-eigenvalues-and-eigenvectors
- [ ] calculus-for-ml/01-derivatives-and-gradients
- [ ] calculus-for-ml/02-chain-rule-and-backpropagation
- [ ] calculus-for-ml/03-multivariable-optimization
- [ ] probability-statistics/01-probability-distributions
- [ ] probability-statistics/02-maximum-likelihood-estimation
- [ ] probability-statistics/03-bayesian-inference

## Supervised — core
- [ ] neural-networks/01-what-is-a-neuron
- [ ] neural-networks/02-gradient-descent
- [ ] linear-regression/01-linear-regression
- [ ] linear-regression/02-logistic-regression
- [ ] knn-decision-trees/01-knn
- [ ] knn-decision-trees/02-decision-trees

## Unsupervised
- [ ] clustering/01-k-means
- [ ] clustering/02-hierarchical-and-dbscan
- [ ] pca-dimensionality/01-pca
- [ ] pca-dimensionality/02-t-sne-and-umap
- [ ] probabilistic-models/01-gaussian-mixture-models
- [ ] probabilistic-models/02-em-algorithm

## Supervised — intermediate
- [ ] svm/01-maximum-margin
- [ ] svm/02-kernel-trick
- [ ] ensemble-methods/01-bagging-and-random-forests
- [ ] ensemble-methods/02-boosting

## Deep learning
- [ ] cnns/01-convolution-operation
- [ ] cnns/02-pooling-and-architectures
- [ ] cnns/03-transfer-learning
- [ ] rnns/01-recurrent-neural-networks
- [ ] rnns/02-bptt-and-vanishing-gradient
- [ ] rnns/03-lstm-and-gru
- [ ] transformers/01-self-attention
- [ ] transformers/02-multi-head-and-positional
- [ ] transformers/03-transformer-architecture

## Generative
- [ ] generative-models/01-what-are-generative-models
- [ ] generative-models/02-autoencoders
- [ ] generative-models/03-variational-autoencoders
- [ ] generative-models/04-generative-adversarial-networks
- [ ] generative-models/05-diffusion-models

## Probabilistic / sequence
- [ ] graphical-models/01-bayesian-networks
- [ ] graphical-models/02-markov-random-fields
- [ ] graphical-models/03-hidden-markov-models

## Reinforcement learning
- [ ] reinforcement-learning/01-markov-decision-processes
- [ ] reinforcement-learning/02-q-learning
- [ ] reinforcement-learning/03-deep-q-networks
- [ ] reinforcement-learning/04-policy-gradient

## Loop notes
- Loop cron id: fd7302ae (every 30m).
- Convention: pure-SVG viz already wired in 20 lessons; do NOT add new viz here — focus on prose clarity + notebook math.
- Verify gate before commit: `npm run type-check` and `npm run test` must pass.
