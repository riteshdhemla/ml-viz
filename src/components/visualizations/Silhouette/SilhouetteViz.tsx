"use client";

import { useMemo, useState } from "react";
import { CLASS_COLORS, VIZ, VizFrame, VizSlider, VizStat, scale, seededRandom, gaussian } from "../viz-kit";

/**
 * Silhouette analysis. Three true blobs are clustered by k-means at the
 * chosen k; the right panel shows every point's silhouette value grouped by
 * cluster. k=3 (the truth) maximizes the mean silhouette — under- and
 * over-splitting both drag it down.
 */

const PANEL = 230;
const W = 480;
const H = 250;
const DOM: [number, number] = [-4.5, 4.5];

const DATA = (() => {
  const rng = seededRandom(11);
  const centers = [
    { x: -2.2, y: -1.6 },
    { x: 2.4, y: -1.2 },
    { x: 0.1, y: 2.2 },
  ];
  const pts: { x: number; y: number }[] = [];
  for (const c of centers)
    for (let i = 0; i < 16; i++) pts.push({ x: gaussian(rng, c.x, 0.65), y: gaussian(rng, c.y, 0.65) });
  return pts;
})();

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Deterministic k-means (k-means++-style farthest-point seeding, 30 iters). */
function kmeans(k: number): number[] {
  const centers: { x: number; y: number }[] = [DATA[0]];
  while (centers.length < k) {
    let best = 0, bestD = -1;
    for (let i = 0; i < DATA.length; i++) {
      const d = Math.min(...centers.map((c) => dist(DATA[i], c)));
      if (d > bestD) { bestD = d; best = i; }
    }
    centers.push(DATA[best]);
  }
  let labels = new Array(DATA.length).fill(0);
  for (let it = 0; it < 30; it++) {
    labels = DATA.map((p) => {
      let bi = 0, bd = Infinity;
      centers.forEach((c, j) => { const d = dist(p, c); if (d < bd) { bd = d; bi = j; } });
      return bi;
    });
    for (let j = 0; j < k; j++) {
      const mine = DATA.filter((_, i) => labels[i] === j);
      if (mine.length) {
        centers[j] = {
          x: mine.reduce((s, p) => s + p.x, 0) / mine.length,
          y: mine.reduce((s, p) => s + p.y, 0) / mine.length,
        };
      }
    }
  }
  return labels;
}

function silhouettes(labels: number[], k: number): number[] {
  return DATA.map((p, i) => {
    const own = labels[i];
    const meanTo = (cluster: number) => {
      const others = DATA.filter((_, j) => labels[j] === cluster && j !== i);
      if (!others.length) return 0;
      return others.reduce((s, q) => s + dist(p, q), 0) / others.length;
    };
    const a = meanTo(own);
    let b = Infinity;
    for (let c = 0; c < k; c++) if (c !== own) b = Math.min(b, meanTo(c));
    if (!isFinite(b)) return 0;
    return (b - a) / Math.max(a, b);
  });
}

export function SilhouetteViz({ className }: { className?: string }) {
  const [k, setK] = useState(2);

  const { labels, sil, mean } = useMemo(() => {
    const labels = kmeans(k);
    const sil = silhouettes(labels, k);
    return { labels, sil, mean: sil.reduce((s, v) => s + v, 0) / sil.length };
  }, [k]);

  const sx = scale(DOM[0], DOM[1], 6, PANEL - 6);
  const sy = scale(DOM[0], DOM[1], H - 14, 8);

  // silhouette bars: grouped by cluster, sorted descending within group
  const order = useMemo(() => {
    const idx = DATA.map((_, i) => i);
    idx.sort((a, b) => (labels[a] - labels[b]) || (sil[b] - sil[a]));
    return idx;
  }, [labels, sil]);

  const bx = scale(-0.4, 1, PANEL + 46, W - 8);
  const barH = (H - 30) / DATA.length;

  return (
    <VizFrame
      className={className}
      title="Silhouette analysis: is k right?"
      caption="Left: 3 true blobs clustered at your chosen k. Right: each point's silhouette s = (b−a)/max(a,b), grouped by cluster. At k=3 the bars are tall and even. At k=2 a merged cluster's points sit far from their own center (low s); at k>3 a split blob's points are nearly as close to the twin cluster as their own (s near 0)."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Silhouette analysis">
        {/* scatter panel */}
        {DATA.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={CLASS_COLORS[labels[i] % CLASS_COLORS.length]} stroke="#0f1117" strokeWidth={1} />
        ))}
        <text x={PANEL - 6} y={H - 4} fill={VIZ.text} fontSize={9} textAnchor="end" opacity={0.85}>feature x₁</text>
        <text x={6} y={12} fill={VIZ.text} fontSize={9} opacity={0.85}>feature x₂</text>

        {/* divider */}
        <line x1={PANEL + 14} y1={8} x2={PANEL + 14} y2={H - 8} stroke={VIZ.grid} strokeWidth={1} />

        {/* silhouette bars */}
        <line x1={bx(0)} y1={8} x2={bx(0)} y2={H - 16} stroke={VIZ.axis} strokeWidth={1} />
        {order.map((i, row) => {
          const v = sil[i];
          const x0 = Math.min(bx(0), bx(v));
          const wpx = Math.abs(bx(v) - bx(0));
          return (
            <rect
              key={i}
              x={x0}
              y={10 + row * barH}
              width={Math.max(wpx, 0.5)}
              height={Math.max(barH - 1, 1)}
              fill={CLASS_COLORS[labels[i] % CLASS_COLORS.length]}
              opacity={0.85}
            />
          );
        })}
        {/* mean silhouette marker */}
        <line x1={bx(mean)} y1={8} x2={bx(mean)} y2={H - 16} stroke={VIZ.yellow} strokeWidth={1.5} strokeDasharray="4 3" />
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={bx(t)} y={H - 4} fill={VIZ.text} fontSize={9} textAnchor="middle">{t}</text>
        ))}
      </svg>

      <div className="mt-3 mb-3">
        <VizSlider label="k (clusters)" min={2} max={6} step={1} value={k} onChange={setK} format={(v) => String(v)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="k" value={String(k)} color={VIZ.yellow} />
        <VizStat label="mean silhouette" value={mean.toFixed(3)} color={mean > 0.5 ? VIZ.teal : VIZ.rose} />
      </div>
    </VizFrame>
  );
}
