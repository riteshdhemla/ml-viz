"use client";

/**
 * The comma and the bar, drawn as areas of one unit square.
 *
 * Every quantity in the lesson is a region of the same square, which is the
 * cheapest way to make the distinction stick:
 *
 *   P(A, B)  — the area of the overlap
 *   P(A | B) — that area as a fraction of B's column
 *   P(B | A) — that same area as a fraction of A's row
 *
 * The comma is symmetric; the bars are not, because they divide by different
 * things. The default settings are the medical-test case that makes the
 * asymmetry impossible to wave away: prevalence 0.01, sensitivity 0.99, false
 * positive rate 0.05 gives
 *
 *   P(positive)          = 0.01·0.99 + 0.99·0.05 = 0.0594
 *   P(positive | ill)    = 0.99
 *   P(ill | positive)    = 0.0099 / 0.0594 = 0.1667
 *
 * — a factor of 5.9 between the two conditionals, from one 99% number. The
 * picture explains it without Bayes' rule: the sliver of true positives is
 * dwarfed by the false-positive band, because that band is 99× wider to begin
 * with. The square is drawn to scale, so the sliver really is that small.
 */

import { useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat } from "../viz-kit";

const W = 560;
const H = 250;
const PAD = { l: 46, r: 150, t: 16, b: 34 };
const BW = W - PAD.l - PAD.r;
const BH = H - PAD.t - PAD.b;

export function ConditionalAreaViz({ className }: { className?: string }) {
  const [pB, setPB] = useState(0.01); // prevalence
  const [pAgB, setPAgB] = useState(0.99); // sensitivity
  const [pAgNotB, setPAgNotB] = useState(0.05); // false positive rate

  const pAB = pB * pAgB; // P(A, B)
  const pAnotB = (1 - pB) * pAgNotB; // P(A, ¬B)
  const pA = pAB + pAnotB;
  const pBgA = pA > 0 ? pAB / pA : 0;

  const xB = PAD.l + pB * BW; // right edge of the B column

  const preset = (b: number, s: number, f: number) => () => {
    setPB(b);
    setPAgB(s);
    setPAgNotB(f);
  };

  return (
    <VizFrame
      title="The comma and the bar are different questions"
      caption="One unit square, drawn to scale. Its width splits by B (left column) and ¬B; inside each column the height splits by A. P(A,B) is the teal area. P(A|B) is that area as a fraction of its own column; P(B|A) is the same area as a fraction of everything shaded. The comma is symmetric — both bars are not, and they divide by different denominators."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <VizButton active={pB === 0.01 && pAgB === 0.99} onClick={preset(0.01, 0.99, 0.05)}>
          rare disease, good test
        </VizButton>
        <VizButton active={pB === 0.3 && pAgB === 0.9} onClick={preset(0.3, 0.9, 0.2)}>
          common condition
        </VizButton>
        <VizButton active={pB === 0.5 && pAgB === 0.5} onClick={preset(0.5, 0.5, 0.5)}>
          independent
        </VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* ¬B column */}
        <rect x={xB} y={PAD.t} width={PAD.l + BW - xB} height={BH} fill="#232735" />
        <rect
          x={xB}
          y={PAD.t}
          width={PAD.l + BW - xB}
          height={pAgNotB * BH}
          fill={VIZ.rose}
          opacity={0.75}
        />
        {/* B column */}
        <rect x={PAD.l} y={PAD.t} width={xB - PAD.l} height={BH} fill="#2b3040" />
        <rect x={PAD.l} y={PAD.t} width={xB - PAD.l} height={pAgB * BH} fill={VIZ.teal} />

        <rect x={PAD.l} y={PAD.t} width={BW} height={BH} fill="none" stroke={VIZ.axis} strokeWidth={1} />
        <line x1={xB} x2={xB} y1={PAD.t} y2={PAD.t + BH} stroke={VIZ.textBright} strokeWidth={1.5} />

        <text x={PAD.l} y={PAD.t + BH + 13} fontSize={9} fill={VIZ.text}>
          0
        </text>
        <text x={PAD.l + BW} y={PAD.t + BH + 13} textAnchor="end" fontSize={9} fill={VIZ.text}>
          1
        </text>
        {/* above the square: at small P(B) the divider sits on top of the "0" tick */}
        <text x={Math.max(xB + 3, PAD.l + 26)} y={PAD.t - 4} fontSize={9} fill={VIZ.textBright}>
          P(B) = {pB.toFixed(3)}
        </text>
        <text x={PAD.l - 6} y={PAD.t + 9} textAnchor="end" fontSize={9} fill={VIZ.text}>
          A
        </text>
        <text x={PAD.l - 6} y={PAD.t + BH} textAnchor="end" fontSize={9} fill={VIZ.text}>
          ¬A
        </text>

        {/* legend / readout column */}
        <g transform={`translate(${W - PAD.r + 14}, ${PAD.t + 6})`}>
          <rect x={0} y={-8} width={11} height={10} rx={2} fill={VIZ.teal} />
          <text x={17} y={1} fontSize={10} fill={VIZ.textBright}>
            A and B
          </text>
          <text x={0} y={16} fontSize={9} fill={VIZ.text}>
            area = {pAB.toFixed(4)}
          </text>

          <rect x={0} y={34} width={11} height={10} rx={2} fill={VIZ.rose} opacity={0.75} />
          <text x={17} y={43} fontSize={10} fill={VIZ.textBright}>
            A but not B
          </text>
          <text x={0} y={58} fontSize={9} fill={VIZ.text}>
            area = {pAnotB.toFixed(4)}
          </text>

          <text x={0} y={84} fontSize={10} fill={VIZ.textBright}>
            shaded total
          </text>
          <text x={0} y={98} fontSize={9} fill={VIZ.text}>
            P(A) = {pA.toFixed(4)}
          </text>

          <text x={0} y={124} fontSize={9} fill={VIZ.yellow}>
            teal ÷ shaded
          </text>
          <text x={0} y={137} fontSize={11} fill={VIZ.yellow}>
            P(B|A) = {pBgA.toFixed(4)}
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="P(A, B) — the comma" value={pAB.toFixed(4)} color={VIZ.teal} />
        <VizStat label="P(A | B)" value={pAgB.toFixed(4)} color={VIZ.teal} />
        <VizStat label="P(B | A)" value={pBgA.toFixed(4)} color={VIZ.yellow} />
        <VizStat
          label="ratio between the two bars"
          value={pBgA > 0 ? `${(pAgB / pBgA).toFixed(2)}×` : "—"}
          color={pAgB / pBgA > 2 ? VIZ.rose : VIZ.textBright}
        />
        <VizStat label="P(A)" value={pA.toFixed(4)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <VizSlider label="P(B) — the base rate" min={0.005} max={0.6} step={0.005} value={pB} onChange={setPB} format={(v) => v.toFixed(3)} />
        <VizSlider label="P(A | B) — sensitivity" min={0.5} max={1} step={0.01} value={pAgB} onChange={setPAgB} format={(v) => v.toFixed(2)} />
        <VizSlider label="P(A | ¬B) — false positives" min={0.01} max={0.4} step={0.01} value={pAgNotB} onChange={setPAgNotB} format={(v) => v.toFixed(2)} />
      </div>
    </VizFrame>
  );
}
