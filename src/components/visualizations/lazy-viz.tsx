"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Lazy registry for every visualization, and the reason it exists.
 *
 * Visualizations are client components referenced from `mdxComponents.tsx`,
 * which is a server module shared by every MDX route. Anything it imports —
 * directly or through `next/dynamic` — is reachable from all 331 content pages,
 * so webpack put all 93 viz in one 572 KB chunk that loaded even on pages with
 * no visualization at all. `next/dynamic` in a *server* module does not help:
 * client components are already split by the RSC protocol, and the chunking is
 * decided by what the page's client graph references.
 *
 * Putting the `import()` calls inside this one client module makes them real
 * async imports in the client compilation, so each viz gets its own chunk and a
 * page downloads only the ones it renders. SSR stays enabled, so the markup is
 * still server-rendered.
 *
 * Adding a viz: add a line here *and* register the tag in `mdxComponents.tsx`.
 */

// MDX passes plain string props only (`blockJS: true`), so the per-viz prop
// types cannot be checked through this by-name indirection anyway.
type VizProps = Record<string, unknown>;

const VIZ: Record<string, ComponentType<VizProps>> = {
  ACFViz: dynamic(() => import("@/components/visualizations/ACF/ACFViz").then((m) => m.default)) as ComponentType<VizProps>,
  ActivationFunctionViz: dynamic(() => import("@/components/visualizations/ActivationFunction/ActivationFunctionViz").then((m) => m.ActivationFunctionViz)) as ComponentType<VizProps>,
  AgentEvalViz: dynamic(() => import("@/components/visualizations/AgentEval/AgentEvalViz").then((m) => m.AgentEvalViz)) as ComponentType<VizProps>,
  AgentLoopViz: dynamic(() => import("@/components/visualizations/AgentLoop/AgentLoopViz").then((m) => m.AgentLoopViz)) as ComponentType<VizProps>,
  AnchorMatchingViz: dynamic(() => import("@/components/visualizations/AnchorMatching/AnchorMatchingViz").then((m) => m.AnchorMatchingViz)) as ComponentType<VizProps>,
  AnomalyThresholdViz: dynamic(() => import("@/components/visualizations/AnomalyThreshold/AnomalyThresholdViz").then((m) => m.AnomalyThresholdViz)) as ComponentType<VizProps>,
  ARIMAForecastViz: dynamic(() => import("@/components/visualizations/ARIMAForecast/ARIMAForecastViz").then((m) => m.default)) as ComponentType<VizProps>,
  AttentionViz: dynamic(() => import("@/components/visualizations/Attention/AttentionViz").then((m) => m.AttentionViz)) as ComponentType<VizProps>,
  AudioFeaturesViz: dynamic(() => import("@/components/visualizations/AudioFeatures/AudioFeaturesViz").then((m) => m.AudioFeaturesViz)) as ComponentType<VizProps>,
  BackdoorAdjustmentViz: dynamic(() => import("@/components/visualizations/BackdoorAdjustment/BackdoorAdjustmentViz").then((m) => m.BackdoorAdjustmentViz)) as ComponentType<VizProps>,
  BaggingViz: dynamic(() => import("@/components/visualizations/Bagging/BaggingViz").then((m) => m.BaggingViz)) as ComponentType<VizProps>,
  BanditExplorationViz: dynamic(() => import("@/components/visualizations/BanditExploration/BanditExplorationViz").then((m) => m.BanditExplorationViz)) as ComponentType<VizProps>,
  BayesViz: dynamic(() => import("@/components/visualizations/Bayes/BayesViz").then((m) => m.BayesViz)) as ComponentType<VizProps>,
  BiasVarianceViz: dynamic(() => import("@/components/visualizations/BiasVariance/BiasVarianceViz").then((m) => m.BiasVarianceViz)) as ComponentType<VizProps>,
  BoostingShrinkageViz: dynamic(() => import("@/components/visualizations/BoostingShrinkage/BoostingShrinkageViz").then((m) => m.BoostingShrinkageViz)) as ComponentType<VizProps>,
  BoostingViz: dynamic(() => import("@/components/visualizations/Boosting/BoostingViz").then((m) => m.BoostingViz)) as ComponentType<VizProps>,
  BottleneckViz: dynamic(() => import("@/components/visualizations/Bottleneck/BottleneckViz").then((m) => m.BottleneckViz)) as ComponentType<VizProps>,
  BoxJenkinsViz: dynamic(() => import("@/components/visualizations/BoxJenkins/BoxJenkinsViz").then((m) => m.BoxJenkinsViz)) as ComponentType<VizProps>,
  CalibrationViz: dynamic(() => import("@/components/visualizations/Calibration/CalibrationViz").then((m) => m.CalibrationViz)) as ComponentType<VizProps>,
  CLIPSpaceViz: dynamic(() => import("@/components/visualizations/CLIPSpace/CLIPSpaceViz").then((m) => m.CLIPSpaceViz)) as ComponentType<VizProps>,
  CoalescingViz: dynamic(() => import("@/components/visualizations/Coalescing/CoalescingViz").then((m) => m.CoalescingViz)) as ComponentType<VizProps>,
  ComputationalGraphViz: dynamic(() => import("@/components/visualizations/ComputationalGraph/ComputationalGraphViz").then((m) => m.ComputationalGraphViz)) as ComponentType<VizProps>,
  ConceptDriftViz: dynamic(() => import("@/components/visualizations/ConceptDrift/ConceptDriftViz").then((m) => m.ConceptDriftViz)) as ComponentType<VizProps>,
  ConditionalAreaViz: dynamic(() => import("@/components/visualizations/ConditionalArea/ConditionalAreaViz").then((m) => m.ConditionalAreaViz)) as ComponentType<VizProps>,
  CondorcetViz: dynamic(() => import("@/components/visualizations/Condorcet/CondorcetViz").then((m) => m.CondorcetViz)) as ComponentType<VizProps>,
  ConstrainedOptViz: dynamic(() => import("@/components/visualizations/ConstrainedOpt/ConstrainedOptViz").then((m) => m.ConstrainedOptViz)) as ComponentType<VizProps>,
  ContextAssemblyViz: dynamic(() => import("@/components/visualizations/ContextAssembly/ContextAssemblyViz").then((m) => m.ContextAssemblyViz)) as ComponentType<VizProps>,
  ContinuousTrainingViz: dynamic(() => import("@/components/visualizations/ContinuousTraining/ContinuousTrainingViz").then((m) => m.ContinuousTrainingViz)) as ComponentType<VizProps>,
  ContrastiveViz: dynamic(() => import("@/components/visualizations/Contrastive/ContrastiveViz").then((m) => m.ContrastiveViz)) as ComponentType<VizProps>,
  ConvexityViz: dynamic(() => import("@/components/visualizations/Convexity/ConvexityViz").then((m) => m.ConvexityViz)) as ComponentType<VizProps>,
  ConvolutionViz: dynamic(() => import("@/components/visualizations/Convolution/ConvolutionViz").then((m) => m.ConvolutionViz)) as ComponentType<VizProps>,
  CTCDecodingViz: dynamic(() => import("@/components/visualizations/CTCDecoding/CTCDecodingViz").then((m) => m.CTCDecodingViz)) as ComponentType<VizProps>,
  DecisionBoundaryViz: dynamic(() => import("@/components/visualizations/DecisionBoundary/DecisionBoundaryViz").then((m) => m.DecisionBoundaryViz)) as ComponentType<VizProps>,
  DecisionTreeSplitViz: dynamic(() => import("@/components/visualizations/DecisionTreeSplit/DecisionTreeSplitViz").then((m) => m.DecisionTreeSplitViz)) as ComponentType<VizProps>,
  DecompositionViz: dynamic(() => import("@/components/visualizations/Decomposition/DecompositionViz").then((m) => m.default)) as ComponentType<VizProps>,
  DendrogramViz: dynamic(() => import("@/components/visualizations/Dendrogram/DendrogramViz").then((m) => m.DendrogramViz)) as ComponentType<VizProps>,
  DiffusionViz: dynamic(() => import("@/components/visualizations/Diffusion/DiffusionViz").then((m) => m.DiffusionViz)) as ComponentType<VizProps>,
  DistillationViz: dynamic(() => import("@/components/visualizations/Distillation/DistillationViz").then((m) => m.DistillationViz)) as ComponentType<VizProps>,
  DistributedTrainingViz: dynamic(() => import("@/components/visualizations/DistributedTraining/DistributedTrainingViz").then((m) => m.DistributedTrainingViz)) as ComponentType<VizProps>,
  DistributionViz: dynamic(() => import("@/components/visualizations/Distribution/DistributionViz").then((m) => m.DistributionViz)) as ComponentType<VizProps>,
  DSeparationViz: dynamic(() => import("@/components/visualizations/DSeparation/DSeparationViz").then((m) => m.DSeparationViz)) as ComponentType<VizProps>,
  EarlyStoppingViz: dynamic(() => import("@/components/visualizations/EarlyStopping/EarlyStoppingViz").then((m) => m.EarlyStoppingViz)) as ComponentType<VizProps>,
  EigenvectorViz: dynamic(() => import("@/components/visualizations/Eigenvector/EigenvectorViz").then((m) => m.EigenvectorViz)) as ComponentType<VizProps>,
  ExperienceReplayViz: dynamic(() => import("@/components/visualizations/ExperienceReplay/ExperienceReplayViz").then((m) => m.ExperienceReplayViz)) as ComponentType<VizProps>,
  FGSMViz: dynamic(() => import("@/components/visualizations/FGSM/FGSMViz").then((m) => m.FGSMViz)) as ComponentType<VizProps>,
  FunctionTangentViz: dynamic(() => import("@/components/visualizations/FunctionTangent/FunctionTangentViz").then((m) => m.FunctionTangentViz)) as ComponentType<VizProps>,
  GANTrainingViz: dynamic(() => import("@/components/visualizations/GANTraining/GANTrainingViz").then((m) => m.GANTrainingViz)) as ComponentType<VizProps>,
  GaussianProcessViz: dynamic(() => import("@/components/visualizations/GaussianProcess/GaussianProcessViz").then((m) => m.GaussianProcessViz)) as ComponentType<VizProps>,
  GenerativeVsDiscriminativeViz: dynamic(() => import("@/components/visualizations/GenerativeVsDiscriminative/GenerativeVsDiscriminativeViz").then((m) => m.GenerativeVsDiscriminativeViz)) as ComponentType<VizProps>,
  GMMResponsibilityViz: dynamic(() => import("@/components/visualizations/GMM/GMMResponsibilityViz").then((m) => m.GMMResponsibilityViz)) as ComponentType<VizProps>,
  GradientDescentViz: dynamic(() => import("@/components/visualizations/GradientDescent/GradientDescentViz").then((m) => m.GradientDescentViz)) as ComponentType<VizProps>,
  GradientFieldViz: dynamic(() => import("@/components/visualizations/GradientField/GradientFieldViz").then((m) => m.GradientFieldViz)) as ComponentType<VizProps>,
  GraphRAGViz: dynamic(() => import("@/components/visualizations/GraphRAG/GraphRAGViz").then((m) => m.GraphRAGViz)) as ComponentType<VizProps>,
  GridWorldViz: dynamic(() => import("@/components/visualizations/GridWorld/GridWorldViz").then((m) => m.GridWorldViz)) as ComponentType<VizProps>,
  HierarchicalForecastViz: dynamic(() => import("@/components/visualizations/HierarchicalForecast/HierarchicalForecastViz").then((m) => m.HierarchicalForecastViz)) as ComponentType<VizProps>,
  HMMViterbiViz: dynamic(() => import("@/components/visualizations/HMMViterbi/HMMViterbiViz").then((m) => m.HMMViterbiViz)) as ComponentType<VizProps>,
  HyperparamSearchViz: dynamic(() => import("@/components/visualizations/HyperparamSearch/HyperparamSearchViz").then((m) => m.HyperparamSearchViz)) as ComponentType<VizProps>,
  HypothesisTestViz: dynamic(() => import("@/components/visualizations/HypothesisTest/HypothesisTestViz").then((m) => m.HypothesisTestViz)) as ComponentType<VizProps>,
  KernelViz: dynamic(() => import("@/components/visualizations/KernelViz/KernelViz").then((m) => m.KernelViz)) as ComponentType<VizProps>,
  KLDivergenceViz: dynamic(() => import("@/components/visualizations/KLDivergence/KLDivergenceViz").then((m) => m.KLDivergenceViz)) as ComponentType<VizProps>,
  KMeansViz: dynamic(() => import("@/components/visualizations/KMeans/KMeansViz").then((m) => m.KMeansViz)) as ComponentType<VizProps>,
  KNNBoundaryViz: dynamic(() => import("@/components/visualizations/KNNBoundary/KNNBoundaryViz").then((m) => m.KNNBoundaryViz)) as ComponentType<VizProps>,
  LatencyCriticalPathViz: dynamic(() => import("@/components/visualizations/LatencyCriticalPath/LatencyCriticalPathViz").then((m) => m.LatencyCriticalPathViz)) as ComponentType<VizProps>,
  LatentSpaceViz: dynamic(() => import("@/components/visualizations/LatentSpace/LatentSpaceViz").then((m) => m.LatentSpaceViz)) as ComponentType<VizProps>,
  LinearRegressionViz: dynamic(() => import("@/components/visualizations/LinearRegression/LinearRegressionViz").then((m) => m.LinearRegressionViz)) as ComponentType<VizProps>,
  LoRAViz: dynamic(() => import("@/components/visualizations/LoRA/LoRAViz").then((m) => m.LoRAViz)) as ComponentType<VizProps>,
  LowRankViz: dynamic(() => import("@/components/visualizations/LowRank/LowRankViz").then((m) => m.LowRankViz)) as ComponentType<VizProps>,
  LSTMGateViz: dynamic(() => import("@/components/visualizations/LSTMGate/LSTMGateViz").then((m) => m.LSTMGateViz)) as ComponentType<VizProps>,
  MarginViz: dynamic(() => import("@/components/visualizations/Margin/MarginViz").then((m) => m.MarginViz)) as ComponentType<VizProps>,
  MatrixFactorizationViz: dynamic(() => import("@/components/visualizations/MatrixFactorization/MatrixFactorizationViz").then((m) => m.MatrixFactorizationViz)) as ComponentType<VizProps>,
  MatrixTransformViz: dynamic(() => import("@/components/visualizations/MatrixTransform/MatrixTransformViz").then((m) => m.MatrixTransformViz)) as ComponentType<VizProps>,
  MessagePassingViz: dynamic(() => import("@/components/visualizations/MessagePassing/MessagePassingViz").then((m) => m.MessagePassingViz)) as ComponentType<VizProps>,
  MLEViz: dynamic(() => import("@/components/visualizations/MLE/MLEViz").then((m) => m.MLEViz)) as ComponentType<VizProps>,
  MoERoutingViz: dynamic(() => import("@/components/visualizations/MoERouting/MoERoutingViz").then((m) => m.MoERoutingViz)) as ComponentType<VizProps>,
  NaiveBayesVotesViz: dynamic(() => import("@/components/visualizations/NaiveBayesVotes/NaiveBayesVotesViz").then((m) => m.NaiveBayesVotesViz)) as ComponentType<VizProps>,
  NeuralNetworkViz: dynamic(() => import("@/components/visualizations/NeuralNetwork/NeuralNetworkViz").then((m) => m.NeuralNetworkViz)) as ComponentType<VizProps>,
  OnlineRegretViz: dynamic(() => import("@/components/visualizations/OnlineRegret/OnlineRegretViz").then((m) => m.OnlineRegretViz)) as ComponentType<VizProps>,
  OptimizerPathViz: dynamic(() => import("@/components/visualizations/OptimizerPath/OptimizerPathViz").then((m) => m.OptimizerPathViz)) as ComponentType<VizProps>,
  OverSmoothingViz: dynamic(() => import("@/components/visualizations/OverSmoothing/OverSmoothingViz").then((m) => m.OverSmoothingViz)) as ComponentType<VizProps>,
  PCAReconstructionViz: dynamic(() => import("@/components/visualizations/PCAReconstruction/PCAReconstructionViz").then((m) => m.PCAReconstructionViz)) as ComponentType<VizProps>,
  PCAViz: dynamic(() => import("@/components/visualizations/PCA/PCAViz").then((m) => m.PCAViz)) as ComponentType<VizProps>,
  PerplexityViz: dynamic(() => import("@/components/visualizations/Perplexity/PerplexityViz").then((m) => m.PerplexityViz)) as ComponentType<VizProps>,
  PolicyGradientViz: dynamic(() => import("@/components/visualizations/PolicyGradient/PolicyGradientViz").then((m) => m.PolicyGradientViz)) as ComponentType<VizProps>,
  PoolingViz: dynamic(() => import("@/components/visualizations/Pooling/PoolingViz").then((m) => m.PoolingViz)) as ComponentType<VizProps>,
  PositionalEncodingViz: dynamic(() => import("@/components/visualizations/PositionalEncoding/PositionalEncodingViz").then((m) => m.PositionalEncodingViz)) as ComponentType<VizProps>,
  PreferenceTuningViz: dynamic(() => import("@/components/visualizations/PreferenceTuning/PreferenceTuningViz").then((m) => m.PreferenceTuningViz)) as ComponentType<VizProps>,
  ProjectLoopViz: dynamic(() => import("@/components/visualizations/ProjectLoop/ProjectLoopViz").then((m) => m.ProjectLoopViz)) as ComponentType<VizProps>,
  QTableViz: dynamic(() => import("@/components/visualizations/QTable/QTableViz").then((m) => m.QTableViz)) as ComponentType<VizProps>,
  QuantizationViz: dynamic(() => import("@/components/visualizations/Quantization/QuantizationViz").then((m) => m.QuantizationViz)) as ComponentType<VizProps>,
  RAGArchitectureViz: dynamic(() => import("@/components/visualizations/RAGArchitecture/RAGArchitectureViz").then((m) => m.RAGArchitectureViz)) as ComponentType<VizProps>,
  RAGRetrievalViz: dynamic(() => import("@/components/visualizations/RAGRetrieval/RAGRetrievalViz").then((m) => m.RAGRetrievalViz)) as ComponentType<VizProps>,
  RankingMetricsViz: dynamic(() => import("@/components/visualizations/RankingMetrics/RankingMetricsViz").then((m) => m.RankingMetricsViz)) as ComponentType<VizProps>,
  ReceptiveFieldViz: dynamic(() => import("@/components/visualizations/ReceptiveField/ReceptiveFieldViz").then((m) => m.ReceptiveFieldViz)) as ComponentType<VizProps>,
  RegularizationPathViz: dynamic(() => import("@/components/visualizations/RegularizationPath/RegularizationPathViz").then((m) => m.RegularizationPathViz)) as ComponentType<VizProps>,
  ReservoirSamplingViz: dynamic(() => import("@/components/visualizations/ReservoirSampling/ReservoirSamplingViz").then((m) => m.ReservoirSamplingViz)) as ComponentType<VizProps>,
  RewardModelViz: dynamic(() => import("@/components/visualizations/RewardModel/RewardModelViz").then((m) => m.RewardModelViz)) as ComponentType<VizProps>,
  RNNUnrollViz: dynamic(() => import("@/components/visualizations/RNNUnroll/RNNUnrollViz").then((m) => m.RNNUnrollViz)) as ComponentType<VizProps>,
  RolloutViz: dynamic(() => import("@/components/visualizations/Rollout/RolloutViz").then((m) => m.RolloutViz)) as ComponentType<VizProps>,
  RooflineViz: dynamic(() => import("@/components/visualizations/Roofline/RooflineViz").then((m) => m.RooflineViz)) as ComponentType<VizProps>,
  SamplingDistributionViz: dynamic(() => import("@/components/visualizations/SamplingDistribution/SamplingDistributionViz").then((m) => m.SamplingDistributionViz)) as ComponentType<VizProps>,
  SamplingStrategiesViz: dynamic(() => import("@/components/visualizations/SamplingStrategies/SamplingStrategiesViz").then((m) => m.SamplingStrategiesViz)) as ComponentType<VizProps>,
  SamplingViz: dynamic(() => import("@/components/visualizations/Sampling/SamplingViz").then((m) => m.SamplingViz)) as ComponentType<VizProps>,
  ScalingLawViz: dynamic(() => import("@/components/visualizations/ScalingLaw/ScalingLawViz").then((m) => m.ScalingLawViz)) as ComponentType<VizProps>,
  SilhouetteViz: dynamic(() => import("@/components/visualizations/Silhouette/SilhouetteViz").then((m) => m.SilhouetteViz)) as ComponentType<VizProps>,
  SimpsonsParadoxViz: dynamic(() => import("@/components/visualizations/SimpsonsParadox/SimpsonsParadoxViz").then((m) => m.SimpsonsParadoxViz)) as ComponentType<VizProps>,
  SoftMarginViz: dynamic(() => import("@/components/visualizations/SoftMargin/SoftMarginViz").then((m) => m.SoftMarginViz)) as ComponentType<VizProps>,
  StorageLayoutViz: dynamic(() => import("@/components/visualizations/StorageLayout/StorageLayoutViz").then((m) => m.StorageLayoutViz)) as ComponentType<VizProps>,
  ThresholdSweepViz: dynamic(() => import("@/components/visualizations/ThresholdSweep/ThresholdSweepViz").then((m) => m.ThresholdSweepViz)) as ComponentType<VizProps>,
  TraceWaterfallViz: dynamic(() => import("@/components/visualizations/TraceWaterfall/TraceWaterfallViz").then((m) => m.TraceWaterfallViz)) as ComponentType<VizProps>,
  TransferLearningViz: dynamic(() => import("@/components/visualizations/TransferLearning/TransferLearningViz").then((m) => m.TransferLearningViz)) as ComponentType<VizProps>,
  TransformerBlockViz: dynamic(() => import("@/components/visualizations/TransformerBlock/TransformerBlockViz").then((m) => m.TransformerBlockViz)) as ComponentType<VizProps>,
  ValidationSplitViz: dynamic(() => import("@/components/visualizations/ValidationSplit/ValidationSplitViz").then((m) => m.ValidationSplitViz)) as ComponentType<VizProps>,
  VanishingGradientViz: dynamic(() => import("@/components/visualizations/VanishingGradient/VanishingGradientViz").then((m) => m.VanishingGradientViz)) as ComponentType<VizProps>,
  VCDimensionViz: dynamic(() => import("@/components/visualizations/VCDimension/VCDimensionViz").then((m) => m.VCDimensionViz)) as ComponentType<VizProps>,
  VectorViz: dynamic(() => import("@/components/visualizations/Vector/VectorViz").then((m) => m.VectorViz)) as ComponentType<VizProps>,
  WordAnalogyViz: dynamic(() => import("@/components/visualizations/WordAnalogy/WordAnalogyViz").then((m) => m.WordAnalogyViz)) as ComponentType<VizProps>,
};

export function LazyViz({ name, ...props }: { name: string } & VizProps) {
  const Component = VIZ[name];
  if (!Component) {
    return (
      <div className="not-prose card-glass my-6 p-4 text-sm text-accent-rose">
        Unknown visualization: <code className="font-mono">{name}</code>
      </div>
    );
  }
  return <Component {...props} />;
}
