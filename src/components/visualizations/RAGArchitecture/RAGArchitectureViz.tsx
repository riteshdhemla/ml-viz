"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat } from "../viz-kit";

/**
 * RAG architecture selector.
 *
 * Five RAG architectures (naive vector, hybrid + rerank, GraphRAG, agentic,
 * text-to-SQL) scored against five *query shapes*. The point of the viz is that
 * the ranking flips completely as the query shape changes — there is no
 * "best RAG", only a best fit for the question being asked. The selected
 * architecture's pipeline is drawn above the bars so the reader connects the
 * score to the machinery that produces it.
 *
 * Scores are illustrative teaching values (directionally consistent with the
 * literature cited in the lesson), not measurements from a single benchmark.
 */

type ArchId = "naive" | "hybrid" | "graph" | "agentic" | "sql";
type QueryId = "factoid" | "exact" | "multihop" | "global" | "numeric";

interface Arch {
  id: ArchId;
  label: string;
  /** Pipeline stages drawn as boxes. */
  stages: string[];
  /** Typical end-to-end query latency, seconds. */
  latency: number;
  /** Rough per-query cost in USD. */
  cost: number;
  /** One-line indexing cost note. */
  indexing: string;
}

const ARCHS: Arch[] = [
  {
    id: "naive",
    label: "Naive vector",
    stages: ["chunk", "embed", "top-k ANN", "generate"],
    latency: 0.9,
    cost: 0.004,
    indexing: "one embedding pass per chunk",
  },
  {
    id: "hybrid",
    label: "Hybrid + rerank",
    stages: ["contextual chunk", "BM25 + dense", "fuse (RRF)", "rerank", "generate"],
    latency: 1.6,
    cost: 0.008,
    indexing: "embedding pass + LLM context per chunk + inverted index",
  },
  {
    id: "graph",
    label: "GraphRAG",
    stages: ["extract entities", "build graph", "summarise communities", "local / global search", "generate"],
    latency: 3.5,
    cost: 0.03,
    indexing: "an LLM call per chunk, plus per community — expensive",
  },
  {
    id: "agentic",
    label: "Agentic RAG",
    stages: ["plan", "search", "grade evidence", "re-search", "generate"],
    latency: 8.0,
    cost: 0.09,
    indexing: "none beyond the underlying index it searches",
  },
  {
    id: "sql",
    label: "Text-to-SQL",
    stages: ["retrieve schema", "write SQL", "execute", "generate"],
    latency: 2.2,
    cost: 0.01,
    indexing: "no embedding of rows — index the schema, not the data",
  },
];

interface QueryShape {
  id: QueryId;
  label: string;
  example: string;
  /** Quality score 0–100 per architecture. */
  scores: Record<ArchId, number>;
  why: string;
}

const QUERIES: QueryShape[] = [
  {
    id: "factoid",
    label: "Single-fact lookup",
    example: "“What is our refund window?”",
    scores: { naive: 78, hybrid: 92, graph: 80, agentic: 88, sql: 20 },
    why: "The answer sits in one passage. Plain vector search already works; reranking mostly fixes the ties. Anything more elaborate buys accuracy you did not need and pays for it in latency.",
  },
  {
    id: "exact",
    label: "Rare exact token",
    example: "“What causes error ORA-01555?”",
    scores: { naive: 42, hybrid: 90, graph: 62, agentic: 84, sql: 25 },
    why: "Embeddings blur rare identifiers — error codes, SKUs, function names — into their semantic neighbourhood. BM25 matches the literal token, which is why the sparse half of hybrid retrieval carries this query shape.",
  },
  {
    id: "multihop",
    label: "Multi-hop join",
    example: "“Which customers hit by the March outage later churned?”",
    scores: { naive: 35, hybrid: 55, graph: 82, agentic: 88, sql: 30 },
    why: "No single chunk contains the answer — it has to be assembled from two or more. One-shot retrieval cannot do that; you need explicit relationships (graph) or iterated retrieval (agent).",
  },
  {
    id: "global",
    label: "Corpus-wide synthesis",
    example: "“What are the main themes across 5,000 support tickets?”",
    scores: { naive: 22, hybrid: 32, graph: 90, agentic: 70, sql: 35 },
    why: "The answer is a property of the whole corpus, not of any top-k slice. Pre-computed community summaries answer it directly; top-k retrieval can only ever sample a biased handful of tickets.",
  },
  {
    id: "numeric",
    label: "Aggregation over records",
    example: "“Total refunds issued in Q3, by region?”",
    scores: { naive: 18, hybrid: 24, graph: 40, agentic: 62, sql: 95 },
    why: "Cosine similarity cannot count, sum, or group. The right retrieval here is a query against a database — retrieve the schema, generate SQL, and let the engine do the arithmetic.",
  },
];

const W = 560;

/** Split a stage label into at most two balanced lines so boxes stay narrow. */
function twoLines(label: string, maxChars: number): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < bestDiff) {
      bestDiff = Math.abs(a - b);
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export function RAGArchitectureViz({ className }: { className?: string }) {
  const [qi, setQi] = useState(0);
  const [ai, setAi] = useState(1);

  const query = QUERIES[qi];
  const arch = ARCHS[ai];
  const best = ARCHS.reduce((acc, a) => (query.scores[a.id] > query.scores[acc.id] ? a : acc), ARCHS[0]);

  // ---- pipeline geometry ----
  // the agentic pipeline draws a loop-back arrow and its caption below the boxes
  const pipeH = arch.id === "agentic" ? 120 : 96;
  const n = arch.stages.length;
  const gap = 14;
  const padX = 10;
  const boxW = (W - 2 * padX - (n - 1) * gap) / n;
  const boxH = 40;
  const boxY = 26;

  // ---- bar geometry ----
  const rowH = 34;
  const barsH = ARCHS.length * rowH + 26;
  const labelW = 104;
  const barX0 = labelW + 8;
  const barX1 = W - 74;

  return (
    <VizFrame
      className={className}
      title="Which RAG architecture fits the question?"
      caption="Pick a query shape and read the bars: the ranking reorders every time. Scores are illustrative teaching values — the ordering, not the absolute number, is the point. Latency and cost are per query; indexing cost is quoted separately because GraphRAG pays most of its bill offline."
    >
      <div className="flex gap-2 flex-wrap">
        {QUERIES.map((q, i) => (
          <VizButton key={q.id} active={qi === i} onClick={() => setQi(i)}>
            {q.label}
          </VizButton>
        ))}
      </div>

      <p className="mt-2 text-sm text-slate-400">
        <span className="text-slate-200">{query.example}</span> — {query.why}
      </p>

      <svg
        viewBox={`0 0 ${W} ${pipeH}`}
        className="w-full mt-3"
        role="img"
        aria-label={`${arch.label} pipeline: ${arch.stages.join(" then ")}`}
      >
        <text x={padX} y={14} fill={VIZ.text} fontSize={10}>
          {arch.label} pipeline
        </text>
        {arch.stages.map((s, i) => {
          const x = padX + i * (boxW + gap);
          const lines = twoLines(s, 14);
          return (
            <g key={s}>
              <rect
                x={x}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={6}
                fill={VIZ.brand}
                fillOpacity={0.16}
                stroke={VIZ.brand}
                strokeWidth={1}
              />
              {lines.map((ln, j) => (
                <text
                  key={ln}
                  x={x + boxW / 2}
                  y={boxY + boxH / 2 + (lines.length === 1 ? 3 : j === 0 ? -3 : 9)}
                  fill={VIZ.textBright}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {ln}
                </text>
              ))}
              {i < n - 1 && (
                <path
                  d={`M ${x + boxW + 2} ${boxY + boxH / 2} L ${x + boxW + gap - 3} ${boxY + boxH / 2}`}
                  stroke={VIZ.axis}
                  strokeWidth={1.5}
                  markerEnd="url(#rag-arrow)"
                />
              )}
            </g>
          );
        })}

        {/* agentic RAG loops back: grade → search again */}
        {arch.id === "agentic" && (
          <>
            <path
              d={`M ${padX + 3 * (boxW + gap) + boxW / 2} ${boxY + boxH} C ${padX + 3 * (boxW + gap)} ${boxY + boxH + 24}, ${
                padX + (boxW + gap) + boxW
              } ${boxY + boxH + 24}, ${padX + (boxW + gap) + boxW / 2} ${boxY + boxH + 3}`}
              fill="none"
              stroke={VIZ.yellow}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              markerEnd="url(#rag-arrow-y)"
            />
            <text
              x={padX + 2.4 * (boxW + gap)}
              y={boxY + boxH + 32}
              fill={VIZ.yellow}
              fontSize={9}
              textAnchor="middle"
            >
              evidence insufficient → retrieve again
            </text>
          </>
        )}

        <defs>
          <marker id="rag-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={VIZ.axis} />
          </marker>
          <marker id="rag-arrow-y" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={VIZ.yellow} />
          </marker>
        </defs>
      </svg>

      <svg
        viewBox={`0 0 ${W} ${barsH}`}
        className="w-full mt-1"
        role="img"
        aria-label={`Answer quality per architecture for ${query.label} queries`}
      >
        <text x={0} y={12} fill={VIZ.text} fontSize={10}>
          answer quality on {query.label.toLowerCase()} queries
        </text>
        {ARCHS.map((a, i) => {
          const score = query.scores[a.id];
          const y = 26 + i * rowH;
          const w = ((barX1 - barX0) * score) / 100;
          const isSel = a.id === arch.id;
          const isBest = a.id === best.id;
          const fill = isBest ? VIZ.teal : isSel ? VIZ.brand : VIZ.axis;
          return (
            <g key={a.id} onClick={() => setAi(i)} style={{ cursor: "pointer" }}>
              <rect x={0} y={y - 4} width={W} height={rowH - 6} fill={isSel ? VIZ.brand : "transparent"} fillOpacity={0.08} rx={4} />
              <text x={0} y={y + 14} fill={isSel ? VIZ.textBright : VIZ.text} fontSize={10}>
                {a.label}
              </text>
              <rect x={barX0} y={y + 3} width={barX1 - barX0} height={14} rx={3} fill={VIZ.grid} />
              <rect x={barX0} y={y + 3} width={w} height={14} rx={3} fill={fill} fillOpacity={isSel || isBest ? 0.95 : 0.5} />
              <text x={barX0 + w + 6} y={y + 14} fill={VIZ.textBright} fontSize={9}>
                {score}
              </text>
              <text x={W} y={y + 14} fill={VIZ.text} fontSize={9} textAnchor="end">
                {a.latency.toFixed(1)}s
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex gap-2 flex-wrap">
        {ARCHS.map((a, i) => (
          <VizButton key={a.id} active={ai === i} onClick={() => setAi(i)}>
            {a.label}
          </VizButton>
        ))}
      </div>

      <div className="flex gap-6 flex-wrap mt-3">
        <VizStat
          label="selected"
          value={`${arch.label} — ${query.scores[arch.id]}/100`}
          color={arch.id === best.id ? VIZ.teal : VIZ.brand}
        />
        <VizStat label="latency" value={`${arch.latency.toFixed(1)} s`} color={VIZ.yellow} />
        <VizStat label="cost / query" value={`$${arch.cost.toFixed(3)}`} color={VIZ.orange} />
        <VizStat label="best fit here" value={best.label} color={VIZ.teal} />
      </div>

      <p className="mt-2 text-xs text-slate-500">Indexing cost — {arch.indexing}.</p>
    </VizFrame>
  );
}
