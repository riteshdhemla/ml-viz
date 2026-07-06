/**
 * MDX component map — every custom component usable in .mdx lesson files.
 * Add new viz/exercise components here and they become available in all lessons.
 */
import type { MDXComponents } from "mdx/types";
import { Callout } from "./Callout";
import { Details } from "./Details";
import { CodeBlock } from "./CodeBlock";
import { WikiLink } from "./WikiLink";
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
import { NeuralNetworkViz } from "@/components/visualizations/NeuralNetwork/NeuralNetworkViz";
import { KernelViz } from "@/components/visualizations/KernelViz/KernelViz";
import { LSTMGateViz } from "@/components/visualizations/LSTMGate/LSTMGateViz";
import { DSeparationViz } from "@/components/visualizations/DSeparation/DSeparationViz";
import { GridWorldViz } from "@/components/visualizations/GridWorld/GridWorldViz";
import { DiffusionViz } from "@/components/visualizations/Diffusion/DiffusionViz";
import { BaggingViz } from "@/components/visualizations/Bagging/BaggingViz";
import { BoostingViz } from "@/components/visualizations/Boosting/BoostingViz";
import { QTableViz } from "@/components/visualizations/QTable/QTableViz";
import { PoolingViz } from "@/components/visualizations/Pooling/PoolingViz";
import { CoalescingViz } from "@/components/visualizations/Coalescing/CoalescingViz";
import { SamplingDistributionViz } from "@/components/visualizations/SamplingDistribution/SamplingDistributionViz";
import { HypothesisTestViz } from "@/components/visualizations/HypothesisTest/HypothesisTestViz";
import { MessagePassingViz } from "@/components/visualizations/MessagePassing/MessagePassingViz";
import { MatrixFactorizationViz } from "@/components/visualizations/MatrixFactorization/MatrixFactorizationViz";
import { GaussianProcessViz } from "@/components/visualizations/GaussianProcess/GaussianProcessViz";
import { MoERoutingViz } from "@/components/visualizations/MoERouting/MoERoutingViz";
import { CalibrationViz } from "@/components/visualizations/Calibration/CalibrationViz";
import { LatentSpaceViz } from "@/components/visualizations/LatentSpace/LatentSpaceViz";
import { RNNUnrollViz } from "@/components/visualizations/RNNUnroll/RNNUnrollViz";
import { HMMViterbiViz } from "@/components/visualizations/HMMViterbi/HMMViterbiViz";
import { TransferLearningViz } from "@/components/visualizations/TransferLearning/TransferLearningViz";
import { GMMResponsibilityViz } from "@/components/visualizations/GMM/GMMResponsibilityViz";
import { PositionalEncodingViz } from "@/components/visualizations/PositionalEncoding/PositionalEncodingViz";
import { DendrogramViz } from "@/components/visualizations/Dendrogram/DendrogramViz";
import { TransformerBlockViz } from "@/components/visualizations/TransformerBlock/TransformerBlockViz";
import { GANTrainingViz } from "@/components/visualizations/GANTraining/GANTrainingViz";
import { PerplexityViz } from "@/components/visualizations/Perplexity/PerplexityViz";
import { PolicyGradientViz } from "@/components/visualizations/PolicyGradient/PolicyGradientViz";
import { BiasVarianceViz } from "@/components/visualizations/BiasVariance/BiasVarianceViz";
import { RegularizationPathViz } from "@/components/visualizations/RegularizationPath/RegularizationPathViz";
import { SoftMarginViz } from "@/components/visualizations/SoftMargin/SoftMarginViz";
import { BoostingShrinkageViz } from "@/components/visualizations/BoostingShrinkage/BoostingShrinkageViz";
import { SilhouetteViz } from "@/components/visualizations/Silhouette/SilhouetteViz";
import { PCAReconstructionViz } from "@/components/visualizations/PCAReconstruction/PCAReconstructionViz";
import { NaiveBayesVotesViz } from "@/components/visualizations/NaiveBayesVotes/NaiveBayesVotesViz";
import DecompositionViz from "@/components/visualizations/Decomposition/DecompositionViz";
import ACFViz from "@/components/visualizations/ACF/ACFViz";
import ARIMAForecastViz from "@/components/visualizations/ARIMAForecast/ARIMAForecastViz";
import { SamplingViz } from "@/components/visualizations/Sampling/SamplingViz";
import { RAGRetrievalViz } from "@/components/visualizations/RAGRetrieval/RAGRetrievalViz";
import { LoRAViz } from "@/components/visualizations/LoRA/LoRAViz";
import { RewardModelViz } from "@/components/visualizations/RewardModel/RewardModelViz";
import { QuantizationViz } from "@/components/visualizations/Quantization/QuantizationViz";
import { ScalingLawViz } from "@/components/visualizations/ScalingLaw/ScalingLawViz";
import { ContrastiveViz } from "@/components/visualizations/Contrastive/ContrastiveViz";
import { CLIPSpaceViz } from "@/components/visualizations/CLIPSpace/CLIPSpaceViz";
import { SamplingStrategiesViz } from "@/components/visualizations/SamplingStrategies/SamplingStrategiesViz";
import { RolloutViz } from "@/components/visualizations/Rollout/RolloutViz";
import { AgentLoopViz } from "@/components/visualizations/AgentLoop/AgentLoopViz";
import { OptimizerPathViz } from "@/components/visualizations/OptimizerPath/OptimizerPathViz";
import { KLDivergenceViz } from "@/components/visualizations/KLDivergence/KLDivergenceViz";
import { LowRankViz } from "@/components/visualizations/LowRank/LowRankViz";
import { VCDimensionViz } from "@/components/visualizations/VCDimension/VCDimensionViz";
import { DistributedTrainingViz } from "@/components/visualizations/DistributedTraining/DistributedTrainingViz";
import { ParallelismStrategyViz } from "@/components/visualizations/ParallelismStrategy/ParallelismStrategyViz";
import { TraceWaterfallViz } from "@/components/visualizations/TraceWaterfall/TraceWaterfallViz";
import { CondorcetViz } from "@/components/visualizations/Condorcet/CondorcetViz";

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mt-10 mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold text-white mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold text-slate-200 mt-6 mb-2" {...props} />,

  pre: CodeBlock,

  Callout,
  Details,
  Exercise,
  WikiLink,

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
  NeuralNetworkViz,
  KernelViz,
  LSTMGateViz,
  DSeparationViz,
  GridWorldViz,
  DiffusionViz,
  BaggingViz,
  BoostingViz,
  QTableViz,
  PoolingViz,
  CoalescingViz,
  SamplingDistributionViz,
  HypothesisTestViz,
  MessagePassingViz,
  MatrixFactorizationViz,
  GaussianProcessViz,
  MoERoutingViz,
  CalibrationViz,
  LatentSpaceViz,
  RNNUnrollViz,
  HMMViterbiViz,
  TransferLearningViz,
  GMMResponsibilityViz,
  PositionalEncodingViz,
  DendrogramViz,
  TransformerBlockViz,
  GANTrainingViz,
  PerplexityViz,
  PolicyGradientViz,
  BiasVarianceViz,
  RegularizationPathViz,
  SoftMarginViz,
  BoostingShrinkageViz,
  SilhouetteViz,
  PCAReconstructionViz,
  NaiveBayesVotesViz,
  DecompositionViz,
  ACFViz,
  ARIMAForecastViz,
  SamplingViz,
  RAGRetrievalViz,
  LoRAViz,
  RewardModelViz,
  QuantizationViz,
  ScalingLawViz,
  ContrastiveViz,
  CLIPSpaceViz,
  SamplingStrategiesViz,
  RolloutViz,
  AgentLoopViz,
  OptimizerPathViz,
  KLDivergenceViz,
  LowRankViz,
  VCDimensionViz,
  DistributedTrainingViz,
  ParallelismStrategyViz,
  TraceWaterfallViz,
  CondorcetViz,
};
