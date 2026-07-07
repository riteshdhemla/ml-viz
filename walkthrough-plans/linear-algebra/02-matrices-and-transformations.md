# Plan — linear-algebra/02-matrices-and-transformations

## Current state
Rich: transform gallery, composition, rank/det, determinant-as-area (+ shoelace
check), before/after figure, two exercises, two big DML banks. Code is solid.

**Gaps for walkthrough standard:**
- Cell 2 lead-in is one thin line; doesn't walk the `draw_transform` helper or the
  four example matrices.
- Cells 4 (`## Matrix multiplication as composition`) and 6 (`## Rank and
  invertibility`) are **bare headings**.
- No "what to notice" after the transform gallery (3), composition output (5),
  rank/det table (7), det-vs-shoelace (9), or before/after figure (11).

## Target edits (code untouched)
1. Expand cell 2: what `draw_transform` draws (square + its image + the two basis
   arrows), and read the four matrices as scale / rotate / project / shear.
2. After 3: which columns of each matrix are the landed basis vectors; the
   projection one is the tell for rank loss (square → segment).
3. Cell 4 → lead-in: `C = R @ S` means "scale first, then rotate"; matrices apply
   right-to-left, and order matters (`R@S ≠ S@R`).
4. After 5: `step2 == direct` confirms composition; the two products differ →
   non-commutative.
5. Cell 6 → lead-in: rank = independent directions; `det = 0` ⇔ rank-deficient ⇔
   singular ⇔ no inverse.
6. After 7: full-rank det 10 invertible; singular det 0; identity det 1.
7. After 9: `|det|` matches the shoelace image area on every row; `collapse`
   det 0 → area 0 → flattened to a line.
8. After 11: `det(A)=1.125` = product of the scale factors 1.5×0.75; rotation
   contributes 1, so area scales by 1.125 while the square tilts.

## Done when
Every code cell has a walking lead-in; all figures + numeric outputs have a
takeaway. JSON valid, concept cells run.
