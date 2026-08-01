import type { AlgoTrace, TraceCls, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Beam search on the exact failure the lesson describes in
 * `courses/nlp/05-decoding-and-sampling.mdx`: a model that assigns "Sydney"
 * p = 0.46 and "Canberra" p = 0.45, so greedy commits to the wrong city and
 * can never recover, while a width-2 beam keeps both and lets the continuation
 * decide.
 *
 * The payoff is the length-normalisation bias: the same beam, scored by raw
 * cumulative log-prob, prefers a two-token answer; scored per token it prefers
 * a longer and more informative one. Same search, same model, one divisor.
 */

const CODE = codeLines(`
def beam_search(lm, k, alpha=0.0):
    beams = [([], 0.0)]          # (tokens, logp)
    done = []
    while beams:
        cand = []
        for toks, lp in beams:
            for tok, p in lm(toks).items():
                cand.append((toks + [tok], lp + log(p)))
        # keep only the k best partial hypotheses
        cand.sort(key=lambda c: -c[1])
        beams = []
        for toks, lp in cand[:k]:
            if toks[-1] == EOS:
                done.append((toks, lp))
            else:
                beams.append((toks, lp))
    # alpha = 0 -> raw logp; alpha = 1 -> per token
    return max(done, key=lambda d: d[1] / len(d[0]) ** alpha)
`);

const ln = lineFinder(CODE);

const EOS = "</s>";
const PROMPT = "the capital of Australia is";

/**
 * A toy LM as an explicit tree, keyed by the tokens generated so far. The
 * numbers are chosen to reproduce the lesson's example: Sydney edges out
 * Canberra on the first token, and loses badly on the second.
 */
const LM: Record<string, Record<string, number>> = {
  "": { Sydney: 0.46, Canberra: 0.45, Melbourne: 0.09 },
  Sydney: { [EOS]: 0.3, ".": 0.25, ",": 0.25, "!": 0.2 },
  Canberra: { [EOS]: 0.62, ",": 0.38 },
  Melbourne: { [EOS]: 0.5, ".": 0.5 },
  // the longer, more informative continuation behind Canberra
  "Canberra,": { the: 0.85 },
  "Canberra,the": { seat: 0.85 },
  "Canberra,theseat": { of: 0.9 },
  "Canberra,theseatof": { government: 0.95 },
  "Canberra,theseatofgovernment": { [EOS]: 0.9 },
};

const key = (toks: string[]) => toks.join("");
const next = (toks: string[]) => LM[key(toks)] ?? {};
const fmt = (x: number, d = 3) => x.toFixed(d);
const show = (toks: string[]) => toks.join(" ") || "∅";

interface Hyp {
  toks: string[];
  lp: number;
}

/** Beam search; `alpha` is the length-normalisation exponent. */
function beamSearch(k: number, alpha: number, record?: (stage: string, cand: Hyp[], kept: Hyp[], done: Hyp[]) => void) {
  let beams: Hyp[] = [{ toks: [], lp: 0 }];
  const done: Hyp[] = [];
  let guard = 0;

  while (beams.length && guard++ < 12) {
    const cand: Hyp[] = [];
    for (const b of beams) {
      for (const [tok, p] of Object.entries(next(b.toks))) {
        cand.push({ toks: [...b.toks, tok], lp: b.lp + Math.log(p) });
      }
    }
    if (!cand.length) break;
    cand.sort((a, b) => b.lp - a.lp);
    const kept = cand.slice(0, k);
    beams = [];
    for (const h of kept) {
      if (h.toks[h.toks.length - 1] === EOS) done.push(h);
      else beams.push(h);
    }
    record?.(`step ${guard}`, cand, kept, [...done]);
  }
  const scored = done.map((d) => ({ ...d, score: d.lp / d.toks.length ** alpha }));
  scored.sort((a, b) => b.score - a.score);
  return { best: scored[0], all: scored };
}

/** Greedy = beam search with k = 1, by definition. */
function greedy() {
  const toks: string[] = [];
  let lp = 0;
  const steps: { tok: string; p: number; options: [string, number][] }[] = [];
  for (let i = 0; i < 8; i++) {
    const dist = next(toks);
    const options = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    if (!options.length) break;
    const [tok, p] = options[0];
    toks.push(tok);
    lp += Math.log(p);
    steps.push({ tok, p, options });
    if (tok === EOS) break;
  }
  return { toks, lp, steps };
}

const G = greedy();

function distPanel(dist: Record<string, number>, pick: string, label: string): TraceComponent {
  return {
    t: "bars",
    label,
    v: Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .map(([tok, p]) => ({
        k: tok,
        val: p,
        show: fmt(p, 2),
        cls: (tok === pick ? "active" : "dim") as TraceCls,
      })),
    max: 1,
  };
}

const hypTable = (label: string, hyps: Hyp[], keptCount: number): TraceComponent => ({
  t: "table",
  label,
  head: ["hypothesis", "cumulative log p", "kept?"],
  v: hyps.slice(0, 8).map((h, i) => ({
    cells: [show(h.toks), fmt(h.lp), i < keptCount ? "yes" : "pruned"],
    cls: (i < keptCount ? "good" : "bad") as TraceCls,
  })),
});

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();

  push(
    `The prompt is "${PROMPT}", and the model is *almost* right: it puts ${LM[""]["Canberra"]} on Canberra and ${LM[""]["Sydney"]} on Sydney. One hundredth of probability separates the correct answer from the wrong one — and greedy decoding is entirely determined by that hundredth.`,
    ln("beams = [([], 0.0)]          # (tokens, logp)"),
    distPanel(LM[""], "Sydney", "p(next token | prompt)"),
    {
      t: "note",
      text: "The model is not confused about Australian geography — look at what each branch does next. It is the *decoder* that is about to throw the answer away.",
    }
  );

  // ---- greedy ------------------------------------------------------------
  G.steps.forEach((s, i) => {
    push(
      `Greedy, step ${i + 1}: take the argmax, "${s.tok}" at p = ${fmt(s.p, 2)}. ${
        i === 0
          ? "Sydney wins by 0.01 and the decision is now permanent — greedy has no mechanism to reconsider a token it has emitted."
          : `Notice the distribution it inherited: the best continuation behind Sydney is only ${fmt(
              s.p,
              2
            )}, because the model does not actually believe this sentence.`
      }`,
      ln("beams = [([], 0.0)]          # (tokens, logp)"),
      distPanel(next(G.steps.slice(0, i).map((x) => x.tok)), s.tok, `p(next | ${show(G.steps.slice(0, i).map((x) => x.tok)) === "∅" ? "prompt" : show(G.steps.slice(0, i).map((x) => x.tok))})`),
      {
        t: "tokens",
        label: "greedy output so far",
        v: G.steps.slice(0, i + 1).map((x) => ({ text: x.tok, cls: "bad" as TraceCls })),
      }
    );
  });

  push(
    `Greedy finishes with "${show(G.toks)}" at cumulative log p = ${fmt(
      G.lp
    )} (probability ${fmt(Math.exp(G.lp), 4)}). It is wrong, and it was wrong from the first token.`,
    ln("beams = [([], 0.0)]          # (tokens, logp)"),
    {
      t: "tokens",
      label: "greedy output",
      v: G.toks.map((t) => ({ text: t, cls: "bad" as TraceCls })),
    },
    {
      t: "kv",
      label: "greedy result",
      v: [
        { k: "output", v: show(G.toks), cls: "bad" },
        { k: "log p", v: fmt(G.lp) },
        { k: "p", v: fmt(Math.exp(G.lp), 4) },
      ],
    }
  );

  // ---- beam search --------------------------------------------------------
  const stages: { stage: string; cand: Hyp[]; kept: Hyp[]; done: Hyp[] }[] = [];
  const beam = beamSearch(2, 0, (stage, cand, kept, done) => stages.push({ stage, cand, kept, done }));

  // Only frames where the beam actually decides something are worth stepping
  // through: a forced chain with one continuation has nothing to prune.
  const interesting = stages.filter((st, i) => i === 0 || st.cand.length > 2);
  const forced = stages.length - interesting.length;

  interesting.forEach((st, i) => {
    push(
      i === 0
        ? `Beam search with k = 2. Expand every beam by every token — ${st.cand.length} candidates here — score each by cumulative log-probability, and keep the best 2. Crucially **both Sydney and Canberra survive**, because the beam does not have to choose yet.`
        : `Next step: expand each surviving beam again (${st.cand.length} candidates) and prune back to 2. ${
            st.done.length
              ? `${st.done.length} hypothes${st.done.length === 1 ? "is has" : "es have"} hit ${EOS} and moved to the finished pile.`
              : "Nothing has terminated yet."
          }`,
      [...ln("cand.append((toks + [tok], lp + log(p)))"), ...ln("cand.sort(key=lambda c: -c[1])")],
      hypTable(`candidates after ${st.stage}`, st.cand, Math.min(2, st.cand.length)),
      {
        t: "tokens",
        label: "surviving beams",
        v: st.kept
          .filter((h) => h.toks[h.toks.length - 1] !== EOS)
          .map((h) => ({ text: show(h.toks), sub: fmt(h.lp, 2), cls: "good" as TraceCls })),
      }
    );
  });

  if (forced > 0) {
    const tail = stages[stages.length - 1];
    push(
      `The surviving Canberra branch then runs ${forced} steps with only one continuation each — a forced chain, so there is nothing to prune and no decision to watch. Beam search still pays for those steps, which is the honest cost of the method: k × |V| scoring operations per token whether or not the beam is doing any work.`,
      ln("for tok, p in lm(toks).items()"),
      {
        t: "tokens",
        label: "the forced chain",
        v: tail.kept[0].toks.map((t) => ({ text: t, cls: "dim" as TraceCls })),
      },
      hypTable("finished so far", tail.done, tail.done.length)
    );
  }

  push(
    `Beam search returns "${show(beam.best.toks)}" at log p = ${fmt(
      beam.best.lp
    )} — probability ${fmt(
      Math.exp(beam.best.lp),
      4
    )}, against greedy's ${fmt(Math.exp(G.lp), 4)}. The beam that was *behind* after the first token won on the second, which is precisely the myopia greedy cannot escape. Note the cost: k × |V| scoring operations per step instead of |V|.`,
    ln("return max(done, key=lambda d: d[1] / len(d[0]) ** alpha)"),
    {
      t: "table",
      label: "finished hypotheses, by cumulative log p",
      head: ["output", "log p", "p"],
      v: beam.all.map((h, i) => ({
        cells: [show(h.toks), fmt(h.lp), fmt(Math.exp(h.lp), 4)],
        cls: (i === 0 ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "sequence probability",
      v: [
        { k: "greedy", val: Math.exp(G.lp), show: fmt(Math.exp(G.lp), 4), cls: "bad" },
        { k: "beam k=2", val: Math.exp(beam.best.lp), show: fmt(Math.exp(beam.best.lp), 4), cls: "good" },
      ],
    }
  );

  // ---- payoff: length normalisation --------------------------------------
  const normalised = beamSearch(2, 1);
  const rawBest = beam.best;
  const normBest = normalised.best;

  push(
    `Now the bias nobody expects. Every extra token multiplies the sequence probability by something under 1, so **longer hypotheses always score worse** under raw cumulative log-prob — regardless of how good they are per token. Divide by length instead (α = 1) and the ranking changes: raw scoring returns "${show(
      rawBest.toks
    )}", per-token scoring returns "${show(
      normBest.toks
    )}". The longer answer averages ${fmt(normBest.lp / normBest.toks.length)} per token against ${fmt(
      rawBest.lp / rawBest.toks.length
    )} — the model is *more* confident at every step of it, and naive beam search discards it purely for being long.`,
    ln("# alpha = 0 -> raw logp; alpha = 1 -> per token"),
    {
      t: "table",
      label: "the same finished hypotheses, two scorings",
      head: ["output", "tokens", "log p (α=0)", "log p / n (α=1)"],
      v: normalised.all.map((h) => ({
        cells: [show(h.toks), String(h.toks.length), fmt(h.lp), fmt(h.lp / h.toks.length)],
        cls: (h.toks.join() === normBest.toks.join()
          ? "good"
          : h.toks.join() === rawBest.toks.join()
            ? "warn"
            : "dim") as TraceCls,
      })),
    },
    {
      t: "bars",
      label: "per-token log-probability (higher is better)",
      v: normalised.all.map((h) => ({
        k: `${h.toks.length} tok`,
        val: h.lp / h.toks.length + 1.2,
        show: fmt(h.lp / h.toks.length, 2),
        cls: (h.toks.join() === normBest.toks.join() ? "good" : "dim") as TraceCls,
      })),
    },
    {
      t: "note",
      text: "This is why machine-translation and summarisation systems ship length normalisation as standard, and why an un-normalised beam search quietly truncates its outputs. The α exponent is tuned, not derived — 0.6–1.0 is the usual range.",
      cls: "warn",
    }
  );

  return {
    id: "beam-search",
    title: "Beam search — keeping the option greedy threw away",
    caption:
      "The exact failure the lesson describes: a model that puts 0.46 on Sydney and 0.45 on Canberra, where greedy commits to the wrong city on the first token and can never recover. Watch a width-2 beam keep both hypotheses alive and let the continuation settle it. The final step shows the bias that comes free with cumulative log-probability — longer sequences always score worse — and what dividing by length does to the answer.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const beamSearchTrace = build();
