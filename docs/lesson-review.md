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
*(pending — agent 1 still running)*

### linear-algebra/03-eigenvalues-and-eigenvectors
*(pending — agent 1 still running)*

### linear-algebra/04-svd-and-low-rank
*(pending — agent 1 still running)*

---

## Calculus for ML

### calculus-for-ml/01-derivatives-and-gradients
*(pending — agent 1 still running)*

### calculus-for-ml/02-chain-rule-and-backpropagation
*(pending — agent 1 still running)*

### calculus-for-ml/03-multivariable-optimization
*(pending — agent 1 still running)*

### calculus-for-ml/04-jacobians
*(pending — agent 1 still running)*

---

## Probability & Statistics

### probability-statistics/01-thinking-in-probabilities
*(pending — agent 1 still running)*

### probability-statistics/02-probability-distributions
*(pending — agent 1 still running)*

### probability-statistics/03-maximum-likelihood-estimation
*(pending — agent 1 still running)*

### probability-statistics/04-bayesian-inference
*(pending — agent 1 still running)*

### probability-statistics/05-entropy-and-kl-divergence
*(pending — agent 1 still running)*

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
*(pending — agent 3 still running)*

## SVMs
*(pending — agent 3 still running)*

## Ensemble Methods
*(pending — agent 3 still running)*

## Clustering
*(pending — agent 3 still running)*

## Generative Models
*(pending — agent 5 still running)*

## Graphical Models
*(pending — agent 5 still running)*

## Reinforcement Learning
*(pending — agent 5 still running)*

## Optimization for ML
*(pending — agent 6 still running)*

## Model Evaluation
*(pending — agent 6 still running)*

## NLP
*(pending — agent 6 still running)*

## Computer Vision
*(pending — agent 6 still running)*

## ML in Practice
*(pending — agent 6 still running)*

---

## Summary of Common Patterns

| Pattern | Count (so far) | Impact |
|---------|---------------|--------|
| ML applications dropped in first paragraph | ~12 lessons | High — confuses beginners |
| No dedicated "Connection to ML" section | Most lessons | High |
| Viz placed in wrong section / instructions point to wrong viz | ~8 lessons | Medium |
| Missing worked-example algebra steps | ~10 lessons | High |
| Missing algorithms (procedure named but not given) | ~15 lessons | High |
| Missing visualization entirely | 26 lessons | Medium |
| Lessons with only 1 exercise | 10 lessons | Medium |
| Missing "Related concepts" section | 7 lessons | Low |

---

*File updated incrementally as review agents complete. Remaining sections marked "pending" will be filled in.*
