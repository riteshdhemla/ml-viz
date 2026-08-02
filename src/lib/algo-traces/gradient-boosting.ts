import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * XGBoost's actual inner loop — the second-order split search — on eight points.
 *
 * The sibling `adaboost-rounds` trace covers the other branch of boosting, and
 * the contrast is the point of frame 5: AdaBoost re-weights the *samples* it got
 * wrong, while gradient boosting never touches a weight. The gradient of the
 * misfit point simply grows on its own, and the next split goes after it.
 *
 * Everything the lesson asserts about the regularized objective is measured
 * here rather than restated:
 *
 *  - the closed-form split score ½[G_L²/(H_L+λ) + G_R²/(H_R+λ) − G²/(H+λ)] − γ,
 *  - the optimal leaf weight w* = −G/(H+λ),
 *  - λ shrinking leaf values, and occasionally changing which split wins,
 *  - γ pruning splits — and above the best available gain, pruning *every*
 *    split, so boosting becomes an exact no-op.
 */

const CODE = codeLines(`
def gain(GL, HL, GR, HR, lam, gam):
    s = lambda G, H: G*G / (H + lam)
    parent = s(GL + GR, HL + HR)
    return 0.5 * (s(GL, HL) + s(GR, HR)
                  - parent) - gam

def best_split(X, g, h, lam, gam):
    G, H = g.sum(), h.sum()
    top = (0.0, None)
    for t in midpoints(X):
        L = X < t
        GL, HL = g[L].sum(), h[L].sum()
        v = gain(GL, HL, G - GL,
                 H - HL, lam, gam)
        if v > top[0]:
            top = (v, t)
    return top

def boost(X, y, n, eta, lam, gam):
    F = np.zeros(len(y))
    for _ in range(n):
        p = 1 / (1 + np.exp(-F))
        g, h = p - y, p * (1 - p)
        v, t = best_split(X, g, h,
                          lam, gam)
        # no split cleared gam: no tree
        if t is None:
            continue
        # leaf weight w = -G / (H + lam)
        w = leaves(X, t, g, h, lam)
        F += eta * w
    return F
`);

const ln = lineFinder(CODE);

const X = [1, 2, 3, 4, 5, 6, 7, 8];
const Y = [0, 0, 1, 0, 1, 1, 1, 1];
const LAM = 1.0;
const GAM = 0.0;
const ETA = 0.3;

const THR = X.slice(0, -1).map((x, i) => (x + X[i + 1]) / 2);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const fmt = (x: number, d = 3) => x.toFixed(d).replace("-", "−");

type State = { p: number[]; g: number[]; h: number[]; loss: number };
function stateOf(F: number[]): State {
  const p = F.map(sigmoid);
  const g = p.map((pi, i) => pi - Y[i]);
  const h = p.map((pi) => pi * (1 - pi));
  const loss =
    -sum(Y.map((y, i) => y * Math.log(p[i]) + (1 - y) * Math.log(1 - p[i]))) / Y.length;
  return { p, g, h, loss };
}

type Cand = {
  t: number;
  GL: number;
  HL: number;
  GR: number;
  HR: number;
  gain: number;
  wL: number;
  wR: number;
};

/** Evaluate the regularized split score at every candidate threshold. */
function candidates(g: number[], h: number[], lam: number, gam: number): Cand[] {
  const G = sum(g);
  const H = sum(h);
  const s = (a: number, b: number) => (a * a) / (b + lam);
  return THR.map((t) => {
    let GL = 0;
    let HL = 0;
    X.forEach((x, i) => {
      if (x < t) {
        GL += g[i];
        HL += h[i];
      }
    });
    const GR = G - GL;
    const HR = H - HL;
    return {
      t,
      GL,
      HL,
      GR,
      HR,
      gain: 0.5 * (s(GL, HL) + s(GR, HR) - s(G, H)) - gam,
      wL: -GL / (HL + lam),
      wR: -GR / (HR + lam),
    };
  });
}
const argmax = (c: Cand[]) => c.reduce((a, b) => (b.gain > a.gain ? b : a));

type Round = { r: number; st: State; cand: Cand[]; best: Cand; F: number[] };

/** Run the listing and record every round. */
function boost(n: number, lam = LAM, gam = GAM, eta = ETA): Round[] {
  let F = X.map(() => 0);
  const out: Round[] = [];
  for (let r = 1; r <= n; r++) {
    const st = stateOf(F);
    const cand = candidates(st.g, st.h, lam, gam);
    const best = argmax(cand);
    out.push({ r, st, cand, best, F: [...F] });
    if (best.gain <= 0) continue;
    F = F.map((v, i) => v + eta * (X[i] < best.t ? best.wL : best.wR));
  }
  return out;
}

const ROUNDS = boost(41);
const R1 = ROUNDS[0];
const R2 = ROUNDS[1];
const LATE = ROUNDS[39];

/** The index whose gradient grows most between round 1 and round 2. */
const WORST = R2.st.g
  .map((g, i) => ({ i, g: Math.abs(g) }))
  .reduce((a, b) => (b.g > a.g ? b : a)).i;

/** λ sweep at round 1 — leaf weights and the resulting split ranking. */
const LAMBDAS = [0, 0.5, 1, 2, 5, 20, 100];
const LAM_SWEEP = LAMBDAS.map((lam) => {
  const c = candidates(R1.st.g, R1.st.h, lam, 0);
  const b = argmax(c);
  return { lam, t: b.t, gain: b.gain, wL: b.wL, wR: b.wR, last: c[c.length - 1] };
});

/**
 * A round where λ genuinely reorders the candidates — and does so *monotonically*,
 * so light and moderate damping agree and only heavy damping differs. Rounds
 * where the top two are near-tied flip back and forth with λ and prove nothing,
 * so they are skipped.
 */
const LAM_FLIP = (() => {
  for (const rd of ROUNDS.slice(0, 8)) {
    const at = (l: number) => argmax(candidates(rd.st.g, rd.st.h, l, 0));
    const [a, b, c, d] = [at(0.1), at(1), at(5), at(100)];
    if (a.t === b.t && b.t === c.t && d.t !== c.t) {
      return { r: rd.r, lo: c.t, hi: d.t, loGain: c.gain, hiGain: d.gain, at };
    }
  }
  return null;
})();

/** γ sweep: how many of 50 rounds actually produce a split, and where it lands. */
const BEST_GAIN_1 = R1.best.gain;
const GAMMAS = [0, 0.2, 0.5, 1.0, Math.ceil(BEST_GAIN_1 * 100) / 100, 1.5];
const GAM_SWEEP = GAMMAS.map((gam) => {
  const rs = boost(50, LAM, gam);
  const built = rs.filter((r) => r.best.gain > 0).length;
  const final = stateOf(rs[rs.length - 1].F);
  return { gam, built, loss: final.loss };
});

const hSpread = (st: State) => Math.max(...st.h) / Math.min(...st.h);

// ---------------------------------------------------------------------------

const DOM: [number, number, number, number] = [0.3, 8.7, -0.12, 1.12];

/** Predicted probability against x, with the labels underneath. */
function fit(label: string, rd: Round): TraceComponent {
  const st = stateOf(rd.F);
  return {
    t: "plot",
    label,
    domain: DOM,
    xLabel: "x",
    yLabel: "p(y=1)",
    segments: [{ x1: DOM[0], y1: 0.5, x2: DOM[1], y2: 0.5, cls: "dim", dashed: true }],
    curves: [{ pts: X.map((x, i) => ({ x, y: st.p[i] })), cls: "active" }],
    points: [
      ...X.map((x, i) => ({
        x,
        y: Y[i],
        cls: (Y[i] === 1 ? "good" : "bad") as TraceCls,
        shape: "cross" as const,
      })),
      ...X.map((x, i) => ({ x, y: st.p[i], cls: "active" as TraceCls, shape: "dot" as const })),
    ],
  };
}

const dataTable = (rd: Round, highlight?: number): TraceComponent => ({
  t: "table",
  label: `round ${rd.r} — gradients and Hessians`,
  head: ["x", "y", "p", "g = p−y", "h = p(1−p)"],
  v: X.map((x, i) => ({
    cells: [
      String(x),
      String(Y[i]),
      fmt(rd.st.p[i], 4),
      fmt(rd.st.g[i], 4),
      fmt(rd.st.h[i], 4),
    ],
    cls: (i === highlight ? "bad" : "dim") as TraceCls,
  })),
});

const gainBars = (cand: Cand[], best: number, label: string): TraceComponent => ({
  t: "bars",
  label,
  v: cand.map((c) => ({
    k: `t=${c.t}`,
    val: Math.max(c.gain, 0),
    show: fmt(c.gain, 4),
    cls: (c.t === best ? "good" : c.gain <= 0 ? "bad" : "warn") as TraceCls,
  })),
});

// ---------------------------------------------------------------------------

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Eight points, one feature, binary labels — and two of them (x = 3 and x = 4) sit on the wrong side of any single threshold, so no stump can be perfect. Boosting starts from F = 0, which is log-odds 0, so every prediction is p = 0.5. From that, g = p − y is ±0.5 and h = p(1−p) is **0.25 for every sample**. That uniformity is temporary and worth remembering: at round 1 the Hessians carry no information at all, and everything the second-order machinery buys shows up later.`,
    ln("def boost", "g, h = p - y"),
    dataTable(R1),
    { t: "kv", label: "start", v: [
      { k: "loss", v: fmt(R1.st.loss, 6), cls: "warn" },
      { k: "ln 2", v: fmt(Math.LN2, 6) },
      { k: "λ", v: String(LAM) },
      { k: "γ", v: String(GAM) },
      { k: "η", v: String(ETA) },
    ] }
  );

  push(
    `The split search. For each of the seven thresholds between consecutive x, sum the gradients and Hessians on each side and score the split with ½[G_L²/(H_L+λ) + G_R²/(H_R+λ) − G²/(H+λ)] − γ. Nothing here is a heuristic like information gain — it is the exact reduction in the second-order Taylor approximation of the loss, which is why XGBoost needs Hessians and not just gradients. The winner is **t = ${R1.best.t}** with gain ${fmt(R1.best.gain, 5)}.`,
    ln("for t in midpoints", "GL, HL = g[L]", "v = gain(GL, HL, G - GL"),
    gainBars(R1.cand, R1.best.t, "split score at each threshold (round 1)"),
    {
      t: "table",
      label: "the three best candidates, term by term",
      head: ["t", "G_L", "H_L", "G_R", "H_R", "gain"],
      v: [...R1.cand]
        .sort((a, b) => b.gain - a.gain)
        .slice(0, 3)
        .map((c, i) => ({
          cells: [
            String(c.t),
            fmt(c.GL, 2),
            fmt(c.HL, 2),
            fmt(c.GR, 2),
            fmt(c.HR, 2),
            fmt(c.gain, 4),
          ],
          cls: (i === 0 ? "good" : "dim") as TraceCls,
        })),
    }
  );

  const last = R1.cand[R1.cand.length - 1];
  const lastAt0 = LAM_SWEEP[0].last;
  push(
    `Look at the bottom of that chart: **t = ${last.t} scores ${fmt(last.gain, 4)} — negative, before γ has done anything at all**. Splitting there puts a single point in the right leaf, so H_R = ${fmt(last.HR, 2)}, and adding λ = ${LAM} to a Hessian that small nearly wipes the leaf's contribution out. Set λ = 0 and the same split scores ${fmt(lastAt0.gain, 4)}, comfortably positive. So λ is not only shrinking leaf values — by damping small-Hessian leaves it quietly refuses to isolate individual points, which is the same job \`min_child_weight\` does explicitly.`,
    ln("s = lambda G, H: G*G / (H + lam)"),
    {
      t: "table",
      label: `the t = ${last.t} split under different λ`,
      head: ["λ", "H_R", "gain", "verdict"],
      v: LAMBDAS.slice(0, 4).map((lam) => {
        const c = candidates(R1.st.g, R1.st.h, lam, 0);
        const s = c[c.length - 1];
        return {
          cells: [String(lam), fmt(s.HR, 2), fmt(s.gain, 4), s.gain > 0 ? "would split" : "rejected"],
          cls: (s.gain > 0 ? "warn" : "bad") as TraceCls,
        };
      }),
    },
    {
      t: "note",
      text: "A gain can be negative without γ. γ raises the bar further; λ has already tilted the floor.",
    }
  );

  push(
    `Take the winning split and read off the leaves. The optimal weight for a leaf is w* = −G/(H+λ) — again closed form, not a fitted average: left gets ${fmt(R1.best.wL, 5)}, right gets ${fmt(R1.best.wR, 5)}. Then the shrinkage step: F ← F + η·w with η = ${ETA}, so only ${Math.round(ETA * 100)}% of each leaf's recommendation is actually applied. Loss falls ${fmt(R1.st.loss, 5)} → ${fmt(R2.st.loss, 5)}.`,
    ln("w = leaves(X, t, g, h, lam)", "F += eta * w"),
    fit("p after one tree", R2),
    {
      t: "kv",
      label: `tree 1: split at x < ${R1.best.t}`,
      v: [
        { k: "w*_left", v: fmt(R1.best.wL, 5), cls: "bad" },
        { k: "w*_right", v: fmt(R1.best.wR, 5), cls: "good" },
        { k: "η·w applied", v: `${fmt(ETA * R1.best.wL, 4)} / ${fmt(ETA * R1.best.wR, 4)}` },
        { k: "loss", v: `${fmt(R1.st.loss, 5)} → ${fmt(R2.st.loss, 5)}`, cls: "active" },
      ],
    }
  );

  push(
    `Round 2, and this is the frame that separates gradient boosting from AdaBoost. Recompute g on the new predictions: x = ${X[WORST]} now carries the largest gradient in the set, ${fmt(R2.st.g[WORST], 4)} — it is a 1 that the first tree pushed *down*, because it fell on the low side of the split. So the search moves to **t = ${R2.best.t}**, carving that point off. AdaBoost would have reached the same place by multiplying that sample's **weight**; gradient boosting never touches a weight. The gradient of a badly-fit point simply *is* larger, and the split score is built from gradients, so the attention reallocates itself.`,
    ln("g, h = p - y", "v, t = best_split(X, g, h,"),
    dataTable(R2, WORST),
    gainBars(R2.cand, R2.best.t, `round 2 — the winner moved to t = ${R2.best.t}`)
  );

  const losses = ROUNDS.slice(0, 21).map((r) => r.st.loss);
  push(
    `Twenty rounds. The chosen split alternates — ${ROUNDS.slice(0, 8).map((r) => r.best.t).join(", ")} — because each tree over-corrects slightly and the next one answers it, which is exactly what a small η is for: no single tree is allowed to commit. Loss falls from ${fmt(losses[0], 4)} to ${fmt(losses[20], 4)}, and the fitted probabilities have pulled apart into three groups: the two confident ends and the ambiguous pair in the middle that no stump can separate.`,
    ln("for _ in range(n)"),
    fit("p after 20 trees", ROUNDS[20]),
    {
      t: "plot",
      label: "training loss by round",
      domain: [0, 20, 0.2, 0.72],
      xLabel: "round",
      yLabel: "log loss",
      curves: [{ pts: losses.map((l, i) => ({ x: i, y: l })), cls: "active" }],
      points: [{ x: 20, y: losses[20], cls: "good", shape: "dot" }],
    }
  );

  push(
    `Now the Hessians earn their keep. At round 1 every h was 0.25; by round ${LATE.r} they span ${fmt(Math.min(...LATE.st.h), 4)} to ${fmt(Math.max(...LATE.st.h), 4)}, a spread of **${fmt(hSpread(LATE.st), 1)}×**. The points the model is confident about (p ≈ ${fmt(Math.max(...LATE.st.p), 2)} and ${fmt(Math.min(...LATE.st.p), 2)}) have h collapsing toward zero, so they contribute almost nothing to H and stop pulling on the split score. The two genuinely ambiguous points sit at h ≈ ${fmt(LATE.st.h[2], 3)} and dominate. A first-order method has no way to express that — it sees only g, and a confidently-correct point and an uncertain one can carry the same gradient.`,
    ln("g, h = p - y"),
    dataTable(LATE),
    {
      t: "bars",
      label: `Hessians at round ${LATE.r} — attention has concentrated`,
      v: X.map((x, i) => ({
        k: `x=${x}`,
        val: LATE.st.h[i],
        show: fmt(LATE.st.h[i], 4),
        cls: (LATE.st.h[i] > 0.2 ? "good" : "dim") as TraceCls,
      })),
      max: 0.26,
    }
  );

  push(
    `Payoff one, λ. Sweep it at round 1 and the leaf weights collapse: at λ = 0 the tree wants to move the right leaf by ${fmt(LAM_SWEEP[0].wR, 3)}, at λ = 100 by ${fmt(LAM_SWEEP[6].wR, 4)} — the same Ridge penalty the lesson names, applied to leaf outputs. What λ mostly does *not* do here is change which split wins: t = ${R1.best.t} takes it at every λ in the sweep.${LAM_FLIP ? ` It can, though — at round ${LAM_FLIP.r} the winner holds at t = ${LAM_FLIP.lo} for λ = 0.1, 1 and 5, then moves to t = ${LAM_FLIP.hi} at λ = 100: once λ dwarfs every leaf Hessian the score is driven by G² alone, and the split with the larger squared gradient sums takes over.` : ""} The clean division of labour: **λ shrinks what leaves say, γ decides whether leaves exist.**`,
    ln("s = lambda G, H: G*G / (H + lam)", "top = (v, t)"),
    {
      t: "table",
      label: "λ sweep at round 1",
      head: ["λ", "best t", "gain", "w*_left", "w*_right"],
      v: LAM_SWEEP.map((s) => ({
        cells: [String(s.lam), String(s.t), fmt(s.gain, 4), fmt(s.wL, 4), fmt(s.wR, 4)],
        cls: (s.lam === LAM ? "active" : "dim") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "right-leaf weight against λ",
      v: LAM_SWEEP.map((s) => ({
        k: `λ=${s.lam}`,
        val: s.wR,
        show: fmt(s.wR, 4),
        cls: (s.lam === LAM ? "good" : "warn") as TraceCls,
      })),
    }
  );

  const dead = GAM_SWEEP.find((s) => s.built === 0)!;
  push(
    `Payoff two, γ, and it has a hard edge you can compute in advance. γ is subtracted from every split score, so a split happens only if it clears γ. The best score available at round 1 is ${fmt(BEST_GAIN_1, 5)} — so at **γ = ${fmt(dead.gam, 2)}** nothing clears it, \`best_split\` returns None, the round is skipped, and F never changes. Which means the *next* round faces the identical gradients and skips too. Over 50 rounds, **${dead.built} trees are built** and the loss sits at ${fmt(dead.loss, 5)} = ln 2, exactly where it started: the model is a formal no-op. One hyperparameter a fraction above a computable threshold, and the entire ensemble silently learns nothing.`,
    ln("- parent) - gam", "if t is None"),
    {
      t: "table",
      label: "γ over 50 rounds (λ = 1, η = 0.3)",
      head: ["γ", "trees built", "final loss"],
      v: GAM_SWEEP.map((s) => ({
        cells: [fmt(s.gam, 2), `${s.built}/50`, fmt(s.loss, 5)],
        cls: (s.built === 0 ? "bad" : s.built === 50 ? "good" : "warn") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `Note the middle of that table, which is the practical regime: γ = 0.5 still builds ${GAM_SWEEP.find((s) => s.gam === 0.5)!.built} trees rather than 0 — early rounds have large gradients and clear the bar, later ones do not. γ does not slow learning down evenly, it stops it once the easy structure is gone.`,
      cls: "warn",
    }
  );

  return {
    id: "gradient-boosting-splits",
    title: "XGBoost's split search — gradients, Hessians, λ and γ",
    caption:
      "The regularized objective from this lesson, executed on eight points. Each round recomputes g = p − y and h = p(1−p), scores every candidate threshold with the closed-form second-order gain, and adds η times the optimal leaf weight −G/(H+λ). Frame 5 is the contrast with the AdaBoost trace: no sample weight is ever touched — a badly-fit point's gradient simply grows, and the split score is built from gradients. The last two frames measure what the two regularizers actually do, and they do different jobs: λ shrinks leaf values (and quietly refuses to isolate single points), while γ has a hard threshold above which no split clears the bar and the entire ensemble becomes a no-op.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const gradientBoostingTrace = build();
