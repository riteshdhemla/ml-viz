"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, scale, seededRandom, gaussian, useAnimationLoop } from "../viz-kit";

/**
 * Maximum likelihood for a Gaussian. A fixed sample sits on the x-axis; drag μ
 * and σ to move a candidate Gaussian and watch the log-likelihood change.
 * "Fit MLE" snaps to the sample mean and std — which is exactly the MLE.
 */

const W = 480;
const H = 300;
const M = { top: 14, right: 14, bottom: 30, left: 40 };
const XD: [number, number] = [-5, 5];

const SAMPLE = (() => {
  const rng = seededRandom(42);
  return Array.from({ length: 14 }, () => Math.max(-4.8, Math.min(4.8, gaussian(rng, 1.0, 1.2))));
})();

const SAMPLE_MEAN = SAMPLE.reduce((s, x) => s + x, 0) / SAMPLE.length;
const SAMPLE_STD = Math.sqrt(SAMPLE.reduce((s, x) => s + (x - SAMPLE_MEAN) ** 2, 0) / SAMPLE.length);

export function MLEViz({ className }: { className?: string }) {
  const [mu, setMu] = useState(-2);
  const [sigma, setSigma] = useState(2);
  const target = useRef<{ mu: number; sigma: number } | null>(null);

  useAnimationLoop((dt) => {
    if (!target.current) return;
    const t = Math.min(1, dt * 4);
    const gm = target.current.mu;
    const gs = target.current.sigma;
    setMu((m) => m + (gm - m) * t);
    setSigma((s) => s + (gs - s) * t);
    if (Math.abs(mu - gm) < 0.01 && Math.abs(sigma - gs) < 0.01) {
      setMu(gm);
      setSigma(gs);
      target.current = null;
    }
  }, target.current !== null);

  const pdf = (x: number) => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
  const ymax = (1 / (0.4 * Math.sqrt(2 * Math.PI))) * 1.05; // fixed scale (σ min ~0.4)

  const sx = scale(XD[0], XD[1], M.left, W - M.right);
  const sy = scale(0, ymax, H - M.bottom, M.top);

  const path = useMemo(() => {
    const pts = Array.from({ length: 161 }, (_, i) => {
      const x = XD[0] + (i / 160) * (XD[1] - XD[0]);
      return `${sx(x)},${sy(Math.min(pdf(x), ymax))}`;
    });
    return `M${pts.join("L")}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mu, sigma, sx, sy]);

  const logLik = SAMPLE.reduce((s, x) => s + Math.log(pdf(x) + 1e-12), 0);

  return (
    <VizFrame
      className={className}
      title="Maximum likelihood for a Gaussian"
      caption="Log-likelihood = how probable the observed sample is under the candidate Gaussian. It is maximized exactly when μ = sample mean and σ = sample std — that's the MLE."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="MLE for a Gaussian">
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke={VIZ.axis} strokeWidth={1} />

        {/* likelihood contribution lines */}
        {SAMPLE.map((x, i) => (
          <line key={`c${i}`} x1={sx(x)} y1={H - M.bottom} x2={sx(x)} y2={sy(Math.min(pdf(x), ymax))} stroke={VIZ.text} strokeWidth={0.75} opacity={0.4} />
        ))}

        {/* candidate gaussian */}
        <path d={path} fill="none" stroke={VIZ.brand} strokeWidth={2.5} />
        <line x1={sx(mu)} y1={M.top} x2={sx(mu)} y2={H - M.bottom} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />

        {/* sample ticks */}
        {SAMPLE.map((x, i) => (
          <circle key={`p${i}`} cx={sx(x)} cy={H - M.bottom} r={4} fill={VIZ.teal} stroke="#0f1117" strokeWidth={1} />
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
        <VizSlider label="μ" min={-4} max={4} step={0.1} value={mu} onChange={(v) => { target.current = null; setMu(v); }} format={(v) => v.toFixed(2)} />
        <VizSlider label="σ" min={0.4} max={3} step={0.1} value={sigma} onChange={(v) => { target.current = null; setSigma(v); }} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex items-center gap-4">
        <VizButton onClick={() => { target.current = { mu: SAMPLE_MEAN, sigma: SAMPLE_STD }; }}>Fit MLE</VizButton>
        <div className="flex gap-4 ml-auto">
          <VizStat label="log-likelihood" value={logLik.toFixed(2)} color={VIZ.brand} />
          <VizStat label="MLE μ̂" value={SAMPLE_MEAN.toFixed(2)} color={VIZ.teal} />
          <VizStat label="MLE σ̂" value={SAMPLE_STD.toFixed(2)} color={VIZ.teal} />
        </div>
      </div>
    </VizFrame>
  );
}
