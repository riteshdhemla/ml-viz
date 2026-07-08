# Plan — wiki/vanishing-gradient-analysis (rnns)
lambda^n bound + empirical grad + LSTM fix from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: lambda^n vanishes<1/explodes>1; empirical grad vanishes with T. Gotcha demo: LSTM open forget gate (constant error carousel) preserves gradient.
