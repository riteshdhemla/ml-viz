# Plan — computer-vision/04-vision-language-models (applied flex)

Strong from-scratch toy CLIP already (two linear encoders → shared sphere,
symmetric contrastive loss, finite-diff training, similarity matrix, zero-shot,
prompt-template averaging, exercise).

## Added
0. **Intuition** — CLIP learns a *similarity function* between pixels and words,
   not a fixed label set; that's why zero-shot works.
2. **Validation** — assert `clip_loss == scipy` symmetric cross-entropy
   (`log_softmax` on the diagonal, both directions) — exact match.
3. Per-figure **"what to notice"** — training curve (log B floor), similarity
   matrix (diagonal = the objective), zero-shot on held-out, prompt ensembling.
4. **Gotchas** (runnable): τ sweep → loss climbs to log B floor; ℓ2-norm makes
   loss **scale-invariant** (verified: 3× rescale leaves cosine loss unchanged,
   changes raw-dot loss); modality gap measured (centroids far, retrieval still works).
6. **Key takeaways** recap.

## Done when
scipy validation asserted; gotchas + recap present; figures have takeaways;
exercises pass; runs clean. ✅ (3 assert-cells green)
