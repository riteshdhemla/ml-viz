# Plan — nlp/04-llm-model-taxonomy (foundations flex)

From-scratch attention masks (bi/causal/cross), encoder & decoder forward passes,
model size table, causal_mask exercise.

## Added
0. **Intuition** — one block, three families; the mask decides everything (table).
2. **Validation** — causality has a concrete consequence: corrupting a future token
   leaves earlier positions bit-identical (assert), only the last position responds.
4. **Gotchas** — encoder can't generate, decoder can't peek, cross-attn cost, -inf vs
   big-negative, "large" is task-specific; demo: same token differs under bi vs causal
   mask except at the last position (no future either way).
6. **Key takeaways**.

## Fixed
Corrected a logic slip: causal & bidirectional agree at the **last** position (no
future), not position 0.

## Done when
causality + mask-difference validation asserted; gotchas + recap; exercise passes;
runs. ✅ (3 asserts)
