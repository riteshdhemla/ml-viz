import type { AlgoTrace, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * BM25 scoring a 5-document corpus against the query "neural retrieval".
 *
 * The corpus is rigged to expose the two things BM25 adds to TF-IDF:
 *   - "neural" appears in 4/5 docs (low IDF), "retrieval" in 2/5 (high IDF),
 *     so one rare match outweighs two common ones;
 *   - d3 contains *more* query terms than d1 but is 2.6× longer, so length
 *     normalization pushes it below d1 — and the epilogue re-scores with b = 0
 *     to show the long document winning once that correction is switched off.
 */

const CODE = codeLines(`
corpus = [d.split() for d in DOCS]   # 5 short docs
query  = ["neural", "retrieval"]
k1, b  = 1.5, 0.75

N     = len(corpus)
avgdl = sum(len(d) for d in corpus) / N

def idf(term):
    # document frequency of the term
    n = sum(1 for d in corpus if term in d)
    return log((N - n + 0.5) / (n + 0.5) + 1)

def bm25(query, d):
    score = 0.0
    for term in query:
        f = d.count(term)
        if f == 0:
            continue         # no match, no contribution
        # length normalization
        norm = 1 - b + b * len(d) / avgdl
        score += idf(term) * (f * (k1 + 1)) \
                 / (f + k1 * norm)
    return score

ranked = sorted(corpus, key=lambda d: -bm25(query, d))
`);

const ln = lineFinder(CODE);

const DOCS: { id: string; text: string }[] = [
  { id: "d1", text: "neural retrieval improves search quality" },
  { id: "d2", text: "neural networks learn neural features" },
  { id: "d3", text: "a neural reader ranks passages after the retrieval step returns the retrieval candidates" },
  { id: "d4", text: "convolutional neural networks for images" },
  { id: "d5", text: "sparse keyword search with bm25 ranking" },
];

const QUERY = ["neural", "retrieval"];
const K1 = 1.5;
const B = 0.75;

const docs = DOCS.map((d) => ({ ...d, tokens: d.text.split(" ") }));
const N = docs.length;
const AVGDL = docs.reduce((s, d) => s + d.tokens.length, 0) / N;

const count = (tokens: string[], term: string) => tokens.filter((t) => t === term).length;
const df = (term: string) => docs.filter((d) => d.tokens.includes(term)).length;
const idf = (term: string) => Math.log((N - df(term) + 0.5) / (df(term) + 0.5) + 1);

const fmt = (x: number, digits = 3) => x.toFixed(digits);

/** The corpus table, with one row optionally marked as the doc being scored. */
function corpusTable(activeId?: string, scores?: Map<string, number>): TraceComponent {
  return {
    t: "table",
    label: `corpus — N = ${N}, avgdl = ${fmt(AVGDL, 1)}`,
    head: ["doc", "|d|", "neural", "retrieval", "score"],
    v: docs.map((d) => ({
      cells: [
        d.id,
        String(d.tokens.length),
        String(count(d.tokens, "neural")),
        String(count(d.tokens, "retrieval")),
        scores?.has(d.id) ? fmt(scores.get(d.id)!) : "—",
      ],
      cls: d.id === activeId ? "active" : scores?.has(d.id) ? "dim" : undefined,
    })),
  };
}

function idfBars(highlight?: string): TraceComponent {
  return {
    t: "bars",
    label: "IDF per query term",
    v: QUERY.map((term) => ({
      k: `${term} (df ${df(term)})`,
      val: idf(term),
      show: fmt(idf(term)),
      cls: highlight === term ? "active" : "dim",
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Five short documents, query "neural retrieval". BM25 needs only three corpus statistics: the number of documents N = ${N}, the average document length avgdl = ${fmt(AVGDL, 1)}, and each term's document frequency. No training, no embeddings.`,
    [...ln("corpus = ["), ...ln("avgdl = sum")],
    corpusTable(),
    {
      t: "note",
      text: 'Note d3: it contains the query terms most often (neural ×1, retrieval ×2) but is by far the longest document. Watch whether that wins or loses.',
    }
  );

  for (const term of QUERY) {
    push(
      `IDF("${term}"): it appears in ${df(term)} of ${N} documents, so ln((${N} − ${df(term)} + 0.5) / (${df(term)} + 0.5) + 1) = ${fmt(idf(term))}. ${
        df(term) > N / 2
          ? "A term in most documents discriminates almost nothing, so its weight is small."
          : "A rarer term is far more informative, so it carries a much larger weight."
      }`,
      ln("return log((N - n"),
      idfBars(term),
      corpusTable()
    );
  }

  push(
    `"retrieval" is worth ${fmt(idf("retrieval") / idf("neural"), 1)}× as much as "neural" per match. This is the whole IDF idea: matching a rare word is evidence, matching a common one barely is.`,
    ln("def idf(term)"),
    idfBars(),
    corpusTable()
  );

  // ---- score each document, term by term --------------------------------
  const scores = new Map<string, number>();

  for (const d of docs) {
    const norm = 1 - B + (B * d.tokens.length) / AVGDL;
    const contributions: { term: string; value: number; f: number }[] = [];
    let running = 0;

    for (const term of QUERY) {
      const f = count(d.tokens, term);
      if (f === 0) {
        push(
          `${d.id}: "${term}" does not occur — f = 0, so the loop skips it. A document is never penalised for a missing term, it just gains nothing.`,
          ln("continue"),
          corpusTable(d.id, scores),
          {
            t: "kv",
            label: `${d.id} — scoring`,
            v: [
              { k: "term", v: term, cls: "bad" },
              { k: "f", v: "0", cls: "bad" },
              { k: "contribution", v: "0.000", cls: "bad" },
              { k: "running score", v: fmt(running) },
            ],
          }
        );
        continue;
      }

      const value = (idf(term) * (f * (K1 + 1))) / (f + K1 * norm);
      running += value;
      contributions.push({ term, value, f });

      push(
        `${d.id}: "${term}" occurs ${f}×. Length factor = 1 − b + b·(${d.tokens.length}/${fmt(AVGDL, 1)}) = ${fmt(norm)}, so the term contributes ${fmt(idf(term))} · (${f}·2.5)/(${f} + 1.5·${fmt(norm)}) = ${fmt(value)}.`,
        ln("score += idf(term)"),
        corpusTable(d.id, scores),
        {
          t: "kv",
          label: `${d.id} — scoring`,
          v: [
            { k: "term", v: term, cls: "active" },
            { k: "f", v: String(f) },
            { k: "|d|", v: String(d.tokens.length) },
            { k: "norm", v: fmt(norm), cls: norm > 1 ? "bad" : "good" },
            { k: "idf", v: fmt(idf(term)) },
            { k: "contribution", v: fmt(value), cls: "active" },
            { k: "running score", v: fmt(running) },
          ],
        },
        {
          t: "note",
          text:
            norm > 1
              ? `norm = ${fmt(norm)} > 1 because ${d.id} is longer than average — it inflates the denominator, shrinking every contribution.`
              : `norm = ${fmt(norm)} < 1 because ${d.id} is shorter than average — a match in a short document counts for more.`,
            cls: norm > 1 ? "bad" : "good",
        }
      );
    }

    scores.set(d.id, running);
    push(
      `${d.id} finishes at ${fmt(running)}${
        contributions.length
          ? ` = ${contributions.map((c) => `${fmt(c.value)} (${c.term})`).join(" + ")}`
          : " — it matches no query term at all"
      }.`,
      ln("return score"),
      corpusTable(d.id, scores),
      {
        t: "bars",
        label: "score so far",
        v: docs.map((doc) => ({
          k: doc.id,
          val: scores.get(doc.id) ?? 0,
          show: scores.has(doc.id) ? fmt(scores.get(doc.id)!) : "—",
          cls: doc.id === d.id ? "active" : scores.has(doc.id) ? "good" : "dim",
        })),
        max: 1.4,
      }
    );
  }

  // ---- ranking ----------------------------------------------------------
  const ranked = [...docs].sort((a, b) => scores.get(b.id)! - scores.get(a.id)!);
  push(
    `Final ranking. d1 beats d3 even though d3 matches "retrieval" twice to d1's once — d3 is ${fmt(docs[2].tokens.length / docs[0].tokens.length, 1)}× longer, and the length factor eats the difference. And d1's single rare "retrieval" outscores d2's two "neural" matches, because IDF weights rarity above raw count.`,
    ln("ranked = sorted"),
    {
      t: "table",
      label: "ranked results",
      head: ["#", "doc", "|d|", "score", "text"],
      v: ranked.map((d, i) => ({
        cells: [
          String(i + 1),
          d.id,
          String(d.tokens.length),
          fmt(scores.get(d.id)!),
          d.text.length > 44 ? `${d.text.slice(0, 44)}…` : d.text,
        ],
        cls: i === 0 ? "good" : scores.get(d.id)! === 0 ? "dim" : undefined,
      })),
    }
  );

  // ---- epilogue: what b actually does ------------------------------------
  const noLenNorm = new Map<string, number>();
  for (const d of docs) {
    let s = 0;
    for (const term of QUERY) {
      const f = count(d.tokens, term);
      if (f === 0) continue;
      s += (idf(term) * (f * (K1 + 1))) / (f + K1 * 1); // norm ≡ 1 when b = 0
    }
    noLenNorm.set(d.id, s);
  }
  const rankedNoNorm = [...docs].sort((a, b) => noLenNorm.get(b.id)! - noLenNorm.get(a.id)!);

  push(
    `Now set b = 0, which switches length normalization off (norm ≡ 1). The long document d3 jumps to first place: with no length correction, padding a document with more text can only help it. That is exactly the failure mode b = 0.75 exists to prevent.`,
    ln("norm = 1 - b"),
    {
      t: "bars",
      label: "b = 0.75 (default)",
      v: ranked.map((d) => ({
        k: d.id,
        val: scores.get(d.id)!,
        show: fmt(scores.get(d.id)!),
        cls: d.id === ranked[0].id ? "good" : "dim",
      })),
      max: 1.6,
    },
    {
      t: "bars",
      label: "b = 0 (no length normalization)",
      v: rankedNoNorm.map((d) => ({
        k: d.id,
        val: noLenNorm.get(d.id)!,
        show: fmt(noLenNorm.get(d.id)!),
        cls: d.id === rankedNoNorm[0].id ? "bad" : "dim",
      })),
      max: 1.6,
    },
    {
      t: "note",
      text: "Same corpus, same query, same IDFs — only b changed, and the top result flipped. b is not a cosmetic knob.",
      cls: "warn",
    }
  );

  return {
    id: "bm25-scoring",
    title: "BM25 — scoring and ranking a corpus, term by term",
    caption:
      'Watch BM25 rank five documents for the query "neural retrieval". The two ideas BM25 adds to TF-IDF are visible in the numbers: IDF makes one match on the rare "retrieval" outweigh two matches on the common "neural", and the length factor drops the long d3 below the short d1 despite d3 matching more terms. The last step re-runs everything with b = 0 so you can see the long document win the moment length normalization is removed.',
    code: CODE,
    lang: "python",
    frames,
  };
}

export const bm25Trace = build();
