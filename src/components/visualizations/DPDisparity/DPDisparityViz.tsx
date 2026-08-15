"use client";

/**
 * DP-SGD's two operations, and which one actually costs the minority group.
 *
 * 1,200 examples, 10% of them from a minority group whose labelling rule
 * differs from the majority's. The model carries group-interaction features, so
 * the minority rule is fully representable — the only thing limiting it is how
 * many minority examples there are. Full-batch DP gradient descent, 80 steps,
 * per-example L2 clipping at C then Gaussian noise sigma*C on the summed
 * gradient. Because the batch is not subsampled, the RDP accountant here is
 * exact: eps_rdp(a) = T*a/(2 sigma^2), converted with
 * eps = eps_rdp(a) + log(1/delta)/(a-1) minimised over a, delta = 1e-5.
 *
 * The lesson this sits under says DP-SGD hurts underrepresented groups because
 * "their gradients are rarer, so noise drowns them out more". Measured, that
 * attribution is wrong twice over.
 *
 * **Their gradients are not rarer, they are bigger.** After training, median
 * per-example gradient norm is 0.362 for the minority against 0.096 for the
 * majority — 3.76x — because the model fits them worse, so their gradients
 * never shrink. At C = 1.0 that means **16% of minority examples are clipped
 * against 3% of majority**, five times the rate, every single step.
 *
 * **And it is the clipping, not the noise.** Clipping alone, with zero noise:
 *
 *     C      majority   minority   gap
 *     20      0.950      0.882     0.068     (no effective clipping)
 *      2      0.949      0.849     0.100
 *      1      0.949      0.697     0.252
 *      0.5    0.948      0.563     0.385
 *      0.2    0.950      0.504     0.446     (minority at chance)
 *
 * Majority accuracy does not move at all across that entire range. The whole
 * cost of the privacy operation lands on one group.
 *
 * Noise, by contrast, barely registers. Holding C = 1 and sweeping sigma, the
 * minority sits at ~0.69 from sigma = 0 through sigma = 32 (eps 1.38), and only
 * reaches 0.652 at sigma = 64 (eps 0.68). Averaged over a large batch the noise
 * is amortised; the clip ceiling is not.
 *
 * How the harm scales with representation (C = 1, sigma = 8):
 *
 *     minority share   majority   minority   gap
 *          5%           0.948      0.426     0.521
 *         10%           0.948      0.689     0.259
 *         20%           0.954      0.917     0.037
 *         50%           0.957      0.951     0.005
 *
 * Which points at a different fix than the usual one. "Use less noise" buys
 * almost nothing here. Raising C, per-group clip norms, or adaptive clipping
 * address the operation that is actually doing the damage.
 */

import { useMemo, useState } from "react";
import {
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  GuidedViz,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { VIZ, VizSlider, seededRandom } from "../viz-kit";

const D = 3;
const N = 1200;
const MIN_SHARE = 0.1;
const T = 80;
const LR = 2.0;
const DELTA = 1e-5;
const DD = 2 * D + 1;
const WMAJ = [1.6, -1.1, 0.0];
const WMIN = [0.0, 1.1, 1.6];

function gauss(rng: () => number) {
  let u = 0;
  let v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type Row = { f: number[]; g: number; y: number };

/* Interaction features let one linear model hold a different rule per group,
   so the minority rule is representable and only its sample count limits it. */
const feat = (x: number[], g: number) => [...x, ...x.map((v) => g * v), g];

function makeData(seed: number, minShare = MIN_SHARE): Row[] {
  const rng = seededRandom(seed);
  const rows: Row[] = [];
  for (let i = 0; i < N; i++) {
    const g = rng() < minShare ? 1 : 0;
    const x = Array.from({ length: D }, () => gauss(rng));
    const w = g ? WMIN : WMAJ;
    const z = x.reduce((a, v, j) => a + v * w[j], 0);
    rows.push({ f: feat(x, g), g, y: z + 0.3 * gauss(rng) > 0 ? 1 : 0 });
  }
  return rows;
}

const sig = (z: number) => 1 / (1 + Math.exp(-z));

function train(rows: Row[], clip: number | null, sigma: number, seed = 5) {
  const rng = seededRandom(seed);
  const w = new Array(DD).fill(0);
  let b = 0;
  for (let t = 0; t < T; t++) {
    const gw = new Array(DD).fill(0);
    let gb = 0;
    for (const r of rows) {
      let z = b;
      for (let j = 0; j < DD; j++) z += w[j] * r.f[j];
      const e = sig(z) - r.y;
      const pg = r.f.map((v) => e * v);
      let s = 1;
      if (clip !== null) {
        const n = Math.hypot(...pg, e);
        s = n > clip ? clip / n : 1;
      }
      for (let j = 0; j < DD; j++) gw[j] += pg[j] * s;
      gb += e * s;
    }
    if (sigma > 0 && clip !== null) {
      for (let j = 0; j < DD; j++) gw[j] += sigma * clip * gauss(rng);
      gb += sigma * clip * gauss(rng);
    }
    for (let j = 0; j < DD; j++) w[j] -= (LR * gw[j]) / rows.length;
    b -= (LR * gb) / rows.length;
  }
  return { w, b };
}

const acc = (m: { w: number[]; b: number }, rows: Row[]) =>
  rows.filter((r) => {
    let z = m.b;
    for (let j = 0; j < DD; j++) z += m.w[j] * r.f[j];
    return (z > 0 ? 1 : 0) === r.y;
  }).length / (rows.length || 1);

/** RDP accountant for T compositions of the (non-subsampled) Gaussian mechanism. */
function epsilon(sigma: number) {
  if (sigma <= 0) return Infinity;
  let best = Infinity;
  for (let a = 1.05; a <= 300; a += 0.05) {
    const e = (T * a) / (2 * sigma * sigma) + Math.log(1 / DELTA) / (a - 1);
    if (e < best) best = e;
  }
  return best;
}

const TRAIN = makeData(3);
const TEST = makeData(77);
const TE_MAJ = TEST.filter((r) => !r.g);
const TE_MIN = TEST.filter((r) => r.g);

/** Per-example gradient norms under the fully-trained non-private model. */
const NORMS = (() => {
  const m = train(TRAIN, null, 0);
  const maj: number[] = [];
  const min: number[] = [];
  for (const r of TRAIN) {
    let z = m.b;
    for (let j = 0; j < DD; j++) z += m.w[j] * r.f[j];
    const e = sig(z) - r.y;
    const n = Math.hypot(...r.f.map((v) => e * v), e);
    (r.g ? min : maj).push(n);
  }
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return { maj, min, medMaj: med(maj), medMin: med(min) };
})();

const BASELINE = (() => {
  const m = train(TRAIN, null, 0);
  return { maj: acc(m, TE_MAJ), min: acc(m, TE_MIN) };
})();

const PHASES: GuidedPhase[] = [
  { id: "clip", label: "The clip", tone: "rose", numberPrefix: "C" },
  { id: "budget", label: "The budget", tone: "teal", numberPrefix: "B" },
];

const STEPS: GuidedStep[] = [
  {
    label: "whose gradients are big",
    phase: "clip",
    title: "The minority's gradients are larger, not rarer",
    body: (
      <>
        Per-example gradient norms after training, split by group. The minority&rsquo;s median is{" "}
        <strong>{(NORMS.medMin / NORMS.medMaj).toFixed(2)}×</strong> the majority&rsquo;s — because the
        model fits them worse, so their gradients never shrink.
        <br />
        <br />
        That single fact drives everything that follows. Clipping is a ceiling on gradient norm, and this
        group is the one sitting above it.
      </>
    ),
    hint: "Move the clip norm C and watch the two clipped-percentage figures separate.",
  },
  {
    label: "clipping alone",
    phase: "clip",
    title: "The whole cost lands on one group",
    body: (
      <>
        This step adds <em>no noise at all</em> — clipping only, which is the operation people think of as
        the harmless half of DP-SGD.
        <br />
        <br />
        Majority accuracy sits flat near <strong>0.95</strong> at every clip norm. Minority accuracy falls
        from {BASELINE.min.toFixed(3)} to chance as C tightens. Nothing about the privacy guarantee is
        being spent here yet; this is pure collateral.
      </>
    ),
    hint: "Drag C down to 0.2. The majority bar does not move at all.",
  },
  {
    label: "adding the noise",
    phase: "budget",
    title: "The half everyone blames barely registers",
    body: (
      <>
        Now add the Gaussian noise that actually buys the privacy guarantee, and watch how little it
        changes. Held at C = 1, the minority stays near 0.69 from σ = 0 all the way to σ = 32 — an ε of
        about 1.4.
        <br />
        <br />
        Averaged over a large batch, the noise is amortised across every example. The clip ceiling is
        applied to each one individually and is not.
      </>
    ),
    hint: "Sweep σ across its whole range. Compare how far the bars move against what C did on the last step.",
  },
  {
    label: "who pays",
    phase: "budget",
    title: "The harm is a function of representation",
    body: (
      <>
        Hold the privacy setting fixed and vary how large the minority group is. At a 5% share the gap is
        about 0.52; at 20% it is 0.04; at 50% it is essentially zero.
        <br />
        <br />
        The same algorithm, the same ε, the same clip norm — and the damage is determined entirely by how
        many examples the group has to spare.
      </>
    ),
    hint: "The mechanism tells you which knob to reach for, and it is not the noise.",
  },
];

const W = 560;

export function DPDisparityViz({ className }: { className?: string }) {
  const [clip, setClip] = useState(1.0);
  const [sigma, setSigma] = useState(8);
  const [share, setShare] = useState(0.1);
  const [step, setStep] = useState(0);

  const clipRates = useMemo(
    () => ({
      maj: NORMS.maj.filter((v) => v > clip).length / NORMS.maj.length,
      min: NORMS.min.filter((v) => v > clip).length / NORMS.min.length,
    }),
    [clip]
  );

  // step 2 is clipping only; step 3 adds the noise
  const model = useMemo(() => train(TRAIN, clip, step >= 2 ? sigma : 0), [clip, sigma, step]);
  const accMaj = useMemo(() => acc(model, TE_MAJ), [model]);
  const accMin = useMemo(() => acc(model, TE_MIN), [model]);

  const shareResult = useMemo(() => {
    if (step !== 3) return null;
    const tr = makeData(3, share);
    const te = makeData(77, share);
    const m = train(tr, clip, sigma);
    return { maj: acc(m, te.filter((r) => !r.g)), min: acc(m, te.filter((r) => r.g)) };
  }, [share, clip, sigma, step]);

  const eps = useMemo(() => epsilon(sigma), [sigma]);

  const bar = (label: string, v: number, color: string) => (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-right font-mono text-[10.5px] text-slate-400">{label}</span>
      <div className="h-4 flex-1 rounded bg-surface-elevated/50">
        <div className="h-4 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      <span className="w-12 shrink-0 font-mono text-[11px] text-white">{v.toFixed(3)}</span>
    </div>
  );

  return (
    <GuidedViz
      title="Which half of DP-SGD actually costs you"
      caption="1,200 examples, 10% from a minority group whose labelling rule differs. The model carries group-interaction features, so the minority rule is fully representable and only its sample count limits it. Full-batch DP gradient descent, 80 steps; because the batch is not subsampled the RDP accountant shown is exact. Every accuracy and gradient norm below is trained and measured here."
      className={className}
      phases={PHASES}
      steps={STEPS}
      onStepChange={setStep}
      controls={
        <div className="flex flex-wrap items-end gap-5">
          {step <= 2 && (
            <div className="w-60">
              <VizSlider
                label="clip norm C"
                min={0.2}
                max={5}
                step={0.1}
                value={clip}
                onChange={setClip}
                format={(v) => v.toFixed(1)}
              />
            </div>
          )}
          {step >= 2 && (
            <div className="w-60">
              <VizSlider
                label="noise multiplier σ"
                min={0}
                max={64}
                step={1}
                value={sigma}
                onChange={(v) => setSigma(Math.round(v))}
                format={(v) => v.toFixed(0)}
              />
            </div>
          )}
          {step === 3 && (
            <div className="w-60">
              <VizSlider
                label="minority share of the data"
                min={0.05}
                max={0.5}
                step={0.05}
                value={share}
                onChange={setShare}
                format={(v) => `${(v * 100).toFixed(0)}%`}
              />
            </div>
          )}
        </div>
      }
      stageNote={() =>
        step >= 2 ? (
          <span className="font-mono text-[11px] text-slate-400">
            ε = {eps === Infinity ? "∞ (no privacy)" : eps.toFixed(2)} at δ = 1e-5
          </span>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">no noise yet · clipping only</span>
        )
      }
      stage={(i) => {
        if (i === 0) {
          const bins = 18;
          const hi = 1.2;
          const hMaj = new Array(bins).fill(0);
          const hMin = new Array(bins).fill(0);
          for (const v of NORMS.maj) hMaj[Math.min(bins - 1, Math.floor((v / hi) * bins))]++;
          for (const v of NORMS.min) hMin[Math.min(bins - 1, Math.floor((v / hi) * bins))]++;
          const mx = Math.max(...hMaj) || 1;
          const mn = Math.max(...hMin) || 1;
          const bx = (n: number) => 46 + (n / bins) * (W - 92);
          const bw = (W - 92) / bins - 1;
          return (
            <svg viewBox={`0 0 ${W} 180`} className="w-full">
              {hMaj.map((h, n) => (
                <rect key={`a${n}`} x={bx(n)} y={78 - (h / mx) * 56} width={bw} height={(h / mx) * 56} fill={VIZ.axis} opacity={0.75} />
              ))}
              {hMin.map((h, n) => (
                <rect key={`b${n}`} x={bx(n)} y={86} width={bw} height={(h / mn) * 56} fill={VIZ.rose} opacity={0.85} />
              ))}
              <line x1={46} x2={W - 46} y1={82} y2={82} stroke={VIZ.axis} strokeWidth={1} />
              <line x1={46 + (clip / hi) * (W - 92)} x2={46 + (clip / hi) * (W - 92)} y1={14} y2={150} stroke={VIZ.yellow} strokeWidth={1.8} />
              <text x={46 + (clip / hi) * (W - 92) + 5} y={20} fontSize={9} fill={VIZ.yellow}>
                clip at C = {clip.toFixed(1)}
              </text>
              <text x={W - 48} y={26} textAnchor="end" fontSize={9} fill={VIZ.text}>
                majority ({NORMS.maj.length})
              </text>
              <text x={W - 48} y={146} textAnchor="end" fontSize={9} fill={VIZ.rose}>
                minority ({NORMS.min.length})
              </text>
              {[0, 0.3, 0.6, 0.9, 1.2].map((v) => (
                <text key={v} x={46 + (v / hi) * (W - 92)} y={164} textAnchor="middle" fontSize={8.5} fill={VIZ.text}>
                  {v.toFixed(1)}
                </text>
              ))}
              <text x={46} y={176} fontSize={8.5} fill={VIZ.text}>
                per-example gradient norm (each group scaled to its own peak; last bin is everything above)
              </text>
            </svg>
          );
        }
        if (i === 3 && shareResult)
          return (
            <div className="space-y-2 py-3">
              {bar("majority", shareResult.maj, VIZ.axis)}
              {bar("minority", shareResult.min, VIZ.rose)}
              <p className="pt-1 font-mono text-[10.5px] text-slate-400">
                minority is {(share * 100).toFixed(0)}% of the data · gap{" "}
                <span className="text-accent-rose">{(shareResult.maj - shareResult.min).toFixed(3)}</span>
              </p>
            </div>
          );
        return (
          <div className="space-y-2 py-3">
            {bar("majority", accMaj, VIZ.axis)}
            {bar("minority", accMin, VIZ.rose)}
            <div className="h-1" />
            <p className="font-mono text-[10.5px] text-slate-500">
              without DP: majority {BASELINE.maj.toFixed(3)} · minority {BASELINE.min.toFixed(3)}
            </p>
            <p className="font-mono text-[10.5px] text-accent-rose">
              minority has lost {((BASELINE.min - accMin) * 100).toFixed(1)} points; majority{" "}
              {((BASELINE.maj - accMaj) * 100).toFixed(1)}
            </p>
          </div>
        );
      }}
      panel={(i) => (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {i === 0 && (
            <>
              <GuidedCard label="median gradient norm" accent={VIZ.rose}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  majority {NORMS.medMaj.toFixed(3)} · minority{" "}
                  <span className="text-accent-rose">{NORMS.medMin.toFixed(3)}</span>
                  <br />
                  ratio {(NORMS.medMin / NORMS.medMaj).toFixed(2)}×
                </span>
              </GuidedCard>
              <GuidedCard label={`clipped at C = ${clip.toFixed(1)}`} accent={VIZ.yellow}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  majority {(clipRates.maj * 100).toFixed(0)}% · minority{" "}
                  <span className="text-accent-rose">{(clipRates.min * 100).toFixed(0)}%</span>
                  <br />
                  {clipRates.maj > 0
                    ? `${(clipRates.min / clipRates.maj).toFixed(1)}× the rate`
                    : "majority essentially untouched"}
                </span>
              </GuidedCard>
            </>
          )}
          {(i === 1 || i === 2) && (
            <>
              <GuidedCard label="cost of this setting" accent={VIZ.rose}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  majority −{((BASELINE.maj - accMaj) * 100).toFixed(1)} pts
                  <br />
                  minority <span className="text-accent-rose">−{((BASELINE.min - accMin) * 100).toFixed(1)} pts</span>
                </span>
              </GuidedCard>
              <GuidedCard label={i === 1 ? "noise spent so far" : "privacy bought"} accent={VIZ.teal}>
                <span className="font-mono text-[11.5px] text-slate-300">
                  {i === 1 ? (
                    <>
                      σ = 0 — <span className="text-accent-yellow">no privacy guarantee at all</span>
                      <br />
                      every point of that loss is free damage
                    </>
                  ) : (
                    <>
                      σ = {sigma} → ε ={" "}
                      <span className="text-accent-teal">{eps === Infinity ? "∞" : eps.toFixed(2)}</span>
                      <br />
                      δ = 1e-5, {T} compositions
                    </>
                  )}
                </span>
              </GuidedCard>
            </>
          )}
          {i === 3 && (
            <GuidedPayoff label="which knob the mechanism points at">
              The lesson above attributes this to noise drowning out rarer gradients. Measured, both
              halves of that are wrong: the minority&rsquo;s gradients are{" "}
              {(NORMS.medMin / NORMS.medMaj).toFixed(2)}× <em>larger</em>, not rarer — the model fits them
              worse, so they sit above the clip ceiling and get truncated at{" "}
              {clipRates.maj > 0 ? `${(clipRates.min / clipRates.maj).toFixed(1)}×` : "many times"} the
              majority&rsquo;s rate — and the noise is nearly irrelevant here, since averaging over a large
              batch amortises it while the per-example clip does not. Clipping alone, at zero noise and
              therefore zero privacy, already costs the minority most of what DP-SGD will cost it. So
              &ldquo;spend more ε&rdquo; buys back almost nothing. Raising C, per-group clip norms, or
              adaptive clipping target the operation that is actually doing the damage.
            </GuidedPayoff>
          )}
        </div>
      )}
      legend={(i) =>
        i === 0 ? (
          <>
            <GuidedLegend color={VIZ.axis}>majority gradients</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>minority gradients</GuidedLegend>
            <GuidedLegend color={VIZ.yellow}>clip norm</GuidedLegend>
          </>
        ) : (
          <>
            <GuidedLegend color={VIZ.axis}>majority accuracy</GuidedLegend>
            <GuidedLegend color={VIZ.rose}>minority accuracy</GuidedLegend>
          </>
        )
      }
    />
  );
}
