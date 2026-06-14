"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * Reward model — pairwise preference visualisation.
 *
 * A prompt has two candidate responses: one labelled chosen (✓), one rejected
 * (✗). The reward model assigns each a scalar reward r ∈ ℝ. The Bradley–Terry
 * objective trains the model so that
 *
 *   P(y_c ≻ y_r | x) = σ(r_c - r_r),
 *
 * with loss L = -log σ(r_c - r_r). Sliders move r_c and r_r along a 1-D reward
 * number line; the readout shows the margin r_c - r_r, the implied win
 * probability, and the BT loss. A small sigmoid panel highlights where the
 * current margin lands on the σ curve.
 */

// Layout constants for the SVG canvas.
const W = 540;
const H_LINE = 130;
const H_SIGM = 130;
const PAD_X = 36;

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

// Anchor the prompt + responses so the metaphor lands. Fixed strings keep the
// viz self-contained — the lesson narrative supplies the rest of the context.
const PROMPT = "Explain entropy to a five-year-old.";
const CHOSEN_TEXT = "Chosen ✓  short, vivid analogy";
const REJECTED_TEXT = "Rejected ✗  long, jargon-heavy reply";

export function RewardModelViz({ className }: { className?: string }) {
  const [rc, setRc] = useState(1.2);
  const [rr, setRr] = useState(-0.4);

  // Map reward values in [-3, 3] to x-pixel positions on the number line.
  const sx = scale(-3, 3, PAD_X, W - PAD_X);

  // Bradley–Terry quantities.
  const margin = rc - rr;
  const p = sigmoid(margin);
  const loss = -Math.log(Math.max(p, 1e-12));

  // Sigmoid panel: plot σ(z) for z in [-6, 6]. Mark the current margin.
  const sxSig = scale(-6, 6, PAD_X, W - PAD_X);
  const syTop = 18;
  const syBot = H_SIGM - 22;
  const syForP = (pp: number) => syBot - pp * (syBot - syTop);
  const sigmoidPath = (() => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const z = -6 + (12 * i) / 60;
      pts.push(`${i === 0 ? "M" : "L"}${sxSig(z).toFixed(2)},${syForP(sigmoid(z)).toFixed(2)}`);
    }
    return pts.join(" ");
  })();

  const marginClamped = Math.max(-6, Math.min(6, margin));

  return (
    <VizFrame
      className={className}
      title="Reward model: pairwise preference → reward margin"
      caption="Two candidate responses to one prompt, the chosen one (✓) and the rejected one (✗). Each gets a scalar reward from the reward model. The Bradley–Terry objective trains the model so the chosen reward sits above the rejected — the wider the margin, the higher the win probability σ(r_c − r_r) and the lower the loss −log σ(r_c − r_r)."
    >
      <svg
        viewBox={`0 0 ${W} ${H_LINE + H_SIGM + 50}`}
        className="w-full"
        role="img"
        aria-label="Pairwise preference reward margin and sigmoid panel"
      >
        {/* Prompt header */}
        <text
          x={W / 2}
          y={14}
          fill={VIZ.text}
          fontSize={10}
          textAnchor="middle"
          fontStyle="italic"
        >
          prompt: &ldquo;{PROMPT}&rdquo;
        </text>

        {/* ── Reward number line ───────────────────────────────────── */}
        <g transform={`translate(0, 30)`}>
          {/* axis */}
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={H_LINE / 2}
            y2={H_LINE / 2}
            stroke={VIZ.axis}
            strokeWidth={1.5}
          />
          {/* ticks at -3..3 */}
          {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
            <g key={t}>
              <line
                x1={sx(t)}
                x2={sx(t)}
                y1={H_LINE / 2 - 4}
                y2={H_LINE / 2 + 4}
                stroke={VIZ.grid}
                strokeWidth={1}
              />
              <text
                x={sx(t)}
                y={H_LINE / 2 + 18}
                fill={VIZ.text}
                fontSize={9}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {t}
              </text>
            </g>
          ))}
          <text
            x={W - PAD_X + 2}
            y={H_LINE / 2 + 18}
            fill={VIZ.text}
            fontSize={9}
            fontFamily="monospace"
          >
            r
          </text>

          {/* Margin band between r_r and r_c */}
          <rect
            x={Math.min(sx(rc), sx(rr))}
            y={H_LINE / 2 - 6}
            width={Math.abs(sx(rc) - sx(rr))}
            height={12}
            fill={margin >= 0 ? VIZ.teal : VIZ.rose}
            opacity={0.18}
          />
          <text
            x={(sx(rc) + sx(rr)) / 2}
            y={H_LINE / 2 - 12}
            fill={margin >= 0 ? VIZ.teal : VIZ.rose}
            fontSize={10}
            textAnchor="middle"
            fontFamily="monospace"
          >
            margin = {margin.toFixed(2)}
          </text>

          {/* Rejected marker (below the line) */}
          <g transform={`translate(${sx(rr)}, ${H_LINE / 2})`}>
            <circle r={7} fill={VIZ.rose} />
            <text
              x={0}
              y={-12}
              fill={VIZ.rose}
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight={600}
            >
              r_r = {rr.toFixed(2)}
            </text>
            <text x={0} y={36} fill={VIZ.text} fontSize={9} textAnchor="middle">
              {REJECTED_TEXT}
            </text>
          </g>

          {/* Chosen marker (above the line) */}
          <g transform={`translate(${sx(rc)}, ${H_LINE / 2})`}>
            <circle r={7} fill={VIZ.teal} />
            <text
              x={0}
              y={-22}
              fill={VIZ.teal}
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight={600}
            >
              r_c = {rc.toFixed(2)}
            </text>
            <text x={0} y={52} fill={VIZ.text} fontSize={9} textAnchor="middle">
              {CHOSEN_TEXT}
            </text>
          </g>
        </g>

        {/* ── Sigmoid panel ────────────────────────────────────────── */}
        <g transform={`translate(0, ${H_LINE + 30})`}>
          <text
            x={W / 2}
            y={10}
            fill={VIZ.textBright}
            fontSize={11}
            textAnchor="middle"
            fontWeight={600}
          >
            σ(margin) — chosen-wins probability
          </text>

          {/* Axes */}
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={syBot}
            y2={syBot}
            stroke={VIZ.axis}
            strokeWidth={1}
          />
          <line
            x1={PAD_X}
            x2={PAD_X}
            y1={syTop}
            y2={syBot}
            stroke={VIZ.axis}
            strokeWidth={1}
          />
          {/* y-grid at 0.5 */}
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={syForP(0.5)}
            y2={syForP(0.5)}
            stroke={VIZ.grid}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          {/* x-grid at 0 */}
          <line
            x1={sxSig(0)}
            x2={sxSig(0)}
            y1={syTop}
            y2={syBot}
            stroke={VIZ.grid}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />

          {/* y-axis labels */}
          {[0, 0.5, 1].map((yv) => (
            <text
              key={yv}
              x={PAD_X - 6}
              y={syForP(yv) + 3}
              fill={VIZ.text}
              fontSize={9}
              textAnchor="end"
              fontFamily="monospace"
            >
              {yv}
            </text>
          ))}
          {/* x-axis labels */}
          {[-6, -3, 0, 3, 6].map((xv) => (
            <text
              key={xv}
              x={sxSig(xv)}
              y={syBot + 12}
              fill={VIZ.text}
              fontSize={9}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {xv}
            </text>
          ))}
          <text
            x={W - PAD_X + 2}
            y={syBot + 12}
            fill={VIZ.text}
            fontSize={9}
            fontFamily="monospace"
          >
            z
          </text>

          {/* sigmoid curve */}
          <path d={sigmoidPath} fill="none" stroke={VIZ.brand} strokeWidth={2} />

          {/* current point */}
          <line
            x1={sxSig(marginClamped)}
            x2={sxSig(marginClamped)}
            y1={syForP(p)}
            y2={syBot}
            stroke={margin >= 0 ? VIZ.teal : VIZ.rose}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <line
            x1={PAD_X}
            x2={sxSig(marginClamped)}
            y1={syForP(p)}
            y2={syForP(p)}
            stroke={margin >= 0 ? VIZ.teal : VIZ.rose}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <circle
            cx={sxSig(marginClamped)}
            cy={syForP(p)}
            r={5}
            fill={margin >= 0 ? VIZ.teal : VIZ.rose}
            stroke={VIZ.card}
            strokeWidth={1.5}
          />
        </g>
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <VizSlider
          label="r_c  (chosen reward)"
          min={-3}
          max={3}
          step={0.05}
          value={rc}
          onChange={setRc}
          format={(v) => v.toFixed(2)}
        />
        <VizSlider
          label="r_r  (rejected reward)"
          min={-3}
          max={3}
          step={0.05}
          value={rr}
          onChange={setRr}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat
          label="margin r_c − r_r"
          value={margin.toFixed(2)}
          color={margin >= 0 ? VIZ.teal : VIZ.rose}
        />
        <VizStat
          label="P(chosen wins)"
          value={`${(p * 100).toFixed(1)}%`}
          color={VIZ.brand}
        />
        <VizStat
          label="BT loss −log σ(Δr)"
          value={loss.toFixed(3)}
          color={loss < 0.3 ? VIZ.teal : loss < 1 ? VIZ.yellow : VIZ.rose}
        />
      </div>
    </VizFrame>
  );
}
