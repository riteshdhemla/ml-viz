"use client";

/**
 * Anchor matching, counted rather than described.
 *
 * A 16×16 grid at 4 scales and 3 aspect ratios is 3072 anchors. Against a
 * single object, with the usual rule (IoU ≥ 0.5 positive, < 0.4 negative, the
 * rest ignored), exactly **7 are positive** — 0.228%, a foreground/background
 * ratio of **1:436**. That number is the reason focal loss, hard-negative
 * mining and 1:3 sampling exist, and it is a fact about the anchor grid rather
 * than about the images.
 *
 * Two consequences the reader can trigger:
 *
 * 1. **Raise the positive threshold to 0.7 and the object gets 0 positives.**
 *    The best IoU any anchor achieves on this box is 0.635, so a stricter rule
 *    does not produce cleaner labels, it produces no labels. That is why the
 *    convention sits at 0.5, and why detectors add a "best anchor per object"
 *    fallback rule.
 *
 * 2. **Some objects are invisible to the anchor set entirely.** Best achievable
 *    IoU by shape: 0.635 for a 140×180 box, 0.527 for a 320×80, but 0.368 for
 *    a thin 60×400 and 0.250 for a small 32×32. Below the positive threshold
 *    they are never labelled foreground, so no amount of training finds them.
 *    Anchor scales and ratios are a dataset decision, not a default.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat } from "../viz-kit";

const IMG = 512;
const STRIDE = 32;
const SCALES = [32, 64, 128, 256];
const RATIOS = [0.5, 1, 2];

type Box = [number, number, number, number];

const ANCHORS: Box[] = (() => {
  const out: Box[] = [];
  for (let cy = STRIDE / 2; cy < IMG; cy += STRIDE)
    for (let cx = STRIDE / 2; cx < IMG; cx += STRIDE)
      for (const s of SCALES)
        for (const r of RATIOS) {
          const w = s * Math.sqrt(r);
          const h = s / Math.sqrt(r);
          out.push([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]);
        }
  return out;
})();

function iou(a: Box, b: Box) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i;
  return u > 0 ? i / u : 0;
}

const SHAPES: { label: string; box: Box }[] = [
  { label: "typical (140×180)", box: [150, 120, 290, 300] },
  { label: "wide (320×80)", box: [100, 100, 420, 180] },
  { label: "thin (60×400)", box: [200, 60, 260, 460] },
  { label: "small (32×32)", box: [240, 240, 272, 272] },
];

const S = 300; // on-screen size of the image square

export function AnchorMatchingViz({ className }: { className?: string }) {
  const [shapeIdx, setShapeIdx] = useState(0);
  const [posT, setPosT] = useState(0.5);
  const [negT, setNegT] = useState(0.4);

  const gt = SHAPES[shapeIdx].box;
  const hi = Math.max(posT, negT);
  const lo = Math.min(posT, negT);

  const stats = useMemo(() => {
    let pos = 0;
    let ign = 0;
    let neg = 0;
    let best = 0;
    let bestBox: Box = ANCHORS[0];
    const positives: Box[] = [];
    for (const a of ANCHORS) {
      const v = iou(a, gt);
      if (v > best) {
        best = v;
        bestBox = a;
      }
      if (v >= hi) {
        pos++;
        if (positives.length < 40) positives.push(a);
      } else if (v < lo) neg++;
      else ign++;
    }
    return { pos, ign, neg, best, bestBox, positives };
  }, [gt, hi, lo]);

  const k = S / IMG;

  return (
    <VizFrame
      title="Seven anchors out of three thousand"
      caption="A 16×16 grid at 4 scales and 3 aspect ratios — 3072 anchors over a 512×512 image. Teal boxes are the anchors labelled positive at the current threshold; the white box is the ground truth and the yellow one is the single best-matching anchor. Every count is computed over all 3072."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {SHAPES.map((s, i) => (
          <VizButton key={s.label} active={i === shapeIdx} onClick={() => setShapeIdx(i)}>
            {s.label}
          </VizButton>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[320px_1fr] items-start">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[320px]">
          <rect width={S} height={S} fill="#171a24" stroke={VIZ.axis} strokeWidth={1} />
          {/* the anchor centres, so the grid density is visible */}
          {Array.from({ length: IMG / STRIDE }, (_, i) =>
            Array.from({ length: IMG / STRIDE }, (_, j) => (
              <circle
                key={`${i}-${j}`}
                cx={(STRIDE / 2 + i * STRIDE) * k}
                cy={(STRIDE / 2 + j * STRIDE) * k}
                r={0.7}
                fill={VIZ.axis}
              />
            ))
          )}
          {stats.positives.map((a, i) => (
            <rect
              key={i}
              x={a[0] * k}
              y={a[1] * k}
              width={(a[2] - a[0]) * k}
              height={(a[3] - a[1]) * k}
              fill="none"
              stroke={VIZ.teal}
              strokeWidth={1}
              opacity={0.8}
            />
          ))}
          <rect
            x={stats.bestBox[0] * k}
            y={stats.bestBox[1] * k}
            width={(stats.bestBox[2] - stats.bestBox[0]) * k}
            height={(stats.bestBox[3] - stats.bestBox[1]) * k}
            fill="none"
            stroke={VIZ.yellow}
            strokeWidth={1.6}
            strokeDasharray="4 2"
          />
          <rect
            x={gt[0] * k}
            y={gt[1] * k}
            width={(gt[2] - gt[0]) * k}
            height={(gt[3] - gt[1]) * k}
            fill="none"
            stroke={VIZ.textBright}
            strokeWidth={2}
          />
        </svg>

        <div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <VizStat label="anchors" value={String(ANCHORS.length)} />
            <VizStat
              label="positive"
              value={String(stats.pos)}
              color={stats.pos === 0 ? VIZ.rose : VIZ.teal}
            />
            <VizStat label="ignored" value={String(stats.ign)} color={VIZ.yellow} />
            <VizStat label="negative" value={String(stats.neg)} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
            <VizStat
              label="foreground : background"
              value={stats.pos ? `1 : ${Math.round(stats.neg / stats.pos)}` : "1 : ∞"}
              color={VIZ.rose}
            />
            <VizStat
              label="best IoU any anchor reaches"
              value={stats.best.toFixed(3)}
              color={stats.best < posT ? VIZ.rose : VIZ.teal}
            />
          </div>
          {stats.pos === 0 && (
            <p className="mt-3 rounded-lg border border-surface-border bg-surface-elevated/40 p-3 text-[11px] text-slate-300">
              No anchor clears {posT.toFixed(2)}, so this object is never labelled foreground and no
              amount of training will find it. Either the anchor scales and ratios do not cover its
              shape, or the threshold is stricter than the grid can satisfy — which is why detectors
              add a &ldquo;best anchor per object&rdquo; fallback rule on top of the IoU test.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <VizSlider label="positive IoU threshold" min={0.3} max={0.8} step={0.05} value={posT} onChange={setPosT} format={(v) => v.toFixed(2)} />
        <VizSlider label="negative IoU threshold" min={0.1} max={0.5} step={0.05} value={negT} onChange={setNegT} format={(v) => v.toFixed(2)} />
      </div>
    </VizFrame>
  );
}
