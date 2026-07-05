import { describe, it, expect } from "vitest";
import {
  extractHeadings,
  buildDeepDivePrompt,
  getClaudeUrl,
  getChatGptUrl,
  getGeminiUrl,
} from "@/lib/ai-deep-dive";

describe("extractHeadings", () => {
  it("returns ## and ### headings", () => {
    const source = [
      "# Title",
      "Some prose.",
      "## First section",
      "more prose",
      "### A subsection",
    ].join("\n");
    expect(extractHeadings(source)).toEqual(["First section", "A subsection"]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const source = [
      "## Real heading",
      "```python",
      "# this is a comment, not a heading",
      "## also not a heading",
      "```",
      "### Another real one",
    ].join("\n");
    expect(extractHeadings(source)).toEqual(["Real heading", "Another real one"]);
  });

  it("strips inline markdown markers from heading text", () => {
    expect(extractHeadings("## The `softmax` *function*")).toEqual([
      "The softmax function",
    ]);
  });

  it("respects the limit", () => {
    const source = Array.from({ length: 10 }, (_, i) => `## Heading ${i}`).join("\n");
    expect(extractHeadings(source, 3)).toHaveLength(3);
  });
});

describe("buildDeepDivePrompt", () => {
  const opts = {
    title: "Gradient Descent",
    description: "How models learn by following the slope.",
    url: "https://ml-viz-ruby.vercel.app/courses/neural-networks/02-gradient-descent",
    headings: ["The loss landscape", "Learning rate"],
    kind: "lesson" as const,
  };

  it("includes title, description, headings, kind and url", () => {
    const prompt = buildDeepDivePrompt(opts);
    expect(prompt).toContain("Gradient Descent");
    expect(prompt).toContain("How models learn by following the slope.");
    expect(prompt).toContain("The loss landscape");
    expect(prompt).toContain("lesson");
    expect(prompt).toContain(opts.url);
  });

  it("omits the walkthrough sentence when there are no headings", () => {
    const prompt = buildDeepDivePrompt({ ...opts, headings: [] });
    expect(prompt).not.toContain("It walked through");
  });
});

describe("provider URLs", () => {
  it("builds a Claude URL with an encoded prompt", () => {
    const url = getClaudeUrl("hello world");
    expect(url).toBe("https://claude.ai/new?q=hello%20world");
  });

  it("builds a ChatGPT URL with an encoded prompt", () => {
    const url = getChatGptUrl("a & b");
    expect(url).toBe("https://chatgpt.com/?q=a%20%26%20b");
  });

  it("builds a Gemini URL with an encoded prompt", () => {
    const url = getGeminiUrl("a & b");
    expect(url).toBe("https://gemini.google.com/app?prompt=a%20%26%20b");
  });

  it("round-trips the prompt through decoding", () => {
    const prompt = buildDeepDivePrompt({
      title: "PCA & SVD",
      description: "Dimensionality reduction.",
      url: "https://ml-viz-ruby.vercel.app/wiki/pca",
      headings: ["Eigenvectors"],
      kind: "wiki",
    });
    const q = new URL(getChatGptUrl(prompt)).searchParams.get("q");
    expect(q).toBe(prompt);
  });
});
