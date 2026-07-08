# Plan — ml-in-practice/07-experiment-tracking (systems flex)
Tracker + 30-run sweep + content-addressed data hash + bit-identical replay. Retrofit: intuition + 3 validations + gotchas + key takeaways.
Validation: best_run returns objective min; data_hash reproducible+content-addressed; replay bit-identical. Gotcha demo: one edited value flips the hash (trip-wire).
