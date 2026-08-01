import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Agglomerative clustering on the 4-point example from
 * `src/content/wiki/hierarchical-clustering.mdx` — A(1,1), B(2,2), C(8,8),
 * D(9,9) — where all three linkages agree on structure and differ only in
 * merge height.
 *
 * The payoff adds a single bridge point between the two blobs. Single linkage
 * chains through it and returns a completely different 2-cluster split from
 * complete linkage: the same data, the same code, one line changed.
 */

const CODE = codeLines(`
def agglomerate(points, linkage):
    clusters = [[i] for i in range(len(points))]
    merges = []
    while len(clusters) > 1:
        best = None
        for a, b in pairs(clusters):
            d = linkage(a, b)      # <- the only
            if best is None or d < best.d:
                best = (a, b, d)   #    difference
        a, b, d = best
        merges.append((a, b, d))
        clusters = [c for c in clusters
                    if c is not a and c is not b]
        clusters.append(a + b)
    return merges

single   = lambda a, b: min(dist(i, j) for i in a for j in b)
complete = lambda a, b: max(dist(i, j) for i in a for j in b)
average  = lambda a, b: mean(dist(i, j) for i in a for j in b)
`);

const ln = lineFinder(CODE);

type Pt = { id: string; x: number; y: number };

const POINTS: Pt[] = [
  { id: "A", x: 1, y: 1 },
  { id: "B", x: 2, y: 2 },
  { id: "C", x: 8, y: 8 },
  { id: "D", x: 9, y: 9 },
];

/** The payoff dataset: the same two blobs with one bridge point between them. */
const BRIDGED: Pt[] = [
  { id: "A", x: 1, y: 1 },
  { id: "B", x: 2, y: 2 },
  { id: "M", x: 5, y: 5 },
  { id: "C", x: 8, y: 8 },
  { id: "D", x: 9, y: 9 },
];

const DOMAIN: [number, number, number, number] = [0, 10, 0, 10];
const fmt = (x: number, d = 2) => x.toFixed(d);

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

type Linkage = "single" | "complete" | "average";

function linkageDist(pts: Pt[], a: number[], b: number[], kind: Linkage): number {
  const ds = a.flatMap((i) => b.map((j) => dist(pts[i], pts[j])));
  if (kind === "single") return Math.min(...ds);
  if (kind === "complete") return Math.max(...ds);
  return ds.reduce((s, d) => s + d, 0) / ds.length;
}

interface Merge {
  a: number[];
  b: number[];
  d: number;
}

/**
 * Agglomerative clustering; records a frame per merge when `push` is supplied.
 * Returns the merge sequence and the cluster state at k = 2.
 */
function agglomerate(
  pts: Pt[],
  kind: Linkage,
  push?: (d: string, l: number[], ...c: TraceComponent[]) => void
) {
  let clusters = pts.map((_, i) => [i]);
  const merges: Merge[] = [];
  let atTwo: number[][] = [];
  let step = 0;

  while (clusters.length > 1) {
    let best: { i: number; j: number; d: number } | null = null;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = linkageDist(pts, clusters[i], clusters[j], kind);
        if (!best || d < best.d - 1e-12) best = { i, j, d };
      }
    }
    const { i, j, d } = best!;
    const a = clusters[i];
    const b = clusters[j];

    push?.(
      `Merge ${step + 1}: the closest pair is {${names(pts, a)}} and {${names(pts, b)}} at distance ${fmt(d)}. ${
        a.length === 1 && b.length === 1
          ? "Both are still singletons, so min, max and mean over their cross pairs are the same number — every linkage rule agrees on this merge."
          : "Both clusters now have more than one member, so there are several cross-pair distances to reduce to one. This is where the linkage rule finally matters."
      }`,
      [...ln("d = linkage(a, b)"), ...ln("merges.append((a, b, d))")],
      scatter(pts, `merge ${step + 1} at height ${fmt(d)}`, clusters, { a, b }),
      distanceMatrix(pts),
      {
        t: "kv",
        label: "clusters before this merge",
        v: clusters.map((c) => ({
          k: `{${names(pts, c)}}`,
          cls: (c === a || c === b ? "warn" : "dim") as TraceCls,
        })),
      }
    );

    merges.push({ a, b, d });
    clusters = clusters.filter((_, k) => k !== i && k !== j);
    clusters.push([...a, ...b]);
    if (clusters.length === 2) atTwo = clusters.map((c) => [...c]);
    step += 1;
  }
  return { merges, atTwo };
}

const names = (pts: Pt[], c: number[]) => c.map((i) => pts[i].id).join("");

function scatter(
  pts: Pt[],
  label: string,
  clusters: number[][],
  linking?: { a: number[]; b: number[] }
): TraceComponent {
  const CLS: TraceCls[] = ["active", "good", "warn", "bad"];
  const clsOf = (i: number) => {
    const k = clusters.findIndex((c) => c.includes(i));
    return k >= 0 && clusters.length > 1 ? CLS[k % CLS.length] : "dim";
  };
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    segments: linking
      ? linking.a.flatMap((i) =>
          linking.b.map((j) => ({
            x1: pts[i].x,
            y1: pts[i].y,
            x2: pts[j].x,
            y2: pts[j].y,
            cls: "warn" as TraceCls,
            dashed: true,
          }))
        )
      : undefined,
    points: pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id, cls: clsOf(i), shape: "dot" as const })),
  };
}

function distanceMatrix(pts: Pt[]): TraceComponent {
  return {
    t: "matrix",
    label: "pairwise distances",
    rows: pts.map((p) => p.id),
    cols: pts.map((p) => p.id),
    v: pts.map((a) => pts.map((b) => dist(a, b))),
    digits: 2,
    heat: true,
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    "Four points in two obvious blobs: A(1,1), B(2,2) and C(8,8), D(9,9). Agglomerative clustering starts with every point alone and repeatedly merges the closest pair of clusters. The only thing that varies between methods is how \"closest\" is defined once a cluster has more than one member.",
    ln("clusters = [[i] for i in range(len(points))]"),
    scatter(POINTS, "the dataset", []),
    distanceMatrix(POINTS)
  );

  // ---- the main run, under single linkage --------------------------------
  agglomerate(POINTS, "single", push);

  // ---- the three linkages side by side ------------------------------------
  const results = (["single", "complete", "average"] as Linkage[]).map((kind) => ({
    kind,
    ...agglomerate(POINTS, kind),
  }));

  push(
    `Run all three linkages on this data and they produce **identical cluster structure** — {A,B} and {C,D} — differing only in the height of the final merge: single ${fmt(
      results[0].merges[2].d
    )} (nearest cross pair, B–C), complete ${fmt(results[1].merges[2].d)} (farthest, A–D), average ${fmt(results[2].merges[2].d)}. When blobs are this well separated the choice of linkage is cosmetic, and only changes where you would cut the dendrogram.`,
    ln("single   = lambda a, b: min("),
    scatter(POINTS, "all three linkages agree", results[0].atTwo),
    {
      t: "table",
      label: "final merge height by linkage",
      head: ["linkage", "rule", "height"],
      v: [
        { cells: ["single", "min cross pair", fmt(results[0].merges[2].d)], cls: "good" },
        { cells: ["complete", "max cross pair", fmt(results[1].merges[2].d)], cls: "active" },
        { cells: ["average", "mean cross pair", fmt(results[2].merges[2].d)], cls: "warn" },
      ],
    }
  );

  // ---- payoff: one bridge point splits the linkages apart -----------------
  const bSingle = agglomerate(BRIDGED, "single");
  const bComplete = agglomerate(BRIDGED, "complete");
  const singleGroups = bSingle.atTwo.map((c) => names(BRIDGED, c)).sort();
  const completeGroups = bComplete.atTwo.map((c) => names(BRIDGED, c)).sort();

  push(
    `Now add one point M(5,5) exactly between the blobs, and cut at k = 2. Single linkage returns {${singleGroups.join(
      "} and {"
    )}}; complete linkage returns {${completeGroups.join(
      "} and {"
    )}}. Single linkage judges clusters by their *nearest* members, so M is close enough to bridge — and once bridged, the chain keeps growing. Complete linkage judges by the *farthest* members, so absorbing M costs whichever cluster takes it, and the two blobs stay apart. One line of the algorithm changed, and the answer changed with it.`,
    ln("complete = lambda a, b: max("),
    scatter(BRIDGED, `single linkage at k = 2 — chained through M`, bSingle.atTwo),
    scatter(BRIDGED, `complete linkage at k = 2`, bComplete.atTwo),
    {
      t: "note",
      text: "This is single linkage's chaining failure: one bridge point between two distant groups pulls them together early. It is also single linkage's superpower — it is the only one of the four that can follow an elongated, non-convex cluster shape.",
      cls: "warn",
    }
  );

  return {
    id: "hierarchical-linkage",
    title: "Agglomerative clustering — and the linkage rule that changes the answer",
    caption:
      "Merge-by-merge agglomerative clustering on four points, where all three linkage rules agree on structure and differ only in merge height — which is the case the worked example above covers. The final step adds a single bridge point between the blobs, and single and complete linkage now return genuinely different clusters at k = 2. That is chaining: the reason single linkage can trace an elongated cluster and the reason it can also destroy a good one.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const hierarchicalTrace = build();
