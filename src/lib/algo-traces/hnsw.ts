import type { AlgoTrace, TraceCls, TraceComponent, TraceFrame } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * HNSW search on the tiny two-layer 1-D index worked through in
 * `src/content/wiki/hnsw.mdx`: points at 0, 8, …, 56 with an express lane
 * {0, 24, 48} on layer 1, querying q = 34.
 *
 * `searchLayer` below is the real SEARCH-LAYER procedure (frontier min-heap,
 * capped result max-heap, and the early-exit that keeps search sub-linear), run
 * twice exactly as the paper's SEARCH does: ef = 1 for the greedy descent, then
 * ef = efSearch for the beam on layer 0.
 */

const CODE = codeLines(`
def search_layer(q, entry, ef, layer):
    visited    = set(entry)
    # frontier, and the best-so-far capped at ef
    candidates = min_heap(entry, key=dist_to_q)
    results    = max_heap(entry, key=dist_to_q)
    while candidates:
        c = candidates.pop_nearest()
        if dist(c, q) > dist(results.farthest(), q):
            break        # frontier can't improve
        for e in neighbours(c, layer):
            if e in visited:
                continue
            visited.add(e)
            worst = results.farthest()
            if dist(e, q) < dist(worst, q) \
                    or len(results) < ef:
                candidates.push(e)
                results.push(e)
                if len(results) > ef:
                    results.pop_farthest()
    return results

def search(q, k, ef_search):
    ep = enter_point          # single top-layer node
    # greedy descent with ef = 1
    for layer in range(L, 0, -1):
        ep = search_layer(q, {ep}, ef=1, layer)
    W = search_layer(q, {ep}, ef=ef_search, layer=0)
    return nearest(W, k)
`);

const ln = lineFinder(CODE);

const POINTS = [0, 8, 16, 24, 32, 40, 48, 56];
const QUERY = 34;
const EF_SEARCH = 2;
const ENTRY = 24;

/**
 * layer 1 = the express lane; layer 0 = every point, chained to its neighbours.
 * Listed top-down for rendering, but always *looked up by layer number* — the
 * two orders are opposite and conflating them silently searches the wrong graph.
 */
const LAYERS: { layer: number; name: string; nodes: number[]; edges: [number, number][] }[] = [
  { layer: 1, name: "L1", nodes: [0, 24, 48], edges: [[0, 24], [24, 48]] },
  {
    layer: 0,
    name: "L0",
    nodes: POINTS,
    edges: POINTS.slice(0, -1).map((p, i) => [p, POINTS[i + 1]] as [number, number]),
  },
];

const layerOf = (layer: number) => LAYERS.find((l) => l.layer === layer)!;

const dist = (p: number) => Math.abs(p - QUERY);
const neighbours = (p: number, layer: number) =>
  layerOf(layer)
    .edges.filter(([a, b]) => a === p || b === p)
    .map(([a, b]) => (a === p ? b : a));

interface State {
  layer: number;
  visited: Set<number>;
  candidates: number[];
  results: number[];
  current?: number;
  rejected: Set<number>;
}

function nodeCls(p: number, s: State): TraceCls | undefined {
  if (p === s.current) return "active";
  if (s.results.includes(p)) return "good";
  if (s.candidates.includes(p)) return "warn";
  if (s.rejected.has(p)) return "bad";
  if (s.visited.has(p)) return "dim";
  return undefined;
}

function graphPanel(s: State): TraceComponent {
  return {
    t: "graph",
    label: `index — q = ${QUERY} (efSearch = ${EF_SEARCH})`,
    levels: LAYERS.map((lvl) => ({
      name: lvl.name,
      nodes: lvl.nodes.map((p) => ({
        id: String(p),
        x: p / POINTS[POINTS.length - 1],
        // only the layer currently being searched is lit up
        cls: lvl.layer === s.layer ? nodeCls(p, s) : undefined,
      })),
      edges: lvl.edges.map(([a, b]) => [String(a), String(b)] as [string, string]),
    })),
    drop: s.layer === 0 ? undefined : s.current !== undefined ? String(s.current) : undefined,
  };
}

function distPanel(s: State): TraceComponent {
  return {
    t: "bars",
    label: `|p − q| for every point  (q = ${QUERY})`,
    v: POINTS.map((p) => ({
      k: String(p),
      val: dist(p),
      show: String(dist(p)),
      cls: nodeCls(p, s) ?? "dim",
    })),
    max: Math.max(...POINTS.map(dist)),
  };
}

function setsPanel(s: State): TraceComponent[] {
  const chips = (ids: number[], cls: TraceCls) =>
    [...ids]
      .sort((a, b) => dist(a) - dist(b))
      .map((p) => ({ k: String(p), v: `d=${dist(p)}`, cls }));
  return [
    {
      t: "kv",
      label: `results (cap ${s.layer === 0 ? EF_SEARCH : 1})`,
      v: chips(s.results, "good"),
    },
    { t: "kv", label: "candidate frontier", v: chips(s.candidates, "warn") },
    {
      t: "kv",
      label: "visited",
      v: [...s.visited].sort((a, b) => a - b).map((p) => ({ k: String(p), cls: "dim" as TraceCls })),
    },
  ];
}

const snapshot = (s: State): TraceFrame["c"] => [graphPanel(s), distPanel(s), ...setsPanel(s)];

/** The real SEARCH-LAYER, recording a frame at every decision point. */
function searchLayer(
  entry: number[],
  ef: number,
  layer: number,
  push: (d: string, l: number[], ...c: TraceFrame["c"]) => void
): { results: number[]; visited: Set<number> } {
  const s: State = {
    layer,
    visited: new Set(entry),
    candidates: [...entry],
    results: [...entry],
    rejected: new Set(),
  };
  const farthest = () => s.results.reduce((a, b) => (dist(a) >= dist(b) ? a : b));

  push(
    layer > 0
      ? `Phase 1 — greedy descent on layer ${layer} with ef = 1. Start at the entry point ${entry[0]} (d = ${dist(entry[0])}). With a beam of 1 this is a plain "walk downhill" over the express lane.`
      : `Phase 2 — beam search on layer 0 with ef = ${ef}, entering at ${entry[0]} (d = ${dist(entry[0])}), the best node the descent found. Layer 0 holds every point, so this is where the fine-grained search happens.`,
    ln("visited    = set(entry)"),
    ...snapshot(s)
  );

  while (s.candidates.length > 0) {
    const c = s.candidates.reduce((a, b) => (dist(a) <= dist(b) ? a : b));
    s.candidates = s.candidates.filter((x) => x !== c);
    s.current = c;
    const f = farthest();

    if (dist(c) > dist(f)) {
      push(
        `Nearest unexplored candidate is ${c} (d = ${dist(c)}), which is already farther than the worst result ${f} (d = ${dist(f)}). No node reachable through ${c} can improve the answer, so break. This early exit is what keeps HNSW sub-linear — the other half of the graph is never touched.`,
        ln("break "),
        ...snapshot(s)
      );
      s.current = undefined;
      break;
    }

    push(
      `Pop the nearest candidate: ${c} (d = ${dist(c)}). It is no farther than the current worst result (${f}, d = ${dist(f)}), so it is worth expanding — check its neighbours on layer ${layer}.`,
      [...ln("c = candidates.pop_nearest()"), ...ln("if dist(c, q) > dist(results.farthest")],
      ...snapshot(s)
    );

    for (const e of neighbours(c, layer)) {
      if (s.visited.has(e)) continue;
      s.visited.add(e);
      const worst = farthest();
      const accept = dist(e) < dist(worst) || s.results.length < ef;

      if (accept) {
        s.candidates.push(e);
        s.results.push(e);
        let evicted: number | undefined;
        if (s.results.length > ef) {
          evicted = farthest();
          s.results = s.results.filter((x) => x !== evicted);
          s.rejected.add(evicted);
        }
        push(
          `Neighbour ${e} (d = ${dist(e)}): ${
            dist(e) < dist(worst)
              ? `closer than the worst result ${worst} (d = ${dist(worst)})`
              : `the result set is not yet full (${s.results.length - 1} < ef = ${ef})`
          }, so keep it — push to both the frontier and the results.${
            evicted !== undefined ? ` The set now exceeds ef, so the farthest result ${evicted} (d = ${dist(evicted)}) is evicted.` : ""
          }`,
          [...ln("candidates.push(e)"), ...ln("results.pop_farthest()")],
          ...snapshot(s)
        );
      } else {
        s.rejected.add(e);
        push(
          `Neighbour ${e} (d = ${dist(e)}) is farther than the worst result ${worst} (d = ${dist(worst)}) and the result set is already full at ef = ${ef}. Discard it — and note we never expand it, so its side of the graph stays unexplored.`,
          ln("if dist(e, q) < dist(worst"),
          ...snapshot(s)
        );
      }
    }
    s.current = undefined;
  }

  s.current = undefined;
  return { results: [...s.results].sort((a, b) => dist(a) - dist(b)), visited: s.visited };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  const introState: State = {
    layer: 0,
    visited: new Set(),
    candidates: [],
    results: [],
    rejected: new Set(),
  };
  push(
    `Eight points on a line at ${POINTS.join(", ")} — so "distance" is just |p − q|. Layer 1 is the express lane holding only {0, 24, 48}; layer 0 holds every point chained to its immediate neighbours. The query is q = ${QUERY}, whose true nearest neighbour is 32.`,
    ln("def search(q, k, ef_search)"),
    graphPanel(introState),
    distPanel(introState),
    {
      t: "note",
      text: "The hierarchy is a skip list for geometry: the sparse top layer teleports you near the answer in one look, the dense bottom layer refines it.",
    }
  );

  // Phase 1 — greedy descent over the express lane (ef = 1).
  const descent = searchLayer([ENTRY], 1, 1, push);
  const ep = descent.results;

  push(
    `Layer 1 is exhausted: no neighbour of ${ep[0]} was closer to q than ${ep[0]} itself, so the greedy walk stops here and ${ep[0]} becomes the entry point for the layer below. One look at the express lane skipped most of the line.`,
    ln("ep = search_layer(q, {ep}, ef=1, layer)"),
    graphPanel({
      layer: 1,
      visited: descent.visited,
      candidates: [],
      results: ep,
      current: ep[0],
      rejected: new Set([...descent.visited].filter((p) => !ep.includes(p))),
    }),
    { t: "note", text: `Descend with ep = ${ep[0]}.`, cls: "good" }
  );

  // Phase 2 — beam search on the base layer.
  const beam = searchLayer(ep, EF_SEARCH, 0, push);
  const W = beam.results;
  const best = W[0];

  const finalState: State = {
    layer: 0,
    visited: beam.visited,
    candidates: [],
    results: W,
    rejected: new Set(),
  };
  push(
    `Return the nearest k = 1 of the beam: ${best}, which is the true nearest neighbour of q = ${QUERY}. Layer 0 touched ${finalState.visited.size} of ${POINTS.length} nodes and never looked at ${POINTS.filter((p) => !finalState.visited.has(p)).join(", ")}. At corpus scale that ratio is what turns O(N) into roughly O(log N).`,
    ln("return nearest(W, k)"),
    graphPanel({ ...finalState, current: best }),
    distPanel({ ...finalState, current: best }),
    {
      t: "table",
      label: "returned beam",
      head: ["rank", "point", "|p − q|"],
      v: W.map((p, i) => ({
        cells: [String(i + 1), String(p), String(dist(p))],
        cls: i === 0 ? "good" : "dim",
      })),
    },
    {
      t: "note",
      text: "HNSW is approximate: nothing here guarantees the true nearest neighbour was found. Greedy graph search can stall in a local minimum — widening ef is the knob that buys recall back, at the cost of latency.",
      cls: "warn",
    }
  );

  return {
    id: "hnsw-search",
    title: "HNSW search — greedy descent, then a width-ef beam",
    caption:
      "The full SEARCH procedure on a two-layer index over eight points on a line, querying q = 34. Phase 1 walks the sparse express lane with a beam of 1 and stops as soon as no neighbour improves; phase 2 runs the real SEARCH-LAYER beam on layer 0, maintaining a frontier and an ef-capped result set. Watch for the break at the end: once the nearest unexplored candidate is farther than the worst kept result, search stops — that early exit is the whole reason HNSW is sub-linear.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const hnswTrace = build();
