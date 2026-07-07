# Plan — probability-statistics/02-probability-distributions (concept flex)

Already strong (scipy throughout: PMF/PDF, distribution gallery, moment checks,
Gaussian normalization integral, Bernoulli MLE, exercises + DML bank).

## Added
0. **Intuition** — the named distributions ML reaches for; PMF (probability) vs PDF
   (density > 1 allowed, area = 1).
2. **Library way + validation** — `scipy.stats.norm.fit` recovers `(μ,σ)`; assert
   scipy's `pdf` equals the hand formula.
3. Per-figure **"what to notice"** on PMF/PDF, the gallery (incl. CLT), moment checks,
   normalization integral, and the MLE hill.
4. **Gotchas** — density≠probability; population vs sample variance (`ddof`);
   `log(0)` in log-likelihood; CLT needs finite variance.
6. **Key takeaways** recap.

Reuse all existing figures/code and exercises verbatim.

## Done when
scipy fit + validation added; gotchas + recap present; figures have takeaways;
exercises pass; runs.
