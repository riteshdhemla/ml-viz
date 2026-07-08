# Plan — wiki/gradient-checkpointing (systems)
Full-cache vs checkpointed backprop from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Identical gradients + lower peak; O(sqrt L) vs O(L) memory. Gotcha demo: recompute doubles forward calls (256->512).
