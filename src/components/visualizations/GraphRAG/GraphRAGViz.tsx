"use client";

import { useMemo, useState } from "react";
import { VIZ } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedEmpty,
  GuidedLegend,
  GuidedPayoff,
  useStagger,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { cn } from "@/lib/utils";

/**
 * GraphRAG, stage by stage.
 *
 * The whole point of GraphRAG is that four offline stages — extract, assemble,
 * cluster, summarise — buy you two query modes that top-k retrieval cannot
 * reach. A single picture can't show that, because each stage only makes sense
 * once you've seen what the previous one produced. So this is a guided
 * walkthrough: the same toy corpus is carried through all six steps, and the
 * graph accumulates structure as you advance.
 *
 * The two query steps are the payoff. **Local search** is interactive — click
 * any entity and the neighbourhood it pulls in is assembled into a context
 * card, with a count of how many communities that neighbourhood spans (the
 * cross-community links are exactly what never co-occur inside one chunk).
 * **Global search** animates the map-reduce over community summaries, which is
 * the query shape that has no vector-retrieval equivalent at all.
 *
 * The corpus is a toy knowledge graph about transformer research: small enough
 * to read every label, large enough that the community structure is real.
 */

/* ------------------------------------------------------------------- data */

interface Community {
  id: number;
  name: string;
  color: string;
  summary: string;
  /** The partial answer this community contributes during global search. */
  partial: string;
}

const COMM: Community[] = [
  {
    id: 0,
    name: "Architecture",
    color: VIZ.teal,
    summary:
      "Core building blocks: the Transformer and its attention mechanism, split into encoder and decoder stacks.",
    partial: "Theme: the attention-based architecture itself.",
  },
  {
    id: 1,
    name: "Model family",
    color: VIZ.brand,
    summary:
      "Descendant models — BERT, GPT, T5 — that specialise the base architecture for different objectives.",
    partial: "Theme: a family of specialised descendant models.",
  },
  {
    id: 2,
    name: "Origins",
    color: VIZ.yellow,
    summary: "Who built what: Vaswani et al., Google Brain and OpenAI, the labs behind the work.",
    partial: "Theme: the labs and authors who originated it.",
  },
  {
    id: 3,
    name: "Applications",
    color: VIZ.rose,
    summary:
      "Downstream tasks the models are applied to: translation, summarisation and question answering.",
    partial: "Theme: the downstream tasks it is applied to.",
  },
];

/** Colour for retrieval / traversal — deliberately outside the community palette. */
const SIGNAL = VIZ.orange;

interface GNode {
  id: string;
  label: string;
  c: number;
  x: number;
  y: number;
  r: number;
}

const NODES: GNode[] = [
  { id: "transformer", label: "Transformer", c: 0, x: 190, y: 150, r: 15 },
  { id: "attention", label: "Attention", c: 0, x: 96, y: 96, r: 11 },
  { id: "selfattn", label: "Self-Attn", c: 0, x: 110, y: 210, r: 10 },
  { id: "encoder", label: "Encoder", c: 0, x: 256, y: 82, r: 10 },
  { id: "decoder", label: "Decoder", c: 0, x: 272, y: 200, r: 10 },

  { id: "bert", label: "BERT", c: 1, x: 520, y: 96, r: 12 },
  { id: "gpt", label: "GPT", c: 1, x: 600, y: 150, r: 13 },
  { id: "t5", label: "T5", c: 1, x: 540, y: 210, r: 11 },

  { id: "vaswani", label: "Vaswani", c: 2, x: 120, y: 360, r: 11 },
  { id: "gbrain", label: "Google Brain", c: 2, x: 110, y: 430, r: 10 },
  { id: "openai", label: "OpenAI", c: 2, x: 250, y: 410, r: 10 },

  { id: "translation", label: "Translation", c: 3, x: 500, y: 350, r: 10 },
  { id: "summ", label: "Summarise", c: 3, x: 600, y: 400, r: 10 },
  { id: "qa", label: "QA", c: 3, x: 470, y: 430, r: 10 },
];

const NMAP = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, GNode>;

const EDGES: [string, string][] = [
  // within architecture
  ["transformer", "attention"],
  ["transformer", "selfattn"],
  ["attention", "selfattn"],
  ["transformer", "encoder"],
  ["transformer", "decoder"],
  ["encoder", "decoder"],
  // within the model family
  ["bert", "t5"],
  ["gpt", "t5"],
  ["bert", "gpt"],
  // within origins
  ["vaswani", "gbrain"],
  // within applications
  ["translation", "summ"],
  ["summ", "qa"],
  ["translation", "qa"],
  // cross-community bridges — the multi-hop payoff
  ["vaswani", "transformer"],
  ["gbrain", "transformer"],
  ["transformer", "bert"],
  ["transformer", "gpt"],
  ["openai", "gpt"],
  ["transformer", "translation"],
  ["gpt", "summ"],
  ["bert", "qa"],
];

const ADJ: Record<string, string[]> = Object.fromEntries(NODES.map((n) => [n.id, [] as string[]]));
for (const [a, b] of EDGES) {
  ADJ[a].push(b);
  ADJ[b].push(a);
}

const CHUNKS = [
  { t: "doc_01", b: "…the Transformer relies entirely on self-attention, dispensing with recurrence…" },
  { t: "doc_02", b: "…BERT is a bidirectional encoder; GPT is an autoregressive decoder…" },
  { t: "doc_03", b: "…Vaswani et al. at Google Brain introduced the architecture in 2017…" },
  { t: "doc_04", b: "…originally evaluated on machine translation; later summarisation, QA…" },
  { t: "doc_05", b: "…OpenAI scaled the decoder stack into the GPT series of models…" },
  { t: "doc_06", b: "…T5 frames every task as text-to-text over an encoder-decoder…" },
];

/* --------------------------------------------------------------- geometry */

/**
 * A smooth, padded convex hull around a set of points — the community blob.
 * Monotone-chain hull, pushed out by `pad` along each vertex's radial
 * direction, then closed with a Catmull-Rom-derived bezier so the outline reads
 * as an organic region rather than a polygon.
 */
function hullPath(pts: { x: number; y: number }[], pad: number): string {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lo: { x: number; y: number }[] = [];
  const up: { x: number; y: number }[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  let h = lo.slice(0, -1).concat(up.slice(0, -1));

  if (h.length < 3) {
    // A community of one or two entities has no hull — pad it into a box.
    const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length;
    const cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
    h = [
      { x: cx - 30, y: cy - 30 },
      { x: cx + 30, y: cy - 30 },
      { x: cx + 30, y: cy + 30 },
      { x: cx - 30, y: cy + 30 },
    ];
  }

  const cx = h.reduce((s, q) => s + q.x, 0) / h.length;
  const cy = h.reduce((s, q) => s + q.y, 0) / h.length;
  h = h.map((q) => {
    const dx = q.x - cx;
    const dy = q.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    return { x: q.x + (dx / d) * pad, y: q.y + (dy / d) * pad };
  });

  let d = "";
  for (let i = 0; i < h.length; i++) {
    const p0 = h[(i - 1 + h.length) % h.length];
    const p1 = h[i];
    const p2 = h[(i + 1) % h.length];
    const p3 = h[(i + 2) % h.length];
    if (i === 0) d += `M${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return `${d}Z`;
}

const HULLS = COMM.map((cm) => ({
  id: cm.id,
  color: cm.color,
  d: hullPath(
    NODES.filter((n) => n.c === cm.id).map((n) => ({ x: n.x, y: n.y })),
    34,
  ),
}));

/* ------------------------------------------------------------------ steps */

const PHASES: GuidedPhase[] = [
  { id: "index", label: "Indexing · offline", tone: "teal" },
  { id: "query", label: "Querying · online", tone: "orange", numberPrefix: "Q" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "index",
    label: "The corpus",
    title: "Start: a flat pile of chunks",
    body: (
      <>
        <p>
          Ordinary RAG stops here. Split the documents into chunks, embed them, and at query time
          fetch the <strong>top-k nearest</strong> by vector similarity.
        </p>
        <p>
          That is excellent for &ldquo;find the passage about X&rdquo; — and blind to anything that
          needs <strong>joining facts across chunks</strong>, or summarising the corpus as a whole.
          Adding structure on top of this pile is GraphRAG&rsquo;s entire premise.
        </p>
      </>
    ),
    hint: "Six chunks are the toy corpus here: papers about transformer models.",
  },
  {
    phase: "index",
    label: "Extraction",
    title: "Extract entities and relationships",
    body: (
      <>
        <p>
          An LLM reads <strong>each chunk</strong> and pulls out entities (nodes), the relationships
          between them (edges), and a short description of each. Run it across the corpus, then
          merge duplicates — the same entity turns up under slightly different names — in an{" "}
          <strong>entity-resolution</strong> pass.
        </p>
        <p>
          The result is one knowledge graph. This is the expensive stage: an LLM call for every
          chunk, and a re-run for every document you edit.
        </p>
      </>
    ),
    hint: "Nodes and edges condense out of the chunks. Quality here is entirely your extraction prompt.",
  },
  {
    phase: "index",
    label: "Communities",
    title: "Cluster the graph into communities",
    body: (
      <>
        <p>
          Run <strong>hierarchical community detection</strong> over the graph — Microsoft&rsquo;s
          implementation uses <code>Leiden</code>. It partitions densely-connected regions into
          clusters, at several levels of granularity at once.
        </p>
        <p>
          Each community is a coherent sub-topic. This graph falls into four: the architecture, the
          model family, the origins, and the applications.
        </p>
      </>
    ),
    hint: "Colour is now information, not decoration — each blob is one detected community.",
  },
  {
    phase: "index",
    label: "Summaries",
    title: "Summarise each community",
    body: (
      <>
        <p>
          The move that makes the rest work: an LLM writes a{" "}
          <strong>summary of each community</strong>, bottom-up through the hierarchy. You end up
          with a multi-resolution, auto-generated table of contents describing what each region of
          the graph is collectively about.
        </p>
        <p>
          These summaries are what make corpus-wide questions answerable at all. The answer to
          &ldquo;what are the themes?&rdquo; lives in <em>these</em>, not in any single chunk.
        </p>
      </>
    ),
    hint: "Each card is one LLM-written community report — the layer no chunk index has.",
  },
  {
    phase: "query",
    label: "Local search",
    title: "Query mode 1 — local search",
    body: (
      <>
        <p>
          For <strong>entity-centric</strong> questions. Find the entities named in the query by
          similarity, then <strong>expand into their graph neighbourhood</strong> — connected
          entities, the relationship edges, the source chunks, the community context — and hand all
          of it to the model.
        </p>
        <p>
          Because it traverses edges rather than ranking passages, the answer can connect entities
          that never appear together in any one chunk.
        </p>
      </>
    ),
    hint: "Click any entity to expand its neighbourhood and watch the context get assembled.",
  },
  {
    phase: "query",
    label: "Global search",
    title: "Query mode 2 — global search",
    body: (
      <>
        <p>
          For <strong>corpus-wide</strong> questions. There is no single chunk to retrieve, so
          GraphRAG runs <strong>map-reduce over the community summaries</strong>: score the query
          against each summary to get partial answers (map), then fuse them into one answer
          (reduce).
        </p>
        <p>
          This is the query shape plain top-k retrieval cannot reach — not badly, but at all. The
          answer is a property of the distribution, not of any passage in it.
        </p>
      </>
    ),
    hint: "Every community contributes one partial answer; the reduce step fuses them into the final one.",
  },
];

/* ------------------------------------------------------------------- view */

const LOCAL_STEP = 4;
const GLOBAL_STEP = 5;

export function GraphRAGViz({ className }: { className?: string }) {
  // Which entity the reader has expanded during local search.
  const [seed, setSeed] = useState("gpt");
  const [step, setStep] = useState(0);

  // Global search reveals one community at a time, so map-reduce reads as a
  // sequence. `shown - 1` is the community currently being mapped.
  const shown = useStagger(step === GLOBAL_STEP ? COMM.length : 0, 700, step);

  const local = useMemo(() => {
    const node = NMAP[seed];
    const neighbours = ADJ[seed].map((id) => NMAP[id]);
    const spans = [...new Set(neighbours.map((n) => n.c))];
    return { node, neighbours, spans, ids: new Set([seed, ...ADJ[seed]]) };
  }, [seed]);

  const showGraph = step >= 1;
  const coloured = step >= 2;
  const showHulls = step >= 2;
  const isLocal = step === LOCAL_STEP;
  const hotComm = step === GLOBAL_STEP ? shown - 1 : -1;

  /* -------------------------------------------------------------- stage */

  const stage = () => (
    <div className="relative">
      <svg
        viewBox="0 0 680 470"
        className="block w-full"
        role="img"
        aria-label="Knowledge graph of transformer research, coloured by detected community"
      >
        <g>
          {HULLS.map((h) => (
            <path
              key={h.id}
              d={h.d}
              fill={h.color}
              className="transition-opacity duration-500"
              opacity={showHulls ? (hotComm === h.id ? 0.28 : 0.14) : 0}
            />
          ))}
        </g>

        <g>
          {EDGES.map(([a, b], i) => {
            const touchesSeed = isLocal && (a === seed || b === seed);
            const dimmed = isLocal && !touchesSeed;
            return (
              <line
                key={`${a}-${b}`}
                x1={NMAP[a].x}
                y1={NMAP[a].y}
                x2={NMAP[b].x}
                y2={NMAP[b].y}
                stroke={touchesSeed ? SIGNAL : VIZ.axis}
                strokeWidth={touchesSeed ? 2.4 : 1.4}
                className="transition-all duration-500"
                style={{ transitionDelay: showGraph ? `${0.2 + i * 0.02}s` : undefined }}
                opacity={!showGraph ? 0 : touchesSeed ? 0.95 : dimmed ? 0.12 : 0.5}
              />
            );
          })}
        </g>

        <g>
          {NODES.map((n, i) => {
            const isSeed = isLocal && n.id === seed;
            const inNeighbourhood = isLocal && local.ids.has(n.id);
            const isHotComm = hotComm === n.c;
            const fill = coloured ? COMM[n.c].color : VIZ.axis;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                className={cn(
                  "transition-opacity duration-500",
                  // Keyboard users get a visible ring; a mouse click already
                  // reports itself through the seed highlight and the panel.
                  isLocal &&
                    "cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-orange",
                )}
                style={{ transitionDelay: showGraph ? `${i * 0.03}s` : undefined }}
                opacity={!showGraph ? 0 : isLocal && !inNeighbourhood ? 0.2 : 1}
                onClick={isLocal ? () => setSeed(n.id) : undefined}
                role={isLocal ? "button" : undefined}
                tabIndex={isLocal ? 0 : undefined}
                aria-label={isLocal ? `Expand the neighbourhood of ${n.label}` : undefined}
                onKeyDown={
                  isLocal
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSeed(n.id);
                        }
                      }
                    : undefined
                }
              >
                {(isSeed || isHotComm) && (
                  <circle
                    r={n.r + 8}
                    fill="none"
                    stroke={isSeed ? SIGNAL : COMM[n.c].color}
                    strokeWidth={2}
                    opacity={0.7}
                    className="animate-pulse"
                  />
                )}
                <circle
                  r={n.r}
                  fill={fill}
                  stroke={isSeed ? SIGNAL : VIZ.card}
                  strokeWidth={isSeed ? 2.5 : 2}
                  className="transition-all duration-500"
                />
                <text
                  y={n.r + 13}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontFamily="monospace"
                  fill={VIZ.textBright}
                  stroke={VIZ.card}
                  strokeWidth={3}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* the flat pile of chunks, before any structure exists */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-2.5 bg-surface/80 p-6 transition-all duration-500",
          step === 0 ? "opacity-100" : "opacity-0",
        )}
      >
        {CHUNKS.map((c) => (
          <div
            key={c.t}
            className={cn(
              "w-[122px] rounded-lg border border-surface-border bg-surface-elevated px-2.5 py-2 font-mono text-[8.5px] leading-relaxed text-slate-500 transition-transform duration-500",
              step === 0 ? "scale-100" : "translate-y-2 scale-95",
            )}
          >
            <b className="mb-0.5 block text-[9px] text-accent-teal">{c.t}</b>
            {c.b}
          </div>
        ))}
      </div>
    </div>
  );

  /* -------------------------------------------------------------- panel */

  const panel = (i: number) => {
    if (i === 0) {
      return (
        <>
          <PanelTitle>Corpus</PanelTitle>
          <GuidedEmpty>No graph yet — just embedded text chunks.</GuidedEmpty>
        </>
      );
    }

    if (i === 1) {
      return (
        <>
          <PanelTitle>Extracted graph</PanelTitle>
          <GuidedEmpty>
            {NODES.length} entities · {EDGES.length} relationships extracted.
          </GuidedEmpty>
        </>
      );
    }

    if (i === 2) {
      return (
        <>
          <PanelTitle>Communities (Leiden)</PanelTitle>
          <GuidedEmpty>
            4 communities detected. A real corpus yields a nested hierarchy of them.
          </GuidedEmpty>
        </>
      );
    }

    if (i === 3) {
      return (
        <>
          <PanelTitle>Community summaries</PanelTitle>
          <div className="flex flex-wrap gap-2.5">
            {COMM.map((c) => (
              <GuidedCard key={c.id} label={c.name} accent={c.color}>
                {c.summary}
              </GuidedCard>
            ))}
          </div>
        </>
      );
    }

    if (i === LOCAL_STEP) {
      return (
        <>
          <PanelTitle>Assembled context · seed = {local.node.label}</PanelTitle>
          <div className="flex flex-wrap gap-2.5">
            <GuidedCard label="Entities pulled in" accent={COMM[local.node.c].color}>
              {local.node.label} + {local.neighbours.map((n) => n.label).join(", ")}
            </GuidedCard>
            <GuidedCard label="Relationships" accent={SIGNAL}>
              {local.neighbours.map((n) => `${local.node.label}→${n.label}`).join("  ·  ")}
            </GuidedCard>
          </div>
          <GuidedPayoff label="why the graph earns its keep">
            This neighbourhood spans{" "}
            <strong className="font-semibold text-white">
              {local.spans.length} {local.spans.length === 1 ? "community" : "communities"}
            </strong>{" "}
            ({local.spans.map((c) => COMM[c].name).join(", ")}). A pure vector top-k would surface
            only chunks textually similar to &ldquo;{local.node.label}&rdquo; — the cross-community
            links you see here never co-occur inside a single chunk.
          </GuidedPayoff>
        </>
      );
    }

    return (
      <>
        <PanelTitle>Map → reduce over summaries</PanelTitle>
        <div className="flex flex-wrap gap-2.5">
          {COMM.map((c, k) => (
            <div
              key={c.id}
              className={cn(
                "flex min-w-[9.5rem] flex-1 transition-all duration-300",
                k < shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
              )}
            >
              <GuidedCard label={`map · ${c.name}`} accent={c.color}>
                {c.partial}
              </GuidedCard>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "transition-all duration-500",
            shown >= COMM.length ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
          )}
        >
          <GuidedPayoff label="reduce · final answer">
            The corpus covers the Transformer architecture, the family of models built on it
            (BERT/GPT/T5), the labs behind it, and its downstream applications — four interlocking
            themes. No chunk in the corpus says this; the community reports do.
          </GuidedPayoff>
        </div>
      </>
    );
  };

  /* ------------------------------------------------------------- legend */

  const legend = (i: number) => {
    if (i === 0) return null;
    if (i === 1) {
      return (
        <>
          <GuidedLegend color={VIZ.axis}>entity</GuidedLegend>
          <GuidedLegend color={VIZ.axis}>relationship</GuidedLegend>
        </>
      );
    }
    return (
      <>
        {COMM.map((c) => (
          <GuidedLegend key={c.id} color={c.color}>
            {c.name}
          </GuidedLegend>
        ))}
        <GuidedLegend color={SIGNAL}>retrieval / traversal</GuidedLegend>
      </>
    );
  };

  const stageNote = (i: number) => {
    if (i === LOCAL_STEP) return "Q: “How is GPT connected across the corpus?”";
    if (i === GLOBAL_STEP) return "Q: “What are the main themes across this corpus?”";
    return null;
  };

  return (
    <GuidedViz
      className={className}
      title="GraphRAG, step by step"
      caption="Vanilla RAG retrieves the chunks nearest your query. GraphRAG first builds a knowledge graph over the whole corpus, clusters it, and summarises each cluster — so it can answer pinpoint entity questions and corpus-wide “what are the themes” questions with the same index. Four of the six steps happen offline: that is where the cost lives."
      phases={PHASES}
      steps={STEPS}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
      onStepChange={setStep}
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
