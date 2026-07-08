# Plan — gpu-programming/05-distributed-training-at-scale (concept flex)
From-scratch numpy simulation of: DP all-reduce/memory-wall/ZeRO/pipeline + exercise. Retrofit to 7-part template.
## Added
0. Intuition. what-to-notice. 2. Validation — all-reduce->2x const; ZeRO-3=16psi/G; bubble->0 with M. 4. Gotchas — comms-bound, ZeRO comms, bubble (P-depth demo), activation memory, imbalance. 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
