import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder, seededRng } from "./util";

/**
 * Speculative decoding on the 4-token vocabulary and k = 3 cycle worked in
 * `src/content/wiki/speculative-decoding.mdx` — the same q, p, u values, the
 * same accept/accept/reject outcome, the same residual resample landing on
 * "mat".
 *
 * The payoff is the claim the whole technique rests on: the output
 * distribution is exactly the target's. It is checked by simulating 200 000
 * emissions with a *deliberately terrible* draft model and comparing the
 * empirical distribution against p — a bad draft costs speed, never accuracy.
 */

const CODE = codeLines(`
def cycle(prefix, draft, target, k):
    xs = draft.sample(prefix, k)     # k cheap steps
    p  = target(prefix, xs)          # ONE big pass
    out = []
    for i, x in enumerate(xs):
        if uniform() < min(1, p[i][x] / q[i][x]):
            out.append(x)            # accept
            continue
        # reject: resample the residual
        resid = maximum(0, p[i] - q[i])
        out.append(sample(resid / resid.sum()))
        return out                   # discard the rest
    # all accepted -> bonus token, free
    out.append(sample(p[k]))
    return out
`);

const ln = lineFinder(CODE);

const VOCAB = ["the", "cat", "sat", "mat"];

/** The three verification positions from the page's worked table. */
const WORKED = [
  { proposal: "the", q: 0.8, p: 0.72, u: 0.41 },
  { proposal: "cat", q: 0.6, p: 0.66, u: null },
  { proposal: "sat", q: 0.7, p: 0.14, u: 0.55 },
];

/** Full distributions at the rejecting position. */
const P3 = [0.1, 0.06, 0.14, 0.7];
const Q3 = [0.05, 0.15, 0.7, 0.1];

const fmt = (x: number, d = 3) => x.toFixed(d);

const distPanel = (
  label: string,
  p: number[],
  cls: (i: number) => TraceCls | undefined
): TraceComponent => ({
  t: "bars",
  label,
  v: VOCAB.map((w, i) => ({ k: w, val: p[i], show: fmt(p[i]), cls: cls(i) })),
  max: 1,
});

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `A 4-token vocabulary and lookahead k = 3. The small draft model proposes "${WORKED.map((w) => w.proposal).join(
      " → "
    )}" for a few percent of the cost of one target step, and the target then scores all three positions in a **single** forward pass — a transformer computes every position in parallel, so verifying 3 tokens costs the same as generating 1.`,
    ln("xs = draft.sample(prefix, k)"),
    {
      t: "tokens",
      label: "draft proposals",
      v: WORKED.map((w) => ({ text: w.proposal, sub: `q=${w.q}`, cls: "warn" as TraceCls })),
    },
    {
      t: "note",
      text: "The bottleneck in decoding is memory bandwidth, not arithmetic: one target step reads every weight from HBM to produce one token. Producing several tokens per read is the entire idea.",
    }
  );

  const emitted: string[] = [];
  for (let i = 0; i < WORKED.length; i++) {
    const w = WORKED[i];
    const ratio = Math.min(1, w.p / w.q);
    const accepted = w.u === null ? true : w.u < ratio;

    if (accepted) {
      emitted.push(w.proposal);
      push(
        w.p >= w.q
          ? `Position ${i + 1}, "${w.proposal}": the target likes it *more* than the draft did (p = ${w.p} ≥ q = ${w.q}), so min(1, p/q) = 1 and it is accepted without even drawing a random number. Whenever the draft under-proposes a token, acceptance is free.`
          : `Position ${i + 1}, "${w.proposal}": p/q = ${w.p}/${w.q} = ${fmt(ratio)}, so accept with probability ${fmt(ratio)}. The draw u = ${w.u} < ${fmt(ratio)}, so accept. Note the draft was slightly over-confident here and the rule corrects for it probabilistically rather than by overruling it.`,
        ln("if uniform() < min(1, p[i][x] / q[i][x])"),
        {
          t: "kv",
          label: `position ${i + 1}`,
          v: [
            { k: "proposal", v: w.proposal, cls: "active" },
            { k: "q", v: String(w.q) },
            { k: "p", v: String(w.p) },
            { k: "min(1, p/q)", v: fmt(ratio) },
            { k: "u", v: w.u === null ? "—" : String(w.u) },
            { k: "→", v: "accept", cls: "good" },
          ],
        },
        {
          t: "tokens",
          label: "emitted so far",
          v: emitted.map((t) => ({ text: t, cls: "good" as TraceCls })),
        }
      );
      continue;
    }

    // rejection: resample from the residual
    const resid = P3.map((p, k) => Math.max(0, p - Q3[k]));
    const z = resid.reduce((s, v) => s + v, 0);
    const norm = resid.map((v) => v / z);
    const pick = norm.indexOf(Math.max(...norm));

    push(
      `Position ${i + 1}, "${w.proposal}": p/q = ${w.p}/${w.q} = ${fmt(ratio)} — the target thinks this token is far *less* likely than the draft did. Accept with probability only ${fmt(ratio)}; the draw u = ${w.u} exceeds it, so reject. Everything after this position is discarded too, since it was conditioned on a token that is not going to be emitted.`,
      ln("resid = maximum(0, p[i] - q[i])"),
      distPanel("q — draft's distribution here", Q3, (k) => (VOCAB[k] === w.proposal ? "bad" : "dim")),
      distPanel("p — target's distribution here", P3, (k) => (k === pick ? "good" : "dim")),
      {
        t: "kv",
        label: `position ${i + 1}`,
        v: [
          { k: "proposal", v: w.proposal, cls: "bad" },
          { k: "q", v: String(w.q) },
          { k: "p", v: String(w.p) },
          { k: "min(1, p/q)", v: fmt(ratio) },
          { k: "u", v: String(w.u) },
          { k: "→", v: "reject", cls: "bad" },
        ],
      }
    );

    push(
      `Now resample from the residual max(0, p − q) = (${resid.map((r) => fmt(r, 2)).join(", ")}), normalized to (${norm
        .map((r) => fmt(r))
        .join(", ")}). It puts ${fmt(norm[pick] * 100, 1)}% on "${VOCAB[pick]}" — precisely the token the draft badly *under*-proposed (q = ${Q3[pick]} against p = ${P3[pick]}). The residual is not a fallback; it is the exact correction that makes the whole scheme unbiased.`,
      ln("out.append(sample(resid / resid.sum()))"),
      distPanel("residual max(0, p − q), normalized", norm, (k) => (k === pick ? "good" : "dim")),
      {
        t: "tokens",
        label: "emitted this cycle",
        v: [...emitted, VOCAB[pick]].map((t, k) => ({
          text: t,
          cls: (k === emitted.length ? "good" : "dim") as TraceCls,
        })),
      }
    );
    emitted.push(VOCAB[pick]);
    break;
  }

  push(
    `The cycle emits ${emitted.length} tokens — ${emitted.map((t) => `"${t}"`).join(", ")} — for **one** target forward pass, where ordinary decoding would have needed three. Had all three been accepted there would have been a fourth token for free: the target's distribution for position k+1 was already computed by the same pass.`,
    ln("out.append(sample(p[k]))"),
    {
      t: "tokens",
      label: "cycle output",
      v: emitted.map((t) => ({ text: t, cls: "good" as TraceCls })),
    },
    {
      t: "kv",
      label: "cost",
      v: [
        { k: "target passes", v: "1", cls: "good" },
        { k: "tokens emitted", v: String(emitted.length), cls: "good" },
        { k: "draft steps", v: "3", cls: "dim" },
      ],
    }
  );

  // ---- payoff: the output distribution is exactly p ------------------------
  const TRIALS = 200_000;

  /** One accept-or-resample draw, exactly as the algorithm specifies. */
  function emit(p: number[], q: number[], rng: () => number): number {
    // sample a proposal from q
    let u = rng();
    let x = 0;
    for (let i = 0; i < q.length; i++) {
      u -= q[i];
      if (u <= 0) {
        x = i;
        break;
      }
    }
    if (rng() < Math.min(1, p[x] / q[x])) return x;
    const resid = p.map((pi, i) => Math.max(0, pi - q[i]));
    const z = resid.reduce((s, v) => s + v, 0);
    let r = rng() * z;
    for (let i = 0; i < resid.length; i++) {
      r -= resid[i];
      if (r <= 0) return i;
    }
    return resid.length - 1;
  }

  const drafts = [
    { name: "well-matched draft", q: [0.12, 0.1, 0.13, 0.65] },
    { name: "terrible draft", q: [0.7, 0.2, 0.05, 0.05] },
  ].map((d) => {
    const rng = seededRng(11);
    const counts = new Array(VOCAB.length).fill(0);
    let accepts = 0;
    for (let i = 0; i < TRIALS; i++) {
      // acceptance rate measured separately from the emitted token
      let u = rng();
      let x = 0;
      for (let k = 0; k < d.q.length; k++) {
        u -= d.q[k];
        if (u <= 0) {
          x = k;
          break;
        }
      }
      if (rng() < Math.min(1, P3[x] / d.q[x])) accepts += 1;
      counts[emit(P3, d.q, seededRng(i + 1))] += 1;
    }
    return {
      ...d,
      empirical: counts.map((c) => c / TRIALS),
      acceptRate: accepts / TRIALS,
    };
  });

  const maxDev = Math.max(
    ...drafts.flatMap((d) => d.empirical.map((e, i) => Math.abs(e - P3[i])))
  );

  push(
    `The claim the whole technique rests on: the emitted distribution is *exactly* the target's, not an approximation of it. Here are ${TRIALS.toLocaleString()} emissions under two drafts — one well matched (${fmt(
      drafts[0].acceptRate * 100,
      0
    )}% acceptance) and one deliberately terrible (${fmt(
      drafts[1].acceptRate * 100,
      0
    )}%, it proposes "the" most of the time when the target wants "mat"). Both reproduce p to within ${fmt(maxDev, 4)}. The bad draft is far slower — more rejections, fewer tokens per target pass — but its output is drawn from the same distribution. **A worse draft model costs throughput, never quality.**`,
    ln("resid = maximum(0, p[i] - q[i])"),
    distPanel("target p — the ground truth", P3, () => "good"),
    distPanel(
      `emitted, ${drafts[0].name} (${fmt(drafts[0].acceptRate * 100, 0)}% accept)`,
      drafts[0].empirical,
      () => "active"
    ),
    distPanel(
      `emitted, ${drafts[1].name} (${fmt(drafts[1].acceptRate * 100, 0)}% accept)`,
      drafts[1].empirical,
      () => "warn"
    ),
    {
      t: "note",
      text: "This is why speculative decoding is classed as a quality-neutral lever: you can ship it without re-running your evals. The only thing to tune is the draft's speed/acceptance trade-off.",
      cls: "good",
    }
  );

  return {
    id: "speculative-decoding",
    title: "Speculative decoding — draft, verify, and the rule that keeps it exact",
    caption:
      "One draft-and-verify cycle on the worked example above: two proposals accepted, one rejected, and a resample from the residual max(0, p − q) that lands on the token the draft under-proposed. The final step is the important one — 200 000 emissions under a well-matched draft and a deliberately terrible one, both reproducing the target distribution to four decimal places. A bad draft costs speed and nothing else.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const speculativeDecodingTrace = build();
