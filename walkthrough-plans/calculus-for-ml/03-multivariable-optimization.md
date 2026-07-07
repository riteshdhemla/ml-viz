# Plan — calculus-for-ml/03-multivariable-optimization

## Bug
Cell 4's markdown promises a finite-difference **Hessian** verification (with the 4-point
stencil), but cell 5 instead does critical-point classification — the numerical Hessian
check is missing. **Add it.**

## Sections
0. Header + **Intuition** — find where `∇f = 0` (critical points), read the **Hessian**
   (curvature) to classify them, Newton uses curvature to jump to the min, and the safe
   learning rate is bounded by the largest Hessian eigenvalue.
1. **From scratch** — analytic `f`, `∇f`, Hessian; solve `∇f = 0`; **finite-difference
   Hessian check** (fills the gap); classify the min/saddle/max trio by eigenvalue sign.
2. **The library way + validation** — `scipy.optimize.minimize` finds the same minimum;
   `jax.hessian` computes the Hessian automatically; assert both match the by-hand values.
3. **Visualize** — one Newton step vs one gradient step; the eigenvalue convexity test;
   3-D min/saddle/non-convex surfaces; learning-rate sweep (stable → diverging). Expand
   the two bare headings; each figure gets a "what to notice."
4. **Gotchas** — saddle points (`∇f = 0` isn't enough); `η > 2/λ_max` diverges;
   ill-conditioning `λ_max/λ_min` slows GD; non-convexity → local minima; Newton needs
   an invertible, positive-definite Hessian.
5. **Your turn** — gradient and Hessian-classification exercises.
6. **Key takeaways** + link to Jacobians.

## Done when
FD Hessian added and asserted == analytic; scipy min + jax hessian validate; bare
headings expanded; every figure has a takeaway; gotchas shown; exercises pass; runs.
