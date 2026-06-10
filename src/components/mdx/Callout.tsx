import { cn } from "@/lib/utils";
import { Info, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";

type CalloutType = "info" | "warning" | "tip" | "success";

const STYLES: Record<CalloutType, { icon: React.ElementType; className: string }> = {
  info: { icon: Info, className: "border-brand-500/40 bg-brand-500/10 text-brand-200" },
  warning: { icon: AlertTriangle, className: "border-accent-yellow/40 bg-accent-yellow/10 text-yellow-200" },
  tip: { icon: Lightbulb, className: "border-accent-teal/40 bg-accent-teal/10 text-teal-200" },
  success: { icon: CheckCircle, className: "border-accent-teal/40 bg-accent-teal/10 text-teal-200" },
};

interface Props {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = "info", title, children }: Props) {
  const { icon: Icon, className } = STYLES[type];
  return (
    <div className={cn("not-prose rounded-xl border p-4 my-6 flex gap-3", className)}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
