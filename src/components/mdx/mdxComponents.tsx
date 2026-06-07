/**
 * MDX component map — every custom component usable in .mdx lesson files.
 * Add new viz/exercise components here and they become available in all lessons.
 */
import type { MDXComponents } from "mdx/types";
import { Callout } from "./Callout";
import { Exercise } from "@/components/exercises/Exercise";

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mt-10 mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold text-white mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold text-slate-200 mt-6 mb-2" {...props} />,

  Callout,
  Exercise,

  // Visualization components added in feat/04-visualizations — uncomment as you build them:
  // NeuralNetworkViz,
  // GradientDescentViz,
};
