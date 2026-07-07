# Plan — reinforcement-learning/03-deep-q-networks (algorithm flex)
From-scratch DQN (replay + target net) + replay-decorrelation demos + DML exercises.
## FIXED (was broken)
Cells 10 & 12 had literal newlines inside print("...") → Python SyntaxError. Escaped to \n.
## Added
0. Intuition (Q-network + the two stabilisers).
2. Validation — learned greedy policy optimal (8 steps).
4. Gotchas — no-target divergence, no-replay correlation, max-overestimation (demo E[max noise]>0 → Double DQN), buffer size, reward scale.
Reorganised mid-notebook takeaways into "what to notice"; proper Key takeaways at end. ✅ 4 asserts.
