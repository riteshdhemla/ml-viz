# Plan — speech-audio/02-speech-recognition (applied flex)

CTC collapse rule + alignment counting + greedy decode + collapse exercise.
Intro mentioned DP-over-alignments but never implemented it.

## Added
0. **Intuition** — the alignment problem; blank + collapse; sum over alignments.
1. **CTC forward algorithm (new)** — O(T·S) DP over the blank-extended sequence.
2. **Validation** — forward DP == brute-force sum over all V^T collapsing paths
   (assert exact match for T=4,5,6).
3. **"what to notice"** on greedy ≠ optimal.
4. **WER (new)** — word-level edit distance / reference length, with tests.
5. **Gotchas** — blank is load-bearing (demo: hhelllo→helo), greedy vs beam,
   CTC independence assumption, WER>100%, frame-rate vs label-length.
6. **Key takeaways**.

## Done when
CTC forward validated vs brute force; WER added; gotchas + recap; exercise passes;
runs. ✅ (4 asserts)
