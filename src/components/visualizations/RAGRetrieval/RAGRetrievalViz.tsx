"use client";

import { useMemo, useState } from "react";
import { VIZ, CLASS_COLORS, VizFrame, VizSlider, VizButton, VizStat, scale } from "../viz-kit";

/**
 * RAG embedding-retrieval visualization.
 *
 * Document chunks live as points in a 2D "embedding space", grouped into three
 * topic clusters. A query is embedded into the same space; the k nearest chunks
 * (Euclidean) are retrieved and would be pasted into the prompt as context.
 * Increasing k past the relevant cluster starts pulling in off-topic chunks —
 * the visual intuition for why retrieval precision matters.
 *
 * Positions are hand-placed (no randomness) so the three topics read clearly.
 */

type Chunk = { id: number; x: number; y: number; topic: number; label: string };

const CHUNKS: Chunk[] = [
  // topic 0 — refunds
  { id: 0, x: 1.2, y: 4.2, topic: 0, label: "Refunds within 30 days" },
  { id: 1, x: 1.8, y: 3.6, topic: 0, label: "Refund eligibility" },
  { id: 2, x: 0.8, y: 3.2, topic: 0, label: "How to request a refund" },
  { id: 3, x: 2.2, y: 4.6, topic: 0, label: "Refund processing time" },
  // topic 1 — shipping
  { id: 4, x: 7.5, y: 6.5, topic: 1, label: "Shipping options" },
  { id: 5, x: 8.1, y: 5.9, topic: 1, label: "Delivery times" },
  { id: 6, x: 7.0, y: 6.0, topic: 1, label: "International shipping" },
  { id: 7, x: 8.4, y: 6.8, topic: 1, label: "Tracking your order" },
  // topic 2 — account
  { id: 8, x: 4.5, y: 1.2, topic: 2, label: "Reset password" },
  { id: 9, x: 5.1, y: 1.8, topic: 2, label: "Update email" },
  { id: 10, x: 4.0, y: 0.8, topic: 2, label: "Delete account" },
  { id: 11, x: 5.4, y: 1.1, topic: 2, label: "Two-factor auth" },
];

const QUERIES = [
  { text: "How do I get my money back?", x: 1.5, y: 4.0 },
  { text: "When will my package arrive?", x: 7.8, y: 6.3 },
  { text: "I forgot my password", x: 4.6, y: 1.3 },
];

const W = 500;
const H = 340;
const M = { top: 22, right: 16, bottom: 16, left: 16 };

export function RAGRetrievalViz({ className }: { className?: string }) {
  const [k, setK] = useState(3);
  const [qi, setQi] = useState(0);
  const q = QUERIES[qi];

  const sx = scale(0, 9, M.left, W - M.right);
  const sy = scale(0, 7.5, H - M.bottom, M.top);

  const ranked = useMemo(
    () => CHUNKS.map((c) => ({ c, d: Math.hypot(c.x - q.x, c.y - q.y) })).sort((a, b) => a.d - b.d),
    [q],
  );
  const top = ranked.slice(0, k);
  const retrieved = new Set(top.map((r) => r.c.id));
  const trueTopic = ranked[0].c.topic;
  const onTopic = top.filter((r) => r.c.topic === trueTopic).length;

  return (
    <VizFrame
      className={className}
      title="RAG: Embedding Retrieval"
      caption="Documents are chunked and embedded into a vector space; the query is embedded into the same space; the k nearest chunks are retrieved and pasted into the prompt as context. Pushing k too high pulls in off-topic chunks — exactly how RAG ends up grounding answers on irrelevant context."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="RAG retrieval in embedding space">
        {top.map((r) => (
          <line
            key={`l-${r.c.id}`}
            x1={sx(q.x)}
            y1={sy(q.y)}
            x2={sx(r.c.x)}
            y2={sy(r.c.y)}
            stroke={VIZ.brandLight}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        ))}
        {CHUNKS.map((c) => {
          const on = retrieved.has(c.id);
          return (
            <g key={c.id}>
              <circle
                cx={sx(c.x)}
                cy={sy(c.y)}
                r={on ? 8 : 6}
                fill={CLASS_COLORS[c.topic]}
                fillOpacity={on ? 0.95 : 0.4}
                stroke={on ? "#fff" : VIZ.axis}
                strokeWidth={on ? 1.5 : 1}
              />
              {on && (
                <text x={sx(c.x) + 11} y={sy(c.y) + 3} fill={VIZ.textBright} fontSize={9}>
                  {c.label}
                </text>
              )}
            </g>
          );
        })}
        <g>
          <circle cx={sx(q.x)} cy={sy(q.y)} r={7} fill={VIZ.yellow} stroke="#fff" strokeWidth={1.5} />
          <text x={sx(q.x)} y={sy(q.y) - 12} fill={VIZ.yellow} fontSize={10} textAnchor="middle" fontWeight="bold">
            query
          </text>
        </g>
      </svg>

      <div className="mt-3 flex gap-2 flex-wrap">
        {QUERIES.map((qq, i) => (
          <VizButton key={i} active={qi === i} onClick={() => setQi(i)}>
            {qq.text}
          </VizButton>
        ))}
      </div>

      <div className="mt-3">
        <VizSlider label="k (chunks retrieved)" min={1} max={6} step={1} value={k} onChange={(v) => setK(Math.round(v))} format={(v) => v.toFixed(0)} />
      </div>

      <div className="flex gap-6 flex-wrap mt-3">
        <VizStat label="retrieved" value={`${k} chunks`} color={VIZ.brand} />
        <VizStat label="on-topic" value={`${onTopic}/${k}`} color={onTopic === k ? VIZ.teal : VIZ.rose} />
        <VizStat label="query" value={q.text} />
      </div>
    </VizFrame>
  );
}
