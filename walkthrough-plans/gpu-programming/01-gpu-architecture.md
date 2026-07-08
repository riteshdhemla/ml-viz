# Plan — gpu-programming/01-gpu-architecture (concept flex)
From-scratch numpy simulation of: throughput-vs-latency/Amdahl/latency-hiding + exercise. Retrofit to 7-part template.
## Added
0. Intuition. what-to-notice. 2. Validation — Amdahl->1/(1-p); warp count saturates SM sim. 4. Gotchas — serial bottleneck, occupancy, warp divergence (demo). 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
