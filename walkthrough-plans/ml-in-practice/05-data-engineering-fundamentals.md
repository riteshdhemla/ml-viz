# Plan — ml-in-practice/05-data-engineering-fundamentals (systems flex)
Row/col layout, batch vs streaming, partition skew. Retrofit: intuition + 2 validations + gotchas + key takeaways.
Validation: Batch/stream latency-throughput tradeoff; skew p99>>p50 + slow partition dominates tail. Gotcha demo: count-balanced != work-balanced (hot partition).
