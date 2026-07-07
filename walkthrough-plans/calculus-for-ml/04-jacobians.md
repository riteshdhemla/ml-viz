# Plan — calculus-for-ml/04-jacobians

## Bug
Cell 2 claims Jacobians are computed "three ways — by hand, finite differences, and
**autograd**", but no autograd appears. Either fix the claim or deliver it — I'll
**deliver** it as the §2 library section (`jax.jacobian`).

## Sections
0. Header + **Intuition** — the Jacobian is the gradient generalized to vector→vector
   maps: the `m×n` matrix of all partials, the best linear approximation of a layer, and
   the object backprop multiplies through the chain rule.
1. **From scratch** (pure stdlib) — definition + affine (`J = W`), element-wise
   (diagonal), softmax (`diag(σ) − σσᵀ`), and the chain rule (`J_g·J_f`), each checked
   by finite differences. Add "what to notice" after each.
2. **The library way + validation** — `jax.jacobian` (jacrev/jacfwd) on the affine and
   softmax layers; assert it matches the analytic Jacobians. Note reverse-mode = backprop.
3. **Visualize** — VJP vs full-Jacobian cost scaling; condition number per layer
   (Xavier vs large init). Each with a takeaway.
4. **Gotchas** — softmax Jacobian is **singular** (rows sum to 0); forward vs reverse
   mode (`jacfwd` when m≫n, `jacrev`/backprop when n≫m); condition-number blow-up
   vanishes/explodes gradients.
5. **Your turn** — softmax-Jacobian, affine-VJP, condition-number exercises.
6. **Key takeaways** (already present) + link to next course.

## Done when
Cell 2 claim fixed; jax.jacobian asserted == analytic (affine + softmax); figures have
takeaways; singular-Jacobian + mode gotchas shown; exercises pass; runs.
