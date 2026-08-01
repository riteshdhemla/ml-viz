import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * The scheduler loop from `src/content/wiki/continuous-batching.mdx`, on that
 * page's worked trace: four slots, six requests with output lengths
 * 3, 8, 2, 5, 4, 3, FIFO admission. Continuous batching finishes in 8
 * iterations; the static schedule needs 12.
 *
 * The payoff runs both schedules and measures slot occupancy rather than
 * asserting it. Note the page's "~100% occupancy" is true only while the queue
 * has work — the drain phase necessarily falls off, and the trace says so.
 */

const CODE = codeLines(`
while queue or running:
    # 1. RETIRE what finished last step
    for s in list(running):
        if s.remaining == 0:
            running.remove(s)
            free_kv_blocks(s)
    # 2. ADMIT while a slot is free
    while queue and len(running) < max_seqs:
        running.append(queue.pop(0))
    # 3. STEP one forward pass, whole batch
    for s in running:
        s.remaining -= 1     # one token each
    # 4. STREAM tokens to their clients
    emit(running)
`);

const ln = lineFinder(CODE);

const SLOTS = 4;
const REQUESTS: { id: string; tokens: number }[] = [
  { id: "A", tokens: 3 },
  { id: "B", tokens: 8 },
  { id: "C", tokens: 2 },
  { id: "D", tokens: 5 },
  { id: "E", tokens: 4 },
  { id: "F", tokens: 3 },
];
const TOTAL_TOKENS = REQUESTS.reduce((s, r) => s + r.tokens, 0);

interface Snapshot {
  iter: number;
  running: { id: string; remaining: number }[];
  queued: string[];
  retired: string[];
  admitted: string[];
  done: string[];
}

/** The scheduler loop above, recording a snapshot per iteration. */
function continuousSchedule(): Snapshot[] {
  const queue = REQUESTS.map((r) => ({ id: r.id, remaining: r.tokens }));
  let running: { id: string; remaining: number }[] = [];
  const done: string[] = [];
  const snaps: Snapshot[] = [];

  for (let iter = 1; queue.length || running.length; iter++) {
    const retired = running.filter((s) => s.remaining === 0).map((s) => s.id);
    running = running.filter((s) => s.remaining > 0);
    done.push(...retired);

    const admitted: string[] = [];
    while (queue.length && running.length < SLOTS) {
      const next = queue.shift()!;
      running.push(next);
      admitted.push(next.id);
    }
    if (!running.length) break;

    for (const s of running) s.remaining -= 1;

    snaps.push({
      iter,
      running: running.map((s) => ({ ...s })),
      queued: queue.map((q) => q.id),
      retired,
      admitted,
      done: [...done],
    });
  }
  return snaps;
}

/** Static batching: the batch is fixed until every member finishes. */
function staticSchedule() {
  const batches: { ids: string[]; iters: number }[] = [];
  for (let i = 0; i < REQUESTS.length; i += SLOTS) {
    const batch = REQUESTS.slice(i, i + SLOTS);
    batches.push({ ids: batch.map((b) => b.id), iters: Math.max(...batch.map((b) => b.tokens)) });
  }
  return { batches, iters: batches.reduce((s, b) => s + b.iters, 0) };
}

const CONT = continuousSchedule();
const STATIC = staticSchedule();
const CONT_ITERS = CONT.length;
const CONT_CAPACITY = CONT_ITERS * SLOTS;
const STATIC_CAPACITY = STATIC.iters * SLOTS;

const fmt = (x: number, d = 0) => x.toFixed(d);

function slotsPanel(s: Snapshot): TraceComponent {
  return {
    t: "tokens",
    label: `slots (${s.running.length}/${SLOTS} occupied)`,
    v: Array.from({ length: SLOTS }, (_, i) => {
      const occupant = s.running[i];
      return {
        text: occupant ? occupant.id : "—",
        sub: occupant ? `${occupant.remaining} left` : "idle",
        cls: (occupant
          ? s.admitted.includes(occupant.id)
            ? "active"
            : occupant.remaining === 0
              ? "good"
              : "warn"
          : "dim") as TraceCls,
      };
    }),
  };
}

function requestTable(s: Snapshot): TraceComponent {
  return {
    t: "table",
    label: "requests",
    head: ["id", "output", "state", "remaining"],
    v: REQUESTS.map((r) => {
      const live = s.running.find((x) => x.id === r.id);
      const finished = s.done.includes(r.id) || (live && live.remaining === 0);
      const state = finished ? "done" : live ? "running" : s.queued.includes(r.id) ? "queued" : "done";
      return {
        cells: [
          r.id,
          String(r.tokens),
          state,
          live ? String(live.remaining) : finished || state === "done" ? "0" : String(r.tokens),
        ],
        cls: (state === "running" ? "warn" : state === "queued" ? "dim" : "good") as TraceCls,
      };
    }),
  };
}

/** Occupancy per iteration, for both schedules. */
function occupancyPlot(upTo: number): TraceComponent {
  return {
    t: "plot",
    label: "slots busy per iteration",
    domain: [1, STATIC.iters, 0, SLOTS + 0.4],
    xLabel: "iteration",
    yLabel: "slots",
    curves: [
      { pts: CONT.slice(0, upTo).map((s) => ({ x: s.iter, y: s.running.length })), cls: "good" },
    ],
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `Four slots, six requests, output lengths ${REQUESTS.map((r) => r.tokens).join(
      ", "
    )} tokens — the spread that makes this interesting, since chat traffic runs from 50 to 1000+. The scheduler re-decides batch membership **every decode step**, so a finished request's slot is refilled immediately rather than at the end of the batch.`,
    ln("while queue or running"),
    {
      t: "table",
      label: "the workload",
      head: ["id", "output tokens"],
      v: REQUESTS.map((r) => ({ cells: [r.id, String(r.tokens)], cls: "dim" as TraceCls })),
    },
    {
      t: "note",
      text: "One decode step reads every model weight from HBM once and serves the whole batch. Whoever is in the batch when that read happens rides along free — which is why an idle slot is pure waste.",
    }
  );

  for (const s of CONT) {
    const finishing = s.running.filter((r) => r.remaining === 0).map((r) => r.id);
    const parts: string[] = [];
    if (s.retired.length)
      parts.push(
        `Retire ${s.retired.join(", ")} and free ${s.retired.length === 1 ? "its" : "their"} KV blocks.`
      );
    if (s.admitted.length)
      parts.push(
        `Admit ${s.admitted.join(", ")} from the queue — ${
          s.retired.length ? "straight into the slot that just opened" : "there was room"
        }.`
      );
    parts.push(
      s.running.length === 1
        ? "Step: one forward pass, now serving a single sequence — the same weight-read cost, amortized over nobody."
        : `Step: one forward pass emits one token for each of the ${s.running.length} running sequences.`
    );
    if (finishing.length) parts.push(`${finishing.join(", ")} hit zero and will be retired next iteration.`);

    push(
      `Iteration ${s.iter}. ${parts.join(" ")}${
        s.queued.length ? ` Queue still holds ${s.queued.join(", ")}.` : " Queue is empty."
      }`,
      s.admitted.length
        ? ln("running.append(queue.pop(0))")
        : s.retired.length
          ? ln("running.remove(s)")
          : ln("s.remaining -= 1     # one token each"),
      slotsPanel(s),
      requestTable(s),
      occupancyPlot(s.iter)
    );
  }

  const contUsed = CONT.reduce((sum, s) => sum + s.running.length, 0);
  const busyWhileQueued = CONT.filter((s) => s.queued.length > 0 || s.running.length === SLOTS);

  push(
    `All six requests done in ${CONT_ITERS} iterations, gated only by B — the longest single response. Total decode work was ${TOTAL_TOKENS} tokens and the schedule spent ${contUsed} slot-steps, so nothing was wasted on anyone else's behalf. Occupancy was a full ${SLOTS}/${SLOTS} for the first ${busyWhileQueued.length} iterations and only fell during the drain, once the queue had nothing left to backfill with.`,
    ln("emit(running)"),
    occupancyPlot(CONT_ITERS),
    {
      t: "bars",
      label: "slots busy, per iteration",
      v: CONT.map((s) => ({
        k: `iter ${s.iter}`,
        val: s.running.length,
        show: `${s.running.length}/${SLOTS}`,
        cls: (s.running.length === SLOTS ? "good" : "warn") as TraceCls,
      })),
      max: SLOTS,
    }
  );

  // ---- payoff: the same six requests under static batching ---------------
  const staticRows = STATIC.batches.map((b, i) => {
    const tokens = b.ids.reduce((s, id) => s + REQUESTS.find((r) => r.id === id)!.tokens, 0);
    return {
      cells: [
        `batch ${i + 1}`,
        b.ids.join(", "),
        String(b.iters),
        `${tokens}/${b.iters * SLOTS}`,
        `${fmt((tokens / (b.iters * SLOTS)) * 100)}%`,
      ],
      cls: "bad" as TraceCls,
    };
  });

  push(
    `Now the same six requests under **static** batching, where membership is frozen until every member of the batch finishes. Batch 1 is A, B, C, D — and C is done after 2 iterations but its slot stays locked for another 6 while B grinds on. E and F cannot start until iteration 9. Total: ${STATIC.iters} iterations against ${CONT_ITERS}, and overall occupancy ${fmt(
      (contUsed / STATIC_CAPACITY) * 100
    )}% against ${fmt((contUsed / CONT_CAPACITY) * 100)}%. Identical hardware, identical requests, identical total work — the only difference is *when* the batch is allowed to change.`,
    ln("while queue and len(running) < max_seqs"),
    {
      t: "table",
      label: "static schedule",
      head: ["batch", "members", "iterations", "used/capacity", "occupancy"],
      v: staticRows,
    },
    {
      t: "bars",
      label: "iterations to finish all six requests",
      v: [
        { k: "continuous", val: CONT_ITERS, show: String(CONT_ITERS), cls: "good" },
        { k: "static", val: STATIC.iters, show: String(STATIC.iters), cls: "bad" },
      ],
    },
    {
      t: "bars",
      label: "overall slot occupancy",
      v: [
        {
          k: "continuous",
          val: contUsed / CONT_CAPACITY,
          show: `${fmt((contUsed / CONT_CAPACITY) * 100)}%`,
          cls: "good",
        },
        {
          k: "static",
          val: contUsed / STATIC_CAPACITY,
          show: `${fmt((contUsed / STATIC_CAPACITY) * 100)}%`,
          cls: "bad",
        },
      ],
      max: 1,
    },
    {
      t: "note",
      text: "The gap is driven entirely by output-length variance: if every response were the same length, static and continuous would be identical. Real chat traffic spans 50 to 1000+ tokens, which is why production servers measure 50–60% static against 95%+ continuous and beat naive generate() loops several-fold.",
      cls: "warn",
    }
  );

  return {
    id: "continuous-batching",
    title: "Continuous batching — the batch as a revolving door",
    caption:
      "The serving scheduler on the worked trace above: retire, admit, step, stream — once per decode iteration, with four slots and six requests of very different lengths. Watch a finished request's slot get refilled on the very next iteration rather than at the end of the batch. The final step runs the identical workload under static batching for comparison: 12 iterations instead of 8, on the same hardware, purely because membership was frozen.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const continuousBatchingTrace = build();
