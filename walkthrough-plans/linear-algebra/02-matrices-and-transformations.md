# Plan — linear-algebra/02-matrices-and-transformations  (foundations flex)

## Type: Foundations → flexed template

## Sections
0. **Header + Intuition** — a matrix *is* a linear transformation; multiplying by it
   warps space (scale/rotate/shear/flatten), composition chains transforms, the
   determinant is the area-scaling factor, rank is how many dimensions survive.
   Every layer of a neural net is a matrix multiply.
1. **From scratch** — implement mat-vec and mat-mat multiply with explicit loops;
   show the key insight that **the columns of A are where the basis vectors land**.
2. **The library way + validation** — `@`, `np.linalg.det`, `np.linalg.inv`,
   `np.linalg.matrix_rank`; assert the hand matmul and hand `ad−bc` match NumPy;
   reuse the rank/det/invertibility table.
3. **Visualize** — transform gallery (scale/rotate/project/shear), composition,
   determinant-as-area (+ shoelace check), before/after figure — each with a
   "what to notice."
4. **Limitations & numerical gotchas** — matrix multiply is **not commutative**
   (order matters); singular matrices (`det=0`) have no inverse and near-singular
   ones are **ill-conditioned** (tiny `det`, huge `cond`, error amplified);
   matmul is **O(n³)**; shape mismatches raise.
5. **Your turn** — keep both exercises + the two DML banks (matrix ops, linear
   systems) verbatim.
6. **Key takeaways** — recap + link to Eigenvalues lesson.

## Gaps vs current
Current: thin/bare lead-ins on cells 2/4/6, no from-scratch-vs-library framing, no
gotchas/complexity section, no intuition or takeaways. Reuse gallery, composition,
det/shoelace, before/after figure, and all exercises.

## Done when
All flexed sections present; hand matmul/det match NumPy via assert; figures have
takeaways; conditioning + complexity covered; recap added; cells run; JSON valid.
