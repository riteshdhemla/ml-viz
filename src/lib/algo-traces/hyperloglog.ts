import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * HyperLogLog on the m = 4 worked trace from
 * `src/content/wiki/hyperloglog.mdx` — the same four hashes, the same
 * [1, 4, 0, 2] register array, the same two estimates.
 *
 * The payoff measures the RMS error of real sketches at four register counts
 * against the 1.04/√m prediction. Replicates are essential: that formula is a
 * standard error, so any single sketch says nothing. The sweep stops at
 * m = 1024 because beyond it the item count would fall into the small-range
 * regime, where linear counting takes over and 1.04/√m no longer applies.
 */

const CODE = codeLines(`
def add(M, x, p):
    h = hash(x)                 # uniform bits
    j = h >> (32 - p)           # first p bits
    tail = (h << p) & 0xffffffff
    rho = leading_zeros(tail) + 1
    M[j] = max(M[j], rho)

def estimate(M, m):
    Z = sum(2.0 ** -v for v in M)
    n = alpha(m) * m * m / Z    # harmonic mean
    V = M.count(0)
    if n <= 2.5 * m and V > 0:
        return m * log(m / V)   # linear counting
    return n
`);

const ln = lineFinder(CODE);

/** The wiki's four hashes, as bit strings (register-select bits first). */
const WORKED: { bits: string; label: string }[] = [
  { bits: "01000101", label: "[01]000101…" },
  { bits: "11010", label: "[11]010…" },
  { bits: "010001", label: "[01]0001…" },
  { bits: "001", label: "[00]1…" },
];

const P = 2;
const M_SMALL = 1 << P; // 4 registers
const fmt = (x: number, d = 2) => x.toFixed(d);

const ALPHA_4 = 0.673;
const alpha = (m: number) => {
  if (m === 16) return 0.673;
  if (m === 32) return 0.697;
  if (m === 64) return 0.709;
  return 0.7213 / (1 + 1.079 / m);
};

/** ρ = position of the leftmost 1 in the remaining bits (1-indexed). */
const rho = (tail: string) => {
  const i = tail.indexOf("1");
  return i < 0 ? tail.length + 1 : i + 1;
};

function registerPanel(M: number[], active?: number): TraceComponent {
  return {
    t: "bars",
    label: "registers M (max ρ seen per register)",
    v: M.map((v, j) => ({
      k: `M[${j}]`,
      val: v,
      show: String(v),
      cls: (j === active ? "active" : v === 0 ? "dim" : "good") as TraceCls,
    })),
    max: 5,
  };
}

/** A real 32-bit mixing hash (murmur3 finalizer), seeded so we can run replicates. */
function hash32(x: number, seed = 0): number {
  let h = (x ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Full HLL over `n` distinct items with m = 2^p registers. */
function sketch(n: number, p: number, seed = 0) {
  const m = 1 << p;
  const M = new Array<number>(m).fill(0);
  for (let i = 1; i <= n; i++) {
    const h = hash32(i, seed);
    const j = h >>> (32 - p);
    const tail = (h << p) >>> 0;
    // ρ = leading zeros of the 32−p remaining bits, plus 1
    let r = 1;
    for (let b = 31; b >= 0 && ((tail >>> b) & 1) === 0; b--) r += 1;
    M[j] = Math.max(M[j], Math.min(r, 32 - p));
  }
  const Z = M.reduce((s, v) => s + 2 ** -v, 0);
  const raw = (alpha(m) * m * m) / Z;
  const V = M.filter((v) => v === 0).length;
  const est = raw <= 2.5 * m && V > 0 ? m * Math.log(m / V) : raw;
  return { est, m, bytes: m }; // ~1 byte per register in practice (6 bits)
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const M = new Array<number>(M_SMALL).fill(0);

  push(
    `Four registers (p = ${P} bits of the hash select one), all starting at zero. The idea underneath: hash bits are uniform, so a hash with k leading zeros is a 2⁻ᵏ event. If the rarest thing you have seen is a 1-in-2ᴿ event, you have probably seen about 2ᴿ distinct values — and duplicates hash identically, so they never move the estimate.`,
    ln("def add(M, x, p)"),
    registerPanel(M),
    {
      t: "note",
      text: "One such estimator has ruinous variance — a single lucky hash doubles it. Splitting the stream across m registers and averaging is HLL's actual contribution.",
    }
  );

  for (const { bits, label } of WORKED) {
    const regBits = bits.slice(0, P);
    const tail = bits.slice(P);
    const j = parseInt(regBits, 2);
    const r = rho(tail);
    const before = M[j];
    M[j] = Math.max(M[j], r);

    push(
      `Hash ${label}: the first ${P} bits "${regBits}" select register ${j}, and the leftmost 1 in the remaining bits "${tail}" sits at position ${r}, so ρ = ${r}. ${
        r > before
          ? `M[${j}] rises from ${before} to ${r}.`
          : `M[${j}] is already ${before} ≥ ${r}, so nothing changes — which is exactly what makes this a *distinct*-count: re-seeing a value can never move a register.`
      }`,
      [...ln("j = h >> (32 - p)"), ...ln("M[j] = max(M[j], rho)")],
      {
        t: "tokens",
        label: "hash bits",
        v: [
          ...regBits.split("").map((b) => ({ text: b, cls: "active" as TraceCls })),
          ...tail.split("").map((b, i) => ({ text: b, cls: (i === r - 1 ? "good" : "dim") as TraceCls })),
        ],
      },
      registerPanel(M, j),
      {
        t: "kv",
        label: "this element",
        v: [
          { k: "register j", v: String(j), cls: "active" },
          { k: "ρ", v: String(r) },
          { k: `M[${j}]`, v: String(M[j]), cls: r > before ? "good" : "dim" },
        ],
      }
    );
  }

  const Z = M.reduce((s, v) => s + 2 ** -v, 0);
  const raw = (ALPHA_4 * M_SMALL * M_SMALL) / Z;
  const V = M.filter((v) => v === 0).length;
  const linear = M_SMALL * Math.log(M_SMALL / V);

  push(
    `Estimate. The harmonic mean gives α₄·m²/Σ2^(−M[j]) = ${ALPHA_4}·16/${fmt(Z, 4)} = ${fmt(raw)}. But ${V} register is still zero, and the raw estimator is biased when the sketch is this sparsely populated — so the small-range rule switches to linear counting: m·ln(m/V) = 4·ln(4) = ${fmt(linear)}. Both sit near the true count of 4.`,
    [...ln("n = alpha(m) * m * m / Z"), ...ln("return m * log(m / V)")],
    registerPanel(M),
    {
      t: "table",
      label: "estimates",
      head: ["estimator", "value"],
      v: [
        { cells: ["harmonic mean (raw)", fmt(raw)], cls: "dim" },
        { cells: ["linear counting (used)", fmt(linear)], cls: "good" },
        { cells: ["true distinct count", "4"], cls: "active" },
      ],
    },
    {
      t: "note",
      text: "Four registers is a toy. The corrections exist because the raw estimator is wrong at both ends — sparse sketches undercount, and near the hash-space limit collisions bite.",
    }
  );

  // ---- payoff: does 1.04/√m actually hold? --------------------------------
  // 1.04/√m is a *standard error*, so a single sketch says nothing — one run at
  // m = 16 can beat one at m = 4096 by luck. Averaging replicates is the only
  // honest check.
  const TRUE_N = 10_000;
  const REPLICATES = 16;
  const results = [4, 6, 8, 10].map((p) => {
    const errs = Array.from({ length: REPLICATES }, (_, s) => {
      const { est } = sketch(TRUE_N, p, s + 1);
      return (est - TRUE_N) / TRUE_N;
    });
    const rms = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length);
    const m = 1 << p;
    return { m, rms, predicted: 1.04 / Math.sqrt(m), kb: (m * 6) / 8 / 1024 };
  });

  push(
    `Now real sketches over ${TRUE_N.toLocaleString()} distinct items. The claim to check is σ/n ≈ 1.04/√m — the only number an engineer needs from this page — and because that is a *standard error*, a single sketch proves nothing: one lucky run at m = 16 can beat one at m = 1024. So each row is the RMS relative error over ${REPLICATES} independent sketches: ${results
      .map((r) => `m=${r.m} → ${fmt(r.rms * 100, 1)}% measured vs ${fmt(r.predicted * 100, 1)}% predicted`)
      .join(", ")}. Quadrupling m halves the error, exactly as advertised, which is what lets you size a sketch before writing any code.`,
    ln("Z = sum(2.0 ** -v for v in M)"),
    {
      t: "table",
      label: `RMS error over ${REPLICATES} sketches of ${TRUE_N.toLocaleString()} items`,
      head: ["m", "measured", "1.04/√m", "memory"],
      v: results.map((r) => ({
        cells: [
          String(r.m),
          `${fmt(r.rms * 100, 2)}%`,
          `${fmt(r.predicted * 100, 2)}%`,
          `${fmt(r.kb, 2)} KB`,
        ],
        cls: "good" as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "measured RMS error vs predicted 1.04/√m",
      v: results.flatMap((r) => [
        { k: `m=${r.m} measured`, val: r.rms, show: `${fmt(r.rms * 100, 2)}%`, cls: "active" as TraceCls },
        { k: `m=${r.m} predicted`, val: r.predicted, show: `${fmt(r.predicted * 100, 2)}%`, cls: "dim" as TraceCls },
      ]),
    },
    {
      t: "note",
      text: `The sweep stops at m = 1024 on purpose: at m = 4096 these ${TRUE_N.toLocaleString()} items would give under 2.5 registers' worth each, putting the sketch in the small-range regime where linear counting takes over and 1.04/√m stops describing the error. Sketch size and expected cardinality have to be chosen together.`,
      cls: "warn",
    }
  );

  return {
    id: "hyperloglog",
    title: "HyperLogLog — leading zeros, stochastic averaging, and 1.04/√m",
    caption:
      "The m = 4 worked trace from above, hash by hash: register-select bits, ρ from the remaining bits, and a register that refuses to move when a duplicate arrives — which is what makes this a distinct count rather than a total. The final step measures the RMS error of real sketches at five register counts against the 1.04/√m prediction the whole design rests on — averaged over replicates, because a single sketch at any m proves nothing.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const hyperloglogTrace = build();
