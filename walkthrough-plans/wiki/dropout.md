# Plan — wiki/dropout (deep-learning)
Inverted dropout + dropout training from scratch (torch). Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Inverted dropout unbiased; dropout raises train loss (regularizer cost, underfits at p=0.8). Honest: does NOT help test loss on this small clean problem. Gotcha demo: train vs eval mode (model.eval()).
