"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ExternalLink, Copy, Check } from "lucide-react";
import { getClaudeUrl, getChatGptUrl, getGeminiUrl } from "@/lib/ai-deep-dive";

interface Props {
  /** Pre-built prompt (assembled server-side from the page's material). */
  prompt: string;
  className?: string;
}

export function AskAiButton({ prompt, className }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context) — fail silently.
    }
  }

  // Gemini's web app can't be prefilled from the URL, so copy the prompt to the
  // clipboard as the user opens Gemini — they just paste (⌘/Ctrl+V).
  function copyForGemini() {
    try {
      void navigator.clipboard?.writeText(prompt);
    } catch {
      // Clipboard unavailable — the new tab still opens; nothing to do.
    }
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border hover:border-brand-500/60 bg-surface-card hover:bg-surface-elevated text-slate-400 hover:text-brand-400 text-xs font-medium transition-all"
      >
        <Sparkles size={14} />
        Dig deeper
      </button>

      {open && (
        <div
          role="menu"
          className="card-glass absolute right-0 mt-2 w-52 p-1.5 z-50 rounded-xl border border-surface-border bg-surface-card shadow-xl"
        >
          <a
            href={getClaudeUrl(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
          >
            Ask Claude
            <ExternalLink size={13} className="text-slate-500" />
          </a>
          <a
            href={getChatGptUrl(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
          >
            Ask ChatGPT
            <ExternalLink size={13} className="text-slate-500" />
          </a>
          <a
            href={getGeminiUrl(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            title="The prompt is copied to your clipboard — paste it into Gemini"
            onClick={() => {
              copyForGemini();
              setOpen(false);
            }}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
          >
            <span className="flex flex-col">
              <span>Ask Gemini</span>
              <span className="text-[11px] text-slate-500">prompt copied — paste it in</span>
            </span>
            <ExternalLink size={13} className="text-slate-500 shrink-0" />
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={copyPrompt}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
          >
            {copied ? "Copied!" : "Copy prompt"}
            {copied ? (
              <Check size={13} className="text-accent-teal" />
            ) : (
              <Copy size={13} className="text-slate-500" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
