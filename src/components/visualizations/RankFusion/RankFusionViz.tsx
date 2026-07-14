"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizButton, VizStat, scale } from "../viz-kit";

/**
 * Rank-fusion visualization — why you can't average search scores.
 *
 * Eight documents are scored by two retrievers on incomparable scales: BM25
 * (roughly 0–40) and cosine similarity (roughly 0.6–0.9). Fusing by naive
 * score-averaging is dominated by BM25's larger magnitude, so the fused list
 * collapses onto the BM25 order — the embedding retriever contributes almost
 * nothing ("averaging is absorption"). Reciprocal Rank Fusion (RRF) uses only
 * positions, so neither system can steamroll the other and the two rankings
 * genuinely blend ("fusion is negotiation").
 *
 * The three columns are BM25, Dense, and the Fused result; lines track each
 * document across the columns. Dense's favourites (highlighted) stay buried
 * under Average and rise under RRF.
 */

type Doc = { id: string; bm25: number; cos: number };

// Hand-picked so Average ≈ BM25 order while RRF lifts the dense favourites.
const DOCS: Doc[] = [
  { id: "D1", bm25: 38, cos: 0.72 },
  { id: "D2", bm25: 33, cos: 0.68 },
  { id: "D3", bm25: 29, cos: 0.88 },
  { id: "D4", bm25: 25, cos: 0.65 },
  { id: "D5", bm25: 20, cos: 0.86 },
  { id: "D6", bm25: 16, cos: 0.63 },
  { id: "D7", bm25: 11, cos: 0.83 },
  { id: "D8", bm25: 7, cos: 0.61 },
];

// Documents the embedding model ranks highly but keyword search buries.
const DENSE_FAVOURITES = new Set(["D3", "D5", "D7"]);

const N = DOCS.length;
const W = 560;
const H = 380;
const COLS = { bm25: 110, dense: 280, fused: 450 };
const ROW_TOP = 60;
const ROW_BOTTOM = H - 30;

function ranksFrom(scored: { id: string; score: number }[]): Map<string, number> {
  const order = [...scored].sort((a, b) => b.score - a.score);
  const r = new Map<string, number>();
  order.forEach((d, i) => r.set(d.id, i + 1)); // 1-indexed
  return r;
}

export function RankFusionViz({ className }: { className?: string }) {
  const [method, setMethod] = useState<"average" | "rrf">("average");
  const [k, setK] = useState(60);

  const y = scale(1, N, ROW_TOP, ROW_BOTTOM);

  const { bm25Rank, denseRank, fusedRank, absorbed } = useMemo(() => {
    const bm25Rank = ranksFrom(DOCS.map((d) => ({ id: d.id, score: d.bm25 })));
    const denseRank = ranksFrom(DOCS.map((d) => ({ id: d.id, score: d.cos })));

    let fusedScores: { id: string; score: number }[];
    if (method === "average") {
      // Naive average of RAW scores — BM25's magnitude dominates.
      fusedScores = DOCS.map((d) => ({ id: d.id, score: (d.bm25 + d.cos) / 2 }));
    } else {
      fusedScores = DOCS.map((d) => ({
        id: d.id,
        score: 1 / (k + bm25Rank.get(d.id)!) + 1 / (k + denseRank.get(d.id)!),
      }));
    }
    const fusedRank = ranksFrom(fusedScores);

    // How many docs keep exactly their BM25 position after fusion?
    const absorbed = DOCS.filter((d) => fusedRank.get(d.id) === bm25Rank.get(d.id)).length;

    return { bm25Rank, denseRank, fusedRank, absorbed };
  }, [method, k]);

  const colX = [
    { key: "bm25", label: "BM25 (keyword)", x: COLS.bm25, rank: bm25Rank },
    { key: "dense", label: "Dense (cosine)", x: COLS.dense, rank: denseRank },
    { key: "fused", label: method === "average" ? "Fused (average)" : "Fused (RRF)", x: COLS.fused, rank: fusedRank },
  ] as const;

  return (
    <VizFrame
      className={className}
      title="Rank Fusion: Averaging Absorbs, RRF Negotiates"
      caption="BM25 scores (0–40) and cosine scores (0.6–0.9) live on incomparable scales. Averaging the raw scores is dominated by BM25's magnitude, so the fused list collapses onto the keyword order — the highlighted embedding-favourite docs stay buried. RRF fuses positions, not magnitudes, so both retrievers get a vote and the favourites rise."
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <VizButton active={method === "average"} onClick={() => setMethod("average")}>
          Average scores
        </VizButton>
        <VizButton active={method === "rrf"} onClick={() => setMethod("rrf")}>
          RRF (rank fusion)
        </VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Rank fusion of two retrievers">
        {/* connecting lines: each document across the three columns */}
        {DOCS.map((d) => {
          const fav = DENSE_FAVOURITES.has(d.id);
          const stroke = fav ? VIZ.teal : VIZ.grid;
          const pts = colX.map((c) => ({ x: c.x, y: y(c.rank.get(d.id)!) }));
          return (
            <g key={`line-${d.id}`}>
              <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke={stroke} strokeWidth={fav ? 2 : 1} opacity={fav ? 0.9 : 0.4} />
              <line x1={pts[1].x} y1={pts[1].y} x2={pts[2].x} y2={pts[2].y} stroke={stroke} strokeWidth={fav ? 2 : 1} opacity={fav ? 0.9 : 0.4} />
            </g>
          );
        })}

        {/* column headers + rank pills */}
        {colX.map((c) => (
          <g key={c.key}>
            <text x={c.x} y={34} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ.textBright}>
              {c.label}
            </text>
            {DOCS.map((d) => {
              const fav = DENSE_FAVOURITES.has(d.id);
              const cy = y(c.rank.get(d.id)!);
              return (
                <g key={`${c.key}-${d.id}`}>
                  <circle cx={c.x} cy={cy} r={13} fill={fav ? VIZ.teal : VIZ.card} stroke={fav ? VIZ.teal : VIZ.axis} strokeWidth={1.5} />
                  <text x={c.x} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={fav ? "#04201c" : VIZ.text}>
                    {d.id}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* rank axis labels on the far left */}
        {Array.from({ length: N }, (_, i) => i + 1).map((r) => (
          <text key={`rk-${r}`} x={28} y={y(r) + 4} textAnchor="middle" fontSize={10} fill={VIZ.text}>
            #{r}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
        <div className="min-w-[180px] flex-1">
          {method === "rrf" ? (
            <VizSlider
              label="RRF constant k"
              min={10}
              max={100}
              step={1}
              value={k}
              onChange={setK}
              format={(v) => v.toFixed(0)}
            />
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Switch to <span className="text-teal-300 font-semibold">RRF</span> to watch the embedding
              favourites climb out of the bottom of the list.
            </p>
          )}
        </div>
        <VizStat
          label="docs frozen at BM25 rank"
          value={`${absorbed} / ${N}`}
          color={absorbed >= N - 1 ? VIZ.rose : VIZ.teal}
        />
      </div>
    </VizFrame>
  );
}
