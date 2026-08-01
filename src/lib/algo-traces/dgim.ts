import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * DGIM on the N = 8 stream from `src/content/wiki/dgim-sliding-window.mdx`
 * (1 0 1 1 0 1 1 1), reproducing that page's bucket trace and its estimate of
 * 5 against a true count of 6.
 *
 * The payoff keeps the stream running well past the worked example and tracks
 * the estimate against the truth at every position, so the ≤50% bound stops
 * being a claim and becomes a measured envelope.
 */

const CODE = codeLines(`
def update(buckets, bit, t, N):
    # drop whatever has slid out of the window
    buckets = [b for b in buckets
               if t - b.ts < N]
    if bit == 0:
        return buckets
    buckets.insert(0, Bucket(size=1, ts=t))
    # cascade: never 3 buckets of one size
    size = 1
    while count(buckets, size) > 2:
        a, b = two_oldest(buckets, size)
        buckets.remove(a); buckets.remove(b)
        merged = Bucket(2 * size, ts=newer(a, b))
        insert_sorted(buckets, merged)
        size *= 2
    return buckets

def estimate(buckets):
    # all but the oldest count in full
    return (sum(b.size for b in buckets[:-1])
            + buckets[-1].size / 2)
`);

const ln = lineFinder(CODE);

const N = 8;
const STREAM = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1];
const WORKED_UPTO = 8;

interface Bucket {
  size: number;
  ts: number;
}

/** DGIM update: drop expired, add the new 1, then cascade merges. */
function update(buckets: Bucket[], bit: number, t: number): { buckets: Bucket[]; merged: boolean } {
  let bs = buckets.filter((b) => t - b.ts < N);
  if (bit === 0) return { buckets: bs, merged: false };

  bs = [{ size: 1, ts: t }, ...bs];
  let merged = false;
  let size = 1;
  for (;;) {
    const of = bs.filter((b) => b.size === size);
    if (of.length <= 2) break;
    merged = true;
    // the two oldest of this size are the last two in newest-first order
    const a = of[of.length - 2];
    const b = of[of.length - 1];
    bs = bs.filter((x) => x !== a && x !== b);
    bs.push({ size: size * 2, ts: Math.max(a.ts, b.ts) });
    bs.sort((x, y) => y.ts - x.ts);
    size *= 2;
  }
  return { buckets: bs, merged };
}

const estimate = (buckets: Bucket[]) =>
  buckets.length === 0
    ? 0
    : buckets.slice(0, -1).reduce((s, b) => s + b.size, 0) + buckets[buckets.length - 1].size / 2;

/** Exact count of 1s in the last N positions — what DGIM refuses to store. */
const trueCount = (t: number) =>
  STREAM.slice(Math.max(0, t - N), t).reduce((s, b) => s + b, 0);

const bucketStr = (b: Bucket) => `(${b.size}@${b.ts})`;

function streamPanel(t: number): TraceComponent {
  return {
    t: "tokens",
    label: `stream — window is the last ${N} positions`,
    v: STREAM.slice(0, Math.max(t, 1)).map((bit, i) => ({
      text: String(bit),
      sub: String(i + 1),
      cls: (i === t - 1
        ? "active"
        : i >= t - N
          ? bit === 1
            ? "good"
            : "dim"
          : "bad") as TraceCls,
    })),
  };
}

function bucketPanel(buckets: Bucket[], t: number): TraceComponent {
  return {
    t: "kv",
    label: "buckets (newest → oldest)",
    v: buckets.map((b, i) => ({
      k: bucketStr(b),
      v: i === buckets.length - 1 ? "half-counted" : "in full",
      cls: (i === buckets.length - 1 ? "warn" : "good") as TraceCls,
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  let buckets: Bucket[] = [];

  push(
    `A binary stream and a window of the last N = ${N} bits. The question is how many 1s are in the window. Storing the window costs ${N} bits and answers exactly; DGIM answers approximately in O(log² N) bits, and the approximation is not a convenience — distinguishing all 2^N window contents *requires* N bits, so sublinear memory forces it.`,
    ln("def update(buckets, bit, t, N)"),
    streamPanel(1),
    { t: "kv", label: "buckets (newest → oldest)", v: [] },
    {
      t: "note",
      text: "Each bucket stores only the timestamp of its most recent 1 (O(log N) bits) and its size as a power of two (O(log log N) bits). It never stores which positions held 1s.",
    }
  );

  for (let t = 1; t <= WORKED_UPTO; t++) {
    const bit = STREAM[t - 1];
    const before = buckets;
    const res = update(buckets, bit, t);
    buckets = res.buckets;

    push(
      bit === 0
        ? `Position ${t}, bit 0: nothing to record. DGIM only ever tracks 1s — a 0 costs no memory and changes no bucket.`
        : res.merged
          ? `Position ${t}, bit 1: open a new size-1 bucket, which makes three of that size. The invariant allows at most two per size, so the two oldest merge into a size-2 bucket stamped with the newer of their timestamps. Buckets are now ${buckets.map(bucketStr).join(" ")}.`
          : `Position ${t}, bit 1: open a new size-1 bucket at timestamp ${t}. Only ${buckets.filter((b) => b.size === 1).length} bucket${buckets.filter((b) => b.size === 1).length === 1 ? "" : "s"} of size 1 now, so no merge is triggered.`,
      bit === 0
        ? ln("return buckets")
        : res.merged
          ? ln("merged = Bucket(2 * size, ts=newer(a, b))")
          : ln("buckets.insert(0, Bucket(size=1, ts=t))"),
      streamPanel(t),
      bucketPanel(buckets, t),
      {
        t: "kv",
        label: "memory",
        v: [
          { k: "buckets", v: String(buckets.length), cls: "active" },
          { k: "window bits", v: String(Math.min(t, N)), cls: "dim" },
          ...(before.length && buckets.length < before.length + 1
            ? [{ k: "merged", v: "yes", cls: "good" as TraceCls }]
            : []),
        ],
      }
    );
  }

  const est = estimate(buckets);
  const truth = trueCount(WORKED_UPTO);

  push(
    `Query at position ${WORKED_UPTO}. Every bucket except the oldest lies entirely inside the window, so they count in full: ${buckets
      .slice(0, -1)
      .map((b) => b.size)
      .join(" + ")}. The oldest bucket ${bucketStr(buckets[buckets.length - 1])} straddles the window edge — some of its 1s may already have expired — so it counts half. Estimate = ${est}, true count = ${truth}, an error of ${(((truth - est) / truth) * 100).toFixed(0)}%.`,
    ln("return (sum(b.size for b in buckets[:-1])"),
    streamPanel(WORKED_UPTO),
    bucketPanel(buckets, WORKED_UPTO),
    {
      t: "bars",
      label: "estimate vs truth",
      v: [
        { k: "DGIM", val: est, show: String(est), cls: "active" },
        { k: "true", val: truth, show: String(truth), cls: "good" },
      ],
    },
    {
      t: "note",
      text: "That halved bucket is the *only* source of error in the whole algorithm. Its true contribution lies between half its size and its full size, so halving it can be wrong by at most half of it — which is where the ≤50% guarantee comes from.",
    }
  );

  // ---- payoff: run it out and measure the error ---------------------------
  let b2: Bucket[] = [];
  const history: { t: number; est: number; truth: number }[] = [];
  for (let t = 1; t <= STREAM.length; t++) {
    b2 = update(b2, STREAM[t - 1], t).buckets;
    if (t >= N) history.push({ t, est: estimate(b2), truth: trueCount(t) });
  }
  const worst = history.reduce((a, h) =>
    Math.abs(h.est - h.truth) / h.truth > Math.abs(a.est - a.truth) / a.truth ? h : a
  );

  push(
    `Keep the stream running to position ${STREAM.length} and query at every step. The estimate tracks the true count continuously, and the largest error over the whole run is ${(
      (Math.abs(worst.est - worst.truth) / worst.truth) *
      100
    ).toFixed(0)}% at position ${worst.t} — comfortably inside the 50% guarantee, which is the usual story: the bound is worst-case, and the oldest bucket is normally a small fraction of the window's total.`,
    ln("return (sum(b.size for b in buckets[:-1])"),
    {
      t: "plot",
      label: "estimate vs true count, every position",
      domain: [N, STREAM.length, 0, N],
      xLabel: "position",
      curves: [
        { pts: history.map((h) => ({ x: h.t, y: h.truth })), cls: "good" },
        { pts: history.map((h) => ({ x: h.t, y: h.est })), cls: "active", dashed: true },
      ],
    },
    {
      t: "table",
      label: "error over the run",
      head: ["position", "DGIM", "true", "error"],
      v: history.map((h) => ({
        cells: [
          String(h.t),
          String(h.est),
          String(h.truth),
          `${(((h.est - h.truth) / h.truth) * 100).toFixed(0)}%`,
        ],
        cls: (h === worst ? "warn" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "The estimate is biased low, always: DGIM halves the oldest bucket rather than dropping it, and the buckets it keeps in full are exact. Storing the window verbatim would cost N bits per query; this costs O(log² N) forever.",
      cls: "good",
    }
  );

  return {
    id: "dgim-window",
    title: "DGIM — exponential buckets over a sliding window",
    caption:
      "Bit by bit through the worked stream above, with the merge cascade that keeps at most two buckets of each size. Watch what DGIM never stores: not which positions held 1s, only a timestamp and a power-of-two size per bucket. The final step runs the stream out and queries at every position, so the ≤50% error bound stops being a claim and becomes a measured envelope — the real error stays far below it.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const dgimTrace = build();
