# Plan — gpu-programming/03-memory-and-performance (concept flex)
From-scratch numpy simulation of: coalescing/tiling/roofline + exercise. Retrofit to 7-part template.
## Added
0. Intuition. what-to-notice. 2. Validation — coalescing eff=1/stride; tiling ~T less traffic; roofline crossover at ridge. 4. Gotchas — strided access, bank conflicts, tile size, fusion demo. 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercise passes; runs. ✅
