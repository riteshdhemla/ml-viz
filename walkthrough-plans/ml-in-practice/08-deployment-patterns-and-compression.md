# Plan — ml-in-practice/08-deployment-patterns-and-compression (applied flex)
Batch/online serving + pruning + quantization + distillation. Retrofit: intuition + 3 validations + gotchas + key takeaways.
Validation: Pruning elbow; memory monotone in bits + low-bit worse; 16x-smaller student near-teacher acc. Gotcha demo: one outlier weight makes per-tensor quant ~10x worse. Reframed distillation honestly (competitive, not strictly beats scratch on easy data).
