"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchStore } from "@/lib/search-store";

const NAV_LINKS = [
  { href: "/courses", label: "Courses" },
  { href: "/path", label: "Path" },
  { href: "/progress", label: "Progress" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const openSearch = useSearchStore((s) => s.setOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg">
          <span className="text-brand-400">ML</span>
          <span>Viz</span>
        </Link>

        <nav className="flex items-center gap-1">
          <button
            onClick={() => openSearch(true)}
            className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 border border-surface-border hover:text-white hover:border-slate-600 transition-colors"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-slate-500 border border-surface-border">
              ⌘K
            </kbd>
          </button>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-surface-elevated text-white"
                  : "text-slate-400 hover:text-white hover:bg-surface-card"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
