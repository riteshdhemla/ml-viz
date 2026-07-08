# Plan — ml-in-practice/17-feature-stores (systems flex)
Point-in-time (as-of) vs naive join. Retrofit (noKT): intuition + validation + gotchas.
Validation: Naive latest-value join leaks future; as-of uses only past. Gotcha demo: leaked rows teach signals absent at inference.
