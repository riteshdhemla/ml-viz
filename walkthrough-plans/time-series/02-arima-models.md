# Plan — time-series/02-arima-models (applied flex)
From-scratch: AR/MA/ARIMA + ACF/PACF + AIC + exercise. Retrofit to 7-part template. (statsmodels not installed → numpy-only validation.)
## Added
0. Intuition. 2. Validation — AR(1) ACF~phi^k (corr>.95), MA(1) ACF cuts off; AIC prefers AR term. 4. Gotchas — wrong d (over-diff demo), ACF-vs-PACF, AIC-vs-BIC, SARIMA. 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
