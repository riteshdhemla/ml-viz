import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface Props {
  href: string;
  className?: string;
}

export function NotebookLink({ href, className }: Props) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border hover:border-accent-orange/60 bg-surface-card hover:bg-surface-elevated text-slate-400 hover:text-accent-orange text-xs font-medium transition-all ${className ?? ""}`}
    >
      {/* Colab-style icon */}
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
        <path d="M16.9 4.8C14.9 2.8 12.2 1.8 9.4 2c-4.8.3-8.7 4.3-8.9 9.1C.3 16.6 4.6 21 10 21c2.5 0 4.8-1 6.5-2.6.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0C13.7 18.3 12 19 10 19c-4.1 0-7.4-3.4-7-7.6.3-3.7 3.3-6.7 7-7 2.2-.2 4.2.6 5.7 2.1l-2.3 2.3C12.6 9.6 11.4 9 10 9c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.4 0 4.4-1.7 4.9-4H10c-.6 0-1-.4-1-1s.4-1 1-1h6c.6 0 1 .4 1 1 0 3.9-3.1 7-7 7-4.4 0-8-3.6-8-8s3.6-8 8-8c2.1 0 4.1.8 5.6 2.2l1.7-1.7C15.5 3.7 13.8 3 12 3" />
      </svg>
      Open in Colab
      <ExternalLink size={11} />
    </Link>
  );
}
