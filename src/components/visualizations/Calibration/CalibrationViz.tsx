"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, seededRandom, gaussian } from "../viz-kit";

/**
 * Calibration via a reliability diagram. A classifier is overconfident by
 * default: its predicted confidence runs ahead of its actual accuracy. The
 * temperature slider rescales the logits (temperature scaling); at the right
 * temperature the bars line up with the diagonal and the Expected Calibration
 * Error (ECE) is minimized.
 */

const N = 500;
const BINS = 10;
const SHARP = 2.3; // model's logits are this much too sharp → overconfident at T=1

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// deterministic samples: positive margin z, true accuracy = sigmoid(z), correctness sampled
const SAMPLES = (() => {
  const rng = seededRandom(5);
  return Array.from({ length: N }, () => {
    const z = Math.abs(gaussian(rng, 0, 1.3)); // predicted-class margin ≥ 0
    const trueAcc = sigmoid(z);
    const correct = rng() < trueAcc ? 1 : 0;
    return { z, correct };
  });
})();

export function CalibrationViz({ className }: { className?: string }) {
  const [temp, setTemp] = useState(1);

  // confidence under temperature scaling of the (over-sharp) logits
  const pts = SAMPLES.map((s) => ({
    conf: sigmoid((s.z * SHARP) / temp),
    correct: s.correct,
  }));

  // bin by confidence in [0.5, 1]
  const bins = Array.from({ length: BINS }, () => ({ n: 0, conf: 0, acc: 0 }));
  for (const p of pts) {
    let b = Math.floor(((p.conf - 0.5) / 0.5) * BINS);
    if (b < 0) b = 0;
    if (b >= BINS) b = BINS - 1;
    bins[b].n++;
    bins[b].conf += p.conf;
    bins[b].acc += p.correct;
  }
  const binStats = bins.map((b) => ({
    n: b.n,
    conf: b.n ? b.conf / b.n : 0,
    acc: b.n ? b.acc / b.n : 0,
  }));
  const ece = binStats.reduce((s, b) => s + (b.n / N) * Math.abs(b.acc - b.conf), 0);
  const avgConf = pts.reduce((s, p) => s + p.conf, 0) / N;
  const avgAcc = pts.reduce((s, p) => s + p.correct, 0) / N;

  // layout: a 0.5–1.0 square
  const S = 220;
  const pad = 34;
  const px = (v: number) => pad + ((v - 0.5) / 0.5) * S;
  const py = (v: number) => pad + S - ((v - 0.5) / 0.5) * S;

  return (
    <VizFrame
      className={className}
      title="Calibration: reliability diagram & temperature scaling"
      caption="Each bar groups predictions by confidence; its height is the actual accuracy in that bin. Perfect calibration lies on the diagonal (confidence = accuracy). The model is overconfident at temperature 1 (bars below the line). Raise the temperature to soften the probabilities; the Expected Calibration Error (ECE) bottoms out when the bars meet the diagonal."
    >
      <div className="overflow-x-auto">
        <svg viewBox="0 0 290 290" width="100%" role="img" aria-label="reliability diagram">
          {/* axes box */}
          <rect x={pad} y={pad} width={S} height={S} fill="none" stroke={VIZ.axis} />
          {/* perfect-calibration diagonal */}
          <line x1={px(0.5)} y1={py(0.5)} x2={px(1)} y2={py(1)} stroke={VIZ.teal} strokeWidth={1.5} strokeDasharray="4 3" />
          {/* bars: accuracy per confidence bin */}
          {binStats.map((b, i) => {
            if (b.n === 0) return null;
            const x0 = px(0.5 + (i / BINS) * 0.5);
            const x1 = px(0.5 + ((i + 1) / BINS) * 0.5);
            const w = x1 - x0;
            return (
              <g key={i}>
                {/* gap to the diagonal, shaded */}
                <rect x={x0 + 1} y={py(Math.max(b.acc, b.conf))} width={w - 2} height={Math.abs(py(b.acc) - py(b.conf))} fill={VIZ.rose} opacity={0.25} />
                <rect x={x0 + 1} y={py(b.acc)} width={w - 2} height={pad + S - py(b.acc)} fill={VIZ.brand} opacity={0.75} />
              </g>
            );
          })}
          {/* labels */}
          <text x={pad + S / 2} y={285} fill={VIZ.text} fontSize={9} textAnchor="middle">confidence</text>
          <text x={10} y={pad + S / 2} fill={VIZ.text} fontSize={9} textAnchor="middle" transform={`rotate(-90 10 ${pad + S / 2})`}>accuracy</text>
          {[0.5, 0.75, 1.0].map((t) => (
            <g key={t}>
              <text x={px(t)} y={pad + S + 12} fill={VIZ.text} fontSize={8} textAnchor="middle" fontFamily="monospace">{t}</text>
              <text x={pad - 6} y={py(t) + 3} fill={VIZ.text} fontSize={8} textAnchor="end" fontFamily="monospace">{t}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 max-w-xs">
        <VizSlider label="Temperature T" min={0.5} max={3} step={0.1} value={temp} onChange={setTemp} format={(v) => v.toFixed(1)} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat label="avg confidence" value={avgConf.toFixed(3)} color={VIZ.brandLight} />
        <VizStat label="avg accuracy" value={avgAcc.toFixed(3)} color={VIZ.teal} />
        <VizStat label="ECE" value={ece.toFixed(3)} color={ece < 0.03 ? VIZ.teal : VIZ.rose} />
      </div>
    </VizFrame>
  );
}
