# Lesson-Improvement Loop Checklist

Branch: `feat/thorough-notebooks`. Per item: (a) make lesson easy-to-follow + comprehensive, rewrite hard examples; (b) ensure the matching notebook has the derivations + math worked in its coding cells. Then type-check + test + commit + push.

Mark `[x]` when both lesson + notebook done. Add notes inline.

## Foundations
- [x] linear-algebra/01-vectors-and-spaces — lesson: Projection derivation + dependent/independent worked example + rank callout. notebook: +projection-derivation cell (residual ⟂ a) +linear-independence/rank/solve cell.
- [x] linear-algebra/02-matrices-and-transformations — lesson: worked RS matmul example + determinant subsection (area scaling, det=0⇒singular). notebook: determinant-as-area cell (ad-bc vs shoelace area vs np.det).
- [x] linear-algebra/03-eigenvalues-and-eigenvectors — lesson: full (A−λI)v=0 nullspace algebra for both eigenvectors. notebook: by-hand characteristic poly (λ²−trλ+det) + nullspace eigvec + trace/det identity checks.
- [x] calculus-for-ml/01-derivatives-and-gradients — lesson: full σ′=σ(1−σ) chain-rule derivation. notebook: FIXED Py<3.12 f-string SyntaxError in grad table (nested quotes→.format); added sigmoid-derivative derive+verify cell. Added per-cell AST-parse to verify routine.
- [x] calculus-for-ml/02-chain-rule-and-backpropagation — lesson: worked numeric backward pass L=(wx-y)² (w=2,x=3,y=5) every upstream×local factor; MLP BCE+sigmoid ∂L/∂z₂=ŷ-y collapse. notebook: by-hand backprop + finite-diff check all 4 params. (commit 72f2bd9, via sub-agent)
- [x] calculus-for-ml/03-multivariable-optimization — lesson: running example f=x²+xy+y²−3x: critical pt (2,−1), Hessian, eigenvalue classify, 2nd-order Taylor in eigenbasis, Newton 1-step derived, convexity test, η<2/λmax divergence. notebook: finite-diff Hessian check, Newton vs GD step, convexity eig test. (sub-agent)
- [x] probability-statistics/01-probability-distributions — lesson: PMF vs PDF (density>1), Var shortcut, Bernoulli+Gaussian E/Var derived, Gaussian normalization via polar trick, likelihood→ML. notebook: empirical E/Var vs closed form, ∫PDF=1 check, Bernoulli MLE. (sub-agent)
- [x] probability-statistics/02-maximum-likelihood-estimation — lesson: log-lik, Gaussian μ&σ² MLE derived step-by-step, Bernoulli p̂=k/n, MLE=NLL=cross-entropy. notebook: grid search vs closed form, logistic regression by hand-coded GD. (sub-agent)
- [x] probability-statistics/03-bayesian-inference — lesson: disease-test posterior numeric, Beta-Bernoulli conjugate update derived end-to-end, MAP vs MLE worked, L2=Gaussian prior / L1=Laplace. notebook: medical test, prior→posterior overlay, sequential concentration, MAP=ridge. (sub-agent)

## Supervised — core
- [x] neural-networks/01-what-is-a-neuron — lesson: worked forward pass w=[2,−1,0.5] b=1 x=[3,2,4] term-by-term dot, z=7 thru ReLU/sigmoid/tanh, ∂z/∂wᵢ=xᵢ change-one-weight. notebook: matching forward pass, change-weight demo. (sub-agent)
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
