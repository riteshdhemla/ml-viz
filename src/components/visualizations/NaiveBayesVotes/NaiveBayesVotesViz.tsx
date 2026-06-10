"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat, scale } from "../viz-kit";

/**
 * Naive Bayes as additive votes. Compose an "email" by toggling words; each
 * word votes with its log-likelihood ratio log P(w|spam)/P(w|ham) (Laplace-
 * smoothed), the prior casts the first vote, and the signed bars sum to the
 * verdict. Spammy words push right (rose), hammy words push left (teal).
 */

const W = 480;
const ROW_H = 26;
const ALPHA = 1; // Laplace pseudo-count

/** Toy corpus counts: occurrences of each word in spam vs ham training mail. */
const VOCAB: { word: string; spam: number; ham: number }[] = [
  { word: "free", spam: 60, ham: 8 },
  { word: "winner", spam: 35, ham: 2 },
  { word: "money", spam: 50, ham: 12 },
  { word: "click", spam: 45, ham: 6 },
  { word: "urgent", spam: 30, ham: 5 },
  { word: "meeting", spam: 4, ham: 55 },
  { word: "project", spam: 3, ham: 60 },
  { word: "lunch", spam: 2, ham: 30 },
  { word: "report", spam: 5, ham: 45 },
  { word: "thanks", spam: 8, ham: 50 },
];

const SPAM_TOTAL = VOCAB.reduce((s, w) => s + w.spam, 0);
const HAM_TOTAL = VOCAB.reduce((s, w) => s + w.ham, 0);
const PRIOR_SPAM = 0.4; // 40% of training mail is spam

/** Smoothed log-likelihood ratio of one word. */
function llr(w: { spam: number; ham: number }) {
  const pSpam = (w.spam + ALPHA) / (SPAM_TOTAL + ALPHA * VOCAB.length);
  const pHam = (w.ham + ALPHA) / (HAM_TOTAL + ALPHA * VOCAB.length);
  return Math.log(pSpam / pHam);
}

const PRIOR_VOTE = Math.log(PRIOR_SPAM / (1 - PRIOR_SPAM));

export function NaiveBayesVotesViz({ className }: { className?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["free", "meeting"]));

  const toggle = (word: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });

  const votes = useMemo(() => {
    const rows = [{ label: "prior P(spam)=0.4", vote: PRIOR_VOTE }];
    for (const w of VOCAB) if (selected.has(w.word)) rows.push({ label: `"${w.word}"`, vote: llr(w) });
    return rows;
  }, [selected]);

  const total = votes.reduce((s, v) => s + v.vote, 0);
  const pSpam = 1 / (1 + Math.exp(-total));

  const H = (votes.length + 1) * ROW_H + 34;
  const vmax = 3.2;
  const bx = scale(-vmax, vmax, 120, W - 12);

  return (
    <VizFrame
      className={className}
      title="Naive Bayes: every word casts a vote"
      caption="Toggle words to compose an email. Each present word votes with its smoothed log-likelihood ratio log P(w|spam)/P(w|ham) — rightward rose bars say spam, leftward teal bars say ham. The votes (plus the prior) simply add; the sign of the sum is the verdict. No interactions, no weights to train — just counting."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {VOCAB.map((w) => (
          <VizButton key={w.word} onClick={() => toggle(w.word)} active={selected.has(w.word)}>
            {w.word}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Naive Bayes word votes">
        {/* zero line */}
        <line x1={bx(0)} y1={6} x2={bx(0)} y2={H - 28} stroke={VIZ.axis} strokeWidth={1} />
        <text x={bx(-vmax / 2)} y={H - 16} fill={VIZ.teal} fontSize={10} textAnchor="middle">← votes ham</text>
        <text x={bx(vmax / 2)} y={H - 16} fill={VIZ.rose} fontSize={10} textAnchor="middle">votes spam →</text>

        {votes.map((v, i) => {
          const clipped = Math.max(-vmax, Math.min(vmax, v.vote));
          const x0 = Math.min(bx(0), bx(clipped));
          const wpx = Math.abs(bx(clipped) - bx(0));
          const y = 8 + i * ROW_H;
          return (
            <g key={v.label}>
              <text x={112} y={y + ROW_H / 2 + 3} fill={VIZ.text} fontSize={10} textAnchor="end">{v.label}</text>
              <rect x={x0} y={y + 4} width={Math.max(wpx, 1)} height={ROW_H - 10} rx={2} fill={v.vote >= 0 ? VIZ.rose : VIZ.teal} opacity={0.8} />
              <text x={v.vote >= 0 ? bx(clipped) + 4 : bx(clipped) - 4} y={y + ROW_H / 2 + 3} fill={VIZ.textBright} fontSize={9} textAnchor={v.vote >= 0 ? "start" : "end"}>
                {v.vote >= 0 ? "+" : ""}{v.vote.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* total row */}
        {(() => {
          const clipped = Math.max(-vmax, Math.min(vmax, total));
          const x0 = Math.min(bx(0), bx(clipped));
          const wpx = Math.abs(bx(clipped) - bx(0));
          const y = 8 + votes.length * ROW_H;
          return (
            <g>
              <text x={112} y={y + ROW_H / 2 + 3} fill={VIZ.textBright} fontSize={10} fontWeight={700} textAnchor="end">sum</text>
              <rect x={x0} y={y + 3} width={Math.max(wpx, 1)} height={ROW_H - 8} rx={2} fill={total >= 0 ? VIZ.rose : VIZ.teal} stroke={VIZ.textBright} strokeWidth={0.75} />
              <text x={total >= 0 ? bx(clipped) + 4 : bx(clipped) - 4} y={y + ROW_H / 2 + 3} fill={VIZ.textBright} fontSize={10} fontWeight={700} textAnchor={total >= 0 ? "start" : "end"}>
                {total >= 0 ? "+" : ""}{total.toFixed(2)}
              </text>
            </g>
          );
        })()}
      </svg>

      <div className="flex gap-6 mt-2 flex-wrap items-center">
        <VizStat label="total log-odds" value={total.toFixed(2)} color={total >= 0 ? VIZ.rose : VIZ.teal} />
        <VizStat label="P(spam | email)" value={`${(pSpam * 100).toFixed(1)}%`} color={pSpam > 0.5 ? VIZ.rose : VIZ.teal} />
        <span
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ backgroundColor: total >= 0 ? "rgba(244,63,94,0.15)" : "rgba(20,184,166,0.15)", color: total >= 0 ? VIZ.rose : VIZ.teal }}
        >
          verdict: {total >= 0 ? "SPAM" : "HAM"}
        </span>
      </div>
    </VizFrame>
  );
}
