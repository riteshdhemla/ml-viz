# Plan — wiki/eigenvalue-computation (linear-algebra)
Power iteration + QR from scratch. Retrofit: intuition + 3 validations + gotchas + takeaways.
Validation: Power iteration->dominant; convergence in fewer iters for larger gap; QR matches numpy. Gotcha demo: deflation finds 2nd eigenvalue. FIXED pre-existing bug: cell 3 formatted ndarray with :.4f -> TypeError; use .round(4).
