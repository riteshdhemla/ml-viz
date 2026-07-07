# Plan — reinforcement-learning/04-policy-gradient (algorithm flex)
From-scratch REINFORCE with baseline + Key takeaways + DML #122.
## Added
0. Intuition (parameterise policy directly; the PG theorem).
2. Validation — gradient-check the softmax score function ∇log π vs finite diff;
   learned policy optimal (8 steps).
4. Gotchas — high variance, baseline reduces variance (demo std drop), on-policy sample-hungry, LR, credit assignment.
Kept Key takeaways + exercises. ✅ 5 asserts.
