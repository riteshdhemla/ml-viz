# Plan — transformers/02 (algorithm). MHA reshape impl, param bookkeeping, head patterns, sinusoidal PE.
Added: intuition; validation — vectorized MHA == 8 independent single heads concatenated (dims derived
locally; cell 5 reuses d_model); relative-offset PE demo (same similarity from pos 10 and 60); gotchas.
