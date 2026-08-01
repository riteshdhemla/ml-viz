import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Non-maximum suppression on the 4-box example from
 * `src/content/wiki/nms-algorithm.mdx`. Box coordinates are chosen so the real
 * IoUs reproduce that page's numbers — 0.73 between the top pair, 0.28 between
 * the lower pair.
 *
 * The payoff sweeps τ and shows both failure modes on the same four boxes:
 * τ = 0.8 keeps the duplicate, τ = 0.25 deletes a genuinely distinct object.
 */

const CODE = codeLines(`
def nms(boxes, scores, tau):
    order = argsort(scores)[::-1]
    keep = []
    while order:
        i = order[0]          # highest left
        keep.append(i)
        order = [j for j in order[1:]
                 if iou(boxes[i], boxes[j]) <= tau]
    return keep

def iou(a, b):
    xa, ya = max(a[0], b[0]), max(a[1], b[1])
    xb, yb = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, xb - xa) * max(0, yb - ya)
    union = area(a) + area(b) - inter
    return inter / union if union else 0.0
`);

const ln = lineFinder(CODE);

type Box = { id: string; score: number; x1: number; y1: number; x2: number; y2: number };

const BOXES: Box[] = [
  { id: "0.92", score: 0.92, x1: 100, y1: 100, x2: 200, y2: 200 },
  { id: "0.87", score: 0.87, x1: 108, y1: 108, x2: 208, y2: 208 },
  { id: "0.61", score: 0.61, x1: 260, y1: 120, x2: 360, y2: 220 },
  { id: "0.55", score: 0.55, x1: 299, y1: 149, x2: 399, y2: 249 },
];

const DOMAIN: [number, number, number, number] = [80, 420, 80, 270];
const fmt = (x: number, d = 2) => x.toFixed(d);

const area = (b: Box) => (b.x2 - b.x1) * (b.y2 - b.y1);

function iou(a: Box, b: Box) {
  const inter =
    Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) *
    Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** A box as four segments, so the plot component can draw rectangles. */
function rect(b: Box, cls: TraceCls, dashed = false) {
  const pts: [number, number][] = [
    [b.x1, b.y1],
    [b.x2, b.y1],
    [b.x2, b.y2],
    [b.x1, b.y2],
  ];
  return pts.map((p, i) => {
    const q = pts[(i + 1) % 4];
    return { x1: p[0], y1: p[1], x2: q[0], y2: q[1], cls, dashed };
  });
}

function boxPlot(
  label: string,
  state: Record<string, TraceCls>,
  hidden: string[] = []
): TraceComponent {
  const shown = BOXES.filter((b) => !hidden.includes(b.id));
  return {
    t: "plot",
    label,
    domain: DOMAIN,
    segments: shown.flatMap((b) => rect(b, state[b.id] ?? "dim", (state[b.id] ?? "dim") === "dim")),
    points: shown.map((b) => ({
      x: b.x1 + 6,
      y: b.y1 + 10,
      id: b.id,
      cls: state[b.id] ?? "dim",
      shape: "dot" as const,
    })),
  };
}

/** Run NMS, optionally recording a frame at each decision. */
function nms(tau: number, push?: (d: string, l: number[], ...c: TraceComponent[]) => void) {
  let order = [...BOXES].sort((a, b) => b.score - a.score);
  const keep: Box[] = [];
  const suppressed: Box[] = [];

  if (push) {
    push(
      `Four candidate boxes from the detector, sorted by confidence: ${order.map((b) => b.id).join(", ")}. NMS never looks at what is *in* a box — it works purely from confidence order and geometric overlap, which is why it is a generic post-process rather than part of the model.`,
      ln("order = argsort(scores)[::-1]"),
      boxPlot("candidate boxes", Object.fromEntries(order.map((b) => [b.id, "warn" as TraceCls]))),
      {
        t: "table",
        label: `pairwise IoU (τ = ${tau})`,
        head: ["", ...BOXES.map((b) => b.id)],
        v: BOXES.map((a) => ({
          cells: [a.id, ...BOXES.map((b) => (a === b ? "—" : fmt(iou(a, b))))],
          cls: "dim" as TraceCls,
        })),
      }
    );
  }

  while (order.length > 0) {
    const best = order[0];
    keep.push(best);
    const rest = order.slice(1);

    push?.(
      `Take the highest remaining confidence, ${best.id}, and keep it unconditionally. NMS is greedy in exactly this way: the top box is never questioned, only the boxes below it.`,
      ln("keep.append(i)"),
      boxPlot(
        "keep the top box",
        {
          ...Object.fromEntries(keep.map((b) => [b.id, "good" as TraceCls])),
          ...Object.fromEntries(suppressed.map((b) => [b.id, "bad" as TraceCls])),
          [best.id]: "active",
        },
        []
      ),
      {
        t: "kv",
        label: "output list",
        v: keep.map((b) => ({ k: b.id, cls: "good" as TraceCls })),
      }
    );

    const survivors: Box[] = [];
    for (const b of rest) {
      const overlap = iou(best, b);
      if (overlap > tau) suppressed.push(b);
      else survivors.push(b);

      push?.(
        overlap > tau
          ? `IoU(${best.id}, ${b.id}) = ${fmt(overlap)} > τ = ${tau}. These two boxes share more than ${fmt(tau * 100, 0)}% of their union, so ${b.id} is treated as a duplicate of the same object and deleted — a neighbouring anchor that fired on the same thing.`
          : `IoU(${best.id}, ${b.id}) = ${fmt(overlap)} ≤ τ = ${tau}. Not enough overlap to call them the same object, so ${b.id} survives to be considered on its own terms.`,
        ln("if iou(boxes[i], boxes[j]) <= tau"),
        boxPlot("suppression check", {
          ...Object.fromEntries(keep.map((k) => [k.id, "good" as TraceCls])),
          ...Object.fromEntries(suppressed.map((s) => [s.id, "bad" as TraceCls])),
          [best.id]: "active",
          [b.id]: overlap > tau ? "bad" : "warn",
        }),
        {
          t: "bars",
          label: `IoU with ${best.id}`,
          v: rest.map((r) => ({
            k: r.id,
            val: iou(best, r),
            show: fmt(iou(best, r)),
            cls: r.id === b.id ? (overlap > tau ? "bad" : "good") : "dim",
          })),
          max: 1,
        }
      );
    }
    order = survivors;
  }

  return { keep, suppressed };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const TAU = 0.5;
  const { keep, suppressed } = nms(TAU, push);

  push(
    `Done: ${keep.length} detections kept (${keep.map((b) => b.id).join(", ")}), ${suppressed.length} suppressed (${suppressed
      .map((b) => b.id)
      .join(", ")}). The 0.87 box was deleted despite a high score, because a 0.73 IoU with the top box says it is the same cat seen from a slightly shifted anchor. The 0.55 box survived on a 0.28 IoU — different enough to be a different object.`,
    ln("return keep"),
    boxPlot("final detections", {
      ...Object.fromEntries(keep.map((b) => [b.id, "good" as TraceCls])),
      ...Object.fromEntries(suppressed.map((b) => [b.id, "bad" as TraceCls])),
    }),
    {
      t: "table",
      label: "result",
      head: ["box", "verdict"],
      v: BOXES.map((b) => ({
        cells: [b.id, keep.includes(b) ? "kept" : "suppressed"],
        cls: keep.includes(b) ? "good" : "bad",
      })),
    }
  );

  // ---- payoff: both failure modes on the same four boxes ------------------
  const loose = nms(0.8);
  const tight = nms(0.25);

  push(
    `τ is the entire algorithm, and both directions fail on this exact input. At τ = 0.8, the 0.73 overlap no longer counts as a duplicate, so the redundant 0.87 box survives and the detector reports the same cat twice. At τ = 0.25, the 0.28 overlap *does* count, so the 0.55 box — a genuinely separate object — is deleted. Same four boxes, same code, opposite errors.`,
    ln("if iou(boxes[i], boxes[j]) <= tau"),
    {
      t: "table",
      label: "kept boxes by threshold",
      v: [
        { cells: ["τ = 0.80", loose.keep.map((b) => b.id).join(", "), "duplicate survives"], cls: "bad" },
        { cells: ["τ = 0.50", keep.map((b) => b.id).join(", "), "correct"], cls: "good" },
        { cells: ["τ = 0.25", tight.keep.map((b) => b.id).join(", "), "real object deleted"], cls: "bad" },
      ],
      head: ["threshold", "kept", "outcome"],
    },
    {
      t: "note",
      text: "0.45–0.5 is the standard starting point, and crowded scenes are where it hurts most — two people standing close together legitimately overlap above τ. Soft-NMS decays scores by IoU instead of deleting outright, which is the usual fix.",
      cls: "warn",
    }
  );

  return {
    id: "nms-suppression",
    title: "Non-maximum suppression — greedy keep, then suppress by IoU",
    caption:
      "NMS on four candidate boxes, with the real geometry behind each IoU drawn out. The procedure is greedy and never revisits a decision: take the highest-confidence box, delete everything overlapping it beyond τ, repeat. The final step runs the same four boxes at τ = 0.8 and τ = 0.25 to show both failure modes — a duplicate surviving, and a genuinely distinct object being deleted.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const nmsTrace = build();
