# Plan — linear-algebra/01-vectors-and-spaces

## Current state
Strong notebook: 16 content cells + full "Your turn" + DML extra-practice bank.
Code is clean and correct. **Gaps for walkthrough standard:**
- Cell 2 (`## Vector operations`) and cell 4 (`## Visualizing…`) are bare headings —
  no prose walking the reader into the code that follows.
- No "what to notice" after the two Matplotlib figures (cells 5, 15) or after the
  numeric outputs (dot/angle in cell 3, rank/solve in cell 13).

## Target edits (surgical — keep all code verbatim)
1. **Cell 2 → real lead-in**: name the ops the next cell prints (`u+v`, `2*u`,
   dot, norms, angle) and connect dot-product → angle via `cosθ = u·v/(‖u‖‖v‖)`.
2. **After cell 3**: 1-line "what to notice" — angle ≈ 45°, dot is positive
   because the vectors point roughly the same way.
3. **Cell 4 → lead-in** for the addition/orthogonality figure: parallelogram law
   on the left, dot-vs-`a=[1,0]` on the right (dot = the x-coordinate here).
4. **After cell 5 figure**: what to observe — u+v is the diagonal; c at 45° has
   dot 0.71, the axis-aligned b has dot 0.
5. **After cell 13**: note the singular vs solvable contrast (dependent set has
   rank 1; independent basis gives a unique coefficient solution).
6. **After cell 15 figure**: normalization collapses all arrows onto the unit
   circle — direction preserved, length set to 1.

Keep header, style cell, exercises, and DML bank untouched.

## Definition of done
Every code cell has a walking lead-in; both figures and the key numeric cells
have a follow-up takeaway. JSON valid.
