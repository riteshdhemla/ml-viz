"use client";

/**
 * The roofline, with real deep-learning kernels placed on it.
 *
 * Attainable throughput is min(peak FLOP/s, bandwidth × arithmetic intensity).
 * The corner — the *ridge point* — sits at peak/bandwidth, and which side of it
 * a kernel lands on decides whether it is worth optimising arithmetic or
 * memory traffic.
 *
 * Two results are worth the build, and both are exact rather than illustrative:
 *
 * 1. **Tensor cores move the ridge point right, by a lot.** On an A100 the
 *    ridge is 19.5 TFLOP/s ÷ 1555 GB/s = 12.5 FLOP/byte in FP32 and
 *    312 ÷ 1555 = 200.6 FLOP/byte with tensor cores — 16× further out. Making
 *    the arithmetic faster does not make kernels compute-bound, it makes *more
 *    of them memory-bound*. A kernel at 85 FLOP/byte (GEMM at n = 256) is
 *    comfortably compute-bound in FP32 and bandwidth-bound in FP16.
 *
 * 2. **For LLM decode, arithmetic intensity equals the batch size.** Reading an
 *    N×N weight matrix once costs 2N² bytes in FP16 and does 2BN² FLOPs for a
 *    batch of B, so AI = B exactly. That turns "batch your inference server"
 *    into a number: on A100 tensor cores you need B ≥ 201 to leave the
 *    bandwidth-bound regime. At B = 1 the kernel can reach 0.5% of peak; at
 *    B = 8, 4.0%; at B = 64, 31.9%.
 *
 * Hardware figures are vendor peak specs (A100 40GB SXM, H100 SXM, T4) and are
 * upper bounds — the point of the diagram is the ratio between the two limits,
 * which is what decides the optimisation, not the absolute attainable number.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, scale } from "../viz-kit";

interface Hw {
  key: string;
  label: string;
  fp32: number;
  tc: number;
  bw: number;
  tcName: string;
}

const HARDWARE: Hw[] = [
  { key: "a100", label: "A100 40GB", fp32: 19.5e12, tc: 312e12, bw: 1555e9, tcName: "FP16 tensor core" },
  { key: "h100", label: "H100 SXM", fp32: 67e12, tc: 989e12, bw: 3350e9, tcName: "FP16 tensor core" },
  { key: "t4", label: "T4", fp32: 8.1e12, tc: 65e12, bw: 320e9, tcName: "FP16 tensor core" },
];

/**
 * Arithmetic intensities in FLOP per byte, FP16 (2 bytes per element).
 * `dy`/`end` are hand-placed so the labels do not collide — the set is fixed,
 * so tuning beats a layout algorithm here.
 *
 * Note there is deliberately no separate "3 ops unfused" point: fusing does not
 * move a kernel along this axis at all. Three unfused ops sit at the *same*
 * 0.167 FLOP/byte and simply pay it three times. Fusion buys 3× less traffic,
 * not a different place on the roofline, and drawing two dots on one spot said
 * the opposite.
 */
const KERNELS = [
  { name: "elementwise add", ai: 1 / 6, dy: -7, end: false },
  { name: "3 ops, fused", ai: 3 / 6, dy: 14, end: false },
  { name: "LayerNorm", ai: 5 / 4, dy: -7, end: false },
  { name: "GEMM n=256", ai: 256 / 3, dy: -8, end: true },
  { name: "GEMM n=1024", ai: 1024 / 3, dy: 14, end: false },
  { name: "GEMM n=4096", ai: 4096 / 3, dy: -8, end: true },
];

const W = 560;
const H = 300;
const PAD = { l: 52, r: 100, t: 18, b: 40 };
const AI_LO = 0.1;
const AI_HI = 4000;
const F_LO = 0.2e12;
const F_HI = 1200e12;

const sx = scale(Math.log10(AI_LO), Math.log10(AI_HI), PAD.l, W - PAD.r);
const sy = scale(Math.log10(F_LO), Math.log10(F_HI), H - PAD.b, PAD.t);
const px = (ai: number) => sx(Math.log10(Math.max(ai, AI_LO)));
const py = (f: number) => sy(Math.log10(Math.max(f, F_LO)));

const tflops = (f: number) => `${(f / 1e12).toFixed(f < 10e12 ? 2 : 1)} TFLOP/s`;

export function RooflineViz({ className }: { className?: string }) {
  const [hwKey, setHwKey] = useState("a100");
  const [tensorCore, setTensorCore] = useState(true);
  const [batch, setBatch] = useState(1);

  const hw = HARDWARE.find((h) => h.key === hwKey)!;
  const peak = tensorCore ? hw.tc : hw.fp32;
  const ridge = peak / hw.bw;

  const attainable = (ai: number) => Math.min(peak, hw.bw * ai);

  // decode: AI equals the batch size, exactly
  const decodeAi = batch;
  const decodeAtt = attainable(decodeAi);

  const roof = useMemo(() => {
    const pts: string[] = [];
    pts.push(`M${px(AI_LO)},${py(hw.bw * AI_LO)}`);
    pts.push(`L${px(ridge)},${py(peak)}`);
    pts.push(`L${px(AI_HI)},${py(peak)}`);
    return pts.join(" ");
  }, [hw, peak, ridge]);

  const decades = [0.1, 1, 10, 100, 1000];
  const fDecades = [1e12, 10e12, 100e12, 1000e12];

  return (
    <VizFrame
      title="Which limit is the one you are hitting"
      caption="Attainable throughput is min(peak FLOP/s, bandwidth × arithmetic intensity), both axes log. The sloped part is the memory roof, the flat part the compute roof, and the corner between them is the ridge point at peak ÷ bandwidth. A kernel left of the ridge is bandwidth-bound and no amount of faster arithmetic helps it. Hardware numbers are vendor peak specs."
      className={className}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {HARDWARE.map((h) => (
          <VizButton key={h.key} active={h.key === hwKey} onClick={() => setHwKey(h.key)}>
            {h.label}
          </VizButton>
        ))}
        <span className="w-3" />
        <VizButton active={!tensorCore} onClick={() => setTensorCore(false)}>
          FP32
        </VizButton>
        <VizButton active={tensorCore} onClick={() => setTensorCore(true)}>
          {hw.tcName}
        </VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {decades.map((d) => (
          <g key={d}>
            <line x1={px(d)} x2={px(d)} y1={PAD.t} y2={H - PAD.b} stroke={VIZ.grid} strokeWidth={1} />
            <text x={px(d)} y={H - PAD.b + 13} textAnchor="middle" fontSize={9} fill={VIZ.text}>
              {d}
            </text>
          </g>
        ))}
        {fDecades.map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(f)} y2={py(f)} stroke={VIZ.grid} strokeWidth={1} />
            <text x={PAD.l - 6} y={py(f) + 3} textAnchor="end" fontSize={9} fill={VIZ.text}>
              {f / 1e12}T
            </text>
          </g>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" fontSize={9} fill={VIZ.text}>
          arithmetic intensity (FLOP per byte)
        </text>

        {/* the region no kernel can reach */}
        <path
          d={`${roof} L${px(AI_HI)},${py(F_HI)} L${px(AI_LO)},${py(F_HI)} Z`}
          fill={VIZ.rose}
          opacity={0.05}
        />
        <path d={roof} fill="none" stroke={VIZ.brandLight} strokeWidth={2.2} />

        {/* ridge point */}
        <line
          x1={px(ridge)}
          x2={px(ridge)}
          y1={py(peak)}
          y2={H - PAD.b}
          stroke={VIZ.yellow}
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
        <text x={px(ridge) + 4} y={H - PAD.b - 4} fontSize={9} fill={VIZ.yellow}>
          ridge {ridge.toFixed(1)}
        </text>

        {/* kernels */}
        {KERNELS.map((k) => {
          const bound = k.ai < ridge;
          return (
            <g key={k.name}>
              <circle
                cx={px(k.ai)}
                cy={py(attainable(k.ai))}
                r={3.5}
                fill={bound ? VIZ.rose : VIZ.teal}
              />
              <text
                x={px(k.ai) + (k.end ? -6 : 6)}
                y={py(attainable(k.ai)) + k.dy}
                textAnchor={k.end ? "end" : "start"}
                fontSize={8}
                fill={bound ? VIZ.rose : VIZ.teal}
                stroke={VIZ.card}
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {k.name}
              </text>
            </g>
          );
        })}

        {/* the decode kernel the reader controls */}
        <circle cx={px(decodeAi)} cy={py(decodeAtt)} r={5.5} fill={VIZ.textBright} />
        <text
          x={px(decodeAi) + (decodeAi > 40 ? -9 : 9)}
          y={py(decodeAtt) + 22}
          textAnchor={decodeAi > 40 ? "end" : "start"}
          fontSize={9}
          fill={VIZ.textBright}
          stroke={VIZ.card}
          strokeWidth={2.5}
          paintOrder="stroke"
        >
          LLM decode, batch {batch}
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
        <VizStat label="peak compute" value={tflops(peak)} color={VIZ.brandLight} />
        <VizStat label="bandwidth" value={`${(hw.bw / 1e9).toFixed(0)} GB/s`} color={VIZ.brandLight} />
        <VizStat label="ridge point" value={`${ridge.toFixed(1)} FLOP/byte`} color={VIZ.yellow} />
        <VizStat
          label="decode attainable"
          value={tflops(decodeAtt)}
          color={decodeAi < ridge ? VIZ.rose : VIZ.teal}
        />
        <VizStat
          label="of peak"
          value={`${((decodeAtt / peak) * 100).toFixed(1)}%`}
          color={decodeAtt / peak < 0.5 ? VIZ.rose : VIZ.teal}
        />
        <VizStat
          label="batch needed to reach the ridge"
          value={String(Math.ceil(ridge))}
          color={VIZ.yellow}
        />
      </div>

      <div className="mt-4 w-72">
        <VizSlider
          label="decode batch size (= its arithmetic intensity)"
          min={1}
          max={512}
          step={1}
          value={batch}
          onChange={(v) => setBatch(Math.round(v))}
          format={(v) => String(v)}
        />
      </div>
    </VizFrame>
  );
}
