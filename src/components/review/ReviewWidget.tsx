"use client";

/**
 * ReviewWidget — a dev-only, in-page content-review capture tool.
 *
 * Renders ONLY under `npm run dev` (`process.env.NODE_ENV === "development"`),
 * so it is dead-code-eliminated from the Vercel and GitHub Pages builds and
 * never reaches a real visitor. While reading any lesson / case / wiki page you
 * highlight a passage, press Alt+R (or click the ✎ button), tag it, and the note
 * is POSTed to the standalone logging server (`npm run review:log`), which
 * appends it to content-review/review-log.jsonl. Claude then reads that log and
 * applies the fixes per source file.
 *
 * Mounted once in the root layout; self-gates, so mounting it is a no-op in prod.
 */

import { useCallback, useEffect, useState } from "react";

const LOG_ENDPOINT =
  process.env.NEXT_PUBLIC_REVIEW_LOG_ENDPOINT || "http://localhost:5174/log";

const CATEGORIES = [
  { id: "incorrect", label: "Incorrect", hint: "factual / technical error" },
  { id: "unclear", label: "Unclear", hint: "confusing or ambiguous" },
  { id: "missing", label: "Missing", hint: "should add example / detail" },
  { id: "typo", label: "Typo", hint: "spelling / grammar / formatting" },
  { id: "style", label: "Style", hint: "tone / phrasing / structure" },
  { id: "other", label: "Other", hint: "anything else" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

/** Map a site pathname to its likely source MDX file (best-effort). */
function guessSourceFile(pathname: string): string {
  // Strip a GitHub-Pages basePath prefix and any trailing slash.
  const clean = pathname.replace(/^\/ml-viz/, "").replace(/\/$/, "");
  const sd = clean.match(/^\/system-design\/([^/]+)$/);
  if (sd) return `src/content/system-design/${sd[1]}.mdx`;
  const wiki = clean.match(/^\/wiki\/([^/]+)$/);
  if (wiki) return `src/content/wiki/${wiki[1]}.mdx`;
  const lesson = clean.match(/^\/courses\/([^/]+)\/([^/]+)$/);
  if (lesson) return `src/content/courses/${lesson[1]}/${lesson[2]}.mdx`;
  const course = clean.match(/^\/courses\/([^/]+)$/);
  if (course) return `src/content/courses/${course[1]}/index.mdx`;
  return "";
}

function pageTitle(): string {
  return (typeof document !== "undefined" ? document.title : "").replace(/\s*\|\s*ML Viz\s*$/, "");
}

export function ReviewWidget() {
  // Belt-and-suspenders: also gate at render so nothing shows in prod even if mounted.
  const isDev = process.env.NODE_ENV === "development";

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId>("incorrect");
  const [note, setNote] = useState("");
  const [selection, setSelection] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" | "sending" } | { kind: "ok"; count: number } | { kind: "error"; msg: string }
  >({ kind: "idle" });

  const openWithSelection = useCallback(() => {
    const sel = typeof window !== "undefined" ? window.getSelection()?.toString().trim() ?? "" : "";
    setSelection(sel);
    setStatus({ kind: "idle" });
    setOpen(true);
  }, []);

  // Alt+R toggles the panel (and snapshots any current highlight).
  useEffect(() => {
    if (!isDev) return;
    function onKey(e: KeyboardEvent) {
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setOpen((o) => {
          if (o) return false;
          const sel = window.getSelection()?.toString().trim() ?? "";
          setSelection(sel);
          setStatus({ kind: "idle" });
          return true;
        });
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDev]);

  if (!isDev) return null;

  async function submit() {
    if (!note.trim()) {
      setStatus({ kind: "error", msg: "Add a note first." });
      return;
    }
    const entry = {
      path: window.location.pathname,
      title: pageTitle(),
      file: guessSourceFile(window.location.pathname),
      category,
      selection,
      note: note.trim(),
    };
    setStatus({ kind: "sending" });
    try {
      const res = await fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus({ kind: "ok", count: data.count });
      setNote("");
      setSelection("");
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      // Never lose the note if the log server isn't running — echo it to the console.
      // eslint-disable-next-line no-console
      console.warn("[review] log server unreachable; entry follows:\n", JSON.stringify(entry, null, 2));
      setStatus({
        kind: "error",
        msg: "Log server not reachable — run `npm run review:log`. Note copied to console.",
      });
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {open ? (
        <div className="w-80 rounded-xl border border-brand-500/40 bg-surface-card p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">
              Content review
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <p className="mb-2 truncate text-xs text-slate-400" title={guessSourceFile(location.pathname) || location.pathname}>
            {guessSourceFile(location.pathname) || location.pathname || "—"}
          </p>

          {selection ? (
            <p className="mb-2 max-h-20 overflow-auto rounded border border-surface-border bg-surface px-2 py-1 text-xs italic text-slate-300">
              “{selection.length > 240 ? selection.slice(0, 240) + "…" : selection}”
            </p>
          ) : (
            <p className="mb-2 text-[11px] text-slate-500">
              Tip: highlight text on the page before opening to attach the passage.
            </p>
          )}

          <div className="mb-2 flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                title={c.hint}
                onClick={() => setCategory(c.id)}
                className={
                  "rounded-full px-2 py-0.5 text-[11px] transition-colors " +
                  (category === c.id
                    ? "bg-brand-500 text-white"
                    : "bg-surface text-slate-300 hover:bg-surface-elevated")
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            placeholder="What's wrong / what to improve…"
            rows={3}
            className="mb-2 w-full resize-y rounded-md border border-surface-border bg-surface px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-brand-500"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">⌘/Ctrl + Enter</span>
            <button
              onClick={submit}
              disabled={status.kind === "sending"}
              className="rounded-md bg-brand-500 px-3 py-1 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {status.kind === "sending" ? "Logging…" : "Log note"}
            </button>
          </div>

          {status.kind === "ok" && (
            <p className="mt-2 text-xs text-accent-teal">Logged ✓ ({status.count} total)</p>
          )}
          {status.kind === "error" && (
            <p className="mt-2 text-xs text-accent-rose">{status.msg}</p>
          )}
        </div>
      ) : (
        <button
          onClick={openWithSelection}
          title="Log a content-review note (Alt+R)"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-500/40 bg-surface-card text-lg text-brand-400 shadow-lg transition-colors hover:bg-surface-elevated hover:text-brand-300"
          aria-label="Open content review"
        >
          ✎
        </button>
      )}
    </div>
  );
}
