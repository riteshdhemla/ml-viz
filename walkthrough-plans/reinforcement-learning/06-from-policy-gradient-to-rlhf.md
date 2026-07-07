# Plan — reinforcement-learning/06-from-policy-gradient-to-rlhf (algorithm flex)
Vanilla REINFORCE vs clipped PPO on a noisy bandit + RLHF connection + GRPO (DML #101).
## Fixed
Intro lesson URL said "05-"; corrected to 06.
## Added
0. Intuition (PPO = same direction, clipped step; this loop IS RLHF).
2. Validation — PPO final-policy across-seed std < vanilla, and PPO reliably picks the better arm.
4. Gotchas — clip ε too big/small, inner-epoch drift, reward hacking, KL β; clip-asymmetry demo (caps upside, frees correction).
Kept Key takeaways + exercises. ✅ 4 asserts.
