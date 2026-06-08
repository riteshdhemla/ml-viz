"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat, seededRandom } from "../viz-kit";

/**
 * Scaled dot-product self-attention over a short sequence. Each token gets a
 * fixed pseudo-embedding; the attention matrix is softmax(QKᵀ/√d) — every row
 * (a query) is a probability distribution over keys that sums to 1. Select a
 * query to highlight where it "looks".
 */

const TOKENS = ["The", "cat", "sat", "on", "the", "mat"];
const D = 4;
const N = TOKENS.length;
const CELL = 52;
const PAD = 56;

// fixed pseudo-embeddings
const EMB: number[][] = (() => {
  const rng = seededRandom(99);
  return TOKENS.map(() => Array.from({ length: D }, () => rng() * 2 - 1));
})();

function softmax(xs: number[]) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function mix(t: number) {
  const r = Math.round(15 + (99 - 15) * t);
  const g = Math.round(17 + (102 - 17) * t);
  const b = Math.round(23 + (241 - 23) * t);
  return `rgb(${r},${g},${b})`;
}

export function AttentionViz({ className }: { className?: string }) {
  const [query, setQuery] = useState(1);

  const attn = useMemo(() => {
    return EMB.map((q) => {
      const scores = EMB.map((k) => q.reduce((s, qi, i) => s + qi * k[i], 0) / Math.sqrt(D));
      return softmax(scores);
    });
  }, []);

  const size = PAD + N * CELL + 10;

  return (
    <VizFrame
      className={className}
      title="Self-attention weights = softmax(QKᵀ / √d)"
      caption="Each row is one query token's attention over all keys; the row sums to 1 (a softmax). Brighter = more attention. Tokens attend most to tokens whose embeddings align with theirs."
    >
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="text-xs text-slate-400">query:</span>
        {TOKENS.map((t, i) => (
          <VizButton key={i} onClick={() => setQuery(i)} active={i === query}>{t}</VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-md mx-auto block" role="img" aria-label="Attention matrix">
        {/* column (key) labels */}
        {TOKENS.map((t, j) => (
          <text key={`c${j}`} x={PAD + j * CELL + CELL / 2} y={PAD - 8} fill={VIZ.text} fontSize={12} textAnchor="middle">{t}</text>
        ))}
        {/* row (query) labels */}
        {TOKENS.map((t, i) => (
          <text key={`r${i}`} x={PAD - 8} y={PAD + i * CELL + CELL / 2 + 4} fill={i === query ? VIZ.yellow : VIZ.text} fontSize={12} textAnchor="end" fontWeight={i === query ? "bold" : "normal"}>{t}</text>
        ))}
        <text x={PAD + (N * CELL) / 2} y={18} fill={VIZ.textBright} fontSize={11} textAnchor="middle">keys →</text>

        {attn.map((row, i) =>
          row.map((w, j) => (
            <g key={`${i}-${j}`}>
              <rect
                x={PAD + j * CELL}
                y={PAD + i * CELL}
                width={CELL - 2}
                height={CELL - 2}
                rx={4}
                fill={mix(w)}
                stroke={i === query ? VIZ.yellow : "transparent"}
                strokeWidth={i === query ? 2 : 0}
                opacity={i === query ? 1 : 0.5}
              />
              <text x={PAD + j * CELL + CELL / 2 - 1} y={PAD + i * CELL + CELL / 2 + 4} fill={w > 0.4 ? "#fff" : VIZ.text} fontSize={10} textAnchor="middle">
                {w.toFixed(2)}
              </text>
            </g>
          ))
        )}
      </svg>

      <div className="flex gap-6 mt-2">
        <VizStat label="query" value={TOKENS[query]} color={VIZ.yellow} />
        <VizStat label="attends most to" value={TOKENS[attn[query].indexOf(Math.max(...attn[query]))]} color={VIZ.brand} />
        <VizStat label="row sum" value={attn[query].reduce((a, b) => a + b, 0).toFixed(2)} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
