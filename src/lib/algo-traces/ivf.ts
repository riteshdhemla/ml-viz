import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, gaussian, lineFinder, seededRng } from "./util";

/**
 * IVF (inverted file) search from `wiki/vector-databases.mdx`, run on 600
 * two-dimensional vectors so the cell geometry is visible.
 *
 * The page asserts that `nprobe = 1` "misses neighbours that fall just across a
 * cell boundary". This trace measures that claim rather than repeating it, and
 * the measurement is the reason the trace exists: recall at `nprobe = 1` is not
 * a property of the index, it is a property of *where the query landed*. Split
 * 400 random queries by how close their two nearest centroids are, and recall
 * at `nprobe = 1` runs from near-perfect for queries deep inside a cell down to
 * far worse for queries sitting on a boundary — while `nprobe = 3` flattens the
 * difference out. That is the whole reason the knob exists.
 *
 * The walkthrough query is *not* hand-placed: it is the first query in the
 * seeded evaluation set that `nprobe = 1` gets wrong, and the frame says what
 * fraction of the set shares its fate.
 *
 * Companion to the existing `hnsw-search` trace — same problem, and the
 * contrast is the point. IVF pays a fixed k-means build and then scans a
 * *fraction* of the corpus; HNSW builds a graph and touches a *logarithmic*
 * number of nodes.
 */

const CODE = codeLines(`
def ivf_search(q, k, nprobe):

    # 1. coarse quantizer: rank the cells
    d = [dist(q, c) for c in centroids]
    cells = argsort(d)[:nprobe]

    # 2. scan only the probed cells
    cand = []
    for c in cells:
        cand += inverted_list[c]

    # 3. exact distances on candidates
    scored = [(dist(q,x), x) for x in cand]
    return sorted(scored)[:k]
`);

const ln = lineFinder(CODE);

/* ------------------------------------------------------------------ corpus */

const N = 600;
const NLIST = 16;
const TOPK = 5;
const SEED = 7;
const N_QUERIES = 400;

type Vec = [number, number];

const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Embeddings are clustered, not uniform — so the cells are too. */
function makeCorpus(): Vec[] {
  const rng = seededRng(SEED);
  const blobs: { c: Vec; sd: number; n: number }[] = [
    { c: [-1.6, 1.2], sd: 0.55, n: 110 },
    { c: [1.5, 1.5], sd: 0.7, n: 130 },
    { c: [0.1, -0.3], sd: 0.85, n: 150 },
    { c: [-1.9, -1.5], sd: 0.6, n: 100 },
    { c: [1.9, -1.4], sd: 0.5, n: 110 },
  ];
  const pts: Vec[] = [];
  for (const b of blobs) {
    for (let i = 0; i < b.n && pts.length < N; i++) {
      pts.push([gaussian(rng, b.c[0], b.sd), gaussian(rng, b.c[1], b.sd)]);
    }
  }
  while (pts.length < N) pts.push([gaussian(rng, 0, 1.6), gaussian(rng, 0, 1.6)]);
  return pts;
}

/** Lloyd's algorithm with k-means++ seeding — the coarse quantizer. */
function kmeans(pts: Vec[], k: number, seed: number) {
  const rng = seededRng(seed);
  const centroids: Vec[] = [pts[Math.floor(rng() * pts.length)]];
  while (centroids.length < k) {
    const d2 = pts.map((p) => Math.min(...centroids.map((c) => dist(p, c) ** 2)));
    const total = d2.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = 0;
    while (idx < pts.length - 1 && (r -= d2[idx]) > 0) idx += 1;
    centroids.push(pts[idx]);
  }
  let assign = new Array<number>(pts.length).fill(0);
  for (let it = 0; it < 40; it++) {
    let moved = false;
    assign = pts.map((p) => {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist(p, centroids[c]);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      return best;
    });
    for (let c = 0; c < k; c++) {
      const members = pts.filter((_, i) => assign[i] === c);
      if (members.length === 0) continue;
      const nx = members.reduce((s, p) => s + p[0], 0) / members.length;
      const ny = members.reduce((s, p) => s + p[1], 0) / members.length;
      if (Math.abs(nx - centroids[c][0]) + Math.abs(ny - centroids[c][1]) > 1e-9) moved = true;
      centroids[c] = [nx, ny];
    }
    if (!moved) break;
  }
  const lists: number[][] = Array.from({ length: k }, () => []);
  assign.forEach((c, i) => lists[c].push(i));
  return { centroids, assign, lists };
}

const CORPUS = makeCorpus();
const { centroids: CENTROIDS, assign: ASSIGN, lists: LISTS } = kmeans(CORPUS, NLIST, SEED * 31);

/** Rank cells by distance from the query — step 1 of the algorithm. */
const rankCells = (q: Vec) =>
  CENTROIDS.map((c, i) => ({ i, d: dist(q, c) })).sort((a, b) => a.d - b.d);

function ivfSearch(q: Vec, nprobe: number) {
  const cells = rankCells(q).slice(0, nprobe).map((c) => c.i);
  const cand: number[] = [];
  for (const c of cells) cand.push(...LISTS[c]);
  const scored = cand.map((i) => ({ i, d: dist(q, CORPUS[i]) })).sort((a, b) => a.d - b.d);
  return { cells, nCand: cand.length, top: scored.slice(0, TOPK).map((s) => s.i) };
}

const exactTop = (q: Vec) =>
  CORPUS.map((p, i) => ({ i, d: dist(q, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, TOPK)
    .map((s) => s.i);

const recallOf = (got: number[], truth: number[]) =>
  truth.filter((t) => got.includes(t)).length / truth.length;

/** How close is the query to a cell boundary? 1.0 = equidistant from two cells. */
const boundaryness = (q: Vec) => {
  const r = rankCells(q);
  return r[0].d / r[1].d;
};

const QUERIES: Vec[] = (() => {
  const rng = seededRng(SEED * 977);
  return Array.from({ length: N_QUERIES }, () => [gaussian(rng, 0, 1.5), gaussian(rng, 0, 1.5)] as Vec);
})();

const fmt = (x: number, d = 2) => x.toFixed(d);
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

/* ------------------------------------------------------------------ panels */

const DOMAIN: [number, number, number, number] = [-4.2, 4.2, -3.6, 3.6];

function scene(
  label: string,
  opts: {
    q?: Vec;
    scanned?: Set<number>;
    found?: number[];
    missed?: number[];
    probedCells?: number[];
  } = {}
): TraceComponent {
  const { q, scanned, found = [], missed = [], probedCells } = opts;
  const foundSet = new Set(found);
  const missedSet = new Set(missed);
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    xLabel: "dim 0",
    yLabel: "dim 1",
    points: [
      ...CORPUS.map((p, i) => ({
        x: p[0],
        y: p[1],
        cls: (missedSet.has(i)
          ? "bad"
          : foundSet.has(i)
            ? "good"
            : scanned?.has(i)
              ? "warn"
              : "dim") as TraceCls,
      })),
      ...CENTROIDS.map((c, i) => ({
        x: c[0],
        y: c[1],
        id: `c${i}`,
        cls: (probedCells?.includes(i) ? "active" : "dim") as TraceCls,
        shape: "ring" as const,
      })),
      ...(q ? [{ x: q[0], y: q[1], id: "q", cls: "active" as TraceCls, shape: "cross" as const }] : []),
    ],
  };
}

const scannedSet = (cells: number[]) => {
  const s = new Set<number>();
  for (const c of cells) for (const i of LISTS[c]) s.add(i);
  return s;
};

/* ------------------------------------------------------------------- build */

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  // Pick the walkthrough query honestly rather than hand-placing one: the first
  // evaluation query whose true *nearest* neighbour nprobe = 1 fails to return,
  // with both miss rates reported so the example is not passed off as typical.
  const missAny = QUERIES.filter((qq) => recallOf(ivfSearch(qq, 1).top, exactTop(qq)) < 1);
  const missTop1 = QUERIES.filter((qq) => !ivfSearch(qq, 1).top.includes(exactTop(qq)[0]));
  const q = missTop1[0];
  const truth = exactTop(q);
  const trueNN = truth[0];
  const ordinal = (n: number) =>
    n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  // ---- 1. the index ---------------------------------------------------------
  const sizes = LISTS.map((l) => l.length);
  push(
    `The index, built once: k-means partitions all ${N} vectors into ${NLIST} cells, and each cell keeps an inverted list of the vector ids that fell in it. Cells hold ${Math.min(
      ...sizes
    )}–${Math.max(...sizes)} vectors (mean ${fmt(
      N / NLIST,
      0
    )}) — k-means balances by geometry, not by count, so a dense region gets small tight cells and a sparse one gets a large loose cell. Nothing here depends on the query; this cost is paid at build time.`,
    ln("def ivf_search(q, k, nprobe)"),
    scene(`${N} vectors, ${NLIST} k-means cells (rings = centroids)`),
    {
      t: "kv",
      label: "index",
      v: [
        { k: "N", v: String(N) },
        { k: "nlist", v: String(NLIST) },
        { k: "smallest cell", v: String(Math.min(...sizes)) },
        { k: "largest cell", v: String(Math.max(...sizes)) },
      ],
    }
  );

  // ---- 2. the coarse quantizer ---------------------------------------------
  const ranked = rankCells(q);
  push(
    `A query arrives. Step 1 compares it against the ${NLIST} **centroids**, not the ${N} vectors — that is what "coarse quantizer" means, and it is where the speedup comes from. Cell ${
      ranked[0].i
    } is nearest at ${fmt(ranked[0].d)}, but look at the runner-up: cell ${ranked[1].i} is only ${fmt(
      ranked[1].d
    )} away. This query is sitting almost exactly on the boundary between them (ratio ${fmt(
      boundaryness(q)
    )}), and that fact is about to cost it.`,
    ln("d = [dist(q, c) for c in centroids]"),
    scene("query (cross) against the centroids", { q }),
    {
      t: "bars",
      label: "distance from query to each centroid (nearest 6)",
      v: ranked.slice(0, 6).map((r, j) => ({
        k: `cell ${r.i}`,
        val: r.d,
        show: fmt(r.d),
        cls: (j === 0 ? "active" : j === 1 ? "warn" : "dim") as TraceCls,
      })),
    }
  );

  // ---- 3. probe one cell ----------------------------------------------------
  const r1 = ivfSearch(q, 1);
  const scanned1 = scannedSet(r1.cells);
  push(
    `With \`nprobe = 1\`, only cell ${r1.cells[0]}'s inverted list is scanned: ${
      r1.nCand
    } candidates instead of ${N}. Counting the ${NLIST} centroid comparisons it took to choose that cell, the query costs ${
      r1.nCand + NLIST
    } distance computations against exact search's ${N} — ${fmt(
      N / (r1.nCand + NLIST),
      1
    )}×. Everything dim on the plot is never touched: the index does not rank those vectors lower, it never computes their distance at all.`,
    ln("cells = argsort(d)[:nprobe]"),
    scene(`nprobe = 1 — only cell ${r1.cells[0]} is scanned`, {
      q,
      scanned: scanned1,
      probedCells: r1.cells,
    }),
    {
      t: "kv",
      label: "work done",
      v: [
        { k: "centroid distances", v: String(NLIST) },
        { k: "vector distances", v: String(r1.nCand), cls: "warn" },
        { k: "exact search would", v: String(N), cls: "dim" },
        { k: "speedup", v: `${fmt(N / (r1.nCand + NLIST), 1)}×`, cls: "good" },
      ],
    }
  );

  // ---- 4. the miss ----------------------------------------------------------
  const rec1 = recallOf(r1.top, truth);
  const missed1 = truth.filter((t) => !r1.top.includes(t));
  const nnCell = ASSIGN[trueNN];
  const nnRank = ranked.findIndex((r) => r.i === nnCell);
  push(
    `Now compare against exact search. Recall@${TOPK} is ${pct(rec1)} — ${
      missed1.length
    } of the true top ${TOPK} were never scored, and the casualty list starts at the top: the **true nearest neighbour** sits at distance ${fmt(
      dist(q, CORPUS[trueNN])
    )} and lives in cell ${nnCell}, the ${ordinal(
      nnRank + 1
    )}-ranked cell, so its list was never opened. Nothing was ranked badly — the vector was never a candidate to rank. **The centroid distance is a proxy for the vector distance, and near a boundary the proxy is wrong.** Across the ${N_QUERIES} evaluation queries, ${pct(
      missAny.length / N_QUERIES
    )} lose at least one true neighbour at nprobe = 1 and ${pct(
      missTop1.length / N_QUERIES
    )} lose the nearest one outright; this is the first query of that second group, not a hand-picked one.`,
    ln("return sorted(scored)[:k]"),
    scene("green = true top-5 found, red = true top-5 missed entirely", {
      q,
      scanned: scanned1,
      found: truth.filter((t) => r1.top.includes(t)),
      missed: missed1,
      probedCells: r1.cells,
    }),
    {
      t: "table",
      label: `true top-${TOPK} by exact search`,
      head: ["rank", "distance", "in cell", "cell rank", "scanned?"],
      v: truth.map((t, j) => ({
        cells: [
          `#${j + 1}`,
          fmt(dist(q, CORPUS[t])),
          String(ASSIGN[t]),
          String(ranked.findIndex((r) => r.i === ASSIGN[t]) + 1),
          r1.top.includes(t) ? "yes" : "no",
        ],
        cls: (r1.top.includes(t) ? "good" : "bad") as TraceCls,
      })),
    }
  );

  // ---- 5. probe three -------------------------------------------------------
  const r3 = ivfSearch(q, 3);
  const rec3 = recallOf(r3.top, truth);
  push(
    `Raise \`nprobe\` to 3 and the neighbouring cells come into scope. Candidates go ${
      r1.nCand
    } → ${r3.nCand} and recall goes ${pct(rec1)} → ${pct(
      rec3
    )}. That is the entire trade the knob controls: **more cells probed, more boundary neighbours caught, more distances computed**, along a curve with no free lunch and no cliff.`,
    ln("cand += inverted_list[c]"),
    scene(`nprobe = 3 — cells ${r3.cells.join(", ")}`, {
      q,
      scanned: scannedSet(r3.cells),
      found: truth.filter((t) => r3.top.includes(t)),
      missed: truth.filter((t) => !r3.top.includes(t)),
      probedCells: r3.cells,
    }),
    {
      t: "kv",
      label: "nprobe 1 → 3",
      v: [
        { k: "candidates", v: `${r1.nCand} → ${r3.nCand}`, cls: "warn" },
        { k: `recall@${TOPK}`, v: `${pct(rec1)} → ${pct(rec3)}`, cls: "good" },
        { k: "still exact?", v: rec3 === 1 ? "yes" : "no", cls: rec3 === 1 ? "good" : "warn" },
      ],
    }
  );

  // ---- 6. payoff A: the nprobe curve ---------------------------------------
  const sweep = Array.from({ length: NLIST }, (_, j) => {
    const nprobe = j + 1;
    let rec = 0;
    let cand = 0;
    let exactHit = 0;
    for (const qq of QUERIES) {
      const r = ivfSearch(qq, nprobe);
      const t = exactTop(qq);
      rec += recallOf(r.top, t);
      cand += r.nCand;
      if (recallOf(r.top, t) === 1) exactHit += 1;
    }
    return {
      nprobe,
      recall: rec / QUERIES.length,
      cand: cand / QUERIES.length,
      predicted: (N * nprobe) / NLIST,
      exactHit: exactHit / QUERIES.length,
    };
  });
  const at90 = sweep.find((s) => s.recall >= 0.9);
  const at99 = sweep.find((s) => s.recall >= 0.99);

  push(
    `**Payoff — the recall/latency curve, measured over ${N_QUERIES} queries.** Mean recall@${TOPK} climbs steeply and then flattens: ${pct(
      sweep[0].recall,
      1
    )} at nprobe 1, ${pct(at90!.recall, 1)} at nprobe ${at90!.nprobe}, ${pct(
      at99!.recall,
      1
    )} at nprobe ${at99!.nprobe} — so **${fmt(
      (at99!.nprobe / NLIST) * 100,
      0
    )}% of the cells buys ${pct(
      at99!.recall,
      1
    )} of exact search's answers**, and the last ${
      NLIST - at99!.nprobe
    } cells are pure cost. The candidate count is the price, and the page's N·nprobe/nlist estimate predicts it well across the whole sweep (${fmt(
      sweep[2].cand,
      0
    )} measured vs ${fmt(
      sweep[2].predicted,
      0
    )} predicted at nprobe 3, and within a few percent everywhere) — the cells are unequal in size, but a query is no more likely to land near a big one than a small one, so the errors do not accumulate in either direction.`,
    ln("cells = argsort(d)[:nprobe]"),
    {
      t: "plot",
      label: `mean recall@${TOPK} vs candidates scanned (${N_QUERIES} queries)`,
      domain: [0, N, 0, 1],
      xLabel: "candidates scored",
      yLabel: `recall@${TOPK}`,
      curves: [{ pts: sweep.map((s) => ({ x: s.cand, y: s.recall })), cls: "good" }],
      points: [
        { x: sweep[0].cand, y: sweep[0].recall, id: "n=1", cls: "bad" },
        { x: at99!.cand, y: at99!.recall, id: `n=${at99!.nprobe}`, cls: "good", shape: "ring" },
      ],
    },
    {
      t: "table",
      label: "nprobe sweep",
      head: ["nprobe", `recall@${TOPK}`, "queries exact", "candidates", "N·nprobe/nlist"],
      v: sweep
        .filter((s) => s.nprobe <= 8 || s.nprobe === NLIST)
        .map((s) => ({
          cells: [
            String(s.nprobe),
            pct(s.recall, 1),
            pct(s.exactHit, 0),
            fmt(s.cand, 0),
            fmt(s.predicted, 0),
          ],
          cls: (s.nprobe === NLIST ? "good" : s.nprobe === 1 ? "bad" : "dim") as TraceCls,
        })),
    }
  );

  // ---- 7. payoff B: recall is a property of where the query landed ---------
  const scored = QUERIES.map((qq) => ({
    b: boundaryness(qq),
    r1: recallOf(ivfSearch(qq, 1).top, exactTop(qq)),
    r3: recallOf(ivfSearch(qq, 3).top, exactTop(qq)),
  })).sort((a, b) => a.b - b.b);
  const BUCKETS = 4;
  const per = Math.floor(scored.length / BUCKETS);
  const buckets = Array.from({ length: BUCKETS }, (_, j) => {
    const slice = scored.slice(j * per, j === BUCKETS - 1 ? scored.length : (j + 1) * per);
    return {
      lo: slice[0].b,
      hi: slice[slice.length - 1].b,
      r1: slice.reduce((s, x) => s + x.r1, 0) / slice.length,
      r3: slice.reduce((s, x) => s + x.r3, 0) / slice.length,
      n: slice.length,
    };
  });

  push(
    `**Payoff — recall at nprobe = 1 is not a property of the index, it is a property of where the query landed.** Split the same ${N_QUERIES} queries into quartiles by how close their two nearest centroids are. Queries deep inside a cell (ratio ${fmt(
      buckets[0].lo
    )}–${fmt(buckets[0].hi)}) get ${pct(
      buckets[0].r1,
      1
    )} recall from a single probe; queries sitting on a boundary (${fmt(
      buckets[BUCKETS - 1].lo
    )}–${fmt(buckets[BUCKETS - 1].hi)}) get ${pct(
      buckets[BUCKETS - 1].r1,
      1
    )} — a ${fmt(buckets[0].r1 - buckets[BUCKETS - 1].r1 > 0 ? (buckets[0].r1 - buckets[BUCKETS - 1].r1) * 100 : 0, 0)}-point spread from the same index and the same nprobe. At nprobe = 3 the quartiles converge (${pct(
      buckets[0].r3,
      1
    )} vs ${pct(
      buckets[BUCKETS - 1].r3,
      1
    )}). **That convergence is what you are buying with nprobe** — not average recall, but recall for the unlucky queries, which is also the recall your p99 latency and your worst-case user actually see.`,
    ln("d = [dist(q, c) for c in centroids]"),
    {
      t: "bars",
      label: "mean recall@5 by how close the query is to a cell boundary",
      max: 1,
      v: buckets.flatMap((b, j) => [
        {
          k: `Q${j + 1} nprobe 1`,
          val: b.r1,
          show: pct(b.r1, 1),
          cls: (j === BUCKETS - 1 ? "bad" : "warn") as TraceCls,
        },
        { k: `Q${j + 1} nprobe 3`, val: b.r3, show: pct(b.r3, 1), cls: "good" as TraceCls },
      ]),
    },
    {
      t: "note",
      text: "Compare the sibling hnsw-search trace, which solves the same problem with a different bargain: IVF pays one k-means build and then scans a fixed fraction of the corpus, so its cost grows linearly with N. HNSW pays a much slower build and then follows graph edges, touching a number of nodes that grows logarithmically — which is why it wins at scale and loses on memory and on inserts.",
      cls: "good",
    }
  );

  return {
    id: "ivf-search",
    title: "IVF search — probing cells, and the neighbours that fall across the boundary",
    caption:
      "600 vectors in 16 k-means cells. The walkthrough query is not hand-picked: it is the first query in a 400-query evaluation set that nprobe = 1 gets wrong, and it loses its true nearest neighbour not because that vector ranked badly but because its cell was never opened. Two measured payoffs follow: the recall-vs-candidates curve against the page's N·nprobe/nlist estimate, and the finding that recall at nprobe = 1 depends almost entirely on how close the query sits to a cell boundary — which is precisely what raising nprobe buys back.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const ivfTrace = build();
