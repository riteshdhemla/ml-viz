"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";

/**
 * How an agent turn's context actually gets built.
 *
 * The lesson draws this pipeline as an ASCII arrow diagram — goal, query
 * rewrite, retrieve, inject, model, parse — which shows the boxes but hides the
 * only thing that makes it hard: **it is a packing problem under a budget**.
 * Every stage produces tokens, the window is fixed, and the interesting
 * decisions are all about what to drop. A walkthrough can carry one concrete
 * turn through every stage and let the budget be changed underneath it.
 *
 * Everything is computed from the strings in this file. Token counts come from
 * the actual text (~4 characters per token, the usual English rule of thumb);
 * retrieval is a real TF-IDF cosine over the real chunk bodies, so rewriting the
 * query genuinely moves the ranking rather than being asserted to; recall and
 * precision come from a labelled relevance set; and the packer really fills the
 * budget in priority order and reports what it had to evict.
 */

/* -------------------------------------------------------------- constants */

/** Rule-of-thumb characters per token for English prose. */
const CHARS_PER_TOKEN = 4;
const BUDGETS = [800, 1200, 2000] as const;
/** Tokens the model's answer needs — reserved, never packed over. */
const RESERVED_OUTPUT = 300;
const TOP_K = 4;

const tokens = (s: string) => Math.ceil(s.length / CHARS_PER_TOKEN);

/* ---------------------------------------------------------------- the turn */

const SUBGOAL = "Confirm the user's hotel preference before re-booking.";

/**
 * The naive retrieval query is the subgoal itself; the rewritten one is what the
 * Optimiser produces. Both are run through the same retriever below, which is
 * the point — the improvement is measured, not claimed.
 */
const QUERY_RAW = SUBGOAL;
const QUERY_REWRITTEN =
  "guest room type preference king twin floor quiet reservation refundable change";

const SYSTEM_PROMPT =
  "You are a travel-booking assistant operating on behalf of a customer. Never book or cancel without an explicit confirmation step. Prefer the customer's stated preferences over defaults, and say when you are unsure.";

const TOOL_SPECS = [
  "search_hotels(city, checkin, checkout, room_type) -> list[Hotel]",
  "get_booking(booking_id) -> Booking",
  "cancel_booking(booking_id, reason) -> Receipt",
  "book_hotel(hotel_id, room_type, guest) -> Booking",
  "get_profile(user_id) -> Profile",
].join("\n");

const OUTPUT_SPEC =
  'Respond in JSON: { "next_action": "<tool_name>", "params": {...}, "reasoning": "<one sentence>" }';

const FEW_SHOT =
  'User: "Move my Rome trip a day later"\nResponse: {"next_action": "get_booking", "params": {"booking_id": "B-4417"}, "reasoning": "Need the current booking before proposing a change."}';

interface Chunk {
  id: string;
  source: string;
  body: string;
  /** Whether this chunk actually helps answer the subgoal — the relevance label. */
  relevant: boolean;
}

/**
 * Chunk bodies are full-size on purpose — a few hundred tokens each, the way a
 * real chunker emits them. Token counts are measured from these strings, so the
 * budget pressure downstream is the pressure this corpus really applies.
 */
const CORPUS: Chunk[] = [
  {
    id: "c1",
    source: "profile/preferences",
    body: "Guest profile record. Preferred room type is a quiet king room on a high floor, non-smoking, away from lifts and ice machines where possible. Loyalty tier is gold, enrolled since 2021, with a stated preference for hotels within walking distance of the conference venue rather than airport properties. Bed preference king, pillow preference firm. The guest has previously asked front desks to note the high-floor request on arrival. Billing preference is a single itemised invoice per stay rather than per-night charges. Communication preference is email confirmation for any change to an existing booking, and the profile is flagged to require explicit confirmation before any cancellation is processed on the guest's behalf.",
    relevant: true,
  },
  {
    id: "c2",
    source: "bookings/B-2291",
    body: "Booking reference B-2291. Hotel Meridian, Lisbon, two nights, checking in on the fourteenth. Room type booked is a twin room on the second floor, reserved at the gold loyalty rate with breakfast included. The booking is fully refundable until forty-eight hours before check-in, after which one night is charged. The reservation was made through the assistant on behalf of the guest and has not been modified since. Payment is held against the card ending 4417 and will be captured at check-out. No special requests were attached to this reservation at the time of booking, and no room-type note was carried over from the guest profile.",
    relevant: true,
  },
  {
    id: "c3",
    source: "history/chat-2026-05",
    body: "Transcript excerpt from an earlier conversation. The guest reported that the twin room allocated on the previous Lisbon stay was noisy, with street noise from a low floor and a lift lobby immediately outside the door. The guest asked whether a king room on a higher floor could be requested for future stays, and whether that preference could be stored so it would not have to be repeated each time. The assistant confirmed the preference would be recorded on the profile. The guest also mentioned that the breakfast rate was good value and should be kept on future bookings at the same property.",
    relevant: true,
  },
  {
    id: "c4",
    source: "policies/cancellation",
    body: "Cancellation and change policy. Refundable bookings may be cancelled or amended up to forty-eight hours before the scheduled check-in time for a full refund with no fee. Inside forty-eight hours, one night is charged at the booked rate and the remainder is refunded. Non-refundable rates cannot be cancelled for a refund at any point, though a date change may be offered at the property's discretion subject to a rate difference. Where a room type is changed on an existing refundable booking, the original reservation is cancelled and rebooked at the current available rate for the new room type, which may differ from the rate originally booked.",
    relevant: true,
  },
  {
    id: "c5",
    source: "policies/baggage",
    body: "Baggage policy for partner airlines. Checked bags are limited to twenty-three kilograms per item on economy fares, with a maximum of one checked bag included unless the fare family states otherwise. Excess baggage is charged per kilogram at the airport and is materially cheaper when pre-purchased online at least six hours before departure. Cabin baggage is limited to one item plus a personal item, with size restrictions enforced at the gate on full flights. Sports equipment and musical instruments require advance declaration. Damaged or delayed baggage must be reported at the arrival airport before leaving the baggage hall.",
    relevant: false,
  },
  {
    id: "c6",
    source: "marketing/newsletter",
    body: "Monthly newsletter. Our summer sale offers up to thirty percent off selected city hotels across Europe, with the deepest discounts on stays of three nights or more booked before the end of the month. Members of the loyalty programme receive an additional five percent and early access to the sale inventory. This month we are also highlighting new properties in Porto, Seville and Krakow, each with a rooftop restaurant and a fitness centre. Terms apply; sale rates are non-refundable and cannot be combined with corporate rates or other promotional codes.",
    relevant: false,
  },
  {
    id: "c7",
    source: "bookings/B-1180",
    body: "Booking reference B-1180, archived. Airport Inn, Madrid, one night, standard room, booked on a non-refundable rate for a late-evening arrival. The reservation was cancelled by the guest eleven months ago with no refund due under the rate rules, and the charge was settled in full at the time of cancellation. The property was selected for proximity to the terminal rather than for room quality, and no preferences were applied to the booking. This record is retained for billing history only and does not reflect the guest's current stated preferences.",
    relevant: false,
  },
  {
    id: "c8",
    source: "faq/loyalty",
    body: "Loyalty programme frequently asked questions. Gold members receive complimentary room upgrades subject to availability at check-in, and may request a preferred floor or a quiet room when the reservation is made rather than on arrival. Requests noted at booking time are honoured more often than requests made at the desk. Gold status also includes late check-out until two in the afternoon and a breakfast allowance at participating properties. Upgrades are allocated on the morning of arrival and cannot be guaranteed in advance; where an upgrade is not available, the property will attempt to meet the stated room preference within the booked category.",
    relevant: false,
  },
];

const N_RELEVANT = CORPUS.filter((c) => c.relevant).length;

/** Prior turns, newest last — the history that competes for the same budget. */
const HISTORY = [
  'User: "Something went wrong with the Lisbon hotel again and I would rather not repeat the whole story. Can you just sort it out for me before the trip?"',
  'Assistant: "I can see booking B-2291 at Hotel Meridian, two nights from the fourteenth, currently a twin room on a refundable rate. What would you like changed?"',
  'User: "The room was the problem last time, not the hotel. Same city, same dates, same property if you can — just not that room again."',
  'Assistant: "Understood. Let me check what room types are available at the Meridian for those dates before I change anything."',
];

/* -------------------------------------------------------------- retrieval */

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "and", "or", "in", "on", "at",
  "for", "with", "that", "this", "it", "its", "as", "by", "from", "up", "before", "after", "may",
  "can", "could", "s",
]);

const terms = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

/** Document frequency over the corpus, for the IDF weights. */
const DF = (() => {
  const df: Record<string, number> = {};
  for (const c of CORPUS) for (const w of new Set(terms(c.body))) df[w] = (df[w] ?? 0) + 1;
  return df;
})();

/** L2-normalised TF-IDF vector. */
function vector(text: string): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const w of terms(text)) tf[w] = (tf[w] ?? 0) + 1;
  const v: Record<string, number> = {};
  let norm = 0;
  for (const [w, n] of Object.entries(tf)) {
    const idf = Math.log((1 + CORPUS.length) / (1 + (DF[w] ?? 0))) + 1;
    const x = (1 + Math.log(n)) * idf;
    v[w] = x;
    norm += x * x;
  }
  norm = Math.sqrt(norm) || 1;
  for (const w of Object.keys(v)) v[w] /= norm;
  return v;
}

const CHUNK_VECTORS = CORPUS.map((c) => vector(c.body));

function cosine(a: Record<string, number>, b: Record<string, number>): number {
  let s = 0;
  for (const [w, x] of Object.entries(a)) s += x * (b[w] ?? 0);
  return s;
}

interface Scored {
  chunk: Chunk;
  score: number;
  rank: number;
}

/** Rank the corpus against a query — the actual retrieval step. */
function retrieve(query: string): Scored[] {
  const qv = vector(query);
  return CORPUS.map((chunk, i) => ({ chunk, score: cosine(qv, CHUNK_VECTORS[i]), rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

const RANKED_RAW = retrieve(QUERY_RAW);
const RANKED_REWRITTEN = retrieve(QUERY_REWRITTEN);

interface Quality {
  hits: number;
  recall: number;
  precision: number;
  /** Reciprocal rank of the first relevant chunk. */
  rr: number;
}

function quality(ranked: Scored[], k: number): Quality {
  const top = ranked.slice(0, k);
  const hits = top.filter((s) => s.chunk.relevant).length;
  const first = ranked.findIndex((s) => s.chunk.relevant) + 1;
  return {
    hits,
    recall: hits / N_RELEVANT,
    precision: hits / k,
    rr: first ? 1 / first : 0,
  };
}

const Q_RAW = quality(RANKED_RAW, TOP_K);
const Q_REWRITTEN = quality(RANKED_REWRITTEN, TOP_K);

/* ---------------------------------------------------------------- packing */

type Kind = "system" | "tools" | "format" | "shots" | "task" | "chunk" | "history";

interface Block {
  key: string;
  kind: Kind;
  label: string;
  tokens: number;
  /** Lower packs first. Fixed scaffolding is 0; everything else negotiates. */
  priority: number;
  dropped?: boolean;
}

const KIND_COLOR: Record<Kind, string> = {
  system: VIZ.axis,
  tools: VIZ.axis,
  format: VIZ.axis,
  shots: VIZ.brandLight,
  task: VIZ.teal,
  chunk: VIZ.brand,
  history: VIZ.yellow,
};

const KIND_LABEL: Record<Kind, string> = {
  system: "system prompt",
  tools: "tool specs",
  format: "output spec",
  shots: "few-shot example",
  task: "task",
  chunk: "retrieved chunk",
  history: "conversation history",
};

/**
 * The blocks competing for the window, in the order a real assembler would give
 * them up: scaffolding is non-negotiable, then the task, then retrieved chunks
 * by score, and history last — oldest turns are the cheapest thing to lose.
 */
function buildBlocks(ranked: Scored[], k: number): Block[] {
  const fixed: Block[] = [
    { key: "system", kind: "system", label: "system prompt", tokens: tokens(SYSTEM_PROMPT), priority: 0 },
    { key: "tools", kind: "tools", label: `tool specs × ${TOOL_SPECS.split("\n").length}`, tokens: tokens(TOOL_SPECS), priority: 0 },
    { key: "format", kind: "format", label: "output spec", tokens: tokens(OUTPUT_SPEC), priority: 0 },
    { key: "task", kind: "task", label: "task / subgoal", tokens: tokens(SUBGOAL), priority: 1 },
    { key: "shots", kind: "shots", label: "few-shot example", tokens: tokens(FEW_SHOT), priority: 2 },
  ];
  const chunks: Block[] = ranked.slice(0, k).map((s, i) => ({
    key: s.chunk.id,
    kind: "chunk",
    label: `${s.chunk.source} (${s.score.toFixed(2)})`,
    tokens: tokens(s.chunk.body),
    priority: 3 + i,
  }));
  // Newest turns are the most useful, so they get the lower priority number.
  const history: Block[] = [...HISTORY].reverse().map((h, i) => ({
    key: `h${i}`,
    kind: "history",
    label: `turn −${i + 1}`,
    tokens: tokens(h),
    priority: 20 + i,
  }));
  return [...fixed, ...chunks, ...history];
}

interface Packed {
  kept: Block[];
  dropped: Block[];
  used: number;
  budget: number;
  /** Tokens available to pack, after reserving room for the answer. */
  usable: number;
}

/**
 * Fill in strict priority order and stop at the first block that does not fit.
 * Skipping a large block to squeeze in a smaller one behind it would use the
 * budget more efficiently, and is exactly what you must not do: it silently
 * reorders the agent's own notion of what matters, so a long retrieved document
 * loses to a short stale turn. Whatever slack is left is left.
 */
function pack(blocks: Block[], budget: number): Packed {
  const usable = budget - RESERVED_OUTPUT;
  const ordered = [...blocks].sort((x, z) => x.priority - z.priority);
  const kept: Block[] = [];
  let used = 0;
  let cut = ordered.length;
  for (let i = 0; i < ordered.length; i++) {
    if (used + ordered[i].tokens > usable) {
      cut = i;
      break;
    }
    kept.push(ordered[i]);
    used += ordered[i].tokens;
  }
  const dropped = ordered.slice(cut).map((b) => ({ ...b, dropped: true }));
  return { kept, dropped, used, budget, usable };
}

/* ------------------------------------------------------------------ steps */

const PHASES: GuidedPhase[] = [
  { id: "build", label: "Assembling the context", tone: "teal" },
  { id: "call", label: "Calling the model", tone: "brand", numberPrefix: "C" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "build",
    label: "The subgoal",
    title: "The agent has a subgoal, and nothing to answer it with",
    body: (
      <>
        <p>
          Mid-task, the planner emits a subgoal: <em>&ldquo;{SUBGOAL}&rdquo;</em>. Sent to the model
          as-is, this is <strong>{tokens(SUBGOAL)} tokens</strong> of instruction with no facts
          attached — no profile, no booking, no policy, no memory of what the user already said.
        </p>
        <p>
          The model cannot say &ldquo;I wasn&rsquo;t given that&rdquo;; it has no way to tell the
          difference between a fact it lacks and one it never needed. So it produces something
          fluent and invented. Everything downstream exists to make sure the facts are in the window
          before the model reasons.
        </p>
      </>
    ),
    hint: "Note the size of the ask against the size of the window: almost all of the budget is still unspent, and none of it is information.",
  },
  {
    phase: "build",
    label: "Rewrite the query",
    title: "Rewrite the subgoal into something a retriever can use",
    body: (
      <>
        <p>
          A subgoal is written for the agent, not for the index. &ldquo;Confirm the user&rsquo;s
          hotel preference&rdquo; is mostly instruction words — <em>confirm</em>, <em>before</em>,{" "}
          <em>re-booking</em> — that no document contains. The Optimiser rewrites it into the
          vocabulary the corpus actually uses.
        </p>
        <p>
          Both queries are scored against the same corpus here, so the difference is measured rather
          than asserted: recall@{TOP_K} goes from{" "}
          <strong>{(Q_RAW.recall * 100).toFixed(0)}%</strong> to{" "}
          <strong>{(Q_REWRITTEN.recall * 100).toFixed(0)}%</strong>. Skip this step and every later
          stage is packing the wrong documents beautifully.
        </p>
      </>
    ),
    hint: "Compare the two rankings: the same retriever, the same corpus, a different query.",
  },
  {
    phase: "build",
    label: "Retrieve",
    title: "Retrieve top-k, and know what you missed",
    body: (
      <>
        <p>
          The rewritten query is embedded and the corpus ranked by similarity; the top{" "}
          <strong>k = {TOP_K}</strong> come back. Two numbers describe how that went.{" "}
          <strong>Recall</strong> asks whether the facts you needed are in the set at all —
          missing ones cannot be recovered later by any amount of clever prompting.{" "}
          <strong>Precision</strong> asks how much of what you retrieved was worth its tokens.
        </p>
        <p>
          They trade against each other through k. Raising k almost always raises recall and
          always lowers precision, and every extra chunk is budget you no longer have for history
          or for the answer. That trade is settled in the next step, not this one.
        </p>
      </>
    ),
    hint: "The green rows are genuinely relevant. Watch which ones land above the cut line — and which relevant one does not.",
  },
  {
    phase: "build",
    label: "Pack the window",
    title: "Pack the window — and decide what to lose",
    body: (
      <>
        <p>
          Now everything competes for one fixed budget: system prompt, tool specs, output spec,
          few-shot example, the task, the retrieved chunks, and the conversation history — minus{" "}
          <strong>{RESERVED_OUTPUT} tokens</strong> reserved so the model can actually reply.
          Scaffolding is non-negotiable, so the squeeze falls on chunks and history.
        </p>
        <p>
          This is the part the arrow diagram hides. There is no version of this pipeline where
          everything fits; the design decision is <em>what gets dropped and in what order</em>, and
          a silent eviction of the oldest turns is how agents come to forget what the user told them
          two messages ago.
        </p>
        <p className="text-[13px] text-slate-500">
          The budgets here are scaled to a toy corpus of {CORPUS.length} chunks and {HISTORY.length}{" "}
          turns. Production windows are far larger — and so is everything competing for them: a
          long-running agent carries hundreds of turns and tool outputs that dwarf any document.
          The arithmetic is identical; only the numbers move.
        </p>
      </>
    ),
    hint: "Change the window size above. At the smallest budget, watch which blocks fall out of the bar — and what that costs the answer.",
  },
  {
    phase: "call",
    label: "Call & parse",
    title: "Call the model, then refuse to trust the output",
    body: (
      <>
        <p>
          The assembled prompt goes to the model and comes back as text — often wrapped in markdown
          fences, occasionally with a preamble, sometimes as a refusal or a hedge. The
          post-processor extracts the JSON, normalises fields (&ldquo;next Friday&rdquo; to an ISO
          date), validates against the schema, and retries with a rephrased prompt when parsing
          fails.
        </p>
        <p>
          Without this the agent is one stray sentence away from a crash: an orchestrator that does{" "}
          <code>JSON.parse(response)</code> works right up until the model says &ldquo;Sure! Here is
          the JSON:&rdquo; first. Detecting a refusal matters just as much — an unparsed refusal
          becomes a retry loop rather than a stop.
        </p>
      </>
    ),
    hint: "Every arrow in this pipeline is a failure boundary; this one is the boundary between the model's world and your type system.",
  },
  {
    phase: "call",
    label: "The payoff",
    title: "What the assembled context bought",
    body: (
      <>
        <p>
          The same subgoal, twice. Sent raw, the model has an instruction and no facts. Sent through
          the pipeline, it has the profile, the live booking, the policy that governs it and the
          user&rsquo;s own words about what went wrong — inside the budget, with room left to
          answer.
        </p>
        <p>
          Neither pattern is optional and neither is sufficient alone. Retrieval with no Optimiser
          fetches documents against a query written for a planner; an Optimiser with no retrieval
          formats a beautifully structured prompt around facts the model does not have.
        </p>
      </>
    ),
    hint: "Drop the budget to the smallest setting and re-read this step: the same pipeline, degraded, and you can name exactly which fact went missing.",
  },
];

const S_SUBGOAL = 0;
const S_REWRITE = 1;
const S_RETRIEVE = 2;
const S_PACK = 3;
const S_PARSE = 4;
const S_PAYOFF = 5;

/* ------------------------------------------------------------------- view */

export function ContextAssemblyViz({ className }: { className?: string }) {
  const [budget, setBudget] = useState<number>(1200);
  const [k, setK] = useState(TOP_K);

  const packed = useMemo(() => pack(buildBlocks(RANKED_REWRITTEN, k), budget), [budget, k]);
  const q = useMemo(() => quality(RANKED_REWRITTEN, k), [k]);
  const keptChunks = packed.kept.filter((b) => b.kind === "chunk");
  const droppedChunks = packed.dropped.filter((b) => b.kind === "chunk");
  const droppedHistory = packed.dropped.filter((b) => b.kind === "history");

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        window
      </span>
      {BUDGETS.map((b) => (
        <VizButton key={b} onClick={() => setBudget(b)} active={budget === b}>
          {b.toLocaleString("en-US")} tok
        </VizButton>
      ))}
      <span className="ml-2 self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        top-k
      </span>
      {[2, 4, 6].map((n) => (
        <VizButton key={n} onClick={() => setK(n)} active={k === n}>
          {n}
        </VizButton>
      ))}
    </>
  );

  /* -------------------------------------------------------------- stages */

  /** A ranked list of chunks with score bars and the top-k cut line. */
  const rankingRows = (ranked: Scored[], cut: number, x: number, w: number, yTop: number) => {
    const rowH = 26;
    const max = Math.max(...ranked.map((s) => s.score), 1e-6);
    return ranked.map((s, i) => {
      const yy = yTop + i * rowH;
      const inTop = i < cut;
      return (
        <g key={s.chunk.id} opacity={inTop ? 1 : 0.45}>
          <rect
            x={x}
            y={yy}
            width={w}
            height={rowH - 4}
            rx={4}
            fill={s.chunk.relevant ? VIZ.teal : VIZ.card}
            opacity={s.chunk.relevant ? 0.13 : 0.6}
          />
          <text x={x + 8} y={yy + 15} fill={VIZ.textBright} className="font-mono text-[10px]">
            {s.chunk.source}
          </text>
          <rect
            x={x + w - 118}
            y={yy + 6}
            width={Math.max(1, (s.score / max) * 70)}
            height={10}
            rx={2}
            fill={s.chunk.relevant ? VIZ.teal : VIZ.axis}
          />
          <text
            x={x + w - 8}
            y={yy + 15}
            textAnchor="end"
            fill={VIZ.text}
            className="font-mono text-[10px]"
          >
            {s.score.toFixed(2)}
          </text>
        </g>
      );
    });
  };

  /** Step 01 — the bare subgoal against an empty window. */
  const subgoalStage = () => {
    const ask = tokens(SUBGOAL);
    return (
      <svg viewBox="0 0 680 220" className="block w-full" role="img" aria-label="The subgoal alone in an otherwise empty context window">
        <text x={52} y={30} fill={VIZ.textBright} className="font-mono text-[10px]">
          what the model receives
        </text>
        <rect x={52} y={44} width={600} height={44} rx={6} fill={VIZ.card} stroke={VIZ.grid} />
        <text x={64} y={71} fill={VIZ.teal} className="font-mono text-[11px]">
          &ldquo;{SUBGOAL}&rdquo;
        </text>

        <text x={52} y={122} fill={VIZ.textBright} className="font-mono text-[10px]">
          the window it sits in · {budget.toLocaleString("en-US")} tokens
        </text>
        <rect x={52} y={134} width={600} height={26} rx={4} fill={VIZ.card} stroke={VIZ.grid} />
        <rect x={52} y={134} width={Math.max(2, (ask / budget) * 600)} height={26} rx={4} fill={VIZ.teal} />
        <text x={52} y={182} fill={VIZ.text} className="font-mono text-[9px]">
          {ask} tokens of instruction · {(100 - (ask / budget) * 100).toFixed(1)}% of the window
          unused, and no facts in any of it
        </text>
        <text x={52} y={202} fill={VIZ.rose} className="font-mono text-[9px]">
          likely outcome: a fluent, invented preference
        </text>
      </svg>
    );
  };

  /** Step 02 — raw query vs rewritten, same retriever. */
  const rewriteStage = () => (
    <svg viewBox="0 0 680 272" className="block w-full" role="img" aria-label="Retrieval ranking for the raw subgoal versus the rewritten query">
      <text x={40} y={24} fill={VIZ.rose} className="font-mono text-[10px]">
        raw subgoal as query
      </text>
      <text x={40} y={40} fill={VIZ.text} className="font-mono text-[9px]">
        recall@{TOP_K} {(Q_RAW.recall * 100).toFixed(0)}% · precision {(Q_RAW.precision * 100).toFixed(0)}% · MRR {Q_RAW.rr.toFixed(2)}
      </text>
      {rankingRows(RANKED_RAW.slice(0, 5), TOP_K, 40, 290, 52)}

      <text x={350} y={24} fill={VIZ.teal} className="font-mono text-[10px]">
        rewritten query
      </text>
      <text x={350} y={40} fill={VIZ.text} className="font-mono text-[9px]">
        recall@{TOP_K} {(Q_REWRITTEN.recall * 100).toFixed(0)}% · precision {(Q_REWRITTEN.precision * 100).toFixed(0)}% · MRR {Q_REWRITTEN.rr.toFixed(2)}
      </text>
      {rankingRows(RANKED_REWRITTEN.slice(0, 5), TOP_K, 350, 290, 52)}

      <text x={40} y={210} fill={VIZ.text} className="font-mono text-[9px]">
        &ldquo;{QUERY_RAW}&rdquo;
      </text>
      <text x={350} y={210} fill={VIZ.text} className="font-mono text-[9px]">
        &ldquo;guest room type preference king twin
      </text>
      <text x={350} y={224} fill={VIZ.text} className="font-mono text-[9px]">
        floor quiet reservation refundable change&rdquo;
      </text>
      <text x={40} y={252} fill={VIZ.textBright} className="font-mono text-[9px]">
        same corpus, same TF-IDF cosine retriever, {N_RELEVANT} genuinely relevant chunks of {CORPUS.length}
      </text>
    </svg>
  );

  /** Step 03 — the full ranking with the cut line at k. */
  const retrieveStage = () => {
    const missed = RANKED_REWRITTEN.slice(k).filter((s) => s.chunk.relevant);
    return (
      <svg viewBox={`0 0 680 ${70 + CORPUS.length * 26 + 40}`} className="block w-full" role="img" aria-label="The full corpus ranked against the rewritten query, with the top-k cut line">
        <text x={52} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          corpus ranked by cosine similarity · cut at k = {k}
        </text>
        <text x={652} y={24} textAnchor="end" fill={VIZ.text} className="font-mono text-[10px]">
          recall {(q.recall * 100).toFixed(0)}% · precision {(q.precision * 100).toFixed(0)}%
        </text>
        {rankingRows(RANKED_REWRITTEN, k, 52, 600, 40)}
        <line
          x1={52}
          y1={40 + k * 26 - 3}
          x2={652}
          y2={40 + k * 26 - 3}
          stroke={VIZ.orange}
          strokeWidth={1.2}
          strokeDasharray="5 3"
        />
        <text x={652} y={40 + k * 26 + 11} textAnchor="end" fill={VIZ.orange} className="font-mono text-[9px]">
          ↑ retrieved · ↓ never seen by the model
        </text>
        <text x={52} y={70 + CORPUS.length * 26 + 20} fill={missed.length ? VIZ.rose : VIZ.teal} className="font-mono text-[9px]">
          {missed.length
            ? `${missed.length} relevant chunk${missed.length > 1 ? "s" : ""} below the cut: ${missed.map((s) => s.chunk.source).join(", ")}`
            : "every relevant chunk is above the cut"}
        </text>
      </svg>
    );
  };

  /** Step F1 — the budget bar with what fits and what was evicted. */
  const packStage = () => {
    const x = 52;
    const w = 600;
    let cursor = x;
    const scale = w / packed.usable;
    return (
      <svg viewBox="0 0 680 300" className="block w-full" role="img" aria-label="The context window packed to its budget, showing which blocks fit and which were dropped">
        <text x={x} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          window {budget.toLocaleString("en-US")} · {RESERVED_OUTPUT} reserved for the answer ·{" "}
          {packed.usable.toLocaleString("en-US")} packable
        </text>
        <rect x={x} y={38} width={w} height={34} rx={5} fill={VIZ.card} stroke={VIZ.grid} />
        {packed.kept.map((b) => {
          const bw = b.tokens * scale;
          const bx = cursor;
          cursor += bw;
          return (
            <rect
              key={b.key}
              x={bx}
              y={38}
              width={Math.max(1, bw - 1)}
              height={34}
              fill={KIND_COLOR[b.kind]}
              opacity={b.kind === "chunk" ? 0.85 : 0.6}
            >
              <title>{`${b.label} — ${b.tokens} tokens`}</title>
            </rect>
          );
        })}
        <text x={x} y={88} fill={VIZ.text} className="font-mono text-[9px]">
          {packed.used.toLocaleString("en-US")} / {packed.usable.toLocaleString("en-US")} packed ·{" "}
          {(packed.usable - packed.used).toLocaleString("en-US")} spare
        </text>

        <text x={x} y={122} fill={VIZ.teal} className="font-mono text-[10px]">
          in the prompt ({packed.kept.length})
        </text>
        {packed.kept.slice(0, 9).map((b, i) => (
          <g key={b.key}>
            <rect x={x} y={132 + i * 17} width={7} height={7} rx={1.5} fill={KIND_COLOR[b.kind]} />
            <text x={x + 14} y={139 + i * 17} fill={VIZ.text} className="font-mono text-[9px]">
              {b.label}
            </text>
            <text x={x + 280} y={139 + i * 17} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
              {b.tokens}
            </text>
          </g>
        ))}

        <text x={370} y={122} fill={packed.dropped.length ? VIZ.rose : VIZ.teal} className="font-mono text-[10px]">
          {packed.dropped.length ? `evicted (${packed.dropped.length})` : "nothing evicted"}
        </text>
        {packed.dropped.slice(0, 9).map((b, i) => (
          <g key={b.key}>
            <rect x={370} y={132 + i * 17} width={7} height={7} rx={1.5} fill={VIZ.rose} opacity={0.5} />
            <text x={384} y={139 + i * 17} fill={VIZ.rose} className="font-mono text-[9px]">
              {KIND_LABEL[b.kind]} · {b.label}
            </text>
            <text x={652} y={139 + i * 17} textAnchor="end" fill={VIZ.rose} className="font-mono text-[9px]">
              {b.tokens}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  /** Step C1 — the parse/validate boundary. */
  const parseStage = () => {
    const raw = '```json\nSure! Here is the call:\n{ "next_action": "get_booking",\n  "params": { "booking_id": "B-2291" },\n  "reasoning": "Need the live booking before proposing a room change." }\n```';
    const lines = raw.split("\n");
    return (
      <svg viewBox="0 0 680 270" className="block w-full" role="img" aria-label="Raw model output and the parsed, validated action">
        <text x={40} y={24} fill={VIZ.text} className="font-mono text-[10px]">
          raw completion
        </text>
        <rect x={40} y={34} width={296} height={130} rx={5} fill={VIZ.card} stroke={VIZ.grid} />
        {lines.map((l, i) => (
          <text key={i} x={50} y={54 + i * 17} fill={i === 0 || i === lines.length - 1 || i === 1 ? VIZ.rose : VIZ.text} className="font-mono text-[8.5px]">
            {l.length > 44 ? `${l.slice(0, 44)}…` : l}
          </text>
        ))}
        <text x={40} y={184} fill={VIZ.rose} className="font-mono text-[9px]">
          fenced · prefixed with prose · not JSON.parse-able
        </text>

        <text x={368} y={24} fill={VIZ.text} className="font-mono text-[10px]">
          after post-processing
        </text>
        <rect x={368} y={34} width={284} height={130} rx={5} fill={VIZ.card} stroke={VIZ.teal} strokeOpacity={0.35} />
        {[
          "strip fences, drop the preamble",
          "parse JSON",
          "validate against the tool schema",
          "normalise dates and enums",
          "check for refusal / hedging",
        ].map((l, i) => (
          <g key={l}>
            <text x={380} y={56 + i * 21} fill={VIZ.teal} className="font-mono text-[9px]">
              ✓
            </text>
            <text x={396} y={56 + i * 21} fill={VIZ.text} className="font-mono text-[9px]">
              {l}
            </text>
          </g>
        ))}
        <text x={368} y={184} fill={VIZ.teal} className="font-mono text-[9px]">
          → get_booking(booking_id=&ldquo;B-2291&rdquo;) — a typed action
        </text>
        <text x={40} y={224} fill={VIZ.text} className="font-mono text-[9px]">
          on parse failure: retry with a rephrased prompt · on refusal: stop, do not loop
        </text>
      </svg>
    );
  };

  /** Step C2 — naive vs assembled, side by side. */
  const payoffStage = () => (
    <svg viewBox="0 0 680 250" className="block w-full" role="img" aria-label="The same subgoal answered without and with the assembled context">
      <text x={40} y={24} fill={VIZ.rose} className="font-mono text-[10px]">
        subgoal sent raw
      </text>
      <rect x={40} y={34} width={296} height={150} rx={5} fill={VIZ.card} stroke={VIZ.grid} />
      <text x={52} y={58} fill={VIZ.text} className="font-mono text-[9px]">
        facts available: none
      </text>
      <text x={52} y={78} fill={VIZ.text} className="font-mono text-[9px]">
        tokens used: {tokens(SUBGOAL)}
      </text>
      <text x={52} y={106} fill={VIZ.rose} className="font-mono text-[9px]">
        &ldquo;You usually prefer a standard
      </text>
      <text x={52} y={120} fill={VIZ.rose} className="font-mono text-[9px]">
        double room — shall I rebook that?&rdquo;
      </text>
      <text x={52} y={148} fill={VIZ.rose} className="font-mono text-[9px]">
        invented, and confidently
      </text>

      <text x={368} y={24} fill={VIZ.teal} className="font-mono text-[10px]">
        subgoal through the pipeline
      </text>
      <rect x={368} y={34} width={284} height={150} rx={5} fill={VIZ.card} stroke={VIZ.teal} strokeOpacity={0.35} />
      <text x={380} y={58} fill={VIZ.text} className="font-mono text-[9px]">
        facts available: {keptChunks.length} chunks
      </text>
      <text x={380} y={78} fill={VIZ.text} className="font-mono text-[9px]">
        tokens used: {packed.used.toLocaleString("en-US")} of {packed.usable.toLocaleString("en-US")}
      </text>
      <text x={380} y={106} fill={VIZ.teal} className="font-mono text-[9px]">
        &ldquo;You asked for a quiet king room on
      </text>
      <text x={380} y={120} fill={VIZ.teal} className="font-mono text-[9px]">
        a high floor after the twin was noisy.
      </text>
      <text x={380} y={134} fill={VIZ.teal} className="font-mono text-[9px]">
        B-2291 is refundable for 48h — rebook?&rdquo;
      </text>
      <text x={380} y={162} fill={VIZ.teal} className="font-mono text-[9px]">
        every clause traceable to a chunk
      </text>

      <text x={40} y={212} fill={VIZ.text} className="font-mono text-[9px]">
        {droppedChunks.length + droppedHistory.length === 0
          ? "at this budget nothing had to be evicted"
          : `at this budget the agent is answering without ${[
              droppedChunks.length ? `${droppedChunks.length} retrieved chunk(s)` : "",
              droppedHistory.length ? `${droppedHistory.length} earlier turn(s)` : "",
            ]
              .filter(Boolean)
              .join(" and ")}`}
      </text>
    </svg>
  );

  const stage = (i: number) => {
    if (i === S_SUBGOAL) return subgoalStage();
    if (i === S_REWRITE) return rewriteStage();
    if (i === S_RETRIEVE) return retrieveStage();
    if (i === S_PACK) return packStage();
    if (i === S_PARSE) return parseStage();
    return payoffStage();
  };

  /* --------------------------------------------------------------- panel */

  const panel = (i: number) => (
    <>
      <PanelTitle>What is in the window so far</PanelTitle>
      <div className="flex flex-wrap gap-2.5">
        <GuidedCard label="task" accent={VIZ.teal}>
          The subgoal · <Num>{tokens(SUBGOAL)}</Num> tokens, no facts attached.
        </GuidedCard>

        {i >= S_REWRITE && (
          <GuidedCard label="query" accent={VIZ.brandLight}>
            Rewritten for the index · recall@{TOP_K} {(Q_RAW.recall * 100).toFixed(0)}% →{" "}
            <Num>{(Q_REWRITTEN.recall * 100).toFixed(0)}%</Num>.
          </GuidedCard>
        )}

        {i >= S_RETRIEVE && (
          <GuidedCard label="retrieved" accent={VIZ.brand}>
            top-{k} of {CORPUS.length} · <Num>{q.hits}</Num>/{N_RELEVANT} relevant found, precision{" "}
            {(q.precision * 100).toFixed(0)}%.
          </GuidedCard>
        )}

        {i >= S_PACK && (
          <GuidedCard label="packed" accent={packed.dropped.length ? VIZ.rose : VIZ.yellow}>
            <Num>{packed.used.toLocaleString("en-US")}</Num> /{" "}
            {packed.usable.toLocaleString("en-US")} tokens ·{" "}
            {packed.dropped.length ? `${packed.dropped.length} block(s) evicted` : "everything fit"}.
          </GuidedCard>
        )}

        {i >= S_PARSE && (
          <GuidedCard label="action" accent={VIZ.orange}>
            Parsed and schema-validated → <Num>get_booking(B-2291)</Num>.
          </GuidedCard>
        )}
      </div>

      {i === S_PACK && (
        <GuidedPayoff label="the budget decides the behaviour">
          At the {budget.toLocaleString("en-US")}-token window,{" "}
          <strong className="font-semibold text-white">
            {packed.kept.length} of {packed.kept.length + packed.dropped.length} blocks
          </strong>{" "}
          survive.{" "}
          {packed.dropped.length === 0
            ? "Nothing is evicted here — which is exactly why bugs of this kind never show up in a demo and always show up in production, where the history is fifty turns long, not four."
            : `The evictions are silent: nothing tells the model that ${droppedHistory.length ? "earlier turns" : "retrieved facts"} used to be there. This is what an agent "forgetting" what you told it actually is.`}
        </GuidedPayoff>
      )}

      {i === S_PAYOFF && (
        <GuidedPayoff label="what the pipeline bought">
          Neither pattern works alone. The Optimiser without retrieval formats a beautiful prompt
          around facts the model does not have; retrieval without the Optimiser searches the index
          with a query written for a planner and packs whatever it finds until the window overflows.
          Together they turn <strong className="font-semibold text-white">{tokens(SUBGOAL)} tokens
          of instruction</strong> into{" "}
          <strong className="font-semibold text-white">{packed.used.toLocaleString("en-US")} tokens
          of grounded context</strong> — with {RESERVED_OUTPUT} still held back so the model can
          answer.
        </GuidedPayoff>
      )}
    </>
  );

  const legend = (i: number) => {
    if (i === S_REWRITE || i === S_RETRIEVE)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>relevant chunk</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>irrelevant</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>top-k cut</GuidedLegend>
        </>
      );
    if (i === S_PACK)
      return (
        <>
          <GuidedLegend color={VIZ.axis}>scaffolding</GuidedLegend>
          <GuidedLegend color={VIZ.teal}>task</GuidedLegend>
          <GuidedLegend color={VIZ.brand}>retrieved chunk</GuidedLegend>
          <GuidedLegend color={VIZ.yellow}>history</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>evicted</GuidedLegend>
        </>
      );
    return <GuidedLegend color={VIZ.teal}>the agent&rsquo;s turn</GuidedLegend>;
  };

  const stageNote = (i: number) => {
    if (i === S_REWRITE || i === S_RETRIEVE) return `${CORPUS.length} chunks · top-k = ${k}`;
    return `${budget.toLocaleString("en-US")}-token window`;
  };

  return (
    <GuidedViz
      className={className}
      title="Assembling one agent turn, step by step"
      caption="The Optimiser and RAG composed into the pipeline the lesson draws as arrows — rewrite, retrieve, pack, call, parse — carried through one concrete subgoal. Retrieval is a real TF-IDF cosine over the chunk texts, token counts are measured from them, and the packer really fills the budget in priority order: changing the window size or top-k re-runs all of it, so the trade between more retrieved facts and more remembered conversation is one you can make yourself."
      phases={PHASES}
      steps={STEPS}
      controls={controls}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
    />
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
      {children}
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-200">{children}</span>;
}
