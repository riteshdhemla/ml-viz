"use client";

/**
 * Keyword, semantic, and the hybrid that is supposed to get both.
 *
 * BM25 here is the real thing, computed over the real 15-document corpus below.
 * The dense retriever is **constructed rather than downloaded** — but derived
 * from the text rather than from the answer key, which is what makes the
 * comparison worth anything:
 *
 *   - words sharing a sense share a direction (a hand-authored synonym table —
 *     this part *is* an assumption, and it is the thing an embedder learns),
 *   - every token containing a digit collapses onto one shared "identifier"
 *     direction, which is what a subword embedder effectively does to rare
 *     codes,
 *   - a document is the L2-normalised mean of its word vectors.
 *
 * So "semantic beats keyword on paraphrase" is partly built in by the synonym
 * table and should not be read as a discovery. Everything below it is not.
 *
 * Measured, nDCG@3 over 7 queries (these are this file's numbers, extracted by
 * running its own retriever functions):
 *
 *   query                      kind        BM25    dense   hybrid(k=60)
 *   how do I get my money back paraphrase  1.000   1.000   1.000
 *   refund policy              lexical     1.000   1.000   1.000
 *   where is my parcel         paraphrase  0.613   1.000   1.000
 *   shipping delivery          lexical     0.765   1.000   1.000
 *   guarantee claim            paraphrase  0.613   1.000   0.613
 *   SKU-88421                  exact id    1.000   0.631   1.000
 *   password reset             lexical     1.000   1.000   1.000
 *   ------------------------------------------------------------------
 *   mean                                   0.856   0.947   0.945
 *
 *   per-query wins: BM25 1, dense 3, tied 3 -- neither dominates.
 *
 * Two findings that are not assumptions.
 *
 * 1. **The exact-ID failure is mechanical, not stylistic.** Cosine between the
 *    two SKU documents is **1.0000** — the dense representation cannot express
 *    the difference between SKU-88421 and SKU-88422 at all, because the digits
 *    collapse. Its top hit for "SKU-88421" is "Reset your account password".
 *    This is why
 *    "semantic search sometimes misses rare exact codes" is a structural
 *    property rather than a tuning problem.
 *
 * 2. **Reciprocal-rank fusion helps only if you tune k, and the default hurts.**
 *    Sweeping RRF's constant over the same 7 queries:
 *
 *        k          mean     worst query
 *        1 .. 10    0.989      0.920
 *        20 .. 60   0.945      0.613
 *        BM25       0.856      0.613
 *        dense      0.947      0.631
 *
 *    At k <= 10 hybrid beats both retrievers decisively -- and the worst-query
 *    figure is the striking one, 0.920 against dense's 0.631, because the other
 *    retriever covers the case this one cannot represent. At k >= 20, including
 *    the k = 60 everyone copies from the original paper, hybrid drops to 0.945
 *    mean and 0.613 worst: **below the dense retriever on both**. k = 60 is
 *    calibrated for corpora of millions, where tail-rank differences are noise;
 *    over 15 documents it flattens exactly the rank differences fusion exists to
 *    exploit. The whole benefit switches off between k = 10 and k = 20.
 */

import { useMemo, useState } from "react";
import {
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  GuidedViz,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { VIZ, VizSlider, seededRandom } from "../viz-kit";

const DIM = 32;

function gauss(rng: () => number) {
  let u = 0;
  let v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* Words sharing a sense share a direction. This table is the assumption — it
   stands in for what a trained embedder knows about synonymy. */
const SENSES: Record<string, string[]> = {
  refund: ["refund", "refunds", "money", "back", "return", "returned", "reimburse"],
  ship: ["shipping", "delivery", "deliver", "parcel", "package", "transit", "track", "tracking"],
  acct: ["account", "password", "login", "profile", "email", "address", "reset"],
  bill: ["billing", "bill", "invoice", "payment", "card", "charge", "pricing", "dollars"],
  warr: ["warranty", "guarantee", "repair", "defect", "defects", "claim", "covers"],
  prod: ["product", "specification", "sheet", "item", "order", "orders", "purchase"],
};

const { WV, IDDIR, filler } = (() => {
  const rng = seededRandom(7);
  const base: Record<string, number[]> = {};
  for (const k of Object.keys(SENSES)) base[k] = Array.from({ length: DIM }, () => gauss(rng));
  const idd = Array.from({ length: DIM }, () => gauss(rng));
  const wv: Record<string, number[]> = {};
  for (const [k, ws] of Object.entries(SENSES))
    for (const w of ws) wv[w] = base[k].map((x) => x + 0.35 * gauss(rng));
  const fill: Record<string, number[]> = {};
  return { WV: wv, IDDIR: idd, filler: fill };
})();

const tok = (s: string) => s.toLowerCase().match(/[a-z0-9-]+/g) || [];

function wordVec(w: string) {
  if (WV[w]) return WV[w];
  // every token with a digit lands on one shared direction — what a subword
  // embedder effectively does to rare codes
  if (/\d/.test(w)) {
    const r = seededRandom(1);
    return IDDIR.map((x) => x + 0.05 * gauss(r));
  }
  if (!filler[w]) {
    const r = seededRandom(w.length * 977 + w.charCodeAt(0));
    filler[w] = Array.from({ length: DIM }, () => 0.25 * gauss(r));
  }
  return filler[w];
}

function embed(s: string) {
  const v = new Array(DIM).fill(0);
  for (const t of tok(s)) {
    const wv = wordVec(t);
    for (let i = 0; i < DIM; i++) v[i] += wv[i];
  }
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

const DOCS = [
  { id: "D1", t: "Refunds are issued within 30 days of purchase" },
  { id: "D2", t: "How to request your money back after a purchase" },
  { id: "D3", t: "Return an item and get a refund to your card" },
  { id: "D4", t: "Shipping options and delivery estimates" },
  { id: "D5", t: "Track your parcel while it is in transit" },
  { id: "D6", t: "Free delivery on orders over fifty dollars" },
  { id: "D7", t: "Reset your account password" },
  { id: "D8", t: "Change the email address on your profile" },
  { id: "D9", t: "Update the card we bill each month" },
  { id: "D10", t: "Your invoice and payment history" },
  { id: "D11", t: "Warranty covers manufacturing defects for two years" },
  { id: "D12", t: "Claim a repair under the guarantee" },
  { id: "D13", t: "Product SKU-88421 specification sheet" },
  { id: "D14", t: "Product SKU-88422 specification sheet" },
  { id: "D15", t: "Bulk order pricing for wholesale buyers" },
];

const QUERIES = [
  { q: "how do I get my money back", rel: ["D1", "D2", "D3"], kind: "paraphrase" },
  { q: "refund policy", rel: ["D1", "D2", "D3"], kind: "lexical" },
  { q: "where is my parcel", rel: ["D4", "D5"], kind: "paraphrase" },
  { q: "shipping delivery", rel: ["D4", "D5", "D6"], kind: "lexical" },
  { q: "guarantee claim", rel: ["D11", "D12"], kind: "paraphrase" },
  { q: "SKU-88421", rel: ["D13"], kind: "exact id" },
  { q: "password reset", rel: ["D7"], kind: "lexical" },
];

const N = DOCS.length;
const DF: Record<string, number> = {};
const DL: number[] = [];
DOCS.forEach((d) => {
  const ts = tok(d.t);
  DL.push(ts.length);
  new Set(ts).forEach((t) => (DF[t] = (DF[t] || 0) + 1));
});
const AVGDL = DL.reduce((a, b) => a + b, 0) / N;

/** Real BM25 over the real corpus. */
function bm25(q: string) {
  const qs = tok(q);
  const k1 = 1.5;
  const b = 0.75;
  return DOCS.map((d, i) => {
    const ts = tok(d.t);
    let s = 0;
    for (const t of qs) {
      const f = ts.filter((x) => x === t).length;
      if (!f) continue;
      const idf = Math.log(1 + (N - DF[t] + 0.5) / (DF[t] + 0.5));
      s += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * DL[i]) / AVGDL));
    }
    return { id: d.id, s };
  });
}

const DE = DOCS.map((d) => embed(d.t));
function dense(q: string) {
  const qv = embed(q);
  return DOCS.map((d, i) => ({ id: d.id, s: DE[i].reduce((a, x, j) => a + x * qv[j], 0) }));
}

const rank = (a: { id: string; s: number }[]) => [...a].sort((x, y) => y.s - x.s).map((o) => o.id);

function rrf(a: { id: string; s: number }[], b: { id: string; s: number }[], k: number) {
  const ra = rank(a);
  const rb = rank(b);
  return DOCS.map((d) => ({
    id: d.id,
    s: 1 / (k + ra.indexOf(d.id) + 1) + 1 / (k + rb.indexOf(d.id) + 1),
  }));
}

function ndcg(order: string[], rel: string[], k = 3) {
  let dcg = 0;
  for (let i = 0; i < k; i++) if (rel.includes(order[i])) dcg += 1 / Math.log2(i + 2);
  let idcg = 0;
  for (let i = 0; i < Math.min(k, rel.length); i++) idcg += 1 / Math.log2(i + 2);
  return idcg ? dcg / idcg : 0;
}

/** Cosine between the two near-identical SKU documents — the ID-collapse proof. */
const SKU_COS = DE[12].reduce((a, x, j) => a + x * DE[13][j], 0);

const PHASES: GuidedPhase[] = [
  { id: "two", label: "Two retrievers", tone: "brand", numberPrefix: "R" },
  { id: "fuse", label: "Fusing them", tone: "teal", numberPrefix: "F" },
];

const STEPS: GuidedStep[] = [
  {
    label: "the same query, twice",
    phase: "two",
    title: "Two rankings that disagree",
    body: (
      <>
        BM25 scores by term overlap; the dense retriever scores by direction in an embedding space.
        Run both over the same 15 documents and they return different orders for most queries.
        <br />
        <br />
        Pick a query and compare the two columns. The paraphrase queries are where keyword search
        struggles — nothing in &ldquo;where is my parcel&rdquo; lexically matches &ldquo;track your
        parcel while it is in transit&rdquo; beyond one word.
      </>
    ),
    hint: "Try 'guarantee claim' and then 'SKU-88421'. The winner swaps.",
  },
  {
    label: "the ID collapse",
    phase: "two",
    title: "Where semantic search fails structurally",
    body: (
      <>
        Ask for <span className="font-mono">SKU-88421</span> and the dense retriever's top hit is{" "}
        <em>&ldquo;Reset your account password&rdquo;</em>. It is not confused — it is <em>incapable</em>: cosine similarity
        between the two SKU documents is <strong>{SKU_COS.toFixed(4)}</strong>.
        <br />
        <br />
        Tokens containing digits collapse onto a shared direction, so the representation has no way to
        express the difference between 88421 and 88422. No amount of tuning recovers information the
        encoding threw away. BM25, which matches the literal string, gets it perfectly.
      </>
    ),
    hint: "This is why hybrid search exists at all — not as a hedge, but because one side is structurally blind.",
  },
  {
    label: "fusing the ranks",
    phase: "fuse",
    title: "Reciprocal-rank fusion, and its constant",
    body: (
      <>
        RRF adds <span className="font-mono">1/(k + rank)</span> from each retriever and re-sorts —
        no score calibration needed, which is why it is the default fusion everywhere.
        <br />
        <br />
        The constant <span className="font-mono">k</span> is usually copied as{" "}
        <span className="font-mono">60</span> from the original paper. Move it and watch the mean move:
        that constant is not a detail.
      </>
    ),
    hint: "Slide k down through 20. The worst-query bar jumps from 0.613 to 0.920 in one step.",
  },
  {
    label: "when fusion pays",
    phase: "fuse",
    title: "The default is tuned for a corpus you do not have",
    body: (
      <>
        At <span className="font-mono">k ≤ 10</span> hybrid beats both retrievers on the mean{" "}
        <em>and</em>, far more sharply, on its worst query — 0.920 against dense&rsquo;s 0.631.
        <br />
        <br />
        Past <span className="font-mono">k = 20</span> the benefit switches off entirely and hybrid falls
        below dense on both figures. k = 60 is calibrated for corpora of millions, where tail-rank
        differences are noise; over 15 documents it flattens the very rank differences fusion exists to
        exploit.
      </>
    ),
    hint: "Compare hybrid's worst-query bar against dense's. That gap, not the mean, is what fusion is really buying.",
  },
];

const W = 560;

export function HybridSearchViz({ className }: { className?: string }) {
  const [qi, setQi] = useState(4);
  const [k, setK] = useState(60);
  const [step, setStep] = useState(0);

  const active = step === 1 ? QUERIES.findIndex((x) => x.kind === "exact id") : qi;
  const Q = QUERIES[active];

  const rb = useMemo(() => rank(bm25(Q.q)), [Q.q]);
  const rd = useMemo(() => rank(dense(Q.q)), [Q.q]);
  const rh = useMemo(() => rank(rrf(bm25(Q.q), dense(Q.q), k)), [Q.q, k]);

  const summary = useMemo(() => {
    let tb = 0;
    let td = 0;
    let th = 0;
    let wb = 1;
    let wd = 1;
    let wh = 1;
    let bw = 0;
    let dw = 0;
    let tie = 0;
    for (const { q, rel } of QUERIES) {
      const b = ndcg(rank(bm25(q)), rel);
      const d = ndcg(rank(dense(q)), rel);
      const h = ndcg(rank(rrf(bm25(q), dense(q), k)), rel);
      tb += b;
      td += d;
      th += h;
      wb = Math.min(wb, b);
      wd = Math.min(wd, d);
      wh = Math.min(wh, h);
      if (b > d + 1e-9) bw++;
      else if (d > b + 1e-9) dw++;
      else tie++;
    }
    const n = QUERIES.length;
    return { bm25: tb / n, dense: td / n, hybrid: th / n, wb, wd, wh, bw, dw, tie };
  }, [k]);

  const col = (title: string, order: string[], color: string) => (
    <div>
      <div className="mb-1.5 font-mono text-[11px]" style={{ color }}>
        {title}
      </div>
      <div className="space-y-1">
        {order.slice(0, 5).map((id, i) => {
          const hit = Q.rel.includes(id);
          return (
            <div key={id} className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-slate-600">{i + 1}</span>
              <span
                className="flex-1 truncate rounded px-1.5 py-0.5 font-mono text-[10.5px]"
                style={{
                  background: hit ? `${VIZ.teal}22` : "transparent",
                  color: hit ? VIZ.teal : VIZ.text,
                }}
              >
                {DOCS.find((d) => d.id === id)?.t}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] text-slate-400">
        nDCG@3 {ndcg(order, Q.rel).toFixed(3)}
      </div>
    </div>
  );

  const bar = (label: string, v: number, color: string) => (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-3.5 flex-1 rounded bg-surface-elevated/50">
        <div className="h-3.5 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      <span className="w-12 shrink-0 font-mono text-[11px] text-white">{v.toFixed(3)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="Keyword, semantic, and the constant nobody tunes"
      caption="BM25 is computed for real over these 15 documents. The dense retriever is constructed rather than downloaded — words sharing a sense share a direction, and every token containing a digit collapses onto one shared direction, which is what a subword embedder does to rare codes. The synonym table is an assumption; the ID collapse and every number below are consequences."
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        step >= 2 ? (
          <div className="w-72">
            <VizSlider
              label="RRF constant k"
              min={1}
              max={60}
              step={1}
              value={k}
              onChange={(v) => setK(Math.round(v))}
              format={(v) => v.toFixed(0)}
            />
          </div>
        ) : step === 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {QUERIES.map((x, i) => (
              <button
                key={x.q}
                onClick={() => setQi(i)}
                className={`rounded-md border px-2 py-1 font-mono text-[10.5px] transition-colors ${
                  i === qi
                    ? "border-brand-500/50 bg-brand-500/15 text-brand-200"
                    : "border-surface-border text-slate-400 hover:text-slate-200"
                }`}
              >
                {x.q}
              </button>
            ))}
          </div>
        ) : undefined
      }
      stageNote={() => (
        <span className="font-mono text-[11px] text-slate-400">
          &ldquo;{Q.q}&rdquo; · {Q.kind}
        </span>
      )}
      stage={(i) => {
        if (i <= 1)
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              {col("BM25 — term overlap", rb, VIZ.yellow)}
              {col("dense — embedding cosine", rd, VIZ.brand)}
            </div>
          );
        if (i === 2)
          return (
            <div className="grid gap-4 sm:grid-cols-3">
              {col("BM25", rb, VIZ.yellow)}
              {col("dense", rd, VIZ.brand)}
              {col(`hybrid (k=${k})`, rh, VIZ.teal)}
            </div>
          );
        return (
          <div className="space-y-2 py-2">
            <p className="font-mono text-[10.5px] text-slate-500">mean nDCG@3 over all 7 queries</p>
            {bar("BM25", summary.bm25, VIZ.yellow)}
            {bar("dense", summary.dense, VIZ.brand)}
            {bar(`hybrid k=${k}`, summary.hybrid, VIZ.teal)}
            <p className="pt-2 font-mono text-[10.5px] text-slate-500">worst single query</p>
            {bar("BM25", summary.wb, VIZ.yellow)}
            {bar("dense", summary.wd, VIZ.brand)}
            {bar(`hybrid k=${k}`, summary.wh, VIZ.teal)}
          </div>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {i <= 1 && (
            <GuidedCard label="neither one dominates" accent={VIZ.brand}>
              <span className="font-mono text-[11.5px] text-slate-300">
                across 7 queries: BM25 better on{" "}
                <span className="text-accent-yellow">{summary.bw}</span>, dense on{" "}
                <span className="text-brand-300">{summary.dw}</span>, tied on {summary.tie}
              </span>
            </GuidedCard>
          )}
          {i === 1 && (
            <GuidedCard label="the two SKU documents" accent={VIZ.rose}>
              <span className="font-mono text-[11.5px] text-slate-300">
                cosine similarity <span className="text-accent-rose">{SKU_COS.toFixed(4)}</span>
                <br />
                the encoding cannot tell them apart
              </span>
            </GuidedCard>
          )}
          {i >= 2 && (
            <>
              <GuidedCard label={`hybrid at k = ${k}`} accent={summary.hybrid >= summary.dense ? VIZ.teal : VIZ.rose}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  mean{" "}
                  <span style={{ color: summary.hybrid >= summary.dense ? VIZ.teal : VIZ.rose }}>
                    {summary.hybrid.toFixed(3)}
                  </span>{" "}
                  vs dense {summary.dense.toFixed(3)}
                  <br />
                  {summary.hybrid >= summary.dense ? "beats both retrievers" : "worse than dense alone"}
                </span>
              </GuidedCard>
              <GuidedCard label="worst query" accent={VIZ.yellow}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  hybrid <span className="text-accent-teal">{summary.wh.toFixed(3)}</span> · dense{" "}
                  <span className="text-accent-rose">{summary.wd.toFixed(3)}</span> · BM25{" "}
                  {summary.wb.toFixed(3)}
                </span>
              </GuidedCard>
            </>
          )}
          {i === 3 && (
            <GuidedPayoff label="what fusion actually buys">
              The mean is the less interesting number. Dense alone scores {summary.dense.toFixed(3)} on
              average but {summary.wd.toFixed(3)} on its worst query — the exact-ID one, where it is
              structurally blind and its top hit is a password-reset document. Fusion&rsquo;s real product is that floor:
              at a well-chosen k, hybrid&rsquo;s worst query is {summary.wh.toFixed(3)}, because the other
              retriever covers the case this one cannot represent. But the constant decides whether you
              get any of it — copied at k = 60, fusion here scores below simply using the dense retriever
              on its own. Tune k against your own corpus size, or fusion is a cost with no benefit.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={() => (
        <>
          <GuidedLegend color={VIZ.yellow}>BM25</GuidedLegend>
          <GuidedLegend color={VIZ.brand}>dense</GuidedLegend>
          <GuidedLegend color={VIZ.teal}>relevant / hybrid</GuidedLegend>
        </>
      )}
    />
  );
}
