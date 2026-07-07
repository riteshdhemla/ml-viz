# Plan — time-series/04-demand-forecasting-in-production (applied flex)
From-scratch: hierarchy + holidays + quantile reg + exercise. Retrofit to 7-part template. (statsmodels not installed → numpy-only validation.)
## Added
0. Intuition. 2. Validation — bottom-up coherence (children sum to parents); quantile monotonicity (no crossing). 4. Gotchas — incoherent hierarchy, quantile crossing, holiday leakage, mean-vs-p90 SLA demo. 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
