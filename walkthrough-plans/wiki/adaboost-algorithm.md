# Plan — wiki/adaboost-algorithm (ensemble)
Decision stump + AdaBoost loop from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Reweighting -> misclassified mass 0.5, alpha=0.5ln((1-e)/e); training error ->0. Gotcha demo: stump is exactly chance (0.5) on the weights it produced.
