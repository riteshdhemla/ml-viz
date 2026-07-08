# Plan — wiki/factor-analysis (unsupervised)
FA via EM from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Recovers per-dim Psi (corr 0.98); FA beats PCA on covariance (heteroscedastic noise). Gotcha demo: rotational indeterminacy (Lambda R gives same covariance). Note: ll_history empty in class, validated Psi recovery instead.
