"use client";

/**
 * Interactive gradient descent visualization on a 2D loss surface.
 * User can adjust learning rate and watch the optimizer step.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

// Simple bowl-shaped loss: L(w) = w^2 + 0.5*(optimum offset)
function loss(x: number, y: number): number {
  return 0.4 * x * x + 0.9 * y * y + 0.1 * x * y;
}

export function GradientDescentViz({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lr, setLr] = useState(0.2);
  const [position, setPosition] = useState({ x: 3.5, y: 3.0 });
  const [history, setHistory] = useState<{ x: number; y: number }[]>([]);
  const [running, setRunning] = useState(false);

  const step = useCallback(() => {
    setPosition((prev) => {
      const dx = 0.8 * prev.x + 0.1 * prev.y;
      const dy = 1.8 * prev.y + 0.1 * prev.x;
      const nx = prev.x - lr * dx;
      const ny = prev.y - lr * dy;
      setHistory((h) => [...h, { x: nx, y: ny }]);
      return { x: nx, y: ny };
    });
  }, [lr]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, 300);
    return () => clearInterval(id);
  }, [running, step]);

  function reset() {
    setRunning(false);
    setPosition({ x: 3.5, y: 3.0 });
    setHistory([]);
  }

  // D3 render
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const W = svgRef.current?.clientWidth ?? 500;
    const H = 340;
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };
    const pw = W - margin.left - margin.right;
    const ph = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear([-5, 5], [0, pw]);
    const yScale = d3.scaleLinear([-5, 5], [ph, 0]);

    // Contour background
    const n = 60;
    const vals: number[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const wx = -5 + (10 * i) / (n - 1);
        const wy = -5 + (10 * j) / (n - 1);
        vals.push(loss(wx, wy));
      }
    }

    const contour = d3.contours().size([n, n]).thresholds(12)(vals);
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, d3.max(vals) ?? 1]);

    contour.forEach((c) => {
      g.append("path")
        .datum(c)
        .attr("fill", colorScale(c.value))
        .attr("fill-opacity", 0.6)
        .attr(
          "d",
          d3.geoPath(
            d3.geoTransform({
              point(x, y) {
                // map contour coords (0..n) to data space (-5..5)
                const wx = -5 + (10 * x) / n;
                const wy = -5 + (10 * y) / n;
                this.stream.point(xScale(wx), yScale(wy));
              },
            })
          )
        );
    });

    // History path
    const allPts = [{ x: 3.5, y: 3.0 }, ...history, position];
    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    g.append("path")
      .datum(allPts)
      .attr("fill", "none")
      .attr("stroke", "#818cf8")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2")
      .attr("d", line);

    // Current position
    g.append("circle")
      .attr("cx", xScale(position.x))
      .attr("cy", yScale(position.y))
      .attr("r", 7)
      .attr("fill", "#818cf8")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Minimum marker
    g.append("circle")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", 5)
      .attr("fill", "#14b8a6")
      .attr("stroke", "white")
      .attr("stroke-width", 2);
  }, [position, history]);

  return (
    <div className={cn("not-prose card-glass p-4 my-6", className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">Gradient Descent on 2D Loss Surface</p>
        <span className="text-xs text-slate-400 font-mono">
          L = {loss(position.x, position.y).toFixed(4)}
        </span>
      </div>

      <svg ref={svgRef} className="w-full" style={{ height: 340 }} />

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <label>Learning rate: <span className="text-white font-mono">{lr.toFixed(2)}</span></label>
          <input
            type="range" min={0.01} max={0.5} step={0.01}
            value={lr}
            onChange={(e) => { reset(); setLr(parseFloat(e.target.value)); }}
            className="w-28 accent-brand-500"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
          >
            {running ? "Pause" : "Run"}
          </button>
          <button
            onClick={reset}
            className="px-4 py-1.5 rounded-lg border border-surface-border hover:border-slate-400 text-slate-300 text-sm font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
