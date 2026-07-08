# Plan — wiki/acf-pacf-interpretation (time-series)
AR/MA/white-noise ACF+PACF from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: AR ACF tails off/PACF cuts off; MA mirror. Gotcha demo: AR/MA duality. FIXED pre-existing bug: yule_walker_pacf Toeplitz used rho_1 on diagonal (not rho_0=1) -> |PACF|>1; rebuilt as standard Yule-Walker.
