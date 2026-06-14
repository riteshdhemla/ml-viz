"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  VIZ,
  VizFrame,
  VizButton,
  VizSlider,
  VizStat,
  useAnimationLoop,
  scale,
} from "../viz-kit";

/**
 * CLIP shared-embedding-space visualisation.
 *
 * Two encoders project images and captions into the same 2D unit-disc here (we
 * collapse the real 512-D normalised embedding space down to a plane for the
 * picture). Image points are filled circles; their paired text prompt is an
 * open square nearby. The animation runs symmetric contrastive descent: every
 * frame each text point steps a little toward its paired image and each image
 * steps a little toward its paired text, with step size scaling as 1/τ.
 *
 * Click any text-prompt square to drive the zero-shot classification readout:
 * dashed lines fan out from the selected text to every image with opacity
 * proportional to cosine similarity, and the top-1 image is reported under
 * the stats.
 */

// SVG canvas geometry.
const W = 600;
const H = 360;
const CX = W / 2;
const CY = H / 2;
const R = 130; // unit-circle radius in pixels
const PAD_LEFT = 24;

const N = 6; // matched image / text pairs
const LABELS = ["cat", "dog", "car", "tree", "beach", "building"];

interface Pt {
  x: number;
  y: number;
}

function clone(p: Pt): Pt {
  return { x: p.x, y: p.y };
}

function unit(p: Pt): Pt {
  const n = Math.sqrt(p.x * p.x + p.y * p.y);
  if (n < 1e-9) return { x: 1, y: 0 };
  return { x: p.x / n, y: p.y / n };
}

function cosSim(a: Pt, b: Pt) {
  const ua = unit(a);
  const ub = unit(b);
  return ua.x * ub.x + ua.y * ub.y;
}

function softmax(logits: number[]): number[] {
  const m = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - m));
  const s = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / s);
}

/**
 * Hand-placed initial scene. Six images sit around the unit circle at distinct
 * angles; the matching text-prompt point is offset by a small angular delta so
 * the pair is visibly mis-aligned at the start. Training (the τ slider plus
 * play) pulls each pair together.
 */
function initialScene(): { imgs: Pt[]; txts: Pt[] } {
  const imgs: Pt[] = [];
  const txts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const baseAngle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const imgR = 0.85;
    imgs.push({ x: Math.cos(baseAngle) * imgR, y: Math.sin(baseAngle) * imgR });
    // text starts ~25° off, slightly different radius
    const dA = ((i % 2 === 0 ? 1 : -1) * 25 * Math.PI) / 180;
    const txtR = 0.95;
    txts.push({
      x: Math.cos(baseAngle + dA) * txtR,
      y: Math.sin(baseAngle + dA) * txtR,
    });
  }
  return { imgs, txts };
}

/**
 * Pull two paired points slightly toward each other; scale the step by 1/τ so
 * cooler temperatures train faster (the "sharper contrast" of low τ).
 */
function stepPair(a: Pt, b: Pt, tau: number, dt: number) {
  const lr = 0.45 / Math.max(tau, 0.05);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const aNew = { x: a.x + dx * lr * dt, y: a.y + dy * lr * dt };
  const bNew = { x: b.x - dx * lr * dt, y: b.y - dy * lr * dt };
  // Soft clamp to the unit disc.
  const cap = (p: Pt) => {
    const n = Math.sqrt(p.x * p.x + p.y * p.y);
    if (n > 1.05) {
      const k = 1.05 / n;
      return { x: p.x * k, y: p.y * k };
    }
    return p;
  };
  return [cap(aNew), cap(bNew)] as const;
}

export function CLIPSpaceViz({ className }: { className?: string }) {
  const [tau, setTau] = useState(0.3);
  const [running, setRunning] = useState(false);
  const [selectedText, setSelectedText] = useState<number>(0);
  const [tick, setTick] = useState(0);

  const sceneRef = useRef<{ imgs: Pt[]; txts: Pt[] }>(initialScene());

  const sx = useMemo(() => scale(-1.2, 1.2, CX - R * 1.2, CX + R * 1.2), []);
  const sy = useMemo(() => scale(-1.2, 1.2, CY + R * 1.2, CY - R * 1.2), []);

  const reset = useCallback(() => {
    sceneRef.current = initialScene();
    setRunning(false);
    setTick((t) => t + 1);
  }, []);

  const step = useCallback(
    (dt: number) => {
      const { imgs, txts } = sceneRef.current;
      const newImgs = imgs.map(clone);
      const newTxts = txts.map(clone);
      for (let i = 0; i < N; i++) {
        const [a, b] = stepPair(newImgs[i], newTxts[i], tau, dt);
        newImgs[i] = a;
        newTxts[i] = b;
      }
      sceneRef.current = { imgs: newImgs, txts: newTxts };
    },
    [tau]
  );

  useAnimationLoop((dt) => {
    const clamped = Math.min(dt, 0.05);
    step(clamped);
    setTick((t) => t + 1);
  }, running);

  // Suppress unused-variable warning for `tick`.
  void tick;

  const { imgs, txts } = sceneRef.current;

  // Build the full NxN cosine-similarity matrix S_ij = cos(img_i, txt_j) / τ
  // and the symmetric CLIP loss.
  const tauSafe = Math.max(tau, 0.05);
  const sims: number[][] = imgs.map((img) =>
    txts.map((txt) => cosSim(img, txt))
  );
  const S: number[][] = sims.map((row) => row.map((s) => s / tauSafe));
  // Image -> Text cross-entropy (rows are image queries, diagonal positives).
  let lossIT = 0;
  let correctIT = 0;
  for (let i = 0; i < N; i++) {
    const p = softmax(S[i]);
    lossIT += -Math.log(Math.max(p[i], 1e-12));
    let argmax = 0;
    for (let j = 1; j < N; j++) if (p[j] > p[argmax]) argmax = j;
    if (argmax === i) correctIT += 1;
  }
  lossIT /= N;
  // Text -> Image (columns transposed; same diagonal).
  let lossTI = 0;
  for (let j = 0; j < N; j++) {
    const col = S.map((row) => row[j]);
    const p = softmax(col);
    lossTI += -Math.log(Math.max(p[j], 1e-12));
  }
  lossTI /= N;
  const loss = 0.5 * (lossIT + lossTI);
  const acc = correctIT / N;

  // Selected-text zero-shot row: cosine similarity from this text to every
  // image, mapped to the canonical "softmax over images" classifier output.
  const selectedRow = imgs.map((img) => cosSim(img, txts[selectedText]));
  const selectedProbs = softmax(selectedRow.map((s) => s / tauSafe));
  let zeroShotTop = 0;
  for (let i = 1; i < N; i++) {
    if (selectedProbs[i] > selectedProbs[zeroShotTop]) zeroShotTop = i;
  }

  return (
    <VizFrame
      className={className}
      title="CLIP: a shared image+text embedding space"
      caption={`Filled circles are images (one each for ${LABELS.join(", ")}); open squares are the paired text captions ("a photo of a …"). Both encoders project into the same plane; embeddings are L2-normalised so they live on the unit circle. Click any text square to see the zero-shot classification it would produce — dashed lines fan out to each image with opacity proportional to cosine similarity, and the top-1 image is highlighted. Drop τ and press play to watch symmetric contrastive descent pull each matched pair together.`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="A 2D unit-disc representing CLIP's shared embedding space with image and text points"
      >
        {/* Unit-circle backdrop — embeddings are L2-normalised, so they live on this circle. */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={VIZ.grid}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <circle cx={CX} cy={CY} r={1.5} fill={VIZ.axis} />
        <text
          x={CX + R + 8}
          y={CY + 4}
          fill={VIZ.text}
          fontSize={10}
          fontFamily="monospace"
        >
          ‖z‖ = 1
        </text>

        {/* Dashed similarity lines from the selected text to every image. */}
        {imgs.map((img, i) => {
          const w = (selectedProbs[i] - 1 / N) * 1.4 + 0.15;
          const opacity = Math.max(0.05, Math.min(0.95, w));
          return (
            <line
              key={`sim-line-${i}`}
              x1={sx(txts[selectedText].x)}
              y1={sy(txts[selectedText].y)}
              x2={sx(img.x)}
              y2={sy(img.y)}
              stroke={VIZ.brandLight}
              strokeWidth={i === zeroShotTop ? 2 : 1}
              strokeDasharray="3 3"
              opacity={opacity}
            />
          );
        })}

        {/* Solid pair-lines so the matched (image, text) pairs are legible. */}
        {imgs.map((img, i) => (
          <line
            key={`pair-line-${i}`}
            x1={sx(img.x)}
            y1={sy(img.y)}
            x2={sx(txts[i].x)}
            y2={sy(txts[i].y)}
            stroke={VIZ.teal}
            strokeWidth={1}
            opacity={0.25}
          />
        ))}

        {/* Image points (filled brand circles). */}
        {imgs.map((img, i) => (
          <g key={`img-${i}`}>
            <circle
              cx={sx(img.x)}
              cy={sy(img.y)}
              r={i === zeroShotTop ? 9 : 7}
              fill={VIZ.brand}
              stroke={i === zeroShotTop ? VIZ.textBright : "none"}
              strokeWidth={2}
            />
            <text
              x={sx(img.x)}
              y={sy(img.y) - 12}
              fill={VIZ.text}
              fontSize={9}
              textAnchor="middle"
              fontFamily="monospace"
            >
              img{i + 1}
            </text>
          </g>
        ))}

        {/* Text-prompt points (open teal squares). */}
        {txts.map((txt, i) => {
          const x = sx(txt.x);
          const y = sy(txt.y);
          const side = 12;
          const selected = i === selectedText;
          return (
            <g
              key={`txt-${i}`}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedText(i)}
            >
              <rect
                x={x - side / 2}
                y={y - side / 2}
                width={side}
                height={side}
                fill={VIZ.card}
                stroke={VIZ.teal}
                strokeWidth={selected ? 2.5 : 1.5}
              />
              {selected && (
                <rect
                  x={x - side / 2 - 4}
                  y={y - side / 2 - 4}
                  width={side + 8}
                  height={side + 8}
                  fill="none"
                  stroke={VIZ.teal}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.7}
                />
              )}
              <text
                x={x}
                y={y + side / 2 + 11}
                fill={VIZ.teal}
                fontSize={9}
                textAnchor="middle"
                fontFamily="monospace"
              >
                txt{i + 1}
              </text>
            </g>
          );
        })}

        {/* Legend strip. */}
        <g transform={`translate(${PAD_LEFT}, ${H - 22})`}>
          <circle cx={6} cy={0} r={6} fill={VIZ.brand} />
          <text x={18} y={4} fill={VIZ.text} fontSize={10} fontFamily="monospace">
            image embedding
          </text>
          <rect x={140} y={-5} width={10} height={10} fill={VIZ.card} stroke={VIZ.teal} strokeWidth={1.5} />
          <text x={156} y={4} fill={VIZ.text} fontSize={10} fontFamily="monospace">
            text embedding
          </text>
          <line x1={270} y1={0} x2={290} y2={0} stroke={VIZ.brandLight} strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={296} y={4} fill={VIZ.text} fontSize={10} fontFamily="monospace">
            zero-shot similarity (from selected text)
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
          value={tau}
          onChange={setTau}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <VizStat
          label="symmetric CLIP loss"
          value={loss.toFixed(3)}
          color={loss < 0.5 ? VIZ.teal : loss < 1.5 ? VIZ.yellow : VIZ.rose}
        />
        <VizStat
          label="image→text top-1 acc"
          value={`${(acc * 100).toFixed(0)}%`}
          color={acc > 0.5 ? VIZ.teal : VIZ.yellow}
        />
        <VizStat label="τ" value={tau.toFixed(2)} color={VIZ.brand} />
        <VizStat
          label={`zero-shot pick for txt${selectedText + 1}`}
          value={`img${zeroShotTop + 1} (${LABELS[zeroShotTop]})`}
          color={zeroShotTop === selectedText ? VIZ.teal : VIZ.rose}
        />
      </div>
    </VizFrame>
  );
}
