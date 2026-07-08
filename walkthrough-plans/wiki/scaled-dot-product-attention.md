# Plan — wiki/scaled-dot-product-attention (transformers)
Scaled dot-product attention from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Var(q.k)=d_k; weights row-stochastic. Gotcha demo: without 1/sqrt(d_k) softmax saturates (low entropy).
