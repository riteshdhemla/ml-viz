"use client";

import { useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * Logistic regression learning a linear decision boundary by gradient descent.
 * Watch the boundary rotate into place as cross-entropy loss drops and accuracy
 * climbs — the "decision boundary evolution" animation, native to the lesson.
 */

const W = 420;
const H = 320;
const M = 24;
const DOM: [number, number] = [-3.5, 3.5];
const LR = 0.4;

// two deterministic gaussian blobs, roughly linearly separable
const DATA = (() => {
  const rng = seededRandom(21);
  const pts: { x: number; y: number; label: number }[] = [];
  for (let i = 0; i < 22; i++) pts.push({ x: gaussian(rng, -1.3, 0.7), y: gaussian(rng, -0.9, 0.7), label: 0 });
  for (let i = 0; i < 22; i++) pts.push({ x: gaussian(rng, 1.3, 0.7), y: gaussian(rng, 0.9, 0.7), label: 1 });
  return pts;
})();

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function DecisionBoundaryViz({ className }: { className?: string }) {
  // weights: [bias, w1, w2]
  const [wts, setWts] = useState<[number, number, number]>([0, 0.3, -0.6]);
  const [iter, setIter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sx = scale(DOM[0], DOM[1], M, W - M);
  const sy = scale(DOM[0], DOM[1], H - M, M);

  function step() {
    setWts((w) => {
      const g = [0, 0, 0];
      for (const p of DATA) {
        const z = w[0] + w[1] * p.x + w[2] * p.y;
        const err = sigmoid(z) - p.label;
        g[0] += err;
        g[1] += err * p.x;
        g[2] += err * p.y;
      }
      const n = DATA.length;
      return [w[0] - LR * g[0] / n, w[1] - LR * g[1] / n, w[2] - LR * g[2] / n] as [number, number, number];
    });
    setIter((i) => i + 1);
  }

  function togglePlay() {
    if (playing) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      timer.current = setInterval(step, 120);
    }
  }

  function reset() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setWts([0, 0.3, -0.6]);
    setIter(0);
  }

  // metrics
  let loss = 0, correct = 0;
  for (const p of DATA) {
    const z = wts[0] + wts[1] * p.x + wts[2] * p.y;
    const s = sigmoid(z);
    loss += -(p.label * Math.log(s + 1e-9) + (1 - p.label) * Math.log(1 - s + 1e-9));
    if ((s >= 0.5 ? 1 : 0) === p.label) correct++;
  }
  loss /= DATA.length;
  const acc = (correct / DATA.length) * 100;

  // boundary line: w0 + w1*x + w2*y = 0  →  y = -(w0 + w1*x)/w2
  const boundary = (() => {
    if (Math.abs(wts[2]) < 1e-4) return null;
    const yAt = (x: number) => -(wts[0] + wts[1] * x) / wts[2];
    return { x0: sx(DOM[0]), y0: sy(yAt(DOM[0])), x1: sx(DOM[1]), y1: sy(yAt(DOM[1])) };
  })();

  return (
    <VizFrame
      className={className}
      title="Logistic regression: learning a decision boundary"
      caption="Gradient descent on cross-entropy nudges the boundary every step until the two classes are separated. Accuracy rises and loss falls as it converges."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" role="img" aria-label="Decision boundary">
        {/* shaded half-planes */}
        <defs>
          <clipPath id="db-clip"><rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} /></clipPath>
        </defs>
        <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} fill={VIZ.card} stroke={VIZ.axis} />
        {boundary && (
          <line
            x1={boundary.x0}
            y1={boundary.y0}
            x2={boundary.x1}
            y2={boundary.y1}
            stroke={VIZ.yellow}
            strokeWidth={2.5}
            clipPath="url(#db-clip)"
          />
        )}
        {DATA.map((p, i) => {
          const z = wts[0] + wts[1] * p.x + wts[2] * p.y;
          const ok = (sigmoid(z) >= 0.5 ? 1 : 0) === p.label;
          return (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={5}
              fill={p.label === 1 ? VIZ.brand : VIZ.teal}
              stroke={ok ? "#0f1117" : VIZ.rose}
              strokeWidth={ok ? 1 : 2}
            />
          );
        })}
      </svg>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex gap-2">
          <VizButton onClick={togglePlay} active={playing}>{playing ? "Pause" : "Play"}</VizButton>
          <VizButton onClick={step}>Step</VizButton>
          <VizButton onClick={reset}>Reset</VizButton>
        </div>
        <div className="flex gap-4 ml-auto">
          <VizStat label="iter" value={String(iter)} />
          <VizStat label="loss" value={loss.toFixed(3)} color={VIZ.rose} />
          <VizStat label="accuracy" value={`${acc.toFixed(0)}%`} color={VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
