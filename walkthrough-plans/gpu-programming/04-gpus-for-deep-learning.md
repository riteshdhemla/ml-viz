# Plan — gpu-programming/04-gpus-for-deep-learning (concept flex)
From-scratch numpy simulation of: matmul intensity/mixed-prec/fusion/batching + exercise. Retrofit to 7-part template.
## Added
0. Intuition. what-to-notice. 2. Validation — intensity grows w/N; FP16 2x; fusion result identical; batching crosses ridge. 4. Gotchas — FP16 underflow+loss-scaling demo, fusion limits, batch latency, tensor cores. 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
