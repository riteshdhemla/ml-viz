# Plan — bayesian-methods/01-bayesian-linear-regression (algorithm flex)
Closed-form Gaussian posterior, posterior-mean==ridge (existing assert), predictive bands, exercise.
## Added
0. Intuition (distribution over lines; mean=ridge; var=noise+epistemic).
2. Validation — alpha->0 recovers OLS, strong prior shrinks; predictive var>=noise floor & grows OOD.
4. Gotchas — prior strength, noise precision, conjugacy, linear-basis, extrapolation; demo: more data kills epistemic var, not noise floor.
6. Key takeaways. ✅ 4 asserts.
