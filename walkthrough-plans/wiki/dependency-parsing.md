# Plan — wiki/dependency-parsing (nlp)
Arc-standard parser + UAS from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: n-1 arcs well-formed tree; oracle UAS=1, wrong<1. Gotcha demo: a wrong first action breaks the greedy parse (error propagation).
