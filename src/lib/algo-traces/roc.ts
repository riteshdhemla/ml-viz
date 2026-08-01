import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * ROC construction on the 5-example worked trace in
 * `src/content/wiki/roc-auc.mdx` — scores (0.92,+) (0.85,+) (0.61,−) (0.43,+)
 * (0.18,−), giving AUC = 5/6, cross-checked against the Wilcoxon
 * concordant-pair count on the same data.
 *
 * The payoff replicates every negative 100× — identical ranking, 40× the class
 * imbalance. ROC-AUC does not move at all (FPR divides by n₋, so scaling the
 * negatives cancels), while precision at full recall falls from 0.75 to 0.029.
 * That asymmetry is the single most useful thing on the page.
 */

const CODE = codeLines(`
def roc(scores, labels):
    order = argsort(scores)[::-1]   # high first
    n_pos = sum(labels)
    n_neg = len(labels) - n_pos
    tp = fp = 0
    pts = [(0.0, 0.0)]
    for i in order:
        if labels[i] == 1:
            tp += 1       # climb: TPR only
        else:
            fp += 1       # step right: FPR only
        pts.append((fp / n_neg, tp / n_pos))
    auc = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        # trapezoid under this segment
        auc += (x1 - x0) * (y0 + y1) / 2
    return pts, auc
`);

const ln = lineFinder(CODE);

const SCORES = [0.92, 0.85, 0.61, 0.43, 0.18];
const LABELS = [1, 1, 0, 1, 0];
const N_POS = LABELS.filter((l) => l === 1).length;
const N_NEG = LABELS.length - N_POS;

const fmt = (x: number, d = 3) => x.toFixed(d);
const frac = (n: number, d: number) => `${n}/${d}`;

interface Step {
  i: number;
  score: number;
  label: number;
  tp: number;
  fp: number;
  fpr: number;
  tpr: number;
}

/** The sweep: one step per example, in descending score order. */
function roc() {
  const order = SCORES.map((_, i) => i).sort((a, b) => SCORES[b] - SCORES[a]);
  let tp = 0;
  let fp = 0;
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  const steps: Step[] = [];
  for (const i of order) {
    if (LABELS[i] === 1) tp += 1;
    else fp += 1;
    pts.push({ x: fp / N_NEG, y: tp / N_POS });
    steps.push({ i, score: SCORES[i], label: LABELS[i], tp, fp, fpr: fp / N_NEG, tpr: tp / N_POS });
  }
  let auc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    auc += (pts[k + 1].x - pts[k].x) * ((pts[k].y + pts[k + 1].y) / 2);
  }
  return { pts, steps, auc };
}

const R = roc();

/** Average precision over the same ranking, for an arbitrary label multiset. */
function averagePrecision(scored: { score: number; label: number }[]) {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const nPos = sorted.filter((s) => s.label === 1).length;
  let tp = 0;
  let fp = 0;
  let prevRecall = 0;
  let ap = 0;
  let precisionAtFullRecall = 0;
  for (const s of sorted) {
    if (s.label === 1) tp += 1;
    else fp += 1;
    const recall = tp / nPos;
    const precision = tp / (tp + fp);
    ap += (recall - prevRecall) * precision;
    prevRecall = recall;
    if (tp === nPos && precisionAtFullRecall === 0) precisionAtFullRecall = precision;
  }
  return { ap, precisionAtFullRecall, n: sorted.length, nPos };
}

/** ROC-AUC for an arbitrary label multiset (used for the imbalanced re-run). */
function aucOf(scored: { score: number; label: number }[]) {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const nPos = sorted.filter((s) => s.label === 1).length;
  const nNeg = sorted.length - nPos;
  let tp = 0;
  let fp = 0;
  let prevX = 0;
  let prevY = 0;
  let auc = 0;
  for (const s of sorted) {
    if (s.label === 1) tp += 1;
    else fp += 1;
    const x = fp / nNeg;
    const y = tp / nPos;
    auc += (x - prevX) * ((prevY + y) / 2);
    prevX = x;
    prevY = y;
  }
  return auc;
}

function curvePlot(upTo: number, label: string): TraceComponent {
  const shown = R.pts.slice(0, upTo + 1);
  return {
    t: "plot",
    label,
    domain: [0, 1, 0, 1],
    xLabel: "FPR",
    yLabel: "TPR",
    curves: [
      {
        pts: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        cls: "dim",
        dashed: true,
      },
      ...(shown.length > 1 ? [{ pts: shown, cls: "good" as TraceCls }] : []),
    ],
    points: shown.map((p, k) => ({
      x: p.x,
      y: p.y,
      cls: (k === shown.length - 1 && upTo > 0 ? "active" : "good") as TraceCls,
      shape: "dot" as const,
    })),
  };
}

function stepTable(upTo: number): TraceComponent {
  return {
    t: "table",
    label: "the sweep",
    head: ["step", "score", "label", "FPR", "TPR"],
    v: [
      { cells: ["start", "—", "—", "0", "0"], cls: "dim" as TraceCls },
      ...R.steps.map((s, k) => ({
        cells: [
          String(k + 1),
          fmt(s.score, 2),
          s.label === 1 ? "+" : "−",
          frac(s.fp, N_NEG),
          frac(s.tp, N_POS),
        ],
        cls: (k < upTo ? (s.label === 1 ? "good" : "warn") : "dim") as TraceCls,
      })),
    ],
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Five scored examples — three positives and two negatives — sorted by descending score. ROC never looks at the scores themselves, only at the *order* they induce: the whole curve is traced by sweeping a threshold from +∞ down to −∞ and recording where each example falls.`,
    ln("order = argsort(scores)[::-1]   # high first"),
    {
      t: "tokens",
      label: "sorted by score",
      v: R.steps.map((s) => ({
        text: fmt(s.score, 2),
        sub: s.label === 1 ? "+" : "−",
        cls: (s.label === 1 ? "good" : "warn") as TraceCls,
      })),
    },
    curvePlot(0, "the curve, empty (dashed = random classifier)"),
    {
      t: "note",
      text: "Because only the ranking matters, any monotone rescaling of the scores — a sigmoid, a temperature change, a calibration map — leaves the ROC curve and the AUC completely unchanged.",
    }
  );

  R.steps.forEach((s, k) => {
    push(
      s.label === 1
        ? `Step ${k + 1}: score ${fmt(s.score, 2)} is a **positive**, so the curve moves straight **up** by 1/n₊ = 1/${N_POS}. TPR rises to ${frac(
            s.tp,
            N_POS
          )}, FPR stays at ${frac(s.fp, N_NEG)}. Every correctly-ranked positive is free vertical progress.`
        : `Step ${k + 1}: score ${fmt(s.score, 2)} is a **negative**, so the curve moves **right** by 1/n₋ = 1/${N_NEG}. FPR rises to ${frac(
            s.fp,
            N_NEG
          )}, TPR stays at ${frac(s.tp, N_POS)}. Horizontal movement is the cost of admitting a false positive to catch the positives below it.`,
      s.label === 1 ? ln("tp += 1       # climb: TPR only") : ln("fp += 1       # step right: FPR only"),
      curvePlot(k + 1, `after step ${k + 1}`),
      stepTable(k + 1),
      {
        t: "kv",
        label: "counters",
        v: [
          { k: "TP", v: String(s.tp), cls: "good" },
          { k: "FP", v: String(s.fp), cls: "warn" },
          { k: "TPR", v: `${frac(s.tp, N_POS)} = ${fmt(s.tpr)}` },
          { k: "FPR", v: `${frac(s.fp, N_NEG)} = ${fmt(s.fpr)}` },
        ],
      }
    );
  });

  push(
    `The curve is complete and ends at (1, 1) — as it must, once the threshold is low enough to admit everything. AUC by the trapezoid rule is ${fmt(
      R.auc,
      4
    )} = 5/6. A perfect ranker would go straight up then straight across, enclosing 1.0; the dashed diagonal is a coin flip at 0.5.`,
    ln("auc += (x1 - x0) * (y0 + y1) / 2"),
    curvePlot(R.steps.length, `complete — AUC = ${fmt(R.auc, 3)}`),
    stepTable(R.steps.length),
    {
      t: "table",
      label: "trapezoid contributions",
      head: ["segment", "ΔFPR", "avg TPR", "area"],
      v: R.pts.slice(0, -1).flatMap((p, k) => {
        const q = R.pts[k + 1];
        const d = q.x - p.x;
        if (d === 0) return [];
        return [
          {
            cells: [`(${fmt(p.x, 2)}, ${fmt(p.y, 2)}) → (${fmt(q.x, 2)}, ${fmt(q.y, 2)})`, fmt(d, 2), fmt((p.y + q.y) / 2, 3), fmt(d * ((p.y + q.y) / 2), 4)],
            cls: "good" as TraceCls,
          },
        ];
      }),
    }
  );

  // ---- cross-check: Wilcoxon–Mann–Whitney --------------------------------
  const positives = R.steps.filter((s) => s.label === 1);
  const negatives = R.steps.filter((s) => s.label === 0);
  const pairs = positives.flatMap((p) =>
    negatives.map((n) => ({ p: p.score, n: n.score, concordant: p.score > n.score }))
  );
  const concordant = pairs.filter((x) => x.concordant).length;

  push(
    `A completely different route to the same number. Take every (positive, negative) pair — ${positives.length} × ${negatives.length} = ${pairs.length} of them — and count how many have the positive ranked above the negative: ${concordant}. Then ${concordant}/${pairs.length} = ${fmt(
      concordant / pairs.length,
      4
    )}, exactly the area under the curve. AUC *is* the probability that a random positive outranks a random negative — which is why it measures ranking quality and says nothing whatever about calibration.`,
    ln("return pts, auc"),
    {
      t: "table",
      label: "every positive–negative pair",
      head: ["positive", "negative", "positive ranked higher?"],
      v: pairs.map((x) => ({
        cells: [fmt(x.p, 2), fmt(x.n, 2), x.concordant ? "yes" : "no"],
        cls: (x.concordant ? "good" : "bad") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "two routes to AUC",
      v: [
        { k: "trapezoid", val: R.auc, show: fmt(R.auc, 4), cls: "good" },
        { k: `${concordant}/${pairs.length} pairs`, val: concordant / pairs.length, show: fmt(concordant / pairs.length, 4), cls: "good" },
      ],
      max: 1,
    }
  );

  // ---- payoff: class imbalance --------------------------------------------
  const MULT = 100;
  const balanced = SCORES.map((score, i) => ({ score, label: LABELS[i] }));
  const imbalanced = [
    ...balanced.filter((s) => s.label === 1),
    ...balanced.filter((s) => s.label === 0).flatMap((s) => Array.from({ length: MULT }, () => ({ ...s }))),
  ];
  const balAP = averagePrecision(balanced);
  const imbAP = averagePrecision(imbalanced);
  const imbAuc = aucOf(imbalanced);

  push(
    `Now replicate every negative ${MULT}× — same scores, same ranking, nothing about the model's ordering changed, but the class balance goes from ${N_POS}:${N_NEG} to ${imbAP.nPos}:${
      imbAP.n - imbAP.nPos
    }. ROC-AUC is **exactly unchanged** at ${fmt(imbAuc, 4)}, because FPR divides by n₋ and scaling every negative equally cancels in that ratio. Precision does not divide by n₋ — it divides by TP + FP — so at full recall it falls from ${fmt(
      balAP.precisionAtFullRecall,
      3
    )} to ${fmt(imbAP.precisionAtFullRecall, 3)}, a ${fmt(
      balAP.precisionAtFullRecall / imbAP.precisionAtFullRecall,
      0
    )}× collapse. The model that looks equally good on ROC is now returning ${fmt(
      (1 - imbAP.precisionAtFullRecall) * 100,
      1
    )}% false positives at the operating point that catches everything.`,
    ln("pts.append((fp / n_neg, tp / n_pos))"),
    {
      t: "bars",
      label: "ROC-AUC — insensitive to the negative count by construction",
      v: [
        { k: `${N_POS}:${N_NEG}`, val: R.auc, show: fmt(R.auc, 4), cls: "good" },
        { k: `${imbAP.nPos}:${imbAP.n - imbAP.nPos}`, val: imbAuc, show: fmt(imbAuc, 4), cls: "good" },
      ],
      max: 1,
    },
    {
      t: "bars",
      label: "precision at full recall — collapses",
      v: [
        { k: `${N_POS}:${N_NEG}`, val: balAP.precisionAtFullRecall, show: fmt(balAP.precisionAtFullRecall, 3), cls: "good" },
        { k: `${imbAP.nPos}:${imbAP.n - imbAP.nPos}`, val: imbAP.precisionAtFullRecall, show: fmt(imbAP.precisionAtFullRecall, 3), cls: "bad" },
      ],
      max: 1,
    },
    {
      t: "table",
      label: "same ranking, two class balances",
      head: ["metric", `${N_POS}:${N_NEG}`, `${imbAP.nPos}:${imbAP.n - imbAP.nPos}`],
      v: [
        { cells: ["ROC-AUC", fmt(R.auc, 4), fmt(imbAuc, 4)], cls: "good" },
        { cells: ["average precision", fmt(balAP.ap, 4), fmt(imbAP.ap, 4)], cls: "warn" },
        {
          cells: [
            "precision @ recall 1",
            fmt(balAP.precisionAtFullRecall, 4),
            fmt(imbAP.precisionAtFullRecall, 4),
          ],
          cls: "bad",
        },
      ],
    },
    {
      t: "note",
      text: "Neither number is lying — they answer different questions. ROC-AUC asks how well the model ranks; precision asks what fraction of your alerts are real. On a rare-event problem, report the precision-recall pair at your actual operating point, and treat a flattering AUC as necessary but nowhere near sufficient.",
      cls: "warn",
    }
  );

  return {
    id: "roc-construction",
    title: "ROC — sweeping a threshold, and what class imbalance does to it",
    caption:
      "The ROC curve built one example at a time on the five-point worked example above: a positive moves the curve up, a negative moves it right, and AUC is the trapezoid area — 5/6, cross-checked against the Wilcoxon concordant-pair count on the same data. The final step replicates every negative 100× without changing the ranking at all: AUC does not move a digit, while precision at full recall collapses by more than 25×.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const rocTrace = build();
