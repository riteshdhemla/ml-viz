# Plan — wiki/independent-component-analysis (unsupervised)
Kurtosis + FastICA from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Mixing gaussianizes (kurtosis 1.31->0.68); FastICA recovers sources (corr 1.0). Gotcha demo: ICA fails on Gaussian sources (best corr 0.81 vs 1.0).
