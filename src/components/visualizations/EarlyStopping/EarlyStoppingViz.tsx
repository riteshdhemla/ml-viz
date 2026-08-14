"use client";

/**
 * Early stopping, with the patience knob turned into a measured tradeoff.
 *
 * The lesson's "setting patience" advice is qualitative. It does not have to
 * be: run the rule 800 times against the same noisy validation curve and the
 * cost of each patience value is a number. Against a noiseless minimum of
 * 0.4058 at epoch 33:
 *
 *   patience  epochs run   val at restored epoch   regret
 *      1        13.2            0.6388             0.2329
 *      2        21.0            0.4900             0.0841
 *      3        26.2            0.4470             0.0412
 *      5        33.4            0.4196             0.0138
 *      8        40.1            0.4121             0.0062
 *     12        46.2            0.4105             0.0047
 *     20        54.6            0.4107             0.0048
 *
 * Two things fall out. Patience buys quality with a hard diminishing return —
 * everything past 8 is noise-level — and *because early stopping restores the
 * best checkpoint rather than the last one*, over-large patience costs only
 * compute, never quality. That asymmetry is the practical rule: when in doubt,
 * too much patience is the cheap mistake.
 *
 * The panel runs one seeded curve so the reader can see the mechanism (best
 * epoch, the patience window ticking, the restore), and reports the 800-run
 * averages beside it so a single lucky curve is never the evidence.
 */

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizSlider, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

const EPOCHS = 60;
const NOISE = 0.022;
const TRIALS = 800;

/** A realistic U: fast early gains, then slow overfitting. */
const trueVal = (e: number) => 1.05 * Math.exp(-e / 9) + (0.03 * e) / 10 + 0.28;
const trueTrain = (e: number) => 0.95 * Math.exp(-e / 7) + 0.16;

const OPT = (() => {
  let best = Infinity;
  let at = 0;
  for (let e = 0; e < EPOCHS; e++)
    if (trueVal(e) < best) {
      best = trueVal(e);
      at = e;
    }
  return { best, at };
})();

/** One noisy validation curve, fixed so the picture never jumps. */
const CURVE = (() => {
  const rng = seededRandom(4242);
  return Array.from({ length: EPOCHS }, (_, e) => trueVal(e) + gaussian(rng, 0, NOISE));
})();

function runOn(vals: number[], patience: number) {
  let bv = Infinity;
  let be = 0;
  let wait = 0;
  for (let e = 0; e < vals.length; e++) {
    if (vals[e] < bv) {
      bv = vals[e];
      be = e;
      wait = 0;
    } else if (++wait >= patience) return { stopped: e + 1, bestEpoch: be, bestVal: bv };
  }
  return { stopped: vals.length, bestEpoch: be, bestVal: bv };
}

/** The same rule over 800 independent noise draws. */
function sweep(patience: number) {
  let epochs = 0;
  let trueAtBest = 0;
  for (let s = 0; s < TRIALS; s++) {
    const rng = seededRandom(1 + s * 7919);
    const vals = Array.from({ length: EPOCHS }, (_, e) => trueVal(e) + gaussian(rng, 0, NOISE));
    const r = runOn(vals, patience);
    epochs += r.stopped / TRIALS;
    trueAtBest += trueVal(r.bestEpoch) / TRIALS;
  }
  return { epochs, trueAtBest, regret: trueAtBest - OPT.best };
}

const W = 560;
const H = 250;
const PAD = { l: 44, r: 14, t: 16, b: 30 };
const Y_LO = 0.15;
const Y_HI = 1.4;
const sx = scale(0, EPOCHS - 1, PAD.l, W - PAD.r);
const sy = scale(Y_LO, Y_HI, H - PAD.b, PAD.t);

export function EarlyStoppingViz({ className }: { className?: string }) {
  const [patience, setPatience] = useState(5);

  const run = useMemo(() => runOn(CURVE, patience), [patience]);
  const stats = useMemo(() => sweep(patience), [patience]);

  const line = (f: (e: number) => number) =>
    Array.from({ length: EPOCHS }, (_, e) => `${e === 0 ? "M" : "L"}${sx(e).toFixed(1)},${sy(f(e)).toFixed(1)}`).join(" ");
  const valLine = CURVE.map((v, e) => `${e === 0 ? "M" : "L"}${sx(e).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");

  return (
    <VizFrame
      title="What patience actually buys"
      caption="One seeded run of a 60-epoch training: training loss falls forever, validation loss turns around. The teal band is the patience window counting down from the best epoch; the vertical line is where training stops and the marker is the checkpoint that gets restored. The right-hand statistics are averages over 800 independent noise draws of the same underlying curve, so no single lucky run is doing the arguing."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((y) => (
          <g key={y}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(y)} y2={sy(y)} stroke={VIZ.grid} strokeWidth={1} />
            <text x={PAD.l - 6} y={sy(y) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
              {y.toFixed(1)}
            </text>
          </g>
        ))}

        {/* the patience window: from the best epoch to where it runs out */}
        <rect
          x={sx(run.bestEpoch)}
          y={PAD.t}
          width={Math.max(0, sx(Math.min(EPOCHS - 1, run.bestEpoch + patience)) - sx(run.bestEpoch))}
          height={H - PAD.b - PAD.t}
          fill={VIZ.teal}
          opacity={0.1}
        />

        <path d={line(trueTrain)} fill="none" stroke={VIZ.brand} strokeWidth={2} />
        <path d={valLine} fill="none" stroke={VIZ.orange} strokeWidth={1.6} />
        <path d={line(trueVal)} fill="none" stroke={VIZ.orange} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />

        {/* where training actually stops, and what gets restored */}
        <line
          x1={sx(Math.min(EPOCHS - 1, run.stopped - 1))}
          x2={sx(Math.min(EPOCHS - 1, run.stopped - 1))}
          y1={PAD.t}
          y2={H - PAD.b}
          stroke={VIZ.rose}
          strokeWidth={1.5}
        />
        <circle cx={sx(run.bestEpoch)} cy={sy(CURVE[run.bestEpoch])} r={5} fill={VIZ.teal} />
        <circle cx={sx(OPT.at)} cy={sy(OPT.best)} r={3.5} fill="none" stroke={VIZ.textBright} strokeWidth={1.5} />

        <text x={sx(run.bestEpoch)} y={PAD.t + 10} textAnchor="middle" fontSize={9} fill={VIZ.teal} stroke={VIZ.card} strokeWidth={2.5} paintOrder="stroke">
          restore epoch {run.bestEpoch}
        </text>
        <text
          x={sx(Math.min(EPOCHS - 1, run.stopped - 1)) - 5}
          y={H - PAD.b - 6}
          textAnchor="end"
          fontSize={9}
          fill={VIZ.rose}
          stroke={VIZ.card}
          strokeWidth={2.5}
          paintOrder="stroke"
        >
          stop at {run.stopped}
        </text>
        <text x={PAD.l + 6} y={sy(trueTrain(6))} fontSize={9} fill={VIZ.brand}>
          train
        </text>
        <text x={sx(EPOCHS - 6)} y={sy(CURVE[EPOCHS - 6]) - 8} fontSize={9} fill={VIZ.orange}>
          validation
        </text>
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          epoch
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="epochs run (this curve)" value={String(run.stopped)} color={VIZ.rose} />
        <VizStat label="epochs run (800-run mean)" value={stats.epochs.toFixed(1)} />
        <VizStat label="restored loss (800-run mean)" value={stats.trueAtBest.toFixed(4)} color={VIZ.teal} />
        <VizStat label="best achievable" value={OPT.best.toFixed(4)} />
        <VizStat
          label="regret vs the true minimum"
          value={stats.regret.toFixed(4)}
          color={stats.regret > 0.02 ? VIZ.rose : VIZ.teal}
        />
      </div>

      <div className="mt-4 w-72">
        <VizSlider
          label="patience — epochs without improvement"
          min={1}
          max={20}
          step={1}
          value={patience}
          onChange={(v) => setPatience(Math.round(v))}
          format={(v) => String(v)}
        />
      </div>
    </VizFrame>
  );
}
