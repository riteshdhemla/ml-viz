"use client";

/**
 * Five ranking metrics on one re-orderable list, so the reader can find the
 * pair of rankings that separates them.
 *
 * The preset worth pressing is "same P@10": three relevant items at the top
 * versus the same three at the bottom. Precision@10 is identical at 0.300 —
 * it counts a set, and the set has not changed — while every position-aware
 * metric collapses:
 *
 *                 P@10    P@3    MRR      MAP      NDCG@10
 *   good order    0.300   1.000  1.0000   1.0000   1.0000
 *   reversed      0.300   0.000  0.1250   0.2157   0.3452
 *
 * NDCG falls 2.90×, MRR 8×, on a list containing exactly the same documents.
 * That is the whole argument for position-aware metrics in one comparison, and
 * it is why "precision@k" alone is nearly useless as a ranking objective.
 *
 * Everything is computed live from the relevance grades you set:
 * DCG = Σ (2^rel − 1)/log₂(i+2), NDCG = DCG / ideal DCG, MAP over the graded
 * items treated as binary-relevant, MRR from the first hit.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat } from "../viz-kit";

const N = 10;
const GRADE_COLORS = ["#252938", "#3f4a6b", VIZ.brand, VIZ.teal];
const GRADE_LABEL = ["not relevant", "marginal", "relevant", "perfect"];

const dcg = (rel: number[]) => rel.reduce((s, r, i) => s + (Math.pow(2, r) - 1) / Math.log2(i + 2), 0);
const ndcg = (rel: number[]) => {
  const ideal = dcg([...rel].sort((a, b) => b - a));
  return ideal > 0 ? dcg(rel) / ideal : 0;
};
const precAt = (rel: number[], k: number) => rel.slice(0, k).filter((r) => r > 0).length / k;
const ap = (rel: number[]) => {
  let hits = 0;
  let s = 0;
  rel.forEach((r, i) => {
    if (r > 0) {
      hits++;
      s += hits / (i + 1);
    }
  });
  const tot = rel.filter((r) => r > 0).length;
  return tot ? s / tot : 0;
};
const mrr = (rel: number[]) => {
  const i = rel.findIndex((r) => r > 0);
  return i < 0 ? 0 : 1 / (i + 1);
};

const GOOD = [3, 2, 1, 0, 0, 0, 0, 0, 0, 0];
const REVERSED = [0, 0, 0, 0, 0, 0, 0, 1, 2, 3];
const SPREAD = [3, 0, 0, 2, 0, 0, 1, 0, 0, 0];

export function RankingMetricsViz({ className }: { className?: string }) {
  const [rel, setRel] = useState<number[]>(GOOD);

  const bump = (i: number) => setRel(rel.map((r, j) => (i === j ? (r + 1) % 4 : r)));

  const m = useMemo(
    () => ({
      p3: precAt(rel, 3),
      p10: precAt(rel, 10),
      mrr: mrr(rel),
      map: ap(rel),
      ndcg: ndcg(rel),
    }),
    [rel]
  );

  const eq = (a: number[]) => a.every((v, i) => v === rel[i]);

  return (
    <VizFrame
      title="Five metrics, one list"
      caption="Click a row to cycle its relevance grade (0–3). Every metric is recomputed from the grades: DCG = Σ (2^rel − 1)/log₂(i+2) with NDCG normalising by the ideal ordering, MAP averaging precision at each hit, MRR reading only the first. Bar length is the item's gain; position is its rank."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <VizButton active={eq(GOOD)} onClick={() => setRel(GOOD)}>
          relevant at the top
        </VizButton>
        <VizButton active={eq(REVERSED)} onClick={() => setRel(REVERSED)}>
          same items, at the bottom
        </VizButton>
        <VizButton active={eq(SPREAD)} onClick={() => setRel(SPREAD)}>
          spread out
        </VizButton>
      </div>

      <div className="space-y-1">
        {rel.map((r, i) => (
          <button
            key={i}
            onClick={() => bump(i)}
            className="flex w-full items-center gap-2 text-left"
            title={GRADE_LABEL[r]}
          >
            <span className="w-6 shrink-0 text-right text-[11px] font-mono text-slate-500">{i + 1}</span>
            <div className="h-4 flex-1 rounded bg-surface-elevated/40">
              <div
                className="h-4 rounded transition-all"
                style={{ width: `${((Math.pow(2, r) - 1) / 7) * 100}%`, background: GRADE_COLORS[r] }}
              />
            </div>
            <span className="w-24 shrink-0 text-[10px] text-slate-500">{GRADE_LABEL[r]}</span>
            <span className="w-16 shrink-0 text-right text-[10px] font-mono text-slate-500">
              gain {((Math.pow(2, r) - 1) / Math.log2(i + 2)).toFixed(2)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
        <VizStat label="P@3" value={m.p3.toFixed(3)} />
        <VizStat label="P@10" value={m.p10.toFixed(3)} color={VIZ.yellow} />
        <VizStat label="MRR" value={m.mrr.toFixed(4)} />
        <VizStat label="MAP" value={m.map.toFixed(4)} />
        <VizStat label="NDCG@10" value={m.ndcg.toFixed(4)} color={VIZ.teal} />
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Press the first two presets in turn. <span className="font-mono text-white">P@10</span> does not
        move — it counts a set, and the set is identical — while NDCG falls from{" "}
        <span className="font-mono text-white">1.0000</span> to{" "}
        <span className="font-mono text-white">0.3452</span> and MRR from{" "}
        <span className="font-mono text-white">1.0000</span> to{" "}
        <span className="font-mono text-white">0.1250</span>. Same documents, same recall, a ranking
        nobody would ship.
      </p>
    </VizFrame>
  );
}
