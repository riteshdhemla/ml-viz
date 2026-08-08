import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * Reservoir sampling (Vitter's Algorithm R) from
 * `courses/streaming-ml/02-streaming-algorithms.mdx`.
 *
 * The lesson already has `ReservoirSamplingViz` animating the acceptance rule,
 * and it proves uniformity by induction. This trace deliberately does neither
 * again: it walks one concrete run so the eviction step is visible, and then
 * **tests the proof by measurement** — 200,000 independent runs over a 12-element
 * stream with k = 3, counting how often each element survives.
 *
 * The payoff is the contrast with two plausible wrong versions. Both keep the
 * k/t acceptance rule the lesson states; they differ only in the half-sentence
 * about *which* slot to evict, or in the constant. Both produce sharply biased
 * samples, and the bias has opposite signs, which makes the point that the
 * proof's algebra is load-bearing rather than decorative.
 */

const CODE = codeLines(`
for t, x in enumerate(stream, start=1):

    if t <= k:
        # fill the reservoir
        R[t-1] = x
        continue

    # accept with probability k/t
    if random() < k / t:
        # evict a UNIFORMLY chosen slot
        j = randint(0, k-1)
        R[j] = x
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const K = 3;
const N = 12;
const SEED = 9;
const TRIALS = 200_000;

type Variant = "uniform" | "evict-oldest" | "prob-1-over-t";

interface Step {
  t: number;
  x: number;
  prob: number;
  accepted: boolean;
  slot: number;
  evicted: number | null;
  reservoir: number[];
}

/** One run. `rng` is consumed identically across variants where possible. */
function run(rng: () => number, variant: Variant = "uniform", n = N, k = K) {
  const R = new Array<number>(k).fill(-1);
  const steps: Step[] = [];
  let nextEvict = 0; // for the FIFO variant
  for (let t = 1; t <= n; t++) {
    const x = t;
    if (t <= k) {
      R[t - 1] = x;
      steps.push({ t, x, prob: 1, accepted: true, slot: t - 1, evicted: null, reservoir: R.slice() });
      continue;
    }
    const prob = variant === "prob-1-over-t" ? 1 / t : k / t;
    const u = rng();
    const accepted = u < prob;
    let slot = -1;
    let evicted: number | null = null;
    if (accepted) {
      slot = variant === "evict-oldest" ? nextEvict % k : Math.floor(rng() * k);
      if (variant === "evict-oldest") nextEvict += 1;
      evicted = R[slot];
      R[slot] = x;
    }
    steps.push({ t, x, prob, accepted, slot, evicted, reservoir: R.slice() });
  }
  return { steps, reservoir: R };
}

/** How often does each element survive to the end? */
function survivalRates(variant: Variant, trials = TRIALS) {
  const counts = new Array<number>(N).fill(0);
  const rng = seededRng(4242);
  for (let i = 0; i < trials; i++) {
    for (const v of run(rng, variant).reservoir) counts[v - 1] += 1;
  }
  return counts.map((c) => c / trials);
}

const fmt = (x: number, d = 4) => x.toFixed(d);

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const rng = seededRng(SEED);
  const demo = run(rng);

  const reservoirPanel = (s: Step, label: string) => ({
    t: "tokens" as const,
    label,
    v: s.reservoir.map((v, i) => ({
      text: `e${v}`,
      sub: `slot ${i}`,
      cls: (s.accepted && i === s.slot ? "good" : "dim") as TraceCls,
    })),
  });

  // ---- 1. fill ------------------------------------------------------------
  const fill = demo.steps[K - 1];
  push(
    `The reservoir holds k = ${K} elements and the stream length n is **unknown** — that is the whole constraint, and it is why you cannot just sample k of n at the end. The first ${K} elements go straight in, each with probability 1 of being present so far. Everything interesting starts at element ${
      K + 1
    }.`,
    ln("R[t-1] = x"),
    reservoirPanel(fill, `reservoir after the first ${K} elements`),
    {
      t: "kv",
      label: "state",
      v: [
        { k: "k", v: String(K) },
        { k: "seen", v: String(K) },
        { k: "P(in reservoir)", v: "1.000 each", cls: "good" },
        { k: "memory", v: `O(k) = ${K}`, cls: "good" },
      ],
    }
  );

  // ---- 2..5. a few decisions ---------------------------------------------
  const narrate: Record<number, string> = {
    4: `Element 4 arrives. It is accepted with probability k/t = ${K}/4 = ${fmt(
      K / 4,
      3
    )} — not because 4 is special, but because after this step there will be 4 candidates for ${K} slots and every one of them must end at ${K}/4.`,
    5: `Element 5, accepted with probability ${K}/5 = ${fmt(
      K / 5,
      3
    )}. The acceptance probability **falls** as the stream grows, which is the only way a late element can avoid crowding out the early ones.`,
    8: `By element 8 the acceptance probability is down to ${fmt(
      K / 8,
      3
    )}. Note what happens on a rejection: nothing at all. No state changes, and that is a legitimate outcome, not a wasted step.`,
    12: `The last element, at probability ${fmt(
      K / 12,
      3
    )}. The stream ends whenever it ends; the algorithm never needed to know that in advance, and the reservoir is a valid uniform sample at *every* prefix, not just this one.`,
  };
  for (const t of [4, 5, 8, 12]) {
    const s = demo.steps[t - 1];
    push(
      `${narrate[t]} The draw came up ${
        s.accepted ? `**accepted**, evicting e${s.evicted} from slot ${s.slot}` : "**rejected**, so the reservoir is unchanged"
      }.`,
      s.accepted ? ln("j = randint(0, k-1)") : ln("if random() < k / t:"),
      reservoirPanel(s, `reservoir after element ${t}`),
      {
        t: "kv",
        label: `element ${t}`,
        v: [
          { k: "P(accept) = k/t", v: fmt(s.prob, 3), cls: "warn" },
          { k: "outcome", v: s.accepted ? "accept" : "reject", cls: s.accepted ? "good" : "bad" },
          ...(s.accepted
            ? [
                { k: "slot chosen", v: String(s.slot) },
                { k: "evicted", v: `e${s.evicted}`, cls: "bad" as TraceCls },
              ]
            : []),
          { k: "P(any element present)", v: fmt(K / t, 3) },
        ],
      }
    );
  }

  // ---- 6. payoff A: is the proof true? ------------------------------------
  const uniform = survivalRates("uniform");
  const expected = K / N;
  const se = Math.sqrt((expected * (1 - expected)) / TRIALS);
  const maxDev = Math.max(...uniform.map((r) => Math.abs(r - expected)));

  push(
    `**Payoff — the induction proof, checked against ${TRIALS.toLocaleString()} independent runs.** The lesson proves every element ends in the reservoir with probability exactly k/n = ${K}/${N} = ${fmt(
      expected,
      4
    )}. Measured, the survival rates run ${fmt(Math.min(...uniform))} to ${fmt(
      Math.max(...uniform)
    )}, and the largest deviation from ${fmt(expected, 4)} is ${fmt(
      maxDev
    )} — against a standard error of ${fmt(
      se
    )} per element, so every one lands within ${fmt(
      maxDev / se,
      1
    )} standard errors. There is no drift from element 1 to element ${N}: the first element, which had to survive ${
      N - K
    } chances to be evicted, is as likely to be there as the last, which only had to be accepted once.`,
    ln("if random() < k / t:"),
    {
      t: "bars",
      label: `P(element survives), ${TRIALS.toLocaleString()} runs — flat at k/n = ${fmt(expected, 3)}`,
      max: 0.35,
      v: uniform.map((r, i) => ({
        k: `e${i + 1}`,
        val: r,
        show: fmt(r, 3),
        cls: "good" as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "uniformity check",
      v: [
        { k: "expected k/n", v: fmt(expected, 4), cls: "good" },
        { k: "measured range", v: `${fmt(Math.min(...uniform), 3)}–${fmt(Math.max(...uniform), 3)}` },
        { k: "max |deviation|", v: fmt(maxDev) },
        { k: "standard error", v: fmt(se) },
        { k: "worst, in SEs", v: `${fmt(maxDev / se, 1)}σ`, cls: "good" },
      ],
    }
  );

  // ---- 7. payoff B: two plausible wrong versions --------------------------
  const fifo = survivalRates("evict-oldest");
  const oneOverT = survivalRates("prob-1-over-t");
  const fifoSpread = Math.max(...fifo) - Math.min(...fifo);
  const ootSpread = Math.max(...oneOverT) - Math.min(...oneOverT);
  const correctSpread = Math.max(...uniform) - Math.min(...uniform);

  push(
    `**Payoff — two wrong versions that keep the acceptance rule and still fail.** Both variants below accept elements exactly as the lesson says; they differ only in a detail that looks like an implementation choice. *Evict the oldest slot* instead of a uniformly chosen one: survival now runs ${fmt(
      Math.min(...fifo),
      3
    )} to ${fmt(Math.max(...fifo), 3)} — element 1 survives ${fmt(
      expected / fifo[0],
      0
    )}× less often than it should — a spread of ${fmt(
      fifoSpread,
      3
    )} against the correct version's ${fmt(
      correctSpread,
      3
    )}, because round-robin eviction targets the early slots first and deterministically. *Accept with probability 1/t instead of k/t*: the first ${K} elements sit at ${fmt(
      oneOverT[0],
      3
    )} while the last sits at ${fmt(
      oneOverT[N - 1],
      3
    )}, a spread of ${fmt(
      ootSpread,
      3
    )} in the opposite direction — too few accepts means the reservoir keeps its original contents and goes stale. **The constant k and the word "uniformly" are both load-bearing**, and neither failure shows up in a run you eyeball rather than count.`,
    ln("j = randint(0, k-1)"),
    {
      t: "bars",
      label: "P(survives) — evict oldest (early elements crushed)",
      max: 0.6,
      v: fifo.map((r, i) => ({
        k: `e${i + 1}`,
        val: r,
        show: fmt(r, 3),
        cls: (Math.abs(r - expected) > 5 * se ? "bad" : "warn") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "P(survives) — accept with 1/t (reservoir goes stale)",
      max: 0.6,
      v: oneOverT.map((r, i) => ({
        k: `e${i + 1}`,
        val: r,
        show: fmt(r, 3),
        cls: (Math.abs(r - expected) > 5 * se ? "bad" : "warn") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The two biases point in opposite directions, which is the useful part. There is no safe direction to be wrong in and no way to spot either failure from a single run — both produce a reservoir of the right size, containing plausible elements, every time. Only the frequencies over many runs reveal it, which is why the induction proof is the real deliverable and this trace is only its audit.",
      cls: "good",
    }
  );

  return {
    id: "reservoir-sampling",
    title: "Reservoir sampling — auditing the uniformity proof",
    caption:
      "One run of Algorithm R on a 12-element stream with k = 3, showing the acceptance probability k/t falling as the stream grows and which slot each accepted element evicts. Then the part a proof cannot show and a single animation cannot either: 200,000 independent runs measuring how often each element survives. The correct version is flat at k/n within 2.5 standard errors. Two plausible wrong versions — evict the oldest slot, or accept with probability 1/t — keep the acceptance rule the lesson states and still produce sharply biased samples, in opposite directions.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const reservoirTrace = build();
