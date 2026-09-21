import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * DeLong's test for two correlated ROC curves, on the ten-subject paired
 * example in `src/content/wiki/comparing-model-performance.mdx`.
 *
 * Four cases and six controls, both models scoring the *same* ten subjects:
 * AUC_A = 19/24 = 0.7917, AUC_B = 14/24 = 0.5833, difference 0.2083. The
 * structural matrices come out of the placement values, not from a hand-typed
 * table:
 *
 *   S10 = [[0.043981, 0.060185], [0.060185, 0.101852]]
 *   S01 = [[0.085417, 0.095833], [0.095833, 0.116667]]
 *   S   = S10/4 + S01/6 = [[0.025231, 0.031019], [0.031019, 0.044907]]
 *
 * var(Â − B̂) = 0.008102, se = 0.0900, z = 2.3146, p = 0.0206.
 *
 * The payoff throws away the one thing that makes the test worth doing — the
 * pairing. corr(Â, B̂) = 0.921 here, so the covariance term removes 88% of the
 * variance; treating the two AUCs as independent inflates the standard error
 * to 0.2648 and gives z = 0.787, p = 0.431 on identical data. Same numbers,
 * opposite conclusion.
 *
 * With four cases the normal approximation is optimistic; the exact
 * within-subject permutation test on this data gives p = 16/1024 = 0.0156,
 * reported in the closing note so the frame does not oversell the z.
 */

const CODE = codeLines(`
def psi(x, y):
    # win 1, tie 1/2, loss 0
    if x > y: return 1.0
    return 0.5 if x == y else 0.0

def placements(pos, neg):
    # V10[i]: case i vs every control
    v10 = [avg([psi(p, q) for q in neg])
           for p in pos]
    # V01[j]: control j vs every case
    v01 = [avg([psi(p, q) for p in pos])
           for q in neg]
    return v10, v01

def delong(models, m, n):
    A, V10, V01 = [], [], []
    for pos, neg in models:
        a, b = placements(pos, neg)
        V10.append(a); V01.append(b)
        A.append(avg(a))     # = AUC
    S10 = cov(V10, ddof=1)   # m cases
    S01 = cov(V01, ddof=1)   # n controls
    S = S10 / m + S01 / n
    var = S[0][0] + S[1][1] - 2 * S[0][1]
    z = (A[0] - A[1]) / sqrt(var)
    return z, 2 * (1 - Phi(abs(z)))
`);

const ln = lineFinder(CODE);

/** The ten subjects: four cases (label 1), six controls, scored by both models. */
const SUBJECTS = [
  { id: "s1", label: 1, a: 0.9, b: 0.7 },
  { id: "s2", label: 1, a: 0.75, b: 0.65 },
  { id: "s3", label: 1, a: 0.6, b: 0.45 },
  { id: "s4", label: 1, a: 0.35, b: 0.25 },
  { id: "s5", label: 0, a: 0.8, b: 0.85 },
  { id: "s6", label: 0, a: 0.55, b: 0.6 },
  { id: "s7", label: 0, a: 0.4, b: 0.5 },
  { id: "s8", label: 0, a: 0.3, b: 0.4 },
  { id: "s9", label: 0, a: 0.2, b: 0.3 },
  { id: "s10", label: 0, a: 0.1, b: 0.15 },
];

const CASES = SUBJECTS.filter((s) => s.label === 1);
const CONTROLS = SUBJECTS.filter((s) => s.label === 0);
const M = CASES.length;
const N = CONTROLS.length;

const MODELS = ["A", "B"] as const;
const scoreOf = (s: (typeof SUBJECTS)[number], k: number) => (k === 0 ? s.a : s.b);

const fmt = (x: number, d = 4) => x.toFixed(d);
const avg = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;
const psi = (x: number, y: number) => (x > y ? 1 : x === y ? 0.5 : 0);

/** Abramowitz–Stegun 7.1.26 error function; |ε| < 1.5e-7, plenty for a p-value. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}
const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Placement values and AUC for one model, computed from the real scores. */
function placements(k: number) {
  const v10 = CASES.map((p) => avg(CONTROLS.map((q) => psi(scoreOf(p, k), scoreOf(q, k)))));
  const v01 = CONTROLS.map((q) => avg(CASES.map((p) => psi(scoreOf(p, k), scoreOf(q, k)))));
  return { v10, v01, auc: avg(v10) };
}

const PL = [placements(0), placements(1)];

/** Sample covariance of two placement vectors about their AUCs. */
function cov2(vs: number[][], aucs: number[], denom: number): number[][] {
  const out = [
    [0, 0],
    [0, 0],
  ];
  for (let r = 0; r < 2; r++) {
    for (let s = 0; s < 2; s++) {
      let acc = 0;
      for (let i = 0; i < vs[r].length; i++) acc += (vs[r][i] - aucs[r]) * (vs[s][i] - aucs[s]);
      out[r][s] = acc / (denom - 1);
    }
  }
  return out;
}

const AUCS = [PL[0].auc, PL[1].auc];
const S10 = cov2([PL[0].v10, PL[1].v10], AUCS, M);
const S01 = cov2([PL[0].v01, PL[1].v01], AUCS, N);
const S = [
  [S10[0][0] / M + S01[0][0] / N, S10[0][1] / M + S01[0][1] / N],
  [S10[1][0] / M + S01[1][0] / N, S10[1][1] / M + S01[1][1] / N],
];

const DIFF = AUCS[0] - AUCS[1];
const VAR_PAIRED = S[0][0] + S[1][1] - 2 * S[0][1];
const SE_PAIRED = Math.sqrt(VAR_PAIRED);
const Z_PAIRED = DIFF / SE_PAIRED;
const P_PAIRED = 2 * (1 - normalCdf(Math.abs(Z_PAIRED)));
const CORR = S[0][1] / Math.sqrt(S[0][0] * S[1][1]);

const VAR_NAIVE = S[0][0] + S[1][1];
const SE_NAIVE = Math.sqrt(VAR_NAIVE);
const Z_NAIVE = DIFF / SE_NAIVE;
const P_NAIVE = 2 * (1 - normalCdf(Math.abs(Z_NAIVE)));

/** Concordant-pair count for one model, for the opening AUC check. */
function pairCount(k: number) {
  let c = 0;
  let t = 0;
  for (const p of CASES) {
    for (const q of CONTROLS) {
      const v = psi(scoreOf(p, k), scoreOf(q, k));
      if (v === 1) c += 1;
      else if (v === 0.5) t += 1;
    }
  }
  return { c, t, total: M * N };
}
const PAIRS = [pairCount(0), pairCount(1)];

/** Both models' scores for all ten subjects, optionally focusing one model. */
function subjectTable(focus?: number): TraceComponent {
  return {
    t: "table",
    label: "the same ten subjects, scored twice",
    head: ["subject", "outcome", "model A", "model B"],
    v: SUBJECTS.map((s) => ({
      cells: [
        s.id,
        s.label === 1 ? "case" : "control",
        focus === 1 ? "·" : s.a.toFixed(2),
        focus === 0 ? "·" : s.b.toFixed(2),
      ],
      cls: (s.label === 1 ? "good" : "warn") as TraceCls,
    })),
  };
}

function placementBars(k: number): TraceComponent[] {
  return [
    {
      t: "bars",
      label: `model ${MODELS[k]} — V10, each case against all ${N} controls`,
      v: CASES.map((p, i) => ({
        k: `${p.id} (${scoreOf(p, k).toFixed(2)})`,
        val: PL[k].v10[i],
        show: fmt(PL[k].v10[i], 3),
        cls: "good" as TraceCls,
      })),
      max: 1,
    },
    {
      t: "bars",
      label: `model ${MODELS[k]} — V01, each control against all ${M} cases`,
      v: CONTROLS.map((q, j) => ({
        k: `${q.id} (${scoreOf(q, k).toFixed(2)})`,
        val: PL[k].v01[j],
        show: fmt(PL[k].v01[j], 3),
        cls: "warn" as TraceCls,
      })),
      max: 1,
    },
  ];
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Two models, ${SUBJECTS.length} subjects, and one unavoidable fact: both models scored the **same** subjects, so their AUC estimates are not independent. Counting concordant pairs gives AUC_A = ${PAIRS[0].c}/${PAIRS[0].total} = ${fmt(
      AUCS[0]
    )} and AUC_B = ${PAIRS[1].c}/${PAIRS[1].total} = ${fmt(AUCS[1])}, a gap of ${fmt(
      DIFF
    )}. The whole question is whether a gap that size could come out of a test set this small by luck.`,
    ln("def delong(models, m, n):"),
    subjectTable(),
    {
      t: "kv",
      label: "the two AUCs",
      v: [
        { k: "cases (m)", v: String(M), cls: "good" },
        { k: "controls (n)", v: String(N), cls: "warn" },
        { k: "AUC_A", v: `${PAIRS[0].c}/${PAIRS[0].total} = ${fmt(AUCS[0])}`, cls: "good" },
        { k: "AUC_B", v: `${PAIRS[1].c}/${PAIRS[1].total} = ${fmt(AUCS[1])}`, cls: "bad" },
        { k: "difference", v: fmt(DIFF), cls: "active" },
      ],
    },
    {
      t: "note",
      text: "A two-sample test would ask whether two independent samples differ. This is a paired problem: subject s5 is a hard control for both models, and that shared difficulty is shared noise. DeLong's contribution is an exact expression for the covariance that noise creates.",
    }
  );

  push(
    `DeLong rewrites the AUC as an average of **placement values**. For model A, V10 asks of each case: what fraction of controls does it beat (ties counted half)? Case s1 at 0.90 beats all ${N} controls, so V10 = 1.000; case s4 at 0.35 beats three of six, so 0.500. Their mean, ${fmt(
      AUCS[0]
    )}, is exactly the AUC — the same number the pair count gave, now decomposed into one contribution per case.`,
    ln("v10 = [avg([psi(p, q) for q in neg])"),
    subjectTable(0),
    ...placementBars(0),
    {
      t: "kv",
      label: "model A placements",
      v: [
        { k: "mean(V10)", v: fmt(AUCS[0]), cls: "good" },
        { k: "mean(V01)", v: fmt(avg(PL[0].v01)), cls: "good" },
        { k: "both equal", v: "the AUC" },
      ],
    },
    {
      t: "note",
      text: "V01 is the mirror image: for each control, the fraction of cases that outrank it. Its mean is the same AUC, which is why the variance decomposes into a case term and a control term that are then divided by m and n separately.",
    }
  );

  push(
    `The same decomposition for model B. Note what happens subject by subject: control s5 (scored 0.80 by A, 0.85 by B) is near the top for **both** models, so it drags both AUCs down together — V01 = ${fmt(
      PL[0].v01[0],
      3
    )} under A and ${fmt(
      PL[1].v01[0],
      3
    )} under B. That co-movement, repeated across subjects, is the covariance the test is about to exploit.`,
    ln("v01 = [avg([psi(p, q) for p in pos])"),
    subjectTable(1),
    ...placementBars(1),
    {
      t: "kv",
      label: "model B placements",
      v: [
        { k: "mean(V10) = AUC_B", v: fmt(AUCS[1]), cls: "bad" },
        { k: "hardest control", v: `s5 → V01 = ${fmt(PL[1].v01[0], 3)}`, cls: "warn" },
      ],
    }
  );

  push(
    `Now the two structural matrices. S10 is the sample covariance of the V10 vectors across the ${M} cases; S01 the same across the ${N} controls. The off-diagonal entries are large and positive (${fmt(
      S10[0][1]
    )} and ${fmt(
      S01[0][1]
    )}) precisely because the two models struggle with the same subjects. Diagonal entries are each model's own variability.`,
    ln("S10 = cov(V10, ddof=1)   # m cases"),
    {
      t: "matrix",
      label: "S10 — covariance across cases",
      rows: ["A", "B"],
      cols: ["A", "B"],
      v: S10,
      digits: 4,
      heat: true,
    },
    {
      t: "matrix",
      label: "S01 — covariance across controls",
      rows: ["A", "B"],
      cols: ["A", "B"],
      v: S01,
      digits: 4,
      heat: true,
    },
    {
      t: "note",
      text: "S10 divides by m − 1 and S01 by n − 1 — they are ordinary sample covariances of the placement vectors. Nothing about the score scale enters; like the AUC itself, they depend only on the rankings.",
    }
  );

  push(
    `Combine them the way the AUC's variance decomposes: S = S10/m + S01/n = S10/${M} + S01/${N}. The diagonal gives each AUC its own standard error — se(Â) = ${fmt(
      Math.sqrt(S[0][0]),
      4
    )}, se(B̂) = ${fmt(
      Math.sqrt(S[1][1]),
      4
    )} — and the off-diagonal gives their correlation: **${fmt(
      CORR,
      3
    )}**. The two estimates move almost in lockstep, which is exactly the leverage a paired test has and an unpaired one does not.`,
    ln("S = S10 / m + S01 / n"),
    {
      t: "matrix",
      label: "S — covariance of (Â, B̂)",
      rows: ["A", "B"],
      cols: ["A", "B"],
      v: S,
      digits: 5,
      heat: true,
    },
    {
      t: "kv",
      label: "what S says",
      v: [
        { k: "se(Â)", v: fmt(Math.sqrt(S[0][0])), cls: "good" },
        { k: "se(B̂)", v: fmt(Math.sqrt(S[1][1])), cls: "bad" },
        { k: "cov(Â, B̂)", v: fmt(S[0][1]), cls: "active" },
        { k: "corr(Â, B̂)", v: fmt(CORR, 3), cls: "active" },
      ],
    }
  );

  push(
    `The test itself is one line of algebra. var(Â − B̂) = S_AA + S_BB − 2·S_AB = ${fmt(
      S[0][0],
      5
    )} + ${fmt(S[1][1], 5)} − 2·${fmt(S[0][1], 5)} = ${fmt(VAR_PAIRED, 6)}, so se = ${fmt(
      SE_PAIRED
    )} and z = ${fmt(DIFF)}/${fmt(SE_PAIRED)} = ${fmt(Z_PAIRED, 3)}, p = ${fmt(
      P_PAIRED,
      4
    )}. With four cases and six controls, the ${fmt(DIFF, 3)} gap is already too large to write off as luck.`,
    ln("z = (A[0] - A[1]) / sqrt(var)"),
    {
      t: "kv",
      label: "DeLong's paired test",
      v: [
        { k: "Â − B̂", v: fmt(DIFF), cls: "active" },
        { k: "var", v: fmt(VAR_PAIRED, 6) },
        { k: "se", v: fmt(SE_PAIRED) },
        { k: "z", v: fmt(Z_PAIRED, 3), cls: "good" },
        { k: "p (two-sided)", v: fmt(P_PAIRED, 4), cls: "good" },
        {
          k: "95% CI",
          v: `[${fmt(DIFF - 1.96 * SE_PAIRED, 3)}, ${fmt(DIFF + 1.96 * SE_PAIRED, 3)}]`,
        },
      ],
    },
    {
      t: "bars",
      label: "the variance budget",
      v: [
        { k: "var(Â)", val: S[0][0], show: fmt(S[0][0], 5), cls: "good" },
        { k: "var(B̂)", val: S[1][1], show: fmt(S[1][1], 5), cls: "bad" },
        { k: "−2·cov", val: 2 * S[0][1], show: `−${fmt(2 * S[0][1], 5)}`, cls: "warn" },
        { k: "var(Â − B̂)", val: VAR_PAIRED, show: fmt(VAR_PAIRED, 5), cls: "active" },
      ],
      max: Math.max(S[0][0], S[1][1], 2 * S[0][1]),
    },
    {
      t: "note",
      text: "Report the confidence interval alongside the p-value. The interval here runs from 0.03 to 0.38 — the gap is real, but this test set cannot say whether it is small or enormous.",
    }
  );

  // ---- payoff: throw the pairing away -------------------------------------
  push(
    `The payoff: delete one term. Suppose you had reported these two AUCs from separate evaluations and compared them as if independent. Nothing in the data changes — same subjects, same scores, same ${fmt(
      DIFF,
      3
    )} gap — but the −2·cov term disappears, so the variance jumps from ${fmt(
      VAR_PAIRED,
      5
    )} to ${fmt(VAR_NAIVE, 5)}, the standard error from ${fmt(SE_PAIRED, 3)} to ${fmt(
      SE_NAIVE,
      3
    )}, and z collapses from ${fmt(Z_PAIRED, 2)} to ${fmt(Z_NAIVE, 2)}: p = ${fmt(
      P_NAIVE,
      3
    )}, a comfortable "no evidence of a difference". The covariance term was removing ${(
      (2 * S[0][1]) /
      VAR_NAIVE *
      100
    ).toFixed(0)}% of the variance, and it is free — you already have the paired predictions.`,
    ln("var = S[0][0] + S[1][1] - 2 * S[0][1]"),
    {
      t: "table",
      label: "same data, pairing kept vs thrown away",
      head: ["", "paired (DeLong)", "treated as independent"],
      v: [
        { cells: ["variance", fmt(VAR_PAIRED, 5), fmt(VAR_NAIVE, 5)], cls: "warn" },
        { cells: ["standard error", fmt(SE_PAIRED), fmt(SE_NAIVE)], cls: "warn" },
        { cells: ["z", fmt(Z_PAIRED, 3), fmt(Z_NAIVE, 3)], cls: "active" },
        { cells: ["p-value", fmt(P_PAIRED, 4), fmt(P_NAIVE, 4)], cls: "bad" },
        { cells: ["verdict at α = 0.05", "B is worse", "can't tell"], cls: "bad" },
      ],
    },
    {
      t: "bars",
      label: "standard error of the AUC gap",
      v: [
        { k: "paired", val: SE_PAIRED, show: fmt(SE_PAIRED, 3), cls: "good" },
        { k: "independent", val: SE_NAIVE, show: fmt(SE_NAIVE, 3), cls: "bad" },
      ],
      max: SE_NAIVE,
    },
    {
      t: "note",
      text: "Two caveats worth carrying out of this trace. With four cases the normal approximation is optimistic — the exact within-subject permutation test on this same data gives p = 16/1024 = 0.0156, close enough to confirm the verdict but not something to rely on in general at n = 10. And DeLong compares ranking quality only: a model can win this test and still be badly calibrated, or lose it and still be the better decision rule at your operating threshold.",
      cls: "warn",
    }
  );

  return {
    id: "delong-auc-test",
    title: "DeLong's test — is that AUC gap real, or did the test set get lucky?",
    caption:
      "Two models scored on the same ten subjects: AUC 0.7917 vs 0.5833. Watch the AUC decompose into placement values, the placement values into the S10 / S01 covariance matrices, and those into a standard error for the gap. The payoff deletes the covariance term — the one thing pairing buys — and the same 0.208 gap goes from p = 0.021 to p = 0.431.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const delongTrace = build();
