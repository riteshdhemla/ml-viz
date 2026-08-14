"use client";

/**
 * The chord test and Jensen's inequality, which are the same picture.
 *
 * The lesson defines convexity by the chord (f(λx+(1−λ)y) ≤ λf(x)+(1−λ)f(y)),
 * defines it again by the Hessian (f'' ⪰ 0), and states Jensen
 * (f(E[X]) ≤ E[f(X)]) in a separate section. All three are one diagram: put
 * probability 1−λ on x and λ on y, and the point on the chord *is* E[f(X)]
 * while the point below it on the curve *is* f(E[X]). The labels in the SVG
 * say so directly.
 *
 * What ties the chord back to the Hessian is the midpoint gap. Writing the two
 * endpoints as m ± d,
 *
 *     ½(f(m+d) + f(m−d)) − f(m) = ½ f''(m) d² + O(d⁴)
 *
 * so the chord sits above the curve exactly when the curvature at the midpoint
 * is positive, and the size of the gap scales with the *square* of the chord's
 * half-width. That is why the rose band (where f'' < 0) predicts which chords
 * fail: for the two mixed-curvature functions here the relationship is not even
 * approximate, it is exact —
 *
 *     x³ : gap = 3 m d²          (f'''' = 0, so the Taylor series terminates)
 *     sin: gap = −sin(m)(1 − cos d)
 *
 * and both are negative precisely when f''(m) < 0. The readout prints the exact
 * gap next to ½f''(m)d² so the reader can watch them agree for narrow chords
 * and separate for wide ones (softplus at m=1: 0.0061 vs 0.0061 at d=0.25,
 * 0.0968 vs 0.0983 at d=1).
 *
 * |x| is kept in the picker precisely because it breaks the Hessian story: it
 * is convex with f'' = 0 *almost* everywhere, all of its curvature concentrated
 * at the single point where f'' does not exist. The readout says "undefined"
 * there rather than printing a 0 that would be a lie.
 *
 * The 1000-pair midpoint scan is the numerical test the lesson's "chord test"
 * callout describes, run for real on the same seed every time: 0 violations for
 * the three convex functions, 501/1000 for x³ and 502/1000 for sin — both ≈ ½,
 * which is not a coincidence but the probability that a uniformly random
 * midpoint lands in the concave half of a symmetric domain.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, scale, seededRandom } from "../viz-kit";

interface Fn {
  key: string;
  label: string;
  /** Second derivative; null where it does not exist. */
  dd: (x: number) => number | null;
  f: (x: number) => number;
  lo: number;
  hi: number;
  convex: boolean;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const FNS: Fn[] = [
  { key: "x2", label: "x²", f: (x) => x * x, dd: () => 2, lo: -2, hi: 2, convex: true },
  {
    key: "abs",
    label: "|x|",
    f: (x) => Math.abs(x),
    // convex, but the curvature lives entirely at the kink
    dd: (x) => (Math.abs(x) < 1e-6 ? null : 0),
    lo: -2,
    hi: 2,
    convex: true,
  },
  {
    key: "softplus",
    label: "log(1+eˣ)",
    f: (x) => Math.log1p(Math.exp(x)),
    dd: (x) => sigmoid(x) * (1 - sigmoid(x)),
    lo: -3,
    hi: 3,
    convex: true,
  },
  { key: "sin", label: "sin x", f: Math.sin, dd: (x) => -Math.sin(x), lo: -4, hi: 4, convex: false },
  { key: "x3", label: "x³", f: (x) => x ** 3, dd: (x) => 6 * x, lo: -2, hi: 2, convex: false },
  { key: "negx2", label: "−x²", f: (x) => -x * x, dd: () => -2, lo: -2, hi: 2, convex: false },
];

const SCAN_N = 1000;
const SCAN_SEED = 7;

/** The numerical chord test from the lesson: 1000 random pairs, midpoint only. */
function midpointScan(fn: Fn) {
  const rng = seededRandom(SCAN_SEED);
  let bad = 0;
  let worst = 0;
  for (let i = 0; i < SCAN_N; i++) {
    const x = fn.lo + rng() * (fn.hi - fn.lo);
    const y = fn.lo + rng() * (fn.hi - fn.lo);
    const gap = (fn.f(x) + fn.f(y)) / 2 - fn.f((x + y) / 2);
    if (gap < -1e-12) {
      bad++;
      worst = Math.max(worst, -gap);
    }
  }
  return { bad, worst };
}

const W = 560;
const H = 290;
const PAD = { l: 44, r: 14, t: 14, b: 30 };
const SAMPLES = 420;

/** Keeps a rounded-to-zero value from printing as "-0.000". */
const fmt3 = (v: number) => (Math.abs(v) < 5e-4 ? "0.000" : v.toFixed(3));

export function ConvexityViz({ className }: { className?: string }) {
  const [fnKey, setFnKey] = useState("x2");
  const fn = FNS.find((f) => f.key === fnKey)!;

  // endpoints are stored as fractions of the domain so switching function keeps them valid
  const [a, setA] = useState(0.15);
  const [b, setB] = useState(0.82);
  const [lam, setLam] = useState(0.5);

  const x1 = fn.lo + a * (fn.hi - fn.lo);
  const x2 = fn.lo + b * (fn.hi - fn.lo);

  const view = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const x = fn.lo + (i / (SAMPLES - 1)) * (fn.hi - fn.lo);
      xs.push(x);
      ys.push(fn.f(x));
    }
    const yLo = Math.min(...ys);
    const yHi = Math.max(...ys);
    const padY = (yHi - yLo) * 0.12;
    return { xs, ys, yLo: yLo - padY, yHi: yHi + padY };
  }, [fn]);

  const scan = useMemo(() => midpointScan(fn), [fn]);

  const sx = scale(fn.lo, fn.hi, PAD.l, W - PAD.r);
  const sy = scale(view.yLo, view.yHi, H - PAD.b, PAD.t);

  // the Jensen point: weight (1−λ) on x₁ and λ on x₂
  const ex = (1 - lam) * x1 + lam * x2;
  const efx = (1 - lam) * fn.f(x1) + lam * fn.f(x2); // E[f(X)] — on the chord
  const fex = fn.f(ex); // f(E[X]) — on the curve
  const gap = efx - fex;
  const holds = gap >= -1e-12;

  // Hessian cross-check, only meaningful at the midpoint of the chord
  const mid = (x1 + x2) / 2;
  const halfWidth = Math.abs(x2 - x1) / 2;
  const ddMid = fn.dd(mid);
  const midGap = (fn.f(x1) + fn.f(x2)) / 2 - fn.f(mid);
  const taylor = ddMid === null ? null : 0.5 * ddMid * halfWidth * halfWidth;

  const flipLabels = sx(ex) > W - 160;

  const curve = view.xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(view.ys[i]).toFixed(1)}`)
    .join(" ");

  // contiguous stretches where f'' < 0, drawn as one band each
  const concave = useMemo(() => {
    const bands: [number, number][] = [];
    let start: number | null = null;
    for (let i = 0; i < SAMPLES; i++) {
      const x = fn.lo + (i / (SAMPLES - 1)) * (fn.hi - fn.lo);
      const d = fn.dd(x);
      const neg = d !== null && d < 0;
      if (neg && start === null) start = x;
      if (!neg && start !== null) {
        bands.push([start, x]);
        start = null;
      }
    }
    if (start !== null) bands.push([start, fn.hi]);
    return bands;
  }, [fn]);

  return (
    <VizFrame
      title="One chord, three definitions"
      caption="Drag the two endpoints and the weight λ. The point on the chord is E[f(X)] for the two-point distribution that puts 1−λ on x₁ and λ on x₂; the point below it on the curve is f(E[X]). Convexity, Jensen's inequality and 'the chord lies above the graph' are three descriptions of the same vertical gap. The rose band marks where f″ < 0."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {FNS.map((f) => (
          <VizButton key={f.key} active={f.key === fnKey} onClick={() => setFnKey(f.key)}>
            {f.label}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* where the curvature is negative */}
        {concave.map(([lo, hi], i) => (
          <rect
            key={i}
            x={sx(lo)}
            y={PAD.t}
            width={sx(hi) - sx(lo)}
            height={H - PAD.b - PAD.t}
            fill={VIZ.rose}
            opacity={0.09}
          />
        ))}

        {/* axes */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={H - PAD.b}
          y2={H - PAD.b}
          stroke={VIZ.axis}
          strokeWidth={1}
        />
        {view.yLo < 0 && view.yHi > 0 && (
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke={VIZ.grid} strokeWidth={1} />
        )}
        <text x={sx(fn.lo)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          {fn.lo}
        </text>
        <text x={sx(fn.hi)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          {fn.hi}
        </text>
        <text x={PAD.l - 6} y={sy(view.yHi) + 10} textAnchor="end" fontSize={9} fill={VIZ.text}>
          {view.yHi.toFixed(1)}
        </text>
        <text x={PAD.l - 6} y={sy(view.yLo) - 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
          {view.yLo.toFixed(1)}
        </text>

        <path d={curve} fill="none" stroke={VIZ.brandLight} strokeWidth={2.2} />

        {/* the chord */}
        <line
          x1={sx(x1)}
          y1={sy(fn.f(x1))}
          x2={sx(x2)}
          y2={sy(fn.f(x2))}
          stroke={holds ? VIZ.teal : VIZ.rose}
          strokeWidth={2}
        />
        {[x1, x2].map((x) => (
          <circle key={x} cx={sx(x)} cy={sy(fn.f(x))} r={4} fill={holds ? VIZ.teal : VIZ.rose} />
        ))}

        {/* the gap Jensen is about */}
        <line
          x1={sx(ex)}
          y1={sy(efx)}
          x2={sx(ex)}
          y2={sy(fex)}
          stroke={holds ? VIZ.teal : VIZ.rose}
          strokeWidth={3}
        />
        <line
          x1={sx(ex)}
          y1={sy(fex)}
          x2={sx(ex)}
          y2={H - PAD.b}
          stroke={VIZ.axis}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={sx(ex)} cy={sy(efx)} r={4.5} fill={VIZ.textBright} />
        <circle cx={sx(ex)} cy={sy(fex)} r={4.5} fill={VIZ.brand} />

        {/* Labels sit on whichever side of the chord has room, flipping to the
            left near the right edge, and carry a card-coloured halo so they stay
            readable where they cross the curve. */}
        {(
          [
            [efx, efx >= fex ? -5 : 12, VIZ.textBright, "E[f(X)]"],
            [fex, efx >= fex ? 13 : -5, VIZ.brand, "f(E[X])"],
          ] as const
        ).map(([v, dy, col, name]) => (
          <text
            key={name}
            x={sx(ex) + (flipLabels ? -9 : 9)}
            y={sy(v) + dy}
            textAnchor={flipLabels ? "end" : "start"}
            fontSize={10}
            fill={col}
            stroke={VIZ.card}
            strokeWidth={3}
            paintOrder="stroke"
          >
            {name} = {fmt3(v)}
          </text>
        ))}
        <text x={sx(ex)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          E[X] = {ex.toFixed(2)}
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        <VizStat
          label="E[f(X)] − f(E[X])"
          value={gap.toFixed(4)}
          color={holds ? VIZ.teal : VIZ.rose}
        />
        <VizStat
          label="Jensen"
          value={holds ? "holds" : "violated"}
          color={holds ? VIZ.teal : VIZ.rose}
        />
        <VizStat label="midpoint gap" value={midGap.toFixed(4)} />
        <VizStat
          label="½·f″(m)·d²"
          value={taylor === null ? "f″ undefined" : taylor.toFixed(4)}
          color={taylor === null ? VIZ.yellow : VIZ.textBright}
        />
        <VizStat
          label={`midpoint scan (${SCAN_N} pairs)`}
          value={
            scan.bad === 0
              ? "0 violations"
              : `${scan.bad} violations, worst ${scan.worst.toFixed(2)}`
          }
          color={scan.bad === 0 ? VIZ.teal : VIZ.rose}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <VizSlider
          label="x₁"
          min={0}
          max={1}
          step={0.005}
          value={a}
          onChange={setA}
          format={() => x1.toFixed(2)}
        />
        <VizSlider
          label="x₂"
          min={0}
          max={1}
          step={0.005}
          value={b}
          onChange={setB}
          format={() => x2.toFixed(2)}
        />
        <VizSlider
          label="λ — weight on x₂"
          min={0}
          max={1}
          step={0.01}
          value={lam}
          onChange={setLam}
          format={(v) => v.toFixed(2)}
        />
      </div>
    </VizFrame>
  );
}
