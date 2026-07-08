# Plan — wiki/gradient-descent-optimizers (optimization)
SGD/momentum/Adagrad/RMSprop/Adam from scratch. Retrofit: intuition + 2 validations + gotchas + takeaways.
Validation: All reduce loss on ravine; RMSprop beats Adagrad (EMA vs decaying rate). Gotcha demo: Adam bias correction rescales near-zero early moments.
