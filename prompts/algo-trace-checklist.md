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

## Round 4 — done (all eight shipped)

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
- [x] **Backprop on a computational graph** — `courses/calculus-for-ml/02-chain-rule-and-backpropagation`
  - `ComputationalGraphViz` already draws the DAG, so the trace deliberately
    does not: it moves the *numbers* through it. Runs the lesson's scalar
    example (w=2, x=3, y=5 → ∂L/∂w = 6) then the same procedure on the MLP.
  - Weights are small explicit constants rather than a seeded draw, chosen so
    one hidden unit lands at z₁ = −0.1 and is gated off. The sharpest frame in
    the set: ∂L/∂a₁ = 0.1215 (non-zero — the loss *is* sensitive to that
    activation) while ∂L/∂z₁ = 0 exactly. Different quantities, and the gate is
    what separates them; that is dying ReLU in one table.
  - Payoffs: every gradient checked against a central finite difference (worst
    relative error 3.9e-11, and the five zero gradients come back as exact
    numerical zeros), and the cost of that check counted — 22 forward passes
    against backprop's single backward pass.

## Round 5 — plausible, lower priority

- [x] **DAgger** — `wiki/imitation-learning` (aggregate, retrain, repeat)
  - **The first build produced a clean negative result and it reshaped the
    trace.** The learner was a linear controller fitted against a linear PD
    expert — the same hypothesis class — and behavioural cloning then worked
    fine in 12 seeds across 7 gain settings, with DAgger winning only 3–8/12,
    i.e. noise. When the hypothesis class is globally correct, extrapolation is
    exact and covariate shift costs nothing. Compounding error needs a learner
    that *cannot* extrapolate, so the shipped trace uses a k-NN clone.
  - Payoffs, both measured over replicates with the evaluation world held fixed:
    1. A **steadier expert makes a worse clone**, monotone across all seven
       noise levels (BC cost 9.48 → 0.090, a 105× swing) while DAgger stays in
       0.056–0.124. The clone cannot output a correction larger than the largest
       one in its data, and expert competence is what keeps that number small.
    2. The **validation metric is blind**: on held-out expert states the clone
       and the DAgger policy are identical (0.019 vs 0.019); on the states they
       each visit they are 62.4 vs 1.25, DAgger winning 24/24 seeds.
  - Reported as **medians**: own-state error is heavy-tailed (22.7 to 712.9
    across 24 seeds) and two runaway seeds pull the mean 2.2× above typical.
  - The page's O(εT²) bound is **not** claimed by the trace — measured growth
    exponents are 0.44 (BC) and 0.29 (DAgger), because both policies stabilise.
    What holds is that BC's disadvantage widens with horizon (1.8× at T=10 to
    3.7× at T=200), and the page now says exactly that.
- [x] **IVF search** — `wiki/vector-databases` (probe the nearest centroids; pairs with `hnsw-search`)
  - The walkthrough query is **selected, not placed**: the first query in a
    seeded 400-query evaluation set whose true nearest neighbour `nprobe = 1`
    fails to return. Both miss rates are reported (44% lose some true
    neighbour, 12% lose the nearest one) so one example is never passed off as
    typical.
  - Payoff 1: the measured candidate count tracks the page's own
    N·nprobe/nlist estimate to within a few percent across the whole sweep, so
    the back-of-envelope is a real planning tool. Recall saturates at 3/16
    cells (99.7%) — the other 13 are pure cost.
  - Payoff 2, the one worth having: **recall at nprobe = 1 is barely a property
    of the index.** Split 400 queries into quartiles by how close their two
    nearest centroids are and recall runs 100.0% (deep inside a cell) to 55.6%
    (on a boundary) at the same setting; nprobe = 3 converges them to 100.0%
    vs 98.6%. What nprobe buys is recall for the *unlucky* queries.
  - Note for future traces: the player numbers frames **1-indexed**
    (`{i + 1}/{total}`), so "what to notice" bullets must offset from the
    builder's array index.
- [x] **Walk-forward validation** — `wiki/walk-forward-validation` (fold construction; payoff = leakage under random K-fold)
  - Frames 1–8 reproduce the page's hand-worked table exactly (MAE 2.00), so
    trace and prose cannot drift. The per-fold errors are 1,2,3,1,2,3 — a
    systematic lag against the trend that the average CV number destroys, and
    worth a frame of its own.
  - The page's predictor **cannot show expanding vs sliding**: mean-of-3 reads
    three points regardless of window size, so both schemes tie. Added a frame
    with two predictors that use the whole window, where sliding (3.50) beats
    expanding (4.83) because old data drags a trending average down.
  - Payoff framed as a **model-selection** failure rather than a single wrong
    number, which is what makes it bite: scoring 8 polynomial degrees, random
    5-fold's error *falls* with degree (1.97 → 1.55) while walk-forward's
    *rises* (2.15 → 3.53). Opposite directions, because random folds reward
    interpolation and walk-forward punishes extrapolation. k-fold picks degree
    6–8 in 20/20 seeds, walk-forward 1–2 in 20/20, and k-fold's pick loses on a
    held-out future 20/20 (33× to 849×, median 204×).
  - **Statistic caught mid-build:** the one-sided median lands on 289.9 against
    a mean of 290.0 here, pure coincidence — the ratios are bimodal (33–119,
    then 290–849). Fixed to a two-sided median and the full range is quoted, so
    no single number implies a concentration the data does not have.
- [x] **ARIMA order selection** — `wiki/arima-order-selection` (AIC grid search)
  - **Building this trace showed the page's worked example was fabricated**, and
    the fix was to replace the series, not to patch numbers. The old series was
    exactly periodic with period 6, so it was not an ARIMA realisation at all.
    Running the page's own Python against it gave: ACF ρ₂ = −0.479, ρ₃ = +0.875
    against the claimed 0.08 and 0.04 and an assertion that it "cuts off after
    lag 1"; an ADF statistic of −8.3e13 (degenerate — a deterministic series has
    no unit root to test); |φ₄₄| = 1.31, impossible for a real PACF; AIC 190.8
    for the declared winner against the claimed 142.3; and a true grid winner of
    ARIMA(2,1,2) at 138.3 — the page's winner was among the *worst* models.
  - The forecast was wrong in the most instructive way: statsmodels returns a
    **flat** 109.49 at every horizon because `ARIMA(order=(0,1,1))` carries no
    constant when d ≥ 1, while the page reported a series rising 2.0 a step.
    That trap is now a Callout on the page.
  - New series drawn from a genuine ARIMA(0,1,1)-with-drift process and screened
    over 400 seeds for the textbook signature the page teaches (raw
    non-stationary, differenced stationary, ACF cutting at 1, PACF tailing, AIC
    grid selecting (0,1,1), Ljung-Box passing).
  - **Estimator choice worth reusing:** conditional sum of squares with
    coordinate descent, rather than exact MLE, is implementable from scratch and
    was validated against statsmodels on all nine candidates — identical ranking
    across the whole grid, AIC agreeing within 0.9. Prototype the estimator in
    Python against the real library *before* porting to TypeScript.
  - Payoff 1: over-differencing triples the variance (11.85 → 35.22) and pushes
    θ̂ from −0.84 to −0.99, i.e. onto the unit MA root that differencing itself
    introduced. Makes the page's existing Callout concrete.
  - Payoff 2, the better one: every model nesting the winner comes in at +1.96,
    +3.92, +5.61 AIC ≈ 2k. When the extra parameter is useless the likelihood
    does not move, so the whole gap *is* the penalty — **AIC can never prefer
    the simpler nested model by more than 2 per parameter**. BIC's ln T = 3.56
    makes the same call 1.8× more decisively. A 2-point AIC win is weak evidence
    by construction.
- [x] **FastICA** — `wiki/independent-component-analysis`
  - Payoff is the page's own central claim, measured: on Gaussian sources the
    identical pipeline converges confidently to a different arbitrary direction
    every run (spread 82.7 deg of an available 90, against 0.36 deg for
    non-Gaussian sources). It does not error or fail to converge, which is what
    makes the failure dangerous.
  - **Two metric choices were wrong on the first attempt; both are worth
    remembering because both looked fine until printed.**
    1. Comparing raw recovered angles conflated instability with the
       *permutation* indeterminacy — the two components sit 90 deg apart, so
       returning them in either order registered as a 90 deg "spread" and made
       the good case look as unstable as the bad one. Folding into [0, 90)
       isolates what is actually being measured.
    2. Any "how well did it match the right source" score is useless here: a
       recovered basis is *some* rotation of the true one, so the matched
       correlation is |cos t| and cannot fall below 0.71 however arbitrary t
       is. A random rotation scored ~0.92 and looked like success. **Cross-talk**
       — the leakage of the *other* source, |sin t| — discriminates: 0.011
       against 0.328. Aggregating differently (worst-of-two rather than
       best-of-two) did not help, because both matched correlations are equal
       by symmetry; the metric itself had to change.
  - Also caught by printing: the iteration table recorded only post-update
    state, so with cubic convergence row 1 already showed the answer and nothing
    appeared to move. Seeding row 0 with the starting direction and starting 47
    deg away from the solution makes the swing visible.
- [x] **ADWIN** — `wiki/adwin` (window shrinking on drift)
  - The page's worked cut arithmetic checks out exactly (m = 50,
    ε_cut = 0.3111) and the trace reproduces it before moving on.
  - **Both payoffs contradicted the draft prose and were rewritten from the
    measurements. Both corrections are better than what they replaced.**
    1. "ADWIN beats every fixed window" is **false**: a fixed W = 100 scores
       0.0526 against ADWIN's 0.0545. The true claim is the page's own — ADWIN
       lands within 4% of the best fixed width *without being told what it is*,
       while the spread across plausible widths is 2×, and on a live stream the
       best width is unidentifiable because finding it needs the ground truth.
    2. The famous δ trade-off is **one-sided** at these stream lengths: delay
       grows 2.4× across five orders of magnitude while false alarms stay at
       zero across 300,000 stationary steps even at δ = 0.5. δ sits inside a
       log inside a square root, so the Hoeffding threshold is far looser than
       the nominal δ. Practical advice inverts: pick δ loose. The page now says
       so, qualifying its own "larger δ ⟹ more false alarms" rule.
  - **Performance note for future traces:** the first version tested all |W|−1
    splits with freshly computed means and took **72 seconds** to load, which
    would have made the whole integrity suite unusable (every trace builds at
    module load). Prefix sums plus ADWIN2's geometric bucket-boundary splits
    brought it to 2.7s *and* made it closer to the published algorithm. Check
    module build time whenever a trace loops over a stream.
- [x] **Reservoir sampling** — `courses/streaming-ml/02` (payoff: measured uniformity over replicates)
  - The lesson already has `ReservoirSamplingViz` animating the acceptance rule
    and proves uniformity by induction, so the trace does neither again. It
    walks one run to make the *eviction* step visible, then audits the proof:
    200,000 runs, every element's survival rate within 2.5 standard errors of
    k/n = 0.25.
  - Payoff is the contrast with two wrong versions that both keep the k/t
    acceptance rule the lesson states. Evict the oldest slot instead of a
    uniformly chosen one and element 1 survives 55x less often than it should;
    accept with 1/t instead of k/t and the reservoir goes stale, holding its
    first three elements 65% of the time. The biases point opposite ways and
    neither is visible in a single run — the reservoir is always the right size
    and always plausible. Only the frequencies show it.
  - A draft claim ("the survival rates no longer sum to k") was **printed and
    caught as self-contradicting** — they always sum to k, since the reservoir
    always holds exactly k elements. Printing every frame's rendered numbers
    before writing the prose catches this class of error.
- [x] **DDIM sampling** — `wiki/ddim-sampling`
  - **Technique worth reusing for any sampler trace:** a sampler needs a noise
    predictor and training one is out of scope, so pick a data distribution
    whose *optimal* predictor is closed-form. For a Gaussian mixture the
    marginal at every noise level is itself a mixture, so eps* is exact — which
    also isolates the sampler's discretisation error from model error, and that
    is precisely what the "~20x speedup" claim is about.
  - Main payoff: endpoint error against a 1000-step reference from the same
    start falls 1.651 (2 steps) to 0.027 (50), monotonically.
  - **The eta payoff's first version measured something meaningless** and was
    replaced. It scored samples by distance to the nearest mode and concluded
    eta=1 beat DDIM (0.166 vs 0.228) — but a correct draw from this mixture
    sits ~sigma = 0.18 from a mode centre, so "closer" is just
    "under-dispersed", not better. With a perfect eps both samplers target the
    right distribution. The well-posed measurement is that eta > 0 destroys the
    endpoint's *dependence on the input*: two runs from an identical start land
    2.14 apart at 50 steps. That is what breaks interpolation and seeds.
  - Added a schedule frame after the integrity test caught a 5-frame trace
    (minimum is 6), and it earned its place: tau is evenly spaced in t but
    **not** in sqrt(alpha-bar), with the first half of the schedule buying only
    20% of the signal. That is the argument for non-uniform step schedules.
- [x] **Gibbs sampling / ICM** — `courses/graphical-models/02-markov-random-fields`
  - The lesson's dE = 12 - 4d derivation is confirmed exactly, and then two
    consequences it does not mention get measured.
    1. The **d = 3 tie is a live defect**, not a boundary case. ICM reaches its
       final energy after one sweep and never moves again, while the error
       keeps drifting 4.5% -> 5.5%: dE is exactly 0 for those pixels, so the
       tie-break flips them back and forth for free. Converged in energy, still
       wandering in image space, and getting worse.
    2. The lesson's eta/beta = 0.5 gives 5.8% error against 2.3% at eta/beta
       >= 1.
  - **Two drafted claims died to the measurement, and the page now says so.**
    The over-smoothing arm of the eta/beta curve does not exist — error
    plateaus at 2.3% out to eta/beta = 40, because this test image is genuinely
    piecewise-constant with thick regions, so the prior's assumption is true and
    more of it never costs anything. And annealed Gibbs does **not** beat greedy
    ICM here (-945 against -947), so the frame makes the honest point instead:
    Gibbs at T=1 is worse on both energy and error because drawing from exp(-E)
    is a different job from minimising E.

## Round 5 — complete (all nine shipped)

## Round 6 — from a fresh audit (42 pages now carry a trace)

Re-scored every untraced `.mdx` on the original criteria (loops in fenced code,
numbered procedure steps, worked examples, iterative language), then applied the
selection rule by hand. 47 pages scored >= 5; most were correctly rejected.

**Rejected despite scoring high** — architectures and taxonomies, where a trace
would be forced: `cnns/04-transfer-learning` (a workflow, not a loop),
`generative-models/06-vit-and-modern-genai`, `building-with-llms/01`, `/02` and
`/07` (prompting taxonomies), `agent-design-patterns/05`,
`streaming-ml/01-batch-to-streaming`, `model-evaluation/03-training-techniques`,
`wiki/vc-dimension` (a concept with a viz already).

**Rejected as duplicates** — the concept is already traced on the corresponding
wiki page, so these want a *link*: `probabilistic-models/02-em-algorithm`
(`em-gmm`), `rnns/01` (`bptt-gradient-flow`), `transformers/01-self-attention`
(`scaled-dot-product-attention`), `neural-networks/02-gradient-descent`
(`optimizer-comparison`), `time-series/02-arima-models`
(`arima-order-selection`), `speech-audio/02` (has the CTC guided walkthrough).

Genuine candidates:

- [x] **FlashAttention online softmax** — `courses/transformers/04-modern-attention`
  - Both of the page's unshowable claims measured. Exactness holds to float64
    rounding: max |standard − tiled| is 2.22e-16 across all 48 output
    components. Worth stating explicitly on the page, because it makes
    FlashAttention categorically unlike sparse or low-rank attention — any
    output difference is a bug, not a knob.
  - The **rescale** is the frame that earns the trace. When block 1 raises the
    running max from 0.634 to 0.862, every partial result accumulated before
    that moment is wrong by exactly exp(m_old − m_new) = 0.7957, and one scalar
    repairs all of it. Block 2's rescale is exactly 1.0000 — the correction
    fires only when the max actually moves, which is easy to miss in prose.
  - Payoff: deleting the running max fails **completely, not gradually**, and
    the sweep brackets the threshold — finite at a max score of 704.1, NaN at
    751.0, with ln(MAX_FLOAT64) = 709.78 between them. Not a precision
    trade-off; both compute the same real number and only one can represent the
    intermediates.
  - Build note: the first overflow sweep topped out at a max score of 188 and
    never crossed the ceiling, so `firstFail` was undefined and the builder
    threw. It now asserts that the sweep straddles the ceiling rather than
    silently reporting whatever it found.
- [x] **IRLS for GLMs** — `courses/linear-regression/04-generalized-linear-models`
  - The lesson's callout says GLMs share the gradient; the loop shows they
    share the *whole fitting algorithm*, with only the inverse link and the
    variance function differing. Gaussian converges in exactly 1 iteration
    (identity link ⇒ weights all 1, z = y, so the first weighted least-squares
    solve is OLS), Bernoulli in 7, Poisson in 10 — same code.
  - **Two drafted claims were contradicted by the numbers.**
    1. "Quadratic convergence" is only true of the *second half*: the Poisson
       run crawls for five steps (2.25 → 0.28, a factor of 8 total) and then
       squares the error five times (9e-2 → 1e-2 → 1e-4 → 1e-8 → 1e-15).
       Newton's guarantee is local, and the frame now shows both halves rather
       than quoting the headline rate.
    2. "Gradient descent needs thousands of iterations" is false — 83 at its
       best learning rate against IRLS's 10. The honest cost is the 18× spread
       across learning rates plus outright non-convergence at 0.5, just past
       the best one: a hyperparameter on a narrow range that IRLS lacks
       entirely.
  - Separation payoff landed as planned and is the sharpest frame: the MLE does
    not exist, and the loop cannot say so. ‖θ‖ climbs to 110, weights μ(1−μ)
    collapse to 1e-12, det(XᵀWX) falls 140 → 1e-6. No error, no failure to
    converge — just enormous coefficients with enormous standard errors, which
    come from inverting exactly that collapsing matrix.
- [x] **BatchNorm** — `wiki/batchnorm-algorithm`
  - Reproduces the page's worked example exactly (x = 2,4,6,8 -> y = -1.683,
    0.106, 1.894, 3.683) and confirms both stated identities, mean(y) = beta
    and var(y) = gamma^2. Also shows the layer contains the identity function:
    gamma = sqrt(var_B), beta = mu_B returns the input with error exactly 0.
  - **The page's own EMA code comment was wrong and is corrected.** It claimed
    the running mean "converges toward 5" after five batches; it reaches
    2.0392, a 59% error, and needs 44 batches at alpha=0.1 to come within 1%.
    That warm-up bias is a commoner cause of "eval mode is broken" than
    forgetting model.eval() — for a fixed input the eval output drifts
    11.99 -> 2.79 as the EMA warms up.
  - Second payoff is exact rather than statistical: at m = 1 the variance is
    not "undefined" as the page's callout says, it is exactly **zero**, so
    x_hat = 0/sqrt(eps) = 0 and y = beta for every input. 2, 40 and -1000 all
    return 1.0. The batch-size sweep shows m=1 is not the endpoint of the
    small-batch noise trend (sd 1.771 at m=2 down to 0.278 at m=64) but a
    different failure entirely.
- [x] **Durbin-Levinson / PACF** — `wiki/acf-pacf-interpretation`
  - Reproduces the page's hand-worked ACF exactly, then carries the recursion
    past lag 2 where the page stops giving formulas, cross-checking every phi_kk
    against a direct solve of the k x k Yule-Walker system (agreement 1e-16).
  - Payoff is a caution about the page's own pattern table: over 600 replicates
    the AR(2) PACF satisfies "cuts off at lag 2" only 68.7% of the time at ten
    lags and 38.5% at twenty, and **more data does not help**. The ceiling is
    0.95^(L-2) — "inside the band at every later lag" is L-2 independent
    5%-level tests — so inspecting more lags makes the diagnosis *less*
    reliable. Largest gap to prediction 2.4pp against a +/-1.9pp standard error.
  - Second half explains the page's own Bartlett remark, which it frames as a
    refinement: with the naive band the MA(2) ACF reads correctly only 55.3% of
    the time, below even that ceiling, because the band assumes white noise
    while the significant rho1, rho2 inflate the true SE at later lags.
    Bartlett recovers it to 67.8%.
  - **Sample-size note:** a first version used 150 replicates and reported a
    5.6pp gap to the ceiling, which was noise, not a systematic deviation. The
    measurement costs 0.7s, so it runs 600. Check the standard error before
    reporting a gap as a finding.
- [x] **REINFORCE** — `courses/reinforcement-learning/04-policy-gradient`
  - Environment is a **one-step episode** (3-armed bandit, softmax policy),
    chosen so the exact gradient, the exact variance under any baseline, and
    the exact variance-minimising baseline are all closed-form. Worth reusing:
    pick the smallest setting where nothing has to be estimated that could
    have been derived.
  - Payoff 1 measures both halves of the lesson's claim. "Doesn't bias the
    gradient" is exact and does **not** depend on choosing well — four
    baselines including two deliberately wrong ones all recover the exact
    gradient, because E[grad log pi] = 0 identically. Only variance moves:
    64.5 with none, 0.697 at V (93x), 1.49 one unit away from V.
  - Payoff 2 qualifies "the best baseline is the value function". The
    variance-minimising baseline is b* = E[||g||^2 G]/E[||g||^2], a
    gradient-weighted average of returns, **not** V — but it beats V by only
    1.3% against the 93x V already bought, so the textbook shortcut is well
    justified rather than wrong.
  - The failure that does matter is a baseline depending on the **action**:
    b(a) = E[G|a] drives the expected gradient to norm 1.8e-3 against a true
    0.229. Learning stops dead with no error raised. That is why the lesson
    writes b(s) and not b(s,a), and why the actor-critic advantage stays legal.
  - `npx next lint` caught two `prefer-const` **errors** (not warnings) here,
    which would have failed CI. Run lint, not just type-check and tests.
- [x] **Bagging / OOB** — `courses/ensemble-methods/01-bagging-and-random-forests`
  - Fits **real CART regression trees** over 50 independent training sets so the
    lesson's Var = rho*sigma^2 + (1-rho)*sigma^2/B can be checked rather than
    restated. It holds, and the floor is visible: by B=40 the second term is
    0.02 while the first sits at 0.18.
  - Best frame is the RF trade, which is sharper than "RF is better": sampling
    2 of 5 features drops rho 0.172 -> 0.072 as the lesson says, but per-tree
    sigma^2 **rises** 1.05 -> 1.83, because a tree denied the best split is a
    worse estimator. The floor falls 28% anyway. RF deliberately buys a worse
    individual model to get decorrelation more trees can exploit.
  - Also checks "reduces variance without increasing bias" — bias is identical
    between one tree and the 40-tree ensemble, since averaging is linear. Which
    says what bagging is *not* for, and why boosting exists.
  - **The OOB frame reported a single run first and contradicted itself**: that
    draw had OOB *below* test while the prose argued OOB errs conservative. The
    per-run gap has sd 0.73 against a mean of 0.19, so one dataset flips the
    sign a third of the time. Replicated over 45 datasets the gap is
    +0.186 +/- 0.111 — magnitude only 1.7 SE from zero, direction better
    resolved at 30/45 — and the frame now states both rather than picking the
    tidier reading.

## Round 6 — complete (all six shipped)

Rounds 3 through 6 are done: 48 traces. A further round needs a fresh audit;
the rejected-page reasoning above is worth re-reading first so it is not
re-derived.
