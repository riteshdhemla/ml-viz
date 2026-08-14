"use client";

/**
 * Analogy arithmetic, and the exclusion rule that props it up.
 *
 * The embedding space is constructed rather than downloaded: seven random
 * orthogonal-ish attribute axes (royal, gender, age, animal, plural,
 * profession, size), each word a weighted sum of the attributes it has, plus
 * isotropic noise, then L2-normalised. That makes the structure known, so the
 * question "does the offset survive?" has a definite answer instead of a
 * folklore one.
 *
 * king − man + woman lands on queen, as advertised. The finding worth the build
 * is what happens when you stop excluding the query words — which every
 * standard analogy benchmark quietly does:
 *
 *   noise   correct (inputs excluded)   nearest vector IS an input word
 *   0.10          7/7                            0/7
 *   0.22          7/7                            3/7
 *   0.40          7/7                            4/7
 *   0.60          6/7                            6/7
 *   0.90          5/7                            7/7
 *
 * At noise 0.40 the benchmark still scores a perfect 7/7 while the honest
 * nearest neighbour is one of the three input words **more than half the time**.
 * The offset is real, but it is usually smaller than the distance to the words
 * you started from, and the evaluation protocol hides that. This is Linzen's
 * and Nissim et al.'s critique, reproduced rather than cited.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, gaussian, seededRandom } from "../viz-kit";

const DIM = 24;
const ATTRS = ["royal", "gender", "age", "animal", "plural", "profession", "size"] as const;

const AXES: Record<string, number[]> = (() => {
  const rng = seededRandom(11);
  const out: Record<string, number[]> = {};
  for (const a of ATTRS) out[a] = Array.from({ length: DIM }, () => gaussian(rng, 0, 1));
  return out;
})();

const WORDS: Record<string, Partial<Record<(typeof ATTRS)[number], number>>> = {
  king: { royal: 1, gender: 1, age: 0.3 },
  queen: { royal: 1, gender: -1, age: 0.3 },
  man: { gender: 1, age: 0.2 },
  woman: { gender: -1, age: 0.2 },
  prince: { royal: 0.9, gender: 1, age: -0.6 },
  princess: { royal: 0.9, gender: -1, age: -0.6 },
  boy: { gender: 1, age: -0.8 },
  girl: { gender: -1, age: -0.8 },
  actor: { profession: 1, gender: 1 },
  actress: { profession: 1, gender: -1 },
  dog: { animal: 1, size: 0.1 },
  dogs: { animal: 1, size: 0.1, plural: 1 },
  cat: { animal: 1, size: -0.2 },
  cats: { animal: 1, size: -0.2, plural: 1 },
  doctor: { profession: 1, age: 0.4 },
  nurse: { profession: 0.9, age: 0.3, gender: -0.4 },
};

function buildSpace(noise: number) {
  const rng = seededRandom(77);
  const E: Record<string, number[]> = {};
  for (const [w, att] of Object.entries(WORDS)) {
    const v = new Array(DIM).fill(0);
    for (const [a, c] of Object.entries(att)) for (let i = 0; i < DIM; i++) v[i] += (c as number) * AXES[a][i];
    for (let i = 0; i < DIM; i++) v[i] += gaussian(rng, 0, noise);
    const n = Math.hypot(...v);
    E[w] = v.map((x) => x / n);
  }
  return E;
}

const cos = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

const TESTS: [string, string, string, string][] = [
  ["king", "man", "woman", "queen"],
  ["prince", "boy", "girl", "princess"],
  ["actor", "man", "woman", "actress"],
  ["dogs", "dog", "cat", "cats"],
  ["queen", "woman", "man", "king"],
  ["princess", "girl", "boy", "prince"],
  ["cats", "cat", "dog", "dogs"],
];

export function WordAnalogyViz({ className }: { className?: string }) {
  const [noise, setNoise] = useState(0.4);
  const [pick, setPick] = useState(0);
  const [exclude, setExclude] = useState(true);

  const E = useMemo(() => buildSpace(noise), [noise]);

  const [a, b, c, want] = TESTS[pick];
  const ranked = useMemo(() => {
    const t = E[a].map((v, i) => v - E[b][i] + E[c][i]);
    const n = Math.hypot(...t);
    const tn = t.map((x) => x / n);
    return Object.entries(E)
      .map(([w, v]) => ({ w, s: cos(tn, v), isInput: [a, b, c].includes(w) }))
      .sort((p, q) => q.s - p.s);
  }, [E, a, b, c]);

  const shown = exclude ? ranked.filter((r) => !r.isInput) : ranked;

  /** How the whole test set behaves at this noise level. */
  const summary = useMemo(() => {
    let ok = 0;
    let inputTop = 0;
    for (const [x, y, z, target] of TESTS) {
      const t = E[x].map((v, i) => v - E[y][i] + E[z][i]);
      const n = Math.hypot(...t);
      const tn = t.map((q) => q / n);
      const r = Object.entries(E)
        .map(([w, v]) => ({ w, s: cos(tn, v) }))
        .sort((p, q) => q.s - p.s);
      if (r.filter((q) => ![x, y, z].includes(q.w))[0].w === target) ok++;
      if ([x, y, z].includes(r[0].w)) inputTop++;
    }
    return { ok, inputTop, n: TESTS.length };
  }, [E]);

  return (
    <VizFrame
      title="The offset is real. The benchmark is generous."
      caption="A constructed 24-dimensional space: seven random attribute axes, each word the sum of the attributes it has plus isotropic noise, L2-normalised. Bars are cosine similarity to a − b + c. Words struck through are the query words, which every standard analogy benchmark removes from the candidate set before scoring."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {TESTS.map(([x, y, z], i) => (
          <VizButton key={i} active={i === pick} onClick={() => setPick(i)}>
            {x} − {y} + {z}
          </VizButton>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <VizButton active={exclude} onClick={() => setExclude(true)}>
          exclude the query words
        </VizButton>
        <VizButton active={!exclude} onClick={() => setExclude(false)}>
          allow them
        </VizButton>
      </div>

      <div className="space-y-1">
        {shown.slice(0, 8).map((r, i) => (
          <div key={r.w} className="flex items-center gap-2">
            <span
              className={`w-20 shrink-0 text-right text-[11px] font-mono ${
                r.isInput ? "text-slate-500 line-through" : r.w === want ? "text-white" : "text-slate-400"
              }`}
            >
              {r.w}
            </span>
            <div className="h-3.5 flex-1 rounded bg-surface-elevated/50">
              <div
                className="h-3.5 rounded"
                style={{
                  width: `${Math.max(0, r.s) * 100}%`,
                  background: i === 0 ? (r.w === want ? VIZ.teal : VIZ.rose) : r.isInput ? VIZ.axis : VIZ.brand,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-[11px] font-mono text-slate-300">{r.s.toFixed(3)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        <VizStat label="top hit" value={shown[0].w} color={shown[0].w === want ? VIZ.teal : VIZ.rose} />
        <VizStat label="expected" value={want} />
        <VizStat
          label="benchmark score, all 7"
          value={`${summary.ok}/${summary.n}`}
          color={summary.ok === summary.n ? VIZ.teal : VIZ.yellow}
        />
        <VizStat
          label="nearest vector is a query word"
          value={`${summary.inputTop}/${summary.n}`}
          color={summary.inputTop > summary.n / 2 ? VIZ.rose : VIZ.text}
        />
      </div>

      <div className="mt-4 w-72">
        <VizSlider
          label="noise added to every embedding"
          min={0.1}
          max={0.9}
          step={0.05}
          value={noise}
          onChange={setNoise}
          format={(v) => v.toFixed(2)}
        />
      </div>
    </VizFrame>
  );
}
