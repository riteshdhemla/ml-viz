# Plan — wiki/ridge-lasso-paths (regularization)
Ridge closed-form + ridge/lasso paths from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Ridge shrinks (w1<w0); lasso sparse (4 zeros) vs ridge dense. Gotcha demo: ridge spreads correlated weight, lasso concentrates. FIXED 2 pre-existing bugs: centered constant column made lam=0 OLS singular (use 1e-6); LassoCV n_alphas removed in sklearn>=1.9 (use default).
