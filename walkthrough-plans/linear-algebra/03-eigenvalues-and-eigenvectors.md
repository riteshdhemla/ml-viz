# Plan — linear-algebra/03-eigenvalues-and-eigenvectors  (foundations flex)

## Sections
0. **Header + Intuition** — eigenvectors are the directions a matrix only *stretches*
   (never rotates); the eigenvalue is the stretch factor. They power PCA, PageRank,
   stability analysis, and understanding what repeating a transform does.
1. **From scratch** — derive the eigenvalues by hand from the characteristic
   polynomial `λ² − tr·λ + det = 0`, and each eigenvector as a null-space direction
   of `(A − λI)`; check the trace/determinant invariants.
2. **The library way + validation** — `np.linalg.eig` (eigenvectors as **columns**);
   assert its eigenvalues match the hand-derived ones and verify `A v = λ v`.
3. **Visualize** — the eigenvector figure (eigenvectors stay collinear, a random
   vector rotates) and PCA-from-scratch (covariance eigendecomposition), each with a
   "what to notice."
4. **Limitations & numerical gotchas** — real matrices can have **complex**
   eigenvalues (rotation → ±i); **symmetric** matrices have real eigenvalues +
   orthogonal eigenvectors, so use `eigh` (faster/stabler); **defective** matrices
   (repeated eigenvalue, `[[1,1],[0,1]]`) aren't diagonalizable; `eig` output is
   unsorted with sign-ambiguous eigenvectors.
5. **Your turn** — keep eigvals-2x2 and power-iteration exercises + DML toolkit.
6. **Key takeaways** — recap + link to SVD lesson.

## Gaps vs current
Bare headings (2, 8); no intuition, no scratch-vs-library validation, no
gotchas/complex-eigenvalue section, no takeaways. Reuse by-hand derivation,
`np.linalg.eig`, both figures, and all exercises.

## Done when
All flexed sections present; hand eigenvalues match `np.linalg.eig` via assert;
figures have takeaways; complex/symmetric/defective gotchas shown; cells run.
