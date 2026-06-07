"use client";

import { useRef, useState, isValidElement } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Custom renderer for fenced code blocks in lesson MDX.
 *
 * Wraps the highlighted `<pre>` in a card with a header bar showing the
 * language and a copy-to-clipboard button. Syntax highlighting itself is
 * applied upstream by `rehype-highlight` (hljs token classes); this component
 * only adds chrome and the copy affordance.
 */
type PreProps = React.HTMLAttributes<HTMLPreElement> & {
  children?: React.ReactNode;
};

const LANG_LABELS: Record<string, string> = {
  python: "Python",
  py: "Python",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  text: "Text",
};

function extractLanguage(children: React.ReactNode): string | null {
  if (!isValidElement(children)) return null;
  const className: string =
    (children.props as { className?: string })?.className ?? "";
  const match = /language-([\w-]+)/.exec(className);
  return match ? match[1] : null;
}

export function CodeBlock({ children, ...preProps }: PreProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const lang = extractLanguage(children);
  const label = lang ? (LANG_LABELS[lang] ?? lang) : "Code";

  const handleCopy = async () => {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (e.g. non-secure context) — fail silently */
    }
  };

  return (
    <div className="code-block group not-prose">
      <div className="code-block__header">
        <span className="code-block__lang">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="code-block__copy"
        >
          {copied ? (
            <>
              <Check size={14} className="text-accent-teal" />
              <span className="text-accent-teal">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre ref={preRef} {...preProps}>
        {children}
      </pre>
    </div>
  );
}
