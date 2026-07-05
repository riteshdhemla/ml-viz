/**
 * Helpers for the "Dig deeper with AI" feature.
 *
 * Given a lesson or wiki page's raw MDX `source` plus its metadata, build a
 * concise, conversational prompt and the provider URLs that pre-fill a new
 * chat. Pure functions only — safe to import from server components.
 */

export type DeepDiveKind = "lesson" | "wiki";

export interface DeepDivePromptOptions {
  title: string;
  description: string;
  url: string;
  headings: string[];
  kind: DeepDiveKind;
}

/**
 * Pull section headings (`##` / `###`) from raw MDX so the prompt captures the
 * page's structure without dragging in prose or JSX. Lines inside fenced code
 * blocks (``` ```) are skipped so a `#` comment never looks like a heading.
 */
export function extractHeadings(source: string, limit = 8): string[] {
  const headings: string[] = [];
  let inFence = false;

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("```") || line.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (match) {
      // Strip inline markdown emphasis/code markers for a clean label.
      const text = match[2].replace(/[*_`]/g, "").trim();
      if (text) headings.push(text);
      if (headings.length >= limit) break;
    }
  }

  return headings;
}

/** Assemble the conversational prompt that primes the AI to go deeper. */
export function buildDeepDivePrompt({
  title,
  description,
  url,
  headings,
  kind,
}: DeepDivePromptOptions): string {
  const parts = [
    `I just finished a ${kind} on "${title}" from ML Viz, an interactive machine-learning course.`,
    `Here's what it covered: ${description}`,
  ];

  if (headings.length > 0) {
    parts.push(`It walked through: ${headings.join("; ")}.`);
  }

  parts.push(
    "Help me dig deeper — explain the intuition behind it, work through a concrete example, point out common misconceptions, and suggest what to learn next."
  );
  parts.push(`Reference page: ${url}`);

  return parts.join(" ");
}

/** Open Claude with the prompt pre-filled in a new conversation. */
export function getClaudeUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** Open ChatGPT with the prompt pre-filled. */
export function getChatGptUrl(prompt: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

/**
 * Open Gemini. Unlike Claude/ChatGPT, the Gemini web app does **not** natively
 * prefill from the URL — the `?prompt=` param is only honoured by a browser
 * extension (e.g. "Gemini URL Prompt"). The UI therefore also copies the prompt
 * to the clipboard so the user can paste it; the param is a bonus for the
 * minority who have such an extension.
 */
export function getGeminiUrl(prompt: string): string {
  return `https://gemini.google.com/app?prompt=${encodeURIComponent(prompt)}`;
}
