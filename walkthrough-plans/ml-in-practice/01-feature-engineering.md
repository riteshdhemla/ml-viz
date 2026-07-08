# Plan — ml-in-practice/01-feature-engineering (foundations flex)
Scaling (Standard/MinMax/Robust) + categorical encoding + the leakage trap. Retrofit: intuition + validation + gotchas + key takeaways.
Validation: RobustScaler-resists-outliers; leak = fit-scaler-on-train-only (pipeline vs leaky). Gotcha demo: naive target encoding makes a random ID "predictive" (leakage).
