# Plan — calculus-for-ml/02-chain-rule-and-backpropagation

## Cleanup
Cells 6–7 duplicate the 1-hidden-layer backprop of cells 4–5 (which is strictly
better: wraps a `forward()` and finite-difference-checks *every* gradient). **Drop 6–7.**

## Sections
0. Header + **Intuition** — the chain rule multiplies local derivatives along a path;
   backprop = the chain rule swept right-to-left through the computational graph,
   reusing work. This is how every network computes its gradients.
1. **From scratch** — (a) a scalar example `h = σ(3x²)`: forward, backward one node at a
   time, numeric check; (b) a 3→4(ReLU)→1(sigmoid) net with BCE: hand backprop +
   finite-difference check of W1/b1/w2/b2.
2. **The library way + validation** — rebuild the same net in `jax`, take
   `jax.grad` of the loss w.r.t. the params, and assert it matches the hand backprop.
3. **Visualize** — vanishing gradients: sigmoid vs ReLU across 20 layers (log scale).
4. **Gotchas** — BCE `log(0)` instability (the `+1e-12`); dead ReLU (zero gradient);
   vanishing vs exploding products through depth; autodiff must keep the forward
   activations in memory.
5. **Your turn** — chain-rule-by-hand and tiny-network backprop exercises.
6. **Key takeaways** + link to multivariable-optimization.

## Done when
Duplicate removed; jax grad asserted == hand backprop on every param; vanishing plot
has a takeaway; gotchas shown; all exercises pass; cells run.
