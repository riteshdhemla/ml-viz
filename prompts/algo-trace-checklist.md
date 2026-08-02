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

## Round 4 — in progress (7 of 8 done)

- [x] **Isotonic regression (PAVA)** — `wiki/platt-scaling-and-isotonic-regression`
  - Pool-adjacent-violators is a merge loop, exactly the algo-viz shape.
  - Payoff: against Platt scaling on the same miscalibrated scores.
- [x] **Beam search** — `courses/nlp/05-decoding-and-sampling`
  - Very algo-viz-shaped (a frontier of hypotheses, pruned each step).
  - Payoff: beam width vs greedy on the same logits; length-normalization bug.
- [x] **Q-learning** — `courses/reinforcement-learning/02-q-learning`
  - `QTableViz` exists but no trace. TD update loop over a grid.
  - Payoff: on-policy vs off-policy target, or ε decay.
- [x] **SGD / momentum / Adam side by side** — `courses/optimization-ml/01-gradient-descent-variants`
  - The planned payoff ("same ill-conditioned surface, three optimizers, step
    counts") did not survive measurement twice over, and both failures are worth
    remembering:
    1. On an **axis-aligned** quadratic, Adam and RMSprop solve it in one step
       from (1, 1) — their per-coordinate step is exactly ±η, so η = 1 lands on
       the optimum. A tuning artifact, not a result. Switched to Rosenbrock,
       which the lesson already names as the stress test.
    2. **Best-case step counts are luck.** Adam finishes in 18 steps at η = 0.861
       and 262 at η = 0.871 — whether an iterate lands inside the tolerance is a
       coin flip. Reported the *width of the η band that converges at all*
       instead (SGD 0.7 decades, momentum 2.0, Adam 4.0), which is both stable
       under re-measurement and the thing practitioners actually mean.
  - It also turned up a wrong claim in the lesson: momentum is ahead at step 2,
    as the worked example says, but takes 51 steps against SGD's 26 to settle on
    that 1-D bowl. Prose corrected.
- [x] **Power iteration** — `wiki/eigenvalue-computation`
  - Runs on the page's own A = [[4, 1], [2, 3]], so it lands on the λ₁ = 5,
    v₁ = (1, 1) the reader just derived by hand.
  - Both payoffs held up under measurement, which is worth noting after the
    optimizer trace: the variants are built as **VΛV⁻¹ with V held fixed**, so
    the target eigenvector never moves and |λ₂/λ₁| is the only thing that
    changes. The measured per-step error ratio lands on 0.4000 and 0.9000 —
    exactly |λ₂/λ₁| — and step counts match log(tol)/log(ratio) to within 1.
  - It also surfaced a real defect in the page's listing: at λ = (5, −5) the
    iteration cycles with period 2 forever, and `norm(b_new - b) < tol` can
    never fire, so the function returns a meaningless λ with no error. Called
    out in the trace and in the page's "what to notice".
  - `linear-algebra/03` needs nothing — it already links out to this wiki page.
- [x] **Gradient boosting** — `courses/ensemble-methods/03-xgboost`
  - Traces XGBoost's *actual* inner loop rather than generic residual fitting:
    the second-order split score, the closed-form leaf weight −G/(H+λ), and both
    regularizers. That is what this lesson teaches, so a plain residual-fitting
    trace would have missed the page.
  - The AdaBoost contrast lands in frame 5 and is the sharpest framing found so
    far: gradient boosting **never touches a sample weight**. The misfit point's
    gradient simply grows on its own, and the split score is built from
    gradients, so attention reallocates itself.
  - Payoffs, both measured: λ shrinks leaf weights 100× across the sweep and
    (at round 6, λ ≥ 100) can reorder the candidates, because as λ dwarfs every
    leaf Hessian the score collapses to G² alone — verified against the
    G_L²+G_R² ranking. γ has a computable hard edge: the best gain in round 1
    is 1.083, so at γ = 1.09 *no* split ever clears the bar and 50 rounds leave
    the loss at exactly ln 2.
  - A dataset caveat worth reusing: the first label vector chosen was
    accidentally antisymmetric, which made two thresholds tie exactly on gain.
    Enumerate candidate datasets and require a unique argmax before building.
- [x] **Lasso coordinate descent** — `wiki/ridge-lasso-paths`
  - The page derives the condition that keeps a weight at zero but never runs
    the algorithm that enforces it, so the trace fills the actual gap.
  - Payoff landed as planned (exact zeros vs ridge's 0 zeros in 396 path
    points), but two *unplanned* measured results turned out stronger:
    1. Both noise columns have **marginal** correlations above λ (0.51, 0.70)
       and are killed only by the partial residual, which collapses them to
       ~0.08. That is precisely why the loop recomputes r.
    2. The correlated echo has a true weight of **zero** yet outlives both
       genuinely relevant features — so the page's "features drop in order of
       decreasing relevance" needed qualifying. Lasso ranks by correlation
       with the residual, not relevance to the target.
  - Also measured: 267 sweeps to converge with the echo, 5 without it, using a
    controlled A/B (the echo column is always drawn so the RNG state, and
    therefore y, is identical between variants).
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
