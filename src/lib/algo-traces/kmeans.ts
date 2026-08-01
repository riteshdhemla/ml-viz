import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * K-Means on the 5-point, K = 2 example worked by hand in
 * `src/content/wiki/kmeans-algorithm.mdx`.
 *
 * The payoff re-runs the identical algorithm from a different initialization
 * and converges to a *worse* partition — the local-optimum warning made
 * concrete rather than asserted.
 */

const CODE = codeLines(`
def kmeans(X, mu):
    while True:
        # assign: nearest centroid wins
        labels = [argmin([d2(x, m) for m in mu])
                  for x in X]
        # update: centroid = mean of members
        new_mu = [mean([x for x, l in
                        zip(X, labels) if l == k])
                  for k in range(K)]
        if new_mu == mu:
            return labels, mu    # converged
        mu = new_mu
`);

const ln = lineFinder(CODE);

type Pt = { id: string; x: number; y: number };

const POINTS: Pt[] = [
  { id: "A", x: 1, y: 1 },
  { id: "B", x: 1.5, y: 2 },
  { id: "C", x: 3, y: 4 },
  { id: "D", x: 5, y: 7 },
  { id: "E", x: 3.5, y: 5 },
];

const DOMAIN: [number, number, number, number] = [0, 6, 0, 8];
const CLUSTER_CLS: TraceCls[] = ["active", "good"];

const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

const fmt = (x: number, d = 2) => x.toFixed(d);
const asStr = (m: { x: number; y: number }) => `(${fmt(m.x)}, ${fmt(m.y)})`;

/** Within-cluster sum of squares for the given assignment and centroids. */
const inertia = (labels: number[], mu: { x: number; y: number }[]) =>
  POINTS.reduce((s, p, i) => s + d2(p, mu[labels[i]]), 0);

function plotPanel(
  label: string,
  mu: { x: number; y: number }[],
  labels: (number | null)[],
  opts: { active?: number; links?: boolean } = {}
): TraceComponent {
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    segments: opts.links
      ? POINTS.flatMap((p, i) =>
          labels[i] === null
            ? []
            : [{ x1: p.x, y1: p.y, x2: mu[labels[i]!].x, y2: mu[labels[i]!].y, cls: CLUSTER_CLS[labels[i]!], dashed: true }]
        )
      : undefined,
    points: [
      ...POINTS.map((p, i) => ({
        x: p.x,
        y: p.y,
        id: p.id,
        cls: opts.active === i ? "warn" : labels[i] === null ? undefined : CLUSTER_CLS[labels[i]!],
        shape: (opts.active === i ? "ring" : "dot") as "ring" | "dot",
      })),
      ...mu.map((m, k) => ({ x: m.x, y: m.y, id: `μ${k + 1}`, cls: CLUSTER_CLS[k], shape: "cross" as const })),
    ],
  };
}

/** Run the algorithm to convergence, returning every intermediate state. */
function run(init: { x: number; y: number }[]) {
  const history: { labels: number[]; mu: { x: number; y: number }[]; newMu: { x: number; y: number }[] }[] = [];
  let mu = init.map((m) => ({ ...m }));
  for (let iter = 0; iter < 20; iter++) {
    const labels = POINTS.map((p) =>
      mu.reduce((best, m, k) => (d2(p, m) < d2(p, mu[best]) ? k : best), 0)
    );
    const newMu = mu.map((m, k) => {
      const members = POINTS.filter((_, i) => labels[i] === k);
      if (members.length === 0) return m;
      return {
        x: members.reduce((s, p) => s + p.x, 0) / members.length,
        y: members.reduce((s, p) => s + p.y, 0) / members.length,
      };
    });
    history.push({ labels, mu, newMu });
    if (newMu.every((m, k) => Math.abs(m.x - mu[k].x) < 1e-9 && Math.abs(m.y - mu[k].y) < 1e-9)) break;
    mu = newMu;
  }
  return history;
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const INIT = [
    { x: 1, y: 1 },
    { x: 3.5, y: 5 },
  ];
  const history = run(INIT);

  push(
    "Five points, K = 2, with the centroids initialized on top of A and E. K-Means alternates two steps — assign, then update — and both are guaranteed to lower the objective J, the total squared distance from each point to its centroid.",
    ln("def kmeans(X, mu)"),
    plotPanel("points and initial centroids", INIT, POINTS.map(() => null)),
    {
      t: "note",
      text: "J = Σ ‖x − μ‖² over all points. Watch it fall at every step, and watch it stop falling exactly when no point changes cluster.",
    }
  );

  history.forEach((step, iter) => {
    const partial: (number | null)[] = POINTS.map(() => null);

    // --- assign step, one point at a time on the first iteration -----------
    if (iter === 0) {
      POINTS.forEach((p, i) => {
        partial[i] = step.labels[i];
        const d1 = d2(p, step.mu[0]);
        const dd2 = d2(p, step.mu[1]);
        push(
          `${p.id}${asStr(p)}: squared distance to μ1 is ${fmt(d1)}, to μ2 is ${fmt(dd2)}. ${
            d1 < dd2 ? "μ1" : "μ2"
          } is nearer, so ${p.id} joins cluster ${step.labels[i] + 1}.`,
          ln("labels = [argmin"),
          plotPanel(`assigning — iteration ${iter + 1}`, step.mu, partial, { active: i, links: true }),
          {
            t: "bars",
            label: `${p.id}: squared distance to each centroid`,
            v: [
              { k: "μ1", val: d1, show: fmt(d1), cls: d1 < dd2 ? "good" : "dim" },
              { k: "μ2", val: dd2, show: fmt(dd2), cls: dd2 < d1 ? "good" : "dim" },
            ],
          }
        );
      });
    }

    const J = inertia(step.labels, step.mu);
    const members = (k: number) =>
      POINTS.filter((_, i) => step.labels[i] === k)
        .map((p) => p.id)
        .join(", ");

    push(
      `Iteration ${iter + 1} assignment complete: C1 = {${members(0)}}, C2 = {${members(1)}}. With the *old* centroids J = ${fmt(J)}.`,
      ln("labels = [argmin"),
      plotPanel(`assignment — iteration ${iter + 1}`, step.mu, step.labels, { links: true }),
      {
        t: "kv",
        label: "clusters",
        v: [
          { k: "C1", v: `{${members(0)}}`, cls: "active" },
          { k: "C2", v: `{${members(1)}}`, cls: "good" },
          { k: "J", v: fmt(J) },
        ],
      }
    );

    const JAfter = inertia(step.labels, step.newMu);
    const converged = step.newMu.every(
      (m, k) => Math.abs(m.x - step.mu[k].x) < 1e-9 && Math.abs(m.y - step.mu[k].y) < 1e-9
    );

    push(
      converged
        ? `Update: both centroids are already at the mean of their members, so nothing moves. new_mu == mu → converged after ${iter + 1} iteration${iter ? "s" : ""}.`
        : `Update: move each centroid to the mean of its members. μ1 → ${asStr(step.newMu[0])}, μ2 → ${asStr(step.newMu[1])}. J drops from ${fmt(J)} to ${fmt(JAfter)} without a single point changing cluster — the mean is the unique minimizer of within-cluster squared distance, which is *why* the update uses it.`,
      converged ? ln("return labels, mu") : ln("new_mu = [mean"),
      plotPanel(`after update — iteration ${iter + 1}`, step.newMu, step.labels, { links: true }),
      {
        t: "bars",
        label: "objective J",
        v: [
          { k: "before update", val: J, show: fmt(J), cls: "dim" },
          { k: "after update", val: JAfter, show: fmt(JAfter), cls: converged ? "good" : "active" },
        ],
      }
    );
  });

  const final = history[history.length - 1];
  const goodJ = inertia(final.labels, final.newMu);

  // ---- payoff: same algorithm, different initialization -------------------
  const BAD_INIT = [
    { x: 3, y: 4 },
    { x: 3.5, y: 5 },
  ];
  const badHistory = run(BAD_INIT);
  const badFinal = badHistory[badHistory.length - 1];
  const badJ = inertia(badFinal.labels, badFinal.newMu);
  const group = (labels: number[], k: number) =>
    POINTS.filter((_, i) => labels[i] === k)
      .map((p) => p.id)
      .join(", ");

  push(
    `Now re-run the *same code* with the centroids initialized on C and E instead. It converges just as reliably — to a different, worse answer: J = ${fmt(badJ)} against ${fmt(goodJ)}, splitting {${group(badFinal.labels, 0)}} from {${group(badFinal.labels, 1)}}. Both steps only ever decrease J, so K-Means always terminates, but only at a *local* minimum. This is why practice means K-Means++ and n_init ≥ 10.`,
    ln("mu = new_mu"),
    plotPanel(`converged from a different init — J = ${fmt(badJ)}`, badFinal.newMu, badFinal.labels, {
      links: true,
    }),
    {
      t: "bars",
      label: "final J by initialization",
      v: [
        { k: "μ = A, E", val: goodJ, show: fmt(goodJ), cls: "good" },
        { k: "μ = C, E", val: badJ, show: fmt(badJ), cls: "bad" },
      ],
    },
    {
      t: "note",
      text: "Nothing went wrong in the second run — every step still lowered J. The objective simply has more than one basin, and the starting point decides which one you land in.",
      cls: "warn",
    }
  );

  return {
    id: "kmeans-iterations",
    title: "K-Means — assign, update, converge (and land in a local optimum)",
    caption:
      "The full assign/update loop on five points with K = 2, matching the hand-worked iteration above. Every distance calculation is shown as each point picks its centroid, and the objective J is reported before and after each update so you can watch both steps decrease it. The final step re-runs the identical algorithm from a different initialization and converges to a worse partition — the local-optimum caveat, demonstrated rather than asserted.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const kmeansTrace = build();
