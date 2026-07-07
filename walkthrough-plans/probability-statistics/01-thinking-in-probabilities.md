# Plan — probability-statistics/01-thinking-in-probabilities (concept flex)

## Sections
0. Header + **Intuition** — probability is the math of uncertainty; simulate to *see*
   the axioms, conditioning, LLN, and variance rather than take them on faith.
1. **From scratch** — the existing brute-force simulations: sample spaces/events,
   the three axioms, conditional probability as "zoom in + renormalize."
2. **The library way + validation** — model the die with `scipy.stats.randint`; its
   analytic `mean`/`var`/`std` match the simulation (and 3.5 / 35⁄12).
3. **Visualize** — law of large numbers (running mean → 3.5) and variance (fair vs
   loaded die, same mean); each with a takeaway.
4. **Gotchas** — LLN needs a **finite mean** (Cauchy → running mean never settles);
   Monte-Carlo error shrinks like `1/√n`; `P(A|B)` undefined when `P(B)=0`; disjoint ≠
   independent.
5. **Your turn** — conditional-probability, E/Var-from-PMF, and the DML descriptive-
   stats + phi-coefficient bank.
6. **Key takeaways** + next link.

## Done when
Intuition + scipy validation + gotchas + recap added; figures have takeaways;
exercises pass; runs.
