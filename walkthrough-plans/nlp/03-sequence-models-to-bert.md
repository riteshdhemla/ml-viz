# Plan — nlp/03-sequence-models-to-bert (applied flex)

Bahdanau alignment heatmap, bottleneck curve, MLM masking, fine-tuning head.

## Added
0. **Intuition** — attention as the answer to the seq2seq bottleneck.
1. **From scratch (new)** — additive Bahdanau score computed from real vectors
   (valid soft alignment, asserted rows sum to 1).
2. **Validation** — from-scratch linear head vs `sklearn.LogisticRegression`
   (assert 100% agreement on the separable toy).
3. **"what to notice"** on alignment (many-to-many), bottleneck, binomial masking.
4. **Gotchas** — 80/10/10 MLM split (empirical demo), attention≠alignment, freeze vs
   fine-tune, BLEU is corpus-level.
6. **Key takeaways**.

## Done when
alignment + sklearn validation asserted; gotchas + recap; exercises pass; runs. ✅ (5 asserts)
