# Prompt: Add a New Algorithm Trace (steppable code player)

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add an **algorithm trace** for **[ALGORITHM NAME]** to the ml-viz website — the
algo-viz-style player that shows the source code with the executing line
highlighted next to the live data structures, with play / step / seek controls.

**Location:** `src/lib/algo-traces/[name].ts`, registered in
`src/lib/algo-traces/index.ts`, referenced from
`src/content/wiki/[slug].mdx` (or a lesson) as `<AlgorithmTrace id="[trace-id]" />`.

**The algorithm to trace:**
[Describe the procedure, the example input to run it on, and the answer it
should reach. Prefer an example that already appears in the page's prose so the
trace and the hand-worked numbers agree.]

**What the reader should walk away understanding:**
[The one or two mechanisms this trace exists to make concrete — e.g. "why the
early exit keeps HNSW sub-linear", "why a rare term outweighs two common ones".]

## Requirements

**Run the real algorithm.** The builder must execute the actual procedure in
TypeScript and record a frame at each decision point. Never hand-write the
numbers a step produces — if the trace and the prose disagree, the reader learns
the wrong thing. Verify the recorded output against the prose before finishing.

**Structure.** Use `frameBuilder()` and `lineFinder()` from `./util`:

```ts
const CODE = codeLines(`
...python listing...
`);
const ln = lineFinder(CODE);           // maps code *fragments* → line numbers

const { frames, push } = frameBuilder();
push("What just happened, and why it matters.", ln("for term in query"), ...components);
```

`lineFinder` resolves fragments rather than hard-coded indices, so editing the
listing can't silently mis-highlight. It throws if a fragment stops matching.

**Frame descriptions are the teaching surface.** One plain sentence each, saying
what happened *and* what it means. "i = 3" wastes a frame; "40 is worse than 32
but still kept, because the beam holds two results and a worse node can still
bridge to a better one" earns it.

**Components** (see `src/types/algo-trace.ts`): `tokens`, `kv`, `bars`,
`matrix`, `table`, `graph`, `note`. Notes:
- Use `NaN` for matrix cells the algorithm has not computed yet — they render as
  a dim `·`, never a misleading `0.00`.
- Highlight classes are semantic: `active` (being examined), `good`
  (chosen/kept), `bad` (rejected/pruned), `warn` (candidate), `dim` (settled).
- Keep the state panel to ~4 components; more than that and no single step reads
  clearly.

**Keep code lines under ~40 characters.** The code panel is half a two-column
grid, and it clips at roughly 41 characters at the default width. Put comments
on their own line above the statement rather than trailing. Long lines scroll
horizontally, but needing to scroll to read defeats the point. Screenshot the
rendered page before believing a listing fits.

**End with a payoff frame.** Change one thing and show the consequence — BM25
re-scored with `b = 0` so the long document wins; attention's softmax saturating
at `d_k = 64` without the scale factor. That contrast is what makes the
mechanism stick, and it is the difference between a trace and an animation.

**Measure the payoff before you write its narrative — and make sure the thing
you measured is stable.** Draft the sentence after the numbers exist, never
before. Four traces so far had to be rewritten because the data contradicted a
plausible-sounding story, and every one failed the same way: *a single draw was
treated as evidence*.

- HyperLogLog compared **one sketch** per size; m = 16 beat m = 4096 by luck.
  1.04/√m is a standard error — fixed by taking the RMS over 16 replicates.
- Isotonic vs Platt was ranked from **one calibration sample**, which produced
  the opposite winner from the one in the prose. Fixed by averaging 12
  replicates per size.
- MCMC assumed σ = 0.1 would win; measuring put the peak at σ = 0.3.
- The optimizer comparison hit both variants at once. Its first test problem was
  an axis-aligned quadratic, where Adam's per-coordinate step is exactly ±η, so
  η = 1 from (1, 1) "solves" it in one step — a tuning artifact. Its second was
  ranking optimizers by best-case step count, which swings 15× between adjacent
  learning rates because landing inside the tolerance is a coin flip.

The general rule: before reporting a comparison, **perturb it**. Re-run with
another seed, another grid point, another starting value. If the ordering moves,
you have measured noise — report a statistic that survives instead (an average
over replicates, the width of a working range, a rate rather than a count), and
say in the frame why that is the honest number.

**Minimum bar:** ≥ 6 frames, every frame highlights a code line and renders
state, caption > 80 chars explaining what to watch for.

## After creating the file, also:

1. Add the built trace to `allAlgoTraces` in `src/lib/algo-traces/index.ts`
2. Reference it from the page with `<AlgorithmTrace id="..." />` (plain string
   prop only — MDX runs with `blockJS: true`)
3. Write a short **"what to notice"** list under the player — 2–4 bullets naming
   the specific steps where the mechanism is visible
4. Reconcile the surrounding prose with the trace. If the page already has a
   hand-worked example, either match its numbers exactly or say plainly that the
   trace uses its own corpus. Fix any prose the trace proves wrong.
5. Add a row to the **Algorithm Traces Built** table in `CLAUDE.md` and remove
   the page from the queue beneath it
6. Run `npm run type-check`, `npx vitest run`, and `npm run build`
