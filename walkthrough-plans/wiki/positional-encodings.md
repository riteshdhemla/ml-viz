# Plan — wiki/positional-encodings (transformers)
Sinusoidal/RoPE/ALiBi from scratch (torch). Retrofit: intuition + 3 validations + gotchas + takeaways.
Validation: Sinusoidal bounded/unique; RoPE preserves norms; ALiBi diagonal-0 + distance penalty. Gotcha demo: ALiBi translation invariance -> length extrapolation.
