# Plan — ml-in-practice/04-ml-systems-design (systems flex)
Goodhart (CTR vs retention), composite objective/Pareto, latency tail, cost/accuracy Pareto. Retrofit: intuition + 3 validations + gotchas + key takeaways.
Validation: Goodhart: proxy up, retention down; p99>>p50 + tax raises SLO breaches; Pareto front {A,B,D}. Gotcha demo: composite objective recovers retention. FIXED pre-existing bug: candidate C was not actually dominated (acc 0.86>B) -> set to 0.845.
