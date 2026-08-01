import type { AlgoTrace } from "@/types/algo-trace";
import { attentionTrace } from "./attention";
import { bm25Trace } from "./bm25";
import { bpeTrace } from "./bpe";
import { dbscanTrace } from "./dbscan";
import { decisionTreeTrace } from "./decision-tree";
import { hnswTrace } from "./hnsw";
import { kmeansTrace } from "./kmeans";
import { perceptronTrace } from "./perceptron";

/**
 * Registry of **algorithm traces** — the algo-viz-style steppable explainers.
 *
 * MDX references a trace by id, never by object, because lesson/wiki MDX is
 * rendered with `blockJS: true`:
 *
 * ```mdx
 * <AlgorithmTrace id="bm25-scoring" />
 * ```
 *
 * To add one: write `src/lib/algo-traces/<name>.ts` exporting a built
 * `AlgoTrace` (run the real algorithm, record frames — never hand-write the
 * numbers), then append it to `allAlgoTraces` below. `algo-trace-integrity`
 * checks ids are unique, code-line references are in range, and every
 * `<AlgorithmTrace id>` used in content resolves.
 */
export const allAlgoTraces: AlgoTrace[] = [
  bpeTrace,
  attentionTrace,
  bm25Trace,
  hnswTrace,
  kmeansTrace,
  dbscanTrace,
  decisionTreeTrace,
  perceptronTrace,
];

const byId = new Map(allAlgoTraces.map((t) => [t.id, t]));

export function getAlgoTrace(id: string): AlgoTrace | undefined {
  return byId.get(id);
}

export const algoTraceIds = allAlgoTraces.map((t) => t.id);
