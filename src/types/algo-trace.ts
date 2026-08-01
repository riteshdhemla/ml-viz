/**
 * Types for **algorithm traces** — the algo-viz-style "step through the code"
 * explainer used on algorithm-heavy wiki pages and lessons.
 *
 * The idea (borrowed from the sibling algo-viz project): an algorithm is far
 * easier to grasp when you can *watch it run* — press step, see the source line
 * that is executing light up, and see the data structures it touches change on
 * the same screen. A trace is therefore a list of frames; each frame says
 *   1. which source line(s) are executing (`l`),
 *   2. what just happened, in one plain sentence (`d`),
 *   3. what the state looks like right now (`c` — the rendered components).
 *
 * Traces are **precomputed and deterministic**: the builder in
 * `src/lib/algo-traces/*` runs the real algorithm once at module load and
 * records frames, so what the reader steps through is genuine algorithm output,
 * not a hand-written storyboard.
 */

/** Semantic highlight for a cell/chip/row. */
export type TraceCls =
  /** currently being examined */
  | "active"
  /** chosen / accepted / final answer */
  | "good"
  /** rejected / pruned / discarded */
  | "bad"
  /** candidate under consideration */
  | "warn"
  /** already settled, de-emphasised */
  | "dim";

export interface TraceChip {
  k: string;
  v?: string;
  cls?: TraceCls;
}

/** One renderable piece of algorithm state. */
export type TraceComponent =
  /** A row of symbols — token sequences, merged subwords, a sentence. */
  | {
      t: "tokens";
      label: string;
      v: { text: string; sub?: string; cls?: TraceCls }[];
      /** Separator drawn between chips (default: none). */
      sep?: string;
    }
  /** Key → value chips: counts, dictionaries, per-term stats. */
  | { t: "kv"; label: string; v: TraceChip[]; sep?: string }
  /** Horizontal bars — scores, frequencies, contributions. */
  | {
      t: "bars";
      label: string;
      v: { k: string; val: number; show?: string; cls?: TraceCls }[];
      /** Fixed axis maximum; defaults to the largest value present. */
      max?: number;
    }
  /** A numeric matrix with row/column headers; `cls` is keyed `"i,j"`. */
  | {
      t: "matrix";
      label: string;
      rows: string[];
      cols: string[];
      v: number[][];
      cls?: Record<string, TraceCls>;
      /** Shade cells by magnitude (for attention weights). */
      heat?: boolean;
      digits?: number;
    }
  /** A plain table — ranked results, per-document scores. */
  | { t: "table"; label: string; head: string[]; v: { cells: string[]; cls?: TraceCls }[] }
  /** A layered proximity graph (HNSW layers, skip-list express lanes). */
  | {
      t: "graph";
      label: string;
      levels: {
        name: string;
        /** `x` is a 0–1 position along the layer. */
        nodes: { id: string; x: number; cls?: TraceCls }[];
        edges: [string, string][];
      }[];
      /** Node id to mark with a "descend to next layer" arrow. */
      drop?: string;
    }
  /**
   * A 2-D plot — scatter points, function curves, boundaries and radii.
   * One renderer covers clustering scatters, decision boundaries, tangent
   * lines and sampled densities. `domain` is fixed by the builder so the view
   * never jumps between frames.
   */
  | {
      t: "plot";
      label: string;
      /** [xMin, xMax, yMin, yMax] — fixed across all frames of a trace. */
      domain: [number, number, number, number];
      curves?: { pts: { x: number; y: number }[]; cls?: TraceCls; dashed?: boolean }[];
      points?: {
        x: number;
        y: number;
        id?: string;
        cls?: TraceCls;
        shape?: "dot" | "cross" | "ring";
      }[];
      segments?: { x1: number; y1: number; x2: number; y2: number; cls?: TraceCls; dashed?: boolean }[];
      /** Radii in data units — e.g. a DBSCAN ε-neighbourhood. */
      circles?: { x: number; y: number; r: number; cls?: TraceCls }[];
      xLabel?: string;
      yLabel?: string;
    }
  /** A free-text aside shown inside the state panel. */
  | { t: "note"; text: string; cls?: TraceCls };

/** A single step of execution. */
export interface TraceFrame {
  /** What happened at this step, in one sentence. */
  d: string;
  /** 1-based source line(s) executing at this step. */
  l?: number[];
  /** The state to render. */
  c: TraceComponent[];
}

/** A complete, steppable algorithm run. */
export interface AlgoTrace {
  /** Unique id across the site — referenced from MDX as `<AlgorithmTrace id="..." />`. */
  id: string;
  title: string;
  /** Shown under the player; explain what to watch for. */
  caption: string;
  /** Source lines, 1-based when indexed for `TraceFrame.l`. */
  code: string[];
  lang?: string;
  frames: TraceFrame[];
}
