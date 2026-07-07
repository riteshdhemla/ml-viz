# Plan — nlp/02-word-embeddings (applied flex)

From-scratch skip-gram + negative sampling, analogy, PCA viz, static-vs-contextual,
DML #111 PMI.

## Added
0. **Intuition** — meaning→geometry; predictive vs count-based routes.
2. **Validation** — count-based **PPMI + `sklearn.TruncatedSVD`** recovers the same
   king↔queen geometry as skip-gram (assert king's NN == queen).
3. **"what to notice"** on the parallel analogy arrows and polysemy.
4. **Gotchas** — PMI vs raw counts (demo: 'the' has high count, ~0 PPMI), negative
   sampling k, cosine not Euclidean, analogy over-hype.
6. **Key takeaways**.

## Done when
PPMI+SVD validation asserted; gotchas + recap; exercises + DML pass; runs. ✅ (4 asserts)
