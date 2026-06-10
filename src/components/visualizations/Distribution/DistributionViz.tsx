"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale } from "../viz-kit";

/**
 * The four distributions that show up everywhere in ML. Pick one, move its
 * parameters, and watch the PDF/PMF, mean, and variance update live.
 *
 * The y-axis is FIXED per distribution (not auto-scaled to the peak), so the
 * area-under-the-curve story is honest: widening a uniform visibly lowers its
 * height, and shrinking a gaussian's σ visibly raises its peak.
 */

const W = 480;
const H = 300;
const M = { top: 14, right: 14, bottom: 44, left: 52 };

type Kind = "gaussian" | "uniform" | "bernoulli" | "poisson";

/** Fixed y-axis ceiling per distribution, chosen to fit the slider ranges. */
const YMAX: Record<Kind, number> = {
  gaussian: 1.4, // peak at σ=0.3 is 1/(0.3√2π) ≈ 1.33
  uniform: 1.4, // peak at width 1 is 1.0
  bernoulli: 1.05,
  poisson: 0.65, // peak at λ=0.5 is e^-0.5 ≈ 0.61
};

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
  const ymax = YMAX[kind];

  const { curve, bars, mean, variance } = useMemo(() => {
    if (kind === "gaussian") {
      const pdf = (x: number) => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
      const pts = Array.from({ length: 161 }, (_, i) => {
        const x = -6 + (i / 160) * 12;
        return { x, y: pdf(x) };
      });
      return { curve: pts, bars: [], mean: mu, variance: sigma * sigma };
    }
    if (kind === "uniform") {
      const lo = Math.min(a, b - 0.1);
      const hi = Math.max(b, a + 0.1);
      const h = 1 / (hi - lo);
      const pts = Array.from({ length: 161 }, (_, i) => {
        const x = -6 + (i / 160) * 12;
        return { x, y: x >= lo && x <= hi ? h : 0 };
      });
      return { curve: pts, bars: [], mean: (lo + hi) / 2, variance: (hi - lo) ** 2 / 12 };
    }
    if (kind === "bernoulli") {
      return { curve: [], bars: [{ k: 0, p: 1 - p }, { k: 1, p }], mean: p, variance: p * (1 - p) };
    }
    // poisson
    const bars: { k: number; p: number }[] = [];
    let pk = Math.exp(-lambda);
    for (let k = 0; k <= 15; k++) {
      bars.push({ k, p: pk });
      pk = (pk * lambda) / (k + 1);
    }
    return { curve: [], bars, mean: lambda, variance: lambda };
  }, [kind, mu, sigma, a, b, p, lambda]);

  const sx = scale(xd[0], xd[1], M.left, W - M.right);
  const sy = scale(0, ymax, H - M.bottom, M.top);

  const xTicks = kind === "poisson" ? [0, 3, 6, 9, 12, 15] : kind === "bernoulli" ? [0, 1] : [-6, -4, -2, 0, 2, 4, 6];
  const yTicks = [0, ymax / 2, ymax].map((v) => Math.round(v * 100) / 100);

  const xLabel = continuous ? "x" : kind === "bernoulli" ? "outcome" : "k (count)";
  const yLabel = continuous ? "density p(x)" : "probability";

  const path = continuous && curve.length ? `M${curve.map((pt) => `${sx(pt.x)},${sy(Math.min(pt.y, ymax))}`).join("L")}` : "";

  return (
    <VizFrame
      className={className}
      title="Probability distributions"
      caption="The y-axis is fixed, so parameter changes show their true effect: a wider uniform must get shorter (its area is always 1), and a smaller σ piles the same area into a taller, narrower gaussian peak. The mean (yellow line) is the center of mass; variance is the spread."
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {(["gaussian", "uniform", "bernoulli", "poisson"] as Kind[]).map((k) => (
          <VizButton key={k} onClick={() => setKind(k)} active={k === kind}>
            {k[0].toUpperCase() + k.slice(1)}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${kind} distribution`}>
        {/* gridlines + y ticks */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} y1={sy(t)} x2={W - M.right} y2={sy(t)} stroke={VIZ.grid} strokeWidth={t === 0 ? 0 : 1} opacity={0.6} />
            <text x={M.left - 6} y={sy(t) + 3.5} fill={VIZ.text} fontSize={10} textAnchor="end">{t}</text>
          </g>
        ))}
        {/* x ticks */}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} y1={H - M.bottom} x2={sx(t)} y2={H - M.bottom + 4} stroke={VIZ.axis} strokeWidth={1} />
            <text x={sx(t)} y={H - M.bottom + 15} fill={VIZ.text} fontSize={10} textAnchor="middle">{t}</text>
          </g>
        ))}

        {/* axes */}
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />

        {/* axis labels */}
        <text x={(M.left + W - M.right) / 2} y={H - 8} fill={VIZ.textBright} fontSize={11} textAnchor="middle">{xLabel}</text>
        <text x={14} y={(M.top + H - M.bottom) / 2} fill={VIZ.textBright} fontSize={11} textAnchor="middle" transform={`rotate(-90 14 ${(M.top + H - M.bottom) / 2})`}>{yLabel}</text>

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
          <VizSlider label="a" min={-4} max={-0.5} step={0.1} value={a} onChange={setA} format={(v) => v.toFixed(1)} />
          <VizSlider label="b" min={0.5} max={4} step={0.1} value={b} onChange={setB} format={(v) => v.toFixed(1)} />
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
        {kind === "uniform" && <VizStat label="height 1/(b−a)" value={(1 / (Math.max(b, a + 0.1) - Math.min(a, b - 0.1))).toFixed(2)} color={VIZ.brandLight} />}
      </div>
    </VizFrame>
  );
}
