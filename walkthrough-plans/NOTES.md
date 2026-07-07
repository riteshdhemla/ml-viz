# Working notes (durable across context summarization)

## Environment
- Verified locally with: numpy, matplotlib, scipy, scikit-learn, sympy, jax, optax
  (all pip-installed this session; run with `JAX_PLATFORMS=cpu` for jax cells).
- Verification harness in scratchpad: `nbtools.py` (load/save/md/code/validate, source-as-string,
  indent=1 byte-identical round-trip), `runnb.py` (concept cells), `review_run.py` (full run with
  exercise solutions substituted so assert-cells execute).
- Notebooks store cell `source` as a string OR list (mixed) — nbtools handles both.

## Template & workflow
- 7-part template in README.md, flexed by notebook type. Per-notebook plan in
  walkthrough-plans/<course>/<lesson>.md written before editing. CHECKLIST.md is source of truth.
- Commit per course (or small batch), push each time. Colab uses Python 3.11 — avoid nested
  same-quote f-strings (need 3.12+).

## KNOWN PRE-EXISTING BUGS still to fix when those notebooks are retrofitted
- reinforcement-learning/03-deep-q-networks.ipynb cells 10 & 12: unterminated string literal
  (Python-3.11 SyntaxError) — fix when doing the RL course.
