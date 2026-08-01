import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * DBSCAN on the 9-point example from `src/content/wiki/dbscan-algorithm.mdx`
 * (two tight blobs plus one isolated point), at ε = 2, min_samples = 3.
 *
 * The payoff re-runs at ε = 5, where the isolated point becomes core and
 * *bridges* the two blobs into a single cluster — the clearest possible
 * demonstration that ε is not a cosmetic knob.
 */

const CODE = codeLines(`
def dbscan(X, eps, min_samples):
    labels = [UNVISITED] * len(X)
    c = 0
    for p in range(len(X)):
        if labels[p] != UNVISITED:
            continue
        N = neighbours(p, eps)     # includes p
        if len(N) < min_samples:
            labels[p] = NOISE      # may be revised
            continue
        labels[p] = c              # new cluster
        queue = list(N - {p})
        while queue:               # expand
            q = queue.pop(0)
            if labels[q] == NOISE:
                labels[q] = c      # -> border
            if labels[q] != UNVISITED:
                continue
            labels[q] = c
            Nq = neighbours(q, eps)
            if len(Nq) >= min_samples:
                queue += list(Nq)  # q is core
        c += 1
    return labels
`);

const ln = lineFinder(CODE);

type Pt = { id: string; x: number; y: number };

const POINTS: Pt[] = [
  { id: "A", x: 1, y: 1 },
  { id: "B", x: 1, y: 2 },
  { id: "C", x: 2, y: 1 },
  { id: "D", x: 2, y: 2 },
  { id: "E", x: 8, y: 8 },
  { id: "F", x: 8, y: 9 },
  { id: "G", x: 9, y: 8 },
  { id: "H", x: 9, y: 9 },
  { id: "I", x: 5, y: 5 },
];

const MIN_SAMPLES = 3;
const DOMAIN: [number, number, number, number] = [0, 10, 0, 10];
const CLUSTER_CLS: TraceCls[] = ["active", "good"];

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const neighbours = (i: number, eps: number) =>
  POINTS.map((_, j) => j).filter((j) => dist(POINTS[i], POINTS[j]) <= eps);

const NOISE = -1;
const UNVISITED = -2;

const clsOf = (label: number, active: boolean): TraceCls | undefined => {
  if (active) return "warn";
  if (label === NOISE) return "bad";
  if (label === UNVISITED) return undefined;
  return CLUSTER_CLS[label % CLUSTER_CLS.length];
};

function plotPanel(
  label: string,
  labels: number[],
  eps: number,
  opts: { active?: number; radius?: number[] } = {}
): TraceComponent {
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    circles: (opts.radius ?? []).map((i) => ({ x: POINTS[i].x, y: POINTS[i].y, r: eps, cls: "warn" as TraceCls })),
    points: POINTS.map((p, i) => ({
      x: p.x,
      y: p.y,
      id: p.id,
      cls: clsOf(labels[i], opts.active === i),
      shape: (opts.active === i ? "ring" : "dot") as "ring" | "dot",
    })),
  };
}

function labelPanel(labels: number[]): TraceComponent {
  return {
    t: "kv",
    label: "labels",
    v: POINTS.map((p, i) => ({
      k: p.id,
      v: labels[i] === UNVISITED ? "?" : labels[i] === NOISE ? "noise" : `C${labels[i]}`,
      cls: clsOf(labels[i], false) ?? "dim",
    })),
  };
}

/** Run DBSCAN, optionally recording a frame at each decision. */
function dbscan(
  eps: number,
  push?: (d: string, l: number[], ...c: TraceComponent[]) => void
): number[] {
  const labels = POINTS.map(() => UNVISITED);
  let c = 0;

  for (let p = 0; p < POINTS.length; p++) {
    if (labels[p] !== UNVISITED) continue;
    const N = neighbours(p, eps);

    if (N.length < MIN_SAMPLES) {
      labels[p] = NOISE;
      push?.(
        `${POINTS[p].id}: only ${N.length} point${N.length === 1 ? "" : "s"} within ε = ${eps} (itself included), which is below min_samples = ${MIN_SAMPLES}. Label it noise — provisionally, since a later expansion could still absorb it as a border point.`,
        ln("labels[p] = NOISE"),
        plotPanel(`visiting ${POINTS[p].id}`, labels, eps, { active: p, radius: [p] }),
        labelPanel(labels)
      );
      continue;
    }

    labels[p] = c;
    push?.(
      `${POINTS[p].id}: ${N.length} points within ε = ${eps} (${N.map((j) => POINTS[j].id).join(", ")}) ≥ min_samples = ${MIN_SAMPLES}, so ${POINTS[p].id} is a **core** point. Open cluster C${c} and queue its neighbours.`,
      ln("labels[p] = c "),
      plotPanel(`${POINTS[p].id} is core — open C${c}`, labels, eps, { active: p, radius: [p] }),
      labelPanel(labels),
      {
        t: "note",
        text: `min_samples counts the point itself: with min_samples = ${MIN_SAMPLES} a core point needs ${MIN_SAMPLES - 1} *other* neighbours, not ${MIN_SAMPLES}.`,
      }
    );

    const queue = N.filter((j) => j !== p);
    while (queue.length > 0) {
      const q = queue.shift()!;
      if (labels[q] === NOISE) labels[q] = c;
      if (labels[q] !== UNVISITED) continue;
      labels[q] = c;
      const Nq = neighbours(q, eps);
      const isCore = Nq.length >= MIN_SAMPLES;
      const fresh = Nq.filter((j) => labels[j] === UNVISITED);
      if (isCore) queue.push(...Nq);

      push?.(
        isCore
          ? `Expand to ${POINTS[q].id}: it joins C${c}, and with ${Nq.length} neighbours it is core too, so its neighbourhood is queued as well. ${
              fresh.length
                ? `That pulls in ${fresh.map((j) => POINTS[j].id).join(", ")}.`
                : "Every one of them is already in the cluster, so the frontier does not grow."
            }`
          : `Expand to ${POINTS[q].id}: it joins C${c}, but with only ${Nq.length} neighbours it is not core — it is a **border** point, so the cluster does not grow through it.`,
        isCore ? ln("queue += list(Nq)") : ln("if len(Nq) >= min_samples"),
        plotPanel(`expanding C${c}`, labels, eps, { active: q, radius: [q] }),
        labelPanel(labels)
      );
    }

    push?.(
      `C${c} is closed — the queue is empty, so no point outside it is density-reachable. Members: ${POINTS.filter(
        (_, i) => labels[i] === c
      )
        .map((p2) => p2.id)
        .join(", ")}.`,
      ln("c += 1"),
      plotPanel(`cluster C${c} complete`, labels, eps),
      labelPanel(labels)
    );
    c += 1;
  }
  return labels;
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const EPS = 2;

  push(
    `Nine points: two tight 4-point blobs and one isolated point I. With ε = ${EPS} and min_samples = ${MIN_SAMPLES}, DBSCAN never needs to be told how many clusters to find — density decides.`,
    ln("def dbscan(X, eps, min_samples)"),
    plotPanel("the dataset", POINTS.map(() => UNVISITED), EPS),
    {
      t: "note",
      text: "Within a blob the largest distance is √2 ≈ 1.41 < ε. The nearest cross-blob distance is √18 ≈ 4.24 > ε. So ε = 2 sees the blobs but not the gaps.",
    }
  );

  const labels = dbscan(EPS, push);

  push(
    `Done: two clusters and one outlier, with K never specified. I is labelled noise (−1) because no core point can reach it — DBSCAN's ability to simply *refuse* to cluster a point is what K-Means lacks.`,
    ln("return labels"),
    plotPanel(`final labels at ε = ${EPS}`, labels, EPS),
    {
      t: "table",
      label: "result",
      head: ["cluster", "members"],
      v: [
        { cells: ["C0", POINTS.filter((_, i) => labels[i] === 0).map((p) => p.id).join(", ")], cls: "active" },
        { cells: ["C1", POINTS.filter((_, i) => labels[i] === 1).map((p) => p.id).join(", ")], cls: "good" },
        { cells: ["noise", POINTS.filter((_, i) => labels[i] === NOISE).map((p) => p.id).join(", ")], cls: "bad" },
      ],
    }
  );

  // ---- payoff: the same data at a larger ε --------------------------------
  const BIG_EPS = 5;
  const bigLabels = dbscan(BIG_EPS);
  const nClusters = new Set(bigLabels.filter((l) => l >= 0)).size;

  push(
    `Now raise ε from ${EPS} to ${BIG_EPS} and change nothing else. I now has ${neighbours(8, BIG_EPS).length} neighbours, so it is promoted from noise to *core* — and being core, it is a bridge: the expansion walks straight through it from one blob to the other. ${nClusters} cluster${nClusters === 1 ? "" : "s"} now, no noise at all.`,
    ln("if len(N) < min_samples"),
    plotPanel(`ε = ${BIG_EPS} — one cluster, no noise`, bigLabels, BIG_EPS, { radius: [8] }),
    labelPanel(bigLabels),
    {
      t: "note",
      text: "A single outlier turning core is enough to merge everything. That is the real risk of ε being slightly too large — not a few misplaced points, but whole clusters chaining together.",
      cls: "warn",
    }
  );

  return {
    id: "dbscan-clustering",
    title: "DBSCAN — core points, expansion, and the ε that merges everything",
    caption:
      "The full visit/expand loop on nine points at ε = 2, min_samples = 3: each point's ε-neighbourhood is drawn as you visit it, core points open and grow clusters, and the isolated point is refused a cluster entirely. The final step re-runs the same code at ε = 5, where that outlier becomes core and chains the two blobs into one cluster — the chaining failure mode, shown rather than described.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const dbscanTrace = build();
