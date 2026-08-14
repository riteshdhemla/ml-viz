"use client";

/**
 * What a projection query actually reads off disk under a row-major and a
 * column-major layout — the lesson's "2% read" worked example, made
 * manipulable and measured rather than quoted.
 *
 * Two things are on screen and they are independent, which is the point the
 * lesson's single 50x figure hides:
 *
 * 1. **Locality.** Disk is read in blocks, not cells. Under row-major the cells
 *    of any one column are strided across every block, so projecting 2 of 8
 *    columns still touches 100% of blocks — at every block size tried (8, 32,
 *    128, 512 cells). Under column-major the same query touches ~25%, i.e. the
 *    fraction of columns asked for. Read amplification is bytes-read over
 *    bytes-needed: 4.0x for row-major, ~1.0x for column-major.
 *
 * 2. **Compressibility**, which only column-major can exploit, because RLE and
 *    dictionary encoding need neighbours drawn from the same domain. Each
 *    column is encoded here the way Parquet really does it — best of plain,
 *    dictionary + bit-packing, and dictionary + RLE — on a 5000-row synthetic
 *    events table. The measured per-column ratios span **1.0x (price: random
 *    floats, nothing to exploit) to 31.2x (device: four values in an 8-byte
 *    string)**, with the whole table at 2.88x.
 *
 * The consequence is worth more than the lesson's headline number: the win is
 * not a property of the format, it is the product of how many columns you
 * project and how compressible *those particular* columns are. On the same
 * file, projecting ts+user_id reads 6.7x less than the row store; projecting
 * event+ab_bucket reads 85x less. Quoting "10x–30x" as a property of Parquet
 * skips the part the reader can act on.
 *
 * The ribbon draws 16 rows so the byte order is legible; every byte figure
 * comes from the full 5000-row table and the caption says so.
 */

import { useMemo, useState } from "react";
import { VIZ, VizButton, VizFrame, VizSlider, VizStat, seededRandom } from "../viz-kit";

interface ColSpec {
  name: string;
  width: number;
  kind: "clock" | "id" | "runid" | "enum" | "float";
  levels?: number;
}

/** A plausible events table; widths in bytes. */
const SCHEMA: ColSpec[] = [
  { name: "ts", width: 8, kind: "clock" },
  { name: "user_id", width: 8, kind: "id" },
  { name: "session", width: 8, kind: "runid" },
  { name: "event", width: 12, kind: "enum", levels: 9 },
  { name: "country", width: 2, kind: "enum", levels: 14 },
  { name: "device", width: 8, kind: "enum", levels: 4 },
  { name: "ab_bucket", width: 1, kind: "enum", levels: 2 },
  { name: "price", width: 8, kind: "float" },
];
const NCOL = SCHEMA.length;

const FULL_ROWS = 5000; // the table the byte figures are measured on
const RIBBON_ROWS = 16; // the table the ribbon draws

/** Sessions of 3–14 events, one user per session — the structure that makes
 *  user_id and session compressible and price not. */
function generate(rows: number) {
  const rng = seededRandom(17);
  const cols: number[][] = SCHEMA.map(() => new Array(rows));
  let clock = 1_700_000_000;
  let session = 900_000;
  let left = 0;
  let user = 0;
  for (let r = 0; r < rows; r++) {
    clock += Math.floor(rng() * 3);
    if (left === 0) {
      left = 3 + Math.floor(rng() * 12);
      session++;
      user = 10_000 + Math.floor(rng() * 40_000);
    }
    left--;
    SCHEMA.forEach((c, j) => {
      cols[j][r] =
        c.kind === "clock"
          ? clock
          : c.kind === "id"
            ? user
            : c.kind === "runid"
              ? session
              : c.kind === "enum"
                ? Math.floor(rng() * c.levels!)
                : Math.round(rng() * 20000) / 100;
    });
  }
  return cols;
}

/** Best of plain, dictionary + bit-packing, dictionary + RLE. */
function encodeColumn(values: number[], width: number) {
  const dict = new Map<number, number>();
  let runs = 0;
  let prev = NaN;
  for (const v of values) {
    if (!dict.has(v)) dict.set(v, dict.size);
    if (v !== prev) {
      runs++;
      prev = v;
    }
  }
  const n = values.length;
  const d = dict.size;
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, d))));
  const plain = n * width;
  const bitpack = d * width + Math.ceil((n * bits) / 8);
  const rle = d * width + runs * (Math.ceil(bits / 8) + 2);
  const bytes = Math.min(plain, bitpack, rle);
  return {
    bytes,
    plain,
    how: bytes === plain ? "plain" : bytes === bitpack ? "dict+bitpack" : "dict+RLE",
    distinct: d,
  };
}

const ENCODED = (() => {
  const cols = generate(FULL_ROWS);
  return SCHEMA.map((c, j) => encodeColumn(cols[j], c.width));
})();
const RAW_TOTAL = SCHEMA.reduce((a, c) => a + c.width * FULL_ROWS, 0);
const COL_TOTAL = ENCODED.reduce((a, e) => a + e.bytes, 0);

const kib = (b: number) => `${(b / 1024).toFixed(1)} KiB`;

const W = 560;
const PER_LINE = 32;
const CELL = 15.5;
const LINES = Math.ceil((RIBBON_ROWS * NCOL) / PER_LINE);
const GUTTER = 16;

type CellState = "needed" | "wasted" | "skipped";
const CELL_FILL: Record<CellState, string> = {
  needed: VIZ.teal,
  wasted: "#4a4f68",
  skipped: "#1c1f2b",
};

function Ribbon({
  layout,
  need,
  blockCells,
  y0,
}: {
  layout: "row" | "col";
  need: Set<number>;
  blockCells: number;
  y0: number;
}) {
  const total = RIBBON_ROWS * NCOL;
  const colOf = (i: number) => (layout === "row" ? i % NCOL : Math.floor(i / RIBBON_ROWS));

  // a block is fetched if any cell in it belongs to a projected column
  const fetched = new Set<number>();
  for (let i = 0; i < total; i++) if (need.has(colOf(i))) fetched.add(Math.floor(i / blockCells));

  const cells = [];
  for (let i = 0; i < total; i++) {
    const line = Math.floor(i / PER_LINE);
    const pos = i % PER_LINE;
    const state: CellState = need.has(colOf(i))
      ? "needed"
      : fetched.has(Math.floor(i / blockCells))
        ? "wasted"
        : "skipped";
    cells.push(
      <rect
        key={i}
        x={GUTTER + pos * CELL + 0.7}
        y={y0 + line * (CELL + 3)}
        width={CELL - 1.4}
        height={CELL - 3}
        rx={1.5}
        fill={CELL_FILL[state]}
      />
    );
  }

  // block boundaries, so "read in blocks, not cells" is visible
  const marks = [];
  for (let b = blockCells; b < total; b += blockCells) {
    const line = Math.floor(b / PER_LINE);
    const pos = b % PER_LINE;
    if (pos === 0) continue;
    marks.push(
      <line
        key={b}
        x1={GUTTER + pos * CELL}
        x2={GUTTER + pos * CELL}
        y1={y0 + line * (CELL + 3) - 1}
        y2={y0 + line * (CELL + 3) + CELL - 2}
        stroke={VIZ.textBright}
        strokeWidth={1}
        opacity={0.45}
      />
    );
  }

  return (
    <g>
      {cells}
      {marks}
    </g>
  );
}

export function StorageLayoutViz({ className }: { className?: string }) {
  const [need, setNeed] = useState<Set<number>>(new Set([0, 1]));
  const [blockCells, setBlockCells] = useState(8);

  const toggle = (j: number) => {
    const next = new Set(need);
    if (next.has(j)) next.delete(j);
    else next.add(j);
    if (next.size > 0) setNeed(next);
  };

  const stats = useMemo(() => {
    const total = RIBBON_ROWS * NCOL;
    const blocks = Math.ceil(total / blockCells);
    const touched = (layout: "row" | "col") => {
      const colOf = (i: number) => (layout === "row" ? i % NCOL : Math.floor(i / RIBBON_ROWS));
      const s = new Set<number>();
      for (let i = 0; i < total; i++) if (need.has(colOf(i))) s.add(Math.floor(i / blockCells));
      return s.size;
    };
    // bytes on the full table
    const rowBytes = RAW_TOTAL; // row store must read every field of every row
    const colBytes = [...need].reduce((a, j) => a + ENCODED[j].bytes, 0);
    const neededRaw = [...need].reduce((a, j) => a + SCHEMA[j].width * FULL_ROWS, 0);
    return {
      blocks,
      rowBlocks: touched("row"),
      colBlocks: touched("col"),
      rowBytes,
      colBytes,
      neededRaw,
    };
  }, [need, blockCells]);

  const H = 30 + LINES * (CELL + 3) + 34 + LINES * (CELL + 3) + 10;

  return (
    <VizFrame
      title="The same query, two layouts"
      caption="The ribbon is disk in byte order: 16 rows × 8 columns laid out row-major (CSV, Avro, a Postgres heap file) then column-major (Parquet, ORC). Teal is a cell the query asked for; grey is a cell dragged in because it shares a block with one; dark is skipped. White ticks are block boundaries. The byte figures below are measured on the full 5000-row table, each column encoded the way Parquet does it — best of plain, dictionary + bit-packing, dictionary + RLE."
      className={className}
    >
      <p className="text-xs text-slate-400 mb-2">
        Columns this query projects{" "}
        <span className="text-slate-500">
          — whole table: {kib(RAW_TOTAL)} raw, {kib(COL_TOTAL)} columnar (
          {(RAW_TOTAL / COL_TOTAL).toFixed(2)}×)
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {SCHEMA.map((c, j) => (
          <VizButton key={c.name} active={need.has(j)} onClick={() => toggle(j)}>
            {c.name}
          </VizButton>
        ))}
      </div>

      {/* per-column compressibility — where the "10x-30x" actually comes from */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-3 mt-3">
        {SCHEMA.map((c, j) => {
          const e = ENCODED[j];
          const ratio = e.plain / e.bytes;
          return (
            <div
              key={c.name}
              className="rounded border border-surface-border px-1.5 py-1"
              style={{ opacity: need.has(j) ? 1 : 0.42 }}
            >
              <div className="text-[9px] text-slate-500 truncate">{c.name}</div>
              <div
                className="font-mono text-[11px]"
                style={{ color: ratio > 3 ? VIZ.teal : ratio > 1.15 ? VIZ.yellow : VIZ.rose }}
              >
                {ratio.toFixed(1)}×
              </div>
              <div className="text-[8px] text-slate-500 truncate">{e.how}</div>
            </div>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <text x={GUTTER} y={12} fontSize={10} fill={VIZ.textBright}>
          row-major — one row&apos;s fields side by side
        </text>
        <Ribbon layout="row" need={need} blockCells={blockCells} y0={20} />
        <text x={GUTTER} y={30 + LINES * (CELL + 3) + 14} fontSize={10} fill={VIZ.textBright}>
          column-major — one column&apos;s values side by side
        </text>
        <Ribbon
          layout="col"
          need={need}
          blockCells={blockCells}
          y0={30 + LINES * (CELL + 3) + 22}
        />
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
        <VizStat
          label="blocks fetched — row-major"
          value={`${stats.rowBlocks} of ${stats.blocks}`}
          color={VIZ.rose}
        />
        <VizStat
          label="blocks fetched — column-major"
          value={`${stats.colBlocks} of ${stats.blocks}`}
          color={VIZ.teal}
        />
        <VizStat label="bytes read — row-major" value={kib(stats.rowBytes)} color={VIZ.rose} />
        <VizStat label="bytes read — column-major" value={kib(stats.colBytes)} color={VIZ.teal} />
        <VizStat
          label="column-major reads"
          value={`${(stats.rowBytes / stats.colBytes).toFixed(1)}× less`}
          color={VIZ.textBright}
        />
      </div>

      <div className="mt-4 w-64">
        <VizSlider
          label="block size (cells per disk read)"
          min={4}
          max={32}
          step={4}
          value={blockCells}
          onChange={(v) => setBlockCells(Math.round(v))}
          format={(v) => String(v)}
        />
      </div>
    </VizFrame>
  );
}
