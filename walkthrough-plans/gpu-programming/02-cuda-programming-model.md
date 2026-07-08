# Plan — gpu-programming/02-cuda-programming-model (concept flex)
From-scratch numpy simulation of: kernel/index/bounds-guard/grid-stride + exercise. Retrofit to 7-part template.
## Added
0. Intuition. what-to-notice. 2. Validation — launch covers 0..n-1 once (no gaps/races); grid-stride correct for any launch. 4. Gotchas — missing guard (OOB demo), index bugs, block=32x, inter-block sync. 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
