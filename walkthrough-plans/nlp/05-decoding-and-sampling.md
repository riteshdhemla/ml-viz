# Plan — nlp/05-decoding-and-sampling (applied flex)

Excellent from-scratch already: greedy/temperature/top-k/top-p, beam search,
Monte-Carlo diversity, top_p exercise.

## Added
0. **Intuition** — decoding is a weight-free step turning the distribution into tokens;
   determinism vs diversity.
2. **Validation** — softmax == `scipy.special.softmax`; sampling frequencies converge
   to the true distribution (LLN, 200k draws, assert max dev < 0.01).
4. **Gotchas** — greedy repetition loop (demo on a 2-cycle transition table), high-T
   untruncated → gibberish, top-k vs top-p, beam degeneration.
6. **Key takeaways**.

## Done when
scipy + LLN validation asserted; gotchas + recap; exercise passes; runs. ✅ (3 asserts)
