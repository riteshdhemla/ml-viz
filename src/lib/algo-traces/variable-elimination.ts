import type { AlgoTrace, TraceComponent } from "@/types/algo-trace";
import { codeLines, frameBuilder, lineFinder } from "./util";

/**
 * Variable elimination on the sprinkler network from
 * `src/content/wiki/variable-elimination.mdx`, extended with a Slippery node so
 * there are three hidden variables to eliminate and the *order* has something
 * to say.
 *
 * The payoff runs the identical query under a deliberately bad ordering: same
 * answer to the last digit, twice the largest intermediate factor. That gap is
 * the entire reason elimination order is a research topic.
 */

const CODE = codeLines(`
def eliminate(factors, query, order):
    for Z in order:
        # every factor that mentions Z
        rel = [f for f in factors if Z in f.vars]
        factors = [f for f in factors
                   if Z not in f.vars]
        prod = reduce(multiply, rel)
        factors.append(sum_out(prod, Z))
    result = reduce(multiply, factors)
    return normalize(result)

def multiply(f, g):
    vars = union(f.vars, g.vars)
    return Factor(vars, [f[a] * g[a]
                         for a in assignments(vars)])

def sum_out(f, Z):
    vars = [v for v in f.vars if v != Z]
    return Factor(vars, [sum(f[a + {Z: z}]
                             for z in (T, F))
                         for a in assignments(vars)])
`);

const ln = lineFinder(CODE);

/** A factor over binary variables; `values` is indexed by the big-endian assignment. */
interface Factor {
  name: string;
  vars: string[];
  values: number[];
}

const size = (f: Factor) => f.values.length;

/** Index of an assignment (map var → 0|1) within a factor's value array. */
function indexOf(vars: string[], assign: Record<string, number>) {
  return vars.reduce((acc, v) => acc * 2 + assign[v], 0);
}

function assignments(vars: string[]): Record<string, number>[] {
  const out: Record<string, number>[] = [];
  for (let i = 0; i < 1 << vars.length; i++) {
    const a: Record<string, number> = {};
    vars.forEach((v, k) => {
      a[v] = (i >> (vars.length - 1 - k)) & 1;
    });
    out.push(a);
  }
  return out;
}

function multiply(f: Factor, g: Factor): Factor {
  const vars = [...f.vars, ...g.vars.filter((v) => !f.vars.includes(v))];
  const values = assignments(vars).map(
    (a) => f.values[indexOf(f.vars, a)] * g.values[indexOf(g.vars, a)]
  );
  return { name: `${f.name}·${g.name}`, vars, values };
}

function sumOut(f: Factor, z: string): Factor {
  const vars = f.vars.filter((v) => v !== z);
  const values = assignments(vars).map((a) =>
    [0, 1].reduce((s, zv) => s + f.values[indexOf(f.vars, { ...a, [z]: zv })], 0)
  );
  return { name: `f(${vars.join(",")})`, vars, values };
}

/** 0 = true, 1 = false throughout, so index 0 is always the "T" row. */
const CPTS: Factor[] = [
  { name: "P(R)", vars: ["R"], values: [0.2, 0.8] },
  { name: "P(S|R)", vars: ["R", "S"], values: [0.01, 0.99, 0.4, 0.6] },
  {
    name: "P(W|S,R)",
    vars: ["S", "R", "W"],
    // S=T,R=T: .99 | S=T,R=F: .90 | S=F,R=T: .80 | S=F,R=F: .0
    values: [0.99, 0.01, 0.9, 0.1, 0.8, 0.2, 0.0, 1.0],
  },
  { name: "P(L|W)", vars: ["W", "L"], values: [0.7, 0.3, 0.0, 1.0] },
];

const LABEL: Record<string, string> = { R: "Rain", S: "Sprinkler", W: "Wet", L: "Slippery" };
const fmt = (x: number, d = 4) => x.toFixed(d);

function factorTable(f: Factor, cls?: "active" | "good" | "warn"): TraceComponent {
  return {
    t: "table",
    label: `${f.name} — ${f.vars.length} var${f.vars.length === 1 ? "" : "s"}, ${size(f)} rows`,
    head: [...f.vars, "value"],
    v: assignments(f.vars).map((a, i) => ({
      cells: [...f.vars.map((v) => (a[v] === 0 ? "T" : "F")), fmt(f.values[i])],
      cls: cls ?? "dim",
    })),
  };
}

/** Run VE under one ordering; returns the answer plus every intermediate factor. */
function run(order: string[], push?: (d: string, l: number[], ...c: TraceComponent[]) => void) {
  let factors = [...CPTS];
  let maxFactor = Math.max(...factors.map(size));
  let multiplications = 0;

  for (const Z of order) {
    const rel = factors.filter((f) => f.vars.includes(Z));
    factors = factors.filter((f) => !f.vars.includes(Z));

    push?.(
      `Eliminate ${LABEL[Z]}. ${rel.length === 1 ? "One factor mentions" : `${rel.length} factors mention`} it — ${rel
        .map((f) => f.name)
        .join(", ")} — and those are the only ones that need to take part. Everything else in the network is left untouched, which is exactly what the naive full-joint approach fails to exploit.`,
      ln("rel = [f for f in factors if Z in f.vars]"),
      ...rel.map((f) => factorTable(f, "warn"))
    );

    const prod = rel.reduce((a, b) => {
      multiplications += size(multiply(a, b));
      return multiply(a, b);
    });
    maxFactor = Math.max(maxFactor, size(prod));

    push?.(
      `Multiply them into one factor over (${prod.vars.map((v) => LABEL[v]).join(", ")}) — ${size(prod)} rows. This is the step that costs: the intermediate table is exponential in the number of variables the product mentions, and *that* is what the elimination order controls.`,
      ln("prod = reduce(multiply, rel)"),
      factorTable(prod, "active"),
      {
        t: "kv",
        label: "cost so far",
        v: [
          { k: "this factor", v: `${size(prod)} rows`, cls: size(prod) >= 8 ? "bad" : "good" },
          { k: "largest yet", v: `${maxFactor} rows`, cls: "warn" },
        ],
      }
    );

    const summed = sumOut(prod, Z);
    factors.push(summed);

    push?.(
      `Sum ${LABEL[Z]} out of the product: add the ${LABEL[Z]} = T and ${LABEL[Z]} = F rows together. ${LABEL[Z]} is now gone from the problem entirely, leaving a factor over (${
        summed.vars.map((v) => LABEL[v]).join(", ") || "nothing"
      }) with ${size(summed)} rows. ${factors.length === 1 ? "One factor remains" : `${factors.length} factors remain`}.`,
      ln("factors.append(sum_out(prod, Z))"),
      factorTable(summed, "good"),
      {
        t: "kv",
        label: "remaining factors",
        v: factors.map((f) => ({ k: f.name, v: `${size(f)} rows`, cls: "dim" })),
      }
    );
  }

  const result = factors.reduce((a, b) => multiply(a, b));
  const z = result.values.reduce((s, v) => s + v, 0);
  const normalized: Factor = { ...result, values: result.values.map((v) => v / z) };
  return { normalized, maxFactor, multiplications };
}

function build(): AlgoTrace {
  const { frames, push } = frameBuilder();
  const GOOD_ORDER = ["R", "S", "W"];
  const BAD_ORDER = ["W", "S", "R"];

  push(
    "The sprinkler network with one node added: Rain → Sprinkler, Rain → Wet, Sprinkler → Wet, Wet → Slippery. The query is P(Slippery) with nothing observed, so Rain, Sprinkler and Wet all have to be summed out. Building the full joint would mean a 16-row table; variable elimination never builds it.",
    ln("def eliminate(factors, query, order)"),
    ...CPTS.map((f) => factorTable(f)),
    {
      t: "note",
      text: "Index convention: T rows first. P(W=T | S=F, R=F) = 0 — with neither rain nor sprinkler the grass is dry.",
    }
  );

  const good = run(GOOD_ORDER, push);
  const pT = good.normalized.values[0];

  push(
    `All three hidden variables are gone. Multiplying what remains and normalizing gives P(Slippery = T) = ${fmt(pT)}. The largest table built along the way held ${good.maxFactor} rows — never the full 16-row joint, even though the answer is exactly the one the full joint would give.`,
    ln("return normalize(result)"),
    factorTable(good.normalized, "good"),
    {
      t: "bars",
      label: "P(Slippery)",
      v: [
        { k: "T", val: pT, show: fmt(pT), cls: "good" },
        { k: "F", val: 1 - pT, show: fmt(1 - pT), cls: "dim" },
      ],
      max: 1,
    }
  );

  // ---- payoff: the same query under a bad ordering ------------------------
  const bad = run(BAD_ORDER);
  const badPT = bad.normalized.values[0];

  push(
    `Now run the identical query eliminating in the order ${BAD_ORDER.map((v) => LABEL[v]).join(" → ")} instead of ${GOOD_ORDER.map((v) => LABEL[v]).join(" → ")}. The answer is identical — ${fmt(badPT)} — because variable elimination is exact under *any* ordering. What changes is the bill: eliminating Wet first forces a product over Sprinkler, Rain, Wet and Slippery at once, a ${bad.maxFactor}-row table against ${good.maxFactor}. On four binary variables that is a shrug; on a real network the same effect is the difference between seconds and never finishing.`,
    ln("for Z in order"),
    {
      t: "bars",
      label: "largest intermediate factor (rows)",
      v: [
        { k: GOOD_ORDER.join(","), val: good.maxFactor, show: String(good.maxFactor), cls: "good" },
        { k: BAD_ORDER.join(","), val: bad.maxFactor, show: String(bad.maxFactor), cls: "bad" },
      ],
    },
    {
      t: "bars",
      label: "multiplications performed",
      v: [
        { k: GOOD_ORDER.join(","), val: good.multiplications, show: String(good.multiplications), cls: "good" },
        { k: BAD_ORDER.join(","), val: bad.multiplications, show: String(bad.multiplications), cls: "bad" },
      ],
    },
    {
      t: "note",
      text: "The cost is exponential in the largest intermediate factor, and the best achievable maximum is the graph's treewidth. Finding the optimal order is NP-hard, so min-fill and min-degree heuristics do the job in practice.",
      cls: "warn",
    }
  );

  return {
    id: "variable-elimination",
    title: "Variable elimination — multiply, sum out, and why the order is the whole game",
    caption:
      "Exact inference on a four-node Bayesian network, factor by factor: collect the factors mentioning a variable, multiply them, sum the variable out, repeat. Watch the intermediate tables grow and shrink — that size is the entire cost of the algorithm. The final step re-runs the same query under a worse elimination order and gets a bit-identical answer from a table twice as large, which is why elimination-order heuristics exist at all.",
    code: CODE,
    lang: "python",
    frames,
  };
}

export const variableEliminationTrace = build();
