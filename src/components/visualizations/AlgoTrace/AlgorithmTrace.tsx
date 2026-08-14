import { getAlgoTrace } from "@/lib/algo-traces";
import { AlgorithmTracePlayer } from "./AlgorithmTracePlayer";

/**
 * Server component: resolves `<AlgorithmTrace id="bm25-scoring" />` against the
 * trace registry and hands the built trace to the interactive player.
 *
 * MDX references a trace by id because lesson MDX runs with `blockJS: true`, so
 * only plain string props survive. Doing the lookup here rather than in the
 * player keeps `src/lib/algo-traces` on the server: it statically imports all
 * 50 builders and each calls `build()` at module scope, so a client-side lookup
 * shipped every trace to every content page and re-ran all 50 algorithms in the
 * browser during hydration. Only the trace actually rendered is serialized now.
 */
export function AlgorithmTrace({ id, className }: { id: string; className?: string }) {
  const trace = getAlgoTrace(id);

  if (!trace) {
    return (
      <div className="not-prose card-glass my-6 p-4 text-sm text-accent-rose">
        Unknown algorithm trace: <code className="font-mono">{id}</code>
      </div>
    );
  }

  return <AlgorithmTracePlayer trace={trace} className={className} />;
}
