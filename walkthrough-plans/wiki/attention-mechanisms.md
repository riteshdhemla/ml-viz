# Plan — wiki/attention-mechanisms (transformers)
Scaled dot-product + causal mask + MHA/GQA (torch). Retrofit: intuition + 3 validations + gotchas + takeaways.
Validation: Weights are distributions; causal mask zeros future; GQA shrinks KV cache. Gotcha demo: 1/sqrt(dk) scaling prevents softmax saturation. (requires torch; verified locally after pip install.)
