# Plan — linear-algebra/04-svd-and-low-rank  (foundations, algorithm-ish)

## Sections
0. **Header + Intuition** — SVD factors *any* matrix into rotate·stretch·rotate
   (`U Σ Vᵀ`); the singular values rank each direction's importance, and keeping the
   top-k gives the **best low-rank approximation** — the engine behind compression,
   denoising, PCA, and recommenders.
1. **From scratch** — build the SVD from the eigendecomposition of `AᵀA`:
   `V` = eigenvectors, `σ = √eigenvalues`, `U = A V / σ`; check reconstruction.
2. **The library way + validation** — `np.linalg.svd`; assert the from-scratch
   singular values and reconstruction match, and that `U,V` are orthogonal.
3. **Visualize / apply** — PCA connection (SVD vs covariance eig), Eckart–Young
   truncation-error check (+ random rank-k can't beat it), image compression at
   rank 1/3/10/128 + the singular-value spectrum. Each with a "what to notice."
4. **Tradeoffs & gotchas** — `full_matrices` shapes (full vs economy), numerical
   **rank via a σ tolerance**, cost `O(mn·min(m,n))`, and **sign ambiguity** of the
   singular vectors.
5. **Your turn** — keep rank-k-approx and compression-ratio exercises + the DML
   SVD/sparse bank.
6. **Key takeaways** — recap + links (PCA lesson, course quiz).

## Gaps vs current
Thin one-line lead-ins on every section; no from-scratch SVD, no scratch-vs-library
validation, no gotchas (shapes/rank-tol/sign), no intuition or takeaways beyond the
footer. Reuse PCA/Eckart–Young/image code and all exercises.

## Done when
All sections present; from-scratch SVD matches `np.linalg.svd` via assert; figures
have takeaways; shapes/rank/sign gotchas shown; cells run; JSON valid.
