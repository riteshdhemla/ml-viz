# Plan — computer-vision/03-backbones-in-practice (applied flex)

## Sections
0. **Intuition** — choosing the workhorse backbone.
1. **From scratch** — depthwise-separable conv cost analysis; ResNet residual
   block gradient-flow analysis; EfficientNet compound scaling.
2. **Validation** — the per-layer gradient-drift simulation checked against the
   exact product; residual identity path shifts E[log|jacobian factor|] up ~0.5,
   so gradients survive vastly deeper (1e-16 plain vs 1e-5 residual @ 50 layers).
3. **"what to notice"** on the depthwise cost saving and residual survival.
4. **Gotchas** — depthwise underutilizes hardware, residual ≠ magic (still needs
   norm), compound-scaling coefficient tradeoffs.
5. **Your turn** — residual-block forward-pass exercise.
6. **Key takeaways**.

Fix made: residual gradient assertion reworded to the honest measured claim
(`E[log|j+1|] − E[log|j|] > 0.4`, actual shift ≈ 0.51), not the idealized "≈0".

## Done when
simulation validated vs exact; gotchas + recap present; exercises pass; runs. ✅
