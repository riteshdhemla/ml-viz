# Plan — ml-in-practice/16-cicd-and-continuous-training (systems flex)
Model decay, scheduled vs drift-triggered CT, promotion gate. Retrofit (noKT, keeps existing recap): intuition + 2 validations + gotchas.
Validation: Frozen model decays monotonically; CT beats never-retraining. Gotcha demo: promotion gate ships only validated improvement.
