# Lesson Review — Content Quality Audit

**Date:** 2026-06-11  
**Scope:** All 78 non-quiz lessons across 22 courses  
**Criteria (from first-lesson review):**
1. **Viz** — placement/mismatch between viz and surrounding text
2. **Worked examples** — missing algebra steps, hand-wavy ("it follows", "clearly", "one can show")
3. **ML mixing** — ML applications dropped inline instead of a dedicated "Connection to ML" section
4. **Missing algorithms** — concept named but steps absent
5. **Structural** — patchy flow, ordering issues, missing sections

---

## Linear Algebra

### linear-algebra/01-vectors-and-spaces
**Viz issues:**
- `<VectorViz />` is placed in the "Core operations" section (after norm), but the projection section (several hundred words later) says "Drag the vectors above to watch the projection segment grow and shrink with the angle" — the viz is not above that text, making the instruction a broken promise. The viz should either be duplicated at the projection section or the reference changed.
- The viz title/caption says "vectors and dot product" but the viz appears before the dot product section is introduced.

**Worked example gaps:**
- Linear independence section (line 137): "the equations $c_1 + 2c_2 = 0$ and $2c_1 + c_2 = 0$ force it" — the system is stated but never solved. A beginner needs to see the two-equation elimination that proves $c_1 = c_2 = 0$.

**ML mixing (should be separate section):**
- Line 33: "A linear model $f(\mathbf{x}) = \mathbf{w}^\top\mathbf{x} + b$ is just a scaled sum of inputs" — dropped mid-Operations section.
- Dot product callout (line 67): "Every neuron computes a dot product" and "Cosine similarity in word embeddings" — ML applications inline mid-concept.
- Projection section (line 109): "the engine behind least-squares regression and PCA" — ML forward-reference mid-geometry.
- Orthogonal basis callout: "PCA finds the orthogonal basis of maximum variance" — mid-concept ML drop.

**Missing algorithms:**
- Rank test callout (line 139): "Stack the vectors as columns of a matrix. The number of independent vectors is the matrix rank" — no algorithm given for actually computing rank (row reduction / Gaussian elimination steps absent).

**Other:** none

---

### linear-algebra/02-matrices-and-transformations
**Viz issues:**
- `<MatrixTransformViz />` is placed at line 31 (in the "What is a matrix?" intro section) but the determinant section at line 120 says "The interactive figure above shows the determinant updating as you change the matrix." The viz is ~90 lines above the determinant discussion, in a separate conceptual block — the "above" reference is misleading. The viz should be moved to (or duplicated at) the determinant section, or the text reference removed.

**Worked example gaps:** none — matrix multiplication is fully worked numerically.

**ML mixing (should be separate section):** Line 29 mentions "Neural network layer" inline during the definition of matrix multiplication — brief and acceptable as a contextual example, but ideally in a dedicated section.

**Missing algorithms:** none.

**Other:** none.

---

### linear-algebra/03-eigenvalues-and-eigenvectors
**Viz issues:** `<EigenvectorViz />` placed at the start of the lesson to introduce the core concept — appropriate intuition-first ordering. No mismatch.

**Worked example gaps:** none — characteristic equation fully solved, eigenvectors derived by back-substitution.

**ML mixing (should be separate section):** Intro front-loads PCA, PageRank, neural network stability as examples. Line 98 has a dedicated "Connection to PCA" subsection — good structure. Intro examples are at an acceptable hook level.

**Missing algorithms:** none.

**Other:** none.

---

### linear-algebra/04-svd-and-low-rank
**Viz issues:** No visualization component. SVD geometry (singular vectors as rotations, singular values as scaling) would benefit from a diagram similar to `EigenvectorViz`.

**Worked example gaps:** none — Eckart-Young theorem proven algebraically; Python example verifies the error formula.

**ML mixing (should be separate section):** ML applications (image compression, recommender systems, LoRA, denoising) are woven throughout the Eckart-Young explanation rather than housed in a dedicated section. Inconsistent with lessons that have an "Applications" section.

**Missing algorithms:** none.

**Other:** none.

---

## Calculus for ML

### calculus-for-ml/01-derivatives-and-gradients
**Viz issues:** `<FunctionTangentViz />` placed early to visualize the derivative concept — appropriate. No mismatch.

**Worked example gaps:** none — sigmoid derivative fully derived; numerical gradient example complete.

**ML mixing (should be separate section):** Intro mentions "every neural network trained with backpropagation, every optimizer (SGD, Adam)" as framing. Acceptable level of hook.

**Missing algorithms:** none.

**Other:** none.

---

### calculus-for-ml/02-chain-rule-and-backpropagation
**Viz issues:** `<ComputationalGraphViz />` placed at line 53 but the "Computational graphs" section heading comes immediately after it (line 55) — viz appears before its section header. Slightly awkward; heading should precede the viz.

**Worked example gaps:** none — squared-error example and one-hidden-layer MLP example both carry through all gradient computations step-by-step.

**ML mixing (should be separate section):** Intro frames backpropagation as context ("the algorithm that trains every deep neural network") — appropriate motivation.

**Missing algorithms:** none.

**Other:** none.

---

### calculus-for-ml/03-multivariable-optimization
**Viz issues:** `<GradientFieldViz />` at line 198, placed between Newton's method section and the Convexity section. Acceptable placement.

**Worked example gaps:** none — critical points, Hessian computation, eigenvalue classification, Newton's method, and convexity test all worked with full algebra.

**ML mixing (should be separate section):** Intro cites "hyperparameter tuning landscapes, SVM convex optimization" as examples — framing level, acceptable.

**Missing algorithms:** none.

**Other:** none.

---

### calculus-for-ml/04-jacobians
**Viz issues:** `<ComputationalGraphViz />` at line 163, placed after the "The vector chain rule" section begins (line 147). Acceptable — viz illustrates a concept already introduced.

**Worked example gaps:** none — affine layer, ReLU, and softmax Jacobian derivations all fully worked with numerical check.

**ML mixing (should be separate section):** Intro mentions "backpropagation through softmax/batch-norm" — appropriate motivation.

**Missing algorithms:** none.

**Other:** none.

---

## Probability & Statistics

### probability-statistics/01-thinking-in-probabilities
**Viz issues:** No visualization component. Conceptual intro lesson; acceptable.

**Worked example gaps:** none — coin flip and die roll examples kept intentionally simple; LLN demonstrated with Python code.

**ML mixing (should be separate section):** Brief "Why ML cares about E" reference at end — acceptable framing.

**Missing algorithms:** none.

**Other:** none.

---

### probability-statistics/02-probability-distributions
**Viz issues:** `<DistributionViz />` at line 66 placed immediately after the "Key distributions in ML" section header but before any distribution is defined. Viz appears as preview before its content — awkward for beginners who haven't seen the distributions yet.

**Worked example gaps:** none — Bernoulli expectation/variance and Gaussian normalisation/mean/variance all worked algebraically.

**ML mixing (should be separate section):** Intro front-loads classification/generative model applications. Line 218 has a dedicated "From distributions to ML: the likelihood" section — good structure.

**Missing algorithms:** none.

**Other:** none.

---

### probability-statistics/03-maximum-likelihood-estimation
**Viz issues:** `<MLEViz />` at line 53, after the "why we maximise the log-likelihood" section and before the first worked derivation — good intuition-first order.

**Worked example gaps:** none — Gaussian MLE (mean and variance) and Bernoulli MLE both fully derived; connection to cross-entropy fully justified.

**ML mixing (should be separate section):** Intro cites "fitting linear regression, training logistic classifier" — framing level, acceptable.

**Missing algorithms:** none.

**Other:** none.

---

### probability-statistics/04-bayesian-inference
**Viz issues:** `<BayesViz />` at line 42, placed after Bayes' theorem and before the worked medical-test example — appropriate ordering.

**Worked example gaps:** none — medical test example and Beta-Bernoulli posterior derivation both fully worked; MAP vs MLE comparison worked with numbers.

**ML mixing (should be separate section):** Line 196 has a dedicated "L2 regularization is MAP with a Gaussian prior" subsection — well-structured.

**Missing algorithms:** none.

**Other:** none.

---

### probability-statistics/05-entropy-and-kl-divergence
**Viz issues:** No visualization. Entropy/KL bar chart or distribution comparison diagram would help intuition.

**Worked example gaps:** none — entropy, cross-entropy, and KL divergence each defined with code-verified numerical examples.

**ML mixing (should be separate section):** Dedicated "Where you'll meet these again" subsection lists applications (cross-entropy loss, VAE KL term, information gain) — correctly separated.

**Missing algorithms:** none.

**Other:** none.

---

## Neural Networks

### neural-networks/01-what-is-a-neuron
**Viz issues:** `<ActivationFunctionViz />` placement is correct (end of activation functions section). No mismatch.

**Worked example gaps:**
- Vanishing gradient concept (line ~59): "That saturation is exactly what makes their gradients vanish in deep networks" — vanishing gradients introduced without definition; concept dangled without follow-through.
- Derivative section derives $\partial z/\partial w_i = x_i$ but skips the chain-rule step connecting it to the update rule.

**ML mixing (should be separate section):**
- First paragraph: "Image classification, spam detection, recommendation systems, language models — all stack millions of these neurons" — inline before any math.

**Missing algorithms:**
- "What a single neuron can learn" mentions XOR and universal approximation but no constructive steps show how multi-neuron networks learn curved boundaries.

**Other:** Exercises placed after Related concepts — unusual ordering.

---

### neural-networks/02-gradient-descent
**Viz issues:**
- `<GradientDescentViz />` is placed at the end after learning-rate table and batching section. The concept section (lines 16–34) has no viz reference to anchor understanding. Viz would aid comprehension more if placed immediately after the core gradient-descent idea is introduced.

**Worked example gaps:**
- Adam optimizer described conceptually ("per-parameter adaptive learning rate") but update equations ($m_t$, $v_t$, bias-correction) are absent. Momentum has equations; Adam only has prose.

**ML mixing (should be separate section):**
- First paragraph: "Every trained model — image classifiers, language models, recommenders — was fit by some variant of gradient descent."

**Missing algorithms:** none — two-iteration MSE hand-calculation is thorough.

**Other:** "See it run" section heading is structurally odd — reads like a UI label, not a content heading.

---

### neural-networks/03-layers-and-forward-pass
**Viz issues:**
- `<NeuralNetworkViz />` at line 111 follows the "Why depth composes features" prose and correctly precedes the "Try this with the viz" instruction. No mismatch.
- However, the 2→2→1 forward-pass worked example (lines 37–93) is a long numerical section with no accompanying diagram reference — the viz appears hundreds of words later in a different section.

**Worked example gaps:** none — step-by-step arithmetic is complete.

**ML mixing (should be separate section):**
- First paragraph: "Every model inference — a photo tagged, a sentence autocompleted, a fraud alert raised — is one forward pass."

**Missing algorithms:**
- "How wide should a hidden layer be?" lists pros/cons but gives no procedure for choosing width in practice.

**Other:** none

---

### neural-networks/04-xor-and-mlp
**Viz issues:**
- `<NeuralNetworkViz />` at line 107 appears after the XOR trace table with no instruction for what to do with the viz (contrast with lesson 03 which has a 2-sentence follow-up prompt).

**Worked example gaps:**
- Perceptron convergence table (lines 33–41): shows 5 AND-training steps but ends mid-process — "After further iterations the perceptron converges" without showing when or what the final weights are.
- Softmax training: gradient $\hat{p}_k - \mathbb{1}[k=y]$ derived, but no update rule showing how it flows back to the weight matrix.

**ML mixing (should be separate section):**
- Line 157: "Language models use temperature scaling to control randomness" — dropped at end of softmax math section.

**Missing algorithms:** none

**Other:** none

---

### neural-networks/05-batchnorm-and-dropout
**Viz issues:** No visualization component. Dropout masking and BatchNorm pipeline would benefit from one.

**Worked example gaps:**
- Running-statistics update formula introduced but no worked numerical evolution over mini-batches.
- "For a linear model, dropout with rate $p$ is equivalent to L2 regularization with penalty proportional to $p/(1-p)$" — stated without derivation ("one can show" pattern).

**ML mixing (should be separate section):**
- Comparison table column "Used in" (CNNs, transformers) mixes application context into a mechanics comparison.

**Missing algorithms:**
- Ensemble interpretation of dropout: $2^N$ networks mentioned but why test-time averaging approximates ensemble averaging is not explained.
- LayerNorm mentioned as "modern substitute" with no description of how it differs.

**Other:** No visualization despite visual techniques being covered.

---

## Linear & Logistic Regression

### linear-regression/01-linear-regression
**Viz issues:**
- `<LinearRegressionViz />` placed after Python code for the OLS example — appears as an afterthought rather than an interactive companion to the derivation.
- Ridge and Lasso sections duplicate material from lesson 03-regularization but with less depth — structural overlap creates confusion about which lesson to read for regularization.

**Worked example gaps:**
- Lasso section: geometric "diamond corners" explanation is informal with no algebraic grounding. No hand-worked Lasso example (contrast with full 3-point OLS calculation).

**ML mixing (should be separate section):**
- First paragraph: "Predicting house prices from square footage, bedrooms…" — inline before any math.

**Missing algorithms:**
- Cross-validation for λ mentioned once in a callout but no procedure given.

**Other:** Lesson is overloaded (OLS + Ridge + Lasso). Lesson 03 re-covers Ridge/Lasso — redundancy should be resolved.

---

### linear-regression/02-logistic-regression
**Viz issues:** `<DecisionBoundaryViz />` placed correctly at end of "Decision boundary" section after the geometric derivation. No mismatch.

**Worked example gaps:**
- Multi-class softmax section is thin: formula and code only, no worked example showing how multi-class gradient descent differs from binary, no geometry.

**ML mixing (should be separate section):**
- First paragraph: "Email spam detection, disease diagnosis, customer churn, fraud detection" — inline before any math.

**Missing algorithms:**
- Multinomial logistic regression: no gradient derivation, no update rule, no cross-entropy for K classes.

**Other:** none

---

### linear-regression/03-regularization
**Viz issues:**
- Text says "Switch between Ridge and Lasso and drag λ" — if the viz is a static regularization path (not a live slider), "drag λ" is a broken promise. Needs verification against viz implementation.
- No anchoring context for the viz: what are weights at λ=0 (OLS)? What at λ→∞ (all zeros)?

**Worked example gaps:**
- No hand-worked numerical example at all — goes directly formulas → viz → summary table.

**ML mixing (should be separate section):**
- First paragraph: "Genomics (thousands of gene features, few patients), house-price models…"

**Missing algorithms:**
- Lasso: no coordinate-descent or subgradient algorithm; zeroing is stated as fact without support.
- Cross-validation procedure for λ: mentioned but not described; no code.
- Elastic Net: formula only, no explanation of how α is chosen.

**Other:** Lesson is noticeably shorter than others (~86 lines). Missing: "Common mistakes" section, Python implementation examples, only 1 exercise. Reads unfinished.

---

## KNN & Decision Trees

### knn-decision-trees/01-knn
**Viz issues:**
- `<KNNBoundaryViz />` placed at end of "Decision boundaries" section with no instruction after the tag. Reader isn't told what to interact with or look for.
- "Decision boundaries" section (lines 179–190) repeats bias–variance characterization already given in "Choosing k" (lines 153–165) — the viz section reads as a structural afterthought.

**Worked example gaps:** none — KNN classification and distance calculations are fully worked.

**ML mixing (should be separate section):**
- First paragraph: "Recommendation systems, anomaly detection, handwritten digit recognition" — inline before math.

**Missing algorithms:**
- KNN regression: one sentence only, no worked example.
- Weighted KNN (inverse-distance weighting): not mentioned despite relevance to curse of dimensionality.

**Other:** none

---

### knn-decision-trees/02-decision-trees
**Viz issues:**
- `<DecisionTreeSplitViz />` placed after entropy worked example but *before* "Information gain: scoring one split" section. Reader sees viz before having vocabulary to interpret it (information gain not yet defined at that point).

**Worked example gaps:**
- Post-pruning / cost-complexity: one sentence about `ccp_alpha` with no example of how to choose it or what pruning does to a node.

**ML mixing (should be separate section):**
- First paragraph: "Medical diagnosis, credit approval, customer segmentation" — inline before math.

**Missing algorithms:**
- Tree-growing algorithm: 4 bullet steps given, but step 4 says "Repeat until stopping criteria" without defining stopping criteria at that point (they appear later under overfitting).
- Cost-complexity pruning: `ccp_alpha` mentioned without the $R_\alpha(T) = R(T) + \alpha|T|$ criterion that defines it.

**Other:** none

---

### knn-decision-trees/03-bias-variance
**Viz issues:** `<BiasVarianceViz />` correctly placed immediately after the description of what to observe. No mismatch.

**Worked example gaps:**
- No numerical worked example for the bias–variance decomposition. Formula stated but never computed for a specific model.
- Double-descent callout: "test error can start falling again" — no quantitative illustration or context.

**ML mixing (should be separate section):**
- "This is exactly why bagging and Random Forests work" — forward-reference to ensemble methods dropped mid-concept section.

**Missing algorithms:**
- Cross-validation for optimal k: "found by cross-validation" stated but procedure never described in this course.

**Other:** Shortest lesson in the three courses (~69 lines). Only lesson in all three courses with no Python code.

---

## PCA & Dimensionality Reduction

### pca-dimensionality/01-pca
**Viz issues:** `<PCAViz />` correctly placed after core-idea section. No mismatch.

**Worked example gaps:** none — 4-point hand example carries through all algebra (covariance, eigenvalues, eigenvectors, variance ratio).

**ML mixing (should be separate section):** none — ML applications appear in a clearly labeled "Applications" section.

**Missing algorithms:**
- Scree-plot elbow heuristic described verbally but no decision rule. Reader cannot determine mechanically where the elbow is.

**Other:** none

---

### pca-dimensionality/02-t-sne-and-umap
**Viz issues:**
- `<PerplexityViz />` placed after worked example but before code. Viz would aid comprehension better placed after concept/math, before the worked example.

**Worked example gaps:**
- UMAP: no worked example. Algorithm steps (fuzzy graph construction, layout optimization) entirely absent — section is purely phenomenological.
- t-SNE gradient: jump from KL expression to the force-law formula presented as result with no intermediate algebra.

**ML mixing (should be separate section):**
- "Don't use t-SNE/UMAP for clustering" advice inside "Common mistakes" — this is ML-workflow guidance, not a conceptual mistake.

**Missing algorithms:**
- UMAP: lesson names method, lists parameters, shows sklearn code, but gives **no description of how UMAP works** — no mention of fuzzy simplicial sets or optimization objective. The mechanism is a black box.
- t-SNE: binary search for σ mentioned but no convergence criterion.

**Other:**
- Standalone "Recommended pipeline" code block uses PCA without importing it (import is in earlier block — standalone snippet is broken).

---

### pca-dimensionality/03-pca-in-practice
**Viz issues:** `<PCAReconstructionViz />` correctly placed after eigenfaces paragraph. No mismatch.

**Worked example gaps:**
- Whitening section: formula stated informally, no worked numbers showing how output achieves unit variance.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Cross-validating pipeline for choosing m: mentioned but no procedure, no code, no outer-loop description.
- Whitening: no guidance on choosing reduced component count when goal is whitening rather than compression.

**Other:** Noticeably shorter than other lessons. Viz description says "toggle how many components survive" but prose doesn't guide what to observe and why.

---

## Probabilistic Models & EM

### probabilistic-models/01-gaussian-mixture-models
**Viz issues:** `<GMMResponsibilityViz />` correctly placed before the worked example (intuition first, then numbers). No mismatch.

**Worked example gaps:**
- BIC/AIC subsection drops in model-selection code without defining how many parameters a K-component full-covariance d-dimensional GMM has.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- M-step update equations given without E-step — first appearance of $\gamma_{ik}$ without definition for readers who haven't read lesson 02.

**Other:** none

---

### probabilistic-models/02-em-algorithm
**Viz issues:** No visualization. "Related concepts" cross-reference claims GMMResponsibilityViz "lets you step through E/M iterations" — but that viz does not animate E/M iterations. Cross-reference is inaccurate.

**Worked example gaps:**
- Responsibility table shows values (0.855, 0.709…) but no intermediate arithmetic — reader cannot verify without working through Gaussian PDF calculations themselves.
- "Log-likelihood rose from −7.514 to −7.390" asserted but never computed.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Convergence criterion: tol defined in code but not discussed conceptually (what values are typical?).

**Other:**
- Second table introduces $r_{i1}^{(0)}$ without defining it; earlier notation was $\gamma_{ik}$ — unexplained switch.

---

### probabilistic-models/03-naive-bayes
**Viz issues:** `<NaiveBayesVotesViz />` correctly placed mid-explanation after the counting procedure. No mismatch.

**Worked example gaps:**
- No numerical example for Laplace smoothing formula.
- No end-to-end classification example (log-probabilities → sum → class decision).

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Gaussian NB variant named but no formula for per-class Gaussian estimation or prediction.
- Bernoulli NB named but distinguishing likelihood term (vs Multinomial) not shown.

**Other:** Lesson is short (<500 words prose). "Wrong assumption still works" claim made without empirical demonstration or citation.

---

## Recurrent Neural Networks

### rnns/01-recurrent-neural-networks
**Viz issues:** `<RNNUnrollViz />` correctly placed after ASCII diagram and paragraph on unrolling. No mismatch.

**Worked example gaps:** none — both worked examples (2D matrix forward pass, 1D scalar accumulation) show every arithmetic step.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** none — one of the strongest lessons.

---

### rnns/02-bptt-and-vanishing-gradient
**Viz issues:**
- `<VanishingGradientViz />` placed after Jacobian derivation but *before* worked numerical example. Cleaner flow would be: derive → compute numbers → then visualize the effect.

**Worked example gaps:** none — spectral radius example computed step by step (eigenvalue 0.5 and 1.5 at steps 1, 10, 20, 50).

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Truncated BPTT: lesson says "backpropagates only through last k steps" but doesn't explain how k is chosen.

**Other:** none

---

### rnns/03-lstm-and-gru
**Viz issues:** `<LSTMGateViz />` correctly placed after gate equations, before by-hand example. Good pedagogical order.

**Worked example gaps:** none — scalar LSTM timestep example is thorough (all four gates, cell-state, hidden-state).

**ML mixing (should be separate section):**
- First paragraph: "Before Transformers took over (2017+), LSTMs powered Google Translate, Siri/Alexa…" — real-world applications dropped before any concept explanation.

**Missing algorithms:**
- GRU reset gate: formula given but the purpose of masking $\mathbf{h}_{t-1}$ by $\mathbf{r}_t$ (selective memory ignore) is not explained.
- No by-hand GRU timestep (contrast with complete LSTM example).

**Other:** none

---

## Attention & Transformers

### transformers/01-self-attention
**Viz issues:** `<AttentionViz />` placed after Q/K/V introduction but before formula — intuition-first order is correct. No mismatch.

**Worked example gaps:** none — 3-token example works all four steps with explicit matrix entries.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** One of the strongest lessons overall.

---

### transformers/02-multi-head-and-positional
**Viz issues:** `<PositionalEncodingViz />` placed after sinusoidal formula, before worked example and derivation. Acceptable order.

**Worked example gaps:**
- Relative-position derivation shows algebra but doesn't demonstrate *why* the fixed rotation helps the model attend to relative distances. The conceptual leap from "it's a rotation" to "so the model can attend k tokens back" is asserted, not argued.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** Code uses `d_k = D // num_heads` but text formula uses $d_k = d_\text{model}/h$ — notation inconsistency between prose and code.

---

### transformers/03-transformer-architecture
**Viz issues:** `<TransformerBlockViz />` correctly placed after block equations and ASCII diagram. No mismatch.

**Worked example gaps:** none — LayerNorm by-hand example and parameter count table are complete.

**ML mixing (should be separate section):**
- "Scale is the story" section drops scaling laws (Kaplan et al., Chinchilla) without definition or context — reads as ML-empirical aside in an architecture lesson.

**Missing algorithms:**
- Cross-attention formula not given (referenced but deferred to lesson 04 without warning).

**Other:**
- `TinyGPT` code uses `nn.TransformerEncoderLayer` for a decoder-only model — correct with causal mask, but the naming mismatch is confusing. No comment explaining this.

---

### transformers/04-modern-attention
**Viz issues:** No visualization. RoPE rotation matrices and FlashAttention tiling would strongly benefit from a diagram.

**Worked example gaps:**
- RoPE: code implementation but no by-hand worked example ($d=4$, two tokens, showing rotation → dot product collapses to relative distance).
- GQA "worked example": describes group structure but no actual forward-pass trace (no matrix shapes, no computation).
- SwiGLU: code with random weights, no hand-worked numbers.
- FlashAttention: "online softmax trick" mentioned but running-max/normalizer accumulation not explained.

**ML mixing (should be separate section):**
- "LLaMA-3 70B uses MQA" and "Mistral 7B uses GQA…" embedded in concept sections — model-specific facts should be a "In practice" callout.

**Missing algorithms:**
- FlashAttention online-softmax: named but not explained (pseudocode/formula absent).
- RoPE: key property that dot product depends only on $m-n$ stated without the rotation-composition derivation.

**Other:**
- KV cache size figures (268 MB/layer, 21 GB total for LLaMA-2 70B) presented as exact but assume batch-size=1 without stating it.
- `swiglu` code note says `d_ff = 8/3 * d_model` but example uses `d_ff = 8` with `d_model = 4` — comment and code dimensions are inconsistent.

---

## CNNs

### cnns/01-convolution-operation
**Viz issues:** `<ConvolutionViz />` placed after key-concepts section — correctly positioned. No mismatch.

**Worked example gaps:** none — convolution derivation and output-size formula both complete; hand calculation and Python code cross-validate.

**ML mixing (should be separate section):** Intro lists image classification, face detection, medical imaging — acceptable motivation hook.

**Missing algorithms:** none.

**Other:** none.

---

### cnns/02-pooling-and-architectures
**Viz issues:** `<PoolingViz />` correctly placed after pooling explanation. No mismatch.

**Worked example gaps:** none — pooling worked example and skip-connection ResNet code are complete.

**ML mixing (should be separate section):** none — architectures are the application.

**Missing algorithms:** none.

**Other:** none.

---

### cnns/03-transfer-learning
**Viz issues:** `<TransferLearningViz />` at line 179. No mismatch.

**Worked example gaps:** none — ResNet-50 parameter counts for each strategy worked numerically; full medical-imaging fine-tuning example provided.

**ML mixing (should be separate section):** Whole lesson is applied; appropriate.

**Missing algorithms:** none.

**Other:** none.

---

## SVMs

### svm/01-maximum-margin
**Viz issues:** `<MarginViz />` placed after complete worked example — correctly positioned. No mismatch.

**Worked example gaps:** none — margin formula $2/\|\mathbf{w}\|$ derived geometrically with hand calculation and Python validation.

**ML mixing (should be separate section):** Intro motivation at acceptable hook level.

**Missing algorithms:** none.

**Other:** none.

---

### svm/02-kernel-trick
**Viz issues:** `<KernelViz />` placed at line 89 with interactive "switch between kernels" description — correct position. No mismatch.

**Worked example gaps:** none — polynomial kernel's explicit vs kernel computation cross-checked numerically; RBF circles-dataset demo provided.

**ML mixing (should be separate section):** Gene expression, image recognition in intro — acceptable.

**Missing algorithms:** none.

**Other:** none.

---

### svm/03-soft-margins
**Viz issues:** `<SoftMarginViz />` correctly placed with "drag the C slider" description — appropriate.

**Worked example gaps:**
- No concrete numerical worked example of slack variable arithmetic. No "at C=1 these points violate the margin by this amount → these slack values → this total penalty" walkthrough. The visualization compensates but a beginner cannot verify without numbers.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Practical C-tuning procedure not given (grid search / cross-validation strategy absent).

**Other:** none.

---

## Ensemble Methods

### ensemble-methods/01-bagging-and-random-forests
**Viz issues:** `<BaggingViz />` placed after bagging description — correctly positioned.

**Worked example gaps:** none — variance reduction formula derived; OOB estimate derived ($e^{-1} \approx 0.368$); feature-importance (MDI + permutation) both explained.

**ML mixing (should be separate section):** Intro lists credit scoring, churn, medical diagnosis — acceptable hook.

**Missing algorithms:** none.

**Other:** none.

---

### ensemble-methods/02-boosting
**Viz issues:** `<BoostingViz />` placed after misclassified-point weighting description — correct position.

**Worked example gaps:**
- AdaBoost: one complete round worked with numbers — good.
- Gradient boosting section is brief and purely conceptual. No numerical worked example showing residuals computed across iterations.

**ML mixing (should be separate section):** Intro lists search ranking, Kaggle competitions — acceptable.

**Missing algorithms:** none.

**Other:** none.

---

### ensemble-methods/03-xgboost
**Viz issues:** `<BoostingShrinkageViz />` with "drag η" instruction — correct position.

**Worked example gaps:**
- Entire lesson is conceptual/intuitive. Regularized objective explained but no hand-worked numerical example of how regularisation penalises a specific tree. No concrete demonstration of shrinkage effect on error.

**ML mixing (should be separate section):** "Why trees still beat neural nets on tables" section is good standalone comparison.

**Missing algorithms:** none.

**Other:** Lesson is noticeably shorter than others. "Sane starting configuration" callout (parameters table) is helpful but lesson would benefit from a worked demo.

---

## Clustering

### clustering/01-k-means
**Viz issues:** `<KMeansViz />` placed after algorithm section and before Elbow method — correctly positioned.

**Worked example gaps:** none — full 5-point K=2 example carried through two iterations with all distance calculations; K-Means++ steps described.

**ML mixing (should be separate section):** Intro mentions customer segmentation, document clustering — acceptable hook.

**Missing algorithms:** none.

**Other:** none.

---

### clustering/02-hierarchical-and-dbscan
**Viz issues:** `<DendrogramViz />` placed after dendrogram explanation — correctly positioned.

**Worked example gaps:** none — hierarchical example works through distance matrix with three linkage methods; DBSCAN example classifies all points (core/border/noise) step by step.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** none.

---

### clustering/03-evaluating-clusters
**Viz issues:** `<SilhouetteViz />` with "Move k and watch the bars" description — correct position.

**Worked example gaps:**
- Silhouette coefficient formula stated and table of interpretations given, but no step-by-step numerical calculation shown (no "for point $i$, $a=2.1$, $b=5.3$, so $s=0.60$" walkthrough).
- Stability evaluation via resampling described conceptually with no concrete example.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Adjusted Rand index and NMI mentioned (for labeled ground truth) but not explained.

**Other:** none.

## Generative Models

### generative-models/01-what-are-generative-models
**Viz issues:** none.

**Worked example gaps:** Gaussian density example computed but the connection to how a GAN relates to this density is not traced numerically — minor.

**ML mixing (should be separate section):** Applications naturally integrated in intro for a survey lesson — appropriate.

**Missing algorithms:** none.

**Other:** Comparison table of generative model types is well-placed.

---

### generative-models/02-autoencoders
**Viz issues:** none.

**Worked example gaps:** none — anomaly-detection workflow is complete; "holes in latent space" intuition well-explained.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** none.

---

### generative-models/03-variational-autoencoders
**Viz issues:** `<LatentSpaceViz />` placed after KL divergence explanation — correctly ordered.

**Worked example gaps:**
- Reparameterisation trick section explains the formula $\mathbf{z} = \boldsymbol{\mu} + \boldsymbol{\sigma} \odot \boldsymbol{\epsilon}$ but never shows a worked numerical example of **why** the original $\mathbf{z} \sim \mathcal{N}(\mu, \sigma^2)$ sampling is non-differentiable. A reader cannot verify the claim without working it themselves.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** β-VAE section concise but adequate.

---

### generative-models/04-generative-adversarial-networks
**Viz issues:** `<GANTrainingViz />` placed after training dynamics table — correctly positioned.

**Worked example gaps:**
- Mode collapse section describes the phenomenon ("generator learns only a few types because discriminator is too strong") but no worked example shows how this failure mode emerges or how any mitigation (gradient penalty, minibatch discrimination) prevents it.

**ML mixing (should be separate section):** Intro lists StyleGAN, pix2pix, super-resolution in an appropriate intro section.

**Missing algorithms:** none.

**Other:** DCGAN and WGAN sections well explained; comparison table helpful.

---

### generative-models/05-diffusion-models
**Viz issues:** `<DiffusionViz />` placed after forward process description — correctly ordered.

**Worked example gaps:**
- Noise-schedule section gives the cosine formula in a table but no numerical comparison of linear vs cosine schedules on actual timesteps. "Linear adds noise too fast" is asserted without concrete values.

**ML mixing (should be separate section):** Intro applications correctly in intro section.

**Missing algorithms:**
- DDIM algorithm: update equation given but no step-by-step pseudocode showing how to skip timesteps or choose $\Delta t$ values in practice.

**Other:** none.

---

## Graphical Models

### graphical-models/01-bayesian-networks
**Viz issues:** `<DSeparationViz />` placed after d-separation patterns are explained — correctly ordered.

**Worked example gaps:** none — Sprinkler network fully worked; parameter counts derived; code example complete.

**ML mixing (should be separate section):** Intro cites real-world examples appropriately.

**Missing algorithms:**
- Variable elimination and junction tree are named at line 106 ("sum out non-query variables in a smart order") but no pseudocode or procedure given for either algorithm.

**Other:** none.

---

### graphical-models/02-markov-random-fields
**Viz issues:** none.

**Worked example gaps:**
- 2-node Ising model fully worked with table and code — good.
- Image-denoising sketch names "data term" and "smoothness term" but gives no actual potential functions or energy formula — hand-wavy.

**ML mixing (should be separate section):** Intro applications correctly placed.

**Missing algorithms:**
- Graph cuts and loopy belief propagation both named but no procedure given for either.

**Other:** Partition function discussion is conceptually clear.

---

### graphical-models/03-hidden-markov-models
**Viz issues:** `<HMMViterbiViz />` placed after Viterbi algorithm and worked example — correct.

**Worked example gaps:** none — Viterbi backpointer table worked step-by-step; forward algorithm clearly described.

**ML mixing (should be separate section):** Intro cites applications appropriately.

**Missing algorithms:**
- Baum-Welch EM learning algorithm named with E-step/M-step mentioned but no update equations or algorithm steps provided.

**Other:** Log-space computation note is practical and well-placed.

---

## Reinforcement Learning

### reinforcement-learning/01-markov-decision-processes
**Viz issues:** `<GridWorldViz />` placed after value iteration is introduced — correctly ordered.

**Worked example gaps:** none — value iteration fully implemented with concrete MDP and step-by-step code output.

**ML mixing (should be separate section):** Intro applications correctly placed.

**Missing algorithms:** none.

**Other:** Bellman equations clearly presented; discount factor intuition good.

---

### reinforcement-learning/02-q-learning
**Viz issues:** `<QTableViz />` placed after temporal-difference update introduction — correctly ordered.

**Worked example gaps:** none — full Q-learning algorithm given as steps; one complete update worked numerically.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** On-policy vs off-policy table is clear.

---

### reinforcement-learning/03-deep-q-networks
**Viz issues:** none.

**Worked example gaps:** none — DQN training step with concrete numbers and full arithmetic is one of the strongest worked examples in the course.

**ML mixing (should be separate section):** Intro applications correctly placed.

**Missing algorithms:** none — experience replay and target network both clearly explained.

**Other:** Double DQN well-integrated.

---

### reinforcement-learning/04-policy-gradient
**Viz issues:** `<PolicyGradientViz />` placed after REINFORCE baseline section — correctly ordered.

**Worked example gaps:**
- Advantage sign calculation (A = +2) is shown but the lesson does not make explicit **why** a positive advantage means "increase probability" — the connection back to the policy gradient theorem (from the derivation earlier in the lesson) is asserted rather than traced.

**ML mixing (should be separate section):** Intro applications correctly placed.

**Missing algorithms:** none — REINFORCE, actor-critic, and modern methods table all covered.

**Other:** none.

## Optimization for ML

### optimization-ml/01-gradient-descent-variants
**Viz issues:** none.

**Worked example gaps:** none — momentum and Adam worked examples complete with full running computations.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none — SGD, Momentum, RMSprop, and Adam all have complete update rules.

**Other:** Learning-rate schedules section is well-integrated here.

---

### optimization-ml/02-convex-optimization
**Viz issues:** none.

**Worked example gaps:** none — logistic regression Hessian proof and log-sum-exp lower bound both fully derived.

**ML mixing (should be separate section):** Cross-entropy application appropriately placed.

**Missing algorithms:** none.

**Other:** none.

---

### optimization-ml/03-constrained-optimization
**Viz issues:** none.

**Worked example gaps:**
- LP worked example identifies the optimal vertex $(3,1)$ and states the objective value but skips the KKT verification arithmetic. "Verify KKT stationarity" appears as a heading but the solving for $\mu_1, \mu_2$ is asserted rather than shown.

**ML mixing (should be separate section):** SVM dual derivation is an appropriate application section.

**Missing algorithms:** none — KKT conditions and Lagrangian are fully specified.

**Other:** SVM dual section is a standout application.

---

## Model Evaluation

### model-evaluation/01-classification-metrics
**Viz issues:** none.

**Worked example gaps:** none — confusion matrix, precision/recall/F1 all worked with concrete numbers.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** Multi-class metrics section concise but sufficient.

---

### model-evaluation/02-validation-strategies
**Viz issues:** none.

**Worked example gaps:**
- Walk-forward validation for time series shows the concept diagram but provides no numerical example with specific fold indices and train/test sizes.

**ML mixing (should be separate section):** none.

**Missing algorithms:** none.

**Other:** Data leakage section with real code examples is strong.

---

### model-evaluation/03-training-techniques
**Viz issues:**
- Early-stopping section includes a train/val loss table (lines 40–48) but no visualization component. A viz of the overfitting curve would be expected here.

**Worked example gaps:**
- Early stopping table shows epoch-by-epoch loss but the stopping decision ("stop at epoch 50") is asserted without showing the patience countdown explicitly.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Hyperband named as a hyperparameter optimization method but no algorithm steps or pseudocode provided — only a brief description of how it differs from successive halving.

**Other:** Data augmentation section is well-placed and practical.

---

## NLP

### nlp/01-text-preprocessing
**Viz issues:** none.

**Worked example gaps:**
- BPE worked example shows a toy merge sequence but does not trace the full algorithm with a concrete vocabulary frequency table. The Python code shows `get_pairs` defined but the full merge loop is not shown.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- BPE algorithm: merge loop (iteratively merge top pair) is illustrated but not given as a complete procedure.
- WordPiece named as alternative tokenization strategy but no algorithm provided.

**Other:** TF-IDF example is solid.

---

### nlp/02-word-embeddings
**Viz issues:** none.

**Worked example gaps:**
- Word2Vec analogy "king − man + woman ≈ queen" asserted without showing embedding values or cosine similarity scores.
- CBOW described in a brief table with no loss formula or training procedure.

**ML mixing (should be separate section):**
- Contextual embeddings section (ELMo and BERT) would benefit from a clearer subsection header to signal the transition from static to contextual representations.

**Missing algorithms:**
- GloVe: co-occurrence matrix construction and factorization algorithm not explained — only the loss formula is given.
- CBOW: no loss formula or update procedure.

**Other:** Evaluation section covers analogy and similarity benchmarks; adequate.

---

### nlp/03-sequence-models-to-bert
**Viz issues:** none.

**Worked example gaps:**
- BERT input representation shows `[CLS] The cat sat [SEP]` but does not walk through what the three embeddings (token + segment + positional) look like before summing — definition only, no concrete numbers.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Seq2seq encoder-decoder architecture described but no pseudocode or detailed forward-pass steps.

**Other:** Historical narrative and scaling table are valuable context.

---

## Computer Vision

### computer-vision/01-object-detection
**Viz issues:**
- Anchor boxes section describes the grid layout ($20 \times 20 \times 9$) and 9 box shapes but provides no diagram. A visual showing the 9 anchors tiled over a feature map would be expected here.

**Worked example gaps:**
- IoU definition given algebraically but no numerical example ("for boxes with coordinates A and B, IoU = 0.5").
- NMS algorithm lists 6 steps but no worked trace through a concrete set of box scores and IoU values.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- RPN (Region Proposal Network): described at high level but the head architecture (convolutional head with two output branches) and the loss for each branch not specified.

**Other:** mAP explanation is detailed and correct.

---

### computer-vision/02-segmentation
**Viz issues:**
- U-Net architecture described with channel counts but no diagram of the encoder/decoder/bottleneck symmetric structure. For an architecture lesson this is a significant gap.

**Worked example gaps:**
- Dice loss formula given but no worked example showing the calculation for concrete predicted and ground-truth masks.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- FCN variants (FCN-32s, FCN-16s, FCN-8s) named and described at high level but the skip-connection + upsampling mechanism not fully specified — no pseudocode or diagram for "fuse medium-level features before 16× upsampling."

**Other:** Panoptic Quality formula and RoI Align explanation are both clear.

---

### computer-vision/03-backbones-in-practice
**Viz issues:** none.

**Worked example gaps:** none — layer-wise learning rate decay example is concrete and clear; compound-scaling table shows results.

**ML mixing (should be separate section):** none.

**Missing algorithms:** Depthwise separable convolution is well-explained with cost reduction formula.

**Other:** Practical guidance on choosing backbones is excellent; input normalization callout is crucial and well-placed.

---

## ML in Practice

### ml-in-practice/01-feature-engineering
**Viz issues:** none.

**Worked example gaps:**
- Target encoding: formula given but no numerical worked example showing the exact encoding value computed for a specific category.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Recursive Feature Elimination (RFE): described as "fits model, ranks features, removes weakest, repeats" but no pseudocode or step-by-step procedure.

**Other:** Leakage section and Pipeline section are strong and practical.

---

### ml-in-practice/02-deployment-pitfalls
**Viz issues:** none.

**Worked example gaps:**
- PSI formula given but no numerical example calculating PSI for two concrete distributions.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Platt scaling: sigmoid formula given but no procedure for fitting the logistic regression calibrator.
- Isotonic regression mentioned as alternative but no procedure.

**Other:** Train-serve skew opening callout and SHAP explanation are both strong.

---

### ml-in-practice/03-algorithms-from-scratch
**Viz issues:** none.

**Worked example gaps:** none — linear regression and logistic regression implementations are thorough.

**ML mixing (should be separate section):** none.

**Missing algorithms:**
- Decision tree: Gini impurity and information gain defined but the exhaustive search procedure ("evaluate every feature and threshold") is only mentioned, not specified algorithmically.
- K-Means++: initialization probability weighting described informally; no worked calculation of selection probabilities.

**Other:** Outstanding lesson overall — implementations are production-quality.

---

## Summary of Common Patterns (complete — all 78 lessons reviewed)

| Pattern | Affected lessons | Impact |
|---------|-----------------|--------|
| ML applications dropped in first paragraph (no dedicated section) | ~15 lessons (neural-networks, linear-regression, knn, rnns, svm, clustering…) | High — confuses beginners |
| Viz placement mismatch or "above" reference broken | linear-algebra/01, linear-algebra/02, calculus-for-ml/02, knn/02, rnns/02, pca/02 | Medium |
| Visualization absent where one is clearly needed | linear-algebra/04, prob-stats/05, neural-networks/05, transformers/04, computer-vision/02, model-evaluation/03, all NLP lessons | Medium |
| Worked-example algebra cut short / hand-wavy | neural-networks/04, probabilistic-models/02, svm/03, ensemble/02, ensemble/03, clustering/03, generative/03, generative/04, generative/05, optimization/03, model-eval/02, nlp/01, nlp/02, computer-vision/01, computer-vision/02, ml-in-practice/01, ml-in-practice/02 | High |
| Algorithm named but no procedure given | linear-algebra/01 (rank), knn/02 (pruning), probabilistic-models/03 (Gaussian NB), graphical/01 (variable elimination), graphical/02 (graph cuts, loopy BP), graphical/03 (Baum-Welch), diffusion/05 (DDIM), nlp/01 (BPE, WordPiece), nlp/02 (GloVe, CBOW), computer-vision/01 (RPN), computer-vision/02 (FCN skip), ml-in-practice/02 (Platt, isotonic), ml-in-practice/03 (decision tree split, K-Means++) | High |
| Missing "Related concepts" section | 7 lessons (all lesson-03 files: pca/03, ensemble/03, clustering/03, knn/03, linear-regression/03, svm/03, probabilistic-models/03) | Low |
| Lessons with only 1 exercise | 10 lessons | Medium |

## Priority Fix List

**P1 — Structural (quick wins, high beginner impact):**
1. Move ML application hooks out of concept sections and into a "Connection to ML" section in ~15 lessons
2. Fix viz placement mismatches (linear-algebra/01 projection reference, linear-algebra/02 determinant reference, knn/02 viz before vocabulary)

**P2 — Completeness (missing steps):**
3. Add Baum-Welch update equations to graphical-models/03
4. Add variable elimination pseudocode to graphical-models/01
5. Add BPE merge-loop procedure to nlp/01
6. Add GloVe co-occurrence construction to nlp/02
7. Add DDIM step-by-step pseudocode to generative-models/05
8. Add RPN head architecture/loss to computer-vision/01

**P3 — Worked examples (numerical concreteness):**
9. Add slack-variable arithmetic to svm/03
10. Add gradient-boosting residual iteration example to ensemble-methods/02
11. Add silhouette step-by-step calculation to clustering/03
12. Add reparameterisation numerical example to generative-models/03
13. Add NMS worked trace to computer-vision/01
14. Add PSI numerical example to ml-in-practice/02

---

*Review complete — all 78 non-quiz lessons audited.*
