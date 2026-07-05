# Content Review Notes

Append-only findings from `prompts/content-review-plan.md`. **Format per item:**

```
## <queue item> — <date>
### <course/lesson-slug or wiki/slug> — grasp N/5
- P1|P2|P3: <finding> → <proposed improvement>
- no issues            (when clean — say so explicitly)
```

Severity: **P1** blocks understanding · **P2** real friction · **P3** polish.
Notes are proposals, not commitments — triage happens after the queue completes.

---

## Seed notes (spot review during Langfuse/OTel/sub-agent content addition) — 2026-07-02

Scope: only the four pieces read end-to-end while adding the new wiki pages.
The full course items in the queue remain unchecked — these are early samples,
not substitutes for the full pass.

### building-with-llms/09-llm-observability-and-prompt-management — grasp 4/5
- P2: The trace/span tree — the lesson's central mental model — is described in
  text only. A small static trace-waterfall figure (or a `viz-kit` component
  showing spans nesting under a request) would carry the concept in seconds.
  → candidate `TraceWaterfallViz`, reusable by agent-design-patterns/11.
- P2: Drift section names three drift types but shows no concrete "proxy
  catches it" example → add one 2-line example (e.g. format-validity rate
  dropping after a provider model update).
- P3: In the cost formula, $n$ and $p$ are only defined by subscript naming
  → add "where $n$ = tokens, $p$ = price per token" inline.
- P3: (addressed 2026-07-02) no pointer to concrete tooling/standards
  → `<WikiLink slug="langfuse-and-opentelemetry">` added.

### agent-design-patterns/07-multi-agent-cooperation-patterns — grasp 4/5
- P2: Condorcet's jury theorem is the lesson's one mathematical claim, given as
  a formula plus two spot values. A tiny plot of $P(\text{majority correct})$
  vs $N$ for a few $p$ curves would make "approaches 1" *visible* → candidate
  mini-viz or static figure; at minimum a 3-row table ($N$=1,5,11).
- P2: The debate synthesis equation uses $\text{score}(A_r)$ without ever
  defining the score function; as written the equation adds confusion, not
  rigor → either define it ("mediator's per-round rubric grade") or drop the
  equation and keep the 3-step protocol.
- P3: Borda count appears in the table without a worked one-liner; it's the
  only aggregation rule a newcomer likely hasn't met → 1-sentence example
  (3 options, 3 voters).
- P3: (addressed 2026-07-02) control-flow axis (sequential/parallel/loop) was
  absent → `<WikiLink slug="sub-agent-orchestration">` added.

### agent-design-patterns/11-deploying-agents — grasp 4/5
- P2: Six systems topics (topology, checkpointing, HITL, guardrails,
  observability, cost) in one 20-minute lesson is the densest pacing in the
  course; the checkpointing/state-graph section in particular compresses a big
  idea into four bullets → link the state-graph paragraph to `/wiki/langgraph`
  (page exists, currently only linked from building-with-llms/05).
- P3: "Thought / Action / Observation" loop vocabulary is used here but defined
  two courses away (building-with-llms/05) → add the back-link at first use.
- P3: (addressed 2026-07-02) observability bullet now links to
  `<WikiLink slug="agent-observability">`.

### wiki/agent-protocols-mcp-a2a — grasp 5/5
- P3: JSON-RPC 2.0 is assumed known; a half-sentence gloss ("a minimal
  request/response format over any transport — method, params, id") would cover
  the beginner reading this from the agents lesson.
- P3: The A2A task lifecycle states are listed inline; a tiny state diagram
  (`submitted → working → input-required → completed/failed`) as a code block
  would make mistake #4 ("ignoring task lifecycle") land harder.
- Otherwise a model example of the wiki format: concrete wire examples, a
  composition diagram, a comparison table, and security framing.

### Recurring themes to watch for in the full pass
1. **Applied-course lessons are viz-poor**: foundations/classical courses
   average ~1 viz per lesson; building-with-llms and agent-design-patterns
   lessons are mostly text + tables. Where a concept is a *tree, flow, or
   loop* (traces, orchestration topologies, agent loops), a small SVG viz is
   likely the single highest-impact improvement.
2. **Equations without defined symbols** show up even in otherwise strong
   lessons — rubric dimension 3 deserves explicit attention.
3. **Cross-course vocabulary** (ReAct loop, trace, span, HITL) is defined once
   and reused across courses without back-links; learners entering via search
   land mid-vocabulary. Consider a "first use in this lesson → link" rule.

---

## linear-algebra — 2026-07-02

Scope: index + 4 lessons + quiz, 10 registry exercises, all 4 notebooks
(skimmed for structure). Assumed prerequisites: none (course lists `[]`).

### linear-algebra/01-vectors-and-spaces — grasp 5/5
- P3: the house example packs the *target* (price) into the feature vector
  `[1500, 3, 300000]`; every later lesson separates x and y → add a clause
  ("here we treat price as just another coordinate") or drop price.
- P3: "linearly independent" is used in the basis definition one section
  *before* it is defined → swap the two sections or add "(defined below)".
- P3: all three exercises sit below "Related concepts" at the very bottom;
  `linalg-dot-product` would land better right after the projection section
  (course-wide pattern — see themes).
- Otherwise exemplary: numeric worked examples, VectorViz placed exactly where
  the dot product is taught, and the "Connection to ML" section is the best
  motivation block in the foundations cluster.

### linear-algebra/02-matrices-and-transformations — grasp 4/5
- P2: the worked example composes "do S (scale), then R (rotate)" as RS, but
  the code block beneath uses different letters *and the opposite order*
  (A=scale, B=rotate, `A @ B` = rotate-then-scale). A learner checking the code
  against the math gets a false confirmation → reuse R/S and compose `R @ S`.
- P3: the composition snippet prints a result with no expected-output comment;
  every other snippet in the course annotates results inline.
- P3: PSD appears in the special-matrices table as a bare quadratic form with
  no intuition, then resurfaces in lesson 03's SVD callout → one clause
  ("directions are never flipped; variances can't be negative").
- P3: MatrixTransformViz sits directly under the "The determinant" heading
  *before* the determinant is defined → move it after the definition paragraph
  or give it a one-line lead-in.

### linear-algebra/03-eigenvalues-and-eigenvectors — grasp 4/5
- P2: "We used SVD briefly in the PCA connection above" is false — the PCA
  section never mentions SVD; the dangling reference sends the reader scrolling
  back for something that isn't there → rewrite the SVD section opener.
- P2: the SVD section predates lesson 04 and now duplicates it (worse) — trim
  to a 3-sentence teaser + forward link to
  `/courses/linear-algebra/04-svd-and-low-rank`, and add lesson 04 to Related
  concepts (currently absent). This also fixes the P2 above.
- P3: PCA snippet lacks `import numpy as np` and an rng seed (course
  convention elsewhere is seeded, self-contained snippets).
- P3: "Trace = total variance preserved" is asserted for general matrices;
  it's a covariance-matrix statement → qualify.
- Good: the `eigenvalue-computation` WikiLink is exactly the right extraction;
  the 2×2 worked example including the null-space step is complete.

### linear-algebra/04-svd-and-low-rank — grasp 5/5
- Strongest lesson in the course: geometric rotate–stretch–rotate framing,
  numeric Eckart–Young example, code that *verifies* the theorem, viz sweep,
  and a genuinely transfer-level exercise.
- P3: it name-drops "the spectral theorem" as if known; lesson 03's symmetric
  callout teaches the fact but never names it → add the name in 03 for
  continuity.

### linear-algebra/05-quiz — grasp 3/5
- P2: the quiz reuses six exercise ids the learner already answered inline in
  lessons 01–03 — zero new assessment, and since results key by exercise id in
  the progress store they can render pre-answered. → new ids with fresh
  numbers/scenarios, ideally at the transfer level of `linalg-svd-rank`.
- P2: no question covers lesson 04 even though `linalg-svd-rank` exists →
  add it to the quiz.

### Exercises (registry)
- Well-formed throughout: hints, explanations, plausible distractors (e.g.
  `linalg-dot-product`'s 14 = catching pairwise-max confusion). Mostly
  recall/compute level; `linalg-svd-rank` shows the transfer-level bar the
  rest could aim for. `linalg-orthogonality`'s distractor "Depends on the
  norms" is a nice misconception catch.

### Notebooks
- All four follow the standard structure (back-link, dark style, "Your turn"
  with `TODO(you)` + silent asserts). No issues found on structural skim.

### Course meta
- P3: `CLAUDE.md` roadmap says "course + 3 lessons" (it's 4 + quiz), and
  LowRankViz is missing from the viz registry table.
- `estimatedHours: 3` checks out (68 lesson-min × 2.5 / 60 ≈ 2.83 → 3.0). ✓

### Themes reinforced
- Exercises stacked at lesson bottom instead of after the concept they test
  (also seen in seed notes) — worth a course-wide convention decision.
- Snippets should be self-contained (imports + seed) — violated once here.

---

## calculus-for-ml — 2026-07-02

Scope: index + 4 lessons + quiz, 12 registry exercises, all 4 notebooks
(structural skim: back-link, Your-turn, TODO(you), asserts all present ✓).
Assumed prerequisites: none (course lists `[]`).

### calculus-for-ml/01-derivatives-and-gradients — grasp 5/5
- P3: the ReLU derivative case statement silently omits $x = 0$ — the first
  question a careful learner asks → add "undefined at 0; frameworks just pick
  0 (a subgradient)".
- P3: the directional-derivative paragraph defines the same concept twice in
  consecutive sentences with two different direction symbols ($\hat{v}$, then
  $\hat{d}$) → merge into one definition with one symbol.
- P3: Common-mistake #2 is about chain-rule ordering, which isn't taught until
  lesson 02 → move it there or add a forward link.
- Strong: sigmoid-derivative derivation ends in a numeric saturation check;
  the gradient-checking snippet annotates expected outputs.

### calculus-for-ml/02-chain-rule-and-backpropagation — grasp 5/5
- Best-in-class lesson: the numeric backward pass ($w{=}2, x{=}3, y{=}5$) plus
  the "upstream × local" framing makes backprop mechanical, and the
  BCE+sigmoid collapse is derived rather than asserted.
- P3: code snippet uses unseeded `np.random.randn` — course convention
  elsewhere is seeded, reproducible snippets.
- P3: ComputationalGraphViz appears *above* the "Computational graphs"
  section that explains what it depicts → move below that section's intro
  paragraph or add a one-line lead-in.

### calculus-for-ml/03-multivariable-optimization — grasp 4/5
- P2: the callout attributes "any local minimum is close to the global one" to
  "the lottery ticket intuition" — mislabel: the lottery-ticket hypothesis is
  about sparse trainable subnetworks, not loss-landscape minima quality →
  drop the parenthetical (or reference loss-landscape results instead).
- P2: "the fastest *stable* choice that balances both directions is
  $\eta^* = 1/\lambda_{\max} = 0.25$" — for this quadratic the balanced
  optimum is $2/(\lambda_{\max}{+}\lambda_{\min}) = 0.4$ (contraction 0.6 in
  both directions vs 0.75 at $\eta{=}0.25$). $1/\lambda_{\max}$ is a safe
  default, not the fastest balanced rate → reword or teach the real formula.
- P3: "the Lipschitz constant $L$" — of the *gradient*; unstated as written.
- P3: the Lagrange section is the only one in the course with no worked
  example and no exercise → add a forward link to SVM max-margin where the
  learner will actually use it.
- Strong: one running example threads critical point → Hessian → eigenvalue
  classification; the divergence-threshold example ties into the notebook.

### calculus-for-ml/04-jacobians — grasp 4/5
- P2: the cost table claims "VJP $O(n)$ per layer" vs "Full Jacobian $O(mn)$"
  — a VJP through a dense $W \in \mathbb{R}^{m\times n}$ costs $O(mn)$ (one
  matrix–vector product). The honest comparison is "one VJP ≈ one forward
  pass; a full Jacobian = $m$ VJPs". As written it overstates the speedup and
  breaks under flop-counting → fix the table.
- P3: the two-layer Jacobian passage defines $\mathbf{z}_1 = \mathbf{W}_1\mathbf{x}$
  inline, then the "where" clause re-defines it *with* $\mathbf{b}_1$ → pick one.
- Strong: softmax Jacobian with numeric zero-row-sum check; dying ReLU read
  as a zero row/column; condition-number section motivating init/normalization.

### calculus-for-ml/05-quiz — grasp 3/5
- P2: same pattern as the linear-algebra quiz — reuses six already-answered
  lesson exercise ids and adds nothing new; no question covers lesson 04 even
  though `calc-jacobian-shape/linear/vjp` exist in the registry → fresh ids,
  and include at least one Jacobian/VJP question.

### Exercises (registry)
- Well-formed; good distractors (`calc-partial-derivative`'s "6xy + 2y"
  catches differentiating the $y^2$ term by $x$).
- P3: `calc-gradient-direction` distractor "Neither — it's perpendicular to
  level sets" is a *true property* of the gradient offered as a wrong answer;
  correct-but-not-responsive distractors read as trick questions → reword.

### Course meta
- `estimatedHours: 3` checks out (70 lesson-min × 2.5 / 60 ≈ 2.92 → 3.0). ✓
- P3: `CLAUDE.md` roadmap says "course + 3 lessons" (it's 4 + quiz) — same
  staleness as linear-algebra.

### Themes reinforced
- **Quiz-reuse pattern is now 2 for 2** — quizzes recycle lesson exercise ids
  verbatim and skip the newest (04) lesson. Likely systemic across courses;
  worth a single decision + batch fix.
- Unseeded random snippets and bottom-stacked exercises recur.

---

## probability-statistics — 2026-07-02

Scope: index + 7 lessons + quiz, 20 registry exercises, all 7 notebooks
(structural skim ✓). Assumed prerequisites: none. Overall the strongest
course reviewed so far — lessons 03–07 are exemplary. The issues cluster in
the 01/02 seam.

### probability-statistics/01-thinking-in-probabilities — grasp 5/5
- Excellent: conversational, worked LLN snippet with seeded rng, the
  density-can-exceed-1 `<Details>`, and the frequentist/Bayesian callout.
- P3: only one exercise; the conditional-probability section (the lesson's
  hardest idea) has none → add a product-rule question.

### probability-statistics/02-probability-distributions — grasp 3/5
- P2: **heavy overlap with lesson 01**, which was clearly added later: 02
  re-teaches random variables, expectation, variance, PMF vs PDF,
  density > 1 (as a Callout; 01 has the same as a Details), conditional
  probability, independence, and the product rule. Reading in order, half of
  02 is a rerun with no "recall from lesson 01" framing → dedupe: open 02
  directly with the distribution catalog and compress the shared vocabulary
  into a 3-line recall box linking back to 01.
- P2: the **KL-divergence callout** sits unmotivated inside "sum and product
  rules" and duplicates lesson 05's core content → replace with a one-line
  forward pointer to 05.
- P2: the closing likelihood section fully derives the Bernoulli MLE
  ($\hat\theta = s/n$) — the exact centrepiece derivation of lesson 03,
  making 03's payoff a rerun → trim to *pose* the question ("which θ makes
  the data most probable? Next lesson") without solving it.
- P3: the Categorical section is two lines with no example — fine, but jarring
  next to the fully derived Bernoulli.
- Strong: Bernoulli mean/variance derived step by step; the variance
  shortcut derived once in a callout and reused.

### probability-statistics/03-maximum-likelihood-estimation — grasp 5/5
- Exemplary: bent-coin hook, 5-step Bernoulli derivation, grid-search-vs-
  closed-form code, and the cross-entropy identity treated as recognition
  rather than proof. Wiki extraction (`mle-gaussian`) is exactly right.
- P3: "likelihood is not a probability over θ" appears three times (callout,
  a dedicated section, and common-mistake #1) → keep two at most.
- P3: the `information-theory` WikiLink dangles after Related concepts with
  no lead-in sentence — every other WikiLink in the course gets one.

### probability-statistics/04-bayesian-inference — grasp 5/5
- Exemplary: base-rate medical example computed in full, MAP→L2 derivation in
  a callout, MLE/MAP/posterior-mean compared on the same numbers.
- no further issues.

### probability-statistics/05-entropy-and-kl-divergence — grasp 5/5
- Tight surprise → entropy → cross-entropy → KL arc; the forward/reverse-KL
  callout plus interactive viz is the best explanation of mode-seeking vs
  mean-covering in the repo.
- P3: single exercise; an entropy-computation or forward/reverse-KL
  discrimination question would cover the two core skills.
- P3: KLDivergenceViz is missing from `CLAUDE.md`'s viz registry table.

### probability-statistics/06-statistical-inference — grasp 5/5
- Excellent: SE vs SD callout, "4× data for half the error", the
  what-95%-means callout, and a model-accuracy CI worked example that lands
  in ML territory. Bootstrap wiki link well placed.
- no further issues.

### probability-statistics/07-hypothesis-testing — grasp 5/5
- Excellent: never-accept-H₀ and what-p-is-NOT callouts hit the two classic
  misconceptions; error-type table + power; peeking flagged; code verifies
  the z-test numerically.
- no further issues.

### probability-statistics/08-quiz — grasp 3.5/5
- P2: same reuse pattern for the older material — 6 of 8 questions recycle
  lesson exercise ids (`prob-*`, `mle-*`, `bayes-posterior`) — **but** the
  newer stats lessons contributed two fresh quiz-only ids
  (`stats-quiz-standard-error`, `stats-quiz-p-value`), which is the right
  model → backfill fresh ids for the older lessons; add entropy/KL coverage
  (lesson 05 has no quiz question at all).

### Exercises (registry) & notebooks
- All referenced ids exist; 20 exercises, hints/explanations present.
- All 7 notebooks structurally complete (back-link, Your-turn, TODO(you),
  asserts). ✓

### Course meta
- `estimatedHours: 4.5` checks out (112 min × 2.5 / 60 ≈ 4.67 → 4.5). ✓
- P3: `CLAUDE.md` roadmap says "course + 3 lessons" (it's 7 + quiz).

### Themes reinforced
- Quiz-reuse now 3/3, but this course shows the fix pattern in situ
  (`stats-quiz-*` fresh ids).
- New theme: **later-added lessons create seams** — 01 was added before 02
  without deduping (same likely for 02's likelihood bridge vs 03). When
  inserting a lesson, sweep its neighbours for newly redundant material.

---

## optimization-ml — 2026-07-02

Scope: index + 5 lessons + quiz, 20 registry exercises, all 5 notebooks
(structural skim ✓). Assumed prerequisites: calculus-for-ml. A strong,
recent course — quiz follows the all-fresh-ids pattern.

### optimization-ml/01-gradient-descent-variants — grasp 5/5
- P2: **disconnected from its own wiki deep dives.** The lesson covers
  optimizers and LR schedules at length, and `wiki/gradient-descent-optimizers`
  + `wiki/learning-rate-schedules` cover the same ground deeper — but the
  lesson has no WikiLink to either, and neither wiki page lists this course in
  `relatedLessons` (both predate the course) → link both directions.
- P3: OptimizerPathViz missing from `CLAUDE.md`'s viz registry table.
- Strong: heavy-ball vs EMA callout preempts the classic PyTorch/textbook
  confusion; momentum and Adam worked traces verified numerically ✓; honest
  "Adam doesn't always generalize best" caveat; when-to-use table.

### optimization-ml/02-convex-optimization — grasp 4/5
- P2: "cross-entropy ≥ entropy" is presented as following from convexity of
  $-\log$, but the actual Jensen step (Gibbs: $\mathbb{E}_p[\log(q/p)] \le
  \log \mathbb{E}_p[q/p] = 0$) is skipped — in the lesson *about* Jensen, the
  showcase application isn't reproducible from what's on the page → add the
  two-line derivation.
- P3: the log-sum-exp "worked example" is really a derivation sketch that
  lands on the ELBO with no payoff link → forward-link VAEs/variational
  inference.
- P3: sklearn snippet's output ("same answer from both solvers") not shown as
  annotated values, unlike other snippets in the course.

### optimization-ml/03-constrained-optimization — grasp 4/5
- P2: the **worked LP example is muddled**: vertices are visited in a
  confusing order, $(3,1)$ is introduced three times, and "Check the last
  vertex: (3, 1)" reads as a non-sequitur. The math is correct (KKT
  multipliers verified ✓) but the prose can't be followed linearly → rewrite
  as a small vertex/objective table, then verify KKT once at the winner.
- P3: "LP" never expanded to "linear program".
- P3: the "multiplier measures constraint pushback" sentence appears twice
  within 12 lines.
- Strong: Lagrangian → KKT → SVM dual is exactly the right arc; the
  complementary-slackness → support-vectors payoff and the kernel-trick
  callout close the loop the SVM course opens.

### optimization-ml/04-loss-functions — grasp 5/5
- Tight; the loss-decides-what-you-predict callout (mean vs median) and the
  loss=NLL section close the loop with probability-statistics/03.
- P3: only lesson in the course without a code snippet — a 5-line
  Huber-vs-MSE-on-an-outlier demo would be cheap and on-theme.
- P3: focal loss's $\gamma$ never named in words (focusing parameter), and
  the formula covers the positive class only.

### optimization-ml/05-hyperparameter-optimization — grasp 5/5
- Clean scoping: defers Bayesian optimization to the bayesian-methods course
  instead of re-teaching it; random-beats-grid callout gives the *reason*,
  not just the claim; ASHA/Hyperband framing is practical.
- no further issues.

### optimization-ml/06-quiz — grasp 4.5/5
- All five ids are fresh quiz-only questions (`opt-quiz-*`) — this is the
  model pattern the older courses should adopt.
- P3: no question covers lesson 05 (HPO) → add one.

### Exercises (registry) & notebooks
- 20 exercises, all referenced ids exist. All 5 notebooks structurally
  complete (Your-turn, TODO(you), asserts). ✓

### Course meta
- `estimatedHours: 3.5` checks out (86 min × 2.5 / 60 ≈ 3.58 → 3.5). ✓
- P3: **optimization-ml is absent from `CLAUDE.md`'s roadmap entirely** (the
  Foundations cluster lists only linear-algebra, calculus, prob-stats).

### Themes reinforced
- Quiz pattern correlates with course age: newer content (optimization-ml,
  the stats lessons) uses fresh quiz ids; older courses recycle. One batch
  fix for the old courses would close the theme.
- New theme instance: **content added later isn't back-linked** — wiki pages
  that predate a course don't list it in `relatedLessons` (mirror of the
  lesson-insertion seams found in probability-statistics).

---

## linear-regression — 2026-07-02

Scope: index + 4 lessons + quiz, 20 registry exercises (15 lesson + 5 quiz),
all 4 notebooks (structural skim ✓). The course's biggest issue is an
internal duplication seam between lessons 01 and 03.

### linear-regression/01-linear-regression — grasp 4/5
- P2: **lessons 01 and 03 teach the same material twice.** Lesson 01's back
  half covers Ridge and Lasso in depth (objectives, closed form, sklearn
  snippets, comparison table, correlated-features callout) — and lesson 03 is
  *entirely* Ridge & Lasso, with the better treatment (viz, geometric
  picture, wiki deep-dive link). A learner reads near-identical content twice
  two lessons apart → trim 01 to OLS + the overfitting *problem*, ending on a
  forward link to 03 as the solution; move anything unique (the λI
  invertibility derivation) into 03. Update 01's frontmatter description
  ("OLS, Ridge, Lasso") accordingly.
- P2: the Ridge/Lasso snippets reference undefined `X_train/y_train/X_test/
  y_test` — the only non-runnable code in the foundations/classical courses
  reviewed so far; a learner pasting them gets a NameError → define a small
  dataset or fold into 03's treatment.
- Strong: the 3-point OLS fit with residuals and R² computed by hand and then
  *reproduced in the code block* is exactly the worked-trace pattern; good
  wiki extraction (`ols-normal-equation`).

### linear-regression/02-logistic-regression — grasp 5/5
- Excellent: log-odds identity derived, boundary geometry via subtracting two
  boundary points, cross-entropy derived from MLE in four labeled steps, and
  the gradient collapse extracted to a wiki page with the headline result
  kept in-lesson.
- P2: the Limitations callout claims logistic regression "assumes features
  are independent" — it doesn't (that's naive Bayes); multicollinearity
  affects coefficient stability, not a model assumption → reword to
  "correlated features make coefficients unstable/hard to interpret".
- P3: the GD snippet keeps bias `b` separate while lesson 01 absorbs it into
  `w` via the ones column — inconsistent conventions two lessons apart.

### linear-regression/03-regularization — grasp 5/5
- The model regularization lesson: penalty-gradient intuition (proportional
  vs constant force), the diamond/circle picture, a viz with signal/echo/
  noise weights, and honest λ guidance.
- P3: missing the standard end-matter — no Common mistakes and no Related
  concepts section (the only such lesson reviewed so far); one exercise only.

### linear-regression/04-generalized-linear-models — grasp 4/5
- P2: "Any distribution in this family admits the same EM-style MLE
  algorithm" — wrong label: exponential-family MLE is moment matching via
  sufficient statistics; EM is for latent-variable models. As written it
  plants a false association → delete "EM-style" or say "closed-form/convex
  MLE".
- P3: the GDA "Worked example" lists steps but computes nothing — no numbers,
  unlike every other worked example in the course → either add the arithmetic
  (means, pooled Σ, resulting boundary) or retitle to "Sketch".
- P3: only lesson in the course with neither code nor viz; a 10-line GDA-fit
  snippet would ground it.
- P3: uses `---` horizontal rules between sections; no Common mistakes
  section — template drift.

### linear-regression/05-quiz — grasp 4.5/5
- All five ids are fresh (`linreg-quiz-*`) ✓ — newer-course pattern again.
- P3: no question covers lesson 04 (GLMs/GDA) despite `glm-*`/`gda-*`
  exercises existing in the registry.

### Exercises & notebooks
- All referenced ids exist (15 lesson + 5 quiz). All 4 notebooks structurally
  complete. ✓

### Course meta
- `estimatedHours: 3.0` checks out (69 min × 2.5 / 60 ≈ 2.88 → 3.0). ✓
- P3: CLAUDE.md roadmap says "3 lessons + quiz" (it's 4 + quiz).

### Themes reinforced
- **Duplication seams (3rd instance):** 01↔03 here, 01↔02 and 02↔03 in
  probability-statistics — all from content added at different times. The
  authoring prompts should require a neighbour-dedup pass when adding a
  lesson to an existing course.
- Quiz-freshness correlates with recency again; quizzes skip the newest
  lesson (04 here, 04 in calculus, 04 in linear-algebra) — quizzes are not
  updated when lessons are appended.

---

## knn-decision-trees — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 12 exercises, 3 notebooks (structural ✓).
`estimatedHours: 2.0` ✓ (50 min × 2.5/60 ≈ 2.08). Quiz: all-fresh
`knntree-quiz-*` ids ✓, covers all three lessons ✓.

### knn-decision-trees/01-knn — grasp 5/5
- Exemplary: fully verified worked example with the k=3 → k=5 flip
  observation, curse-of-dimensionality ratio table, wiki extraction.
- P3 (fixed): scaling snippet used undefined `X_test` with no signal it was
  an idiom fragment → labeled and annotated ("fit on train only / never
  refit").
- P3 (fixed): exercises stranded after Related concepts → moved before
  Common mistakes.

### knn-decision-trees/02-decision-trees — grasp 4.5/5
- Strong running example (loan approvals); root-Gini quick check in-lesson
  with the full trace extracted to the wiki; IG = 0.3333 claim verified ✓.
- P3 (fixed): `best_split` snippet called `gini()`/`np` without defining or
  importing them → added a 4-line `gini` + import so it runs as pasted.
- P3 (fixed): feature-importance snippet imported matplotlib and never
  plotted → import dropped; pruning snippet labeled as an idiom fragment.
- P3 (fixed): exercises moved before Common mistakes.

### knn-decision-trees/03-bias-variance — grasp 5/5
- Tight capstone: dial framing (k, depth), decomposition deferred to the
  wiki, resampling viz placed exactly at the "many training sets" sentence,
  and the diagnose-by-gap callout. No issues.

### Applied in this iteration
Exercise moves (01, 02), runnable `best_split`, snippet idiom labels,
dropped dead import. Nothing deferred.

---

## svm — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 14 exercises, 3 notebooks (structural ✓).
`estimatedHours: 3` ✓ (70 min × 2.5/60 ≈ 2.92). Quiz all-fresh `svm-quiz-*`
covering all lessons ✓.

### svm/01-maximum-margin — grasp 4/5 → fixed
- P2 (fixed): **duplication seam #4** — 01's "Hard margin vs soft margin" +
  "Hinge loss" sections re-taught everything in lesson 03 (slack, the C
  objective, the C tradeoff, hinge loss), and 03 does it better (worked
  penalty numbers, viz, λ=1/C). → replaced with a "When the data isn't
  separable" bridge + forward link; moved the two C exercises
  (`svm-c-parameter`, `slider-svm-c`) to 03; takeaways/related updated.
- P3 (fixed): dangling-colon sentence seam before the optimization problem.
- P3 (fixed): non-runnable C-comparison snippet (undefined X_train) removed
  by the trim; remaining exercises placed before Common mistakes.
- Strong: the margin derivation and the hand-solved (2,2)/(0,0) example
  (verified ✓: w=(0.5,0.5), b=−1, margin 2√2 = support-vector gap).

### svm/02-kernel-trick — grasp 5/5
- Best lesson in the course: φ-expansion shows *why* the √2 factors exist,
  numeric kernel check verified ✓ (both routes give 4), Mercer callout,
  dual connection, honest scaling warning.
- P3 (fixed): mistake #3's `gamma='scale'` formula said "1/(n·var)" with n
  ambiguous → now explicitly n_features, not samples.
- P3 (fixed): GridSearchCV snippet labeled as an idiom; related-concepts now
  links optimization-ml/03 (where the dual it relies on is derived);
  exercises moved before Common mistakes.

### svm/03-soft-margins — grasp 5/5
- Excellent: slack taxonomy (0 / (0,1) / >1), priced-violation framing,
  worked penalty arithmetic at two C values, retrain-per-slider viz, λ=1/C.
- P3 (fixed): gained the hinge-vs-0-1-vs-log plot snippet (moved from 01,
  with the 0-1 step corrected to z<0 — the old version stepped at z<1),
  the two moved C exercises, and a Related concepts section (was missing).

### Applied in this iteration
Lesson 01 trim + bridge (seam #4 closed), exercise moves/placements,
0-1-loss step fix, γ-formula disambiguation, idiom labels, cross-links to
the optimization course. Nothing deferred.

---

## ensemble-methods — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 13 exercises, 3 notebooks (structural ✓).
`estimatedHours: 3` ✓ (70 min × 2.5/60 ≈ 2.92). Quiz all-fresh
`ensemble-quiz-*`, covers all lessons ✓.

### ensemble-methods/01-bagging-and-random-forests — grasp 4.5/5 → fixed
- P2 (fixed): the "Why bagging works" callout asserted trees are
  *uncorrelated* and variance drops by a factor of B — exactly the claim the
  very next section (the ρ-floor decomposition, the lesson's best material)
  goes on to debunk → callout reworded to the conditional, handing off to
  that section.
- P3 (fixed): mistake #1 self-contradicted ("don't skip max_depth… start
  with max_depth=None") → reworded as either/or with min_samples_leaf.
- P3 (fixed): missing `import numpy` in the MDI snippet; idiom label on the
  bagging snippet; exercises moved before Common mistakes.
- Strong: ρσ² + (1−ρ)/B·σ² decomposition motivating RF, and the OOB ≈ 37%
  limit derived rather than asserted.

### ensemble-methods/02-boosting — grasp 4.5/5 → fixed
- P2 (fixed): **seam #5** — the "XGBoost and LightGBM" section, its code, the
  feature-importance snippet (with undefined np/plt/xgb_model), and the
  `xgb-tuning` exercise all pre-empted lesson 03, which owns XGBoost →
  replaced with a three-line pointer; code moved to 03 (which had none);
  exercise moved to 03; related-concepts forward link added.
- P3 (fixed): "variance reduction: Yes (via shrinkage)" overstated →
  "Some (via shrinkage + subsampling)"; exercises moved before Common
  mistakes.
- Strong: the gradient-boosting worked trace (verified ✓ — residuals, stump
  means, η-scaled updates all correct), AdaBoost α-minimizer note with wiki
  extraction.

### ensemble-methods/03-xgboost — grasp 5/5
- Excellent conceptual lesson: two-penalty objective read line by line,
  shrinkage-vs-trees viz, honest trees-vs-nets framing.
- P3 (fixed): was the only lesson in the course with zero code → gained the
  XGBoost/LightGBM starting-config snippet (moved from 02, matching its own
  "sane configuration" callout) plus a Related concepts section and the
  moved `xgb-tuning` exercise.

### Applied in this iteration
Callout contradiction fix, seam #5 closed (02→03 handoff), snippet moves +
imports + idiom labels, exercise placements. Nothing deferred.

---

## clustering — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 12 exercises, 3 notebooks (structural ✓).
`estimatedHours: 2.0` ✓ (54 min × 2.5/60 = 2.25 → 2.0/2.5 boundary; fine).
Quiz all-fresh `clustering-quiz-*`, covers all lessons ✓.

### clustering/01-k-means — grasp 4/5 → fixed
- P2 (fixed): **seam #6 + broken snippets** — the "Choosing K: Elbow" and
  "Silhouette Score" sections duplicated lesson 03 (which teaches both with
  a worked example, the metric's blind spots, and SilhouetteViz), *and*
  both snippets crashed as written: they looped K up to 10 (elbow) and 7
  (silhouette) on the lesson's 5-point dataset — sklearn raises for
  n_clusters > n_samples → replaced with a "Choosing K" bridge explaining
  why the objective can't pick K, forward-linking 03; `choosing-k` exercise
  moved to 03.
- Strong: convergence argument sketched then extracted to the wiki; magnet
  analogy; limitations table.
- P3 (fixed): remaining exercises placed before Common mistakes; 03 added
  to Related concepts.

### clustering/02-hierarchical-and-dbscan — grasp 4.5/5
- Good compression for 10 minutes: linkage numbers verified ✓ (√2 merges,
  8.49/9.90/11.31 heights), both algorithms extracted to wiki pages at the
  right altitude, honest varying-density warning.
- P3 (fixed): exercises moved before Common mistakes. No other issues.

### clustering/03-evaluating-clusters — grasp 5/5
- Excellent: "K-Means will happily carve pure noise into k pieces" hook,
  worked silhouette (verified ✓ s(2) ≈ 0.85), metrics-inherit-assumptions
  callout, stability check as the label-free gold standard.
- P3 (fixed): was missing Related concepts → added; gained the moved
  `choosing-k` exercise.

### Applied in this iteration
Seam #6 closed (01→03 handoff) — which also deleted the two crash-prone
snippets; exercise moves; Related-concepts additions. Nothing deferred.

---

## pca-dimensionality — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 12 exercises, 3 notebooks (structural ✓).
`estimatedHours: 3` ✓ (68 min × 2.5/60 ≈ 2.83). Quiz all-fresh `pca-quiz-*`,
covers all lessons ✓.

### pca-dimensionality/01-pca — grasp 4.5/5 → fixed
- P2 (fixed): **seam #7** — "Choosing the number of components" (cumvar
  code, scree, Kaiser callout) and the noise-reduction/preprocessing
  application snippets duplicated lesson 03's "How many components?" and
  reconstruction/pipeline sections, which are better (they add the
  downstream-performance principle and the leak warning) → both trimmed to
  pointers; 03 added to Related concepts.
- Strong: the Lagrange derivation of "PC1 = top eigenvector" in-lesson, and
  the 4-point worked example (verified ✓ λ = 6.0/0.667, 90%) mirrored in a
  runnable snippet.
- P3 (fixed): first sklearn snippet used undefined X → idiom label;
  exercises moved before Common mistakes.

### pca-dimensionality/02-t-sne-and-umap — grasp 5/5
- Excellent: the actual p/q formulas with the symmetrization rationale, the
  force-law gradient, and the perplexity-as-effective-neighbors worked
  mini-example (verified ✓ H=2 → perplexity 4; peaked → ≈1.18). The
  don't-over-interpret callout is the single most important thing a t-SNE
  user needs.
- P3 (fixed): exercises moved before Common mistakes. No other issues.

### pca-dimensionality/03-pca-in-practice — grasp 5/5
- Excellent: three answers to "how many components" in increasing order of
  principle, reconstruction error = discarded eigenvalues, eigenfaces story,
  whitening trade-off, PCA+t-SNE as teammates.
- P3 (fixed): was missing Related concepts → added (01, SVD lesson, 02).

### Applied in this iteration
Seam #7 closed (01→03 handoffs ×2), idiom label, exercise placements,
Related-concepts addition. Nothing deferred.

---

## probabilistic-models — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 12 exercises, 3 notebooks (structural ✓).
`estimatedHours: 3` ✓ (66 min × 2.5/60 = 2.75 boundary). Quiz all-fresh
`probmodel-quiz-*`, covers all lessons ✓.

### probabilistic-models/01-gaussian-mixture-models — grasp 5/5 → fixed
- P2 (fixed): **crash-in-context snippet** (same class as clustering/01) —
  the BIC/AIC snippet fit up to 7 components while the lesson's running `X`
  was the 4-point toy from the responsibilities demo; sklearn raises for
  n_components > n_samples → snippet now generates a 450-point 3-cluster
  dataset inline (with the "both criteria bottom out at n=3" payoff comment)
  and imports matplotlib.
- Strong: responsibility worked example verified ✓ (0.0540/0.00443 →
  γ = 0.924/0.076); the M-step-equals-soft-K-Means framing; the `tied`
  covariance clarification.
- P3 (fixed): exercises moved before Common mistakes.

### probabilistic-models/02-em-algorithm — grasp 5/5
- Excellent: detective analogy, from-scratch EM with regularized
  covariances, ELBO summary with the full derivation + hand trace extracted
  to the wiki, "EM beyond GMMs" table.
- P3 (fixed): exercises moved before Common mistakes. No other issues.

### probabilistic-models/03-naive-bayes — grasp 5/5
- Excellent compact lesson: 2^d → d collapse motivating the assumption,
  training-is-counting framing, the mandatory-smoothing veto argument, and
  the calibration-vs-argmax explanation of why the wrong assumption works.
- P3 (fixed): was missing Related concepts → added (Bayes inference, GDA
  as the sibling generative classifier, logistic regression).

### Applied in this iteration
Self-contained BIC/AIC snippet (crash-class fix #3), exercise placements,
Related-concepts addition. Nothing deferred.

---

## model-evaluation — 2026-07-04 (review + fix mode)

Scope: index + 7 lessons + quiz, 24+ exercises, 7 notebooks (structural ✓).
`estimatedHours: 5.5` ✓ (131 min × 2.5/60 ≈ 5.46).

### model-evaluation/01-classification-metrics — grasp 5/5
- Excellent: spam-filter confusion matrix computed through four metrics
  (verified ✓), ROC-vs-PR imbalance warning, no-skill PR baseline.
- P3 (fixed): ROC wiki link dangled after Related concepts → moved above
  the exercises with a lead-in; exercises moved before Common mistakes.

### model-evaluation/02-validation-strategies — grasp 5/5
- Excellent: leakage taxonomy with wrong-vs-correct code, .632 estimator,
  LOO variance explanation, Pipeline callout. No issues beyond exercise
  placement (fixed).

### model-evaluation/03-training-techniques — grasp 3.5/5 → fixed
- P2 (fixed): **seam #8, the largest yet** — the LR-schedules section
  (step/cosine/SGDR/warm-up formulas) duplicated optimization-ml/01 + the
  learning-rate-schedules wiki page, and the grid/random/Bayesian/
  successive-halving sections (~90 lines) duplicated optimization-ml/05.
  Both post-date this lesson. → schedules compressed to the chooser table +
  the Adam-warm-up insight + WikiLink; search strategies compressed to one
  "briefly" section retaining exactly what the lesson's exercises and the
  course quiz test (random-beats-grid reason, GP+EI sketch, halving idea)
  with a forward link to optimization-ml/05. Early stopping and data
  augmentation — the lesson's unique content — kept in full.
- Strong: early-stopping worked table, the L2-equivalence note, TTA.

### model-evaluation/04-llm-evaluation — grasp 5/5
- Outstanding: BPB as the tokenizer-invariant fix (with the *why*),
  judge-bias taxonomy + mitigations, Bradley–Terry/Elo tied to reward
  models, contamination + Goodhart pitfalls.
- P3 (fixed): AI-as-a-judge section now links wiki/llm-as-judge; exercises
  moved. Cross-course overlap with building-with-llms/08 to be checked when
  that course is reviewed (noted, not assumed).

### model-evaluation/05-evaluating-ai-systems — grasp 5/5
- Outstanding systems companion: 5-step selection workflow, break-even
  V* = C/p, cost-per-correct-answer, tail-latency metrics, routing/caching.
- P3 (fixed): calibration bullet now forward-links lesson 07; exercises
  moved.

### model-evaluation/06-learning-theory — grasp 5/5
- Excellent: ERM → gap → bias-variance → VC → double descent in 18 min
  with the right extractions (VC wiki). ASCII double-descent curve works.
- P3 (fixed): exercises moved.

### model-evaluation/07-calibration-and-uncertainty — grasp 5/5
- Excellent: promise framing, ECE with its binning caveat, the
  temperature-can't-change-argmax callout, aleatoric/epistemic table.
- P3 (fixed): exercises moved.

### model-evaluation/08-quiz — grasp 3.5/5 → fixed
- P2 (fixed): 5 fresh ids but zero coverage of lessons 04–07 (the
  quizzes-skip-late-lessons theme) → added three fresh quiz-only ids:
  `eval-quiz-bpb`, `eval-quiz-temp-scaling`, `eval-quiz-double-descent`.

### Applied in this iteration
Seam #8 closed (~120 lines of duplication compressed to summaries +
links), 3 new quiz exercises, 2 cross-links, WikiLink placement, exercise
placements across all 7 lessons. Nothing deferred.

---

## bayesian-methods — 2026-07-04 (review + fix mode)

Scope: index + 3 lessons + quiz, 14 exercises, 3 notebooks (structural ✓).
`estimatedHours: 2.5` ✓ (60 min × 2.5/60 = 2.5 exactly). Quiz all-fresh
`bayes-quiz-*`, covers all lessons ✓.

### bayesian-methods/01-bayesian-linear-regression — grasp 5/5
- Excellent: distribution-over-lines framing, closed-form posterior with the
  ridge-is-MAP callout, two-part predictive variance, and the
  why-marginalize section answering the question a learner actually asks.
- P3 (fixed): exercises moved before Common mistakes. No other issues.

### bayesian-methods/02-gaussian-processes — grasp 5/5
- Excellent: kernel-is-the-prior framing, closed-form posterior with the
  pinch/balloon callout, kernel composition table, honest O(N³) wall, and
  the infinite-features connection back to lesson 01 and the SVM kernel
  trick.
- P3 (fixed): exercises moved. No other issues.

### bayesian-methods/03-bayesian-optimization — grasp 5/5
- Excellent: expensive/black-box/derivative-free setup, UCB and EI with the
  maximize-vs-minimize footnote, the 4-line loop, and the honest
  "sequential — random/Hyperband can win when trials parallelize" caveat
  that matches optimization-ml/05's framing exactly (no seam: each course
  defers to the other correctly).
- P3 (fixed): exercises moved; Related concepts gained the
  optimization-ml/05 back-link (the forward link already existed).

### Applied in this iteration
Exercise placements ×3, one back-link. **No P2s found** — the first course
with none; consistent cross-course boundaries (BO deferred here from
optimization-ml/05, GP math deferred here from model-evaluation/03's old
copy which fix #8 removed). This is what the seam-free pattern looks like.

---

## causal-inference — 2026-07-04 (review + fix mode)

Scope: index + 2 lessons + quiz, 11 exercises, 2 notebooks (structural ✓).
`estimatedHours: 2` ✓ (44 min × 2.5/60 ≈ 1.83). Quiz all-fresh
`causal-quiz-*`; the collider question is answerable from the lessons'
collider callouts ✓.

### causal-inference/01-correlation-and-confounding — grasp 5/5
- Excellent: P(Y|X) vs P(Y|do(X)) drawn immediately, the
  can't-detect-confounding-from-data callout (the single most important
  sentence in the course), Simpson's paradox with the "which analysis is
  right depends on causal roles" punchline, and a Why-ML-cares section
  covering actionability/shift/fairness/proxy-Goodhart.
- P3 (fixed): exercises moved before Common mistakes. No other issues.

### causal-inference/02-interventions-and-potential-outcomes — grasp 5/5
- Excellent: fundamental problem stated as a missing-data problem, naive
  difference = ATE + bias decomposition, do-operator as arrow deletion,
  backdoor formula in words, three assumptions with "the big one" flagged,
  don't-adjust-for-everything callout.
- P3 (fixed): the uplift-modeling wiki page pointed here but the lesson
  never linked back → WikiLink added after the estimators section (uplift =
  per-individual effects, the natural next question). The collider callout
  now names and links d-separation (graphical-models/01) as the
  path-blocking machinery. Exercises moved.

### Applied in this iteration
Exercise placements, uplift WikiLink (one-directional-gap theme), d-sep
cross-link. **No P2s** — second seam-free course in a row; both lessons are
compact-form with correct end-matter.

---

## time-series — 2026-07-04 (review + fix mode)

Scope: index + 4 lessons (+ new quiz), 9 lesson exercises + 5 new quiz
exercises, 4 notebooks (structural ✓).

### time-series/01-time-series-fundamentals — grasp 5/5
- Excellent: components → stationarity → transforms → ACF/PACF arc; the ADF
  is-not-omniscient callout; log-then-difference worked example verified ✓;
  a full 5-step airline-data walkthrough; correct wiki extraction
  (acf-pacf-interpretation).
- P3 (fixed): exercises moved before Key takeaways.

### time-series/02-arima-models — grasp 5/5
- Excellent: AR/MA intuitions, memory-fingerprint callout, worked
  ARIMA(1,1,1) forecast with widening intervals (half-widths verified ✓),
  AIC/BIC with the T=100 penalty comparison, airline-model SARIMA note,
  full simulate→test→fit→forecast code. Wiki extractions (ADF, Box-Jenkins)
  at the right altitude.
- P3 (fixed): exercises moved.

### time-series/03-deep-learning-for-time-series — grasp 4.5/5 (outline+spot read)
- Well-structured: sliding window with a printed example, LSTM/TCN/
  transformer progression, metrics, walk-forward wiki link, decision guide,
  end-to-end PyTorch pipeline with chronological split.
- P3 (fixed): exercises moved.

### time-series/04-demand-forecasting-in-production — grasp 4.5/5 (outline+spot read)
- Good production arc: hierarchy/reconciliation (wiki-extracted), Prophet
  events, quantile-regression ETA, ensembles, architecture.
- P3 (fixed): exercises moved.

### Course meta — the substantive findings
- P2 (fixed): **no quiz existed** — the only reviewed course without one →
  created `05-quiz.mdx` with 5 fresh `ts-quiz-*` exercises (log-then-
  difference, AR fingerprint, widening intervals, walk-forward leakage,
  reconciliation), one per major theme.
- P3 (fixed): with the quiz, `estimatedHours: 4` is now arithmetically
  right (90 min × 2.5/60 = 3.75 → 4); it was 0.5 high before.
- P3 (fixed): CLAUDE.md — course was absent from the roadmap (added a new
  "Evaluation & Statistical ML" section also covering model-evaluation,
  bayesian-methods, causal-inference, all previously missing) and three viz
  (DecompositionViz, ACFViz, ARIMAForecastViz) were missing from the
  registry table.

### Applied in this iteration
New quiz (5 fresh exercises), exercise placements ×4, CLAUDE.md roadmap
section + 3 viz rows. Nothing deferred. **Classical-ML block complete.**

---

## neural-networks — 2026-07-04 (review + fix mode)

Scope: index + 6 lessons + quiz, 19+ exercises, 6 notebooks (structural ✓).
`estimatedHours: 4` ✓ (95 min × 2.5/60 ≈ 3.96). Quiz all-fresh `nn-quiz-*`.

### neural-networks/01-what-is-a-neuron — grasp 5/5
- Exemplary: term-by-term forward pass, the nudge-one-weight section that
  *derives* ∂z/∂wᵢ = xᵢ from arithmetic before naming it, saturation shown
  numerically, correct extractions (activation-functions wiki).
- P3 (fixed): exercises moved before Common mistakes.

### neural-networks/02-gradient-descent — grasp 5/5
- The best worked trace in the repo: two full hand iterations of MSE line
  fitting (all numbers verified ✓) mirrored exactly in code, the
  learning-rate table from the same problem, and correctly scoped optimizer
  coverage (intuition here, zoo deferred to wiki/optimization-ml). Momentum
  sign convention differs from optimization-ml/01 (w+v vs w−ηv forms) —
  both valid, noted, not worth harmonizing.
- P3 (fixed): exercises moved.

### neural-networks/03-layers-and-forward-pass — grasp 5/5
- Excellent: shape-rule callout ("rows = outputs"), fully worked 2→2→1 pass
  (verified ✓ σ(2) ≈ 0.881) with the inactive-ReLU observation.
- P3 (fixed): exercises moved.

### neural-networks/04–06 (xor-mlp, batchnorm-dropout, weight-init) — grasp 4.5/5 (outline+spot read)
- Well-structured with the right wiki extractions (perceptron-learning,
  softmax-cross-entropy, batchnorm-algorithm, dropout, groupnorm).
- P3 (fixed): lesson 05's dropout WikiLink dangled *after* Related concepts
  → relocated into the Dropout section with a lead-in; exercises moved in
  all three.

### neural-networks/07-quiz — grasp 4.5/5 → fixed
- All-fresh ids but no lesson-05 coverage → added `nn-quiz-dropout-scale`
  (inverted-dropout scaling, the lesson's core mechanic).

### Course meta
- P3 (fixed): CLAUDE.md roadmap said "course + 3 lessons"; it's 6 + quiz.

### Applied in this iteration
WikiLink relocation, exercise placements ×6, 1 fresh quiz exercise,
roadmap row. No P2s — the oldest course held up remarkably well (its
optimizer/backprop scope boundaries with calculus-for-ml and
optimization-ml are correct in both directions).

---

## cnns — 2026-07-04 (review + fix mode)

Scope: index + 5 lessons + quiz, 18+ exercises, 5 notebooks (structural ✓).
`estimatedHours: 4.5` ✓ (112 min × 2.5/60 ≈ 4.67).

### cnns/01-convolution-operation — grasp 5/5
- Excellent: cross-correlation-vs-convolution callout (with the scipy flip
  gotcha in code), the all-zeros checkerboard turned into a teaching moment
  followed by a non-trivial 4×4 trace (verified ✓ −4), and the output-size
  formula *derived* from valid filter positions rather than asserted.
- P3 (fixed): exercises moved before Common mistakes.

### cnns/02-pooling-and-architectures — grasp 4.5/5 → fixed
- P3 (fixed): two mild pre-emptions of later-added lessons — the "Modern
  architectures" table anticipated lesson 05 and "Feature visualization"
  collided with lesson 03's title (content differed: hierarchy vs methods)
  → table retitled "The evolution at a glance" + pointer to 05; section
  retitled "What the layers learn" + pointers to 03 and 04; the stale
  "covered in the next lesson" claim (transfer learning is now 04, two
  lessons away) corrected. Not a full seam — nothing was re-taught.
- Strong: VGG 25C²-vs-18C² parameter arithmetic; ResNet gradient-highway
  callout; GAP-over-FC-heads guidance.

### cnns/03–05 (visualization-attacks, transfer-learning, modern-architectures) — grasp 4.5–5/5 (outline+spot read)
- Well-structured: 03 runs saliency → Grad-CAM → activation maximization →
  FGSM/PGD → defenses with poisoning/evasion taxonomy; 04 has the worked
  ResNet-50 head-swap parameter count and discriminative-LR rationale; 05
  has worked 1×1 and bottleneck parameter counts.
- P3 (fixed): exercises moved in all three.

### cnns/06-quiz — grasp 4/5 → fixed
- All-fresh ids but no coverage of lessons 03 or 05 → added `cnn-quiz-fgsm`
  (why sign(∇) under an L∞ budget) and `cnn-quiz-depthwise` (the parameter
  split).

### Course meta
- P3 (fixed): CLAUDE.md roadmap said "course + 3 lessons" (it's 5 + quiz),
  and the TransferLearningViz registry row pointed at cnns/03 — stale since
  transfer-learning moved to 04 when the visualization lesson was inserted.

### Applied in this iteration
Lesson-02 retitles + pointers + stale-reference fix, exercise placements
×5, 2 fresh quiz exercises, roadmap + viz-registry corrections. No P2s.

---

## rnns — 2026-07-04 (review + fix mode)

Scope: index + 4 lessons + quiz, 13+ exercises, 4 notebooks (structural ✓).
`estimatedHours: 3.5` ✓ (88 min × 2.5/60 ≈ 3.67).

### rnns/01-recurrent-neural-networks — grasp 5/5 (outline+spot read)
- Strong shape: hidden-state-is-memory framing, parameter counting, a
  two-timestep hand trace + 1-D worked example, the four sequence shapes,
  from-scratch then PyTorch code.
- P3 (fixed): exercises moved before Common mistakes.

### rnns/02-bptt-and-vanishing-gradient — grasp 5/5
- Excellent: the per-step Jacobian with every symbol unpacked (diag, tanh′),
  both wiki extractions at exactly the right altitude (full derivation +
  numeric decay tables out of the lesson), the clipping-fixes-explosions-
  not-vanishing callout, and the "real fix is architectural" section that
  sets up LSTMs by *deriving the need* for a Jacobian ≈ 1 path.
- P3 (fixed): exercises moved. No other issues.

### rnns/03-lstm-and-gru — grasp 5/5 (outline+spot read)
- Full LSTM timestep by hand, forget-gate worked example, GRU parameter
  counting, why-gates-beat-plain-RNNs section.
- P3 (fixed): exercises moved.

### rnns/04-state-space-models — grasp 4.5/5 (outline+spot read)
- Good newer lesson: linear recurrence ⟺ convolution duality, S4/Mamba,
  SSM-vs-attention table; RNNUnrollViz reuse is apt.
- P3 (fixed): exercises moved.

### rnns/05-quiz — grasp 4.5/5 → fixed
- All-fresh ids but no lesson-04 coverage → added `rnn-quiz-ssm`
  (recurrence⟺convolution parallel-training duality).

### Course meta
- P3 (fixed): CLAUDE.md roadmap said "course + 3 lessons" (it's 4 + quiz —
  the state-space lesson was appended without the roadmap update).

### Applied in this iteration
Exercise placements ×4, 1 fresh quiz exercise, roadmap row. No P2s.
Also this iteration: retired the cron /loop from the plan's run
instructions (session-scoped jobs die with the session) — the queue is
now worked directly, one item per turn.

---

## Fix queue (populate after review queue completes)

*(empty — triage P1s first, then high-frequency P2 themes)*

---

## Fix pass #1 — 2026-07-02 (covers all findings through linear-regression)

**Applied (P2s):**
- linear-algebra/02: worked example and code now compose the same order with
  the same letters (R@S), expected outputs annotated
- linear-algebra/03: dangling "we used SVD above" removed; SVD section trimmed
  to a teaser + forward link to lesson 04 (also added to Related concepts)
- calculus-for-ml/03: lottery-ticket mislabel removed; η=1/λmax reframed as
  the safe default with the true balanced optimum 2/(λmax+λmin)=0.4 shown;
  "Lipschitz constant of the gradient" clarified (incl. key takeaway)
- calculus-for-ml/04: VJP cost table corrected (one VJP ≈ one forward pass;
  full Jacobian = m VJPs); duplicate z₁ definition unified
- probability-statistics/02: recall-from-01 framing added (RV + conditioning
  sections); KL callout → forward pointer to lesson 05; Bernoulli-MLE
  derivation trimmed to a preview that hands off to lesson 03
- probability-statistics/03: triple-stated "likelihood ≠ probability" cut to
  two; info-theory WikiLink moved above Related concepts with a lead-in
- optimization-ml/01: WikiLinks added to gradient-descent-optimizers and
  learning-rate-schedules; both wiki pages now back-link via relatedLessons
- optimization-ml/02: Gibbs/Jensen two-step derivation added to the
  cross-entropy ≥ entropy application
- optimization-ml/03: LP worked example rewritten as a vertex table + single
  KKT verification; "linear program (LP)" expanded
- linear-regression/01↔03 dedup: 01's Ridge/Lasso half replaced by a short
  "The fix: regularization" bridge (keeps the λI insight) + forward link;
  non-runnable snippets removed by the trim; description/frontmatter, common
  mistakes, takeaways, related concepts updated; ridge-vs-lasso exercise
  moved to 03; 03 gained Common mistakes + Related concepts sections
- linear-regression/02: false "assumes features are independent" reworded to
  coefficient-stability framing
- linear-regression/04: "EM-style MLE" mislabel fixed; GDA example now
  computes θ=(4,0), bias 0, boundary x₁=0 with the arithmetic shown
- agent-design-patterns/07: undefined score() equation replaced with rubric
  prose; Condorcet table added (N=1/5/11/25 → .70/.84/.92/.98, fixing the
  slightly-off 91% claim); Borda one-line worked example added
- agent-design-patterns/11: langgraph WikiLink added at the state-graph
  section; ReAct-loop back-link added at first Thought/Action/Observation use
- building-with-llms/09: drift-proxy worked example added; cost-formula
  symbols defined
- wiki/agent-protocols-mcp-a2a: JSON-RPC one-line gloss added

**Applied (quiz coverage, partial):** added missing-lesson coverage using
existing registry ids — linalg-svd-rank, calc-jacobian-shape + calc-vjp,
prob-kl-asymmetry, glm-identify-distribution, hpo-random-vs-grid.

**Applied (meta):** CLAUDE.md roadmap rows corrected (linear-algebra 4+quiz,
calculus 4+quiz, prob-stats 7+quiz, linear-regression 4+quiz) and
optimization-ml added; LowRankViz/KLDivergenceViz/OptimizerPathViz added to
the viz registry; prompts/new-lesson.md gained a "when inserting a lesson"
checklist (neighbour dedup, quiz update, back-links, hours recompute).

**Deferred → completed in Fix pass #2 (below).**

---

## Fix pass #2 — 2026-07-04 (clears the deferred list)

- **New viz components** (pure-SVG, viz-kit conventions, registered in
  `mdxComponents.tsx` + CLAUDE.md registry):
  - `TraceWaterfallViz` — span waterfall with a sequential/parallel toggle;
    latency drops to the slowest branch while cost stays fixed. Wired into
    building-with-llms/09 (tracing section) and agent-design-patterns/11
    (cost/latency section).
  - `CondorcetViz` — P(majority correct) vs N with a slider for per-agent
    accuracy p; dragging p below 0.5 shows the majority getting *worse*.
    Wired into agent-design-patterns/07 under the Condorcet table.
- **Fresh quiz-id backfill**: 21 new quiz-only exercises added to the
  registry (`linalg-quiz-*` ×6, `calc-quiz-*` ×6, `prob-quiz-*` ×6,
  `linreg-quiz-glm`, `opt-quiz-hpo`, plus `prob-cross-entropy-identity` for
  lesson 05). All five foundation/classical quizzes now contain **zero**
  reused lesson ids and cover every lesson including the newest.
- **probstat 01↔02 deeper dedup**: lesson 02's expectation/variance section
  now recalls lesson 01's definitions in one line and keeps only the new
  material (the variance shortcut identity).
- **Exercise-placement convention**: trailing exercise blocks (stranded
  after "Related concepts") relocated to before the end-matter sections in
  20 lessons across the five reviewed courses; convention documented in
  `prompts/new-lesson.md` ("Exercise placement" section).
- **Small items**: linreg/04 gained a seeded NumPy GDA-fit snippet matching
  its worked example; probstat/05 gained a second exercise
  (`prob-cross-entropy-identity`); calc/01's out-of-scope chain-rule common
  mistake replaced with a directional-derivative normalization mistake.

Nothing remains deferred from the first six review iterations.
