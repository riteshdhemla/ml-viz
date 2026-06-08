"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * The four distributions that show up everywhere in ML. Pick one, move its
 * parameters, and watch the PDF/PMF, mean, and variance update live.
 */

const W = 480;
const H = 280;
const M = { top: 14, right: 14, bottom: 28, left: 40 };

type Kind = "gaussian" | "uniform" | "bernoulli" | "poisson";

export function DistributionViz({ className }: { className?: string }) {
  const [kind, setKind] = useState<Kind>("gaussian");
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [a, setA] = useState(-2);
  const [b, setB] = useState(2);
  const [p, setP] = useState(0.5);
  const [lambda, setLambda] = useState(3);

  const continuous = kind === "gaussian" || kind === "uniform";
  const xd: [number, number] = kind === "poisson" ? [0, 15] : [-6, 6];

  const { curve, bars, mean, variance, ymax } = useMemo(() => {
    if (kind === "gaussian") {
      const pdf = (x: number) => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
      const pts = Array.from({ length: 161 }, (_, i) => {
        const x = -6 + (i / 160) * 12;
        return { x, y: pdf(x) };
      });
      return { curve: pts, bars: [], mean: mu, variance: sigma * sigma, ymax: pdf(mu) * 1.1 };
    }
    if (kind === "uniform") {
      const lo = Math.min(a, b - 0.1);
      const hi = Math.max(b, a + 0.1);
      const h = 1 / (hi - lo);
      const pts = Array.from({ length: 161 }, (_, i) => {
        const x = -6 + (i / 160) * 12;
        return { x, y: x >= lo && x <= hi ? h : 0 };
      });
      return { curve: pts, bars: [], mean: (lo + hi) / 2, variance: (hi - lo) ** 2 / 12, ymax: h * 1.3 };
    }
    if (kind === "bernoulli") {
      return { curve: [], bars: [{ k: 0, p: 1 - p }, { k: 1, p }], mean: p, variance: p * (1 - p), ymax: 1.1 };
    }
    // poisson
    const bars: { k: number; p: number }[] = [];
    let pk = Math.exp(-lambda);
    let peak = 0;
    for (let k = 0; k <= 15; k++) {
      bars.push({ k, p: pk });
      peak = Math.max(peak, pk);
      pk = (pk * lambda) / (k + 1);
    }
    return { curve: [], bars, mean: lambda, variance: lambda, ymax: peak * 1.15 };
  }, [kind, mu, sigma, a, b, p, lambda]);

  const sx = scale(xd[0], xd[1], M.left, W - M.right);
  const sy = scale(0, ymax, H - M.bottom, M.top);

  const path = continuous && curve.length ? `M${curve.map((pt) => `${sx(pt.x)},${sy(Math.min(pt.y, ymax))}`).join("L")}` : "";

  return (
    <VizFrame
      className={className}
      title="Probability distributions"
      caption="The mean (yellow line) is the distribution's center of mass; the variance is its spread. Continuous distributions show a density (PDF); discrete ones show probabilities at each outcome (PMF)."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {(["gaussian", "uniform", "bernoulli", "poisson"] as Kind[]).map((k) => (
          <VizButton key={k} onClick={() => setKind(k)} active={k === kind}>
            {k[0].toUpperCase() + k.slice(1)}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${kind} distribution`}>
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />

        {/* mean line */}
        {mean >= xd[0] && mean <= xd[1] && (
          <line x1={sx(mean)} y1={M.top} x2={sx(mean)} y2={H - M.bottom} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
        )}

        {continuous ? (
          <>
            {path && <path d={`${path}L${sx(xd[1])},${sy(0)}L${sx(xd[0])},${sy(0)}Z`} fill={VIZ.brand} opacity={0.15} />}
            {path && <path d={path} fill="none" stroke={VIZ.brand} strokeWidth={2.5} />}
          </>
        ) : (
          bars.map((bar) => {
            const bw = kind === "bernoulli" ? 40 : (W - M.left - M.right) / 17;
            return <rect key={bar.k} x={sx(bar.k) - bw / 2} y={sy(bar.p)} width={bw} height={H - M.bottom - sy(bar.p)} fill={VIZ.brand} rx={2} />;
          })
        )}
      </svg>

      {/* parameter sliders */}
      <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
        {kind === "gaussian" && (<>
          <VizSlider label="μ (mean)" min={-3} max={3} step={0.1} value={mu} onChange={setMu} format={(v) => v.toFixed(1)} />
          <VizSlider label="σ (std)" min={0.3} max={2.5} step={0.1} value={sigma} onChange={setSigma} format={(v) => v.toFixed(1)} />
        </>)}
        {kind === "uniform" && (<>
          <VizSlider label="a" min={-4} max={0} step={0.1} value={a} onChange={setA} format={(v) => v.toFixed(1)} />
          <VizSlider label="b" min={0} max={4} step={0.1} value={b} onChange={setB} format={(v) => v.toFixed(1)} />
        </>)}
        {kind === "bernoulli" && (
          <VizSlider label="p" min={0} max={1} step={0.05} value={p} onChange={setP} format={(v) => v.toFixed(2)} />
        )}
        {kind === "poisson" && (
          <VizSlider label="λ (rate)" min={0.5} max={10} step={0.5} value={lambda} onChange={setLambda} format={(v) => v.toFixed(1)} />
        )}
      </div>

      <div className="flex gap-6">
        <VizStat label="mean" value={mean.toFixed(2)} color={VIZ.yellow} />
        <VizStat label="variance" value={variance.toFixed(2)} color={VIZ.teal} />
      </div>
    </VizFrame>
  );
}
