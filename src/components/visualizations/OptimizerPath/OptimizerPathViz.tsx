"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, useAnimationLoop } from "../viz-kit";

/**
 * SGD vs Momentum vs Adam on an ill-conditioned quadratic bowl
 *   f(x, y) = ½(x² + κ·y²),   ∇f = (x, κ·y),   min at (0, 0)
 *
 * The large κ makes the y-axis far steeper than the x-axis — a "ravine". Plain
 * SGD has to use a tiny step or it oscillates across the steep walls while
 * crawling along the floor; momentum cancels the cross-valley oscillation; Adam
 * rescales each axis so both move at a healthy pace. The three precomputed paths
 * are replayed step-by-step so you can watch the zig-zag vs the smooth descent.
 */

const W = 480;
const H = 320;
const M = { top: 14, right: 14, bottom: 30, left: 36 };

const X_DOM = 5; // x ∈ [-X_DOM, X_DOM]
const Y_DOM = 2; // y ∈ [-Y_DOM, Y_DOM]
const START: [number, number] = [-4.3, 1.5];
const STEPS = 90;

type Opt = "sgd" | "momentum" | "adam";

const OPT_META: Record<Opt, { label: string; color: string }> = {
  sgd: { label: "SGD", color: VIZ.rose },
  momentum: { label: "Momentum", color: VIZ.yellow },
  adam: { label: "Adam", color: VIZ.teal },
};

/** Roll out one optimizer on the quadratic bowl, returning the full trajectory. */
function rollout(opt: Opt, kappa: number): [number, number][] {
  let x = START[0];
  let y = START[1];
  const grad = (): [number, number] => [x, kappa * y];
  const path: [number, number][] = [[x, y]];

  // per-optimizer hyperparameters tuned so all three are stable on this bowl
  const lrSgd = 1.9 / kappa; // y-step near the stability edge → visible zig-zag
  const lrMom = 1.0 / kappa;
  const beta = 0.9;
  const lrAdam = 0.28;
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;

  let vx = 0,
    vy = 0; // momentum velocity / Adam first moment
  let sx = 0,
    sy = 0; // Adam second moment

  for (let t = 1; t <= STEPS; t++) {
    const [gx, gy] = grad();
    if (opt === "sgd") {
      x -= lrSgd * gx;
      y -= lrSgd * gy;
    } else if (opt === "momentum") {
      vx = beta * vx + gx;
      vy = beta * vy + gy;
      x -= lrMom * vx;
      y -= lrMom * vy;
    } else {
      vx = b1 * vx + (1 - b1) * gx;
      vy = b1 * vy + (1 - b1) * gy;
      sx = b2 * sx + (1 - b2) * gx * gx;
      sy = b2 * sy + (1 - b2) * gy * gy;
      const mhx = vx / (1 - b1 ** t);
      const mhy = vy / (1 - b1 ** t);
      const vhx = sx / (1 - b2 ** t);
      const vhy = sy / (1 - b2 ** t);
      x -= (lrAdam * mhx) / (Math.sqrt(vhx) + eps);
      y -= (lrAdam * mhy) / (Math.sqrt(vhy) + eps);
    }
    // keep the drawing inside the frame even if a step overshoots
    x = Math.max(-X_DOM, Math.min(X_DOM, x));
    y = Math.max(-Y_DOM, Math.min(Y_DOM, y));
    path.push([x, y]);
  }
  return path;
}

const ALL_OPTS: Opt[] = ["sgd", "momentum", "adam"];

export function OptimizerPathViz({ className }: { className?: string }) {
  const [kappa, setKappa] = useState(20);
  const [shown, setShown] = useState<Record<Opt, boolean>>({ sgd: true, momentum: true, adam: true });
  const [t, setT] = useState(STEPS);
  const [playing, setPlaying] = useState(false);
  const acc = useRef(0); // fractional-step accumulator for animation

  const paths = useMemo(() => {
    const out = {} as Record<Opt, [number, number][]>;
    for (const o of ALL_OPTS) out[o] = rollout(o, kappa);
    return out;
  }, [kappa]);

  useAnimationLoop((dt) => {
    const next = acc.current + dt * 28; // ~28 steps / second
    const whole = Math.floor(next);
    acc.current = next - whole;
    if (whole > 0) {
      setT((prev) => {
        const nt = prev + whole;
        if (nt >= STEPS) setPlaying(false);
        return Math.min(STEPS, nt);
      });
    }
  }, playing);

  // Rounded to 1/100 px. The optimizer paths are accumulated float arithmetic,
  // which is not required to agree to the last bit between the engine that
  // renders on the server and the one in the browser; full-precision
  // coordinates therefore trip a hydration mismatch. Sub-pixel either way.
  const round = (v: number) => Math.round(v * 100) / 100;
  const px = (x: number) => round(M.left + ((x + X_DOM) / (2 * X_DOM)) * (W - M.left - M.right));
  const py = (y: number) => round(M.top + ((Y_DOM - y) / (2 * Y_DOM)) * (H - M.top - M.bottom));

  const loss = (p: [number, number]) => 0.5 * (p[0] * p[0] + kappa * p[1] * p[1]);

  // elliptical contour level sets of ½(x² + κy²) = c  →  x²/(2c) + y²/(2c/κ) = 1
  const contours = [0.3, 1, 2.5, 5, 9, 15, 24].map((c) => ({
    rx: px(Math.sqrt(2 * c)) - px(0),
    ry: py(0) - py(Math.sqrt((2 * c) / kappa)),
  }));

  const start = () => {
    if (t >= STEPS) setT(0);
    acc.current = 0;
    setPlaying(true);
  };

  return (
    <VizFrame
      className={className}
      title="Optimizers on a ravine: SGD vs Momentum vs Adam"
      caption="The loss is an ill-conditioned bowl ½(x² + κy²): steep across the valley, shallow along it. SGD must creep or it zig-zags off the steep walls (rose). Momentum (yellow) cancels the cross-valley oscillation by accumulating velocity. Adam (teal) rescales each axis by its own gradient history, so both directions descend at a healthy rate. Raise κ to sharpen the ravine and widen the gap."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="optimizer trajectories on a ravine">
        {/* contour ellipses */}
        {contours.map((c, i) => (
          <ellipse key={i} cx={px(0)} cy={py(0)} rx={c.rx} ry={c.ry} fill="none" stroke={VIZ.grid} strokeWidth={1} />
        ))}
        {/* axes through the minimum */}
        <line x1={px(-X_DOM)} y1={py(0)} x2={px(X_DOM)} y2={py(0)} stroke={VIZ.axis} strokeWidth={1} opacity={0.5} />
        <line x1={px(0)} y1={py(-Y_DOM)} x2={px(0)} y2={py(Y_DOM)} stroke={VIZ.axis} strokeWidth={1} opacity={0.5} />
        {/* minimum */}
        <circle cx={px(0)} cy={py(0)} r={4} fill="none" stroke={VIZ.textBright} strokeWidth={1.5} />

        {/* trajectories */}
        {ALL_OPTS.filter((o) => shown[o]).map((o) => {
          const pts = paths[o].slice(0, t + 1);
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(" ");
          const head = pts[pts.length - 1];
          return (
            <g key={o}>
              <path d={d} fill="none" stroke={OPT_META[o].color} strokeWidth={1.8} opacity={0.9} />
              {pts.map((p, i) => (
                <circle key={i} cx={px(p[0])} cy={py(p[1])} r={1.4} fill={OPT_META[o].color} opacity={0.55} />
              ))}
              <circle cx={px(head[0])} cy={py(head[1])} r={4} fill={OPT_META[o].color} stroke="#0f1117" strokeWidth={1.2} />
            </g>
          );
        })}

        {/* start marker */}
        <circle cx={px(START[0])} cy={py(START[1])} r={3} fill={VIZ.textBright} />
        <text x={px(START[0]) + 6} y={py(START[1]) + 3} fill={VIZ.text} fontSize={10}>start</text>
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => (playing ? setPlaying(false) : start())} active={playing}>
          {playing ? "Pause" : t >= STEPS ? "Replay" : "Play"}
        </VizButton>
        <VizButton onClick={() => { setPlaying(false); setT(0); acc.current = 0; }}>Reset</VizButton>
        <span className="w-px self-stretch bg-surface-border mx-1" />
        {ALL_OPTS.map((o) => (
          <VizButton key={o} onClick={() => setShown((s) => ({ ...s, [o]: !s[o] }))} active={shown[o]}>
            {OPT_META[o].label}
          </VizButton>
        ))}
      </div>

      <div className="mt-3 mb-3">
        <VizSlider label="condition number κ (ravine sharpness)" min={4} max={40} step={1} value={kappa} onChange={(v) => { setKappa(v); setT(STEPS); setPlaying(false); }} />
        <div className="mt-3">
          <VizSlider label="step" min={0} max={STEPS} step={1} value={t} onChange={(v) => { setT(v); setPlaying(false); }} format={(v) => `${v} / ${STEPS}`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {ALL_OPTS.filter((o) => shown[o]).map((o) => (
          <VizStat key={o} label={`${OPT_META[o].label} loss`} value={loss(paths[o][t]).toFixed(3)} color={OPT_META[o].color} />
        ))}
      </div>
    </VizFrame>
  );
}
