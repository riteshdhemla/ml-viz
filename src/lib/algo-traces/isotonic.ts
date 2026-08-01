import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * The Pool-Adjacent-Violators algorithm on the worked trace in
 * `src/content/wiki/platt-scaling-and-isotonic-regression.mdx` — labels
 * [0, 1, 0, 0, 1, 1] collapsing to the staircase [0, ⅓, ⅓, ⅓, 1, 1].
 *
 * The payoff fits both calibrators on the same deliberately non-sigmoidal
 * truth (three plateaus, which two logistic parameters cannot express) at four
 * calibration-set sizes. Both halves of the page's advice show up in the
 * numbers: Platt wins on small sets where isotonic overfits, isotonic wins once
 * there is enough data, and Platt's error floor never improves no matter how
 * much data it gets.
 */

const CODE = codeLines(`
def pav(y):
    # every label starts as its own block
    blocks = [[v, 1] for v in y]   # value, size
    i = 0
    while i < len(blocks) - 1:
        if blocks[i][0] <= blocks[i + 1][0]:
            i += 1                 # no violation
            continue
        # violation: pool into the weighted mean
        v0, n0 = blocks[i]
        v1, n1 = blocks[i + 1]
        pooled = (v0 * n0 + v1 * n1) / (n0 + n1)
        blocks[i:i + 2] = [[pooled, n0 + n1]]
        i = max(i - 1, 0)          # back up
    return blocks
`);

const ln = lineFinder(CODE);

const LABELS = [0, 1, 0, 0, 1, 1];
const fmt = (x: number, d = 3) => x.toFixed(d);

interface Block {
  v: number;
  n: number;
}

const expand = (blocks: Block[]) => blocks.flatMap((b) => Array(b.n).fill(b.v) as number[]);

function blockPanel(blocks: Block[], i: number, mark?: "ok" | "pool"): TraceComponent {
  return {
    t: "tokens",
    label: "blocks (value × size)",
    v: blocks.map((b, k) => ({
      text: b.n > 1 ? `${fmt(b.v, 2)}` : String(b.v),
      sub: b.n > 1 ? `×${b.n}` : "×1",
      cls: (k === i || k === i + 1
        ? mark === "pool"
          ? "bad"
          : "active"
        : "dim") as TraceCls,
    })),
  };
}

/** The fitted staircase against the raw labels. */
function stairPlot(blocks: Block[], label: string): TraceComponent {
  const fitted = expand(blocks);
  const steps: { x: number; y: number }[] = [];
  fitted.forEach((v, k) => {
    steps.push({ x: k, y: v }, { x: k + 1, y: v });
  });
  return {
    t: "plot",
    label,
    domain: [0, LABELS.length, -0.1, 1.1],
    ticks: false,
    xLabel: "calibration points, sorted by score →",
    yLabel: "fitted p",
    curves: [{ pts: steps, cls: "good" }],
    points: LABELS.map((y, k) => ({
      x: k + 0.5,
      y,
      cls: "warn" as TraceCls,
      shape: "ring" as const,
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  let blocks: Block[] = LABELS.map((v) => ({ v, n: 1 }));

  push(
    `Six calibration points, already sorted by model score, with labels ${LABELS.join(
      ", "
    )}. Isotonic regression wants the best non-decreasing step function through them — best in the least-squares sense — and PAV finds it exactly, in one pass, by only ever fixing local violations.`,
    ln("blocks = [[v, 1] for v in y]   # value, size"),
    blockPanel(blocks, -1),
    stairPlot(blocks, "start: every label its own block"),
    {
      t: "note",
      text: "The labels are 0/1 but the fit is not: pooling produces fractional values, and those fractions are exactly the calibrated probabilities.",
    }
  );

  let i = 0;
  let guard = 0;
  while (i < blocks.length - 1 && guard++ < 50) {
    if (blocks[i].v <= blocks[i + 1].v) {
      push(
        `Compare block ${i} (${fmt(blocks[i].v, 2)}) with block ${i + 1} (${fmt(
          blocks[i + 1].v,
          2
        )}): ${fmt(blocks[i].v, 2)} ≤ ${fmt(
          blocks[i + 1].v,
          2
        )}, so monotonicity holds here. Advance — PAV never revisits a pair unless a later pooling disturbs it.`,
        ln("i += 1                 # no violation"),
        blockPanel(blocks, i, "ok"),
        stairPlot(blocks, "current fit")
      );
      i += 1;
      continue;
    }

    const a = blocks[i];
    const b = blocks[i + 1];
    const pooled = (a.v * a.n + b.v * b.n) / (a.n + b.n);
    blocks = [...blocks.slice(0, i), { v: pooled, n: a.n + b.n }, ...blocks.slice(i + 2)];
    const backedUp = Math.max(i - 1, 0);

    push(
      `Violation at block ${i}: ${fmt(a.v, 2)} > ${fmt(
        b.v,
        2
      )}, which a non-decreasing function cannot do. Pool the two into their size-weighted mean: (${fmt(
        a.v,
        2
      )}·${a.n} + ${fmt(b.v, 2)}·${b.n}) / ${a.n + b.n} = ${fmt(
        pooled,
        3
      )}. Then back up to block ${backedUp} — pooling can create a *new* violation with the block on the left, and often does.`,
      [...ln("pooled = (v0 * n0 + v1 * n1) / (n0 + n1)"), ...ln("i = max(i - 1, 0)          # back up")],
      blockPanel(blocks, backedUp, "pool"),
      stairPlot(blocks, "after pooling"),
      {
        t: "kv",
        label: "the pool",
        v: [
          { k: "left", v: `${fmt(a.v, 2)} ×${a.n}`, cls: "bad" },
          { k: "right", v: `${fmt(b.v, 2)} ×${b.n}`, cls: "bad" },
          { k: "pooled", v: `${fmt(pooled, 3)} ×${a.n + b.n}`, cls: "good" },
        ],
      }
    );
    i = backedUp;
  }

  const fitted = expand(blocks);
  push(
    `No violations left, so the fit is complete: [${fitted
      .map((v) => fmt(v, 2))
      .join(", ")}]. Three of the six points collapsed into one block at ⅓ — PAV decided the data cannot justify distinguishing them, and averaged instead. This staircase is not an approximation: it is the *exact* minimiser of squared error over all non-decreasing functions.`,
    ln("return blocks"),
    blockPanel(blocks, -1),
    stairPlot(blocks, "the exact least-squares monotone fit"),
    {
      t: "table",
      label: "result",
      head: ["point", "label", "fitted p"],
      v: LABELS.map((y, k) => ({
        cells: [String(k + 1), String(y), fmt(fitted[k], 3)],
        cls: (fitted[k] === y ? "good" : "warn") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "Note what PAV never does: it never moves a block down to fix a violation, and it never looks ahead. Every step is a local merge, yet the result is globally optimal — which is why it runs in O(n) after the sort.",
      cls: "good",
    }
  );

  // ---- payoff: isotonic vs Platt on the same scores -----------------------
  /** A monotone but deliberately non-sigmoidal truth: three flat shelves. */
  const pTrue = (s: number) => (s < 1 / 3 ? 0.1 : s < 2 / 3 ? 0.5 : 0.9);

  function sample(n: number, seed: number) {
    const r = seededRng(seed);
    return Array.from({ length: n }, () => {
      const s = r();
      return { s, y: r() < pTrue(s) ? 1 : 0 };
    });
  }

  /**
   * Platt: 1-D logistic on the score, fitted to Platt's smoothed targets by
   * Newton/IRLS — the 2x2 Hessian inverts by hand and converges in ~8 steps,
   * which keeps this payoff cheap enough to run at module load.
   */
  function fitPlatt(cal: { s: number; y: number }[]) {
    const nPos = cal.filter((c) => c.y === 1).length;
    const nNeg = cal.length - nPos;
    const hi = (nPos + 1) / (nPos + 2);
    const lo = 1 / (nNeg + 2);
    let w = 1;
    let c0 = 0;
    for (let it = 0; it < 25; it++) {
      let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
      for (const c of cal) {
        const t = c.y === 1 ? hi : lo;
        const u = Math.max(-30, Math.min(30, w * c.s + c0));
        const p = 1 / (1 + Math.exp(-u));
        const r = p - t;
        const v = Math.max(p * (1 - p), 1e-9);
        g0 += r * c.s;
        g1 += r;
        h00 += v * c.s * c.s;
        h01 += v * c.s;
        h11 += v;
      }
      const det = h00 * h11 - h01 * h01;
      if (Math.abs(det) < 1e-12) break;
      const dw = (h11 * g0 - h01 * g1) / det;
      const dc = (h00 * g1 - h01 * g0) / det;
      w -= dw;
      c0 -= dc;
      if (Math.abs(dw) + Math.abs(dc) < 1e-10) break;
    }
    return (s2: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, w * s2 + c0))));
  }

  /** Isotonic: PAV over the sorted calibration set, as a lookup. */
  function fitIsotonic(cal: { s: number; y: number }[]) {
    const pts = [...cal].sort((x, y) => x.s - y.s);
    let bs = pts.map((p) => ({ v: p.y, n: 1, hi: p.s }));
    let k = 0;
    while (k < bs.length - 1) {
      if (bs[k].v > bs[k + 1].v + 1e-12) {
        const merged = {
          v: (bs[k].v * bs[k].n + bs[k + 1].v * bs[k + 1].n) / (bs[k].n + bs[k + 1].n),
          n: bs[k].n + bs[k + 1].n,
          hi: bs[k + 1].hi,
        };
        bs = [...bs.slice(0, k), merged, ...bs.slice(k + 2)];
        k = Math.max(k - 1, 0);
      } else k += 1;
    }
    const f = (s: number) => bs.find((b) => s <= b.hi)?.v ?? bs[bs.length - 1].v;
    return { f, blocks: bs.length };
  }

  const test = sample(4000, 999);
  const brier = (g: (s: number) => number) =>
    test.reduce((acc, t) => acc + (g(t.s) - t.y) ** 2, 0) / test.length;
  // Irreducible Brier on this test sample — the floor a perfectly calibrated
  // model would hit. Computed on the same draw so the comparison is like-for-like.
  const oracle = brier((s2) => pTrue(s2));

  // A single calibration draw is far too noisy to rank the two methods — the
  // winner at n = 50 flips between seeds. Average over replicates instead.
  const REPLICATES = 12;
  const sizes = [50, 150, 500, 1500];
  const results = sizes.map((n) => {
    let platt = 0;
    let isotonic = 0;
    let blocks = 0;
    for (let rep = 0; rep < REPLICATES; rep++) {
      const cal = sample(n, 1000 + rep * 37);
      const iso = fitIsotonic(cal);
      platt += brier(fitPlatt(cal));
      isotonic += brier(iso.f);
      blocks += iso.blocks;
    }
    return {
      n,
      platt: platt / REPLICATES,
      isotonic: isotonic / REPLICATES,
      blocks: Math.round(blocks / REPLICATES),
    };
  });
  const crossover = results.find((r) => r.isotonic < r.platt);
  const small = results[0];
  const large = results[results.length - 1];

  push(
    `Now the choice the page's advice is really about. Take a miscalibration a sigmoid *cannot* express — three flat shelves at 0.1, 0.5 and 0.9 — and fit both calibrators on the same scores, averaging over ${REPLICATES} independent calibration draws at each size because a single draw is far too noisy to rank them. At n = ${
      small.n
    } isotonic averages ${fmt(small.isotonic, 4)} against Platt's ${fmt(
      small.platt,
      4
    )} — it has carved the data into ~${small.blocks} blocks and is fitting noise. ${
      crossover
        ? `From n = ${crossover.n} onward isotonic is ahead, and by n = ${large.n} it reaches ${fmt(
            large.isotonic,
            4
          )} against an oracle floor of ${fmt(oracle, 4)}.`
        : `Isotonic never catches up at these sizes.`
    } Now read Platt's column instead: ${fmt(small.platt, 4)} → ${fmt(
      large.platt,
      4
    )}, still ${fmt(large.platt - oracle, 4)} above the floor with 30× the data. That residual is **bias** — two parameters cannot bend into a middle shelf, so no amount of calibration data will buy it off.`,
    ln("return blocks"),
    {
      t: "table",
      label: "Brier score on 5000 held-out points (lower is better)",
      head: ["n calibration", "Platt", "isotonic", "isotonic blocks", "winner"],
      v: results.map((r) => ({
        cells: [
          String(r.n),
          fmt(r.platt, 4),
          fmt(r.isotonic, 4),
          String(r.blocks),
          r.isotonic < r.platt ? "isotonic" : "Platt",
        ],
        cls: (r.isotonic < r.platt ? "good" : "warn") as TraceCls,
      })),
    },
    {
      t: "plot",
      label: "Brier vs calibration-set size (dashed = oracle floor)",
      domain: [0, 2000, 0.14, 0.175],
      xLabel: "calibration points",
      yLabel: "Brier",
      curves: [
        { pts: results.map((r) => ({ x: r.n, y: r.platt })), cls: "warn" },
        { pts: results.map((r) => ({ x: r.n, y: r.isotonic })), cls: "good" },
        {
          pts: [
            { x: 0, y: oracle },
            { x: 2000, y: oracle },
          ],
          cls: "dim",
          dashed: true,
        },
      ],
    },
    {
      t: "note",
      text: `The crossover here falls between n = ${
        results[results.indexOf(crossover!) - 1]?.n ?? sizes[0]
      } and n = ${crossover?.n ?? sizes[sizes.length - 1]}, earlier than the page's ≳1000 rule of thumb — because this truth is an easy monotone shape with only three shelves. A subtler distortion needs more data before the non-parametric fit pays for its flexibility, which is exactly why the conservative rule is the one worth remembering. And note how noisy the small-n rows are: ranking the two methods from a single calibration draw is not possible, which is why this averages ${REPLICATES}.`,
      cls: "warn",
    }
  );

  return {
    id: "pav-isotonic",
    title: "Pool-Adjacent-Violators — merging your way to the exact monotone fit",
    caption:
      "PAV on the six labels worked above: scan left to right, and whenever a block exceeds its neighbour, pool the pair into their weighted mean and back up — because pooling can create a new violation behind you. Every step is a purely local merge, yet the staircase it lands on is the exact least-squares monotone fit. The final step pits isotonic against Platt scaling on a deliberately non-sigmoidal miscalibration, and both halves of the usual advice show up: Platt wins on small calibration sets, isotonic wins once there is enough data, and Platt's error floor never improves however much data it gets.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const isotonicTrace = build();
