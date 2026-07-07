# Plan — calculus-for-ml/01-derivatives-and-gradients  (foundations flex)

## Sections
0. Header + **Intuition** — a derivative is *sensitivity* (how much output moves per
   unit input); the gradient points in the steepest-ascent direction; training walks
   the negative gradient. Autodiff computes these exactly, for free.
1. **From scratch** — analytical derivative + **central-difference** numerical gradient
   (reuse the numerical-vs-analytical verification); shows they agree to ~1e-10.
2. **The library way + validation** — `jax.grad` (autodiff, Colab-standard); assert it
   matches both the analytical and numerical gradients.
3. **Visualize** — tangent-line figure, gradient-descent-on-a-bowl figure, sigmoid
   derivative `σ(1−σ)`; each with a "what to notice."
4. **Gotchas** — finite-difference step size is a U-curve (truncation vs round-off);
   saturated units have ~0 gradient (vanishing gradients); too-large learning rate
   diverges; non-differentiable points (ReLU at 0 → subgradient).
5. **Your turn** — central-difference, 1-D GD, and DML polynomial-derivative exercises.
6. **Key takeaways** + link to chain-rule lesson.

## Library choice
`jax.grad` for autodiff (available locally and in Colab; verifiable). scipy/sympy not
needed here.

## Done when
All sections present; jax grad asserted == analytical == numerical; figures have
takeaways; finite-diff U-curve + ReLU-kink gotchas shown; cells run; JSON valid.
