import type { AlgoTrace, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * The decision-tree split search on the 10-applicant loan dataset from
 * `src/content/wiki/decision-tree-information-gain.mdx` — every candidate
 * threshold scored, exactly as a real tree does at every node.
 *
 * The payoff re-scores all nine thresholds with entropy instead of Gini and
 * shows the winner is unchanged, which is why the choice of impurity measure
 * is a footnote rather than a decision.
 */

const CODE = codeLines(`
def best_split(ages, labels):
    best = (None, -1)
    parent = gini(labels)
    for t in midpoints(sorted(ages)):
        left  = [y for a, y in rows if a <= t]
        right = [y for a, y in rows if a >  t]
        # a big impure child hurts more
        child = (len(left)  / n * gini(left)
               + len(right) / n * gini(right))
        gain = parent - child
        if gain > best[1]:
            best = (t, gain)
    return best

def gini(ys):
    if not ys:
        return 0.0
    p = sum(ys) / len(ys)
    return 1 - (p ** 2 + (1 - p) ** 2)
`);

const ln = lineFinder(CODE);

const AGES = [22, 25, 28, 30, 33, 36, 40, 45, 50, 60];
const LABELS = [0, 0, 0, 0, 1, 1, 0, 1, 1, 1];
const N = AGES.length;

const fmt = (x: number, d = 4) => x.toFixed(d);

function gini(ys: number[]): number {
  if (ys.length === 0) return 0;
  const p = ys.reduce((s, y) => s + y, 0) / ys.length;
  return 1 - (p ** 2 + (1 - p) ** 2);
}

function entropy(ys: number[]): number {
  if (ys.length === 0) return 0;
  const p = ys.reduce((s, y) => s + y, 0) / ys.length;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

const MIDPOINTS = AGES.slice(0, -1).map((a, i) => (a + AGES[i + 1]) / 2);

/** Split the labels at a threshold. */
function split(t: number) {
  const left: number[] = [];
  const right: number[] = [];
  AGES.forEach((a, i) => (a <= t ? left : right).push(LABELS[i]));
  return { left, right };
}

const counts = (ys: number[]) => `${ys.filter((y) => y === 1).length}P/${ys.filter((y) => y === 0).length}N`;

/** The dataset as a row of chips, coloured by which side of `t` they fall. */
function dataPanel(t?: number): TraceComponent {
  return {
    t: "tokens",
    label: t === undefined ? "age → label (1 = approved)" : `split at age ≤ ${t}`,
    v: AGES.map((a, i) => ({
      text: String(a),
      sub: String(LABELS[i]),
      cls: t === undefined ? (LABELS[i] === 1 ? "good" : "bad") : a <= t ? "active" : "warn",
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const parentGini = gini(LABELS);
  const parentEntropy = entropy(LABELS);

  push(
    `Ten loan applicants sorted by age, 5 approved and 5 denied. A 50/50 node is the most impure a binary node can be: Gini = 1 − (0.5² + 0.5²) = ${fmt(parentGini, 3)}. The tree's job at this node is to find the single age threshold that reduces that impurity the most.`,
    ln("parent = gini(labels)"),
    dataPanel(),
    {
      t: "kv",
      label: "root node",
      v: [
        { k: "approved", v: "5" },
        { k: "denied", v: "5" },
        { k: "Gini", v: fmt(parentGini, 3), cls: "bad" },
      ],
    }
  );

  const results: { t: number; gain: number; child: number; left: number[]; right: number[] }[] = [];
  let best = { t: 0, gain: -1 };

  for (const t of MIDPOINTS) {
    const { left, right } = split(t);
    const child = (left.length / N) * gini(left) + (right.length / N) * gini(right);
    const gain = parentGini - child;
    const isNewBest = gain > best.gain;
    if (isNewBest) best = { t, gain };
    results.push({ t, gain, child, left, right });

    push(
      `Age ≤ ${t}: left gets ${left.length} row${left.length === 1 ? "" : "s"} (${counts(left)}, Gini ${fmt(gini(left), 3)}), right gets ${right.length} (${counts(right)}, Gini ${fmt(gini(right), 3)}). Weighted child impurity = ${fmt(child, 4)}, so the gain is ${fmt(parentGini, 3)} − ${fmt(child, 4)} = **${fmt(gain, 4)}**. ${
        isNewBest ? "Best so far." : `Worse than the leader (${fmt(best.gain, 4)} at age ≤ ${best.t}).`
      }`,
      [...ln("child = (len(left)"), ...ln("gain = parent - child")],
      dataPanel(t),
      {
        t: "table",
        label: "this split",
        head: ["side", "rows", "P/N", "Gini", "weight"],
        v: [
          {
            cells: ["left", String(left.length), counts(left), fmt(gini(left), 3), fmt(left.length / N, 1)],
            cls: "active",
          },
          {
            cells: ["right", String(right.length), counts(right), fmt(gini(right), 3), fmt(right.length / N, 1)],
            cls: "warn",
          },
        ],
      },
      {
        t: "bars",
        label: "Gini gain by threshold (so far)",
        v: results.map((r) => ({
          k: `≤ ${r.t}`,
          val: r.gain,
          show: fmt(r.gain, 3),
          cls: r.t === best.t ? "good" : r.t === t ? "active" : "dim",
        })),
        max: 0.34,
      }
    );
  }

  const winner = results.find((r) => r.t === best.t)!;
  push(
    `All nine thresholds scored. Age ≤ ${best.t} wins with a gain of ${fmt(best.gain, 4)}: it isolates a perfectly pure left child (${counts(winner.left)} — every applicant under ${best.t} was denied) while leaving the right child only mildly impure. That is the split this node makes; the tree then recurses on each child.`,
    ln("return best"),
    dataPanel(best.t),
    {
      t: "bars",
      label: "Gini gain by threshold",
      v: results.map((r) => ({
        k: `≤ ${r.t}`,
        val: r.gain,
        show: fmt(r.gain, 3),
        cls: r.t === best.t ? "good" : "dim",
      })),
      max: 0.34,
    },
    {
      t: "note",
      text: "Notice the gain is not monotone in the threshold — it peaks where the classes actually separate. A greedy tree finds that peak by brute force at every node.",
    }
  );

  // ---- payoff: entropy picks the same split ------------------------------
  const entropyResults = MIDPOINTS.map((t) => {
    const { left, right } = split(t);
    const child = (left.length / N) * entropy(left) + (right.length / N) * entropy(right);
    return { t, gain: parentEntropy - child };
  });
  const entropyBest = entropyResults.reduce((a, b) => (b.gain > a.gain ? b : a));

  push(
    `Swap Gini for entropy — a different formula, a different scale (gains up to ${fmt(entropyBest.gain, 3)} bits instead of ${fmt(best.gain, 3)}) — and re-score all nine thresholds. Age ≤ ${entropyBest.t} still wins. The two measures disagree about *how much* a split is worth but almost never about *which* split is best, which is why scikit-learn defaults to Gini (no logarithm) and ID3/C4.5 use entropy, with nobody much minding.`,
    ln("def gini(ys)"),
    {
      t: "bars",
      label: "Gini gain",
      v: results.map((r) => ({
        k: `≤ ${r.t}`,
        val: r.gain,
        show: fmt(r.gain, 3),
        cls: r.t === best.t ? "good" : "dim",
      })),
      max: 0.62,
    },
    {
      t: "bars",
      label: "entropy gain (bits)",
      v: entropyResults.map((r) => ({
        k: `≤ ${r.t}`,
        val: r.gain,
        show: fmt(r.gain, 3),
        cls: r.t === entropyBest.t ? "good" : "dim",
      })),
      max: 0.62,
    },
    {
      t: "note",
      text: `Same argmax, different units. Choose the impurity measure for speed, not for accuracy.`,
      cls: "good",
    }
  );

  return {
    id: "decision-tree-split-search",
    title: "Decision tree — scoring every candidate split",
    caption:
      "What a decision tree actually does at a single node: sort the feature, try every midpoint between consecutive values, and score each one by how much it lowers weighted child impurity. All nine candidate thresholds on the 10-applicant loan dataset are scored here, with the running leader tracked as you step. The last step re-runs the whole scan with entropy instead of Gini and lands on the same winner.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const decisionTreeTrace = build();
