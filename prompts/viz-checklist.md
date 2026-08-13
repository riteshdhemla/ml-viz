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
- [ ] **optimization-ml/02-convex-optimization** — the chord-above-the-graph
      definition and Jensen's inequality. Rejected for a *trace* (no loop that
      transforms state) and exactly right for a viz.
- [ ] **model-evaluation/02-validation-strategies** — which rows are train and
      which are test, per fold, for k-fold / LOO / time-series split. Cheap and
      genuinely clarifying.
- [ ] **ml-in-practice/05-data-engineering-fundamentals** — row vs column
      storage. The lesson already has a "worked example: the 2% read"; showing
      which bytes each layout touches makes the factor obvious.
- [ ] **graph-neural-networks/03** — over-smoothing: node features collapsing
      toward each other as depth grows.
- [ ] **gpu-programming/04-gpus-for-deep-learning** — the roofline. Also serves
      `ml-in-practice/12` and `22`, which both lean on it.
- [ ] **computer-vision/01-object-detection** — IoU and anchor matching (NMS
      itself is already traced on `wiki/nms-algorithm`).
- [ ] **ml-in-practice/14-anomaly-detection** — the threshold problem: two
      overlapping score distributions and what moving the cut costs.
- [ ] **optimization-ml/03-constrained-optimization** — feasible region, level
      sets, and which constraints are active at the optimum.
- [ ] **nlp/02-word-embeddings** — embedding space with analogy arithmetic.
- [ ] **generative-models/01-what-are-generative-models** — a discriminative
      boundary and a generative density fit to the same points.
- [ ] **recommender-systems/01-the-recommendation-problem** — ranking metrics
      (precision@k, NDCG) computed live on a re-orderable ranked list.
- [ ] **optimization-ml/05-hyperparameter-optimization** — grid vs random vs
      successive halving over the same budget.
- [ ] **streaming-ml/01-batch-to-streaming** — tumbling / sliding / session
      windows, and event time vs processing time on the same event stream.
- [ ] **model-evaluation/03-training-techniques** — early stopping: train and
      validation curves with the patience window.
- [ ] **cnns/03-cnn-visualization-and-attacks** — the FGSM ε sweep.
- [ ] **fine-tuning-alignment/06-knowledge-distillation** — temperature
      softening a logit vector, and what soft labels carry that hard ones do not.
- [ ] **computer-vision/03-backbones-in-practice** — the accuracy/FLOPs Pareto
      front and compound scaling.
- [ ] **graph-neural-networks/01-graphs-as-data** — receptive field growth per
      message-passing layer.
- [ ] **causal-inference/02-interventions-and-potential-outcomes** — backdoor
      adjustment on the graph from lesson 01.
- [ ] **probability-statistics/01-thinking-in-probabilities** — conditional
      probability as areas; the comma vs the bar.
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
