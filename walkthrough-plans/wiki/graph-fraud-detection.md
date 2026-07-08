# Plan — wiki/graph-fraud-detection (graphs)
GraphSAGE + risk propagation from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: GraphSAGE embeds per node; risk spreads to connected accounts, stops at clean ones. Gotcha demo: over-propagation flags distant innocents (false positives).
