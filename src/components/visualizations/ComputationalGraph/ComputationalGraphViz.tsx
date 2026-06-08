"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton, VizSlider, VizStat } from "../viz-kit";

/**
 * Backprop as the chain rule on a computational graph. For y = sin(u), u = x²,
 * the forward pass fills node values left→right; the backward pass multiplies
 * local derivatives right→left to get dy/dx = cos(u)·2x.
 */

const W = 480;
const H = 220;

export function ComputationalGraphViz({ className }: { className?: string }) {
  const [x, setX] = useState(1.5);
  const [mode, setMode] = useState<"forward" | "backward">("forward");

  const u = x * x;
  const y = Math.sin(u);
  const dy_du = Math.cos(u);
  const du_dx = 2 * x;
  const dy_dx = dy_du * du_dx;

  const fwd = mode === "forward";
  const nodes = [
    { cx: 80, label: "x", val: x.toFixed(2) },
    { cx: 240, label: "u = x²", val: u.toFixed(2) },
    { cx: 400, label: "y = sin u", val: y.toFixed(3) },
  ];

  const edgeColor = fwd ? VIZ.teal : VIZ.orange;

  return (
    <VizFrame
      className={className}
      title="Backprop = the chain rule on a graph"
      caption="Forward (teal) computes values left → right. Backward (orange) multiplies local derivatives right → left: dy/dx = dy/du · du/dx = cos(u) · 2x. Each node just multiplies the incoming gradient by its own local derivative."
    >
      <div className="flex gap-2 mb-3">
        <VizButton onClick={() => setMode("forward")} active={fwd}>Forward →</VizButton>
        <VizButton onClick={() => setMode("backward")} active={!fwd}>← Backward (grad)</VizButton>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Computational graph for y = sin(x squared)">
        <defs>
          <marker id="cg-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={edgeColor} />
          </marker>
        </defs>

        {/* edges */}
        {[0, 1].map((i) => {
          const x1 = fwd ? nodes[i].cx + 52 : nodes[i + 1].cx - 52;
          const x2 = fwd ? nodes[i + 1].cx - 52 : nodes[i].cx + 52;
          return (
            <g key={i}>
              <line x1={x1} y1={90} x2={x2} y2={90} stroke={edgeColor} strokeWidth={2} markerEnd="url(#cg-arrow)" />
              <text x={(nodes[i].cx + nodes[i + 1].cx) / 2} y={78} fill={edgeColor} fontSize={11} textAnchor="middle">
                {fwd ? (i === 0 ? "square" : "sin") : i === 0 ? `·${du_dx.toFixed(2)}` : `·${dy_du.toFixed(2)}`}
              </text>
            </g>
          );
        })}

        {/* nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            <rect x={n.cx - 52} y={66} width={104} height={48} rx={10} fill={VIZ.card} stroke={VIZ.brand} strokeWidth={1.5} />
            <text x={n.cx} y={88} fill={VIZ.textBright} fontSize={13} textAnchor="middle" fontWeight="bold">{n.label}</text>
            <text x={n.cx} y={106} fill={VIZ.text} fontSize={12} textAnchor="middle" fontFamily="monospace">
              {fwd ? n.val : i === 2 ? "1.00" : i === 1 ? dy_du.toFixed(2) : dy_dx.toFixed(2)}
            </text>
          </g>
        ))}

        <text x={W / 2} y={150} fill={VIZ.text} fontSize={11} textAnchor="middle">
          {fwd ? "node values (forward pass)" : "gradients ∂y/∂· (backward pass)"}
        </text>
      </svg>

      <div className="mt-2 mb-3">
        <VizSlider label="input x" min={-3} max={3} step={0.05} value={x} onChange={setX} format={(v) => v.toFixed(2)} />
      </div>

      <div className="flex gap-6">
        <VizStat label="forward y" value={y.toFixed(3)} color={VIZ.teal} />
        <VizStat label="gradient dy/dx" value={dy_dx.toFixed(3)} color={VIZ.orange} />
      </div>
    </VizFrame>
  );
}
