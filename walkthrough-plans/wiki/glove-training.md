# Plan — wiki/glove-training (nlp)
Co-occurrence + weighted GD training from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Loss falls 90->0; ice~cold >> ice~hot. Gotcha demo: f(X) caps frequent pairs, zeroes empty ones. NOTE: mean_abs_error solution <details> after assert -> harness cannot substitute.
