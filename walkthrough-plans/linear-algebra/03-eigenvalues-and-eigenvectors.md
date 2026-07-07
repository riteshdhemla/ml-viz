# Plan — linear-algebra/03-eigenvalues-and-eigenvectors

## Current state
Strong: `np.linalg.eig`, by-hand characteristic-poly derivation, eigenvector
geometry figure, PCA-from-scratch figure, two exercises (eigvals, power iteration),
DML toolkit. Cells 4 and 6 already have good lead-ins.

**Gaps:** cells 2 (`## Computing eigenvalues`) and 8 (`## PCA from scratch`) are
bare headings; no "what to notice" after the eig output (3), by-hand derivation (5),
eigenvector figure (7), or PCA figure (9).

## Target edits (code untouched)
1. Cell 2 → lead-in: the eigen-equation `A v = λ v`, that `np.linalg.eig` returns
   eigenvectors as **columns**, and that the loop checks `Av == λv`.
2. After 3: eigenvalues 5 and 2; each `Av` lands exactly on `λv` → confirmed.
3. After 5: hand-derived roots match NumPy; `Σλ = tr`, `Πλ = det` — the two
   invariants.
4. After 7: the two eigenvector arrows and their transforms stay collinear (only
   length changes by λ), while the random arrow visibly rotates.
5. Cell 8 → lead-in: PCA = eigendecomposition of the covariance; `eigh` for
   symmetric matrices, sort eigenvalues descending, PC1 = top eigenvector.
6. After 9: PC1 aligns with the data's long axis and captures the large majority
   of variance; projecting onto it keeps the spread, collapsing 2D→1D.

## Done when
Every code cell has a walking lead-in; all figures + numeric outputs have a
takeaway. JSON valid, concept cells run.
