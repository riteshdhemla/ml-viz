import { SiteHeader } from "@/components/layout/SiteHeader";
import { ConceptMap } from "@/components/knowledge-graph/ConceptMap";
import { buildCourseGraph } from "@/lib/knowledge-graph";
import { absoluteUrl } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concept Map",
  description:
    "A semantic map of the whole curriculum — every course connected by prerequisites and shared concepts, colored by cluster and the project-loop spine.",
  alternates: { canonical: absoluteUrl("/map") },
};

export const dynamic = "force-static";

export default function ConceptMapPage() {
  const { nodes, edges, details } = buildCourseGraph();

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white">Concept Map</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          The curriculum as a connected graph rather than a list. Courses are linked by{" "}
          <strong className="text-slate-200">prerequisites</strong> and by the{" "}
          <strong className="text-slate-200">concepts they share</strong> — the relational{" "}
          <em>map</em> that complements the project-loop <em>spine</em>. Seeing how ideas
          depend on and relate to each other is a different aid to understanding and
          retention than knowing which stage of a project each one belongs to.
        </p>

        <div className="mt-8">
          <ConceptMap nodes={nodes} edges={edges} details={details} />
        </div>
      </main>
    </div>
  );
}
