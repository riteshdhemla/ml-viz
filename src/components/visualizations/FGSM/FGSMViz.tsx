"use client";

/**
 * FGSM on a real (small) trained classifier, and the reason it is a *dimension*
 * story rather than an image story.
 *
 * A logistic regression is trained here in the browser on 300 synthetic 12×12
 * two-class images (400 full-batch steps, weight decay 1e-4, 100% train
 * accuracy). Nothing is hand-set: w, the margin, and every number below come
 * out of that fit.
 *
 * Because the model is linear, FGSM is exactly analysable. The perturbation
 * η = ε·sign(w) shifts the logit by
 *
 *     w·η = ε · Σ|w_i| = ε · ‖w‖₁
 *
 * which the panel checks against the measured shift on every frame (they agree
 * until pixel clipping bites). So the budget needed to flip a prediction is
 *
 *     ε* = |margin| / ‖w‖₁
 *
 * **And on this model that is 43/255 — nothing flips at the canonical 8/255.**
 * That is the honest result and it is the interesting one: a 144-pixel model is
 * not meaningfully vulnerable to an imperceptible attack. What makes real
 * models fragile is the denominator. ‖w‖₁ grows roughly linearly with the pixel
 * count at fixed mean weight, so the same model shape at 224×224×3 has
 * ‖w‖₁ ≈ 50,000 and ε* ≈ 0.035/255 — three orders of magnitude below
 * perceptibility. The dimension slider walks that curve.
 *
 * This is Goodfellow's original argument, and stating it as a dimension effect
 * is what stops "adversarial examples" from sounding like a property of images.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, gaussian, seededRandom } from "../viz-kit";

const S = 12;
const D = S * S;
const N = 300;
const ITERS = 400;
const LR = 0.5;
const WD = 1e-4;

function makeSet(seed: number) {
  const rng = seededRandom(seed);
  const X: number[][] = [];
  const Y: number[] = [];
  for (let n = 0; n < N; n++) {
    const y = n % 2;
    const img = new Array(D).fill(0);
    const jitter = Math.floor(rng() * 3) - 1;
    for (let r = 0; r < S; r++)
      for (let c = 0; c < S; c++) {
        let v = 0.18 + gaussian(rng, 0, 0.1);
        if (y === 0 && c + jitter >= 5 && c + jitter <= 6) v += 0.55; // vertical bar
        if (y === 1 && r + jitter >= 5 && r + jitter <= 6) v += 0.55; // horizontal bar
        img[r * S + c] = Math.max(0, Math.min(1, v));
      }
    X.push(img);
    Y.push(y);
  }
  return { X, Y };
}

/** Full-batch logistic regression. Real fit, not hand-set weights. */
const MODEL = (() => {
  const { X, Y } = makeSet(7);
  const w = new Array(D).fill(0);
  let b = 0;
  for (let it = 0; it < ITERS; it++) {
    const gw = new Array(D).fill(0);
    let gb = 0;
    for (let n = 0; n < N; n++) {
      let z = b;
      for (let i = 0; i < D; i++) z += w[i] * X[n][i];
      const e = 1 / (1 + Math.exp(-z)) - Y[n];
      for (let i = 0; i < D; i++) gw[i] += (e * X[n][i]) / N;
      gb += e / N;
    }
    for (let i = 0; i < D; i++) w[i] -= LR * (gw[i] + WD * w[i]);
    b -= LR * gb;
  }
  const l1 = w.reduce((a, v) => a + Math.abs(v), 0);
  return { w, b, l1, meanAbs: l1 / D };
})();

const sig = (z: number) => 1 / (1 + Math.exp(-z));
const logitOf = (x: number[]) => {
  let z = MODEL.b;
  for (let i = 0; i < D; i++) z += MODEL.w[i] * x[i];
  return z;
};

/** A confidently-classified class-0 image from a held-out set. */
const CLEAN = (() => {
  const { X, Y } = makeSet(99);
  let best = 0;
  let pick = X[0];
  for (let n = 0; n < N; n++) {
    if (Y[n] !== 0) continue;
    const p = 1 - sig(logitOf(X[n]));
    if (p > best && p < 0.999) {
      best = p;
      pick = X[n];
    }
  }
  return pick;
})();

const CLEAN_LOGIT = logitOf(CLEAN);
const EPS_STAR = Math.abs(CLEAN_LOGIT) / MODEL.l1;

const CELL = 9;
const GRID = S * CELL;

function Img({ px, x, y, signed }: { px: number[]; x: number; y: number; signed?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {px.map((v, i) => {
        const r = Math.floor(i / S);
        const c = i % S;
        const g = signed ? (v > 0 ? 1 : 0) : Math.max(0, Math.min(1, v));
        const fill = signed
          ? v > 0
            ? VIZ.teal
            : VIZ.rose
          : `rgb(${Math.round(g * 235)},${Math.round(g * 240)},${Math.round(g * 250)})`;
        return <rect key={i} x={c * CELL} y={r * CELL} width={CELL - 0.6} height={CELL - 0.6} fill={fill} />;
      })}
      <rect width={GRID} height={GRID} fill="none" stroke={VIZ.axis} strokeWidth={1} />
    </g>
  );
}

const W = 560;
const H = 190;

export function FGSMViz({ className }: { className?: string }) {
  const [eps255, setEps255] = useState(8);
  const [dim, setDim] = useState(D);

  const eps = eps255 / 255;
  const adv = useMemo(
    () => CLEAN.map((v, i) => Math.max(0, Math.min(1, v + eps * Math.sign(MODEL.w[i])))),
    [eps]
  );
  const advLogit = logitOf(adv);
  const measuredShift = advLogit - CLEAN_LOGIT;
  const predictedShift = eps * MODEL.l1;

  // extrapolate the same weight scale to a different input size
  const l1AtDim = MODEL.meanAbs * dim;
  const epsStarAtDim = Math.abs(CLEAN_LOGIT) / l1AtDim;

  return (
    <VizFrame
      title="Why the attack is about dimension, not images"
      caption="A logistic regression trained in your browser on 300 synthetic 12×12 images (400 full-batch steps, 100% train accuracy). Left to right: the clean image, sign(∇ₓ loss) — which for a linear model is just sign(w) — and the adversarial image x + ε·sign(w). Everything below is measured from that fit."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Img px={CLEAN} x={26} y={26} />
        <text x={26 + GRID / 2} y={18} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          clean
        </text>
        <text x={26 + GRID / 2} y={26 + GRID + 14} textAnchor="middle" fontSize={9} fill={VIZ.teal}>
          P(bar↕) = {(1 - sig(CLEAN_LOGIT)).toFixed(4)}
        </text>

        <text x={26 + GRID + 22} y={26 + GRID / 2} fontSize={14} fill={VIZ.text}>
          +
        </text>
        <text x={26 + GRID + 14} y={26 + GRID / 2 + 16} fontSize={8} fill={VIZ.text}>
          ε ·
        </text>

        <Img px={MODEL.w} x={26 + GRID + 44} y={26} signed />
        <text x={26 + GRID + 44 + GRID / 2} y={18} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          sign(w)
        </text>
        <text x={26 + GRID + 44 + GRID / 2} y={26 + GRID + 14} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          every pixel moves ±ε
        </text>

        <text x={26 + 2 * GRID + 66} y={26 + GRID / 2} fontSize={14} fill={VIZ.text}>
          =
        </text>

        <Img px={adv} x={26 + 2 * GRID + 86} y={26} />
        <text x={26 + 2 * GRID + 86 + GRID / 2} y={18} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          adversarial
        </text>
        <text
          x={26 + 2 * GRID + 86 + GRID / 2}
          y={26 + GRID + 14}
          textAnchor="middle"
          fontSize={9}
          fill={advLogit > 0 ? VIZ.rose : VIZ.teal}
        >
          P(bar↕) = {(1 - sig(advLogit)).toFixed(4)}
        </text>

        {/* the exact linear prediction */}
        <g transform={`translate(${26 + 3 * GRID + 110}, 30)`}>
          <text x={0} y={0} fontSize={9} fill={VIZ.text}>
            logit shift
          </text>
          <text x={0} y={15} fontSize={11} fill={VIZ.textBright}>
            {measuredShift.toFixed(4)}
          </text>
          <text x={0} y={33} fontSize={9} fill={VIZ.yellow}>
            ε · ‖w‖₁
          </text>
          <text x={0} y={48} fontSize={11} fill={VIZ.yellow}>
            {predictedShift.toFixed(4)}
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
        <VizStat label="L1 norm of w" value={MODEL.l1.toFixed(2)} />
        <VizStat label="mean |w| per pixel" value={MODEL.meanAbs.toFixed(4)} />
        <VizStat label="clean margin" value={Math.abs(CLEAN_LOGIT).toFixed(4)} />
        <VizStat
          label="ε to flip = margin / L1"
          value={`${(EPS_STAR * 255).toFixed(1)}/255`}
          color={EPS_STAR * 255 > 16 ? VIZ.teal : VIZ.rose}
        />
        <VizStat
          label="flipped?"
          value={advLogit > 0 ? "yes" : "no"}
          color={advLogit > 0 ? VIZ.rose : VIZ.teal}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <VizSlider
          label="ε — perturbation budget (/255)"
          min={0}
          max={48}
          step={1}
          value={eps255}
          onChange={(v) => setEps255(Math.round(v))}
          format={(v) => `${v}/255`}
        />
        <VizSlider
          label="input pixels, at the same mean weight"
          min={144}
          max={150528}
          step={144}
          value={dim}
          onChange={(v) => setDim(Math.round(v))}
          format={(v) => v.toLocaleString()}
        />
      </div>

      <div className="mt-3 rounded-lg border border-surface-border bg-surface-elevated/40 p-3 text-[11px] text-slate-300">
        At <span className="font-mono">{dim.toLocaleString()}</span> pixels the same weight scale gives{" "}
        <span className="font-mono text-white">‖w‖₁ = {l1AtDim.toFixed(0)}</span>, so the budget needed
        to flip this margin is{" "}
        <span className="font-mono" style={{ color: epsStarAtDim * 255 < 1 ? VIZ.rose : VIZ.teal }}>
          {(epsStarAtDim * 255).toFixed(epsStarAtDim * 255 < 1 ? 3 : 1)}/255
        </span>
        . Adversarial fragility is a property of the input dimension, not of images.
      </div>
    </VizFrame>
  );
}
