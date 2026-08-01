import type { AlgoTrace, TraceFrame } from "@/types/algo-trace";

/**
 * Shared helpers for trace builders.
 *
 * The golden rule for every builder in this folder: **run the real algorithm
 * and record what it does**. Never hand-write the numbers a step produces — if
 * the trace and the prose disagree, the reader learns the wrong thing.
 */

/**
 * Returns a `ln(...)` helper that maps code *fragments* to 1-based line
 * numbers, so frames never hard-code line indices that silently rot when the
 * listing is edited.
 */
export function lineFinder(code: string[]) {
  return (...fragments: string[]): number[] =>
    fragments.map((fragment) => {
      const idx = code.findIndex((line) => line.includes(fragment));
      if (idx < 0) {
        throw new Error(`algo-trace: no code line contains ${JSON.stringify(fragment)}`);
      }
      return idx + 1;
    });
}

/** Small accumulator so builders read as `push(desc, lines, ...components)`. */
export function frameBuilder() {
  const frames: TraceFrame[] = [];
  const push = (d: string, l: number[], ...c: TraceFrame["c"]) => {
    frames.push({ d, l, c });
  };
  return { frames, push };
}

/** Split a template-literal source block into the `code` array of a trace. */
export function codeLines(src: string): string[] {
  return src.replace(/^\n/, "").replace(/\n$/, "").split("\n");
}

/**
 * Deterministic PRNG (mulberry32) for traces of randomized algorithms.
 *
 * Duplicated from `viz-kit.tsx` rather than imported: viz-kit is a `"use client"`
 * module, and trace builders must stay importable from plain Node (the
 * integrity tests build every trace outside React).
 */
export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller normal draw from a uniform RNG. */
export function gaussian(rng: () => number, mean = 0, sd = 1) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Sanity check applied to every registered trace (also asserted in tests). */
export function validateTrace(trace: AlgoTrace): string[] {
  const errors: string[] = [];
  if (trace.frames.length === 0) errors.push(`${trace.id}: has no frames`);
  trace.frames.forEach((frame, i) => {
    if (!frame.d.trim()) errors.push(`${trace.id}: frame ${i} has an empty description`);
    for (const line of frame.l ?? []) {
      if (line < 1 || line > trace.code.length) {
        errors.push(`${trace.id}: frame ${i} points at line ${line}, out of 1..${trace.code.length}`);
      }
    }
    if (frame.c.length === 0) errors.push(`${trace.id}: frame ${i} renders no state`);
  });
  return errors;
}
