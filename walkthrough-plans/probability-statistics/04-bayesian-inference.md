# Plan — probability-statistics/04-bayesian-inference

Strong already (medical-test Bayes, Beta-Bernoulli conjugacy, sequential updating,
MAP=L2 normal equations).

## Added
- **Intuition** — posterior ∝ prior × likelihood; MAP = MLE + prior = regularization.
- **Library way + validation** — `sklearn.Ridge(fit_intercept=False)` asserted to equal
  the from-scratch `map_solution` (MAP = L2, exactly).
- Per-figure **takeaways** (base-rate surprise, conjugate update, sequential sharpening,
  ridge shrinkage path).
- **Gotchas** — prior dominates scarce data; conjugacy is special (else MCMC); base-rate
  neglect; improper priors.
- **Key takeaways** recap.

## Done when
MAP==Ridge asserted; gotchas + recap present; exercises pass; runs.
