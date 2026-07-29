import { Building2, Gauge, Layers, SignalHigh } from "lucide-react";

interface Props {
  /** Company the design is inspired by, e.g. "Pinterest". */
  company?: string;
  /** Track label, e.g. "ML System Design" or "Agentic System Design". */
  track?: string;
  /** One-line scale headline, e.g. "300M+ users, <200ms feed budget". */
  scale?: string;
  /** "beginner" | "intermediate" | "advanced". */
  difficulty?: string;
}

/**
 * Header metadata card for a system-design case study. Plain-string props only
 * (lesson/case MDX runs with `blockJS: true`, so no JS objects can be passed).
 * Placed at the top of a case body, right after the H1, to frame the problem.
 */
export function SystemDesignMeta({ company, track, scale, difficulty }: Props) {
  const rows: { icon: React.ElementType; label: string; value: string }[] = [];
  if (track) rows.push({ icon: Layers, label: "Track", value: track });
  if (company) rows.push({ icon: Building2, label: "Inspired by", value: company });
  if (scale) rows.push({ icon: Gauge, label: "Scale", value: scale });
  if (difficulty)
    rows.push({
      icon: SignalHigh,
      label: "Difficulty",
      value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    });

  if (rows.length === 0) return null;

  return (
    <div className="not-prose card-glass my-6 grid gap-3 p-5 sm:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3">
          <Icon size={16} className="mt-0.5 shrink-0 text-brand-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="text-sm text-slate-200">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
