"use client";

import { useState } from "react";
import { VIZ, VizFrame, VizButton } from "../viz-kit";

/**
 * D-Separation visualizer — classic sprinkler Bayesian network.
 * Click nodes to observe them; watch paths between Rain and Sprinkler
 * recolor based on d-separation rules (fork at Cloudy, collider at Wet).
 */

const W = 400;
const H = 270;
const R = 18;

type NodeId = "C" | "R" | "S" | "W" | "Sl";

const NODES: Record<NodeId, { x: number; y: number; label: string }> = {
  C:  { x: 200, y: 30,  label: "Cloudy" },
  R:  { x: 90,  y: 110, label: "Rain" },
  S:  { x: 310, y: 110, label: "Sprinkler" },
  W:  { x: 200, y: 190, label: "Wet" },
  Sl: { x: 200, y: 255, label: "Slippery" },
};

// Edges: [from, to]
const EDGES: [NodeId, NodeId][] = [
  ["C", "R"],
  ["C", "S"],
  ["R", "W"],
  ["S", "W"],
  ["W", "Sl"],
];

// Path 1: R ← C → S  (fork through C)
// Path 2: R → W ← S  (collider at W)

function computePathStatus(observed: Set<NodeId>) {
  // Fork path (R–C–S): blocked if C is observed
  const forkBlocked = observed.has("C");

  // Collider path (R–W–S): blocked if W is NOT observed AND no descendant (Sl) is observed
  const colliderBlocked = !observed.has("W") && !observed.has("Sl");

  const dSeparated = forkBlocked && colliderBlocked;

  return { forkBlocked, colliderBlocked, dSeparated };
}

function arrowMarker(color: string, id: string) {
  return (
    <marker
      key={id}
      id={id}
      markerWidth="8"
      markerHeight="8"
      refX="6"
      refY="3"
      orient="auto"
    >
      <path d="M0,0 L0,6 L8,3 z" fill={color} />
    </marker>
  );
}

function edgeCoords(from: NodeId, to: NodeId) {
  const f = NODES[from];
  const t = NODES[to];
  const dx = t.x - f.x;
  const dy = t.y - f.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: f.x + ux * R,
    y1: f.y + uy * R,
    x2: t.x - ux * (R + 6),
    y2: t.y - uy * (R + 6),
  };
}

// Which path each edge belongs to (edge key = "from-to")
const EDGE_PATHS: Record<string, "fork" | "collider"> = {
  "C-R": "fork",
  "C-S": "fork",
  "R-W": "collider",
  "S-W": "collider",
};

export function DSeparationViz({ className }: { className?: string }) {
  const [observed, setObserved] = useState<Set<NodeId>>(new Set());

  const toggle = (id: NodeId) => {
    setObserved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => setObserved(new Set());

  const { forkBlocked, colliderBlocked, dSeparated } = computePathStatus(observed);

  const forkColor  = forkBlocked    ? VIZ.teal : VIZ.rose;
  const collColor  = colliderBlocked ? VIZ.teal : VIZ.rose;
  const statusColor = dSeparated ? VIZ.teal : VIZ.rose;

  return (
    <VizFrame
      className={className}
      title="D-Separation in the Sprinkler Network"
      caption="Click nodes to condition on them (observe them). Rain and Sprinkler are the query pair (purple rings). Paths turn green when blocked, red when active. d-separation holds when all paths are blocked."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="D-separation sprinkler network">
        <defs>
          {arrowMarker(forkColor,  "arrow-fork")}
          {arrowMarker(collColor,  "arrow-coll")}
          {arrowMarker(VIZ.axis,   "arrow-none")}
        </defs>

        {/* Edges */}
        {EDGES.map(([from, to]) => {
          const key = `${from}-${to}`;
          const pathType = EDGE_PATHS[key];
          const color = pathType === "fork" ? forkColor : pathType === "collider" ? collColor : VIZ.axis;
          const markerId = pathType === "fork" ? "arrow-fork" : pathType === "collider" ? "arrow-coll" : "arrow-none";
          const coords = edgeCoords(from, to);
          return (
            <line
              key={key}
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
              stroke={color}
              strokeWidth={2}
              markerEnd={`url(#${markerId})`}
            />
          );
        })}

        {/* Nodes */}
        {(Object.entries(NODES) as [NodeId, { x: number; y: number; label: string }][]).map(([id, { x, y, label }]) => {
          const isObserved = observed.has(id);
          const isQuery = id === "R" || id === "S";
          return (
            <g
              key={id}
              onClick={() => toggle(id)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label={`Toggle ${label}`}
            >
              {/* Query ring */}
              {isQuery && (
                <circle
                  cx={x}
                  cy={y}
                  r={R + 7}
                  fill="none"
                  stroke={VIZ.brand}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              )}
              {/* Main node circle */}
              <circle
                cx={x}
                cy={y}
                r={R}
                fill={isObserved ? VIZ.grid : VIZ.card}
                stroke={isObserved ? "#ffffff" : VIZ.text}
                strokeWidth={isObserved ? 2.5 : 1.5}
              />
              {/* Node label */}
              <text
                x={x}
                y={y + R + 13}
                fill={VIZ.textBright}
                fontSize={10}
                textAnchor="middle"
                fontWeight={isObserved ? "600" : "400"}
              >
                {label}
              </text>
              {/* Short ID inside circle */}
              <text
                x={x}
                y={y + 4}
                fill={isObserved ? "#ffffff" : VIZ.text}
                fontSize={11}
                textAnchor="middle"
                fontWeight="600"
              >
                {id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Path status readout */}
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: forkColor }}
          />
          <span style={{ color: VIZ.text }}>
            Fork <span style={{ color: VIZ.textBright }}>R ← C → S</span>:{" "}
            <span style={{ color: forkColor }} className="font-semibold">
              {forkBlocked ? "blocked" : "open"}
            </span>{" "}
            <span style={{ color: VIZ.text }}>
              {forkBlocked ? "(C observed)" : "(C not observed)"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: collColor }}
          />
          <span style={{ color: VIZ.text }}>
            Collider <span style={{ color: VIZ.textBright }}>R → W ← S</span>:{" "}
            <span style={{ color: collColor }} className="font-semibold">
              {colliderBlocked ? "blocked" : "open"}
            </span>{" "}
            <span style={{ color: VIZ.text }}>
              {!colliderBlocked
                ? observed.has("W")
                  ? "(W observed — explaining away!)"
                  : "(Sl observed — descendant of W)"
                : "(W and Sl not observed)"}
            </span>
          </span>
        </div>
        <div
          className="mt-2 px-3 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: dSeparated ? "rgba(20,184,166,0.1)" : "rgba(244,63,94,0.1)",
            border: `1px solid ${statusColor}`,
            color: statusColor,
          }}
        >
          R ⊥ S | Z?{" "}
          {dSeparated ? "Yes — d-separated (independent)" : "No — d-connected (dependent)"}
        </div>
      </div>

      <div className="mt-3">
        <VizButton onClick={reset}>Reset</VizButton>
      </div>
    </VizFrame>
  );
}
