# Plan — wiki/ddim-sampling (generative-models)
Noise schedule + DDPM/DDIM sampling from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: abar monotone 1->0; DDIM deterministic + 20x fewer steps; x0 inversion exact. Gotcha demo: x0_hat inverts forward noising. NOTE: estimate_x0 solution <details> after assert -> harness cannot substitute (concept+validations pass; net is untrained/illustrative).
