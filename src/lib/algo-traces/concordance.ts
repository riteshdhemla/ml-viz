import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Concordant / discordant pair counting — the definition behind the
 * c-statistic, Somers' D, Kendall's tau-a and Goodman–Kruskal gamma, on the
 * eight-applicant worked example in
 * `src/content/wiki/concordance-and-rank-statistics.mdx`.
 *
 * Scores (0.82,+) (0.71,−) (0.65,+) (0.65,−) (0.50,+) (0.44,−) (0.30,−)
 * (0.12,−): 3 × 5 = 15 pairs, of which C = 11, D = 3, T = 1. Everything the
 * page claims falls out of those three counts:
 *
 *   c        = (11 + 0.5·1)/15 = 0.7667   (= AUC)
 *   Somers' D = (11 − 3)/15     = 0.5333   (= 2c − 1 = Gini)
 *   gamma     = (11 − 3)/14     = 0.5714
 *   tau-a     = (11 − 3)/28     = 0.2857
 *
 * The payoff collapses the same scores onto a three-grade scorecard
 * (High / Mid / Low). The ranking information inside a grade is destroyed, so
 * tied pairs go 1 → 5: c falls to 0.700 and Somers' D to 0.400, while gamma
 * *rises* to 0.600 — it divides ties away instead of paying for them. That
 * divergence is the reason a validation pack quotes c, not gamma.
 */

const CODE = codeLines(`
def concordance(scores, labels):
    pos = [s for s, y in zip(scores, labels) if y]
    neg = [s for s, y in zip(scores, labels) if not y]
    C = D = T = 0
    for p in pos:
        for q in neg:
            if p > q:
                C += 1      # concordant
            elif p < q:
                D += 1      # discordant
            else:
                T += 1      # tied
    total = C + D + T
    c = (C + 0.5 * T) / total
    somers_d = (C - D) / total
    gamma = (C - D) / (C + D)
    return c, somers_d, gamma
`);

const ln = lineFinder(CODE);

interface Row {
  id: string;
  score: number;
  label: number;
}

/** The eight applicants, highest score first. */
const ROWS: Row[] = [
  { id: "A", score: 0.82, label: 1 },
  { id: "B", score: 0.71, label: 0 },
  { id: "C", score: 0.65, label: 1 },
  { id: "D", score: 0.65, label: 0 },
  { id: "E", score: 0.5, label: 1 },
  { id: "F", score: 0.44, label: 0 },
  { id: "G", score: 0.3, label: 0 },
  { id: "H", score: 0.12, label: 0 },
];

const N = ROWS.length;

const fmt = (x: number, d = 4) => x.toFixed(d);

type Verdict = "C" | "D" | "T";

interface Counts {
  C: number;
  D: number;
  T: number;
}

interface Stats extends Counts {
  total: number;
  c: number;
  somersD: number;
  gamma: number;
  tauA: number;
}

/** Run the real double loop over a keyed score, recording every comparison. */
function concordance(key: (r: Row) => number) {
  const pos = ROWS.filter((r) => r.label === 1);
  const neg = ROWS.filter((r) => r.label === 0);
  const pairs: { p: Row; q: Row; verdict: Verdict }[] = [];
  let C = 0;
  let D = 0;
  let T = 0;
  for (const p of pos) {
    for (const q of neg) {
      const a = key(p);
      const b = key(q);
      const verdict: Verdict = a > b ? "C" : a < b ? "D" : "T";
      if (verdict === "C") C += 1;
      else if (verdict === "D") D += 1;
      else T += 1;
      pairs.push({ p, q, verdict });
    }
  }
  const total = C + D + T;
  const stats: Stats = {
    C,
    D,
    T,
    total,
    c: (C + 0.5 * T) / total,
    somersD: (C - D) / total,
    gamma: (C - D) / (C + D),
    tauA: (C - D) / ((N * (N - 1)) / 2),
  };
  return { pos, neg, pairs, stats };
}

const FINE = concordance((r) => r.score);

/** The same applicants pushed through a three-grade scorecard. */
const GRADE_NAME = ["", "Low", "Mid", "High"];
const grade = (s: number) => (s >= 0.65 ? 3 : s >= 0.44 ? 2 : 1);
const COARSE = concordance((r) => grade(r.score));

const VERDICT_CLS: Record<Verdict, TraceCls> = { C: "good", D: "bad", T: "warn" };
const VERDICT_WORD: Record<Verdict, string> = {
  C: "concordant",
  D: "discordant",
  T: "tied",
};

/** The ranked roster, with the pairs resolved so far marked. */
function roster(upToPos: number): TraceComponent {
  const posIds = FINE.pos.slice(0, upToPos).map((p) => p.id);
  return {
    t: "tokens",
    label: "all eight applicants, ranked by score",
    v: ROWS.map((r) => ({
      text: `${r.id} ${r.score.toFixed(2)}`,
      sub: r.label === 1 ? "default" : "repaid",
      cls: (r.label === 1
        ? posIds.includes(r.id)
          ? "good"
          : "active"
        : upToPos > 0
          ? "warn"
          : "dim") as TraceCls,
    })),
  };
}

/** Running C / D / T counters as bars, always on the same 15-pair axis. */
function counterBars(k: Counts): TraceComponent {
  return {
    t: "bars",
    label: `pairs resolved: ${k.C + k.D + k.T} of ${FINE.stats.total}`,
    v: [
      { k: "concordant", val: k.C, show: String(k.C), cls: "good" },
      { k: "discordant", val: k.D, show: String(k.D), cls: "bad" },
      { k: "tied", val: k.T, show: String(k.T), cls: "warn" },
    ],
    max: FINE.stats.total,
  };
}

/** The pair ledger up to (and including) the positive at index `upToPos - 1`. */
function pairTable(upToPos: number, label = "the pair ledger"): TraceComponent {
  const done = upToPos * FINE.neg.length;
  return {
    t: "table",
    label,
    head: ["default", "repaid", "compare", "verdict"],
    v: FINE.pairs.map((x, i) => ({
      cells: [
        `${x.p.id} ${x.p.score.toFixed(2)}`,
        `${x.q.id} ${x.q.score.toFixed(2)}`,
        x.verdict === "C" ? ">" : x.verdict === "D" ? "<" : "=",
        i < done ? VERDICT_WORD[x.verdict] : "—",
      ],
      cls: (i < done ? VERDICT_CLS[x.verdict] : "dim") as TraceCls,
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Eight loan applicants, scored by a model and then observed: three defaulted, five repaid. A threshold metric would make you pick a cutoff before you can say anything at all. Concordance asks a question with no cutoff in it: take one default and one repayer, does the model score the default higher?`,
    ln("pos = [s for s, y in zip(scores, labels) if y]"),
    roster(0),
    {
      t: "kv",
      label: "the two groups",
      v: [
        { k: "defaults (n₊)", v: String(FINE.pos.length), cls: "good" },
        { k: "repaid (n₋)", v: String(FINE.neg.length), cls: "warn" },
        { k: "pairs to judge", v: `${FINE.pos.length} × ${FINE.neg.length} = ${FINE.stats.total}` },
      ],
    },
    {
      t: "note",
      text: "Only the ordering matters. Any monotone transform of the scores — a log-odds shift, a 0–1000 rescale, a calibration map — leaves every verdict below unchanged.",
    }
  );

  let running: Counts = { C: 0, D: 0, T: 0 };
  FINE.pos.forEach((p, k) => {
    const mine = FINE.pairs.filter((x) => x.p.id === p.id);
    const c = mine.filter((x) => x.verdict === "C").length;
    const d = mine.filter((x) => x.verdict === "D").length;
    const t = mine.filter((x) => x.verdict === "T").length;
    running = { C: running.C + c, D: running.D + d, T: running.T + t };
    const detail = mine
      .map((x) => `${x.q.id} (${x.q.score.toFixed(2)}) ${VERDICT_WORD[x.verdict]}`)
      .join(", ");
    push(
      `Default ${p.id}, scored ${p.score.toFixed(2)}, against all ${FINE.neg.length} repayers: ${detail}. ${
        t > 0
          ? `The tie is the interesting one — ${p.id} and ${
              mine.find((x) => x.verdict === "T")!.q.id
            } got the identical score, so the model expressed no preference between a default and a repayer. That pair is neither a win nor a loss, and every statistic below has to decide what to do with it.`
          : d > 0
            ? `Each discordant pair is a real ranking error: a repayer the model ranked above a default.`
            : `A clean sweep — this default outranks every repayer in the book.`
      }`,
      ln(p.score === 0.65 ? "T += 1      # tied" : d > 0 ? "D += 1      # discordant" : "C += 1      # concordant"),
      roster(k + 1),
      pairTable(k + 1),
      counterBars(running)
    );
  });

  push(
    `All ${FINE.stats.total} pairs judged: C = ${FINE.stats.C}, D = ${FINE.stats.D}, T = ${FINE.stats.T}. The **c-statistic** splits the tie down the middle — half a win each — giving c = (${FINE.stats.C} + 0.5·${FINE.stats.T})/${FINE.stats.total} = ${fmt(
      FINE.stats.c
    )}. That number is the AUC, arrived at without ever drawing a curve or sweeping a threshold: AUC *is* the probability a random default outranks a random repayer.`,
    ln("c = (C + 0.5 * T) / total"),
    pairTable(FINE.pos.length, "every pair, resolved"),
    counterBars(FINE.stats),
    {
      t: "kv",
      label: "the c-statistic",
      v: [
        { k: "C + 0.5·T", v: `${FINE.stats.C} + 0.5·${FINE.stats.T} = ${FINE.stats.C + 0.5 * FINE.stats.T}` },
        { k: "÷ total pairs", v: String(FINE.stats.total) },
        { k: "c = AUC", v: fmt(FINE.stats.c), cls: "good" },
      ],
    }
  );

  push(
    `The same three counts, divided three other ways. **Somers' D** = (C − D)/total = ${FINE.stats.C} − ${FINE.stats.D} over ${FINE.stats.total} = ${fmt(
      FINE.stats.somersD
    )}, which is exactly 2c − 1 — the Gini coefficient a credit scorecard reports. **Kendall's tau-a** uses the same numerator over *all* ${(N * (N - 1)) / 2} pairs of the ${N} applicants, including default–default and repayer–repayer pairs the outcome cannot order, so it is structurally smaller and never reaches 1 on binary labels. **Goodman–Kruskal gamma** divides by C + D only, deleting tied pairs from the denominator.`,
    ln("gamma = (C - D) / (C + D)"),
    {
      t: "table",
      label: "one pair count, four statistics",
      head: ["statistic", "formula", "value", "ties count as"],
      v: [
        { cells: ["c-statistic (AUC)", "(C + T/2) / (C+D+T)", fmt(FINE.stats.c), "half a win"], cls: "good" },
        { cells: ["Somers' D (Gini)", "(C − D) / (C+D+T)", fmt(FINE.stats.somersD), "nothing"], cls: "good" },
        { cells: ["Kendall's tau-a", "(C − D) / (n(n−1)/2)", fmt(FINE.stats.tauA), "nothing"], cls: "warn" },
        { cells: ["Goodman–Kruskal γ", "(C − D) / (C+D)", fmt(FINE.stats.gamma), "deleted"], cls: "bad" },
      ],
    },
    {
      t: "bars",
      label: "same model, four numbers",
      v: [
        { k: "c", val: FINE.stats.c, show: fmt(FINE.stats.c, 3), cls: "good" },
        { k: "Somers' D", val: FINE.stats.somersD, show: fmt(FINE.stats.somersD, 3), cls: "good" },
        { k: "gamma", val: FINE.stats.gamma, show: fmt(FINE.stats.gamma, 3), cls: "bad" },
        { k: "tau-a", val: FINE.stats.tauA, show: fmt(FINE.stats.tauA, 3), cls: "warn" },
      ],
      max: 1,
    },
    {
      t: "note",
      text: "Somers' D = 2c − 1 holds only when ties are scored half — check: 2 × 0.7667 − 1 = 0.5333. Quote c and D together and you have said one thing twice; quote gamma next to them and you have said something different, as the next frame shows.",
    }
  );

  // ---- payoff: collapse the scores onto a three-grade scorecard ------------
  push(
    `The payoff. Nothing about the model's ordering changes here except its **resolution**: the same eight applicants are bucketed into a three-grade scorecard (High ≥ 0.65, Mid ≥ 0.44, Low below), the way a risk grade or a rounded decile does in production. Pairs inside a grade are now tied, so T goes ${FINE.stats.T} → ${COARSE.stats.T}. The c-statistic falls ${fmt(
      FINE.stats.c,
      3
    )} → ${fmt(COARSE.stats.c, 3)} and Somers' D ${fmt(FINE.stats.somersD, 3)} → ${fmt(
      COARSE.stats.somersD,
      3
    )}, both correctly charging the model for the discrimination it just threw away. Gamma goes the other way, ${fmt(
      FINE.stats.gamma,
      3
    )} → ${fmt(
      COARSE.stats.gamma,
      3
    )} — it *rose*, because deleting tied pairs from the denominator rewards a model for refusing to express a preference.`,
    ln("total = C + D + T"),
    {
      t: "tokens",
      label: "the same applicants, three grades",
      v: ROWS.map((r) => ({
        text: `${r.id} ${GRADE_NAME[grade(r.score)]}`,
        sub: r.label === 1 ? "default" : "repaid",
        cls: (r.label === 1 ? "good" : "warn") as TraceCls,
      })),
    },
    {
      t: "table",
      label: "full scores vs three grades",
      head: ["statistic", "full scores", "three grades", "moved"],
      v: [
        {
          cells: ["C / D / T", `${FINE.stats.C} / ${FINE.stats.D} / ${FINE.stats.T}`, `${COARSE.stats.C} / ${COARSE.stats.D} / ${COARSE.stats.T}`, "ties ×5"],
          cls: "warn",
        },
        { cells: ["c-statistic", fmt(FINE.stats.c, 3), fmt(COARSE.stats.c, 3), "↓ 0.067"], cls: "bad" },
        { cells: ["Somers' D", fmt(FINE.stats.somersD, 3), fmt(COARSE.stats.somersD, 3), "↓ 0.133"], cls: "bad" },
        { cells: ["Goodman–Kruskal γ", fmt(FINE.stats.gamma, 3), fmt(COARSE.stats.gamma, 3), "↑ 0.029"], cls: "good" },
      ],
    },
    {
      t: "bars",
      label: "c and Somers' D pay for ties; gamma is paid by them",
      v: [
        { k: "c (full)", val: FINE.stats.c, show: fmt(FINE.stats.c, 3), cls: "good" },
        { k: "c (grades)", val: COARSE.stats.c, show: fmt(COARSE.stats.c, 3), cls: "bad" },
        { k: "γ (full)", val: FINE.stats.gamma, show: fmt(FINE.stats.gamma, 3), cls: "warn" },
        { k: "γ (grades)", val: COARSE.stats.gamma, show: fmt(COARSE.stats.gamma, 3), cls: "good" },
      ],
      max: 1,
    },
    {
      t: "note",
      text: "This is why a model-validation pack quotes the c-statistic or Somers' D and not gamma, and why you compute them on raw scores rather than on binned grades. Any coarsening — risk grades, rounded scores, a decile table — pushes ties up and discrimination down; a statistic that deletes ties will hide exactly that loss.",
      cls: "warn",
    }
  );

  return {
    id: "concordance-pairs",
    title: "Concordant pairs — the c-statistic, Somers' D and gamma from one double loop",
    caption:
      "Every (default, repayer) pair on the eight-applicant example judged one positive at a time: 11 concordant, 3 discordant, 1 tied. Watch the four statistics fall out of those three counts — c = 0.7667 is the AUC, Somers' D = 0.5333 is 2c − 1. The payoff collapses the same scores onto a three-grade scorecard: ties go 1 → 5, c and Somers' D fall, and gamma rises, because it deletes the ties instead of paying for them.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const concordanceTrace = build();
