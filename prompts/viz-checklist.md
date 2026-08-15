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
- [x] **computer-vision/01-object-detection** — IoU and anchor matching.
      `AnchorMatchingViz`.
- [x] **ml-in-practice/14-anomaly-detection** — the threshold problem.
      `AnomalyThresholdViz`.
- [x] **optimization-ml/03-constrained-optimization** — feasible region, level
      sets, active constraints. `ConstrainedOptViz`.
- [x] **nlp/02-word-embeddings** — embedding space with analogy arithmetic. `WordAnalogyViz`.
- [x] **generative-models/01-what-are-generative-models** — a discriminative
      boundary and a generative density fit to the same points.
      `GenerativeVsDiscriminativeViz`.
- [x] **recommender-systems/01-the-recommendation-problem** — ranking metrics
      computed live on a re-orderable list. `RankingMetricsViz`.
- [x] **optimization-ml/05-hyperparameter-optimization** — grid vs random over
      the same budget. `HyperparamSearchViz`.
- [x] **streaming-ml/01-batch-to-streaming** — tumbling / sliding / session
      windows, and event time vs processing time on the same event stream.
      `StreamWindowViz`. Finding: on one 28-event stream, switching tumbling-10s
      from event time to processing time moves **8 of 28 events (28.6%)** into a
      different bucket, changes every per-window count (6/2/6/6/4/4 →
      5/1/7/6/4/3/2), and **invents a seventh window** no event belongs to — with
      nothing in the output to signal it. Sliding 10s/5s counts each event 1.93×
      (the overlap working, not a bug); session gap 2s → 9 sessions, 5s → 7, so
      the gap threshold *is* the definition rather than a tuning knob.
      Sliding windows had to be drawn on two lanes: stacked in one band the
      overlap rendered as an unreadable blob, and overlap is the whole point.
- [x] **model-evaluation/03-training-techniques** — early stopping: train and
      validation curves with the patience window. `EarlyStoppingViz`.
- [x] **cnns/03-cnn-visualization-and-attacks** — the FGSM ε sweep. `FGSMViz`.
- [x] **fine-tuning-alignment/06-knowledge-distillation** — temperature
      softening a logit vector. `DistillationViz`.
- [~] **computer-vision/03-backbones-in-practice** — the accuracy/FLOPs Pareto
      front and compound scaling. **Rejected twice; do not re-derive.**

      *Attempt 1 — simulate the scaling law.* Built a model of accuracy vs
      depth/width/resolution to show compound scaling beating single-axis
      scaling. It failed its own verification: depth-only scaling beat compound
      at 2× FLOPs (80.90% vs 78.87%), and at 8× and 16× the constrained grid
      produced no compound candidates at all. The model was hand-tuned to a
      conclusion rather than measured, so the plot would have asserted the
      lesson's claim rather than tested it. Discarded.

      *Attempt 2 — plot published benchmark numbers.* A Pareto front over real
      ImageNet results is computable (dominance is arithmetic, not judgement),
      and it produces a striking result: with the commonly-quoted figures the
      **entire ResNet family is dominated on both params and FLOPs**, and the
      frontier *changes membership* depending on which axis you constrain
      (MobileNetV3-L and ViT-B/16 sit on the FLOPs front but are dominated on
      params; MobileNetV2 and EfficientNet-B6 are the reverse). Good finding —
      but the inputs do not survive scrutiny. Three confounds, all fatal:
      training recipe (timm's `resnet50.a1_in1k` is **80.4%**, not the 76% every
      comparison table quotes — a +4.3pp swing on an unchanged architecture),
      pre-training data (EfficientNet's headline numbers are NoisyStudent on
      JFT-300M, not ImageNet-only), and FLOP convention (B4 quoted at both 4.2G
      and 8.29G, a clean 2× MAC-vs-FLOP split). Published sources disagree on
      B4's accuracy across 82.6 / 82.9 / 83.0. Every other viz here *computes*
      its numbers; this one would transcribe contested constants and present
      them as a frontier. Not built.

      *What was done instead:* the confound is the real teaching point, and it
      was cheap and well-sourced, so it went into the lesson as prose — a
      warning callout under the "Choosing a Backbone" table explaining that its
      accuracy column compares recipes as much as architectures, with the
      ResNet-50 76% → 80.4% figure cited to *ResNet strikes back* and timm.
      If this is ever revisited, the viz to build is **that**: one architecture,
      several recipes, watching the ranking reorder. It needs a single-harness
      multi-recipe table, which no source cleanly publishes today.
- [x] **graph-neural-networks/01-graphs-as-data** — receptive field growth per
      message-passing layer. `ReceptiveFieldViz`.
- [x] **causal-inference/02-interventions-and-potential-outcomes** — backdoor
      adjustment. `BackdoorAdjustmentViz`.
- [x] **probability-statistics/01-thinking-in-probabilities** — conditional
      probability as areas; the comma vs the bar. `ConditionalAreaViz`.
- [x] **generative-models/02-autoencoders** — reconstruction quality against
      code size. `BottleneckViz`.
- [x] **reinforcement-learning/03-deep-q-networks** — why correlated
      transitions break the regression. `ExperienceReplayViz`.

## Tier 2 — wants a guided walkthrough, not a viz

These are **pipelines with stages**, which is the `GuidedViz` shape (see
CLAUDE.md, "Adding a guided walkthrough"). A parameter explorer would be the
wrong format.

- [x] **ml-in-practice/17-feature-stores** — point-in-time correctness.
      `PointInTimeViz` (guided, 6 steps, two phases). A fraud pipeline simulated
      end to end — 1200 users, 140 days, ~30k rows at ~3% fraud — where
      `disputes_30d` is *caused by* the label (a fraud generates a dispute 7 days
      later). Two findings:

      1. **The leak starves the honest features.** The naive join puts 0.74 of
         its weight on the leaky column vs 0.10 under the as-of join, while
         account age collapses from −0.47 to −0.15. The model stops learning the
         signal it will actually have at serving time, and no metric shows it.
      2. **Production accuracy does *not* collapse — 0.81 either way.** This
         contradicts the lesson's original wording, which was corrected. Naive
         reports 0.91 and delivers 0.81; as-of reports 0.81 and delivers 0.81.
         The honest features carry the ranking even with starved weights. What
         the leak destroys is the number you set thresholds from. The familiar
         "production collapses" line is true only when the leaky feature is
         load-bearing — the step-6 toggle trains on `disputes_30d` alone and
         gets 0.92 → 0.68, a real 0.24 collapse.

      Seed stability (7/11/19/23/31) at full feedback: naive offline 0.892–0.927,
      production 0.797–0.832, hence two decimals everywhere.
      Gotcha for the next guided viz: `GuidedCard` renders children inside a
      `<p>`, so a `<div>` child is invalid nesting and fails hydration — keep
      card content inline.
- [x] **ml-in-practice/21-content-moderation** — label → agreement → active
      learning → policy thresholds → appeals. `ModerationPipelineViz` (guided,
      5 steps, three phases). Three findings, two of which corrected the lesson:

      1. **"A model can't outperform human agreement" is false as stated.** The
         ceiling is on the *measurement*. Sweeping annotator noise leaves the
         model's true AUC flat at 0.962 across kappa 0.79 → 0.19, because
         symmetric label noise does not move a decision boundary; what falls is
         the AUC you'd report (0.962 → 0.843), since the test labels come from
         the same disagreeing annotators. Low kappa means fix the eval, not
         abandon the model. Stated boundary: this holds for noise independent of
         the features — systematic bias correlated with content is a different
         failure.
      2. **Active learning buys 4× early and nothing later.** Uncertainty
         sampling reaches at 100 labels what random needs 400 for; past 400 both
         flatten at the all-4500-labels score. Reported with the saturation, not
         just the win.
      3. **The lesson's tier table barely fires.** At ~5% prevalence the model's
         highest score across 20k items is 0.991, so "auto-remove above 0.99"
         catches 2 items. And the appeal channel is one-sided: it sees ~2% of
         decisions, all on the action side, so it measures precision exactly and
         recall never. Recall needs a separately drawn audit sample.

      Two rejected sub-steps, recorded so they are not retried. **Systematic
      annotator bias → disparate FPR** cannot work in this setup: the group flag
      is not a feature and is independent of the features, so the model cannot
      treat the group differently at all (measured FPR ratios came out 0.85×,
      0.73×, 0.54× — wrong direction and non-monotonic). It would need
      group-correlated features, i.e. a whole extra mechanism. And the **tier
      analysis at 1,500 test items** produced 0–4 items per tier, far too few to
      mean anything; it needs ≥20k held out.
- [x] **streaming-ml/05-streaming-ml-in-production** — the online/offline skew
      trap and the delayed-label loop. `DelayedLabelViz` (guided, 4 steps).
      **Scoped down on an overlap check**: the skew/point-in-time half is now
      `PointInTimeViz` (ml-in-practice/17) and the drift half is the `adwin`
      trace, so this builds only the delayed-label piece, which nothing covered.

      200 days, 1,200 transactions/day, true fraud rate exactly 3.00%, no drift
      and no model — the only moving part is when chargebacks land (lognormal,
      median ~2 weeks, tail to 150 days). Finding: **every recent-window metric
      is biased low, one-directionally and stably.** A rolling 30-day fraud
      dashboard reads 1.40% against a true 2.93% — understated 52%, and 49–53%
      across seeds 13/29/41/57 at every value of "today" from day 60 to 199. It
      is not noise and does not average out. A 7-day window understates by 91%,
      so *the freshest number is always the most flattering*.

      Both fixes measured: matured cohorts (age ≥ 120d) give 2.97% vs true
      3.00%, unbiased but four months stale; dividing by the completion curve
      (the 30-day window is 48.4% complete on average) recovers 2.89% vs 2.93%
      immediately, at the cost of assuming the delay distribution is stable.
- [ ] **recommender-systems/04-session-based-and-realtime** — the real-time
      feature pipeline through to re-ranking.
- [~] **ml-in-practice/12-inference-optimization-and-serving** — KV-cache →
      batching → accelerator. **Rejected on the overlap check the entry itself
      asked for.** Every mechanism section already has a built artifact:
      KV-cache/PagedAttention → `paged-attention` trace, batching →
      `continuous-batching` trace, accelerators → `RooflineViz`, speculative
      decoding → `speculative-decoding` trace, quantization → `QuantizationViz`.
      A guided walkthrough would have re-taught four traces in a thinner form.

      The actual defect was different and cheaper: the lesson linked to **none**
      of them — zero `<WikiLink>`s in the whole file, despite explaining all four
      mechanisms in prose. Fixed by wiring the three wiki links in at the end of
      their matching sections and embedding `RooflineViz` in the accelerator
      section with a "what to notice" paragraph tying decode's memory-bound
      position back to why the KV-cache, continuous batching and quantization
      all exist. Cross-link before building: a lesson that explains a mechanism
      well but never points at its trace looks like a viz gap and is not one.
- [x] **building-with-llms/03-embeddings-and-semantic-search** — `HybridSearchViz`
      (guided, 4 steps). Overlap check passed: `RAGRetrievalViz` is a 2D k-vs-
      precision picture and never touches keyword vs semantic, so this builds the
      retrieval-comparison half only; indexing stays with the `hnsw` / `ivf`
      traces the lesson already links.

      BM25 is real over a real 15-doc corpus. The dense retriever is
      **constructed but derived from the text, not the answer key** — words
      sharing a sense share a direction (this table *is* an assumption, stated as
      such), digits collapse onto one shared direction. Two findings that are
      consequences rather than assumptions:

      1. **The exact-ID failure is mechanical.** Cosine between the two SKU
         documents is **1.0000** — the encoding cannot represent the difference
         between SKU-88421 and SKU-88422 — and dense's top hit for the SKU query
         is "Reset your account password". Per-query wins: BM25 1, dense 3,
         tied 3, so "neither dominates" is measured, not asserted.
      2. **RRF's constant decides whether fusion helps at all.** At k ≤ 10:
         mean 0.989, worst query 0.920. At k ≥ 20 (including the k = 60 everyone
         copies): mean 0.945, worst 0.613 — *below dense alone on both*. The
         benefit switches off between k = 10 and k = 20, because k = 60 is
         calibrated for corpora of millions.

      **Process note worth keeping**: the first build was rigged — topic vectors
      hand-assigned to match the relevance labels, so dense scored a perfect
      1.000 everywhere and hybrid came out *worse*. Rebuilt to derive vectors
      from the text. Then the shipped component's numbers diverged from the
      scratch script (a filler-vector cache changed the retriever), so the doc
      table and prose were re-extracted **by running the component's own
      functions**. Verify against the file that ships, not the prototype.
- [ ] **ml-in-practice/20-fraud-detection-at-scale** — imbalance → resampling →
      entity/graph features → adversarial response.
- [ ] **nlp/01-text-preprocessing** — the preprocessing pipeline (BPE itself is
      already traced on `wiki/bpe-tokenization`).
- [ ] **recommender-systems/03-deep-and-two-tower** — two towers, in-batch
      negatives, retrieve-then-rank. **Still open. One attempt failed; read this
      before retrying.**

      Overlap check passes — `ContrastiveViz` (nlp/07) animates the InfoNCE
      pull/push geometry in 2D and says nothing about two-tower training
      economics, so there is a real gap here.

      *Attempt 1 — in-batch-negative popularity bias and the logQ correction.*
      The intended finding was that in-batch negatives are sampled proportional
      to popularity, over-penalising popular items, and that the sampled-softmax
      logQ correction (`logit_j - log Q(j)`) fixes it. Measured, logQ made
      everything worse: recall@20 fell 0.238 → 0.130 and recall on the mid and
      tail terciles collapsed to 0.000, with the mean retrieved item index
      dropping from 104 to 13 of 300 — i.e. it retrieved almost only head items.

      That is an **artifact of a confounded setup, not a result**. The training
      data was generated as popularity-weighted exposure × affinity, but the
      evaluation target was *pure* affinity. The logQ correction makes the model
      a better estimator of the popularity-weighted training distribution, which
      is exactly the direction *away* from the eval target — so the comparison
      measured the mismatch between two objectives rather than the correction.
      The sign of the correction was right (rare items are under-sampled, so
      `-log Q` upweights them); the experiment design was wrong.

      To retry: decide first whether the retrieval target is affinity or
      engagement, generate the training interactions from *that same*
      distribution, and only then ask what the correction buys. A cleaner and
      probably better target for this lesson is the **retrieve-then-rank recall
      ceiling** — the ranker can only reorder what retrieval returned, so
      retrieval recall@k caps end-to-end quality no matter how good the ranker
      is. That is measurable without any of the above ambiguity.
- [x] **ml-in-practice/15-privacy-and-federated-learning** — `DPDisparityViz`
      (guided, 4 steps). Scoped to the DP-SGD half; the federated round is a
      protocol diagram with no quantity that varies, so it stays prose.

      The lesson claimed DP-SGD hurts underrepresented groups because "their
      gradients are rarer, so noise drowns them out more". **Both halves of that
      are wrong**, and the lesson was corrected:

      1. Their gradients are **larger, not rarer** — median per-example norm
         3.76× the majority's, because the model fits them worse so their
         gradients never shrink. At C = 1 that means 16% of minority examples
         are clipped against 3% of majority, 4.6× the rate, every step.
      2. **It is the clipping, not the noise.** At *zero* noise — no privacy
         purchased at all — tightening C from 20 to 0.2 leaves majority accuracy
         flat at 0.95 while minority falls 0.882 → 0.504. Holding C = 1 and
         sweeping σ, the minority barely moves from σ = 0 to σ = 32 (ε ≈ 1.4).
         Large-batch averaging amortises the noise; the per-example clip is not
         amortised. Matches Bagdasaryan et al. 2019, now cited in the lesson.

      Harm scales with representation: gap 0.521 at a 5% minority share, 0.259
      at 10%, 0.037 at 20%, 0.005 at 50%.

      Two failed attempts recorded: a shared linear model **cannot represent a
      group-specific rule** (minority sat at chance even with no DP, 0.562), so
      group-interaction features are required; and noise applied to a full-batch
      averaged gradient is negligible at any realistic σ, which is why the
      finding came out as clipping-dominated rather than noise-dominated.
      Accounting uses an exact RDP accountant for the **non-subsampled**
      Gaussian mechanism, which is why the sim is full-batch — subsampled
      amplification would have needed a much more involved accountant.
- [ ] **building-with-llms/07-reasoning-models** — train-time vs test-time
      compute scaling.
- [x] **ml-in-practice/02-deployment-pitfalls** — train-serve skew as a pipeline
      defect rather than a list of warnings. `TrainServeSkewViz` (guided, 4
      steps). Scoped by an overlap check: most of this lesson's mechanisms are
      covered elsewhere (temporal leak → `PointInTimeViz`, entity splits →
      `ValidationSplitViz`, walk-forward → its trace, drift → `adwin`,
      calibration → `CalibrationViz`), so this builds only the one uncovered
      pitfall — the imputation-default mismatch the lesson names itself.

      Finding, and it is stronger than expected: **the bug is invisible to both
      of the things teams watch.** Training imputes a missing `age` with the
      median 34, serving defaults to 0. Offline AUC is *unchanged* — 0.709 →
      0.709 overall and 0.694 → 0.694 within the affected rows, because
      substituting a constant shifts every affected row equally and a rank
      metric cannot represent that. Aggregate prediction drift moves −1.4%,
      below any alarm. Inside the affected slice the mean score falls **28%**,
      and 68 of 410 affected rows cross an action threshold they should not.

      So it is a *calibration* failure, not a ranking one: harmless if you only
      rank, directly harmful the moment you threshold. The moral for the
      lesson's monitoring section is to segment by the branches feature code can
      take, which no aggregate dashboard does for you.

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

## Round 4

- [x] **Word analogies** — `nlp/02` (`WordAnalogyViz`)
  - The space is **constructed, not downloaded**: seven random attribute axes,
    each word a weighted sum of its attributes plus noise. That removes the
    question of whether the structure exists — it does, by construction — so
    the only question left is whether the offset survives.
  - **The finding is about the protocol, not the embeddings.** Every standard
    analogy benchmark removes the three query words from the candidate set
    before scoring. Sweeping the noise: at 0.40 the benchmark still reports a
    perfect 7/7 while the honest nearest neighbour to a − b + c is one of the
    query words in **4/7** cases; at 0.60 it is 6/7. The offset points the right
    way but is shorter than the distance back to `king`. Reproduces Linzen's and
    Nissim et al.'s critique instead of citing it.

- [x] **Ranking metrics** — `recommender-systems/01` (`RankingMetricsViz`)
  - Ten rows, click to cycle the relevance grade, five metrics recomputed live.
    The preset pair is the argument: the same three documents at the top versus
    at the bottom give **identical P@10 = 0.300** while NDCG falls 1.0000 →
    0.3452 (2.90×) and MRR 1.0000 → 0.1250 (8×).
  - A metric that counts a *set* is blind to the only thing a ranker controls,
    which is why "we improved recall@100" is not evidence anyone's feed got
    better. The lesson asserted this in a callout; it is now two clicks.

- [x] **Grid vs random search** — `optimization-ml/05` (`HyperparamSearchViz`)
  - Bergstra & Bengio's setup run rather than described: only x matters, so a
    k×k grid spends k² evaluations to buy **k distinct values of x** while n
    random points buy n. The yellow ticks under each panel are the x
    coordinates actually tried.
  - **The headline is not "random wins" — at budget 16 the grid wins outright**
    (1.0472 vs 0.9402), because one of its lines happens to land near the peak.
    The real indictment is that grid is **not monotone in budget**: 0.5171 at 9,
    1.0472 at 16, **0.7565 at 25**, 0.9843 at 36. Nine more evaluations made it
    worse, because a finer grid can straddle a peak the coarser one hit. Random
    goes 0.8554 → 0.9402 → 0.9797 → 0.9985. Paying more and getting less is a
    worse property than losing on average, and it is only visible if you sweep
    the budget instead of fixing it.
  - Two slips caught by screenshot: literal `**markdown**` asterisks rendered
    verbatim inside a JSX string, and the on-screen mean used 400 seeds while
    the prose quoted 2000. Both now agree.

- [x] **Anchor matching** — `computer-vision/01` (`AnchorMatchingViz`)
  - The assignment rule run over all 3072 anchors against one object:
    **7 positive, 12 ignored, 3053 negative — 1:436**. That single count is why
    detection has a sub-literature on class imbalance; focal loss and 1:3
    sampling exist to stop 3053 easy negatives drowning 7 real examples.
  - Raising the positive threshold to 0.7 yields **zero** positives, because the
    best IoU any anchor reaches on this box is 0.635. A stricter rule does not
    give cleaner labels, it deletes the object — which is why the convention is
    0.5 and why detectors add a best-anchor-per-object fallback.
  - **Some objects are invisible to the anchor set outright**: best achievable
    IoU is 0.368 for a thin 60×400 box and 0.250 for a 32×32 one. No training
    finds them. Anchor scales and ratios are a dataset decision, and this is the
    failure mode anchor-free detectors were built to remove.

- [x] **Receptive field growth** — `graph-neural-networks/01`
  (`ReceptiveFieldViz`)
  - "Up to k hops away" sounds gradual. Measured by BFS on a 60-node ring:
    bare ring gives 3, 5, 7, 9, 11, 13 — linear, two new nodes per layer. Add
    **30 shortcuts (mean degree 2.00 → 2.97)** and it becomes 5, 14, 27, 46, 59,
    **60**: the whole graph by layer 6, 59 of 60 by layer 5.
  - Growth is exponential in the degree and every real graph has the shortcuts,
    so the receptive field does not merely widen with depth — it saturates. That
    is over-smoothing (lesson 03) seen from the other side, and it inverts the
    CNN intuition that depth is how you afford a wide field.

- [x] **The bottleneck** — `generative-models/02` (`BottleneckViz`)
  - A linear autoencoder trained to convergence *is* PCA, so error at code size
    k is exactly the eigenvalue tail — **computed, not trained**, which removes
    any question about convergence. 3 latent directions in 16 dimensions plus
    noise: MSE 0.35273 / 0.11667 / **0.05215** / 0.04708 at k = 1/2/3/4, and a
    spectrum of 10.049, 3.777, 1.032, then 0.081, 0.077, 0.076.
  - The elbow *is* the argument: at or above the intrinsic dimension the network
    can afford the identity map — perfect reconstruction, zero representation.
    The "compression" framing undersells it; scarcity is what forces a decision
    about structure.

- [x] **Experience replay** — `reinforcement-learning/03` (`ExperienceReplayViz`)
  - "SGD assumes i.i.d. samples" made felt: the same data, same learning rate,
    same number of updates, **only the order differs**. Sequential ‖w − w*‖ is
    0.2575 against 0.0774 shuffled at lr 0.02, and 0.1928 against **0.0162** at
    lr 0.05 — 11.89×. Not a byte of data changed.
  - **The damage grows with the learning rate** (3× → 12×), because a bigger
    step lets each stretch of near-duplicate samples drag the weights further
    before the next region arrives. So "just lower the learning rate" trades the
    problem for slowness rather than fixing it — replay fixes the order, and the
    order is what is broken.
  - The on-screen mean used 200 trajectories while the prose quoted 400; raised
    the component to 400 so the two agree exactly rather than approximately.

- [x] **Backdoor adjustment** — `causal-inference/02` (`BackdoorAdjustmentViz`)
  - An SCM with every role present (confounder Z, descendant M, collider C) and
    a known direct effect β = 0.9; the estimate is a closed-form OLS
    coefficient, so there is no fitting loop to doubt. Adjusting for nothing
    gives 1.6502; for Z alone, **0.9078** — the backdoor criterion delivering
    exactly what it promises.
  - **The row that earns the build is `Z and C`.** Having recovered 0.9078,
    adding one more measured variable collapses the estimate to **0.0684** —
    worse than adjusting for nothing. Conditioning on a collider opens a path
    rather than closing one, so "throw every covariate in" is not the
    conservative choice; it is a causal assumption made silently.
  - All six regressions run without complaint and produce tidy coefficients with
    small standard errors. Nothing in the data separates them — only the graph
    does, which is the lesson's point turned into something checkable.
  - First layout put M on the straight line between X and Y, so the causal edge
    was drawn *through* it and read as mediation — precisely the structure the
    viz exists to distinguish. Caught by screenshot; M now hangs below X.

## Round 5

- [x] **The threshold problem, priced** — `ml-in-practice/14`
  (`AnomalyThresholdViz`)
  - Tails are evaluated **analytically** rather than sampled. A first pass used
    4000 samples per class and reported precision exactly 1.0000 at the
    F1-optimal cut — a finite-sample zero in the far tail, not a real result.
    Every interesting threshold in anomaly detection lives out there.
  - At 0.1% prevalence over 1M events/day the cost-optimal threshold moves from
    3.93 to 1.28 as miss/alarm goes 1 → 1000 (recall 0.11 → 0.88, alerts 156 →
    101,057). **F1's threshold is 2% off at a ratio of 10, 50% off at 100 and
    244% off at 1000** — so "maximise F1" is not a neutral default, it asserts
    a miss costs about ten false alarms.
  - The second half is what imbalance forces regardless of the cut: catching
    88% means 101,057 alerts of which **99.1% are false**. Model quality is not
    the variable — prevalence is — which is why the fix is triage or a better
    score, never a better threshold.

- [x] **The multiplier as a price** — `optimization-ml/03` (`ConstrainedOptViz`)
  - λ checked against a numerical −d(f*)/db at every budget: 3.00000 / 2.00000 /
    1.00000 / 0.50000 at b = 2 / 3 / 4 / 4.5, **exact each time**, and 0 the
    moment the unconstrained optimum becomes feasible.
  - That makes complementary slackness something you watch rather than read:
    a non-binding constraint has no price. The panel also shows ∇f staying
    perpendicular to the active constraint, which is stationarity doing its
    work.
  - Two syntax/rendering traps worth remembering: `−df*/db` inside a block
    comment contains `*/` and **closes the comment**, and `VizStat` uppercases
    its label so λ renders as Λ — a different symbol. Greek belongs in SVG text
    and prose, not in stat labels.
