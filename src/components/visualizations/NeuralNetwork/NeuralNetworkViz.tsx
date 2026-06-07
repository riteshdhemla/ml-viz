"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

interface LayerConfig {
  units: number;
  label?: string;
}

interface Props {
  layers?: LayerConfig[];
  className?: string;
  animated?: boolean;
}

const DEFAULT_LAYERS: LayerConfig[] = [
  { units: 3, label: "Input" },
  { units: 4, label: "Hidden" },
  { units: 4, label: "Hidden" },
  { units: 2, label: "Output" },
];

export function NeuralNetworkViz({
  layers = DEFAULT_LAYERS,
  className,
  animated = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activations, setActivations] = useState<number[][]>(() =>
    layers.map((l) => Array(l.units).fill(0.5))
  );

  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setActivations(layers.map((l) => Array(l.units).fill(0).map(() => Math.random())));
    }, 1800);
    return () => clearInterval(interval);
  }, [layers, animated]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth ?? 600;
    const height = 320;
    const nodeR = 18;
    const layerGap = width / (layers.length + 1);

    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const positions = layers.map((layer, li) => {
      const x = layerGap * (li + 1);
      const totalH = layer.units * (nodeR * 2 + 12) - 12;
      const startY = (height - totalH) / 2;
      return Array(layer.units)
        .fill(0)
        .map((_, ni) => ({ x, y: startY + ni * (nodeR * 2 + 12) + nodeR }));
    });

    // Draw edges
    for (let li = 0; li < layers.length - 1; li++) {
      const from = positions[li];
      const to = positions[li + 1];
      from.forEach((f) => {
        to.forEach((t) => {
          svg
            .append("line")
            .attr("x1", f.x)
            .attr("y1", f.y)
            .attr("x2", t.x)
            .attr("y2", t.y)
            .attr("stroke", "#2e3347")
            .attr("stroke-width", 1.5);
        });
      });
    }

    // Draw nodes
    positions.forEach((layerPos, li) => {
      layerPos.forEach((pos, ni) => {
        const activation = activations[li]?.[ni] ?? 0.5;
        const color = d3.interpolate("#312e81", "#818cf8")(activation);
        svg
          .append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeR)
          .attr("fill", color)
          .attr("stroke", "#4f46e5")
          .attr("stroke-width", 1.5);
      });
    });

    // Layer labels
    layers.forEach((layer, li) => {
      if (!layer.label) return;
      svg
        .append("text")
        .attr("x", layerGap * (li + 1))
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .attr("font-size", 11)
        .text(layer.label);
    });
  }, [layers, activations]);

  return (
    <div className={cn("not-prose card-glass p-4 my-6", className)}>
      <p className="text-xs text-slate-500 mb-3">Neural Network</p>
      <svg ref={svgRef} className="w-full" style={{ height: 320 }} />
    </div>
  );
}
