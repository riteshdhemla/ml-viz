"use client";

import { useState } from "react";
import { VIZ, VizButton } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";

/**
 * One transformer layer, walked stage by stage.
 *
 * The block is drawn once as a vertical stack with its residual skip
 * connections, and the walkthrough moves a highlight down it — input →
 * attention → add & norm → FFN → add & norm → output — so the reader follows a
 * tensor through the layer rather than clicking boxes in whatever order catches
 * their eye. Each step reports the shape and the parameter count at that point,
 * which is where the two payoffs live: the shape never changes (that is *why*
 * blocks stack), and two thirds of the parameters are in the FFN, not the
 * attention everyone talks about.
 *
 * The encoder/decoder toggle is orthogonal to the walk, so it sits in the
 * always-visible controls rather than in any one step.
 */

const W = 520;
const H = 480;

type BlockId = "input" | "mha" | "addnorm1" | "ffn" | "addnorm2" | "output";

interface Block {
  id: BlockId;
  y: number;
  label: (decoder: boolean) => string;
  color: string;
}

const BLOCK_W = 220;
const BLOCK_H = 42;
const BLOCK_X = (W - BLOCK_W) / 2;

const BLOCKS: Block[] = [
  { id: "input", y: 40, label: () => "Input Embedding", color: VIZ.teal },
  {
    id: "mha",
    y: 130,
    label: (dec) => (dec ? "Masked Multi-Head Attention" : "Multi-Head Attention"),
    color: VIZ.brand,
  },
  { id: "addnorm1", y: 220, label: () => "Add & Norm", color: VIZ.orange },
  { id: "ffn", y: 310, label: () => "Feed-Forward (FFN)", color: VIZ.brand },
  { id: "addnorm2", y: 400, label: () => "Add & Norm", color: VIZ.orange },
  { id: "output", y: 460, label: () => "Output", color: VIZ.teal },
];

/* ---------------------------------------------------------------- numbers */

// A small-but-realistic layer: the numbers below are all derived from these.
const D_MODEL = 512;
const D_FF = 4 * D_MODEL;
const HEADS = 8;
const SEQ = 10;

/** Learnable parameters introduced at each stage of the block. */
const PARAMS: Record<BlockId, number> = {
  input: 0, // the embedding table lives outside the block
  mha: 4 * D_MODEL * D_MODEL, // W_Q, W_K, W_V, W_O
  addnorm1: 2 * D_MODEL, // LayerNorm gain + bias
  ffn: 2 * D_MODEL * D_FF, // W₁ and W₂ (biases rounded away)
  addnorm2: 2 * D_MODEL,
  output: 0,
};

const TOTAL_PARAMS = Object.values(PARAMS).reduce((a, b) => a + b, 0);

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ steps */

const PHASES: GuidedPhase[] = [
  { id: "flow", label: "Forward pass · one layer", tone: "brand" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "flow",
    label: "Input",
    title: "A tensor enters the layer",
    body: (
      <>
        <p>
          Token embeddings — with positional information already added — arrive as a matrix of
          shape <code>[seq_len × d_model]</code>. One row per token, <code>d_model</code> numbers
          each.
        </p>
        <p>
          Nothing about this layer is specific to <em>which</em> layer it is. The same block is
          stacked 12, 48 or 96 times, and every copy sees a tensor of exactly this shape.
        </p>
      </>
    ),
    hint: "Watch the shape readout below as you advance — it is the same at every single step.",
  },
  {
    phase: "flow",
    label: "Self-attention",
    title: "Mix information across tokens",
    body: (
      <>
        <p>
          This is the only stage where tokens see each other. Each token builds a query, compares it
          against every key, and pulls a weighted mix of the values —{" "}
          <strong>{HEADS} heads</strong> doing it in parallel over different subspaces, then
          concatenated and projected back.
        </p>
        <p>
          The encoder variant lets every token attend to every other. The decoder variant masks
          future positions to <code>−∞</code> before the softmax, so position <em>t</em> can only
          use <em>1…t</em> — which is what makes autoregressive generation possible.
        </p>
      </>
    ),
    hint: "Toggle Encoder / Decoder above: the only structural change is a mask inside this one block.",
  },
  {
    phase: "flow",
    label: "Add & Norm",
    title: "Residual add, then LayerNorm",
    body: (
      <>
        <p>
          The block does not replace its input, it <strong>adds to it</strong>:{" "}
          <code>x = x + Attn(x)</code>. The yellow skip path is that addition. It gives gradients a
          route around the attention block, which is the reason a 96-layer stack trains at all.
        </p>
        <p>
          Then LayerNorm rescales each token&rsquo;s feature vector to zero mean and unit variance,
          keeping activations in a stable range no matter how deep the stack gets.
        </p>
      </>
    ),
    hint: "The residual path is highlighted. Delete it and depth stops helping — this is the ResNet lesson, applied to sequences.",
  },
  {
    phase: "flow",
    label: "Feed-forward",
    title: "Think about each token on its own",
    body: (
      <>
        <p>
          A two-layer MLP — <code>FFN(x) = W₂ · ReLU(W₁x + b₁) + b₂</code> — applied{" "}
          <strong>independently to every position</strong>. No token talks to any other here; the
          mixing already happened upstream.
        </p>
        <p>
          The hidden dimension is <code>4 × d_model</code> ({D_FF} here), so this stage expands,
          transforms, and projects back down. It is where most of the layer&rsquo;s capacity lives.
        </p>
      </>
    ),
    hint: "Check the parameter count: this one stage holds twice as many weights as all of attention.",
  },
  {
    phase: "flow",
    label: "Add & Norm",
    title: "The second residual",
    body: (
      <>
        <p>
          The same pattern again: <code>x = x + FFN(x)</code>, then LayerNorm. Every transformer
          block ends with normalised activations, which is precisely what lets the next block make
          the same assumptions this one did.
        </p>
        <p>
          Modern implementations usually move both norms <em>before</em> their sub-layer
          (&ldquo;pre-LN&rdquo;) rather than after. That variant trains without a learning-rate
          warm-up, which is why almost every model since GPT-2 uses it.
        </p>
      </>
    ),
    hint: "Two sub-layers, two residuals, two norms — that regular structure is the whole block.",
  },
  {
    phase: "flow",
    label: "Output",
    title: "Out the same shape it came in",
    body: (
      <>
        <p>
          The layer emits <code>[seq_len × d_model]</code> — the shape it was handed. That
          invariance is the architectural payoff: because input and output shapes match, the block
          composes with itself arbitrarily many times, and depth becomes a hyperparameter rather
          than a redesign.
        </p>
        <p>
          It also explains where the scaling levers are. Deeper stacks add blocks; wider models
          raise <code>d_model</code>; mixture-of-experts models swap the FFN for many FFNs and route
          between them — because that is where the parameters were all along.
        </p>
      </>
    ),
    hint: "Compare this readout to step 01: identical shape, ~3.15M parameters heavier.",
  },
];

/* ------------------------------------------------------------------- view */

function residualPath(fromY: number, toY: number, side: "left" | "right", active: boolean) {
  const xEdge = BLOCK_X + (side === "left" ? -4 : BLOCK_W + 4);
  const xCurve = side === "left" ? xEdge - 36 : xEdge + 36;
  const midY = (fromY + toY) / 2;
  const d = [
    `M ${xEdge} ${fromY}`,
    `C ${xCurve} ${fromY}, ${xCurve} ${midY}, ${xCurve} ${midY}`,
    `C ${xCurve} ${midY}, ${xCurve} ${toY}, ${xEdge} ${toY}`,
  ].join(" ");
  return (
    <path
      key={`res-${side}-${fromY}`}
      d={d}
      fill="none"
      stroke={active ? VIZ.yellow : VIZ.grid}
      strokeWidth={active ? 2.5 : 1.5}
      strokeDasharray={active ? "none" : "4 3"}
      opacity={active ? 0.9 : 0.5}
      className="transition-all duration-300"
    />
  );
}

function arrowDown(x: number, y: number, active: boolean) {
  return (
    <polygon
      key={`arrow-${y}`}
      points={`${x - 5},${y - 8} ${x + 5},${y - 8} ${x},${y}`}
      fill={active ? VIZ.brandLight : VIZ.axis}
      opacity={active ? 0.9 : 0.5}
    />
  );
}

export function TransformerBlockViz({ className }: { className?: string }) {
  const [decoder, setDecoder] = useState(false);
  const [step, setStep] = useState(0);

  const active = BLOCKS[step];

  const res1FromY = BLOCKS[0].y + BLOCK_H / 2 + 4;
  const res1ToY = BLOCKS[2].y + BLOCK_H / 2 + 4;
  const res2FromY = BLOCKS[2].y + BLOCK_H / 2 + 4;
  const res2ToY = BLOCKS[4].y + BLOCK_H / 2 + 4;

  // A residual lights up while the walk is anywhere inside the sub-layer it spans.
  const res1Active = step >= 0 && step <= 2;
  const res2Active = step >= 2 && step <= 4;

  // Parameters the tensor has passed through by this point in the block.
  const paramsSoFar = BLOCKS.slice(0, step + 1).reduce((sum, b) => sum + PARAMS[b.id], 0);

  const stage = (i: number) => {
    const activeId = BLOCKS[i].id;

    const connectors: React.ReactElement[] = [];
    for (let k = 0; k < BLOCKS.length - 1; k++) {
      const fromY = BLOCKS[k].y + BLOCK_H / 2;
      const toY = BLOCKS[k + 1].y - BLOCK_H / 2;
      if (toY <= fromY + 2) continue;
      // The connector the tensor is crossing right now: into the active block.
      const on = k + 1 === i;
      connectors.push(
        <line
          key={`conn-${k}`}
          x1={W / 2}
          y1={fromY}
          x2={W / 2}
          y2={toY}
          stroke={on ? VIZ.brandLight : VIZ.axis}
          strokeWidth={on ? 2 : 1.5}
          opacity={on ? 0.9 : 0.5}
          className="transition-all duration-300"
        />,
      );
      connectors.push(arrowDown(W / 2, toY, on));
    }

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Transformer layer block diagram, highlighting ${BLOCKS[i].label(decoder)}`}
        style={{ overflow: "visible" }}
      >
        {residualPath(res1FromY, res1ToY, "left", res1Active)}
        {residualPath(res1FromY, res1ToY, "right", res1Active)}
        {residualPath(res2FromY, res2ToY, "left", res2Active)}
        {residualPath(res2FromY, res2ToY, "right", res2Active)}

        {connectors}

        {BLOCKS.map((block, k) => {
          const isActive = block.id === activeId;
          const passed = k < i;
          const ry = block.y - BLOCK_H / 2;
          return (
            <g key={block.id}>
              <rect
                x={BLOCK_X}
                y={ry}
                width={BLOCK_W}
                height={BLOCK_H}
                rx={10}
                fill={isActive ? block.color : VIZ.card}
                stroke={isActive ? block.color : passed ? block.color : VIZ.grid}
                strokeWidth={isActive ? 2 : 1.5}
                opacity={isActive ? 1 : passed ? 0.75 : 0.45}
                className="transition-all duration-300"
              />

              {decoder && block.id === "mha" && (
                <>
                  <rect
                    x={BLOCK_X + BLOCK_W - 56}
                    y={ry + 8}
                    width={48}
                    height={18}
                    rx={6}
                    fill={VIZ.rose}
                    opacity={0.9}
                  />
                  <text
                    x={BLOCK_X + BLOCK_W - 32}
                    y={ry + 21}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={9}
                    fontWeight="600"
                  >
                    masked
                  </text>
                </>
              )}

              <text
                x={BLOCK_X + BLOCK_W / 2}
                y={block.y + 5}
                textAnchor="middle"
                fill={isActive ? "#fff" : VIZ.text}
                fontSize={13}
                fontWeight={isActive ? 700 : 500}
                className="transition-colors duration-300"
              >
                {block.label(decoder)}
              </text>
            </g>
          );
        })}

        {[
          { y: (res1FromY + res1ToY) / 2, on: res1Active },
          { y: (res2FromY + res2ToY) / 2, on: res2Active },
        ].map((r) => (
          <text
            key={r.y}
            x={BLOCK_X - 42}
            y={r.y}
            textAnchor="middle"
            fill={r.on ? VIZ.yellow : VIZ.axis}
            fontSize={9}
            opacity={r.on ? 0.9 : 0.5}
            transform={`rotate(-90, ${BLOCK_X - 42}, ${r.y})`}
          >
            residual
          </text>
        ))}
      </svg>
    );
  };

  const panel = () => (
    <div className="flex flex-wrap gap-2.5">
      <GuidedCard label="tensor shape" accent={VIZ.teal}>
        [{SEQ} × {D_MODEL}] — unchanged since the input, and unchanged at the output.
      </GuidedCard>
      <GuidedCard label="params at this stage" accent={active.color}>
        {PARAMS[active.id] === 0
          ? "none — this stage only moves the tensor."
          : `${fmt(PARAMS[active.id])} weights (${((PARAMS[active.id] / TOTAL_PARAMS) * 100).toFixed(0)}% of the block).`}
      </GuidedCard>
      <GuidedCard label="params so far" accent={VIZ.brandLight}>
        {fmt(paramsSoFar)} of {fmt(TOTAL_PARAMS)} in the layer.
      </GuidedCard>
      {step === STEPS.length - 1 && (
        <GuidedPayoff label="where the weights actually are">
          Attention gets the attention, but the FFN holds{" "}
          <strong className="font-semibold text-white">
            {((PARAMS.ffn / TOTAL_PARAMS) * 100).toFixed(0)}%
          </strong>{" "}
          of this layer&rsquo;s {fmt(TOTAL_PARAMS)} parameters against attention&rsquo;s{" "}
          {((PARAMS.mha / TOTAL_PARAMS) * 100).toFixed(0)}%. That ratio is why
          mixture-of-experts models replace the FFN rather than the attention: it is the biggest
          thing in the block, and it is applied per-token, so it is the easiest thing to route.
        </GuidedPayoff>
      )}
    </div>
  );

  return (
    <GuidedViz
      className={className}
      title="Transformer layer, stage by stage"
      caption={`One complete transformer block at d_model = ${D_MODEL}, ${HEADS} heads, d_ff = ${D_FF}. Walk a tensor down it and watch two things: the shape never changes, and the parameter count is dominated by the feed-forward network. Yellow curves are the residual skip connections.`}
      phases={PHASES}
      steps={STEPS}
      controls={
        <>
          <VizButton onClick={() => setDecoder(false)} active={!decoder}>
            Encoder (bidirectional)
          </VizButton>
          <VizButton onClick={() => setDecoder(true)} active={decoder}>
            Decoder (masked)
          </VizButton>
        </>
      }
      stage={stage}
      stageNote={() => `${decoder ? "decoder" : "encoder"} · d_model ${D_MODEL} · ${HEADS} heads`}
      panel={panel}
      legend={() => (
        <>
          <GuidedLegend color={VIZ.brand}>learned sub-layer</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>residual add + LayerNorm</GuidedLegend>
          <GuidedLegend color={VIZ.yellow}>skip connection</GuidedLegend>
        </>
      )}
      onStepChange={setStep}
    />
  );
}
