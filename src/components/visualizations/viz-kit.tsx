"use client";

/**
 * Shared primitives for all ML visualizations.
 *
 * Convention (no D3): every viz is a `"use client"` React component that draws
 * with plain SVG and animates with React state / requestAnimationFrame. Wrap
 * the output in <VizFrame> so all viz share the card-glass chrome, and reuse
 * <VizSlider> / <VizButton> for controls. Colours come from the `VIZ` token
 * map, which mirrors the Tailwind design tokens in tailwind.config.ts.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Design-token colours, duplicated here so D3-free SVG attrs can use them. */
export const VIZ = {
  brand: "#6366f1",
  brandLight: "#a5b4fc",
  teal: "#14b8a6",
  rose: "#f43f5e",
  yellow: "#eab308",
  orange: "#f97316",
  grid: "#2e3347",
  axis: "#475569",
  text: "#94a3b8",
  textBright: "#e2e8f0",
  card: "#1a1d27",
} as const;

/** Class colour cycle for multi-class / multi-cluster viz. */
export const CLASS_COLORS = [VIZ.brand, VIZ.teal, VIZ.orange, VIZ.rose, VIZ.yellow];

interface FrameProps {
  title?: string;
  caption?: string;
  children: React.ReactNode;
  className?: string;
}

/** Standard card wrapper — keeps every viz visually consistent inside lessons. */
export function VizFrame({ title, caption, children, className }: FrameProps) {
  return (
    <div className={cn("not-prose card-glass p-4 my-6", className)}>
      {title && (
        <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
      )}
      {children}
      {caption && <p className="text-xs text-slate-400 mt-3 leading-relaxed">{caption}</p>}
    </div>
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  className?: string;
}

export function VizButton({ children, onClick, active, className }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
        active
          ? "bg-brand-500 hover:bg-brand-600 text-white"
          : "bg-surface-elevated hover:bg-surface-border text-slate-200",
        className
      )}
    >
      {children}
    </button>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export function VizSlider({ label, min, max, step, value, onChange, format }: SliderProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-300">
      <div className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-white">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-500 cursor-pointer"
      />
    </label>
  );
}

/** Small labelled stat readout, e.g. "loss 0.041". */
export function VizStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-mono text-sm" style={{ color: color ?? VIZ.textBright }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Runs `cb` on every animation frame while `active` is true. `cb` receives the
 * delta-time in seconds. Cleans up on unmount or when `active` flips to false.
 */
export function useAnimationLoop(cb: (dt: number) => void, active: boolean) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      cbRef.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/** Deterministic seeded PRNG (mulberry32) — so viz look identical on every render. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal sample from a uniform RNG. */
export function gaussian(rng: () => number, mean = 0, sd = 1) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Linear scale factory: maps a value in [d0,d1] to pixels in [r0,r1]. */
export function scale(d0: number, d1: number, r0: number, r1: number) {
  return (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}
