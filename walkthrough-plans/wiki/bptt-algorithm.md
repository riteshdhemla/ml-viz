# Plan — wiki/bptt-algorithm (rnns)
Scalar RNN forward + BPTT from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: BPTT matches finite diff; gradient vanishes with T. Gotcha demo: Jacobian product W^(T-1) vanishes<1/explodes>1; tanh saturation biases toward vanishing (honest framing since grad_at_step1 saturates).
