import type { AlgoTrace } from "@/types/algo-trace";
import { attentionTrace } from "./attention";
import { bm25Trace } from "./bm25";
import { baumWelchTrace } from "./baum-welch";
import { bloomFilterTrace } from "./bloom-filter";
import { bpeTrace } from "./bpe";
import { bpttTrace } from "./bptt";
import { dbscanTrace } from "./dbscan";
import { decisionTreeTrace } from "./decision-tree";
import { emTrace } from "./em";
import { hnswTrace } from "./hnsw";
import { isotonicTrace } from "./isotonic";
import { kmeansTrace } from "./kmeans";
import { adaboostTrace } from "./adaboost";
import { continuousBatchingTrace } from "./continuous-batching";
import { dgimTrace } from "./dgim";
import { hierarchicalTrace } from "./hierarchical";
import { hyperloglogTrace } from "./hyperloglog";
import { mcmcTrace } from "./mcmc";
import { newtonTrace } from "./newton";
import { nmsTrace } from "./nms";
import { pagedAttentionTrace } from "./paged-attention";
import { perceptronTrace } from "./perceptron";
import { rocTrace } from "./roc";
import { speculativeDecodingTrace } from "./speculative-decoding";
import { valueIterationTrace } from "./value-iteration";
import { variableEliminationTrace } from "./variable-elimination";
import { viterbiTrace } from "./viterbi";

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
  emTrace,
  baumWelchTrace,
  variableEliminationTrace,
  mcmcTrace,
  nmsTrace,
  adaboostTrace,
  hierarchicalTrace,
  newtonTrace,
  hyperloglogTrace,
  dgimTrace,
  speculativeDecodingTrace,
  bpttTrace,
  pagedAttentionTrace,
  viterbiTrace,
  valueIterationTrace,
  continuousBatchingTrace,
  rocTrace,
  bloomFilterTrace,
  isotonicTrace,
];

const byId = new Map(allAlgoTraces.map((t) => [t.id, t]));

export function getAlgoTrace(id: string): AlgoTrace | undefined {
  return byId.get(id);
}

export const algoTraceIds = allAlgoTraces.map((t) => t.id);
