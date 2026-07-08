# Plan — wiki/roc-auc (model-evaluation)
ROC/AUC from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: AUC=rank-sum; prevalence-invariant. Gotcha demo: high AUC hides poor precision on rare positives (AUC 0.74 vs AP 0.05). FIXED pre-existing bugs: np.trapz (numpy 2.0) -> np.trapezoid; dead broken line using array in scalar if.
