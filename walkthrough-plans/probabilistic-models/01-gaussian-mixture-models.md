# Plan — probabilistic-models/01 (algorithm). GMM soft clustering, EM 1D, 2D elliptical, BIC.
FIXED a Colab-crashing broadcast bug in cell 7 (2D data gen: (2,100)+(2,) and mismatched vstack).
Added: intuition; library — our EM == sklearn GaussianMixture (means); EM-local-optima gotcha (overlap
data, LL spread); per-figure takeaways. Corrected BIC/init-sensitivity claims to measured values.
