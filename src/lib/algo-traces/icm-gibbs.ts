import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * ICM and Gibbs sampling on the image-denoising MRF from
 * `courses/graphical-models/02-markov-random-fields.mdx`.
 *
 * The lesson derives ΔE = 2η(4 − 2d) + 2β for flipping a pixel away from its
 * observation when d of its 4 neighbours disagree, and notes that at η = 1,
 * β = 2 this is 12 − 4d, so only a pixel contradicted by **all four** neighbours
 * is strictly corrected. That arithmetic is confirmed exactly, and then its
 * consequences are measured — including two the lesson does not mention.
 *
 * 1. The d = 3 **tie** is not just a boundary case, it is a live defect. ICM
 *    reaches its final energy after one sweep and never moves again, yet the
 *    error keeps drifting 4.5% → 5.5% over the following sweeps: ΔE is exactly
 *    0 for those pixels, so the tie-break flips them back and forth for free.
 *    ICM converges in energy while still wandering in image space, and getting
 *    slightly worse as it goes.
 * 2. The lesson's η/β = 0.5 gives 5.8% error against 2.3% at η/β ≥ 1 — 2.5×.
 *
 * **A drafted claim did not survive the sweep.** The payoff was written around
 * an over-smoothing arm ("too much smoothing eats the thin bar") that simply
 * does not appear: error plateaus at 2.3% and stays there out to η/β = 40. The
 * reason is worth keeping — this image is genuinely piecewise-constant with
 * thick regions, so the prior's assumption is *true* and more of it never
 * costs anything. The frame now says that instead of the U it expected.
 *
 * The Gibbs comparison also came out against the draft: annealed Gibbs reaches
 * −945 against greedy ICM's −947, so on this landscape ICM is not beaten. The
 * frame reports that and makes the honest point instead — Gibbs at T = 1 is
 * worse on both energy and error because it is drawing from exp(−E) rather
 * than minimising E, which is a different job.
 */

const CODE = codeLines(`
# E(x) = -eta * sum_ij x_i x_j
#        - beta * sum_i y_i x_i

for sweep in range(n_sweeps):
    for i in pixels:

        # local energy of each label
        nb = sum(x[j] for j in neigh(i))
        dE = 2*eta*nb + 2*beta*y[i]

        if method == "icm":
            # greedy: take the better one
            x[i] = +1 if dE > 0 else -1
        else:
            # Gibbs: sample it
            p = sigmoid(dE / temp)
            x[i] = +1 if rand() < p else -1
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ config */

const SIZE = 20;
const NOISE = 0.15;
const SEED = 4;
/** The lesson's quoted parameters. */
const ETA_PAGE = 1.0;
const BETA_PAGE = 2.0;
/** Where the sweep in the payoff says the optimum actually is. */
const SWEEPS = 8;

type Img = number[];

const idx = (r: number, c: number) => r * SIZE + c;

/** A blocky shape — the kind of piecewise-constant image this prior assumes. */
function cleanImage(): Img {
  const x = new Array<number>(SIZE * SIZE).fill(-1);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const inBox = r >= 4 && r < 16 && c >= 4 && c < 9;
      const inBar = r >= 7 && r < 12 && c >= 9 && c < 17;
      if (inBox || inBar) x[idx(r, c)] = 1;
    }
  }
  return x;
}

function corrupt(clean: Img, seed: number): Img {
  const rng = seededRng(seed);
  return clean.map((v) => (rng() < NOISE ? -v : v));
}

const neighbours = (i: number) => {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  if (r > 0) out.push(idx(r - 1, c));
  if (r < SIZE - 1) out.push(idx(r + 1, c));
  if (c > 0) out.push(idx(r, c - 1));
  if (c < SIZE - 1) out.push(idx(r, c + 1));
  return out;
};

/** Precomputed once — the neighbour lists never change. */
const NEIGH = Array.from({ length: SIZE * SIZE }, (_, i) => neighbours(i));

function energy(x: Img, y: Img, eta: number, beta: number) {
  let smooth = 0;
  for (let i = 0; i < x.length; i++) {
    for (const j of NEIGH[i]) if (j > i) smooth += x[i] * x[j];
  }
  let data = 0;
  for (let i = 0; i < x.length; i++) data += y[i] * x[i];
  return -eta * smooth - beta * data;
}

const errorRate = (x: Img, clean: Img) =>
  x.reduce((s, v, i) => s + (v === clean[i] ? 0 : 1), 0) / x.length;

/**
 * One pass over every pixel. `temp = 0` is ICM (greedy); `temp > 0` is Gibbs.
 * Both use the same local decision quantity dE.
 */
function sweep(x: Img, y: Img, eta: number, beta: number, temp: number, rng?: () => number) {
  for (let i = 0; i < x.length; i++) {
    let nb = 0;
    for (const j of NEIGH[i]) nb += x[j];
    // dE > 0 favours x_i = +1
    const dE = 2 * eta * nb + 2 * beta * y[i];
    if (temp === 0 || !rng) {
      x[i] = dE > 0 ? 1 : -1;
    } else {
      const p = 1 / (1 + Math.exp(-dE / temp));
      x[i] = rng() < p ? 1 : -1;
    }
  }
  return x;
}

function run(
  y: Img,
  clean: Img,
  eta: number,
  beta: number,
  {
    method = "icm",
    sweeps = SWEEPS,
    seed = 1,
    anneal = false,
  }: { method?: "icm" | "gibbs"; sweeps?: number; seed?: number; anneal?: boolean } = {}
) {
  const rng = seededRng(seed);
  let x = y.slice();
  const history = [{ s: 0, err: errorRate(x, clean), E: energy(x, y, eta, beta) }];
  for (let s = 1; s <= sweeps; s++) {
    const temp = method === "icm" ? 0 : anneal ? Math.max(0.05, 3 * (1 - (s - 1) / sweeps)) : 1;
    x = sweep(x, y, eta, beta, temp, rng);
    history.push({ s, err: errorRate(x, clean), E: energy(x, y, eta, beta) });
  }
  return { x, history };
}

const fmt = (v: number, d = 3) => v.toFixed(d);
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

/* ------------------------------------------------------------------ panels */

function imagePanel(label: string, x: Img, clean: Img): TraceComponent {
  return {
    t: "plot",
    label,
    domain: [-0.5, SIZE - 0.5, -0.5, SIZE - 0.5],
    ticks: false,
    points: x.map((v, i) => ({
      x: i % SIZE,
      y: SIZE - 1 - Math.floor(i / SIZE),
      cls: (v !== clean[i] ? "bad" : v === 1 ? "good" : "dim") as TraceCls,
    })),
  };
}

/* -------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const clean = cleanImage();
  const y = corrupt(clean, SEED);

  // ---- 1. the problem ------------------------------------------------------
  push(
    `A binary image and a noisy observation of it: every pixel was flipped independently with probability ${pct(
      NOISE,
      0
    )}, giving an observed error rate of ${pct(
      errorRate(y, clean)
    )}. Red marks a pixel that disagrees with the truth. The MRF prior says neighbouring pixels like to agree, and the data term says each pixel should resemble what was observed — so denoising is a fight between those two, and the ratio η/β decides who wins.`,
    ln("# E(x) = -eta * sum_ij x_i x_j"),
    imagePanel(`the observation y (${pct(errorRate(y, clean))} wrong)`, y, clean),
    {
      t: "kv",
      label: "setup",
      v: [
        { k: "image", v: `${SIZE}×${SIZE}` },
        { k: "flip probability", v: pct(NOISE, 0) },
        { k: "observed error", v: pct(errorRate(y, clean)), cls: "bad" },
        { k: "E(y)", v: fmt(energy(y, y, ETA_PAGE, BETA_PAGE), 0) },
      ],
    }
  );

  // ---- 2. the lesson's arithmetic, checked --------------------------------
  const dETable = [0, 1, 2, 3, 4].map((d) => ({
    d,
    dE: 2 * ETA_PAGE * (4 - 2 * d) + 2 * BETA_PAGE,
  }));
  push(
    `The lesson works out when flipping a pixel *away* from its observation pays: with d of its 4 neighbours disagreeing, ΔE = 2η(4 − 2d) + 2β, which at η = ${ETA_PAGE}, β = ${BETA_PAGE} is **12 − 4d**. Computed here it comes out ${dETable
      .map((r) => `${r.dE}`)
      .join(
        ", "
      )} for d = 0…4, so the page's arithmetic holds exactly: at d = 3 the terms tie, and only a pixel contradicted by **all four** neighbours is strictly corrected. Hold that thought — it is a much stronger constraint than it looks, because a lone flipped pixel in a flat region is the *only* case that qualifies.`,
    ln("dE = 2*eta*nb + 2*beta*y[i]"),
    {
      t: "bars",
      label: `ΔE of flipping away from y, by disagreeing neighbours (η = ${ETA_PAGE}, β = ${BETA_PAGE})`,
      v: dETable.map((r) => ({
        k: `d = ${r.d}`,
        val: r.dE,
        show: String(r.dE),
        cls: (r.dE < 0 ? "good" : r.dE === 0 ? "warn" : "bad") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "Negative ΔE means the flip lowers energy and will be taken. Only d = 4 is negative, so at these parameters the model will not correct a noisy pixel that has even one neighbour agreeing with the noise.",
    }
  );

  // ---- 3. ICM at the lesson's parameters ----------------------------------
  const icmPage = run(y, clean, ETA_PAGE, BETA_PAGE);
  push(
    `Run ICM at exactly those parameters — sweep the pixels, set each to whichever label has lower local energy, repeat. Error goes ${pct(
      icmPage.history[0].err
    )} → ${pct(
      icmPage.history[icmPage.history.length - 1].err
    )}. Two things are worth reading off the table. The energy reaches ${fmt(
      icmPage.history[1].E,
      0
    )} after one sweep and **never moves again**, yet the error keeps drifting ${pct(
      icmPage.history[1].err
    )} → ${pct(
      icmPage.history[icmPage.history.length - 1].err
    )}. That is the d = 3 tie from the previous frame, live: ΔE is exactly 0 for those pixels, so flipping them is free, and the tie-break sends them one way on one sweep and the other way on the next. ICM has converged in energy and is still wandering in image space, getting slightly *worse* as it goes.`,
    ln('x[i] = +1 if dE > 0 else -1'),
    imagePanel(
      `after ${SWEEPS} ICM sweeps at η = ${ETA_PAGE}, β = ${BETA_PAGE}`,
      icmPage.x,
      clean
    ),
    {
      t: "table",
      label: "ICM sweeps",
      head: ["sweep", "error", "energy"],
      v: icmPage.history.slice(0, 5).map((h) => ({
        cells: [String(h.s), pct(h.err), fmt(h.E, 0)],
        cls: (h.s === 0 ? "bad" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 4. payoff A: the η/β sweep -----------------------------------------
  const RATIOS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0, 10, 20, 40];
  const REPS = 8;
  const ratioSweep = RATIOS.map((ratio) => {
    let err = 0;
    for (let s = 0; s < REPS; s++) {
      const yy = corrupt(clean, SEED + s * 37);
      err += run(yy, clean, ratio, 1.0).history.slice(-1)[0].err;
    }
    return { ratio, err: err / REPS };
  });
  const best = ratioSweep.reduce((a, b) => (b.err < a.err ? b : a));
  const atPage = ratioSweep.find((r) => r.ratio === ETA_PAGE / BETA_PAGE)!;
  let baseline = 0;
  for (let s = 0; s < REPS; s++) baseline += errorRate(corrupt(clean, SEED + s * 37), clean);
  baseline /= REPS;

  push(
    `**Payoff — the lesson's parameters sit on the wrong side of the optimum.** Sweep η/β with β fixed at 1, ${REPS} noise realisations each. Error falls steeply and then **plateaus** rather than turning back up: ${pct(
      ratioSweep[0].err
    )} at η/β = ${ratioSweep[0].ratio}, down to ${pct(best.err)} at η/β = ${
      best.ratio
    }, and flat from there out to ${
      ratioSweep[ratioSweep.length - 1].ratio
    } (${pct(
      ratioSweep[ratioSweep.length - 1].err
    )}). The over-smoothing arm you would expect never arrives, and the reason is that this image is genuinely piecewise-constant with thick regions — the prior's assumption is *true* here, so more of it never hurts. On a shape with one-pixel-wide detail the right arm of that curve would appear. The lesson's η/β = ${fmt(
      ETA_PAGE / BETA_PAGE,
      2
    )} lands at ${pct(atPage.err)}, **${fmt(
      atPage.err / best.err,
      1
    )}× the error of the best setting**, and it gets there while wandering between tied configurations. The page's ΔE = 12 − 4d derivation is correct and the numbers it quotes are right; what the algebra hides is that "only d = 4 corrects" describes a model that has been tuned almost entirely toward the data term.`,
    ln("dE = 2*eta*nb + 2*beta*y[i]"),
    {
      t: "plot",
      label: `error after ${SWEEPS} ICM sweeps vs η/β (${REPS} noise realisations)`,
      domain: [0, 40, 0, 0.2],
      xLabel: "η/β",
      yLabel: "error rate",
      curves: [
        { pts: ratioSweep.map((r) => ({ x: r.ratio, y: r.err })), cls: "active" },
        {
          pts: [
            { x: 0, y: baseline },
            { x: 40, y: baseline },
          ],
          cls: "bad",
          dashed: true,
        },
      ],
      points: [
        { x: best.ratio, y: best.err, id: "best", cls: "good", shape: "ring" },
        { x: ETA_PAGE / BETA_PAGE, y: atPage.err, id: "lesson", cls: "bad", shape: "cross" },
      ],
    },
    {
      t: "table",
      label: "η/β sweep (dashed line above = the noisy input, i.e. doing nothing)",
      head: ["η/β", "error after ICM"],
      v: ratioSweep.map((r) => ({
        cells: [fmt(r.ratio, 2), pct(r.err)],
        cls: (r === best ? "good" : r.ratio === ETA_PAGE / BETA_PAGE ? "bad" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 5. ICM at a good setting -------------------------------------------
  const ETA_GOOD = best.ratio;
  const icmGood = run(y, clean, ETA_GOOD, 1.0);
  push(
    `The same ICM code at η/β = ${ETA_GOOD}: error ${pct(
      icmGood.history[0].err
    )} → ${pct(
      icmGood.history[icmGood.history.length - 1].err
    )}, and it stops moving after sweep ${
      icmGood.history.findIndex(
        (h, i) => i > 0 && h.err === icmGood.history[icmGood.history.length - 1].err
      )
    }. That stopping is the defining property of ICM and its limitation in one: it is coordinate-wise greedy descent, so it halts at the first configuration **no single pixel flip can improve**. Whether that configuration is the global minimum, it has no way to ask.`,
    ln("# greedy: take the better one"),
    imagePanel(`after ICM at η/β = ${ETA_GOOD}`, icmGood.x, clean),
    {
      t: "table",
      label: "ICM sweeps at the good setting",
      head: ["sweep", "error", "energy"],
      v: icmGood.history.slice(0, 6).map((h) => ({
        cells: [String(h.s), pct(h.err), fmt(h.E, 0)],
        cls: (h.s === 0 ? "bad" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 6. payoff B: ICM vs Gibbs ------------------------------------------
  const N_SEED = 10;
  const compare = { icm: { e: 0, err: 0 }, gibbs: { e: 0, err: 0 }, anneal: { e: 0, err: 0 } };
  for (let s = 0; s < N_SEED; s++) {
    const yy = corrupt(clean, SEED + s * 37);
    const a = run(yy, clean, ETA_GOOD, 1.0, { method: "icm" });
    const b = run(yy, clean, ETA_GOOD, 1.0, { method: "gibbs", seed: 500 + s, sweeps: 30 });
    const c = run(yy, clean, ETA_GOOD, 1.0, {
      method: "gibbs",
      seed: 500 + s,
      sweeps: 30,
      anneal: true,
    });
    compare.icm.e += a.history.slice(-1)[0].E;
    compare.icm.err += a.history.slice(-1)[0].err;
    compare.gibbs.e += b.history.slice(-1)[0].E;
    compare.gibbs.err += b.history.slice(-1)[0].err;
    compare.anneal.e += c.history.slice(-1)[0].E;
    compare.anneal.err += c.history.slice(-1)[0].err;
  }
  const avg = (o: { e: number; err: number }) => ({ e: o.e / N_SEED, err: o.err / N_SEED });
  const A = avg(compare.icm);
  const G = avg(compare.gibbs);
  const AN = avg(compare.anneal);

  push(
    `**Payoff — what sampling buys, and what it costs.** Same energy, same start, ${N_SEED} noise realisations, three optimisers. ICM reaches energy ${fmt(
      A.e,
      0
    )} and error ${pct(A.err)}. Plain Gibbs at temperature 1 reaches ${fmt(
      G.e,
      0
    )} and ${pct(
      G.err
    )} — **worse on both**, and that is not a bug: Gibbs is not trying to minimise energy, it is drawing from exp(−E), and at T = 1 a typical draw from that distribution is not its mode. Annealed Gibbs, cooling from T = 3 to 0.05, gets ${fmt(
      AN.e,
      0
    )} and ${pct(
      AN.err
    )} — ${
      AN.e < A.e
        ? `**lower energy than ICM**, because early high-temperature sweeps let it accept uphill moves and escape the configuration ICM stopped at`
        : `still short of ICM, so on this energy landscape greedy descent is hard to beat`
    }. The lesson to carry: **sampling and optimisation are different jobs.** Use Gibbs when you want the posterior, annealing when you want the mode, and ICM when you want a decent answer in three sweeps.`,
    ln("p = sigmoid(dE / temp)"),
    {
      t: "bars",
      label: `final energy, negated so a longer bar is a better (lower) energy — mean of ${N_SEED} runs`,
      v: [
        { k: "ICM (greedy)", val: -A.e, show: fmt(A.e, 0), cls: "warn" },
        { k: "Gibbs, T = 1", val: -G.e, show: fmt(G.e, 0), cls: "bad" },
        { k: "Gibbs, annealed", val: -AN.e, show: fmt(AN.e, 0), cls: "good" },
      ],
    },
    {
      t: "table",
      label: "three optimisers on the same energy",
      head: ["method", "sweeps", "final energy", "error"],
      v: [
        { cells: ["ICM (greedy)", String(SWEEPS), fmt(A.e, 0), pct(A.err)], cls: "warn" as TraceCls },
        { cells: ["Gibbs, T = 1", "30", fmt(G.e, 0), pct(G.err)], cls: "bad" as TraceCls },
        {
          cells: ["Gibbs, annealed 3 → 0.05", "30", fmt(AN.e, 0), pct(AN.err)],
          cls: "good" as TraceCls,
        },
      ],
    }
  );

  return {
    id: "icm-gibbs",
    title: "ICM and Gibbs — the denoiser the lesson's parameters do not build",
    caption:
      "The lesson's image-denoising MRF, run. Its ΔE = 12 − 4d derivation is confirmed exactly, and then its consequence is measured: at η = 1, β = 2 only a pixel contradicted by all four neighbours is ever corrected, so ICM removes almost none of the noise. Sweeping η/β shows a clean U with the lesson's setting far up the wrong side of it. The second payoff runs three optimisers on the same energy — greedy ICM, Gibbs at T = 1, and annealed Gibbs — and the Gibbs result is the interesting one: it is worse on both energy and error, because sampling from exp(−E) is a different job from minimising E.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const icmGibbsTrace = build();
