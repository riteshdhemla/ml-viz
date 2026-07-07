# Plan — bayesian-methods/02-gaussian-processes (algorithm flex)
RBF kernel, closed-form GP posterior, length-scale sweep, exercise + DML 186 GP class.
## Added
0. Intuition (prior over functions; kernel; exact posterior).
2. Validation — GP interpolates data (mean==y at obs, tiny noise); uncertainty grows in gaps; length-scale sets correlation range (monotone) & short-l reverts to prior in gaps.
4. Gotchas — O(n^3) (timing demo), length-scale, kernel choice, jitter, reverts-to-prior.
6. Key takeaways. ✅ 4 asserts.
