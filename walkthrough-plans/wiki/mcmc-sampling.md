# Plan — wiki/mcmc-sampling (bayesian)
Metropolis + Gibbs from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Metropolis recovers posterior; proposal scale sets acceptance. Gotcha demo: Gibbs autocorrelation (lag-1 0.80). FIXED pre-existing bug: gelman_rubin cell sliced the (chain,acc) tuple instead of the chain -> ZeroDivisionError.
