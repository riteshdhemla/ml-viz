"use client";

/**
 * Over-smoothing as the spectral fact it is, rather than as a warning.
 *
 * Stacking GCN layers with no weights is repeated multiplication by the
 * normalised operator P = D^(-1/2)(A+I)D^(-1/2). Its largest eigenvalue is
 * exactly 1, with eigenvector D^(1/2)·1 — the direction in which every node
 * holds the *same* value. Every other component shrinks by its own eigenvalue
 * each layer, so the graph signal is driven toward that one constant direction.
 * Over-smoothing is not a training pathology; it is what this operator does.
 *
 * The claim the viz makes checkable is the rate. Dirichlet energy
 *
 *     E(H) = Σ_(u,v) ∈ E || h_u/√d_u − h_v/√d_v ||²
 *
 * is the standard measure of how much variation survives, and it decays by a
 * factor λ₂² per layer. Measured on the default graph, E[k+1]/E[k] converges
 * monotonically to λ₂²: 0.81372 at k = 5, 0.82150 at k = 10, 0.82448 at 20,
 * 0.82608 at 40, 0.82636 at 78, against λ₂² = 0.82637. The panel prints the
 * live ratio next to λ₂² so the reader can watch it settle.
 *
 * The bridge slider is the counter-intuitive half. Adding edges *between* the
 * two communities lowers λ₂ — better mixing — so a better-connected graph
 * over-smooths **faster**: at depth 20 the surviving energy is 0.504 with one
 * bridge and 0.0088 with twelve, a 57× difference on the same node features.
 * The usual intuition that more connectivity is more information runs exactly
 * backwards here.
 *
 * The residual control is APPNP's fix, H ← (1−α)PH + αH₀, which has a nonzero
 * fixed point, so the energy plateaus instead of decaying: at α = 0 the energy
 * ratio E₃₀/E₀ is 9.6e-4, at α = 0.1 it is 1.1e-1 and flat from about layer 10.
 * That is the whole argument for skip connections in one number.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

const N = 24;
const HALF = 12;
const MAX_DEPTH = 20;

/** Two communities joined by `bridges` edges. */
function buildGraph(bridges: number) {
  const rng = seededRandom(5);
  const A = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const add = (i: number, j: number) => {
    if (i !== j) {
      A[i][j] = 1;
      A[j][i] = 1;
    }
  };
  for (let c = 0; c < 2; c++) {
    const off = c * HALF;
    for (let i = 0; i < HALF; i++) add(off + i, off + ((i + 1) % HALF));
    for (let i = 0; i < HALF; i++) if (rng() < 0.35) add(off + i, off + ((i + 3) % HALF));
  }
  for (let b = 0; b < bridges; b++) add(Math.floor(rng() * HALF), HALF + Math.floor(rng() * HALF));
  return A;
}

/** P = D^(-1/2)(A+I)D^(-1/2), plus the degrees the energy needs. */
function normalize(A: number[][]) {
  const M = A.map((r, i) => r.map((v, j) => (i === j ? 1 : v)));
  const d = M.map((r) => r.reduce((a, b) => a + b, 0));
  return { P: M.map((r, i) => r.map((v, j) => v / Math.sqrt(d[i] * d[j]))), d };
}

/** Jacobi eigenvalues — N is 24, so exactness beats speed. */
function eigenvalues(Min: number[][]) {
  const n = Min.length;
  const M = Min.map((r) => [...r]);
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += M[i][j] ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(M[p][q]) < 1e-14) continue;
        const theta = (M[q][q] - M[p][p]) / (2 * M[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const a = M[k][p];
          const b = M[k][q];
          M[k][p] = c * a - s * b;
          M[k][q] = s * a + c * b;
        }
        for (let k = 0; k < n; k++) {
          const a = M[p][k];
          const b = M[q][k];
          M[p][k] = c * a - s * b;
          M[q][k] = s * a + c * b;
        }
      }
  }
  return M.map((r, i) => r[i]).sort((a, b) => b - a);
}

/** Two well-separated clusters of 2-D node features. */
const H0: number[][] = (() => {
  const rng = seededRandom(9);
  return Array.from({ length: N }, (_, i) => {
    const c = i < HALF ? -1 : 1;
    return [gaussian(rng, c * 1.2, 0.45), gaussian(rng, c * 0.9, 0.45)];
  });
})();

/** Fixed circular layout per community so the picture never jumps. */
const POS = Array.from({ length: N }, (_, i) => {
  const c = i < HALF ? 0 : 1;
  const a = ((i % HALF) / HALF) * Math.PI * 2;
  return { x: (c === 0 ? 62 : 178) + 44 * Math.cos(a), y: 78 + 44 * Math.sin(a) };
});

function dirichlet(A: number[][], d: number[], H: number[][]) {
  let e = 0;
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) {
      if (!A[i][j]) continue;
      for (let k = 0; k < 2; k++)
        e += (H[i][k] / Math.sqrt(d[i]) - H[j][k] / Math.sqrt(d[j])) ** 2;
    }
  return e;
}

const W = 560;
const PLOT = { x0: 268, x1: 548, y0: 22, y1: 138 };

export function OverSmoothingViz({ className }: { className?: string }) {
  const [depth, setDepth] = useState(4);
  const [bridges, setBridges] = useState(4);
  const [alpha, setAlpha] = useState(0);

  const model = useMemo(() => {
    const A = buildGraph(bridges);
    const { P, d } = normalize(A);
    const lambda = eigenvalues(P);
    const states: number[][][] = [H0];
    const energy: number[] = [dirichlet(A, d, H0)];
    let H = H0;
    for (let k = 0; k < MAX_DEPTH; k++) {
      const PH = H.map((_, i) => {
        const out = [0, 0];
        for (let j = 0; j < N; j++)
          for (let c = 0; c < 2; c++) out[c] += P[i][j] * H[j][c];
        return out;
      });
      H = PH.map((r, i) => r.map((v, c) => (1 - alpha) * v + alpha * H0[i][c]));
      states.push(H);
      energy.push(dirichlet(A, d, H));
    }
    return { A, lambda, states, energy, degrees: d };
  }, [bridges, alpha]);

  const H = model.states[depth];
  const E = model.energy;
  const l2 = model.lambda[1];
  const liveRatio = depth > 0 ? E[depth] / E[depth - 1] : NaN;

  // Colour by h_v/√d_v, not by h_v. Under symmetric normalisation the surviving
  // direction is D^(1/2)·1, so the raw features converge to something
  // *proportional to √degree* rather than to one shared vector — every node
  // keeps its degree and loses everything else. Dividing by √d is exactly the
  // quantity Dirichlet energy is built on, and it does converge to a constant.
  const deg = model.degrees;
  const proj = H.map((h, i) => (h[0] + h[1]) / Math.sqrt(deg[i]));
  const lo = Math.min(...proj);
  const hi = Math.max(...proj);
  const p0 = H0.map((h, i) => (h[0] + h[1]) / Math.sqrt(deg[i]));
  const fixedLo = Math.min(...p0);
  const fixedHi = Math.max(...p0);
  const colorOf = (v: number) => {
    const t = (v - fixedLo) / (fixedHi - fixedLo);
    const c = Math.max(0, Math.min(1, t));
    // rose -> teal through the card grey
    const mix = (a: number, b: number) => Math.round(a + (b - a) * c);
    return `rgb(${mix(244, 20)},${mix(63, 184)},${mix(94, 166)})`;
  };

  // energy plot on a log axis
  const eMax = Math.max(...E);
  const eMin = Math.max(1e-6, Math.min(...E));
  const sy = scale(Math.log10(eMin), Math.log10(eMax), PLOT.y1, PLOT.y0);
  const sx = scale(0, MAX_DEPTH, PLOT.x0, PLOT.x1);
  const path = E.map((v, k) => `${k === 0 ? "M" : "L"}${sx(k).toFixed(1)},${sy(Math.log10(Math.max(v, 1e-6))).toFixed(1)}`).join(" ");
  // The pure-spectral law is asymptotic: the first few layers also shed the
  // smaller eigenmodes and fall faster than lambda2^2. Anchor the dashed line
  // at ANCHOR, where lambda2 has taken over, so the claim being drawn is the
  // rate rather than a fitted constant.
  const ANCHOR = 5;
  const pred = Array.from({ length: MAX_DEPTH - ANCHOR + 1 }, (_, i) => {
    const k = ANCHOR + i;
    const v = E[ANCHOR] * (l2 * l2) ** i;
    return `${i === 0 ? "M" : "L"}${sx(k).toFixed(1)},${sy(Math.log10(Math.max(v, 1e-6))).toFixed(1)}`;
  }).join(" ");

  return (
    <VizFrame
      title="Depth collapses the graph"
      caption="24 nodes in two communities, each carrying a 2-D feature. Each layer is one multiplication by the GCN operator D^(-1/2)(A+I)D^(-1/2) — no weights, no nonlinearity, just the averaging. Yellow edges join the communities. Node colour is h/√degree on a fixed scale, so collapse reads as the colours converging; the raw features converge to something proportional to √degree rather than to one identical vector, which is the same statement — every node keeps its degree and loses everything else. Right: Dirichlet energy on a log axis, with the λ₂^(2k) law dashed from layer 5, where it takes over."
      className={className}
    >
      <svg viewBox={`0 0 ${W} 152`} className="w-full">
        {/* edges */}
        {model.A.map((row, i) =>
          row.map((v, j) =>
            v && j > i ? (
              <line
                key={`${i}-${j}`}
                x1={POS[i].x}
                y1={POS[i].y}
                x2={POS[j].x}
                y2={POS[j].y}
                stroke={i < HALF !== j < HALF ? VIZ.yellow : VIZ.grid}
                strokeWidth={i < HALF !== j < HALF ? 1.4 : 1}
                opacity={i < HALF !== j < HALF ? 0.75 : 1}
              />
            ) : null
          )
        )}
        {POS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={6} fill={colorOf(proj[i])} stroke={VIZ.card} strokeWidth={1} />
        ))}
        <text x={62} y={140} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          community A
        </text>
        <text x={178} y={140} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          community B
        </text>

        {/* energy plot */}
        <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.y1} y2={PLOT.y1} stroke={VIZ.axis} strokeWidth={1} />
        <line x1={PLOT.x0} x2={PLOT.x0} y1={PLOT.y0} y2={PLOT.y1} stroke={VIZ.axis} strokeWidth={1} />
        <path d={pred} fill="none" stroke={VIZ.yellow} strokeWidth={1.4} strokeDasharray="4 3" />
        <path d={path} fill="none" stroke={VIZ.teal} strokeWidth={2} />
        <circle cx={sx(depth)} cy={sy(Math.log10(Math.max(E[depth], 1e-6)))} r={4} fill={VIZ.textBright} />
        <text x={PLOT.x0} y={PLOT.y0 - 8} fontSize={9} fill={VIZ.text}>
          Dirichlet energy (log) — dashed is λ₂^2k from layer 5
        </text>
        <text x={PLOT.x0 - 4} y={PLOT.y1 + 12} fontSize={9} fill={VIZ.text}>
          0
        </text>
        <text x={PLOT.x1} y={PLOT.y1 + 12} textAnchor="end" fontSize={9} fill={VIZ.text}>
          {MAX_DEPTH} layers
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="top eigenvalue" value={model.lambda[0].toFixed(4)} />
        <VizStat label="second eigenvalue" value={l2.toFixed(4)} color={VIZ.yellow} />
        <VizStat label="predicted decay / layer" value={(l2 * l2).toFixed(4)} color={VIZ.yellow} />
        <VizStat
          label="measured decay / layer"
          value={depth > 0 ? liveRatio.toFixed(4) : "—"}
          color={VIZ.teal}
        />
        <VizStat
          label="energy left"
          value={`${((E[depth] / E[0]) * 100).toFixed(2)}%`}
          color={E[depth] / E[0] < 0.05 ? VIZ.rose : VIZ.teal}
        />
        <VizStat label="spread of h/√degree" value={(hi - lo).toFixed(3)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <VizSlider
          label="depth — message-passing layers"
          min={0}
          max={MAX_DEPTH}
          step={1}
          value={depth}
          onChange={(v) => setDepth(Math.round(v))}
          format={(v) => String(v)}
        />
        <VizSlider
          label="edges between the communities"
          min={1}
          max={12}
          step={1}
          value={bridges}
          onChange={(v) => setBridges(Math.round(v))}
          format={(v) => String(v)}
        />
        <VizSlider
          label="α — residual back to layer 0"
          min={0}
          max={0.3}
          step={0.05}
          value={alpha}
          onChange={setAlpha}
          format={(v) => v.toFixed(2)}
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton active={alpha === 0} onClick={() => setAlpha(0)}>
          plain GCN
        </VizButton>
        <VizButton active={alpha > 0} onClick={() => setAlpha(0.1)}>
          residual (APPNP)
        </VizButton>
      </div>
    </VizFrame>
  );
}
