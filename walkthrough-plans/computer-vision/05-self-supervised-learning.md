# Plan — computer-vision/05-self-supervised-learning (applied flex)

From-scratch InfoNCE, collapse demo, masked-reconstruction pretext, exercise —
but originally had **zero visualizations** (all print).

## Added
0. **Intuition** — free labels from unlabelled data; collapse is the enemy;
   contrastive uses negatives, masked uses real hidden content, BYOL uses stop-grad.
2. **Validation** — assert `info_nce == scipy` softmax cross-entropy (diagonal label).
3. **Visualizations (new)** — side-by-side collapsed vs. good similarity matrices;
   the masked-signal reconstruction plot (visible/truth/reconstructed/mean baseline).
4. **Gotchas** (runnable): τ sweep (good reps → log B floor as τ grows); mask-ratio
   sweep (recon MSE rises with difficulty; MAE's ~75% sweet spot).
6. **Key takeaways** recap.

## Done when
scipy validation asserted; two figures added; gotchas + recap present; exercise
passes; runs clean. ✅ (2 assert-cells green)
