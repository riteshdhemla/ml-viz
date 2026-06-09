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
- [x] neural-networks/02-gradient-descent — lesson: MSE line-fit ∂L/∂w,∂L/∂b derived, 2 iters by hand (loss 27.67→0.33→0.005), η table (0.001/0.1/0.5), batch/SGD/momentum/Adam. notebook: GD from scratch, loss+param-path, η compare. (sub-agent)
- [x] linear-regression/01-linear-regression — lesson: normal eqn derived from ∇MSE=0, by-hand LSQ fit (w*=[0.333,1.5]), residuals/R²=0.964, Ridge closed form. notebook: FIXED invalid `def lasso.coordinate_descent`; closed-form vs GD, residual plot, R². (sub-agent)
- [x] linear-regression/02-logistic-regression — lesson: log-odds link, σ'=σ(1-σ), BCE from MLE, gradient collapse to (1/n)Xᵀ(σ(Xw)−y) step-by-step, boundary geometry, tiny numeric step. notebook: from-scratch GD, decision boundary, loss curve. (sub-agent)
- [x] knn-decision-trees/01-knn — lesson: Minkowski metrics worked (Manh7/Eucl5/p3≈4.5/Cheb4), query (3,4) full vote table (k=3 Red→k=5 Blue flip), bias-variance k, curse-of-dim ratio table. notebook: KNN from scratch classifies (3,4), boundary, k-panels. (sub-agent)
- [x] knn-decision-trees/02-decision-trees — lesson: 10-row loan dataset, root Gini 0.5/Entropy 1.0, split Age≤31.5 worked (gain 0.333/infogain 0.61), full threshold-scan table, pruning. notebook: FIXED undefined-ref cell; gini/entropy/split_score, best-split scan, impurity plots. (sub-agent)

## Unsupervised
- [x] clustering/01-k-means — lesson: FIXED worked-example tie bug (point (3,4) was equidistant from both init centroids); new init μ2=(3.5,5), full squared-dist table, J 8.75→7.46 decrease shown; added ∂J/∂μ=0 ⇒ mean derivation ("why update to the mean"). notebook: +mean-minimizes derivation cell, +by-hand worked example (dist table, J monotone decrease, 2000-grid check mean is optimal, convergence check).
- [x] clustering/02-hierarchical-and-dbscan — lesson: hierarchical worked ex now has full A/B/C/D distance matrix + explicit single(8.49)/complete(11.31)/average(9.90) final-merge heights (old "9.9" was unexplained average); DBSCAN worked ex fixed (added missing (2,2) neighbor) + warning callout that sklearn min_samples counts the point itself + neighbor-count table. notebook: +DBSCAN by-hand core/border/noise vs sklearn cross-check, +hierarchical by-hand dist-matrix + per-linkage height vs scipy linkage.
- [x] pca-dimensionality/01-pca — lesson: added the core Lagrange derivation (max vᵀCv s.t. ‖v‖=1 ⇒ Cv=λv, captured variance=λ ⇒ PC1=top eigenvector); replaced synthetic-only "worked example" with by-hand 4-point example: covariance [[3.33,2.67],[2.67,3.33]], char poly λ²−6.667λ+4=0 ⇒ λ=6.0/0.667, eigvecs (1,1)/(1,-1), 90% variance on PC1. notebook: +by-hand cell (char-poly eigenvalues, projected-variance==λ check, sklearn cross-check).
- [x] pca-dimensionality/02-t-sne-and-umap — lesson: added the actual similarity equations (Gaussian p_{j|i}, symmetrized p_ij, Student-t q_ij, KL gradient force law); reframed perplexity as 2^H(P_i) = effective neighbor count with worked mini-example (uniform-4→perp 4; peaked→1.18). notebook: +runnable cell binary-searching σ to hit target perplexity (t-SNE's exact procedure) + verifies perplexity=2^H identities.
- [x] probabilistic-models/01-gaussian-mixture-models — lesson: +by-hand responsibility worked example (x=2, N(0,1)/N(5,1) → densities 0.054/0.00443 → γ=[0.924,0.076] via Bayes; midpoint splits 50/50); +M-step weighted-update formulas (Nk, μk, Σk, πk) showing GMM = soft K-Means (γ replaces 0/1). notebook: +responsibility-by-hand cell verifying γ=[0.924,0.076] + responsibility-weighted-mean M-step demo.
- [x] probabilistic-models/02-em-algorithm — lesson: replaced thin "convergence guarantee" with full ELBO derivation (Jensen → log p = ELBO + KL(q‖posterior); E-step makes bound tight, M-step maximizes it → monotonic non-decrease proven by chaining ≥/≥/=); +by-hand one-iteration worked example X={1,2,4,5}: γ table (0.855/0.145…), M-step μ→(2.08,3.92) σ→1.286, LL −7.514→−7.390. notebook: +one-EM-iteration cell verifying γ + LL rise.

## Supervised — intermediate
- [x] svm/01-maximum-margin — lesson: +derivation of margin=2/‖w‖ (signed dist (wᵀx+b)/‖w‖, rescale SVs to ±1 ⇒ half-width 1/‖w‖); FIXED broken worked example (old class−1 {(0,0),(1,0)} made (1,0) the true SV not (0,0), and w=[1,1]/b=−1.5 wasn't tight at ±1). New clean 6-pt example on y=x: SVs (2,2)&(0,0), solve 4a+b=1/b=−1 ⇒ w=(0.5,0.5),b=−1, margin=2√2=2.83=SV gap. notebook: +by-hand solve cell (margin eqns, y·f=1 at SVs, sklearn cross-check).
- [x] svm/02-kernel-trick — lesson: added algebraic expansion proving (xᵀz+1)²=φ(x)ᵀφ(z) (shows where the √2 factors come from); +numeric worked example x=(1,2),z=(3,-1): kernel=4=φ·φ=9+4-12+6-4+1; +Mercer-condition callout (valid kernel ⇔ PSD Gram; sigmoid fails). notebook: +Mercer PSD Gram-matrix check across linear/poly/rbf/sigmoid (sigmoid min-eig<0).
- [x] ensemble-methods/01-bagging-and-random-forests — lesson: +derivation of ~37% OOB ((1-1/n)^n→1/e=0.368; n=100→0.366); +correlated-average variance formula Var=ρσ²+(1-ρ)/B σ² explaining WHY RF decorrelates (more trees kill (1-ρ)/B; only lower ρ touches the ρσ² floor). notebook: +simulation cell verifying OOB fraction (closed vs empirical) AND variance formula (ρ=0.5/0.1, B=1/10/1000 vs sim).
- [x] ensemble-methods/02-boosting — lesson: derived α=½ln((1−ε)/ε) as minimizer of exp loss (1−ε)e^−α+εe^α; +worked one-round AdaBoost (10 pts, ε=0.2→α=0.693, reweight correct×0.5/wrong×2, normalize→0.0625/0.25, misclassified now hold exactly 0.5 weight = general identity). notebook: +one-round-by-hand cell verifying α, reweight, and the 0.5-weight identity.

## Deep learning
- [x] cnns/01-convolution-operation — lesson: FIXED param-count contradiction (callout said 1728, code said 1792 — missing 64 biases; now C_out(C_in·f²+1)=64·28=1792 broken out); +output-size derivation (count valid left-edge positions) + worked table (5→3, 7/p1/s2→4, 32 same, 28/f5→24); +varied worked example (4×4 input + Sobel → [[-4,-4],[4,-4]]) since checkerboard gave all-0; fixed scipy convolve2d to flip K (true cross-correlation). notebook: +by-hand 4×4 conv cell (every window printed, matches [[-4,-4],[4,-4]]) + param weights/bias breakdown. [scouted via read-only Explore sub-agent; numbers re-verified in pure-python]
- [x] cnns/02-pooling-and-architectures — lesson: fixed output-size caption typo (window/padding both "p"→f); +4×4 max/avg pool worked example (Max [[6,4],[7,8]], Avg [[3.75,2.25],[2.5,4.0]]); +pool size table with n=28 column; QUANTIFIED the "two 3×3 = one 5×5" VGG claim — derived RF=1+L(f-1) (two 3×3→5) + param compare 25C² vs 18C² (28% fewer, C=64: 102400 vs 73728). notebook: +RF-derivation + param-tradeoff cell. [read-only Explore sub-agent scouted; numbers re-verified pure-python]
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
- Loop cron id: b826bb26 (hourly at :13, session-only, 7-day expiry). [prior: fd7302ae 30m — dead, session-bound]
- Convention: pure-SVG viz already wired in 20 lessons; do NOT add new viz here — focus on prose clarity + notebook math.
- Verify gate before commit: `npm run type-check` and `npm run test` must pass.
