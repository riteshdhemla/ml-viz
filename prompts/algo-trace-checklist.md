# Algorithm Trace Checklist

Working queue for `<AlgorithmTrace>` coverage. Built from an audit of all 310
untraced `.mdx` pages under `src/content` (scored on: loops in fenced code
blocks, numbered procedure steps, presence of a hand-worked example, iterative
language). See `prompts/new-algorithm-trace.md` for how to build one.

**Selection rule:** a trace answers *"what does this code do, line by line?"* —
so the page must describe a **procedure** (a loop that transforms state), not a
shape, a taxonomy or an architecture. Pages that score high on numbered steps
but describe architectures (`agent-observability`, `text-to-sql`, `langgraph`,
`prompt-injection-attacks-and-defenses`, `agent-protocols-mcp-a2a`) are
deliberately excluded — a trace would be forced there.

**Do not duplicate.** Several lessons rank high in the audit only because their
concept is already traced on the corresponding wiki page
(`probabilistic-models/02-em-algorithm`, `clustering/01-k-means`,
`knn-decision-trees/02-decision-trees`, `ensemble-methods/02-boosting`,
`rnns/01`, `calculus-for-ml/03`). Those want a **link** to the existing trace,
not a second builder.

---

## Round 3 — done (all five shipped)

- [x] **Viterbi decoding** — `courses/graphical-models/03-hidden-markov-models`
  - Has "Worked example — Viterbi by hand" + a backpointer table: δ₁ = (0.06, 0.24),
    δ₂ = (0.0384, 0.0432), best path Sunny → Sunny.
  - The canonical trace shape: a DP table filling in, then backpointers walked in reverse.
  - Distinct from the existing `baum-welch` trace — same model, different algorithm.
  - **Payoff:** re-run the same lattice with `sum` instead of `max` (the forward
    algorithm) and show the two answer *different questions* — total evidence vs
    best single path.

- [x] **Value iteration** — `courses/reinforcement-learning/01-markov-decision-processes`
  - Has "Worked example — value iteration" with a 3-state MDP, γ = 0.9.
  - Bellman backups sweeping the state set; V converging.
  - **Payoff:** drop γ and watch the optimal *policy* itself change — discounting
    is not a convergence knob, it changes what "optimal" means.

- [x] **Continuous batching** — `wiki/continuous-batching`
  - Has "The scheduler loop" + "Worked trace".
  - Pairs directly with the existing `paged-attention` trace.
  - **Payoff:** static batching vs continuous — measured throughput and the
    head-of-line blocking that static batching cannot avoid.

- [x] **ROC curve construction** — `wiki/roc-auc`
  - Has "Constructing the ROC curve step by step".
  - Sweep the threshold, emit one point per step.
  - **Payoff:** re-run at 1:100 class imbalance — ROC barely moves, PR collapses.
    The single most useful thing on that page.

- [x] **Bloom filter** — `courses/streaming-ml/02-streaming-algorithms`
  - Has a full section; reservoir sampling sits alongside it in the same lesson.
  - **Payoff:** measured false-positive rate against the (1 − e^(−kn/m))^k
    prediction, and the k that minimizes it.

## Round 4 — strong candidates, need a worked example built

- [ ] **Isotonic regression (PAVA)** — `wiki/platt-scaling-and-isotonic-regression`
  - Pool-adjacent-violators is a merge loop, exactly the algo-viz shape.
  - Payoff: against Platt scaling on the same miscalibrated scores.
- [ ] **Beam search** — `courses/nlp/05-decoding-and-sampling`
  - Very algo-viz-shaped (a frontier of hypotheses, pruned each step).
  - Payoff: beam width vs greedy on the same logits; length-normalization bug.
- [ ] **Q-learning** — `courses/reinforcement-learning/02-q-learning`
  - `QTableViz` exists but no trace. TD update loop over a grid.
  - Payoff: on-policy vs off-policy target, or ε decay.
- [ ] **SGD / momentum / Adam side by side** — `courses/optimization-ml/01-gradient-descent-variants`
  - Payoff: the same ill-conditioned surface, three optimizers, step counts.
- [ ] **Power iteration** — `wiki/eigenvalue-computation` (+ `linear-algebra/03`)
  - Payoff: convergence rate governed by |λ₂/λ₁|; fails on equal-magnitude eigenvalues.
- [ ] **Gradient boosting** — `courses/ensemble-methods/03-xgboost`
  - Fitting residuals; a deliberate contrast against the existing `adaboost-rounds`.
- [ ] **Lasso coordinate descent** — `wiki/ridge-lasso-paths`
  - Payoff: coefficients hitting exactly zero vs ridge only shrinking.
- [ ] **Backprop on a computational graph** — `courses/calculus-for-ml/02-chain-rule-and-backpropagation`
  - Forward then backward through a small graph; `ComputationalGraphViz` exists.

## Round 5 — plausible, lower priority

- [ ] **DAgger** — `wiki/imitation-learning` (aggregate, retrain, repeat)
- [ ] **IVF search** — `wiki/vector-databases` (probe the nearest centroids; pairs with `hnsw-search`)
- [ ] **Walk-forward validation** — `wiki/walk-forward-validation` (fold construction; payoff = leakage under random K-fold)
- [ ] **ARIMA order selection** — `wiki/arima-order-selection` (AIC grid search)
- [ ] **FastICA** — `wiki/independent-component-analysis`
- [ ] **ADWIN** — `wiki/adwin` (window shrinking on drift)
- [ ] **Reservoir sampling** — `courses/streaming-ml/02` (payoff: measured uniformity over replicates)
- [ ] **DDIM sampling** — `wiki/ddim-sampling`
- [ ] **Gibbs sampling / ICM** — `courses/graphical-models/02-markov-random-fields`
