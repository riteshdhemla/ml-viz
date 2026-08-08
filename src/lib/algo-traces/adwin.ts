import type { AlgoTrace, TraceCls } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * ADWIN from `wiki/adwin.mdx`, on a stream with two changes of different sizes:
 * p = 0.10 for 400 steps, then 0.45 for 300, then 0.18 for 500.
 *
 * The page's worked cut calculation is reproduced exactly (|W| = 200, balanced
 * split, m = 50, ε_cut = 0.3111) before the trace moves past it.
 *
 * **Both payoffs were rewritten after measurement contradicted the draft, and
 * both corrections are the interesting part.**
 *
 * 1. The first draft claimed ADWIN beats every fixed window. It does not: over
 *    15 streams ADWIN scores 0.0545 mean absolute error against the truth while
 *    a fixed W = 100 scores 0.0526 — a fixed window, correctly chosen, is
 *    marginally *better*. The honest claim is the one the page actually makes:
 *    ADWIN lands within 4% of the best fixed width **without being told what it
 *    is**, while the wrong fixed choice (W = 400) costs 2×. Its value is the
 *    absent hyperparameter, not peak accuracy.
 *
 * 2. The first draft described δ as the usual detection-delay / false-alarm
 *    trade-off, quoting the page. On this stream the false-alarm half is not
 *    merely small, it is **unobservable**: zero cuts in 300,000 stationary
 *    steps at δ = 0.5, the loosest setting anyone would use. Detection delay
 *    meanwhile moves 2.4× across the sweep. The trade-off is real in theory and
 *    entirely one-sided in practice, because the Hoeffding bound's 4|W|/δ union
 *    term is far more conservative than the nominal δ suggests — so the
 *    practical advice inverts, and δ should be chosen loose.
 *
 * Candidate splits are the geometric ones ADWIN2 actually tests (the bucket
 * boundaries of its exponential histogram), and means come from prefix sums.
 * Testing all |W|−1 splits with fresh means made the module take 72 seconds to
 * load; this is both faster and closer to the published algorithm.
 */

const CODE = codeLines(`
W.append(x)

# only bucket boundaries, not every index
for split in candidate_splits(W):
    W0, W1 = W[:split], W[split:]

    # harmonic mean of the two sizes
    m = 1 / (1/len(W0) + 1/len(W1))
    eps = sqrt(log(4*len(W)/delta) / (2*m))

    if abs(mean(W0) - mean(W1)) > eps:
        # older data is a stale concept
        W = W1
        return DRIFT
`);

const ln = lineFinder(CODE);

/* ---------------------------------------------------------------- the model */

const DELTA = 0.05;
const MIN_SUB = 5;
const SEED = 21;
const N_STEPS = 1200;
/** Three regimes: a big jump up, then a smaller settling down. */
const SEGMENTS: [number, number, number][] = [
  [0, 400, 0.1],
  [400, 700, 0.45],
  [700, 1200, 0.18],
];

const truthAt = (t: number) => SEGMENTS.find(([a, b]) => t >= a && t < b)![2];

const epsCut = (n0: number, n1: number, w: number, delta: number) =>
  Math.sqrt(Math.log((4 * w) / delta) / (2 * (1 / (1 / n0 + 1 / n1))));

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

/**
 * The split points ADWIN2 tests: the boundaries of its exponential histogram,
 * which grow geometrically from each end rather than covering every index.
 */
function candidateSplits(n: number) {
  const s = new Set<number>();
  for (let k = MIN_SUB; k < n - MIN_SUB; k *= 2) {
    s.add(k);
    s.add(n - k);
  }
  for (let k = MIN_SUB; k <= n - MIN_SUB; k = Math.ceil(k * 1.3)) {
    s.add(k);
    s.add(n - k);
  }
  return [...s].filter((x) => x >= MIN_SUB && x <= n - MIN_SUB).sort((a, b) => a - b);
}

interface Cut {
  t: number;
  at: number;
  before: number;
  after: number;
  mu0: number;
  mu1: number;
  eps: number;
}

function adwin(stream: number[], delta: number) {
  const pre = [0];
  for (const x of stream) pre.push(pre[pre.length - 1] + x);
  const sum = (a: number, b: number) => pre[b] - pre[a];

  let start = 0;
  const history: { t: number; size: number; est: number }[] = [];
  const cuts: Cut[] = [];
  for (let t = 0; t < stream.length; t++) {
    const end = t + 1;
    const n = end - start;
    if (n >= 2 * MIN_SUB) {
      for (const c of candidateSplits(n)) {
        const idx = start + c;
        const n0 = c;
        const n1 = n - c;
        const mu0 = sum(start, idx) / n0;
        const mu1 = sum(idx, end) / n1;
        const e = epsCut(n0, n1, n, delta);
        if (Math.abs(mu0 - mu1) > e) {
          cuts.push({ t, at: c, before: n, after: n1, mu0, mu1, eps: e });
          start = idx;
          break;
        }
      }
    }
    history.push({ t, size: end - start, est: sum(start, end) / (end - start) });
  }
  return { history, cuts };
}

function makeStream(seed: number, stationary = false, n = N_STEPS) {
  const rng = seededRng(seed);
  return Array.from({ length: n }, (_, t) => (rng() < (stationary ? 0.1 : truthAt(t)) ? 1 : 0));
}

const fixedWindow = (s: number[], w: number) =>
  s.map((_, t) => mean(s.slice(Math.max(0, t - w + 1), t + 1)));

const fmt = (x: number, d = 3) => x.toFixed(d);

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const stream = makeStream(SEED);
  const run = adwin(stream, DELTA);
  const cut1 = run.cuts.find((c) => c.t >= 400)!;
  const cut2 = run.cuts.find((c) => c.t >= 700)!;

  // ---- 1. the page's arithmetic -------------------------------------------
  const pageEps = epsCut(100, 100, 200, DELTA);
  push(
    `The whole algorithm is one inequality, so start where the page does. A window of |W| = 200 error bits split evenly: m = 1/(1/100 + 1/100) = 50, and ε_cut = √( ln(4·200/0.05) / (2·50) ) = √(ln 16000 / 100) = ${fmt(
      pageEps,
      4
    )}. A gap of |0.08 − 0.42| = 0.34 clears it, so the test fires. Two things do the work: **m is a harmonic mean**, so the threshold blows up whenever *either* side is small, and the |W| inside the log is a union bound over every cut point about to be tried. Note what ε_cut does *not* contain: any notion of how large a change you care about. ADWIN has no magnitude parameter, only δ.`,
    ln("eps = sqrt(log(4*len(W)/delta) / (2*m))"),
    {
      t: "kv",
      label: "the page's worked cut",
      v: [
        { k: "|W|", v: "200" },
        { k: "|W₀| = |W₁|", v: "100" },
        { k: "m", v: "50" },
        { k: "ε_cut", v: fmt(pageEps, 4), cls: "warn" },
        { k: "gap", v: "0.340", cls: "good" },
        { k: "fires", v: "yes", cls: "good" },
      ],
    }
  );

  // ---- 2. the U-shaped threshold ------------------------------------------
  const preWindow = stream.slice(0, 399);
  const preScan = candidateSplits(preWindow.length).map((c) => ({
    at: c,
    gap: Math.abs(mean(preWindow.slice(0, c)) - mean(preWindow.slice(c))),
    eps: epsCut(c, preWindow.length - c, preWindow.length, DELTA),
  }));

  push(
    `The real stream now: error bits at ${SEGMENTS[0][2]} for ${
      SEGMENTS[0][1]
    } steps. Nothing has changed, so nothing is ever cut and the window simply grows. This frame shows what gets checked on every element — the observed gap at each candidate split against that split's own threshold. The threshold is a **U**: enormous at both ends, where one sub-window is a handful of bits and its mean means nothing, and lowest in the middle where both halves carry evidence. Every gap sits well under it. That is what "no drift" looks like, and it costs only ${
      preScan.length
    } comparisons rather than ${preWindow.length - 1} — ADWIN2 tests the bucket boundaries of an exponential histogram, not every index.`,
    ln("for split in candidate_splits(W):"),
    {
      t: "plot",
      label: `candidate splits of a stationary window (|W| = ${preWindow.length})`,
      domain: [0, preWindow.length, 0, 0.8],
      xLabel: "split position",
      yLabel: "gap / threshold",
      curves: [
        { pts: preScan.map((s) => ({ x: s.at, y: s.eps })), cls: "bad" },
        { pts: preScan.map((s) => ({ x: s.at, y: s.gap })), cls: "good" },
      ],
    },
    {
      t: "kv",
      label: "stationary window",
      v: [
        { k: "|W|", v: String(preWindow.length) },
        { k: "splits tested", v: String(preScan.length) },
        { k: "max gap", v: fmt(Math.max(...preScan.map((s) => s.gap))), cls: "good" },
        { k: "min threshold", v: fmt(Math.min(...preScan.map((s) => s.eps))), cls: "bad" },
      ],
    }
  );

  // ---- 3. delay -----------------------------------------------------------
  const delay1 = cut1.t - 400 + 1;
  const midT = 400 + Math.floor(delay1 / 2);
  const midHist = run.history[midT];
  push(
    `At step 400 the rate jumps to ${SEGMENTS[1][2]}. ADWIN does **not** fire immediately, and that is not a defect: at step ${midT} only ${
      midT - 400 + 1
    } post-change bits exist, so the newer sub-window is tiny, m is tiny, and its threshold is correspondingly huge. The gap is real but the evidence is not yet sufficient to distinguish it from noise at the confidence δ demands. Detection waits — ${delay1} steps here — and during that wait the estimate is visibly wrong.`,
    ln("W.append(x)"),
    {
      t: "plot",
      label: "ADWIN's estimate against the truth",
      domain: [0, N_STEPS, 0, 0.6],
      xLabel: "step",
      yLabel: "error rate",
      curves: [
        { pts: run.history.slice(0, midT + 1).map((h) => ({ x: h.t, y: h.est })), cls: "active" },
        {
          pts: Array.from({ length: midT + 1 }, (_, t) => ({ x: t, y: truthAt(t) })),
          cls: "good",
          dashed: true,
        },
      ],
    },
    {
      t: "kv",
      label: `step ${midT}`,
      v: [
        { k: "|W|", v: String(midHist.size), cls: "warn" },
        { k: "post-change bits", v: String(midT - 400 + 1), cls: "warn" },
        { k: "estimate", v: fmt(midHist.est) },
        { k: "truth", v: fmt(truthAt(midT)) },
        { k: "fired?", v: "not yet", cls: "bad" },
      ],
    }
  );

  // ---- 4. the cuts --------------------------------------------------------
  push(
    `Step ${cut1.t}: a split clears its threshold. Older half ${fmt(cut1.mu0)}, newer half ${fmt(
      cut1.mu1
    )}, gap ${fmt(Math.abs(cut1.mu0 - cut1.mu1))} against ε_cut = ${fmt(
      cut1.eps
    )}. ADWIN drops everything before the split and the window collapses ${cut1.before} → ${
      cut1.after
    }. The second change is smaller (${SEGMENTS[1][2]} → ${
      SEGMENTS[2][2]
    }) and takes ${cut2.t - 700 + 1} steps to catch against the first change's ${delay1} — **bigger jumps are caught faster**, exactly as the guarantee says, because the gap has to outgrow a threshold that is shrinking only as √(1/m).`,
    ln("W = W1"),
    {
      t: "table",
      label: "every cut ADWIN made",
      head: ["step", "true change at", "delay", "μ̂(W₀)", "μ̂(W₁)", "ε_cut", "|W|"],
      v: run.cuts.map((c) => {
        const seg = SEGMENTS.find((s) => c.t >= s[0] && c.t < s[1])!;
        return {
          cells: [
            String(c.t),
            String(seg[0]),
            `${c.t - seg[0] + 1}`,
            fmt(c.mu0),
            fmt(c.mu1),
            fmt(c.eps),
            `${c.before} → ${c.after}`,
          ],
          cls: "good" as TraceCls,
        };
      }),
    },
    {
      t: "plot",
      label: "window length over the whole stream — an output, not a setting",
      domain: [0, N_STEPS, 0, 500],
      xLabel: "step",
      yLabel: "|W|",
      curves: [{ pts: run.history.map((h) => ({ x: h.t, y: h.size })), cls: "active" }],
    }
  );

  // ---- 5. payoff A: against fixed windows ---------------------------------
  const WIDTHS = [20, 50, 100, 200, 400, 800];
  const REPS = 15;
  let adSum = 0;
  const fxSum = WIDTHS.map(() => 0);
  for (let s = 1; s <= REPS; s++) {
    const st = makeStream(s * 131);
    adSum += mean(adwin(st, DELTA).history.map((h) => Math.abs(h.est - truthAt(h.t))));
    WIDTHS.forEach((w, i) => {
      fxSum[i] += mean(fixedWindow(st, w).map((v, t) => Math.abs(v - truthAt(t))));
    });
  }
  const adErr = adSum / REPS;
  const fxErr = fxSum.map((e) => e / REPS);
  const bestFx = Math.min(...fxErr);
  const worstFx = Math.max(...fxErr);
  const bestW = WIDTHS[fxErr.indexOf(bestFx)];

  push(
    `**Payoff — what ADWIN actually buys, measured honestly.** Score every estimator by mean absolute error against the true rate over ${REPS} streams. ADWIN gets ${fmt(
      adErr,
      4
    )}. The *best* fixed window, W = ${bestW}, gets ${fmt(
      bestFx,
      4
    )} — marginally **better** than ADWIN. So the tempting claim, that adaptivity beats every fixed choice, is false and worth abandoning. What is true is the claim the page actually makes: ADWIN lands within ${fmt(
      ((adErr - bestFx) / bestFx) * 100,
      0
    )}% of the best fixed width **without being told what it is**, while the spread across plausible fixed widths is ${fmt(
      worstFx / bestFx,
      1
    )}× (${fmt(bestFx, 4)} to ${fmt(
      worstFx,
      4
    )}). On a live stream you cannot identify W = ${bestW} as the right answer — doing so requires the ground truth you are trying to estimate. ADWIN's value is not peak accuracy; it is that there is no number to guess.`,
    ln("W = W1"),
    {
      t: "bars",
      label: `mean |estimate − truth| over ${N_STEPS} steps (${REPS} streams, lower is better)`,
      v: [
        { k: "ADWIN (no tuning)", val: adErr, show: fmt(adErr, 4), cls: "good" },
        ...WIDTHS.map((w, i) => ({
          k: `fixed W=${w}`,
          val: fxErr[i],
          show: fmt(fxErr[i], 4),
          cls: (fxErr[i] === bestFx ? "warn" : "bad") as TraceCls,
        })),
      ],
    },
    {
      t: "note",
      text: "The two changes in this stream have different sizes and the regimes have different lengths, which is what makes the fixed-window curve U-shaped at all. On a stream with one change you can often find a fixed width that beats ADWIN comfortably — the more regimes and the more varied their durations, the more the absent hyperparameter is worth.",
    }
  );

  // ---- 6. payoff B: what δ actually costs ---------------------------------
  const DELTAS = [0.5, 0.1, 0.05, 0.01, 0.001, 0.00001];
  const sweep = DELTAS.map((d) => {
    let delaySum = 0;
    let detected = 0;
    let falseCuts = 0;
    for (let s = 1; s <= REPS; s++) {
      const c = adwin(makeStream(s * 131), d).cuts.find((x) => x.t >= 400);
      if (c) {
        detected += 1;
        delaySum += c.t - 400 + 1;
      }
      falseCuts += adwin(makeStream(s * 7919, true), d).cuts.length;
    }
    return {
      d,
      delay: detected ? delaySum / detected : NaN,
      detected: detected / REPS,
      falseCuts,
    };
  });

  // How loose is the false-alarm guarantee? Run the loosest δ anyone would use
  // against long streams that never change, and count every cut.
  const LONG = 20_000;
  const LONG_REPS = 15;
  let longFalse = 0;
  for (let s = 1; s <= LONG_REPS; s++) {
    longFalse += adwin(makeStream(s * 7919, true, LONG), DELTAS[0]).cuts.length;
  }
  const longSteps = LONG * LONG_REPS;

  push(
    `**Payoff — the δ trade-off is real in theory and one-sided in practice.** The page describes δ the standard way: larger δ means faster detection but more false alarms. Sweep it over five orders of magnitude and only one half of that shows up. Detection delay behaves: ${fmt(
      sweep[0].delay,
      1
    )} steps at δ = ${DELTAS[0]} rising to ${fmt(
      sweep[sweep.length - 1].delay,
      1
    )} at δ = ${
      DELTAS[DELTAS.length - 1]
    }, a ${fmt(sweep[sweep.length - 1].delay / sweep[0].delay, 1)}× cost. False alarms do not: **${longFalse} cuts in ${longSteps.toLocaleString()} steps of streams that never change, at δ = ${DELTAS[0]}** — the loosest setting anyone would use. The union bound is the reason. ε_cut carries ln(4|W|/δ), so δ is inside a logarithm inside a square root, and the resulting threshold is far more conservative than the nominal δ implies. The practical consequence inverts the usual advice: on a stream like this, **pick δ loose**. Tightening it is paying real detection delay for a false-alarm reduction you cannot measure.`,
    ln("eps = sqrt(log(4*len(W)/delta) / (2*m))"),
    {
      t: "table",
      label: `δ sweep (${REPS} streams each; false alarms counted on streams that never change)`,
      head: ["δ", "detection delay", "detected", "false cuts"],
      v: sweep.map((s) => ({
        cells: [
          String(s.d),
          `${fmt(s.delay, 1)} steps`,
          `${(s.detected * 100).toFixed(0)}%`,
          String(s.falseCuts),
        ],
        cls: (s.d === DELTA ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `The honest limit of this result: ${longFalse} false alarms across ${longSteps.toLocaleString()} stationary steps bounds the rate, it does not prove it is zero. The guarantee is one-sided — δ is an *upper* bound on the false-alarm probability, and nothing promises it is tight. Here it is very far from tight.`,
      cls: "warn",
    }
  );

  return {
    id: "adwin",
    title: "ADWIN — the window length is the output",
    caption:
      "The page's own cut arithmetic (m = 50, ε_cut = 0.3111) reproduced exactly, then run on a stream with two changes of different sizes. Watch the threshold's U-shape across candidate splits, the delay while post-change evidence accumulates, and the bigger jump getting caught faster than the smaller one. Two payoffs, both of which contradicted the first draft and were rewritten from the measurements: ADWIN does not beat the best fixed window, it comes within 4% of it without being told what it is, while a wrong fixed choice costs 2x. And the famous delta trade-off is entirely one-sided here — delay grows 2.4x across the sweep while false alarms stay at zero across 300,000 stationary steps, because delta sits inside a logarithm inside a square root.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const adwinTrace = build();
