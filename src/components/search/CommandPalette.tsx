"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, BookMarked, FileText, X } from "lucide-react";
import { useSearchStore } from "@/lib/search-store";
import { cn } from "@/lib/utils";
import type { SearchItem } from "@/types/search";

/**
 * Scores an item against a query. Higher is better; 0 means no match.
 * Word-prefix and substring matches on title rank above description hits.
 */
function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;

  const title = item.title.toLowerCase();
  const description = item.description.toLowerCase();
  const courseTitle = item.courseTitle.toLowerCase();

  let score = 0;
  if (title.startsWith(q)) score += 100;
  else if (title.split(/\s+/).some((w) => w.startsWith(q))) score += 60;
  else if (title.includes(q)) score += 40;

  if (courseTitle.includes(q)) score += 15;
  if (description.includes(q)) score += 10;

  // Multi-word queries: every word must hit somewhere.
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const haystack = `${title} ${courseTitle} ${description}`;
    if (words.every((w) => haystack.includes(w))) score += 30;
    else return 0;
  }

  if (score > 0 && item.kind === "course") score += 5;
  return score;
}

export function CommandPalette({ items }: { items: SearchItem[] }) {
  const { open, setOpen } = useSearchStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const scored = items
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((r) => r.item);
  }, [items, query]);

  // Global Cmd/Ctrl+K shortcut.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!useSearchStore.getState().open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  // Reset and focus when opened.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus after the dialog renders.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const select = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router, setOpen]
  );

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Keep the active row visible while arrowing through results.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search lessons and courses"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl rounded-xl border border-surface-border bg-surface-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-surface-border">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search courses, lessons, wiki…"
            className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            aria-label="Search"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-white transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No results for “{query}”
          </p>
        ) : (
          <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
            {results.map((item, i) => (
              <li key={item.href} data-index={i}>
                <button
                  onClick={() => select(item)}
                  onMouseMove={() => setActiveIndex(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === activeIndex ? "bg-surface-elevated" : ""
                  )}
                >
                  {item.kind === "course" ? (
                    <BookOpen className="w-4 h-4 text-brand-400 shrink-0" />
                  ) : item.kind === "wiki" ? (
                    <BookMarked className="w-4 h-4 text-brand-300 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white truncate">
                      {item.title}
                    </span>
                    <span className="block text-xs text-slate-500 truncate">
                      {item.kind === "course"
                        ? "Course"
                        : `${item.courseTitle}${
                            item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ""
                          }`}
                    </span>
                  </span>
                  {item.kind === "lesson" && item.lessonType && (
                    <span className="text-[10px] uppercase tracking-wider text-slate-600 shrink-0">
                      {item.lessonType}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-4 px-4 py-2 border-t border-surface-border text-[11px] text-slate-600">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
