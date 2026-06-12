import { MDXRemote } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { mdxComponents } from "@/components/mdx/mdxComponents";

interface Props {
  source: string;
}

/**
 * Shared MDX renderer for lessons and wiki pages. The configuration here is
 * security-relevant — keep it in one place so the two consumers cannot drift.
 */
export function MdxContent({ source }: Props) {
  return (
    <MDXRemote
      source={source}
      components={mdxComponents}
      options={{
        // Content MDX must not evaluate JS expressions: exercises are
        // referenced by id (`<Exercise id="..." />`) and resolved from
        // the registry in `src/lib/exercises.ts`, never passed inline.
        // blockJS defaults to true in next-mdx-remote v6; keep it on to
        // prevent arbitrary code execution from MDX content.
        blockJS: true,
        mdxOptions: {
          remarkPlugins: [remarkMath, remarkGfm],
          rehypePlugins: [
            rehypeKatex,
            // detect:false → only highlight blocks with an explicit
            // ```lang fence. Plain fences (ASCII diagrams, sample
            // output) render as-is instead of being mis-guessed.
            [rehypeHighlight, { detect: false, ignoreMissing: true }],
          ],
        },
      }}
    />
  );
}
