# Plan — wiki/arima-order-selection (time-series)
ADF differencing + ACF/PACF + AIC/BIC + Ljung-Box (statsmodels). Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: Raw nonstationary/diff stationary d=1; AIC picks (0,1,1) with white residuals. Gotcha demo: over-differencing inflates variance. (requires statsmodels; verified locally after pip install.)
