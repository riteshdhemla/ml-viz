# Plan — model-evaluation/04-llm-evaluation (evaluation flex)
From-scratch: perplexity/BPB/judge bias/Bradley-Terry + sklearn-checked exercises. Retrofit to 7-part template.
## Added
0. Intuition. what-to-notice on figures. 2. Validation — PPL floor 2^H(q) at T=1; BPB tokenizer-invariant; BT recovers ranking; judge position-bias demo. 4. Gotchas — PPL tokenizer-dep, judge bias, Elo identifiability, contamination. FIXED BT lr=0.05 divergence (normalize grad, lr=0.5). 6. Key takeaways.
## Done when
validation asserted; gotchas + recap; exercises pass; runs. ✅
