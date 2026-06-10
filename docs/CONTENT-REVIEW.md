# Content Review — Coherence & Understandability

**Date:** 2026-06-10 · **Scope:** all 17 courses, 47 lessons, 47 notebooks, course structure, navigation.
**Method:** every lesson/notebook reviewed against the house style (gold standard: `neural-networks/01` and `02`), plus a cross-cutting structural audit.

The actionable backlog derived from this review lives in [`docs/IMPROVEMENT-TASKS.md`](./IMPROVEMENT-TASKS.md).

---

## What's healthy (verified, no action needed)

- **Exercise integrity:** 141 exercises defined in `src/lib/exercises.ts`, all 141 referenced from lessons, zero missing ids, zero orphans. Every lesson has ≥1 (most have exactly 3).
- **Notebook ↔ lesson mapping:** perfect 1:1 both directions; all 47 `.ipynb` files are valid JSON; back-links and Colab URLs consistent.
- **Internal links:** every `](/courses/...)` reference resolves to a real lesson. No dead links.
- **Viz registry:** all 22 registered components are used; nothing stale, nothing unregistered.
- **Pedagogical ordering:** within-course lesson progressions are sound in all 17 courses; the prerequisite DAG is acyclic with valid slugs; course `order` values produce a sensible learning path.
- **Math notation:** consistent across all courses ($\mathbf{w}$, $\hat{y}$, $\eta$, $\nabla L$; SVM's use of $C$ is documented).

---

## Findings (ranked by impact)

### F1 — Course `estimatedHours` inflated 2–5× everywhere (HIGH, trivial fix)

Every one of the 17 `index.mdx` files overstates hours vs. the sum of lesson `estimatedMinutes` (e.g. linear-algebra claims 4 h for 54 min of lessons; graphical-models claims 5 h for 72 min). This misleads learners and undermines trust in the roadmap.

**Decision needed (pick one, document in CLAUDE.md):**
- (a) `estimatedHours` = sum of lesson minutes only → shrink all values, or
- (b) `estimatedHours` = lessons + notebook + exercises (~2.5× lesson time) → keep larger values but document the convention.

Recommended: **(b)** with the multiplier documented — notebooks are a core part of each lesson.

### F2 — House-style sections missing in 2 course groups (HIGH)

The "Real-world examples" opener and "Common mistakes" section are present in all supervised/unsupervised/sequence courses but missing in:

| Course | Missing |
|---|---|
| linear-algebra (3 lessons) | Common mistakes ×3; Real-world examples in lessons 02, 03 |
| calculus-for-ml (3 lessons) | Common mistakes ×3; Real-world examples ×3 |
| probability-statistics (3 lessons) | Common mistakes ×3; Real-world examples ×3 |
| generative-models | Common mistakes in lessons 01–04 |

Also missing worked numeric examples: `generative-models/01` (compute $P(x)$ for a 2D Gaussian) and `reinforcement-learning/03` (one hand-worked DQN training step).

### F3 — 25 of 47 lessons have no interactive visualization (HIGH, biggest effort)

Visualization coverage is 22/47 (47%). The gap is worst exactly where concepts are most abstract:

- **Reinforcement learning: 0/4 lessons** — GridWorld/value-iteration, Q-table convergence, DQN replay/target-net, policy-gradient flow
- **Generative models: 0/5 lessons** — latent space interpolation, GAN mode collapse, diffusion forward/reverse
- **Graphical models: 0/3** — d-separation, Viterbi/forward tables
- **RNNs: 2/3 missing** — hidden-state evolution, LSTM gates
- **Transformers: 2/3 missing** — multi-head/positional encoding, architecture flow
- **Ensemble methods: 0/2** — bagging/voting, boosting reweighting
- **Plus:** svm/02 (kernel trick), cnns/02 (pooling), cnns/03 (transfer learning), clustering/02 (DBSCAN/dendrogram), pca/02 (t-SNE/UMAP params), probabilistic-models 01–02 (GMM responsibilities/EM)

Prioritized by "concept hardness without animation": KernelViz, LSTMViz, DSeparationViz, GridWorldViz, DiffusionViz, BoostingViz first.

### F4 — Foundational prerequisites not declared (MED)

`neural-networks`, `cnns`, `rnns`, `svm`, `clustering`, `pca-dimensionality`, etc. declare no dependency on `linear-algebra` / `calculus-for-ml` / `probability-statistics`, although their content assumes them. Declaring these makes the learning path explicit and enables future unlock UI.

### F5 — Progress tracked but never displayed (MED)

`src/lib/progress.ts` implements `getCourseProgress()` (0–100%) but no component calls it. There is no course progress bar, no global dashboard, and no "recommended next course". Lesson completion state exists but is invisible at the catalog level.

### F6 — Zero lesson-type and low exercise-type diversity (MED)

47/47 lessons are `type: concept` (the schema supports quiz/playground); 139/141 exercises are multiple-choice (slider exists but is used twice). Pacing would benefit from end-of-course quiz lessons and parameter-tuning slider exercises.

### F7 — Polish items (LOW)

- `notebooks/linear-algebra/01` and `02` end with print statements instead of a closing visualization (convention violation).
- `notebooks/reinforcement-learning/03-deep-q-networks.ipynb` is thinner (9 cells) than its peers; replay-buffer mechanics deserve a demo.
- `generative-models/05`: diffusion-vs-GAN-vs-VAE table is neutral — add a callout explaining *why* diffusion became dominant (stability + quality, at the cost of sampling speed).
- `generative-models/02`: code computes summed MSE, narrative says mean — align them.
- `graphical-models/01`: d-separation's chain/fork/collider patterns need concrete sprinkler-network mini-examples; `03`: Viterbi backpointer table is terse.
- `probabilistic-models/02`: EM worked example shows one iteration only — add the second responsibility table to show evolution.
- `neural-networks/03` is never cross-linked from another lesson — add a forward link from lesson 01's "Related concepts".

---

## Suggested sequencing

1. **Wave 1 (metadata & text, ~1 h each):** F1 hours fix → F4 prerequisites → F2 missing sections (one course per task) → F7 polish.
2. **Wave 2 (visualizations, ~1 h each):** one viz + lesson wiring + CLAUDE.md table row per task, hardest-concept first.
3. **Wave 3 (features):** F5 progress UI, F6 quiz lessons / slider exercises.

Each wave's tasks are independent and sized for a single agent run — see `docs/IMPROVEMENT-TASKS.md`.
