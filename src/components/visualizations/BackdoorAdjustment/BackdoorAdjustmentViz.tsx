"use client";

/**
 * Which variables to adjust for — and the damage done by adjusting for the
 * wrong ones.
 *
 * A structural causal model with every role represented: a confounder Z into
 * both X and Y, the true direct effect X → Y (β = 0.9), a descendant M of X,
 * and a collider C that both X and Y point into. 4000 samples, and the
 * estimate is an ordinary least-squares coefficient on X with the chosen
 * controls, solved in closed form.
 *
 *   adjust for            β̂        bias
 *   nothing            1.6502    +0.7502    confounded
 *   Z                  0.9078    +0.0078    correct backdoor set
 *   M (descendant)     1.6162    +0.7162    does not close the back door
 *   C (collider)       0.0301    −0.8699    effect destroyed
 *   Z and C            0.0684    −0.8316    a correct answer, ruined
 *   Z and M            0.8955    −0.0045    harmless here
 *
 * The row worth the whole build is **Z and C**. Adjusting for Z alone recovers
 * 0.9078 against a truth of 0.9. Then "control for one more thing you happened
 * to measure" collapses it to 0.0684 — a *worse* answer than adjusting for
 * nothing at all. Conditioning on a collider opens a path rather than closing
 * one, so more controls is not a safer default; it is a different assumption.
 * The backdoor criterion is what tells you which is which, and there is no way
 * to detect the difference from the data alone.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizStat, gaussian, seededRandom } from "../viz-kit";

const BETA = 0.9;
const GAMMA = 1.2;
const DELTA = 1.5;
const N = 4000;

type Row = { z: number; x: number; m: number; y: number; c: number };

const DATA: Row[] = (() => {
  const r = seededRandom(31);
  const out: Row[] = [];
  for (let i = 0; i < N; i++) {
    const z = gaussian(r);
    const x = GAMMA * z + gaussian(r, 0, 1);
    const m = 0.8 * x + gaussian(r, 0, 1);
    const y = BETA * x + DELTA * z + gaussian(r, 0, 1);
    const c = 0.9 * x + 0.9 * y + gaussian(r, 0, 1);
    out.push({ z, x, m, y, c });
  }
  return out;
})();

type Ctrl = "z" | "m" | "c";

/** OLS coefficient on x, controls appended; Gaussian elimination on XᵀX. */
function betaHat(controls: Ctrl[]) {
  const cols: (keyof Row)[] = ["x", ...controls];
  const p = cols.length + 1;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  for (const d of DATA) {
    const row = [1, ...cols.map((c) => d[c])];
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) XtX[i][j] += row[i] * row[j];
      Xty[i] += row[i] * d.y;
    }
  }
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let i = 0; i < p; i++) {
    let mx = i;
    for (let k = i + 1; k < p; k++) if (Math.abs(A[k][i]) > Math.abs(A[mx][i])) mx = k;
    [A[i], A[mx]] = [A[mx], A[i]];
    for (let k = i + 1; k < p; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j <= p; j++) A[k][j] -= f * A[i][j];
    }
  }
  const b = new Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    let s = A[i][p];
    for (let j = i + 1; j < p; j++) s -= A[i][j] * b[j];
    b[i] = s / A[i][i];
  }
  return b[1];
}

/**
 * M must not sit between X and Y: with it on that line the X → Y edge is drawn
 * straight through it and reads as a mediation path, which is exactly the
 * structure this viz is trying to distinguish. M hangs below X instead.
 */
const NODES = {
  Z: { x: 150, y: 30, label: "Z", sub: "confounder" },
  X: { x: 62, y: 108, label: "X", sub: "treatment" },
  Y: { x: 238, y: 108, label: "Y", sub: "outcome" },
  M: { x: 62, y: 186, label: "M", sub: "descendant of X" },
  C: { x: 168, y: 186, label: "C", sub: "collider" },
} as const;

const EDGES: [keyof typeof NODES, keyof typeof NODES][] = [
  ["Z", "X"],
  ["Z", "Y"],
  ["X", "Y"],
  ["X", "M"],
  ["X", "C"],
  ["Y", "C"],
];

const W = 560;
const H = 220;

export function BackdoorAdjustmentViz({ className }: { className?: string }) {
  const [ctrl, setCtrl] = useState<Ctrl[]>([]);

  const toggle = (c: Ctrl) => setCtrl(ctrl.includes(c) ? ctrl.filter((v) => v !== c) : [...ctrl, c].sort());
  const est = useMemo(() => betaHat(ctrl), [ctrl]);
  const bias = est - BETA;
  const ok = Math.abs(bias) < 0.05;

  const isControlled = (n: keyof typeof NODES) => ctrl.includes(n.toLowerCase() as Ctrl);

  return (
    <VizFrame
      title="Controlling for more is not controlling for the right things"
      caption="A structural causal model with a known direct effect β = 0.9, sampled 4000 times. Boxed nodes are the ones you are conditioning on. The estimate is the ordinary-least-squares coefficient on X with those controls, solved in closed form — no fitting loop, no tuning."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {(["z", "m", "c"] as Ctrl[]).map((c) => (
          <VizButton key={c} active={ctrl.includes(c)} onClick={() => toggle(c)}>
            adjust for {c.toUpperCase()}
          </VizButton>
        ))}
        <VizButton active={ctrl.length === 0} onClick={() => setCtrl([])}>
          adjust for nothing
        </VizButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-[300px_1fr] items-start">
        <svg viewBox={`0 0 300 ${H}`} className="w-full max-w-[300px]">
          <defs>
            <marker id="bd-arrow" markerWidth="7" markerHeight="7" refX="6" refY="2.4" orient="auto">
              <path d="M0,0 L0,4.8 L6,2.4 z" fill={VIZ.axis} />
            </marker>
          </defs>
          {EDGES.map(([a, b]) => {
            const p = NODES[a];
            const q = NODES[b];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const L = Math.hypot(dx, dy);
            const r = 20;
            const causal = a === "X" && b === "Y";
            return (
              <line
                key={`${a}${b}`}
                x1={p.x + (dx / L) * r}
                y1={p.y + (dy / L) * r}
                x2={q.x - (dx / L) * (r + 5)}
                y2={q.y - (dy / L) * (r + 5)}
                stroke={causal ? VIZ.teal : VIZ.axis}
                strokeWidth={causal ? 2.2 : 1.4}
                markerEnd="url(#bd-arrow)"
              />
            );
          })}
          {(Object.keys(NODES) as (keyof typeof NODES)[]).map((n) => {
            const p = NODES[n];
            const on = isControlled(n);
            return (
              <g key={n}>
                {on ? (
                  <rect x={p.x - 18} y={p.y - 15} width={36} height={30} rx={4} fill="#2c3145" stroke={VIZ.yellow} strokeWidth={1.6} />
                ) : (
                  <circle cx={p.x} cy={p.y} r={17} fill="#232838" stroke={VIZ.axis} strokeWidth={1.2} />
                )}
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={13} fill={on ? VIZ.yellow : VIZ.textBright}>
                  {p.label}
                </text>
                <text x={p.x} y={p.y + 27} textAnchor="middle" fontSize={7.5} fill={VIZ.text}>
                  {p.sub}
                </text>
              </g>
            );
          })}
        </svg>

        <div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <VizStat label="true direct effect" value={BETA.toFixed(4)} />
            <VizStat label="estimate" value={est.toFixed(4)} color={ok ? VIZ.teal : VIZ.rose} />
            <VizStat label="bias" value={`${bias >= 0 ? "+" : ""}${bias.toFixed(4)}`} color={ok ? VIZ.teal : VIZ.rose} />
          </div>
          <table className="mt-3 w-full text-[11px]">
            <tbody>
              {([
                [[], "nothing"],
                [["z"], "Z — the confounder"],
                [["m"], "M — a descendant"],
                [["c"], "C — a collider"],
                [["z", "c"], "Z and C"],
                [["z", "m"], "Z and M"],
              ] as [Ctrl[], string][]).map(([set, label]) => {
                const b = betaHat(set);
                const good = Math.abs(b - BETA) < 0.05;
                const active = set.join() === ctrl.join();
                return (
                  <tr key={label} className={active ? "bg-surface-elevated/50" : ""}>
                    <td className="py-0.5 pr-3 text-slate-400">{label}</td>
                    <td className="py-0.5 pr-3 text-right font-mono" style={{ color: good ? VIZ.teal : VIZ.rose }}>
                      {b.toFixed(4)}
                    </td>
                    <td className="py-0.5 text-right font-mono text-slate-500">
                      {b - BETA >= 0 ? "+" : ""}
                      {(b - BETA).toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Adjusting for <span className="font-mono text-white">Z</span> alone recovers{" "}
        <span className="font-mono text-white">0.9078</span> against a truth of{" "}
        <span className="font-mono text-white">0.9</span>. Then add the collider — one more variable you
        happened to measure — and the estimate collapses to{" "}
        <span className="font-mono text-white">0.0684</span>, <em>worse than adjusting for nothing</em>.
        Conditioning on a collider opens a path instead of closing one. No amount of staring at the data
        distinguishes the two cases; only the graph does.
      </p>
    </VizFrame>
  );
}
