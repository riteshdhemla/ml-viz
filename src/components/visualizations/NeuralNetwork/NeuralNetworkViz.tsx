"use client";

import { useMemo, useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat, seededRandom } from "../viz-kit";

/**
 * Interactive feed-forward network. Drag the two inputs and watch real
 * activations flow through the layers: edge thickness/colour encode the weight
 * (brand = positive, rose = negative), neuron brightness encodes the
 * activation value. Switch activation function, hidden width, and depth to see
 * how the same inputs produce different outputs.
 */

const W = 480;
const H = 290;

const ACTS = {
  relu: { name: "ReLU", f: (z: number) => Math.max(0, z) },
  sigmoid: { name: "Sigmoid", f: (z: number) => 1 / (1 + Math.exp(-z)) },
  tanh: { name: "Tanh", f: (z: number) => Math.tanh(z) },
} as const;

/** Deterministic weights/biases for a layer-size sequence, e.g. [2, 3, 1]. */
function buildNetwork(sizes: number[]) {
  const rng = seededRandom(42);
  // weights[l][j][i] connects neuron i of layer l to neuron j of layer l+1
  const weights = sizes.slice(1).map((nOut, l) =>
    Array.from({ length: nOut }, () =>
      Array.from({ length: sizes[l] }, () => Math.round((rng() * 3 - 1.5) * 100) / 100)
    )
  );
  const biases = sizes.slice(1).map((nOut) =>
    Array.from({ length: nOut }, () => Math.round((rng() - 0.5) * 100) / 100)
  );
  return { weights, biases };
}

export function NeuralNetworkViz({ className }: { className?: string }) {
  const [x1, setX1] = useState(1.0);
  const [x2, setX2] = useState(-0.5);
  const [act, setAct] = useState<keyof typeof ACTS>("relu");
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(1);

  const sizes = useMemo(
    () => [2, ...Array.from({ length: depth }, () => width), 1],
    [width, depth]
  );
  const { weights, biases } = useMemo(() => buildNetwork(sizes), [sizes]);

  // Real forward pass: hidden layers use the chosen activation, output is linear.
  const activations = useMemo(() => {
    const f = ACTS[act].f;
    const layers: number[][] = [[x1, x2]];
    for (let l = 0; l < weights.length; l++) {
      const prev = layers[l];
      const isOutput = l === weights.length - 1;
      layers.push(
        weights[l].map((row, j) => {
          const z = row.reduce((s, w, i) => s + w * prev[i], biases[l][j]);
          return isOutput ? z : f(z);
        })
      );
    }
    return layers;
  }, [x1, x2, act, weights, biases]);

  const output = activations[activations.length - 1][0];
  const nParams = weights.reduce((s, layer, l) => s + layer.length * sizes[l] + layer.length, 0);

  // Layout: layers spread horizontally, neurons stacked vertically per layer.
  const cx = (l: number) => 60 + (l / (sizes.length - 1)) * (W - 120);
  const cy = (l: number, j: number) => H / 2 + (j - (sizes[l] - 1) / 2) * 58;
  const labels = ["input", ...sizes.slice(1, -1).map((_, i) => `hidden ${i + 1}`), "output"];

  return (
    <VizFrame
      className={className}
      title="A feed-forward network, live"
      caption="Edges: brand = positive weight, rose = negative; thicker = larger magnitude. Neuron brightness shows its activation value. The output neuron is linear — change inputs, activation, width, and depth and watch the forward pass recompute."
    >
      <div className="flex flex-wrap gap-2 mb-1">
        {Object.entries(ACTS).map(([k, v]) => (
          <VizButton key={k} onClick={() => setAct(k as keyof typeof ACTS)} active={k === act}>
            {v.name}
          </VizButton>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3 mt-2">
        {[2, 3, 4].map((w) => (
          <VizButton key={w} onClick={() => setWidth(w)} active={w === width}>
            width {w}
          </VizButton>
        ))}
        {[1, 2].map((d) => (
          <VizButton key={d} onClick={() => setDepth(d)} active={d === depth}>
            {d} hidden layer{d > 1 ? "s" : ""}
          </VizButton>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Feed-forward neural network with live activations">
        {/* edges — drawn first so neurons sit on top */}
        {weights.map((layer, l) =>
          layer.map((row, j) =>
            row.map((w, i) => (
              <line
                key={`${l}-${j}-${i}`}
                x1={cx(l)}
                y1={cy(l, i)}
                x2={cx(l + 1)}
                y2={cy(l + 1, j)}
                stroke={w >= 0 ? VIZ.brand : VIZ.rose}
                strokeWidth={0.6 + 2.4 * Math.min(1, Math.abs(w) / 1.5)}
                opacity={0.25 + 0.55 * Math.min(1, Math.abs(w) / 1.5)}
              />
            ))
          )
        )}

        {/* layer labels */}
        {labels.map((label, l) => (
          <text key={label} x={cx(l)} y={16} fill={VIZ.text} fontSize={11} textAnchor="middle">
            {label}
          </text>
        ))}

        {/* neurons — fill brightness encodes the activation magnitude */}
        {activations.map((layer, l) =>
          layer.map((a, j) => {
            const glow = Math.tanh(Math.abs(a)); // squash to (0, 1) for any range
            const isOutput = l === sizes.length - 1;
            return (
              <g key={`${l}-${j}`}>
                <circle
                  cx={cx(l)}
                  cy={cy(l, j)}
                  r={19}
                  fill={isOutput ? VIZ.teal : VIZ.brand}
                  fillOpacity={0.12 + 0.78 * glow}
                  stroke={a < 0 ? VIZ.rose : VIZ.brandLight}
                  strokeWidth={1.5}
                />
                <text
                  x={cx(l)}
                  y={cy(l, j) + 4}
                  fill={VIZ.textBright}
                  fontSize={10}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {a.toFixed(2)}
                </text>
              </g>
            );
          })
        )}
      </svg>

      <div className="grid sm:grid-cols-2 gap-3 mt-2 mb-3">
        <VizSlider label="input x₁" min={-2} max={2} step={0.1} value={x1} onChange={setX1} format={(v) => v.toFixed(1)} />
        <VizSlider label="input x₂" min={-2} max={2} step={0.1} value={x2} onChange={setX2} format={(v) => v.toFixed(1)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="output ŷ" value={output.toFixed(3)} color={VIZ.teal} />
        <VizStat label="activation" value={ACTS[act].name} color={VIZ.brand} />
        <VizStat label="parameters" value={String(nParams)} color={VIZ.yellow} />
      </div>
    </VizFrame>
  );
}
