import Link from "next/link";
import { Clock, NotebookPen } from "lucide-react";
import { getAllWikiPages } from "@/lib/content";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { absoluteUrl } from "@/lib/site";
import type { WikiPageMeta } from "@/types/wiki";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concept Wiki",
  description:
    "Deep-dive reference pages for ML algorithms and procedures — each with a runnable notebook.",
  alternates: { canonical: absoluteUrl("/wiki") },
};

/** Group pages by their first topic tag, sections sorted alphabetically. */
function groupByTopic(pages: WikiPageMeta[]): [string, WikiPageMeta[]][] {
  const groups = new Map<string, WikiPageMeta[]>();
  for (const page of pages) {
    const topic = page.topics?.[0] ?? "general";
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic)!.push(page);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** "graphical-models" → "Graphical Models" */
function topicLabel(topic: string): string {
  return topic
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function WikiIndexPage() {
  const pages = getAllWikiPages();
  const groups = groupByTopic(pages);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white">Concept Wiki</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Deep-dive reference pages for the algorithms and procedures behind the
          lessons. Every page comes with a runnable Colab notebook implementing
          the concept from scratch.
        </p>

        {groups.length === 0 && (
          <p className="mt-12 text-slate-500">No wiki pages yet — check back soon.</p>
        )}

        {groups.map(([topic, topicPages]) => (
          <section key={topic} className="mt-12">
            <h2 className="text-lg font-semibold text-white">{topicLabel(topic)}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {topicPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="group card-glass p-5 hover:border-brand-500/50 transition-all duration-200 hover:-translate-y-0.5 block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                      {page.title}
                    </h3>
                    {page.advanced && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded border bg-accent-rose/15 text-accent-rose border-accent-rose/30">
                        Advanced
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-400 line-clamp-2">
                    {page.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {page.estimatedMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <NotebookPen size={12} />
                      Notebook
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
