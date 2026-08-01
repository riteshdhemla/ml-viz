import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * PagedAttention block allocation on the worked trace from
 * `src/content/wiki/paged-attention.mdx`: block size B = 4, request A with a
 * 10-token prompt, request B sharing A's first 8 tokens, then copy-on-write.
 *
 * The payoff measures the claim the page opens with — that naive contiguous
 * allocation wastes 60–80% of the KV cache — by allocating a realistic mix of
 * response lengths both ways and comparing utilization.
 */

const CODE = codeLines(`
def admit(seq, prompt, B, free, hashes):
    table = []
    for blk in chunks(prompt, B):
        h = hash(blk)
        if len(blk) == B and h in hashes:
            table.append(hashes[h])   # prefix hit
            refcount[hashes[h]] += 1
            continue
        p = free.pop()                # fresh block
        table.append(p)
        if len(blk) == B:
            hashes[h] = p
    return table

def append(seq, token, B, free):
    if len(seq) % B == 0:             # tail is full
        seq.table.append(free.pop())  # one block

def write(seq, i, B, free):
    p = seq.table[i // B]
    if refcount[p] > 1:               # shared
        q = free.pop()                # copy-on-write
        copy(p, q); refcount[p] -= 1
        seq.table[i // B] = q
`);

const ln = lineFinder(CODE);

const BLOCK = 4;
const TOTAL_BLOCKS = 10;
const fmt = (x: number, d = 1) => x.toFixed(d);

interface State {
  free: number[];
  refcount: Record<number, number>;
  tables: Record<string, number[]>;
  lengths: Record<string, number>;
}

function memoryPanel(s: State, highlight: number[] = []): TraceComponent {
  const owner: Record<number, string> = {};
  Object.entries(s.tables).forEach(([seq, table]) =>
    table.forEach((p) => {
      owner[p] = owner[p] ? `${owner[p]}+${seq}` : seq;
    })
  );
  return {
    t: "tokens",
    label: `physical blocks (B = ${BLOCK} tokens each)`,
    v: Array.from({ length: TOTAL_BLOCKS }, (_, p) => ({
      text: `P${p}`,
      sub: owner[p] ? `${owner[p]}${(s.refcount[p] ?? 0) > 1 ? ` ×${s.refcount[p]}` : ""}` : "free",
      cls: (highlight.includes(p)
        ? "active"
        : (s.refcount[p] ?? 0) > 1
          ? "warn"
          : owner[p]
            ? "good"
            : "dim") as TraceCls,
    })),
  };
}

function tablePanel(s: State): TraceComponent {
  return {
    t: "table",
    label: "block tables — logical position → physical block",
    head: ["seq", "tokens", "block table", "slack"],
    v: Object.entries(s.tables).map(([seq, table]) => ({
      cells: [
        seq,
        String(s.lengths[seq]),
        table.map((p) => `P${p}`).join(" "),
        `${table.length * BLOCK - s.lengths[seq]} slots`,
      ],
      cls: "good" as TraceCls,
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const s: State = {
    free: Array.from({ length: TOTAL_BLOCKS }, (_, i) => i),
    refcount: {},
    tables: {},
    lengths: {},
  };

  push(
    `Physical HBM carved into ${TOTAL_BLOCKS} blocks of ${BLOCK} tokens each, all free. Nothing is reserved in advance — this is the entire departure from the naive allocator, which hands each arriving request one contiguous slab of max_seq_len and hopes.`,
    ln("def admit(seq, prompt, B, free, hashes)"),
    memoryPanel(s),
    {
      t: "note",
      text: "The KV-cache is append-only and grows one token at a time at the tail — which is exactly the access pattern paging was invented for.",
    }
  );

  // ---- A is admitted with a 10-token prompt --------------------------------
  const aBlocks = Math.ceil(10 / BLOCK);
  s.tables.A = s.free.splice(0, aBlocks);
  s.tables.A.forEach((p) => (s.refcount[p] = 1));
  s.lengths.A = 10;

  push(
    `Request A arrives with a 10-token prompt. Allocate ⌈10/${BLOCK}⌉ = ${aBlocks} blocks: ${s.tables.A.map(
      (p) => `P${p}`
    ).join(", ")}. The last block holds only 2 of its ${BLOCK} slots, so the *entire* waste for this sequence is ${
      aBlocks * BLOCK - 10
    } slots — not the thousands a max_seq_len reservation would strand.`,
    ln("p = free.pop()                # fresh block"),
    memoryPanel(s, s.tables.A),
    tablePanel(s),
    {
      t: "kv",
      label: "allocation",
      v: [
        { k: "prompt", v: "10 tokens" },
        { k: "blocks", v: String(aBlocks), cls: "good" },
        { k: "slack", v: `${aBlocks * BLOCK - 10} slots`, cls: "good" },
        { k: "free", v: String(s.free.length) },
      ],
    }
  );

  // ---- A decodes, filling and then extending -------------------------------
  for (const step of [1, 2, 3]) {
    const wasFull = s.lengths.A % BLOCK === 0;
    if (wasFull) {
      const p = s.free.shift()!;
      s.tables.A.push(p);
      s.refcount[p] = 1;
    }
    s.lengths.A += 1;

    push(
      wasFull
        ? `A decodes token ${s.lengths.A}. The tail block was exactly full, so **one** new block (P${
            s.tables.A[s.tables.A.length - 1]
          }) is popped from the free list. Growth is one block at a time, on demand — never a re-reservation, never a copy.`
        : `A decodes token ${s.lengths.A}. It lands in the existing tail block's spare slot, so no allocation happens at all. ${
            s.tables.A.length * BLOCK - s.lengths.A
          } slot${s.tables.A.length * BLOCK - s.lengths.A === 1 ? "" : "s"} left in that block.`,
      wasFull ? ln("seq.table.append(free.pop())  # one block") : ln("if len(seq) % B == 0:"),
      memoryPanel(s, [s.tables.A[s.tables.A.length - 1]]),
      tablePanel(s)
    );
  }

  // ---- B arrives sharing A's first 8 prompt tokens -------------------------
  const sharedBlocks = s.tables.A.slice(0, 2);
  const bOwn = s.free.shift()!;
  s.tables.B = [...sharedBlocks, bOwn];
  sharedBlocks.forEach((p) => (s.refcount[p] += 1));
  s.refcount[bOwn] = 1;
  s.lengths.B = 11;

  push(
    `Request B arrives sharing A's first 8 prompt tokens. Those are two *full* blocks, so their content hashes match — B's block table simply points at ${sharedBlocks
      .map((p) => `P${p}`)
      .join(" and ")} and bumps their refcounts to 2. Those 8 tokens are never prefilled again: no compute, no memory. This is prefix caching, and on RAG workloads with a shared system prompt it is the single biggest lever on time-to-first-token.`,
    ln("table.append(hashes[h])   # prefix hit"),
    memoryPanel(s, sharedBlocks),
    tablePanel(s),
    {
      t: "kv",
      label: "refcounts",
      v: Object.entries(s.refcount)
        .filter(([, c]) => c > 0)
        .map(([p, c]) => ({ k: `P${p}`, v: String(c), cls: (c > 1 ? "warn" : "dim") as TraceCls })),
    },
    {
      t: "note",
      text: "Only *full* blocks can be shared — a partially-filled block has no stable content hash, because the next token will change it.",
    }
  );

  // ---- copy-on-write --------------------------------------------------------
  const shared = sharedBlocks[1];
  const copy = s.free.shift()!;
  s.tables.B = s.tables.B.map((p) => (p === shared ? copy : p));
  s.refcount[shared] -= 1;
  s.refcount[copy] = 1;

  push(
    `Now B needs to write into P${shared}, which has refcount 2. Writing in place would corrupt A. So the allocator does copy-on-write: take a fresh block P${copy}, copy P${shared} into it, decrement P${shared}'s refcount back to 1, and repoint B's table. Exactly one block is copied — not the sequence, not the prefix.`,
    ln("q = free.pop()                # copy-on-write"),
    memoryPanel(s, [shared, copy]),
    tablePanel(s),
    {
      t: "kv",
      label: "refcounts after CoW",
      v: Object.entries(s.refcount)
        .filter(([, c]) => c > 0)
        .map(([p, c]) => ({
          k: `P${p}`,
          v: String(c),
          cls: (Number(p) === copy ? "good" : c > 1 ? "warn" : "dim") as TraceCls,
        })),
    }
  );

  // ---- payoff: measure the waste ------------------------------------------
  const MAX_SEQ = 4096;
  const REQUESTS = 256;
  const rng = seededRng(3);
  // A long-tailed response-length mix: most short, a few long.
  const lengths = Array.from({ length: REQUESTS }, () => {
    const u = rng();
    const len = Math.round(400 * Math.exp(1.8 * u)); // ~400 to ~2400 tokens
    return Math.min(MAX_SEQ, Math.max(16, len));
  });
  const used = lengths.reduce((s2, l) => s2 + l, 0);
  const naive = REQUESTS * MAX_SEQ;
  const pagedB16 = lengths.reduce((s2, l) => s2 + Math.ceil(l / 16) * 16, 0);

  push(
    `Now the number the page opens with. Take ${REQUESTS} requests with a realistic long-tailed length mix (median ${
      [...lengths].sort((a, b) => a - b)[REQUESTS >> 1]
    } tokens, max ${Math.max(...lengths)}) against a max_seq_len of ${MAX_SEQ}. The naive allocator reserves ${MAX_SEQ} slots per request the moment it arrives, because it cannot know the length in advance: ${(
      (used / naive) *
      100
    ).toFixed(1)}% utilization — **${((1 - used / naive) * 100).toFixed(
      0
    )}% of the KV cache reserved and never touched**, squarely in the 60–80% band this page opens with. Paged allocation at B = 16 wastes at most 15 slots per sequence: ${(
      (used / pagedB16) *
      100
    ).toFixed(1)}% utilization. Same GPU, same requests, ${fmt(naive / pagedB16, 1)}× more of them resident at once.`,
    ln("if len(seq) % B == 0:             # tail is full"),
    {
      t: "bars",
      label: "KV-cache utilization",
      v: [
        {
          k: `contiguous (${MAX_SEQ})`,
          val: used / naive,
          show: `${((used / naive) * 100).toFixed(1)}%`,
          cls: "bad",
        },
        {
          k: "paged, B = 16",
          val: used / pagedB16,
          show: `${((used / pagedB16) * 100).toFixed(1)}%`,
          cls: "good",
        },
      ],
      max: 1,
    },
    {
      t: "table",
      label: `${REQUESTS} requests, ${used.toLocaleString()} tokens actually generated`,
      head: ["allocator", "slots reserved", "wasted", "concurrent capacity"],
      v: [
        {
          cells: [
            `contiguous ${MAX_SEQ}`,
            naive.toLocaleString(),
            `${((1 - used / naive) * 100).toFixed(1)}%`,
            "1×",
          ],
          cls: "bad",
        },
        {
          cells: [
            "paged, B = 16",
            pagedB16.toLocaleString(),
            `${((1 - used / pagedB16) * 100).toFixed(1)}%`,
            `${fmt(naive / pagedB16, 1)}×`,
          ],
          cls: "good",
        },
      ],
    },
    {
      t: "note",
      text: `The exact waste depends on how response lengths compare to max_seq_len — shorten this mix and contiguous allocation looks even worse. The cost of paging is one indirection per attention lookup, as the kernel gathers K/V through the block table instead of striding a contiguous buffer: a few percent of kernel throughput for ${fmt(naive / pagedB16, 1)}× the batch size.`,
      cls: "good",
    }
  );

  return {
    id: "paged-attention",
    title: "PagedAttention — block tables, prefix sharing, copy-on-write",
    caption:
      "KV-cache allocation the way an OS allocates RAM, on the worked trace above: blocks handed out on demand, a prefix shared between two requests by refcount rather than by copying, and a single block duplicated when one of them finally writes. The last step measures the claim that motivates the whole design — 256 realistic requests allocated both ways, contiguous against paged.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const pagedAttentionTrace = build();
