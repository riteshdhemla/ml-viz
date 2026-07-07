# Plan — probability-statistics/03-maximum-likelihood-estimation

Strong from-scratch already (grid vs closed-form MLE for Gaussian & Bernoulli;
MLE=cross-entropy via GD logistic).

## Added
- **Intuition** — MLE = params that make the data most probable; NLL = the loss ML
  minimizes (Gaussian NLL = MSE, Bernoulli NLL = cross-entropy).
- **Library way + validation** — `sklearn.LogisticRegression(C=1e12)` fit asserted to
  match the from-scratch GD coefficients.
- Per-figure **takeaways** (Gaussian/Bernoulli/logistic).
- **Gotchas** — biased `÷n` MLE variance vs `÷(n−1)`; `log(0)` guards; MLE overfits
  tiny samples (→ prior/regularization); multimodal likelihoods.
- **Key takeaways** recap.

## Done when
sklearn match asserted; gotchas + recap present; exercises pass; runs warning-free.
