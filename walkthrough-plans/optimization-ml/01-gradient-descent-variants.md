# Plan — optimization-ml/01-gradient-descent-variants (algorithm)
From-scratch SGD/Momentum/RMSprop/Adam on Rosenbrock + Adam bias-correction + LR schedules.
## Added: intuition; library way — optax.adam validated == our run_adam (atol 1e-4, x64);
per-figure takeaways; tradeoffs table (SGD/Momentum/Adam) + gotchas (LR divergence demo,
2x Adam memory, warmup, SGD generalization); key takeaways. Exercises + optimizer bank kept.
