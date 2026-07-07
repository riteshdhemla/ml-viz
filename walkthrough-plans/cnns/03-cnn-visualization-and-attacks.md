# Plan — cnns/03 (applied/security). Saliency, FGSM, adversarial training, PGD exercise.
Added: intuition; library — FGSM input gradient verified vs finite differences; gotchas (robustness-
accuracy tradeoff, transfer, saliency caveats); NEW takeaways. FIXED overstated FGSM narration —
measured real effect (flips only at eps~0.8+ on this high-signal toy data; eps=1.0 -> 100% misclassified).
