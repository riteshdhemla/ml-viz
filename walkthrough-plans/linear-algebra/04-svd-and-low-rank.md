# Plan — linear-algebra/04-svd-and-low-rank

## Current state
Four tight sections (SVD = rotate·stretch·rotate, PCA connection, Eckart–Young
check, image compression) + two exercises + DML bank. Each `##` has a one-line
lead-in, but they state the concept without walking the code, and there are no
"what to notice" follow-ups after the four outputs/figures.

## Target edits (code untouched)
1. Expand cell 2: `np.linalg.svd(full_matrices=False)` returns `U, s, Vt`; the
   cell checks `UᵀU=I`, `VVᵀ=I`, `s ≥ 0` sorted, and exact reassembly.
2. After 3: all checks True → the factorization is exact and the pieces really are
   rotation / stretch / rotation.
3. Expand cell 4: right singular vectors of centered `X` = principal components,
   and `σ²/n` = the variance along each — same PCA, two routes.
4. After 5: the eigen-route and SVD-route variance numbers match to 4 dp.
5. Expand cell 6: build `A_k` from the top-k triplets; `‖A−A_k‖_F = √Σσ²` and the
   random rank-k attempts can't beat it.
6. After 7: truncation error equals the discarded-tail RSS; best random attempt is
   larger → Eckart–Young is optimal.
7. Expand cell 8: truncate at k = 1,3,10,128 and plot the energy kept; also the
   log-spectrum.
8. After 9: structure returns rank by rank; the spectrum shows a few big values
   then a noise floor — that gap is what makes compression possible.

## Done when
Lead-ins walk the code, every output/figure has a takeaway, JSON valid, cells run.
