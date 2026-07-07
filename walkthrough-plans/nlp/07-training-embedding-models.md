# Plan — nlp/07-training-embedding-models (applied flex)

InfoNCE + analytic gradient, contrastive training, triplet loss with semi-hard
mining, held-out retrieval, infonce_loss exercise.

## Added
0. **Intuition** — similarity→geometry via contrastive learning, no labels.
1. **Upgraded** the analytic InfoNCE gradient to the **exact** L2-normaliser Jacobian
   (I − ââᵀ)/||a|| (was an approximation).
2. **Validation** — finite-difference **gradient check** of the hand-derived gradient
   (matches to ~1e-9, both dA and dP).
4. **Gotchas** — temperature, batch size = #negatives, hardest-negative collapse,
   normalise-before-dot; demo: tau sweep → loss climbs to log B floor.
6. **Key takeaways**.

## Fixed
Pre-existing test bug: "random-init loss ≈ log B" only holds at temperature 1, but
the test checked it at tau=0.1 (gave 3.78 vs 2.77). Split: log-B check at tau=1,
contrast check at tau=0.1.

## Done when
gradient check asserted; gotchas + recap; exercise passes; runs. ✅ (2 asserts)
