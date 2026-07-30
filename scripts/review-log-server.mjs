#!/usr/bin/env node
/**
 * Local content-review logging server (dev-only, standalone).
 *
 * Deliberately NOT a Next.js API route: a POST route handler would break the
 * GitHub Pages static export (`output: "export"`). Keeping the sink as its own
 * tiny process means the Next build never sees it, and nothing ships to prod.
 *
 * The in-page <ReviewWidget> (rendered only under `npm run dev`) POSTs review
 * notes here; each is appended as one JSON line to content-review/review-log.jsonl.
 * Claude then reads that file, applies fixes per source file, and archives the
 * processed entries.
 *
 *   node scripts/review-log-server.mjs         # or: npm run review:log
 *
 * Env: REVIEW_LOG_PORT (default 5174), REVIEW_LOG_FILE (default the path below).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.REVIEW_LOG_PORT) || 5174;
const LOG_FILE =
  process.env.REVIEW_LOG_FILE || path.join(ROOT, "content-review", "review-log.jsonl");

const CATEGORIES = new Set([
  "typo",
  "unclear",
  "incorrect",
  "missing",
  "style",
  "other",
]);

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function countEntries() {
  try {
    return fs
      .readFileSync(LOG_FILE, "utf8")
      .split("\n")
      .filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

/** Only accept requests from a local dev origin. */
function isLocalOrigin(origin) {
  if (!origin) return true; // non-browser / same-process callers
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function cors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", isLocalOrigin(origin) ? origin || "*" : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  cors(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, file: LOG_FILE, count: countEntries() });
  }

  if (req.method !== "POST" || url.pathname !== "/log") {
    return json(res, 404, { ok: false, error: "not found" });
  }

  if (!isLocalOrigin(origin)) {
    return json(res, 403, { ok: false, error: "non-local origin rejected" });
  }

  let raw = "";
  req.on("data", (c) => {
    raw += c;
    if (raw.length > 1_000_000) req.destroy(); // 1 MB guard
  });
  req.on("end", () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { ok: false, error: "invalid JSON" });
    }
    if (!body || typeof body.note !== "string" || !body.note.trim()) {
      return json(res, 400, { ok: false, error: "note is required" });
    }

    const entry = {
      ts: new Date().toISOString(),
      path: typeof body.path === "string" ? body.path : "",
      title: typeof body.title === "string" ? body.title : "",
      file: typeof body.file === "string" ? body.file : "",
      category: CATEGORIES.has(body.category) ? body.category : "other",
      selection:
        typeof body.selection === "string" ? body.selection.slice(0, 2000) : "",
      note: body.note.trim().slice(0, 4000),
      status: "open",
    };

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
    } catch (err) {
      return json(res, 500, { ok: false, error: String(err) });
    }

    const count = countEntries();
    // Echo to the terminal so the reviewer sees confirmation while browsing.
    console.log(
      `📝 [${entry.category}] ${entry.file || entry.path} — ${entry.note.slice(0, 80)}${
        entry.note.length > 80 ? "…" : ""
      }  (${count} total)`
    );
    return json(res, 200, { ok: true, count });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n📋 Content-review log server`);
  console.log(`   listening  http://localhost:${PORT}`);
  console.log(`   writing to ${path.relative(ROOT, LOG_FILE)}`);
  console.log(`   ${countEntries()} entries so far`);
  console.log(`   run \`npm run dev\` in another terminal, then browse and review.\n`);
});
