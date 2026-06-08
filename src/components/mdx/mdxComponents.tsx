/**
 * MDX component map — every custom component usable in .mdx lesson files.
 * Add new viz/exercise components here and they become available in all lessons.
 */
import type { MDXComponents } from "mdx/types";
import { Callout } from "./Callout";
import { CodeBlock } from "./CodeBlock";
import { Exercise } from "@/components/exercises/Exercise";
import { GradientDescentViz } from "@/components/visualizations/GradientDescent/GradientDescentViz";
import { ActivationFunctionViz } from "@/components/visualizations/ActivationFunction/ActivationFunctionViz";
import { LinearRegressionViz } from "@/components/visualizations/LinearRegression/LinearRegressionViz";
import { DecisionBoundaryViz } from "@/components/visualizations/DecisionBoundary/DecisionBoundaryViz";
import { KMeansViz } from "@/components/visualizations/KMeans/KMeansViz";
import { PCAViz } from "@/components/visualizations/PCA/PCAViz";
import { VectorViz } from "@/components/visualizations/Vector/VectorViz";
import { MatrixTransformViz } from "@/components/visualizations/MatrixTransform/MatrixTransformViz";
import { EigenvectorViz } from "@/components/visualizations/Eigenvector/EigenvectorViz";
import { FunctionTangentViz } from "@/components/visualizations/FunctionTangent/FunctionTangentViz";
import { ComputationalGraphViz } from "@/components/visualizations/ComputationalGraph/ComputationalGraphViz";
import { GradientFieldViz } from "@/components/visualizations/GradientField/GradientFieldViz";
import { DistributionViz } from "@/components/visualizations/Distribution/DistributionViz";
import { MLEViz } from "@/components/visualizations/MLE/MLEViz";
import { BayesViz } from "@/components/visualizations/Bayes/BayesViz";
import { AttentionViz } from "@/components/visualizations/Attention/AttentionViz";
import { ConvolutionViz } from "@/components/visualizations/Convolution/ConvolutionViz";
import { VanishingGradientViz } from "@/components/visualizations/VanishingGradient/VanishingGradientViz";
import { KNNBoundaryViz } from "@/components/visualizations/KNNBoundary/KNNBoundaryViz";
import { MarginViz } from "@/components/visualizations/Margin/MarginViz";
import { DecisionTreeSplitViz } from "@/components/visualizations/DecisionTreeSplit/DecisionTreeSplitViz";

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mt-10 mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold text-white mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold text-slate-200 mt-6 mb-2" {...props} />,

  pre: CodeBlock,

  Callout,
  Exercise,

  // Visualizations (pure-SVG client components — see visualizations/viz-kit.tsx)
  GradientDescentViz,
  ActivationFunctionViz,
  LinearRegressionViz,
  DecisionBoundaryViz,
  KMeansViz,
  PCAViz,
  VectorViz,
  MatrixTransformViz,
  EigenvectorViz,
  FunctionTangentViz,
  ComputationalGraphViz,
  GradientFieldViz,
  DistributionViz,
  MLEViz,
  BayesViz,
  AttentionViz,
  ConvolutionViz,
  VanishingGradientViz,
  KNNBoundaryViz,
  MarginViz,
  DecisionTreeSplitViz,
};
