/**
 * MDX component map — every custom component usable in .mdx lesson files.
 * Add new viz/exercise components here and they become available in all lessons.
 *
 * Visualizations are referenced by name through `LazyViz` rather than imported
 * here. This module is a server module shared by every MDX route, so a direct
 * import makes a viz part of the client graph of all 331 content pages; routing
 * them through one client module lets webpack give each viz its own chunk. See
 * `visualizations/lazy-viz.tsx` for the full reasoning.
 */
import type { MDXComponents } from "mdx/types";
import { Callout } from "./Callout";
import { Details } from "./Details";
import { ThinkFirst } from "./ThinkFirst";
import { CodeBlock } from "./CodeBlock";
import { WikiLink } from "./WikiLink";
import { SystemDesignMeta } from "./SystemDesignMeta";
import { LazyViz } from "@/components/visualizations/lazy-viz";
// Exercise and AlgorithmTrace are server components: they resolve an id against
// their registry and pass only the matched entry to a client child, so the
// registries themselves stay out of the client bundle.
import { Exercise } from "@/components/exercises/Exercise";
import { AlgorithmTrace } from "@/components/visualizations/AlgoTrace/AlgorithmTrace";

/** Binds an MDX tag to a lazily-loaded visualization of the same name. */
function viz(name: string) {
  const Viz = (props: Record<string, unknown>) => <LazyViz name={name} {...props} />;
  Viz.displayName = name;
  return Viz;
}

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mt-10 mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold text-white mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold text-slate-200 mt-6 mb-2" {...props} />,

  pre: CodeBlock,

  Callout,
  Details,
  ThinkFirst,
  Exercise,
  WikiLink,
  SystemDesignMeta,

  // Steppable algorithm player — <AlgorithmTrace id="..." />, see lib/algo-traces/
  AlgorithmTrace,

  // Visualizations (pure-SVG client components — see visualizations/viz-kit.tsx)
  ACFViz: viz("ACFViz"),
  ActivationFunctionViz: viz("ActivationFunctionViz"),
  AgentEvalViz: viz("AgentEvalViz"),
  AgentLoopViz: viz("AgentLoopViz"),
  ARIMAForecastViz: viz("ARIMAForecastViz"),
  AttentionViz: viz("AttentionViz"),
  AudioFeaturesViz: viz("AudioFeaturesViz"),
  BaggingViz: viz("BaggingViz"),
  BayesViz: viz("BayesViz"),
  BiasVarianceViz: viz("BiasVarianceViz"),
  BoostingShrinkageViz: viz("BoostingShrinkageViz"),
  BoostingViz: viz("BoostingViz"),
  BoxJenkinsViz: viz("BoxJenkinsViz"),
  CalibrationViz: viz("CalibrationViz"),
  CLIPSpaceViz: viz("CLIPSpaceViz"),
  CoalescingViz: viz("CoalescingViz"),
  ComputationalGraphViz: viz("ComputationalGraphViz"),
  ConceptDriftViz: viz("ConceptDriftViz"),
  CondorcetViz: viz("CondorcetViz"),
  ContextAssemblyViz: viz("ContextAssemblyViz"),
  ContinuousTrainingViz: viz("ContinuousTrainingViz"),
  ContrastiveViz: viz("ContrastiveViz"),
  ConvolutionViz: viz("ConvolutionViz"),
  CTCDecodingViz: viz("CTCDecodingViz"),
  DecisionBoundaryViz: viz("DecisionBoundaryViz"),
  DecisionTreeSplitViz: viz("DecisionTreeSplitViz"),
  DecompositionViz: viz("DecompositionViz"),
  DendrogramViz: viz("DendrogramViz"),
  DiffusionViz: viz("DiffusionViz"),
  DistributedTrainingViz: viz("DistributedTrainingViz"),
  DistributionViz: viz("DistributionViz"),
  DSeparationViz: viz("DSeparationViz"),
  EigenvectorViz: viz("EigenvectorViz"),
  FunctionTangentViz: viz("FunctionTangentViz"),
  GANTrainingViz: viz("GANTrainingViz"),
  GaussianProcessViz: viz("GaussianProcessViz"),
  GMMResponsibilityViz: viz("GMMResponsibilityViz"),
  GradientDescentViz: viz("GradientDescentViz"),
  GradientFieldViz: viz("GradientFieldViz"),
  GraphRAGViz: viz("GraphRAGViz"),
  GridWorldViz: viz("GridWorldViz"),
  HierarchicalForecastViz: viz("HierarchicalForecastViz"),
  HMMViterbiViz: viz("HMMViterbiViz"),
  HypothesisTestViz: viz("HypothesisTestViz"),
  KernelViz: viz("KernelViz"),
  KLDivergenceViz: viz("KLDivergenceViz"),
  KMeansViz: viz("KMeansViz"),
  KNNBoundaryViz: viz("KNNBoundaryViz"),
  LatencyCriticalPathViz: viz("LatencyCriticalPathViz"),
  LatentSpaceViz: viz("LatentSpaceViz"),
  LinearRegressionViz: viz("LinearRegressionViz"),
  LoRAViz: viz("LoRAViz"),
  LowRankViz: viz("LowRankViz"),
  LSTMGateViz: viz("LSTMGateViz"),
  MarginViz: viz("MarginViz"),
  MatrixFactorizationViz: viz("MatrixFactorizationViz"),
  MatrixTransformViz: viz("MatrixTransformViz"),
  MessagePassingViz: viz("MessagePassingViz"),
  MLEViz: viz("MLEViz"),
  MoERoutingViz: viz("MoERoutingViz"),
  NaiveBayesVotesViz: viz("NaiveBayesVotesViz"),
  NeuralNetworkViz: viz("NeuralNetworkViz"),
  OnlineRegretViz: viz("OnlineRegretViz"),
  OptimizerPathViz: viz("OptimizerPathViz"),
  PCAReconstructionViz: viz("PCAReconstructionViz"),
  PCAViz: viz("PCAViz"),
  PerplexityViz: viz("PerplexityViz"),
  PolicyGradientViz: viz("PolicyGradientViz"),
  PoolingViz: viz("PoolingViz"),
  PositionalEncodingViz: viz("PositionalEncodingViz"),
  PreferenceTuningViz: viz("PreferenceTuningViz"),
  ProjectLoopViz: viz("ProjectLoopViz"),
  QTableViz: viz("QTableViz"),
  QuantizationViz: viz("QuantizationViz"),
  RAGArchitectureViz: viz("RAGArchitectureViz"),
  RAGRetrievalViz: viz("RAGRetrievalViz"),
  RegularizationPathViz: viz("RegularizationPathViz"),
  ReservoirSamplingViz: viz("ReservoirSamplingViz"),
  RewardModelViz: viz("RewardModelViz"),
  RNNUnrollViz: viz("RNNUnrollViz"),
  RolloutViz: viz("RolloutViz"),
  SamplingDistributionViz: viz("SamplingDistributionViz"),
  SamplingStrategiesViz: viz("SamplingStrategiesViz"),
  SamplingViz: viz("SamplingViz"),
  ScalingLawViz: viz("ScalingLawViz"),
  SilhouetteViz: viz("SilhouetteViz"),
  SimpsonsParadoxViz: viz("SimpsonsParadoxViz"),
  SoftMarginViz: viz("SoftMarginViz"),
  TraceWaterfallViz: viz("TraceWaterfallViz"),
  TransferLearningViz: viz("TransferLearningViz"),
  TransformerBlockViz: viz("TransformerBlockViz"),
  VanishingGradientViz: viz("VanishingGradientViz"),
  VCDimensionViz: viz("VCDimensionViz"),
  VectorViz: viz("VectorViz"),
};
