"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  useAnimationLoop,
  seededRandom,
  gaussian,
  scale,
} from "../viz-kit";

/**
 * Contrastive embedding-space visualisation.
 *
 * An anchor sits at the centre of a 2D plane. One positive example sits nearby,
 * and several negatives are scattered around. We run a tiny animated gradient
 * descent driven by the InfoNCE loss
 *
 *   L = -log( exp(sim(a, p) / τ) / Σ_j exp(sim(a, x_j) / τ) )
 *
 * where similarity is the dot product on L2-normalised vectors (cosine sim).
 * The positive is pulled toward the anchor; the negatives are pushed away. The
 * temperature slider τ rescales the contrastive force — small τ sharpens the
 * pull/push, large τ relaxes it.
 *
 * Mirrors the structure of RewardModelViz: SVG canvas, slider row, VizStat
 * cards underneath.
 */

// SVG canvas geometry.
const W = 520;
const H = 320;
const PAD = 36;
const X_MIN = -2.5;
const X_MAX = 2.5;

const N_NEG = 5;
const ANCHOR: Pt = { x: 0, y: 0 };

interface Pt {
  x: number;
  y: number;
}

function clone(p: Pt): Pt {
  return { x: p.x, y: p.y };
}

function norm(p: Pt) {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

function softmax(logits: number[]): number[] {
  const m = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - m));
  const s = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / s);
}

/** Initial scene: positive near anchor, negatives scattered around. */
function initialScene(): { pos: Pt; negs: Pt[] } {
  const rng = seededRandom(7);
  const pos: Pt = { x: 1.4, y: 0.9 };
  const negs: Pt[] = [];
  // Spread negatives around a ring at varying radii so a few are deceptively
  // close to the anchor (the "hard negatives" of this little world).
  for (let i = 0; i < N_NEG; i++) {
    const angle = (i / N_NEG) * Math.PI * 2 + 0.6;
    const r = 1.2 + gaussian(rng, 0, 0.35);
    negs.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  // Tuck one negative deliberately close to the positive — a hard negative.
  negs[2] = { x: 1.1, y: 1.3 };
  return { pos, negs };
}

export function ContrastiveViz({ className }: { className?: string }) {
  const [temperature, setTemperature] = useState(0.2);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0); // forces re-render on each frame

  // Mutable scene held in a ref so animation can mutate in place.
  const sceneRef = useRef<{ pos: Pt; negs: Pt[] }>(initialScene());

  const sx = useMemo(() => scale(X_MIN, X_MAX, PAD, W - PAD), []);
  const sy = useMemo(() => scale(X_MIN, X_MAX, H - PAD, PAD), []);

  /** Reset the scene back to its initial positions. */
  const reset = useCallback(() => {
    sceneRef.current = initialScene();
    setRunning(false);
    setTick((t) => t + 1);
  }, []);

  /** One step of contrastive gradient descent. */
  const step = useCallback(
    (dt: number) => {
      const { pos, negs } = sceneRef.current;
      const tau = Math.max(temperature, 1e-3);
      const all = [pos, ...negs];

      // Logits l_j = sim(anchor, x_j) / τ — anchor is fixed at origin so we
      // normalise vectors and treat the anchor direction as itself (we use
      // cosSim between the moving point and a reference direction — here the
      // anchor sits at (0,0) so cosine similarity is undefined; instead we
      // treat the anchor as the *origin* and use sim = -||a - x|| as a proxy
      // that has the same pull/push qualitative behaviour for the viz).
      //
      // To stay faithful to InfoNCE we model each candidate as a unit vector
      // pointing from the anchor toward the candidate, and define the
      // similarity as 1 - ||x|| (so closer points = higher similarity). This
      // gives the canonical "pull positives in, push negatives out" gradient.
      const sims = all.map((p) => 1 - norm({ x: p.x - ANCHOR.x, y: p.y - ANCHOR.y }));
      const logits = sims.map((s) => s / tau);
      const probs = softmax(logits);

      // Step size in scene units per second.
      const lr = 1.6;

      // Positive: gradient pulls it toward the anchor with weight (1 - p_pos).
      const dPos = clone(pos);
      const dxPos = pos.x - ANCHOR.x;
      const dyPos = pos.y - ANCHOR.y;
      const dPosNorm = Math.sqrt(dxPos * dxPos + dyPos * dyPos) + 1e-9;
      const wPos = 1 - probs[0]; // residual: how far from "positive wins"
      dPos.x -= (dxPos / dPosNorm) * lr * wPos * dt;
      dPos.y -= (dyPos / dPosNorm) * lr * wPos * dt;
      // Don't let the positive get glued to the anchor (clamp min radius).
      const newPosNorm = Math.sqrt(dPos.x * dPos.x + dPos.y * dPos.y);
      if (newPosNorm < 0.18) {
        const k = 0.18 / Math.max(newPosNorm, 1e-6);
        dPos.x *= k;
        dPos.y *= k;
      }

      // Negatives: each is pushed *away* from the anchor with weight p_j.
      const newNegs: Pt[] = negs.map((n, i) => {
        const out = clone(n);
        const dx = n.x - ANCHOR.x;
        const dy = n.y - ANCHOR.y;
        const dN = Math.sqrt(dx * dx + dy * dy) + 1e-9;
        const w = probs[i + 1];
        out.x += (dx / dN) * lr * w * dt;
        out.y += (dy / dN) * lr * w * dt;
        // Clamp so points don't fly off the canvas.
        const nNorm = Math.sqrt(out.x * out.x + out.y * out.y);
        const maxR = 2.3;
        if (nNorm > maxR) {
          const k = maxR / nNorm;
          out.x *= k;
          out.y *= k;
        }
        return out;
      });

      sceneRef.current = { pos: dPos, negs: newNegs };
    },
    [temperature]
  );

  useAnimationLoop((dt) => {
    // Clamp dt so a tab-switch pause can't teleport everything.
    const clamped = Math.min(dt, 0.05);
    step(clamped);
    setTick((t) => t + 1);
  }, running);

  // ── Derived readouts (recomputed every render — cheap, < 10 points) ───
  const { pos, negs } = sceneRef.current;
  const allPts = [pos, ...negs];
  const tau = Math.max(temperature, 1e-3);
  const sims = allPts.map((p) => 1 - norm({ x: p.x - ANCHOR.x, y: p.y - ANCHOR.y }));
  const logits = sims.map((s) => s / tau);
  const probs = softmax(logits);
  const loss = -Math.log(Math.max(probs[0], 1e-12));
  const simPos = sims[0];
  const simNegMean = sims.slice(1).reduce((a, b) => a + b, 0) / N_NEG;
  // Suppress unused-variable warning for `tick` — it's the rerender trigger.
  void tick;

  return (
    <VizFrame
      className={className}
      title="Contrastive learning: pull positives in, push negatives out"
      caption="An anchor sits at the origin (★). The positive example (●) shares a class with the anchor — gradient descent on the InfoNCE loss pulls it toward the origin. The negatives (●) are pushed outward in proportion to how confidently the model currently treats them as positives. Drop the temperature τ to sharpen the contrast; raise it and the forces relax."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="2D embedding space with an anchor, positive, and negatives moving under contrastive gradient descent"
      >
        {/* Background grid lines at integer ticks. */}
        {[-2, -1, 0, 1, 2].map((g) => (
          <g key={`gx-${g}`}>
            <line
              x1={sx(g)}
              x2={sx(g)}
              y1={PAD}
              y2={H - PAD}
              stroke={VIZ.grid}
              strokeWidth={0.5}
              strokeDasharray={g === 0 ? undefined : "3 3"}
            />
            <line
              x1={PAD}
              x2={W - PAD}
              y1={sy(g)}
              y2={sy(g)}
              stroke={VIZ.grid}
              strokeWidth={0.5}
              strokeDasharray={g === 0 ? undefined : "3 3"}
            />
          </g>
        ))}

        {/* Axis labels. */}
        <text
          x={W - PAD + 4}
          y={sy(0) + 4}
          fill={VIZ.text}
          fontSize={10}
          fontFamily="monospace"
        >
          x₁
        </text>
        <text
          x={sx(0) - 4}
          y={PAD - 4}
          fill={VIZ.text}
          fontSize={10}
          fontFamily="monospace"
          textAnchor="end"
        >
          x₂
        </text>

        {/* Pull arrow: anchor ← positive (teal). */}
        <line
          x1={sx(pos.x)}
          y1={sy(pos.y)}
          x2={sx(ANCHOR.x)}
          y2={sy(ANCHOR.y)}
          stroke={VIZ.brand}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          opacity={0.7}
        />

        {/* Push arrows: anchor → negative (rose). */}
        {negs.map((n, i) => (
          <line
            key={`neg-line-${i}`}
            x1={sx(ANCHOR.x)}
            y1={sy(ANCHOR.y)}
            x2={sx(n.x)}
            y2={sy(n.y)}
            stroke={VIZ.rose}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.45}
          />
        ))}

        {/* Negatives. */}
        {negs.map((n, i) => (
          <g key={`neg-${i}`}>
            <circle cx={sx(n.x)} cy={sy(n.y)} r={7} fill={VIZ.rose} />
            <text
              x={sx(n.x)}
              y={sy(n.y) - 11}
              fill={VIZ.rose}
              fontSize={9}
              textAnchor="middle"
              fontFamily="monospace"
            >
              n{i + 1}
            </text>
          </g>
        ))}

        {/* Positive. */}
        <circle cx={sx(pos.x)} cy={sy(pos.y)} r={8} fill={VIZ.brand} />
        <text
          x={sx(pos.x)}
          y={sy(pos.y) - 12}
          fill={VIZ.brand}
          fontSize={10}
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight={600}
        >
          positive
        </text>

        {/* Anchor — drawn last so it sits on top. */}
        <g transform={`translate(${sx(ANCHOR.x)}, ${sy(ANCHOR.y)})`}>
          <circle r={10} fill={VIZ.card} stroke={VIZ.textBright} strokeWidth={1.5} />
          <text
            x={0}
            y={4}
            fill={VIZ.textBright}
            fontSize={12}
            textAnchor="middle"
            fontWeight={700}
          >
            ★
          </text>
          <text
            x={0}
            y={22}
            fill={VIZ.textBright}
            fontSize={10}
            textAnchor="middle"
            fontFamily="monospace"
          >
            anchor
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-2 mt-3">
        <VizButton onClick={() => setRunning((r) => !r)} active={running}>
          {running ? "Pause" : "Play"}
        </VizButton>
        <VizButton onClick={reset}>Reset</VizButton>
      </div>

      <div className="mt-3">
        <VizSlider
          label="temperature τ"
          min={0.05}
          max={1.0}
          step={0.01}
          value={temperature}
          onChange={setTemperature}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat
          label="InfoNCE loss"
          value={loss.toFixed(3)}
          color={loss < 0.5 ? VIZ.teal : loss < 1.5 ? VIZ.yellow : VIZ.rose}
        />
        <VizStat
          label="sim(anchor, positive)"
          value={simPos.toFixed(3)}
          color={VIZ.brand}
        />
        <VizStat
          label="mean sim(anchor, neg)"
          value={simNegMean.toFixed(3)}
          color={VIZ.rose}
        />
        <VizStat
          label="P(positive | softmax)"
          value={`${(probs[0] * 100).toFixed(1)}%`}
          color={probs[0] > 0.5 ? VIZ.teal : VIZ.yellow}
        />
      </div>
    </VizFrame>
  );
}
