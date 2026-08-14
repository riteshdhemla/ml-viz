# Visualization backlog — the lessons that carry neither a viz nor a trace

Companion to `prompts/algo-trace-checklist.md`, built the same way: audit first,
write down the rejections so nobody re-derives them, then build in rounds.

## The audit

Scanned every lesson under `src/content/courses` for a registered viz component
or an `<AlgorithmTrace>` (94 components are registered in `mdxComponents.tsx`).

| | count |
|---|---|
| lessons total | 211 |
| carry a viz or a trace | 112 |
| carry neither | 99 |
| — of which are **quizzes** | 33 |
| **concept lessons with neither** | **66** |

The 33 quizzes are correct as they are: a quiz lesson is a bank of
`<Exercise id>` references by design, and dropping a viz into one would be
decoration. **The real gap is 66 concept lessons**, and they are not one
problem — they split three ways.

## Tier 1 — wants a plain viz (a shape prose cannot show)

Ordered by how much the lesson is currently carrying in prose that a picture
would carry better.

- [x] **causal-inference/01** — Simpson's paradox. `SimpsonsParadoxViz`.
- [x] **model-evaluation/01-classification-metrics** — one threshold slider
      driving the confusion matrix, precision/recall, and the moving point on
      both the ROC and PR curves. `ThresholdSweepViz`.
- [x] **reinforcement-learning/05-exploration-and-model-based** — ε-greedy vs
      UCB vs Thompson on the same bandit, with cumulative regret.
      `BanditExplorationViz`.
- [x] **optimization-ml/02-convex-optimization** — the chord-above-the-graph
      definition and Jensen's inequality. Rejected for a *trace* (no loop that
      transforms state) and exactly right for a viz. `ConvexityViz`.
- [x] **model-evaluation/02-validation-strategies** — which rows are train and
      which are test, per fold, for k-fold / LOO / time-series split.
      `ValidationSplitViz`.
- [x] **ml-in-practice/05-data-engineering-fundamentals** — row vs column
      storage. `StorageLayoutViz`.
- [x] **graph-neural-networks/03** — over-smoothing: node features collapsing
      toward each other as depth grows. `OverSmoothingViz`.
- [x] **gpu-programming/04-gpus-for-deep-learning** — the roofline.
      `RooflineViz`. Also serves `ml-in-practice/12` and `22`.
- [ ] **computer-vision/01-object-detection** — IoU and anchor matching (NMS
      itself is already traced on `wiki/nms-algorithm`).
- [ ] **ml-in-practice/14-anomaly-detection** — the threshold problem: two
      overlapping score distributions and what moving the cut costs.
- [ ] **optimization-ml/03-constrained-optimization** — feasible region, level
      sets, and which constraints are active at the optimum.
- [ ] **nlp/02-word-embeddings** — embedding space with analogy arithmetic.
- [x] **generative-models/01-what-are-generative-models** — a discriminative
      boundary and a generative density fit to the same points.
      `GenerativeVsDiscriminativeViz`.
- [ ] **recommender-systems/01-the-recommendation-problem** — ranking metrics
      (precision@k, NDCG) computed live on a re-orderable ranked list.
- [ ] **optimization-ml/05-hyperparameter-optimization** — grid vs random vs
      successive halving over the same budget.
- [ ] **streaming-ml/01-batch-to-streaming** — tumbling / sliding / session
      windows, and event time vs processing time on the same event stream.
- [x] **model-evaluation/03-training-techniques** — early stopping: train and
      validation curves with the patience window. `EarlyStoppingViz`.
- [x] **cnns/03-cnn-visualization-and-attacks** — the FGSM ε sweep. `FGSMViz`.
- [x] **fine-tuning-alignment/06-knowledge-distillation** — temperature
      softening a logit vector. `DistillationViz`.
- [ ] **computer-vision/03-backbones-in-practice** — the accuracy/FLOPs Pareto
      front and compound scaling.
- [ ] **graph-neural-networks/01-graphs-as-data** — receptive field growth per
      message-passing layer.
- [ ] **causal-inference/02-interventions-and-potential-outcomes** — backdoor
      adjustment on the graph from lesson 01.
- [x] **probability-statistics/01-thinking-in-probabilities** — conditional
      probability as areas; the comma vs the bar. `ConditionalAreaViz`.
- [ ] **generative-models/02-autoencoders** — reconstruction quality against
      code size, showing why the bottleneck is the point.
- [ ] **reinforcement-learning/03-deep-q-networks** — why correlated
      transitions break the regression, and what replay does to them.

## Tier 2 — wants a guided walkthrough, not a viz

These are **pipelines with stages**, which is the `GuidedViz` shape (see
CLAUDE.md, "Adding a guided walkthrough"). A parameter explorer would be the
wrong format.

- [ ] **ml-in-practice/17-feature-stores** — point-in-time correctness. The
      canonical candidate: the naive join leaks and the reader should watch it
      happen before seeing the fix.
- [ ] **ml-in-practice/21-content-moderation** — label → agreement → active
      learning → policy thresholds → appeals.
- [ ] **streaming-ml/05-streaming-ml-in-production** — the online/offline skew
      trap and the delayed-label loop.
- [ ] **recommender-systems/04-session-based-and-realtime** — the real-time
      feature pipeline through to re-ranking.
- [ ] **ml-in-practice/12-inference-optimization-and-serving** — KV-cache →
      batching → accelerator, though three of its components are already traced
      on wiki pages; check for overlap first.
- [ ] **building-with-llms/03-embeddings-and-semantic-search** — text → vector →
      index → retrieve, if it can avoid duplicating `RAGRetrievalViz`.
- [ ] **ml-in-practice/20-fraud-detection-at-scale** — imbalance → resampling →
      entity/graph features → adversarial response.
- [ ] **nlp/01-text-preprocessing** — the preprocessing pipeline (BPE itself is
      already traced on `wiki/bpe-tokenization`).
- [ ] **recommender-systems/03-deep-and-two-tower** — two towers, in-batch
      negatives, retrieve-then-rank.
- [ ] **ml-in-practice/15-privacy-and-federated-learning** — the DP-SGD loop and
      the federated round.
- [ ] **building-with-llms/07-reasoning-models** — train-time vs test-time
      compute scaling.
- [ ] **ml-in-practice/02-deployment-pitfalls** — train-serve skew as a pipeline
      defect rather than a list of warnings.

## Tier 3 — rejected, deliberately

Recorded so a later audit does not re-derive them. These lessons are
**catalogues, prose, or judgement**, and the honest answer is that a picture
would be decoration.

**Pattern catalogues** — the content is a taxonomy with forces and tradeoffs;
the existing comparison tables already are the right presentation:
`agent-design-patterns/02-goal-creation-patterns`,
`04-planning-patterns`, `05-model-querying-patterns`, `06-reflection-patterns`,
`08-safety-registry-and-adaptation`.

**Ops, governance and process** — checklists and organisational practice, with
no quantity that varies:
`ml-in-practice/07-experiment-tracking`,
`11-mlops-infrastructure-and-orchestration`,
`13-responsible-ai-and-the-human-side`,
`18-model-registry-and-governance`,
`01-feature-engineering` (a catalogue of encodings),
`03-algorithms-from-scratch` (code walkthrough; the notebook is the artefact).

**Surveys of a landscape** — breadth over mechanism:
`building-with-llms/02-chain-of-thought`, `05-agents-and-tool-use`,
`08-llm-evaluation`, `10-guardrails-and-llmops-security`,
`12-code-intelligence-and-generation`, `13-voice-and-multimodal-ai`,
`generative-models/06-vit-and-modern-genai`,
`computer-vision/02-segmentation`, `nlp/03-sequence-models-to-bert`,
`gpu-programming/01-gpu-architecture`, `02-cuda-programming-model`,
`model-evaluation/05-evaluating-ai-systems`,
`recommender-systems/05-diversity-cold-start-exploration`,
`06-ad-ranking-and-ctr-prediction`,
`ml-in-practice/10-monitoring-and-observability`, `22-optimizing-llm-inference`.

**Already served by a link** — the mechanism is visualised on the wiki page the
lesson links to, and adding a duplicate here would fragment it:
`probabilistic-models/02-em-algorithm` (→ `wiki/em-algorithm`),
`neural-networks/05-batchnorm-and-dropout` (→ `wiki/batchnorm-algorithm`).

Two of these are borderline and are listed in Tier 1 as well where the *lesson's
own* framing is visual rather than survey-shaped
(`gpu-programming/01`, `recommender-systems/05`); build the Tier 1 item or drop
the Tier 3 entry, not both.

## Round 1 — in progress

- [x] **Simpson's paradox** — `causal-inference/01`
  - `SimpsonsParadoxViz`: 180 patients, three severity strata, a known
    generating process (dose helps everyone by +0.90/unit, severity costs 2.5
    per stratum). The reader controls **one arrow** — how strongly severity
    drives the dose — plus a switch that severs it the way randomisation does.
  - Seed 587 was chosen out of 600 candidates as the one whose finite sample
    puts all three estimators on the truth when they should be: with the arrow
    at 0 the pooled slope is +0.898 and the within-stratum slope +0.896 against
    a true +0.90. That matters — a viz whose "unconfounded" baseline reads
    +1.22 teaches the reader to distrust the readout instead of the structure.
  - The bias is **not monotone** in the arrow strength: it peaks when the
    confounder explains a moderate share of the dose variation and shrinks again
    once it explains nearly all of it (bias = δγV_z/(γ²V_z + σ_x²), maximised at
    γ = σ_x/sd(Z) ≈ 0.95 here). The slider stops at 1.0, just below the turning
    point, because the turnaround there is 0.003 wide and would read as noise
    rather than as the real effect it is. Recorded in the component's doc
    comment so the cap is not "tidied up" later.
  - Verified by screenshot in both states rather than by reading the JSX.

- [x] **The threshold sweep** — `model-evaluation/01-classification-metrics`
  - `ThresholdSweepViz`: 900 positives and 900 negatives scored once from two
    fixed Gaussians through a sigmoid (means -0.8 / +0.8, separation 1.6,
    achievable AUC 0.873). The lesson explained the confusion matrix,
    precision/recall, F1, ROC and PR in five separate sections; they are five
    readings of one decision, so the viz puts them on one screen with one
    slider.
  - TPR and FPR are functions of the two score distributions alone, so they are
    precomputed for all 201 thresholds and prevalence enters only through
    `P = pi*TPR / (pi*TPR + (1-pi)*FPR)`. That structure *is* the lesson's
    imbalance warning: AUC-ROC comes out **identical to four decimals**
    (0.8727) at 50%, 10% and 1% prevalence, while PR-AUC falls
    0.8699 -> 0.5247 -> 0.1905. Not "similar" — identical, because neither TPR
    nor FPR ever touches the class mix.
  - At 1% prevalence and threshold 0.5 the model flags 2,079 false positives to
    catch 79 true ones (precision 0.037) while accuracy reads 0.790 against
    0.792 on balanced data. Two of the three headline numbers report that
    nothing is wrong.
  - Both histograms are normalised to their own peak — at 1% the positive class
    is otherwise one invisible pixel. The real mix is in the confusion-matrix
    counts, which is the honest place for it; the caption says so rather than
    letting the reader infer a 50/50 split from the picture.
  - First layout put each AUC inside its own plot; at 50% prevalence the PR-AUC
    label sat on top of the curve. Both moved to the stats row, which also puts
    the two numbers side by side — the comparison the frame exists to make.

## Round 2

- [x] **Three strategies on one bandit** — `reinforcement-learning/05`
  - `BanditExplorationViz`: five Bernoulli arms (0.25 … 0.70), 200 runs of 3000
    pulls per strategy on shared seeds, all simulated in the browser. Plotted as
    **cumulative regret**, not average reward — reward curves for all three sit
    just under 0.70 and the whole distinction is invisible; regret keeps the
    history, so "never stops exploring" shows up as a permanently rising line.
  - The payoff is a number the reader can predict before looking. Once ε-greedy
    has found the best arm it pulls a uniformly random arm ε of the time
    forever, so its regret slope settles at exactly ε·(ΣΔ)/K = 0.214ε. Measured
    over the last quarter: **0.0642 against 0.0642 predicted at ε = 0.30**, and
    0.0429 against 0.0428 at ε = 0.20 — inside one SE both times, so the dashed
    asymptote lies on the curve.
  - Below ε ≈ 0.15 the measured slope runs *above* the prediction (z = 2.9 at
    ε = 0.10, z = 4.3 at ε = 0.05). That is not noise and not a bug — the
    premise fails, because at 3000 pulls the agent has not reliably identified
    the best arm and the excess is misidentification rather than the
    exploration tax. Keeping both halves is what makes the ε slider teach
    something: regret is 253 at ε = 0, bottoms out near 81 at ε = 0.08, and
    climbs to 203 at ε = 0.30, bad at both ends for opposite reasons.
  - **The finding worth carrying is about the constant, not the algorithm.**
    Tuned UCB (c = 0.45) reaches 26.3 and genuinely beats Thompson's 34.2. But
    UCB at a plausible c = 1.0 scores 87.6 — a dead tie with ε-greedy at
    ε = 0.10 (87.7), the baseline it is supposed to dominate — and the textbook
    c = √2 is worse still (~156). Thompson lands within 30% of the tuned
    optimum with no hyperparameter at all. The regret bound says nothing about
    the constant in front of it, and at T = 3000 the constant is all you have.
    Default is therefore c = 1.0, not the flattering 0.45.
  - Arm means are spread 0.25–0.70 deliberately. Realistically close arms
    (gaps ~0.07) need ~10× the horizon before any of this is visible, which is
    a slower viz that teaches strictly less.
  - Two layout collisions caught by screenshot, not by reading the JSX: the
    bottom-right legend sat exactly where the Thompson curve ends (moved to the
    top-left, the one corner a cumulative curve starting at 0 cannot reach at
    any slider setting), and the pull-share percentages were clipped off the top
    of the mini-bar viewBox for the best arm — i.e. on the one bar that matters.

- [x] **The chord test** — `optimization-ml/02`
  - `ConvexityViz`: the lesson defines convexity three times — chord above the
    graph, Hessian PSD, and Jensen — in three separate sections. They are one
    diagram. Put weight 1−λ on x₁ and λ on x₂ and the point on the chord *is*
    E[f(X)] while the point under it on the curve *is* f(E[X]); the λ slider is
    moving a probability. The SVG labels say exactly that, so the unification is
    the default reading rather than a remark.
  - The 1000-pair midpoint scan is the numerical test the lesson's own callout
    describes, run for real on a fixed seed: 0 violations for x², |x| and
    softplus, **501 for x³ and 502 for sin** — both ≈ ½, which is not luck. With
    endpoints written as m ± d the midpoint gap is ½f″(m)d² + O(d⁴), and for
    these two the identity is exact and terminating (x³: gap = 3md²;
    sin: gap = −sin(m)(1−cos d)). Both are negative exactly when f″(m) < 0, so a
    random pair fails precisely when its midpoint lands in the rose band, which
    covers half of each symmetric domain.
  - That is what makes the f″ < 0 shading load-bearing rather than decorative:
    it *predicts* which chords fail, and the reader can check the prediction on
    x³ by straddling the inflection (gap exactly 0 at m = 0, sign following the
    midpoint rather than the endpoints).
  - **|x| is in the picker because it breaks the Hessian story**, not despite
    it: convex, with f″ = 0 everywhere it exists and all the curvature
    concentrated at the one point where it does not. The readout prints
    "f″ undefined" there instead of a 0 it cannot justify — which is the honest
    version of why the PSD criterion is stated for twice-differentiable
    functions, and why ℓ1 needs subgradients.
  - The gap-vs-Taylor readout also earns its place by *disagreeing*: sin with a
    wide chord (d = 2.68) shows 0.2269 measured against 0.4299 predicted. The
    O(d⁴) term is not a footnote at that width, and a viz that only ever showed
    agreement would teach the approximation as an identity.
  - Screenshot fixes: the two point labels crossed the curve and each other
    (now carry a card-coloured halo via paint-order stroke, and flip to the left
    of the marker near the right edge), and f(E[X]) printed "-0.000" at the
    inflection.

- [x] **Every split on the same rows** — `model-evaluation/02`
  - `ValidationSplitViz`: seven schemes (hold-out, k-fold, stratified, LOO,
    walk-forward, rolling, bootstrap) colouring one fixed 40-row dataset. The
    design decision that makes it teach: **columns are always time order, never
    fold order**, so shuffled k-fold renders as speckle and walk-forward renders
    as a staircase before any number is read.
  - **The leakage counter found something worth stating.** Shuffled 5-fold
    validates 39 of 40 rows using data from their own future; switching to
    contiguous folds only reaches 32. That is not bad luck — the number of
    contaminated (v,t) pairs is C(40,2) − k·C(40/k,2), which depends on fold
    *sizes* only and is 640 at k = 5 either way. Ordering folds concentrates the
    leakage into the early folds rather than removing it. Only walk-forward hits
    0, which is the argument for it, stated as a count instead of a warning.
  - Stratification, made countable: 5 positives in 40 rows at k = 5. Stratified
    puts exactly one per fold always; plain k-fold averaged **30.9% empty folds
    over 4000 shuffles, with 95.3% of shuffles producing at least one**. An
    empty fold has undefined precision and recall, so the CV mean averages over
    terms that do not exist.
  - Two findings the panel surfaced that the lesson never mentions, both kept:
    LOO leaves **35 of 40 folds with no positive** (each fold's score is a
    single 0/1 — that *is* its variance problem, on a classification task), and
    walk-forward with a 5-row horizon leaves **3 of 6 windows with no positive**,
    the standard rare-event failure of walk-forward.
  - **The bootstrap readout was nearly a dishonest one.** The plan was to show
    that the lesson's 36.8% is the n→∞ limit and (1−1/40)^40 = 36.32% is the
    truth at this n — but six drawn resamples read 37.1%, which is about one SE
    from either. Six draws cannot resolve half a point. Fixed by putting the
    exact expectation on the panel beside the measured value and saying so in
    the prose, rather than asking the reader to see a difference that is not
    there; the 20000-resample confirmation (0.3632 / 0.3668 / 0.3676 at
    n = 40 / 200 / 1000) carries the claim instead.
  - LOO originally inherited the shuffle permutation, scattering the diagonal.
    Its folds are singletons, so their order carries no information — forced to
    time order.

- [x] **Row vs column storage** — `ml-in-practice/05`
  - `StorageLayoutViz`: the ribbon is **disk in byte order**, which is the only
    view in which the two layouts differ at all — as tables they are identical.
    Cells are teal (asked for), grey (dragged in by sharing a block) or dark
    (skipped), so read amplification is visible rather than computed.
  - The lesson's "2% read" is one number covering **two independent effects**,
    and separating them is what the viz adds:
    *locality* — disk reads blocks, so row-major fetches **100% of blocks** to
    project 2 of 8 columns, unchanged at 4/8/16/32 cells per block, while
    column-major fetches the fraction of columns asked for; and
    *compressibility* — RLE and dictionary encoding need neighbours from the
    same domain, which row-major never has.
  - Each column is encoded the way Parquet actually does it (best of plain,
    dict+bit-packing, dict+RLE) on a 5000-row synthetic table. **The measured
    per-column ratios span 1.0× to 31.2×** — `price` (random floats) cannot be
    compressed at all, `device` (four values in an 8-byte string) goes 31.2×.
    Whole table: 2.88×.
  - **The finding that beats the lesson's headline:** the two effects multiply,
    so the win depends on *which* columns you project. On the identical file,
    `ts + user_id` reads 6.7× less than the row store and `event + ab_bucket`
    reads 85× less — a thirteen-fold spread. "Parquet gives 10–30×" is a claim
    about typical telemetry schemas, not about Parquet. The actionable form is
    in the lesson now: a wide low-cardinality column is nearly free to store and
    nearly free to read, so denormalising enum-like features costs far less than
    the row count suggests.
- [x] **Over-smoothing** — `graph-neural-networks/03`
  - `OverSmoothingViz`: strip a GCN of weights and nonlinearities and a layer
    is just multiplication by P = D^(-1/2)(A+I)D^(-1/2). **λ₁ = 1 exactly**,
    with eigenvector D^(1/2)·1; every other mode shrinks by its own λ. The
    lesson framed over-smoothing as a failure mode — it is simply what the
    operator does, and saying that changes what the reader takes away.
  - The rate is the checkable part. Dirichlet energy decays by λ₂² per layer,
    and the measured ratio walks monotonically onto it: 0.81372 at k = 5,
    0.82150 at 10, 0.82448 at 20, 0.82608 at 40, 0.82636 at 78, against
    λ₂² = 0.82637. The panel prints the live ratio beside the prediction.
  - **The bridge slider is the counter-intuitive half and the reason to build
    this at all.** More edges *between* the communities means better mixing,
    which lowers λ₂, so a better-connected graph over-smooths **faster** — at
    depth 20, 0.504 energy survives with one bridge and 0.0088 with twelve, a
    57× swing from eleven edges with the features untouched.
  - α is APPNP's fix in one term: (1−α)PH + αH₀ has a nonzero fixed point, so
    energy plateaus. E₃₀/E₀ is 9.6e-4 at α = 0 and 1.1e-1 at α = 0.1, flat from
    about layer 10.
  - **A correction to the lesson's wording, kept.** Under symmetric
    normalisation the features do *not* converge to "the same vector" — they
    converge to something proportional to √degree. Every node keeps its degree
    and loses everything else. Node colour is therefore h/√degree, the quantity
    Dirichlet energy is actually built on, and the caption says why.
  - Two presentation fixes from the screenshot: `VizStat` uppercases its label,
    which turned λ into Λ — a different symbol, so those labels are words now
    and the Greek lives in the SVG text and the prose. And the λ₂^2k line was
    anchored at layer 1, where the law does not hold yet, drawing a visible
    offset that read as disagreement; anchoring at layer 5 shows the claim
    actually being made, which is about the rate and not the constant.

- [x] **Row vs column storage (continued)**
  - First compression model was wrong and would have understated the case:
    plain RLE gives ~1.0× on everything because low-cardinality columns have
    short runs (`country`, 14 levels, mean run 1.08). Real columnar files win
    through **dictionary + bit-packing**, not RLE — 14 levels is 4 bits against
    a 2-byte raw width. Caught by printing per-column ratios and finding them
    all 1.00×, which is not a plausible answer.

## Round 3

- [x] **The roofline** — `gpu-programming/04` (`RooflineViz`)
  - Two exact results carry it. **Tensor cores move the ridge point right by
    16×** on an A100 (12.5 → 200.6 FLOP/byte): making arithmetic faster does not
    make kernels compute-bound, it makes more of them memory-bound. GEMM at
    n = 256 is compute-bound in FP32 and bandwidth-bound in FP16, same kernel.
  - **For LLM decode, arithmetic intensity equals the batch size exactly**
    (2BN² FLOPs over 2N² bytes). That turns "batch your server" into a target:
    B ≥ 201 on A100 tensor cores, 296 on H100. At B = 1 the kernel can reach
    0.5% of a 312 TFLOP/s machine; at B = 64, 31.9%.
  - Dropped the separate "3 ops unfused" point after drawing it: fusion does not
    move a kernel along this axis at all — three unfused ops sit at the *same*
    0.167 FLOP/byte and pay it three times. Two dots on one spot said the
    opposite of the truth.

- [x] **Patience, priced** — `model-evaluation/03` (`EarlyStoppingViz`)
  - The lesson's "setting patience" tip is qualitative; running the rule 800
    times against fresh noise makes it a table. Regret against the noiseless
    optimum (0.4058 at epoch 33): 0.2329 at patience 1, 0.0841 at 2, 0.0138 at
    5, 0.0062 at 8, then flat at noise level.
  - **The asymmetry is the finding.** Because early stopping restores the *best*
    checkpoint and not the last one, too-large patience costs only compute while
    too-small patience loses quality permanently. "When in doubt, err large" is
    now derived rather than asserted.

- [x] **Temperature and the τ²** — `fine-tuning-alignment/06` (`DistillationViz`)
  - Softening reveals mass, never order: p(top) 0.8521 → 0.1685 over τ = 1…10,
    mass outside the argmax 0.148 → 0.832, and the ranking identical throughout
    because softmax is monotone in the logits.
  - What compresses is the ratios, exactly: p_i/p_j = exp((z_i−z_j)/τ), and the
    panel prints the measured ratio beside exp(0.5/τ) — agreeing to six
    decimals. "Dark knowledge" is those ratios being lifted out of
    floating-point irrelevance, not a metaphor.
  - **The τ² earns its own plot.** The KD gradient is (p_s − p_t)/τ, so the raw
    norm falls 118× across τ = 1→10 and the distillation term would silently
    switch itself off. With the correction it holds 0.383 → 0.324. The lesson
    called τ² a compensation factor; now it is a measured curve.

- [x] **The comma and the bar** — `probability-statistics/01`
  (`ConditionalAreaViz`). Every quantity is a region of one unit square drawn to
  scale, so the medical-test asymmetry needs no algebra: prevalence 0.01,
  sensitivity 0.99, false positives 0.05 gives P(A) = 0.0594 and
  P(B|A) = 0.1667 — a **5.94× gap between the two bars** from one 99% number,
  visible as a teal sliver against a rose band that starts 99× wider.

- [x] **FGSM** — `cnns/03` (`FGSMViz`)
  - A logistic regression is *trained in the browser* on 300 synthetic 12×12
    images (400 steps, 100% train accuracy); w, the margin and ‖w‖₁ are all
    measured from that fit rather than hand-set. Being linear makes FGSM exactly
    analysable: the logit moves by ε‖w‖₁, checked against the measured shift on
    every frame (they part only when pixel clipping bites).
  - **The honest result is the interesting one: ε* = 43/255 on this model, so
    the canonical 8/255 flips nothing.** A first attempt tried to manufacture
    vulnerability by tuning templates until the margin was small; that would
    have taught a false mechanism. A 144-pixel model genuinely is not
    vulnerable to an imperceptible attack.
  - What makes real models fragile is the denominator. ‖w‖₁ grows ~linearly
    with input count at fixed mean weight, so the dimension slider extrapolates:
    at 224×224×3 the same model shape has ‖w‖₁ ≈ 50,000 and ε* ≈ 0.035/255.
    Adversarial fragility is a property of input dimension, not of images or of
    depth — which is Goodfellow's original argument, and is much harder to
    misremember once it is a slider.

- [x] **Discriminative vs generative** — `generative-models/01`
  (`GenerativeVsDiscriminativeViz`). Both models are fitted live and draw almost
  the same boundary, which is the setup: the difference is not the decision.
  - Test error on 4000 held-out points by training size — logreg
    4.05 / 2.80 / 2.65 / 1.85 % against GDA 2.08 / 1.93 / 2.00 / 2.02 % at
    n = 8 / 16 / 30 / 60. **Structure substitutes for data and then stops
    mattering**, which is Ng & Jordan made draggable. Default is n = 16, where
    the gap is real; n = 60 shows it gone.
  - The stronger half: **a discriminative model has no vocabulary for doubt.**
    Off the edge of the data it reports P = 1.0000 while the density reports
    p(x) ~ 1e-8, and further out P = 0.0000 against ~1e-24. Both confident
    answers are about regions never seen. This is the argument for a density in
    OOD detection, anomaly detection and calibration under shift.
  - The fitted boundary is an infinite line and escaped the plot frame until it
    was clipped — caught by screenshot, invisible in the JSX.
