import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * A Bloom filter from `courses/streaming-ml/02-streaming-algorithms.mdx`, built
 * small enough to show every bit: m = 16, k = 3, three inserted words.
 *
 * The demo lands a real false positive — "dove" hashes to bits 11, 12 and 13,
 * each set by a *different* member — which is the whole asymmetry of the
 * structure. The payoff sweeps k at m/n ≈ 10 and measures the false-positive
 * rate against (1 − e^(−kn/m))^k. The measured minimum lands at k = 6 against a
 * predicted k_opt of 7.10 — not the same integer, because the optimum is flat
 * enough that every k from 5 to 12 comes in under 1%. That flatness is the
 * useful finding: the lesson's "~10 bits, ~7 hashes" is a robust recipe, not a
 * knife-edge.
 */

const CODE = codeLines(`
class Bloom:
    def __init__(self, m, k):
        self.bits = [0] * m
        self.m, self.k = m, k

    def add(self, x):
        for i in range(self.k):
            self.bits[h(x, i) % self.m] = 1

    def query(self, x):
        # "absent" is always correct;
        # "present" may be a false positive
        return all(self.bits[h(x, i) % self.m]
                   for i in range(self.k))

def fp_rate(m, k, n):
    # after n inserts
    return (1 - exp(-k * n / m)) ** k
`);

const ln = lineFinder(CODE);

const M = 16;
const K = 3;
const MEMBERS = ["cat", "dog", "fish"];

const fmt = (x: number, d = 2) => x.toFixed(d);

/** murmur3 finalizer over an FNV-1a string hash, seeded per hash function. */
function h(s: string, seed: number): number {
  let v = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    v = (Math.imul(v ^ s.charCodeAt(i), 16777619) >>> 0);
  }
  let x = (v ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

const indices = (s: string, k = K, m = M) =>
  Array.from({ length: k }, (_, i) => h(s, i) % m);

/** Which member set each bit — used to explain the false positive. */
const owners: Record<number, string[]> = {};
const BITS = new Array<number>(M).fill(0);
for (const w of MEMBERS) {
  for (const b of indices(w)) {
    BITS[b] = 1;
    (owners[b] ??= []).push(w);
  }
}

function bitPanel(bits: number[], highlight: number[] = [], label = "bit array"): TraceComponent {
  return {
    t: "tokens",
    label: `${label} (m = ${M}, ${bits.filter((b) => b).length} set)`,
    v: bits.map((b, i) => ({
      text: String(b),
      sub: String(i),
      cls: (highlight.includes(i) ? (b ? "active" : "bad") : b ? "good" : "dim") as TraceCls,
    })),
  };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const bits = new Array<number>(M).fill(0);

  push(
    `A ${M}-bit array, all zero, and k = ${K} independent hash functions. A Bloom filter never stores the elements themselves — only bits — which is why it can answer membership in a few bits per item instead of however many bytes the item takes.`,
    ln("self.bits = [0] * m"),
    bitPanel(bits),
    {
      t: "note",
      text: "The contract is deliberately lopsided: a Bloom filter may say \"present\" about something never inserted, but it can never say \"absent\" about something that was. That asymmetry is what makes it useful as a cheap pre-filter.",
    }
  );

  // ---- inserts -------------------------------------------------------------
  for (const w of MEMBERS) {
    const idx = indices(w);
    const already = idx.filter((b) => bits[b] === 1);
    for (const b of idx) bits[b] = 1;
    push(
      `Insert "${w}": the ${K} hashes give bits ${idx.join(", ")}, so set those to 1.${
        already.length
          ? ` Bit ${already.join(" and ")} ${already.length === 1 ? "was" : "were"} already set by an earlier insert — the filter has no way to tell, and no way to undo it. This is exactly why deletion is impossible.`
          : ""
      }`,
      ln("self.bits[h(x, i) % self.m] = 1"),
      bitPanel(bits, idx),
      {
        t: "kv",
        label: `hashes of "${w}"`,
        v: idx.map((b, i) => ({ k: `h${i}`, v: String(b), cls: "active" as TraceCls })),
      }
    );
  }

  // ---- query: a true member ------------------------------------------------
  const catIdx = indices("cat");
  push(
    `Query "cat": check bits ${catIdx.join(", ")} — all 1, so report **present**. Correct, and it always will be for a real member: inserting only ever sets bits, never clears them, so a member's bits can never revert. **False negatives are impossible by construction.**`,
    ln("return all(self.bits[h(x, i) % self.m]"),
    bitPanel(bits, catIdx),
    {
      t: "kv",
      label: "query result",
      v: [
        { k: "bits", v: catIdx.join(", ") },
        { k: "all set?", v: "yes", cls: "good" },
        { k: "answer", v: "present", cls: "good" },
        { k: "truth", v: "member", cls: "good" },
      ],
    }
  );

  // ---- query: a true non-member -------------------------------------------
  const birdIdx = indices("bird");
  const zero = birdIdx.filter((b) => bits[b] === 0);
  push(
    `Query "bird": bits ${birdIdx.join(", ")}, and bit ${zero[0]} is still 0. One zero is enough — report **absent**, and that answer is *certain*. A single unset bit proves the element was never inserted, because insertion would have set it.`,
    ln("return all(self.bits[h(x, i) % self.m]"),
    bitPanel(bits, birdIdx),
    {
      t: "kv",
      label: "query result",
      v: [
        { k: "bits", v: birdIdx.join(", ") },
        { k: `bit ${zero[0]}`, v: "0", cls: "bad" },
        { k: "answer", v: "absent", cls: "good" },
        { k: "certainty", v: "exact", cls: "good" },
      ],
    }
  );

  // ---- query: a false positive --------------------------------------------
  const doveIdx = indices("dove");
  push(
    `Query "dove" — never inserted. Bits ${doveIdx.join(
      ", "
    )} are all 1, so the filter reports **present**. This is a false positive, and look at *why*: bit ${doveIdx[0]} was set by "${owners[doveIdx[0]]?.join(
      '"/"'
    )}", bit ${doveIdx[1]} by "${owners[doveIdx[1]]?.join('"/"')}", bit ${doveIdx[2]} by "${owners[
      doveIdx[2]
    ]?.join('"/"')}". No single member is responsible — the three of them collectively covered "dove"'s fingerprint by accident.`,
    ln("# \"absent\" is always correct;"),
    bitPanel(bits, doveIdx),
    {
      t: "table",
      label: "who set each of dove's bits",
      head: ["bit", "value", "set by"],
      v: doveIdx.map((b) => ({
        cells: [String(b), String(bits[b]), owners[b]?.join(", ") ?? "—"],
        cls: "bad" as TraceCls,
      })),
    },
    {
      t: "note",
      text: "With 7 of 16 bits set and k = 3, the chance a random non-member clears all three is roughly (7/16)³ ≈ 8%. Shrinking that is entirely a matter of spending more bits per element.",
      cls: "warn",
    }
  );

  // ---- payoff: does the formula hold, and where is k_opt? ------------------
  const M2 = 1024;
  const N2 = 100;
  const TRIALS = 20_000;
  const kOpt = (M2 / N2) * Math.log(2);

  const sweep = Array.from({ length: 12 }, (_, idx) => {
    const k = idx + 1;
    const arr = new Uint8Array(M2);
    for (let e = 0; e < N2; e++) {
      for (let i = 0; i < k; i++) arr[h(`member-${e}`, i) % M2] = 1;
    }
    let fp = 0;
    for (let t = 0; t < TRIALS; t++) {
      let all = true;
      for (let i = 0; i < k && all; i++) if (!arr[h(`query-${t}`, i) % M2]) all = false;
      if (all) fp += 1;
    }
    return {
      k,
      measured: fp / TRIALS,
      predicted: (1 - Math.exp((-k * N2) / M2)) ** k,
    };
  });
  const best = sweep.reduce((a, b) => (b.measured < a.measured ? b : a));
  // The optimum is flat, so the sampled minimum wanders next to k_opt.
  const underOnePercent = sweep.filter((s) => s.measured < 0.01).map((s) => s.k);

  push(
    `Now a real filter at production scale: m = ${M2} bits for n = ${N2} elements — ${fmt(
      M2 / N2,
      1
    )} bits each — with the false-positive rate measured over ${TRIALS.toLocaleString()} non-member queries at each k. The measured curve tracks (1 − e^(−kn/m))^k closely and is **U-shaped**: too few hashes and each query has too few chances to find a zero; too many and the array saturates. The measured minimum is at k = ${
      best.k
    } (${fmt(best.measured * 100, 2)}%), and the formula's k_opt = (m/n)·ln 2 = ${fmt(
      kOpt,
      2
    )}. The two do not land on the same integer, and that is the practical point: the curve is so flat near the bottom that every k from ${underOnePercent[0]} to ${
      underOnePercent[underOnePercent.length - 1]
    } comes in under 1%, and the sampled minimum wanders within that band from run to run. The lesson's "≈10 bits per element with ≈7 hashes gives under 1%" is a robust recipe rather than a knife-edge — you have to miss k badly before it costs you anything.`,
    ln("return (1 - exp(-k * n / m)) ** k"),
    {
      t: "plot",
      label: "false-positive rate vs k (measured against the formula)",
      domain: [1, 12, 0, 0.1],
      xLabel: "k (hash functions)",
      yLabel: "FP rate",
      curves: [
        { pts: sweep.map((s) => ({ x: s.k, y: s.measured })), cls: "active" },
        { pts: sweep.map((s) => ({ x: s.k, y: s.predicted })), cls: "good", dashed: true },
      ],
      points: [{ x: best.k, y: best.measured, id: `k=${best.k}`, cls: "good", shape: "ring" }],
    },
    {
      t: "table",
      label: `m = ${M2}, n = ${N2}, ${TRIALS.toLocaleString()} queries per k`,
      head: ["k", "measured", "predicted"],
      v: sweep.map((s) => ({
        cells: [String(s.k), `${fmt(s.measured * 100, 2)}%`, `${fmt(s.predicted * 100, 2)}%`],
        cls: (s.k === best.k ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "Note what is *not* on this chart: the elements. A Bloom filter that has seen 100 items still stores 1024 bits and nothing else — which is why it can front a database lookup or a dedup check for a few bits per key, and why it can never support deletion or enumeration.",
      cls: "good",
    }
  );

  return {
    id: "bloom-filter",
    title: "Bloom filter — set bits, check bits, and the k that minimizes lying",
    caption:
      "A 16-bit filter with 3 hashes, small enough that every bit is visible. Three inserts, then three queries: a true member (always correct), a true non-member (a single zero bit is proof of absence), and a false positive whose three bits were each set by a different member — nobody's fault individually. The final step measures the false-positive rate against (1 − e^(−kn/m))^k across 12 values of k, and finds a bottom so flat that the exact choice of k barely matters.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const bloomFilterTrace = build();
