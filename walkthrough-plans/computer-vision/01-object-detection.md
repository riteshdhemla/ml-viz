# Plan — computer-vision/01-object-detection (applied flex)

## Sections
0. **Intuition** — from "what" (classification) to "what and where" (boxes).
1. **From scratch** — IoU, Non-Maximum Suppression, YOLO grid prediction, mAP.
2. **Validation** — IoU checked against an independent pixel-count on a mask grid.
3. Per-figure **"what to notice"** on NMS suppression and the YOLO grid.
4. **Gotchas** — IoU threshold choice, NMS greedy failure on crowded scenes,
   confidence vs. localization, class-agnostic vs per-class NMS.
5. **Your turn** — IoU + NMS implementation exercises.
6. **Key takeaways**.

## Done when
IoU validated vs pixel count; gotchas + recap present; exercises pass; runs. ✅
