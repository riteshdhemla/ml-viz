# Plan — computer-vision/02-segmentation (applied flex)

## Sections
0. **Intuition** — classify every pixel; semantic vs. instance.
1. **From scratch** — Dice loss, U-Net skip connections (with vs. without).
2. **Validation** — soft Dice checked against the hard set-overlap formula.
3. **"what to notice"** on the skip-connection comparison (detail recovery).
4. **Gotchas** — Dice vs. cross-entropy on class imbalance, soft vs. hard Dice,
   boundary pixels, mIoU averaging.
5. **Your turn** — Dice + mIoU exercises.
6. **Key takeaways**.

Fixes made: `plt.cm.get_cmap` → `plt.get_cmap` (removed in new matplotlib);
stray non-ASCII typo removed.

## Done when
Dice validated; gotchas + recap present; exercises pass; runs. ✅
