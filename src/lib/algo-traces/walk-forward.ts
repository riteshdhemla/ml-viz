import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * Walk-forward validation from `wiki/walk-forward-validation.mdx`.
 *
 * Frames 1–8 run the page's own hand-worked example exactly — the 12-point
 * series, n₀ = 6, h = 1, mean-of-3 predictor — and reach the page's MAE of 2.00,
 * so the trace and the prose cannot drift apart.
 *
 * Frame 9 exists because the page's chosen predictor makes the expanding vs
 * sliding distinction invisible: mean-of-3 reads only the last three points, so
 * the window size cannot affect it. Swapping in two predictors that *do* use
 * the whole training window puts the difference on screen, and on this rising
 * series it comes out sliding (3.50) beating expanding (4.83) — old data is not
 * neutral, it actively drags the forecast down.
 *
 * The payoff measures the leakage the page asserts, as a *model-selection*
 * failure rather than a single-number one. Eight polynomial trends are scored
 * three ways on a 120-point series: random 5-fold, walk-forward, and a genuinely
 * held-out final 30 points. Random k-fold's error *falls* monotonically with
 * degree (1.97 → 1.55) while walk-forward's *rises* (2.15 → 3.53) — the two
 * curves point in opposite directions, because interpolating between
 * neighbouring training points rewards wiggle and extrapolating punishes it.
 * Over 20 seeds k-fold picks degree 6–8 every time, walk-forward picks 1–2 every
 * time, and k-fold's choice is worse on the real future in 20/20 seeds.
 */

const CODE = codeLines(`
def walk_forward(y, fit, n0, h, window):
    errors = []
    for t in range(n0, len(y) - h + 1):

        # train strictly on the past
        s = t - window if window else 0
        model = fit(y[s:t])

        # predict a strictly future point
        yhat = model.predict(h)
        e = abs(y[t : t + h] - yhat)
        errors.append(e)

    return mean(errors)
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------ the page's example */

const SERIES = [10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 23];
const N0 = 6;
const H = 1;

/** The page's predictor: mean of the 3 most recent training observations. */
const mean3 = (train: number[]) => train.slice(-3).reduce((a, b) => a + b, 0) / 3;
/** Uses the whole training window — so the window size matters. */
const meanAll = (train: number[]) => train.reduce((a, b) => a + b, 0) / train.length;

function walkForward(
  y: number[],
  fit: (train: number[]) => number,
  n0: number,
  window?: number
) {
  const rounds: { t: number; train: number[]; start: number; yhat: number; actual: number; err: number }[] =
    [];
  for (let t = n0; t <= y.length - H; t++) {
    const start = window ? Math.max(0, t - window) : 0;
    const train = y.slice(start, t);
    const yhat = fit(train);
    const actual = y[t];
    rounds.push({ t, train, start, yhat, actual, err: Math.abs(actual - yhat) });
  }
  const mae = rounds.reduce((s, r) => s + r.err, 0) / rounds.length;
  return { rounds, mae };
}

const fmt = (x: number, d = 2) => x.toFixed(d);

/* ------------------------------------------------------------- the payoff */

/** Least-squares polynomial fit via normal equations with Gauss–Jordan. */
function polyfit(ts: number[], ys: number[], deg: number): number[] {
  const n = deg + 1;
  const A: number[][] = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = ts.reduce((s, t) => s + t ** (i + j), 0);
    A[i][n] = ts.reduce((s, t, k) => s + t ** i * ys[k], 0);
  }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}
const evalPoly = (co: number[], t: number) => co.reduce((s, c, i) => s + c * t ** i, 0);

const DEGREES = [1, 2, 3, 4, 5, 6, 7, 8];
const T_ALL = 120;
const T_CV = 90;
const N_SEEDS = 20;

/** Trend + seasonality + autocorrelated noise — an ordinary forecasting series. */
function makeSeries(seed: number) {
  const r = seededRng(seed);
  const y: number[] = [];
  let noise = 0;
  for (let t = 0; t < T_ALL; t++) {
    noise = 0.75 * noise + gaussian(r, 0, 1.0);
    y.push(10 + 0.12 * t + 3 * Math.sin((2 * Math.PI * t) / 24) + noise);
  }
  return y;
}

function scoreDegrees(seed: number) {
  const y = makeSeries(seed);
  const ts = Array.from({ length: T_CV }, (_, i) => i / T_ALL);
  const ys = y.slice(0, T_CV);

  const r = seededRng(seed * 13 + 1);
  const fold = Array.from({ length: T_CV }, () => Math.floor(r() * 5));

  const kfold = DEGREES.map((d) => {
    let e = 0;
    let n = 0;
    for (let f = 0; f < 5; f++) {
      const co = polyfit(
        ts.filter((_, i) => fold[i] !== f),
        ys.filter((_, i) => fold[i] !== f),
        d
      );
      ts.forEach((t, i) => {
        if (fold[i] === f) {
          e += Math.abs(ys[i] - evalPoly(co, t));
          n += 1;
        }
      });
    }
    return e / n;
  });

  const wf = DEGREES.map((d) => {
    let e = 0;
    let n = 0;
    for (let t = 45; t < T_CV; t++) {
      const co = polyfit(ts.slice(0, t), ys.slice(0, t), d);
      e += Math.abs(ys[t] - evalPoly(co, ts[t]));
      n += 1;
    }
    return e / n;
  });

  const future = DEGREES.map((d) => {
    const co = polyfit(ts, ys, d);
    let e = 0;
    for (let t = T_CV; t < T_ALL; t++) e += Math.abs(y[t] - evalPoly(co, t / T_ALL));
    return e / (T_ALL - T_CV);
  });

  const argmin = (a: number[]) => a.indexOf(Math.min(...a));
  return {
    kfold,
    wf,
    future,
    kPick: DEGREES[argmin(kfold)],
    wPick: DEGREES[argmin(wf)],
    bestPick: DEGREES[argmin(future)],
  };
}

/* ------------------------------------------------------------------ panels */

function seriesTokens(
  label: string,
  round: { t: number; start: number },
  used: number[]
): TraceComponent {
  const usedSet = new Set(used);
  return {
    t: "tokens",
    label,
    v: SERIES.map((y, i) => ({
      text: String(y),
      sub: `t${i + 1}`,
      cls: (i === round.t
        ? "warn"
        : usedSet.has(i)
          ? "active"
          : i < round.t && i >= round.start
            ? "dim"
            : i > round.t
              ? "bad"
              : "dim") as TraceCls,
    })),
  };
}

/* ------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const run = walkForward(SERIES, mean3, N0);

  // ---- 1. the setup --------------------------------------------------------
  push(
    `The page's series: ${SERIES.length} observations, minimum training size n₀ = ${N0}, horizon h = ${H}, and a predictor that averages the 3 most recent training points. One rule governs everything below — **the training window may only contain observations strictly before the point being predicted.** Colour code for the rest of the trace: grey is in the training window, bright is what the predictor actually reads, amber is the point being predicted, and red is the future the fold is forbidden to look at.`,
    ln("def walk_forward(y, fit, n0, h, window)"),
    seriesTokens(`series (n₀ = ${N0}, so round 1 predicts t${N0 + 1})`, { t: N0, start: 0 }, [
      N0 - 3,
      N0 - 2,
      N0 - 1,
    ]),
    {
      t: "kv",
      label: "configuration",
      v: [
        { k: "T", v: String(SERIES.length) },
        { k: "n₀", v: String(N0) },
        { k: "h", v: String(H) },
        { k: "rounds", v: String(run.rounds.length) },
        { k: "window", v: "expanding" },
      ],
    }
  );

  // ---- 2..7. the six rounds ------------------------------------------------
  const commentary = [
    "The first fold: train on t1–t6, predict t7. The predictor reads only t4, t5, t6 — but the *fold* still owns all six, which is what n₀ controls.",
    "The window expands by one. Note t7, which was the validation point a moment ago, is now training data — every observation eventually plays both roles, just never in the same round.",
    "Third round, and the errors are climbing: 1.00, 2.00, 3.00. That is not noise, it is a systematic lag — a backward-looking average cannot keep up with a rising series, so it under-predicts by more each time the trend continues.",
    "The series dips at t10 (20 → 19) and the error falls back to 1.00. The predictor did not get better; the series briefly stopped rising, which is exactly the case a lagging average handles well.",
    "Rising again, and the error grows again. The 1, 2, 3, 1, 2, 3 pattern is the trend and the dip alternating — a diagnostic the average CV number will hide completely.",
    "The last round the data allows: train on t1–t11, predict t12. There is no t13, so the loop stops. Walk-forward always yields fewer folds than k-fold on the same series, and that is the cost of not cheating.",
  ];
  run.rounds.forEach((r, j) => {
    const usedIdx = [r.t - 3, r.t - 2, r.t - 1];
    push(
      `**Round ${j + 1}** — ${commentary[j]} Prediction ŷ = mean(${usedIdx
        .map((i) => SERIES[i])
        .join(", ")}) = ${fmt(r.yhat)}, actual ${r.actual}, error ${fmt(r.err)}.`,
      ln(j === 0 ? "for t in range(n0, len(y) - h + 1)" : "e = abs(y[t : t + h] - yhat)"),
      seriesTokens(`round ${j + 1}: train t1–t${r.t}, predict t${r.t + 1}`, r, usedIdx),
      {
        t: "table",
        label: "folds so far",
        head: ["round", "train", "predict", "ŷ", "actual", "|e|"],
        v: run.rounds.slice(0, j + 1).map((x, k) => ({
          cells: [
            String(k + 1),
            `1–${x.t}`,
            `t${x.t + 1}`,
            fmt(x.yhat),
            String(x.actual),
            fmt(x.err),
          ],
          cls: (k === j ? "active" : "dim") as TraceCls,
        })),
      }
    );
  });

  // ---- 8. the CV estimate --------------------------------------------------
  push(
    `Average the fold errors: MAE = ${run.rounds.map((r) => fmt(r.err, 0)).join(" + ")} over ${
      run.rounds.length
    } = **${fmt(
      run.mae
    )}**, matching the page's hand-worked table exactly. This number means something specific and narrow: it is the one-step-ahead error this model would have made had it been deployed at t${
      N0 + 1
    } and retrained every step. It is not "the model's accuracy" — it is the accuracy of a *procedure*, measured the way the procedure will actually be used.`,
    ln("return mean(errors)"),
    {
      t: "bars",
      label: "per-fold absolute error",
      v: run.rounds.map((r) => ({
        k: `t${r.t + 1}`,
        val: r.err,
        show: fmt(r.err),
        cls: "active" as TraceCls,
      })),
    },
    {
      t: "kv",
      label: "walk-forward estimate",
      v: [
        { k: "folds", v: String(run.rounds.length) },
        { k: "MAE", v: fmt(run.mae), cls: "good" },
        {
          k: "RMSE",
          v: fmt(Math.sqrt(run.rounds.reduce((s, r) => s + r.err ** 2, 0) / run.rounds.length)),
        },
      ],
    }
  );

  // ---- 9. expanding vs sliding, with a predictor that can tell the difference
  const expAll = walkForward(SERIES, meanAll, N0);
  const slideAll = walkForward(SERIES, meanAll, N0, N0);
  push(
    `Expanding or sliding? With the mean-of-3 predictor the question is meaningless — it reads three points no matter how large the window is, so both schemes give ${fmt(
      run.mae
    )}. Swap in a predictor that uses its **whole** training window and the choice starts to matter: expanding gives MAE ${fmt(
      expAll.mae
    )}, sliding with W = ${N0} gives ${fmt(
      slideAll.mae
    )}. The sliding window wins because on a rising series the oldest observations are not merely uninformative, they **drag the average down**, and an expanding window keeps accumulating more of them. That is the whole basis for choosing between the two: not bookkeeping, but whether old data still describes the process.`,
    ln("s = t - window if window else 0"),
    {
      t: "table",
      label: "same loop, same series, three predictors",
      head: ["predictor", "window", "MAE"],
      v: [
        { cells: ["mean of last 3", "either", fmt(run.mae)], cls: "good" as TraceCls },
        { cells: ["mean of window", "expanding", fmt(expAll.mae)], cls: "bad" as TraceCls },
        { cells: ["mean of window", `sliding W=${N0}`, fmt(slideAll.mae)], cls: "warn" as TraceCls },
      ],
    },
    {
      t: "note",
      text: "Read the three rows in order and they say the same thing three times: the shorter the memory, the better the forecast on this series. That is a fact about the data — it trends — not a general law, and reversing it is exactly what a stationary process would do.",
    }
  );

  // ---- 10. payoff: what random k-fold selects -----------------------------
  const display = scoreDegrees(101);
  let kWorse = 0;
  const ratios: number[] = [];
  const kPicks: number[] = [];
  const wPicks: number[] = [];
  for (let s = 1; s <= N_SEEDS; s++) {
    const r = scoreDegrees(s * 101);
    kPicks.push(r.kPick);
    wPicks.push(r.wPick);
    const kf = r.future[DEGREES.indexOf(r.kPick)];
    const wfF = r.future[DEGREES.indexOf(r.wPick)];
    ratios.push(kf / wfF);
    if (kf > wfF) kWorse += 1;
  }
  // Proper two-sided median. The one-sided version lands on 289.9 here, which
  // is within 0.1 of the mean (290.0) purely by coincidence — the ratios are
  // strongly bimodal (33–119, then 290–849), so quoting either alone would
  // imply a concentration the data does not have. The range goes on screen too.
  const sortedRatios = ratios.slice().sort((a, b) => a - b);
  const mid = sortedRatios.length / 2;
  const medRatio =
    sortedRatios.length % 2 === 0
      ? (sortedRatios[mid - 1] + sortedRatios[mid]) / 2
      : sortedRatios[Math.floor(mid)];

  push(
    `**Payoff — what the leak actually costs you is a model choice.** A ${T_ALL}-point series, the first ${T_CV} for validation and the last ${
      T_ALL - T_CV
    } held back as a genuine future. Score eight polynomial trends three ways. Random 5-fold's error **falls** with degree (${fmt(
      display.kfold[0]
    )} → ${fmt(
      display.kfold[7]
    )}); walk-forward's **rises** (${fmt(display.wf[0])} → ${fmt(
      display.wf[7]
    )}). The two curves point in opposite directions, and the reason is one sentence: random folds ask the model to *interpolate* between neighbouring training points, which rewards wiggle, while walk-forward asks it to *extrapolate*, which punishes wiggle. The real future agrees with walk-forward — degree 1 costs ${fmt(
      display.future[0]
    )} and degree 8 costs ${fmt(
      display.future[7],
      0
    )}. So k-fold picks degree ${display.kPick} here, walk-forward picks degree ${
      display.wPick
    }, and across ${N_SEEDS} seeds k-fold's pick is the worse one on the real future **${kWorse} times out of ${N_SEEDS}** — by ${fmt(
      sortedRatios[0],
      0
    )}× in the mildest case and ${fmt(
      sortedRatios[sortedRatios.length - 1],
      0
    )}× in the worst, median ${fmt(
      medRatio,
      0
    )}×. The spread is enormous and the direction never varies, which is the right way round: how much the leak costs depends on the series, but *that* it costs does not.`,
    ln("# train strictly on the past"),
    {
      t: "plot",
      label: "MAE by polynomial degree — three ways of asking the same question",
      domain: [1, 8, 0, 6],
      xLabel: "polynomial degree",
      yLabel: "MAE",
      curves: [
        { pts: DEGREES.map((d, i) => ({ x: d, y: display.kfold[i] })), cls: "bad" },
        { pts: DEGREES.map((d, i) => ({ x: d, y: display.wf[i] })), cls: "good" },
        {
          pts: DEGREES.map((d, i) => ({ x: d, y: Math.min(6, display.future[i]) })),
          cls: "warn",
          dashed: true,
        },
      ],
    },
    {
      t: "table",
      label: "red = random 5-fold, green = walk-forward, amber dashed = the real future (clipped at 6)",
      head: ["degree", "random 5-fold", "walk-forward", "true future"],
      v: DEGREES.map((d, i) => ({
        cells: [String(d), fmt(display.kfold[i]), fmt(display.wf[i]), fmt(display.future[i])],
        cls: (d === display.kPick
          ? "bad"
          : d === display.wPick
            ? "good"
            : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: `Across ${N_SEEDS} seeds random k-fold never once chose below degree ${Math.min(
        ...kPicks
      )}, and walk-forward never once chose above degree ${Math.max(
        ...wPicks
      )}. Note what this is not: k-fold's numbers are not miscalculated. They are a correct estimate of interpolation error — a quantity nobody deploying a forecaster will ever be paid on.`,
      cls: "good",
    }
  );

  return {
    id: "walk-forward-validation",
    title: "Walk-forward validation — and what random k-fold selects instead",
    caption:
      "The page's own 12-point example, run fold by fold to its MAE of 2.00, with the per-fold errors showing a 1-2-3-1-2-3 pattern that the average hides — a backward-looking predictor lagging a trend. Then the part the page asserts but cannot show: score eight polynomial trends with random k-fold and with walk-forward and the two error curves run in opposite directions, because one asks the model to interpolate and the other to extrapolate. k-fold picks degree 6-8 in all 20 seeds tried; walk-forward picks 1-2; on a genuinely held-out future, k-fold's choice loses every time.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const walkForwardTrace = build();
