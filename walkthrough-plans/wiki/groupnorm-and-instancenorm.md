# Plan — wiki/groupnorm-and-instancenorm (deep-learning)
BatchNorm/LayerNorm/InstanceNorm/GroupNorm from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: GroupNorm interpolates (G=1=LN, G=C=IN); InstanceNorm affine-invariant. Gotcha demo: BatchNorm collapses on single sample, GroupNorm does not.
