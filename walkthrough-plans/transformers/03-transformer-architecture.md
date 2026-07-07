# Plan — transformers/03 (algorithm). Pre-norm block, LayerNorm by hand, param audit, 12-block stack,
GPT-style decoder pass. Added: intuition; validation — THE CAUSALITY TEST (future-token edit changes
past logits by exactly 0 with mask, 0.17 without); off-by-one silent-mask-bug demo; gotchas
(pre/post-norm, FFN param hog, weight tying).
