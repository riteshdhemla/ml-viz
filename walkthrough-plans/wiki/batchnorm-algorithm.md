# Plan — wiki/batchnorm-algorithm (deep-learning)
BatchNorm forward/running-stats/backward from scratch. Retrofit: intuition + 3 validations + gotchas + takeaways.
Validation: Standardizes then gamma/beta rescale; running mean->data mean; tames activation drift (no-BN std explodes). Gotcha demo: single-sample collapse in train mode vs eval running stats.
