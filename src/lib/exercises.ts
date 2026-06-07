import type { Exercise } from "@/types/exercise";

/**
 * Central exercise registry.
 *
 * Lesson MDX references exercises by id — `<Exercise id="..." />` — rather than
 * passing an inline object. This keeps lesson MDX free of JavaScript
 * expressions so it can be rendered with `next-mdx-remote`'s `blockJS: true`
 * (the secure default that prevents arbitrary code execution from MDX content).
 *
 * To add an exercise: append a typed entry below and reference its `id` from a
 * lesson. Ids must be unique across the whole site.
 */
const allExercises: Exercise[] = [
  // ── Neural Networks ─────────────────────────────────────────────
  {
    id: "neuron-weights-quiz",
    type: "multiple-choice",
    question:
      "A neuron has weights [2, -1, 0.5] and bias 1. Its inputs are [1, 1, 1]. What is the pre-activation value?",
    hint: "Compute the dot product w·x + b.",
    explanation:
      "2×1 + (−1)×1 + 0.5×1 + 1 = 2.5. The bias shifts the total regardless of input.",
    options: [
      { id: "a", label: "1.5", isCorrect: false },
      { id: "b", label: "2.5", isCorrect: true },
      { id: "c", label: "3.5", isCorrect: false },
      { id: "d", label: "0.5", isCorrect: false },
    ],
  },
  {
    id: "neuron-activation",
    type: "multiple-choice",
    question:
      "Which activation function outputs values in the range (-1, 1)?",
    hint: "Think about which function is centered at zero.",
    explanation:
      "Tanh outputs values strictly between -1 and 1, centered at zero. Sigmoid outputs (0, 1). ReLU outputs [0, ∞).",
    options: [
      { id: "a", label: "Sigmoid", isCorrect: false },
      { id: "b", label: "ReLU", isCorrect: false },
      { id: "c", label: "Tanh", isCorrect: true },
      { id: "d", label: "Softmax", isCorrect: false },
    ],
  },
  {
    id: "neuron-universal",
    type: "multiple-choice",
    question:
      "The universal approximation theorem states that a single hidden layer can approximate any continuous function. Why do we still use deep networks?",
    hint: "Think about efficiency and parameter count.",
    explanation:
      "Deep networks are more parameter-efficient. A single wide layer might need exponentially many neurons, while a deep network learns hierarchical features with far fewer parameters.",
    options: [
      { id: "a", label: "Deep networks are always more accurate", isCorrect: false },
      { id: "b", label: "Deep networks are more parameter-efficient", isCorrect: true },
      { id: "c", label: "Single layers can't approximate all functions", isCorrect: false },
      { id: "d", label: "Deep networks train faster", isCorrect: false },
    ],
  },
  {
    id: "lr-effect",
    type: "slider",
    question:
      "What learning rate is generally a good starting point for gradient descent?",
    hint: "Think about the scale: 0.001, 0.01, 0.1, or 10?",
    explanation:
      "0.01 is a common safe default. Values like 0.001 are conservative but stable; 0.1+ can be unstable without careful tuning.",
    min: 0.0001,
    max: 1.0,
    step: 0.0001,
    correctRange: [0.001, 0.1],
    unit: "",
  },
  {
    id: "gd-step",
    type: "multiple-choice",
    question:
      "If the loss is L(w) = (w - 5)² and the current weight is w = 2, what is the gradient?",
    hint: "Take the derivative of L with respect to w.",
    explanation:
      "dL/dw = 2(w - 5) = 2(2 - 5) = -6. The negative gradient means we should increase w to reduce the loss.",
    options: [
      { id: "a", label: "-6", isCorrect: true },
      { id: "b", label: "6", isCorrect: false },
      { id: "c", label: "-3", isCorrect: false },
      { id: "d", label: "3", isCorrect: false },
    ],
  },
  {
    id: "optimizer-choice",
    type: "multiple-choice",
    question:
      "Which optimizer adapts the learning rate per parameter and includes momentum?",
    hint: "It's the most popular optimizer in deep learning.",
    explanation:
      "Adam combines adaptive learning rates (per-parameter) with momentum. It's the default choice for most deep learning tasks.",
    options: [
      { id: "a", label: "SGD", isCorrect: false },
      { id: "b", label: "Adam", isCorrect: true },
      { id: "c", label: "Adagrad", isCorrect: false },
      { id: "d", label: "RMSProp", isCorrect: false },
    ],
  },
  // ── Linear & Logistic Regression ──────────────────────────────
  {
    id: "ols-formula",
    type: "multiple-choice",
    question:
      "What is the closed-form solution for Ordinary Least Squares regression?",
    hint: "It involves the inverse of X^T X.",
    explanation:
      "The OLS solution is w* = (X^T X)^{-1} X^T y. It minimizes the sum of squared residuals by setting the gradient of the loss to zero.",
    options: [
      { id: "a", label: "w* = (X^T X)^{-1} X^T y", isCorrect: true },
      { id: "b", label: "w* = X^T (X X^T)^{-1} y", isCorrect: false },
      { id: "c", label: "w* = (X^T y)^{-1} X^T X", isCorrect: false },
      { id: "d", label: "w* = X y (X^T X)^{-1}", isCorrect: false },
    ],
  },
  {
    id: "ridge-vs-lasso",
    type: "multiple-choice",
    question:
      "Which regularization method can set feature weights exactly to zero?",
    hint: "Think about the shape of the constraint region.",
    explanation:
      "Lasso (L1) regularization can set weights to exactly zero because its diamond-shaped constraint region has corners on the axes, allowing the solution to land there. Ridge (L2) shrinks weights but never to exactly zero.",
    options: [
      { id: "a", label: "Ridge (L2) regularization", isCorrect: false },
      { id: "b", label: "Lasso (L1) regularization", isCorrect: true },
      { id: "c", label: "Both Ridge and Lasso", isCorrect: false },
      { id: "d", label: "Neither — both keep all features", isCorrect: false },
    ],
  },
  {
    id: "ols-worked-example",
    type: "multiple-choice",
    question:
      "Given X = [[1,1],[1,2],[1,3]] and y = [2,3,5], what is w* for OLS?",
    hint: "Compute w* = (X^T X)^{-1} X^T y.",
    explanation:
      "X^T X = [[3,6],[6,14]], X^T y = [10,23]. (X^T X)^{-1} = (1/6)[[14,-6],[-6,3]]. w* = [0.33, 1.5]. The slope is 1.5 — each unit increase in x increases y by 1.5.",
    options: [
      { id: "a", label: "[0.33, 1.5]", isCorrect: true },
      { id: "b", label: "[1.5, 0.33]", isCorrect: false },
      { id: "c", label: "[2, 1]", isCorrect: false },
      { id: "d", label: "[1, 2]", isCorrect: false },
    ],
  },
  {
    id: "sigmoid-range",
    type: "multiple-choice",
    question:
      "What is the output range of the sigmoid function σ(z) = 1 / (1 + e^{-z})?",
    hint: "The sigmoid squashes any real number into a bounded range.",
    explanation:
      "The sigmoid outputs values strictly between 0 and 1, making it suitable for representing probabilities. As z → +∞, σ(z) → 1. As z → -∞, σ(z) → 0.",
    options: [
      { id: "a", label: "(-∞, +∞)", isCorrect: false },
      { id: "b", label: "[0, 1]", isCorrect: true },
      { id: "c", label: "[-1, 1]", isCorrect: false },
      { id: "d", label: "(0, +∞)", isCorrect: false },
    ],
  },
  {
    id: "cross-entropy-penalty",
    type: "multiple-choice",
    question:
      "If a logistic regression model predicts P(y=1) = 0.01 for a positive example, what is the cross-entropy loss for that example?",
    hint: "Use the formula: -log(ŷ) for positive examples.",
    explanation:
      "For a positive example (y=1), the loss is -log(0.01) ≈ 4.6. Cross-entropy heavily penalizes confident wrong predictions.",
    options: [
      { id: "a", label: "0.01", isCorrect: false },
      { id: "b", label: "0.99", isCorrect: false },
      { id: "c", label: "≈ 4.6", isCorrect: true },
      { id: "d", label: "≈ 2.3", isCorrect: false },
    ],
  },
  {
    id: "logistic-decision-boundary",
    type: "multiple-choice",
    question:
      "In logistic regression, the decision boundary is defined by w^T x + b = 0. What shape is this boundary?",
    hint: "Think about the geometry in the feature space.",
    explanation:
      "The decision boundary is a hyperplane (line in 2D, plane in 3D). Logistic regression can only learn linear decision boundaries — it fails on non-linearly separable data like XOR.",
    options: [
      { id: "a", label: "A circle", isCorrect: false },
      { id: "b", label: "A hyperplane", isCorrect: true },
      { id: "c", label: "A parabola", isCorrect: false },
      { id: "d", label: "Any shape", isCorrect: false },
    ],
  },
  // ── KNN & Decision Trees ─────────────────────────────────────
  {
    id: "knn-k-choice",
    type: "multiple-choice",
    question:
      "What happens to KNN's decision boundary as k increases?",
    hint: "Think about what k=n (the largest possible k) would predict.",
    explanation:
      "As k increases, the decision boundary becomes smoother (less flexible). At k=n, KNN always predicts the majority class, creating no boundary at all. Small k gives very jagged, complex boundaries.",
    options: [
      { id: "a", label: "It becomes more complex and jagged", isCorrect: false },
      { id: "b", label: "It becomes smoother and simpler", isCorrect: true },
      { id: "c", label: "It stays the same", isCorrect: false },
      { id: "d", label: "It disappears entirely for all values of k", isCorrect: false },
    ],
  },
  {
    id: "knn-distance-metric",
    type: "multiple-choice",
    question:
      "Why must you standardize features before using KNN?",
    hint: "Think about how distance is computed.",
    explanation:
      "KNN uses Euclidean distance, which is dominated by features with larger ranges. A feature measured in millimeters (0-10000) overwhelms one in meters (0-10) without standardization.",
    options: [
      { id: "a", label: "KNN requires normalized probabilities", isCorrect: false },
      { id: "b", label: "Distance metrics are dominated by large-scale features", isCorrect: true },
      { id: "c", label: "Standardization speeds up training", isCorrect: false },
      { id: "d", label: "KNN only works with standardized data by definition", isCorrect: false },
    ],
  },
  {
    id: "knn-curse",
    type: "multiple-choice",
    question:
      "In high dimensions (d → ∞), what happens to the ratio (d_max - d_min) / d_min for KNN?",
    hint: "Think about what 'nearest' means when all distances are similar.",
    explanation:
      "As dimensions increase, all points become approximately equidistant. The ratio approaches 0, meaning 'nearest' loses meaning. This is the curse of dimensionality.",
    options: [
      { id: "a", label: "It approaches infinity", isCorrect: false },
      { id: "b", label: "It approaches 0", isCorrect: true },
      { id: "c", label: "It stays constant", isCorrect: false },
      { id: "d", label: "It oscillates", isCorrect: false },
    ],
  },
  {
    id: "gini-calculation",
    type: "multiple-choice",
    question:
      "A node has 60 positive and 40 negative examples. What is the Gini impurity?",
    hint: "Gini = 1 - Σ p_k². Here p_pos = 0.6, p_neg = 0.4.",
    explanation:
      "Gini = 1 - (0.6² + 0.4²) = 1 - (0.36 + 0.16) = 1 - 0.52 = 0.48. A pure node has Gini = 0; a 50/50 split has Gini = 0.5.",
    options: [
      { id: "a", label: "0.24", isCorrect: false },
      { id: "b", label: "0.48", isCorrect: true },
      { id: "c", label: "0.52", isCorrect: false },
      { id: "d", label: "0.60", isCorrect: false },
    ],
  },
  {
    id: "information-gain",
    type: "multiple-choice",
    question:
      "Information gain is computed as the reduction in what after a split?",
    hint: "It measures the decrease in uncertainty.",
    explanation:
      "Information gain = H(parent) - Σ (n_i/n) H(child_i), where H is entropy. It measures the reduction in entropy (uncertainty) after splitting on a feature.",
    options: [
      { id: "a", label: "Gini impurity", isCorrect: false },
      { id: "b", label: "Variance", isCorrect: false },
      { id: "c", label: "Entropy", isCorrect: true },
      { id: "d", label: "Mean squared error", isCorrect: false },
    ],
  },
  {
    id: "tree-pruning",
    type: "multiple-choice",
    question:
      "What is the main reason to prune a decision tree?",
    hint: "Think about what happens to an unpruned tree on test data.",
    explanation:
      "Pruning reduces overfitting. An unpruned tree grows until every leaf is pure, memorizing training noise. Pruning removes branches that don't improve generalization.",
    options: [
      { id: "a", label: "To increase training accuracy", isCorrect: false },
      { id: "b", label: "To reduce overfitting", isCorrect: true },
      { id: "c", label: "To make the tree deeper", isCorrect: false },
      { id: "d", label: "To reduce training time", isCorrect: false },
    ],
  },
  // ── CNNs ─────────────────────────────────────────────────────
  {
    id: "conv-output-size",
    type: "multiple-choice",
    question:
      "A 32×32 input with a 5×5 filter, stride 2, and padding 2 produces what output size?",
    hint: "Use the formula: out = floor((n - f + 2p) / s) + 1.",
    explanation:
      "out = floor((32 - 5 + 4) / 2) + 1 = floor(31/2) + 1 = 15 + 1 = 16. The output is 16×16.",
    options: [
      { id: "a", label: "28×28", isCorrect: false },
      { id: "b", label: "16×16", isCorrect: true },
      { id: "c", label: "14×14", isCorrect: false },
      { id: "d", label: "32×32", isCorrect: false },
    ],
  },
  {
    id: "conv-params",
    type: "multiple-choice",
    question:
      "A conv layer has 64 input channels, 128 output channels, and 3×3 filters. How many parameters does it have?",
    hint: "Parameters = C_in × C_out × f × f + C_out (bias).",
    explanation:
      "64 × 128 × 3 × 3 + 128 = 73,856. This is much less than a fully connected layer: 64×128 = 8,192 neurons would need millions of parameters.",
    options: [
      { id: "a", label: "73,856", isCorrect: true },
      { id: "b", label: "8,192", isCorrect: false },
      { id: "c", label: "24,576", isCorrect: false },
      { id: "d", label: "368,640", isCorrect: false },
    ],
  },
  {
    id: "conv-receptive-field",
    type: "multiple-choice",
    question:
      "Two stacked 3×3 conv layers have the same receptive field as one layer of what size?",
    hint: "Each layer adds to the receptive field.",
    explanation:
      "Two 3×3 layers have a 5×5 receptive field. Three 3×3 layers have a 7×7 receptive field. This is why modern networks use small filters — same receptive field with fewer parameters and more non-linearity.",
    options: [
      { id: "a", label: "3×3", isCorrect: false },
      { id: "b", label: "5×5", isCorrect: true },
      { id: "c", label: "6×6", isCorrect: false },
      { id: "d", label: "9×9", isCorrect: false },
    ],
  },
  {
    id: "pooling-output",
    type: "multiple-choice",
    question:
      "What does max pooling with a 2×2 window and stride 2 do to the spatial dimensions?",
    hint: "Think about how many non-overlapping windows fit.",
    explanation:
      "Max pooling with 2×2 window and stride 2 halves both spatial dimensions. A 28×28 feature map becomes 14×14. It retains the strongest activation in each region.",
    options: [
      { id: "a", label: "Doubles the dimensions", isCorrect: false },
      { id: "b", label: "Halves the dimensions", isCorrect: true },
      { id: "c", label: "Keeps dimensions the same", isCorrect: false },
      { id: "d", label: "Reduces to 1×1", isCorrect: false },
    ],
  },
  {
    id: "resnet-skip",
    type: "multiple-choice",
    question:
      "What problem do skip connections in ResNets solve?",
    hint: "Think about what happens to gradients in very deep networks.",
    explanation:
      "Skip connections solve the vanishing gradient problem. They create 'gradient highways' that let errors flow directly to early layers, enabling training of 100+ layer networks.",
    options: [
      { id: "a", label: "They increase model capacity", isCorrect: false },
      { id: "b", label: "They solve the vanishing gradient problem", isCorrect: true },
      { id: "c", label: "They reduce the number of parameters", isCorrect: false },
      { id: "d", label: "They replace batch normalization", isCorrect: false },
    ],
  },
  {
    id: "arch-comparison",
    type: "multiple-choice",
    question:
      "Which architecture introduced the concept of skip connections?",
    hint: "It enabled training networks with 152+ layers.",
    explanation:
      "ResNet (2015) introduced skip connections, enabling training of very deep networks. Before ResNet, networks deeper than ~20 layers were impossible to train.",
    options: [
      { id: "a", label: "AlexNet", isCorrect: false },
      { id: "b", label: "VGGNet", isCorrect: false },
      { id: "c", label: "ResNet", isCorrect: true },
      { id: "d", label: "LeNet", isCorrect: false },
    ],
  },
  {
    id: "transfer-learning-strategy",
    type: "multiple-choice",
    question:
      "You have only 200 medical images. What's the best transfer learning strategy?",
    hint: "Think about how much data you need to fine-tune vs freeze.",
    explanation:
      "With only 200 images, fine-tuning many layers would overfit. Feature extraction (freezing the pretrained layers, training only a new classifier on top) is the safest approach.",
    options: [
      { id: "a", label: "Train from scratch", isCorrect: false },
      { id: "b", label: "Fine-tune all layers", isCorrect: false },
      { id: "c", label: "Feature extraction — freeze pretrained layers, train only the classifier", isCorrect: true },
      { id: "d", label: "Use a larger pretrained model", isCorrect: false },
    ],
  },
  {
    id: "transfer-lr",
    type: "multiple-choice",
    question:
      "When fine-tuning a pretrained CNN, what learning rate should you use?",
    hint: "The pretrained weights are already good — you don't want to destroy them.",
    explanation:
      "Use a learning rate 10-100× smaller than training from scratch (e.g., 1e-4 to 1e-5). Large updates will destroy the pretrained features that are already useful.",
    options: [
      { id: "a", label: "10× larger than usual", isCorrect: false },
      { id: "b", label: "10-100× smaller than usual", isCorrect: true },
      { id: "c", label: "The same as training from scratch", isCorrect: false },
      { id: "d", label: "Zero — frozen layers don't need learning rate", isCorrect: false },
    ],
  },
  {
    id: "transfer-freeze",
    type: "multiple-choice",
    question:
      "In transfer learning, which layers are most task-specific and should be fine-tuned first?",
    hint: "Think about what early vs late layers detect.",
    explanation:
      "Late layers are task-specific (detecting specific objects), while early layers detect universal features (edges, textures). Fine-tune late layers first, then earlier layers if needed.",
    options: [
      { id: "a", label: "Early layers (edges, textures)", isCorrect: false },
      { id: "b", label: "Late layers (task-specific features)", isCorrect: true },
      { id: "c", label: "All layers equally", isCorrect: false },
      { id: "d", label: "Only the classifier head", isCorrect: false },
    ],
  },
  // ── SVM ──────────────────────────────────────────────────────
  {
    id: "margin-calculation",
    type: "multiple-choice",
    question:
      "If the weight vector is w = [3, 4], what is the margin of the SVM?",
    hint: "Margin = 2 / ||w||.",
    explanation:
      "||w|| = sqrt(3² + 4²) = 5. Margin = 2/5 = 0.4. The margin is inversely proportional to the norm of the weight vector.",
    options: [
      { id: "a", label: "0.4", isCorrect: true },
      { id: "b", label: "2.5", isCorrect: false },
      { id: "c", label: "5", isCorrect: false },
      { id: "d", label: "0.2", isCorrect: false },
    ],
  },
  {
    id: "svm-c-parameter",
    type: "multiple-choice",
    question:
      "In a soft margin SVM, what happens when you increase C?",
    hint: "C controls the tradeoff between margin width and misclassification.",
    explanation:
      "Increasing C penalizes misclassification more, resulting in a narrower margin with fewer violations. Decreasing C allows more violations for a wider margin (more regularization).",
    options: [
      { id: "a", label: "Wider margin, more violations", isCorrect: false },
      { id: "b", label: "Narrower margin, fewer violations", isCorrect: true },
      { id: "c", label: "No effect on the margin", isCorrect: false },
      { id: "d", label: "More support vectors", isCorrect: false },
    ],
  },
  {
    id: "svm-scaling",
    type: "multiple-choice",
    question:
      "Why must you scale features before using an SVM?",
    hint: "Think about how SVM computes distances.",
    explanation:
      "SVMs compute distances (via kernels). Features with larger ranges dominate the distance metric, distorting the margin. Always standardize features.",
    options: [
      { id: "a", label: "SVM requires probabilities as input", isCorrect: false },
      { id: "b", label: "Distance-based computations are sensitive to feature scales", isCorrect: true },
      { id: "c", label: "Scaling makes the kernel trick work", isCorrect: false },
      { id: "d", label: "It's only necessary for linear SVM", isCorrect: false },
    ],
  },
  {
    id: "kernel-computation",
    type: "multiple-choice",
    question:
      "What is the RBF kernel value K(x₁, x₂) when the two points are identical?",
    hint: "K(x, x) = exp(-||x-x||² / 2σ²).",
    explanation:
      "When x₁ = x₂, the distance is 0, so K = exp(0) = 1. The RBF kernel outputs 1 for identical points and approaches 0 for distant points.",
    options: [
      { id: "a", label: "0", isCorrect: false },
      { id: "b", label: "0.5", isCorrect: false },
      { id: "c", label: "1", isCorrect: true },
      { id: "d", label: "σ²", isCorrect: false },
    ],
  },
  {
    id: "kernel-choice",
    type: "multiple-choice",
    question:
      "When should you use a linear kernel instead of RBF?",
    hint: "Think about high-dimensional data with many features.",
    explanation:
      "Use linear kernel when d > n (more features than samples) or when data is already linearly separable. In high dimensions, all points become equidistant, making RBF ineffective.",
    options: [
      { id: "a", label: "Always — linear is simpler", isCorrect: false },
      { id: "b", label: "When d > n (more features than samples)", isCorrect: true },
      { id: "c", label: "When you need non-linear boundaries", isCorrect: false },
      { id: "d", label: "When the dataset is very small", isCorrect: false },
    ],
  },
  {
    id: "kernel-gamma",
    type: "multiple-choice",
    question:
      "In an RBF kernel, what does increasing gamma do?",
    hint: "Gamma controls the 'reach' of each training example.",
    explanation:
      "High gamma means each example only influences its immediate neighborhood, creating a complex, jagged boundary. Low gamma means each example influences a wide region, creating a smooth boundary.",
    options: [
      { id: "a", label: "Smoother decision boundary", isCorrect: false },
      { id: "b", label: "More complex, jagged decision boundary", isCorrect: true },
      { id: "c", label: "Wider margin", isCorrect: false },
      { id: "d", label: "Fewer support vectors", isCorrect: false },
    ],
  },
  // ── Ensemble Methods ─────────────────────────────────────────
  {
    id: "bagging-variance",
    type: "multiple-choice",
    question:
      "What does bagging primarily reduce in a model?",
    hint: "Bagging averages multiple models trained on different subsets.",
    explanation:
      "Bagging reduces variance by averaging multiple high-variance models (like deep decision trees). It doesn't reduce bias — each individual model still has the same bias. Boosting is what reduces bias.",
    options: [
      { id: "a", label: "Bias", isCorrect: false },
      { id: "b", label: "Variance", isCorrect: true },
      { id: "c", label: "Both bias and variance equally", isCorrect: false },
      { id: "d", label: "Neither — it only reduces computational cost", isCorrect: false },
    ],
  },
  {
    id: "rf-feature-importance",
    type: "multiple-choice",
    question:
      "How does permutation importance measure feature importance?",
    hint: "It measures what happens when you shuffle a feature.",
    explanation:
      "Permutation importance shuffles each feature's values and measures how much the model's accuracy drops. A large drop means the model relied heavily on that feature.",
    options: [
      { id: "a", label: "By counting how often a feature appears in splits", isCorrect: false },
      { id: "b", label: "By measuring accuracy drop when a feature is randomly shuffled", isCorrect: true },
      { id: "c", label: "By computing the correlation with the target", isCorrect: false },
      { id: "d", label: "By looking at the weight magnitude in the model", isCorrect: false },
    ],
  },
  {
    id: "rf-oob",
    type: "multiple-choice",
    question:
      "What percentage of training samples are left out of each bootstrap sample in bagging?",
    hint: "Each bootstrap sample draws n samples with replacement from n total.",
    explanation:
      "Approximately 37% of samples are left out (OOB) in each bootstrap sample. These can be used for validation without needing a separate validation set.",
    options: [
      { id: "a", label: "~10%", isCorrect: false },
      { id: "b", label: "~37%", isCorrect: true },
      { id: "c", label: "~50%", isCorrect: false },
      { id: "d", label: "~63%", isCorrect: false },
    ],
  },
  {
    id: "boosting-vs-bagging",
    type: "multiple-choice",
    question:
      "What is the key difference between boosting and bagging?",
    hint: "Think about whether learners are trained independently or sequentially.",
    explanation:
      "Boosting trains learners sequentially, each correcting the previous one's errors (reduces bias). Bagging trains learners independently on random subsets and averages them (reduces variance).",
    options: [
      { id: "a", label: "Boosting is faster", isCorrect: false },
      { id: "b", label: "Boosting reduces bias; bagging reduces variance", isCorrect: true },
      { id: "c", label: "Bagging uses weaker learners", isCorrect: false },
      { id: "d", label: "Boosting trains models in parallel", isCorrect: false },
    ],
  },
  {
    id: "learning-rate-tradeoff",
    type: "multiple-choice",
    question:
      "In gradient boosting, what happens if you decrease the learning rate?",
    hint: "Think about how many trees you'd need to compensate.",
    explanation:
      "A smaller learning rate means each tree contributes less, so you need more trees to achieve the same training performance. But it generally leads to better generalization — lower learning rate + more trees is usually better.",
    options: [
      { id: "a", label: "You need fewer trees but get worse results", isCorrect: false },
      { id: "b", label: "You need more trees but typically get better generalization", isCorrect: true },
      { id: "c", label: "The model trains faster", isCorrect: false },
      { id: "d", label: "No effect — learning rate only affects speed", isCorrect: false },
    ],
  },
  {
    id: "xgb-tuning",
    type: "multiple-choice",
    question:
      "Which XGBoost hyperparameter is most important to tune first?",
    hint: "Think about the bias-variance tradeoff.",
    explanation:
      "max_depth controls tree complexity and is the most important hyperparameter. Too deep = overfitting, too shallow = underfitting. Start with max_depth=3-8, then tune learning_rate and n_estimators.",
    options: [
      { id: "a", label: "max_depth", isCorrect: true },
      { id: "b", label: "subsample", isCorrect: false },
      { id: "c", label: "colsample_bytree", isCorrect: false },
      { id: "d", label: "gamma", isCorrect: false },
    ],
  },
  // ── Clustering ───────────────────────────────────────────────
  {
    id: "kmeans-iteration",
    type: "multiple-choice",
    question:
      "In K-Means, which step is guaranteed to decrease the inertia at each iteration?",
    hint: "One step is assignment, the other is updating centroids.",
    explanation:
      "Both steps decrease inertia, but the update step (recomputing centroids as means) is guaranteed to be optimal for fixed assignments. The assignment step (nearest centroid) also decreases inertia. The algorithm monotonically decreases the total objective.",
    options: [
      { id: "a", label: "Only the assignment step", isCorrect: false },
      { id: "b", label: "Only the update step", isCorrect: false },
      { id: "c", label: "Both steps guarantee decrease", isCorrect: true },
      { id: "d", label: "Neither — K-Means can increase inertia", isCorrect: false },
    ],
  },
  {
    id: "choosing-k",
    type: "multiple-choice",
    question:
      "What does the 'elbow method' look for when choosing K in K-Means?",
    hint: "Plot inertia vs K and look for a change in slope.",
    explanation:
      "The elbow method plots inertia vs K and looks for the point where adding more clusters gives diminishing returns — the 'elbow' in the curve. This suggests the natural number of clusters.",
    options: [
      { id: "a", label: "The K with the highest inertia", isCorrect: false },
      { id: "b", label: "The point where adding clusters gives diminishing returns", isCorrect: true },
      { id: "c", label: "The K with the most equal cluster sizes", isCorrect: false },
      { id: "d", label: "The K closest to the square root of n", isCorrect: false },
    ],
  },
  {
    id: "kmeans-scaling",
    type: "multiple-choice",
    question:
      "Why must you standardize features before K-Means?",
    hint: "K-Means uses Euclidean distance.",
    explanation:
      "K-Means uses Euclidean distance, which is dominated by features with larger scales. A feature in dollars (0-100000) overwhelms one in years (0-100). Always standardize.",
    options: [
      { id: "a", label: "K-Means requires probabilities", isCorrect: false },
      { id: "b", label: "Euclidean distance is sensitive to feature scales", isCorrect: true },
      { id: "c", label: "Standardization speeds up convergence", isCorrect: false },
      { id: "d", label: "It's only necessary for DBSCAN", isCorrect: false },
    ],
  },
  {
    id: "dbscan-parameters",
    type: "multiple-choice",
    question:
      "What does the 'eps' parameter in DBSCAN control?",
    hint: "It defines a neighborhood around each point.",
    explanation:
      "eps defines the radius of the neighborhood around each point. Points within eps distance are considered neighbors. Core points need at least min_samples neighbors within this radius.",
    options: [
      { id: "a", label: "The number of clusters to find", isCorrect: false },
      { id: "b", label: "The radius of the neighborhood around each point", isCorrect: true },
      { id: "c", label: "The minimum number of clusters", isCorrect: false },
      { id: "d", label: "The maximum depth of the cluster tree", isCorrect: false },
    ],
  },
  {
    id: "hierarchical-linkage",
    type: "multiple-choice",
    question:
      "In hierarchical clustering, which linkage method is most sensitive to outliers?",
    hint: "Think about which method uses the maximum distance.",
    explanation:
      "Complete linkage uses the maximum distance between any two points in different clusters. A single outlier can dramatically change the cluster assignment. Single linkage is less sensitive but suffers from chaining.",
    options: [
      { id: "a", label: "Single linkage", isCorrect: false },
      { id: "b", label: "Complete linkage", isCorrect: true },
      { id: "c", label: "Average linkage", isCorrect: false },
      { id: "d", label: "Ward's method", isCorrect: false },
    ],
  },
  {
    id: "dbscan-kdistance",
    type: "multiple-choice",
    question:
      "How do you choose the eps parameter for DBSCAN?",
    hint: "Use a k-distance graph.",
    explanation:
      "Plot the distance to the k-th nearest neighbor for each point (sorted). The 'elbow' in this curve suggests a good eps value — points below the elbow are core points, above are noise.",
    options: [
      { id: "a", label: "Use the default value", isCorrect: false },
      { id: "b", label: "Use the elbow of the k-distance graph", isCorrect: true },
      { id: "c", label: "Set it to the mean pairwise distance", isCorrect: false },
      { id: "d", label: "Set it to the standard deviation of the data", isCorrect: false },
    ],
  },
  // ── PCA & Dimensionality Reduction ───────────────────────────
  {
    id: "pca-projection",
    type: "multiple-choice",
    question:
      "PCA finds the directions that maximize what property?",
    hint: "Think about what PCA preserves when reducing dimensions.",
    explanation:
      "PCA finds the directions (principal components) that maximize variance in the data. It projects data onto the axes along which it is most spread out, preserving as much information as possible.",
    options: [
      { id: "a", label: "Class separability", isCorrect: false },
      { id: "b", label: "Variance", isCorrect: true },
      { id: "c", label: "Distance to the origin", isCorrect: false },
      { id: "d", label: "Feature correlation", isCorrect: false },
    ],
  },
  {
    id: "pca-variance",
    type: "multiple-choice",
    question:
      "If the first 3 principal components explain 85% of variance, what does the remaining 15% represent?",
    hint: "Think about what information is lost.",
    explanation:
      "The remaining 15% represents less important variation — potentially noise or fine-grained patterns. Keeping only the top components acts as noise reduction.",
    options: [
      { id: "a", label: "Error in the computation", isCorrect: false },
      { id: "b", label: "Noise or less important variation", isCorrect: true },
      { id: "c", label: "The most important features", isCorrect: false },
      { id: "d", label: "Nothing — it's discarded", isCorrect: false },
    ],
  },
  {
    id: "pca-scaling",
    type: "multiple-choice",
    question:
      "Why must you standardize features before PCA?",
    hint: "PCA maximizes variance.",
    explanation:
      "PCA finds directions of maximum variance. A feature with range [0, 1000] will dominate over [0, 1], even if the smaller feature is more informative. Standardization ensures equal contribution.",
    options: [
      { id: "a", label: "PCA requires normalized probabilities", isCorrect: false },
      { id: "b", label: "PCA maximizes variance, which is scale-dependent", isCorrect: true },
      { id: "c", label: "Standardization speeds up eigendecomposition", isCorrect: false },
      { id: "d", label: "It's only necessary for t-SNE", isCorrect: false },
    ],
  },
  {
    id: "umap-parameters",
    type: "multiple-choice",
    question:
      "In UMAP, what does increasing 'n_neighbors' do?",
    hint: "Think about whether you're capturing local or global structure.",
    explanation:
      "Larger n_neighbors captures more global structure — the embedding considers more distant relationships. Smaller n_neighbors focuses on local structure — tight, well-separated clusters but potentially distorted global distances.",
    options: [
      { id: "a", label: "Focuses more on local structure", isCorrect: false },
      { id: "b", label: "Captures more global structure", isCorrect: true },
      { id: "c", label: "Makes clusters tighter", isCorrect: false },
      { id: "d", label: "Reduces computation time", isCorrect: false },
    ],
  },
  {
    id: "tsne-perplexity",
    type: "multiple-choice",
    question:
      "In t-SNE, what does the perplexity parameter control?",
    hint: "Think about the balance between local and global structure.",
    explanation:
      "Perplexity controls the balance between local and global structure. Low perplexity (5-15) captures local structure; high perplexity (30-100) captures global structure. Typical default is 30.",
    options: [
      { id: "a", label: "The number of clusters", isCorrect: false },
      { id: "b", label: "The balance between local and global structure", isCorrect: true },
      { id: "c", label: "The learning rate", isCorrect: false },
      { id: "d", label: "The number of iterations", isCorrect: false },
    ],
  },
  {
    id: "pca-vs-umap",
    type: "multiple-choice",
    question:
      "When should you use UMAP instead of PCA for visualization?",
    hint: "Think about linear vs non-linear relationships.",
    explanation:
      "Use UMAP when data lies on a non-linear manifold (curved, twisted, or folded). PCA can only find linear projections and will miss complex structures that UMAP can reveal.",
    options: [
      { id: "a", label: "UMAP is always better", isCorrect: false },
      { id: "b", label: "When data has non-linear structure", isCorrect: true },
      { id: "c", label: "When you need faster computation", isCorrect: false },
      { id: "d", label: "When you need to preserve exact distances", isCorrect: false },
    ],
  },
  // ── Probabilistic Models & EM ────────────────────────────────
  {
    id: "gmm-responsibility",
    type: "multiple-choice",
    question:
      "In a GMM, what does the responsibility γ_ik represent?",
    hint: "It's a probability given the data and current parameters.",
    explanation:
      "γ_ik = P(z_i = k | x_i) is the posterior probability that data point i was generated by component k. It's computed via Bayes' theorem using the current parameters.",
    options: [
      { id: "a", label: "The prior probability of cluster k", isCorrect: false },
      { id: "b", label: "The posterior probability that point i belongs to cluster k", isCorrect: true },
      { id: "c", label: "The distance from point i to centroid k", isCorrect: false },
      { id: "d", label: "The likelihood of the data given cluster k", isCorrect: false },
    ],
  },
  {
    id: "gmm-covariance",
    type: "multiple-choice",
    question:
      "In scikit-learn's GMM, what does covariance_type='diag' assume?",
    hint: "Think about the shape of the covariance matrix.",
    explanation:
      "'diag' assumes axis-aligned elliptical clusters — each feature has its own variance, but features are uncorrelated. This is a middle ground between 'spherical' (circles) and 'full' (arbitrary ellipses).",
    options: [
      { id: "a", label: "Spherical clusters (circles)", isCorrect: false },
      { id: "b", label: "Axis-aligned ellipses (diagonal covariance)", isCorrect: true },
      { id: "c", label: "Arbitrary ellipses (full covariance)", isCorrect: false },
      { id: "d", label: "Shared covariance for all clusters", isCorrect: false },
    ],
  },
  {
    id: "gmm-bic-aic",
    type: "multiple-choice",
    question:
      "When should you use BIC over AIC for choosing the number of GMM components?",
    hint: "Think about the penalty term and dataset size.",
    explanation:
      "BIC penalizes complexity more heavily (grows with ln(n)). Use BIC when you want a parsimonious model or have a large dataset. AIC may select more complex models.",
    options: [
      { id: "a", label: "When you want more complex models", isCorrect: false },
      { id: "b", label: "When you want a parsimonious model", isCorrect: true },
      { id: "c", label: "When the dataset is very small", isCorrect: false },
      { id: "d", label: "BIC and AIC are always equivalent", isCorrect: false },
    ],
  },
  {
    id: "em-convergence",
    type: "multiple-choice",
    question:
      "What guarantee does the EM algorithm provide at each iteration?",
    hint: "Think about what EM optimizes and whether it can get worse.",
    explanation:
      "EM guarantees that the log-likelihood monotonically increases (or stays the same) at each iteration. It converges to a local optimum, not necessarily the global one.",
    options: [
      { id: "a", label: "It reaches the global optimum", isCorrect: false },
      { id: "b", label: "The log-likelihood monotonically increases", isCorrect: true },
      { id: "c", label: "The loss monotonically decreases to zero", isCorrect: false },
      { id: "d", label: "It converges in a fixed number of iterations", isCorrect: false },
    ],
  },
  {
    id: "em-e-step",
    type: "multiple-choice",
    question:
      "In the EM algorithm, what does the E-step compute?",
    hint: "E stands for Expectation.",
    explanation:
      "The E-step computes the expected value of the latent variables given the current parameters. For GMMs, this means computing the responsibilities γ_ik — the probability that each point belongs to each component.",
    options: [
      { id: "a", label: "The optimal parameters", isCorrect: false },
      { id: "b", label: "The expected responsibilities (latent variable assignments)", isCorrect: true },
      { id: "c", label: "The gradient of the loss", isCorrect: false },
      { id: "d", label: "The learning rate", isCorrect: false },
    ],
  },
  {
    id: "em-initialization",
    type: "multiple-choice",
    question:
      "Why is initialization important for EM?",
    hint: "EM converges to a local optimum.",
    explanation:
      "EM converges to a local optimum, not the global one. Different initializations can give very different results. Always run EM multiple times and keep the result with the highest log-likelihood.",
    options: [
      { id: "a", label: "EM always converges to the same result", isCorrect: false },
      { id: "b", label: "EM converges to local optima — initialization affects the result", isCorrect: true },
      { id: "c", label: "Initialization only affects speed, not quality", isCorrect: false },
      { id: "d", label: "Random initialization is always optimal", isCorrect: false },
    ],
  },
  // ── Generative Models ────────────────────────────────────────
  {
    id: "gen-models-paradigms",
    type: "multiple-choice",
    question:
      "Which statement best describes the difference between discriminative and generative models?",
    hint: "Discriminative models learn boundaries; generative models learn the data distribution.",
    explanation:
      "Discriminative models learn P(y|x) — the boundary between classes. Generative models learn P(x) — the distribution of the data itself, allowing them to create new samples.",
    options: [
      { id: "a", label: "Discriminative models are always more accurate", isCorrect: false },
      { id: "b", label: "Generative models learn P(y|x); discriminative models learn P(x)", isCorrect: false },
      { id: "c", label: "Discriminative models learn P(y|x); generative models learn P(x)", isCorrect: true },
      { id: "d", label: "They are the same thing with different names", isCorrect: false },
    ],
  },
  {
    id: "gen-models-latent",
    type: "multiple-choice",
    question:
      "What is the purpose of the latent space in generative models?",
    hint: "Think about compression and generation.",
    explanation:
      "The latent space is a compressed, lower-dimensional representation where the data structure is simpler. By sampling from this space and decoding, we can generate new data points.",
    options: [
      { id: "a", label: "To store the training data", isCorrect: false },
      { id: "b", label: "To provide a simple space from which to sample and decode into data", isCorrect: true },
      { id: "c", label: "To increase the dimensionality of the data", isCorrect: false },
      { id: "d", label: "To replace the loss function", isCorrect: false },
    ],
  },
  {
    id: "gen-models-tradeoff",
    type: "multiple-choice",
    question:
      "What is the key tradeoff between explicit and implicit generative models?",
    hint: "Think about what you can compute vs what you can sample.",
    explanation:
      "Explicit models (VAEs) give you exact P(x) but are often intractable. Implicit models (GANs) are more flexible but only give samples, not probabilities.",
    options: [
      { id: "a", label: "Explicit models are faster to train", isCorrect: false },
      { id: "b", label: "Explicit models give exact likelihood; implicit models only give samples", isCorrect: true },
      { id: "c", label: "Implicit models are always better", isCorrect: false },
      { id: "d", label: "There is no tradeoff", isCorrect: false },
    ],
  },
  {
    id: "autoencoder-bottleneck",
    type: "multiple-choice",
    question:
      "Why can't a standard autoencoder be used directly as a generative model?",
    hint: "Think about what happens when you sample a random point from the latent space.",
    explanation:
      "A standard autoencoder maps each input to a single point in latent space, leaving 'holes' — regions never seen during training. Sampling randomly from the latent space produces garbage because the decoder has never seen those points.",
    options: [
      { id: "a", label: "The encoder is too small to capture the data structure", isCorrect: false },
      { id: "b", label: "The latent space has holes — random samples are unrealistic", isCorrect: true },
      { id: "c", label: "Autoencoders cannot use neural networks", isCorrect: false },
      { id: "d", label: "The decoder outputs are always blurry", isCorrect: false },
    ],
  },
  {
    id: "autoencoder-noise",
    type: "multiple-choice",
    question:
      "In a denoising autoencoder, what is the training objective?",
    hint: "Think about what the input and target are.",
    explanation:
      "The input is corrupted (noisy), but the target is the clean original. This forces the autoencoder to learn robust features that can reconstruct the signal from noise.",
    options: [
      { id: "a", label: "Reconstruct the noisy input", isCorrect: false },
      { id: "b", label: "Reconstruct the clean original from the noisy input", isCorrect: true },
      { id: "c", label: "Predict the noise that was added", isCorrect: false },
      { id: "d", label: "Maximize the reconstruction error", isCorrect: false },
    ],
  },
  {
    id: "autoencoder-anomaly",
    type: "multiple-choice",
    question:
      "How can an autoencoder detect anomalous data?",
    hint: "Think about what happens when an autoencoder sees unfamiliar data.",
    explanation:
      "Anomalies are data the autoencoder hasn't seen during training. They produce high reconstruction error because the encoder/decoder weren't trained on such patterns. Flag points with error above a threshold.",
    options: [
      { id: "a", label: "Anomalies have low reconstruction error", isCorrect: false },
      { id: "b", label: "Anomalies have high reconstruction error", isCorrect: true },
      { id: "c", label: "Anomalies are encoded to zero", isCorrect: false },
      { id: "d", label: "Anomalies bypass the bottleneck", isCorrect: false },
    ],
  },
  {
    id: "vae-kl-divergence",
    type: "multiple-choice",
    question:
      "In a VAE, what does the KL divergence term in the loss function do?",
    hint: "It compares the encoder's output distribution to a target distribution.",
    explanation:
      "The KL divergence pulls the encoder's posterior distribution q(z|x) toward the prior N(0, I). This regularizes the latent space, ensuring it's smooth and structured enough for sampling.",
    options: [
      { id: "a", label: "It measures reconstruction error between input and output", isCorrect: false },
      { id: "b", label: "It forces the encoder's distribution toward N(0, I)", isCorrect: true },
      { id: "c", label: "It determines the learning rate schedule", isCorrect: false },
      { id: "d", label: "It prevents overfitting by adding dropout", isCorrect: false },
    ],
  },
  {
    id: "vae-reparameterize",
    type: "multiple-choice",
    question:
      "Why is the reparameterization trick necessary in VAEs?",
    hint: "Can you backpropagate through a random sampling operation?",
    explanation:
      "Random sampling is non-differentiable — gradients can't flow through it. The reparameterization trick moves the randomness to an external noise variable ε, making the sampling deterministic with respect to the encoder's parameters.",
    options: [
      { id: "a", label: "It makes the decoder more expressive", isCorrect: false },
      { id: "b", label: "It enables backpropagation through a stochastic sampling step", isCorrect: true },
      { id: "c", label: "It reduces the size of the latent space", isCorrect: false },
      { id: "d", label: "It removes the need for the KL divergence term", isCorrect: false },
    ],
  },
  {
    id: "vae-beta",
    type: "multiple-choice",
    question:
      "In a β-VAE, what happens when you increase β above 1?",
    hint: "β weights the KL divergence term.",
    explanation:
      "Increasing β puts more emphasis on latent space regularization, leading to more disentangled representations but potentially blurrier reconstructions. Decreasing β below 1 prioritizes reconstruction quality.",
    options: [
      { id: "a", label: "Better reconstruction, less structured latent space", isCorrect: false },
      { id: "b", label: "More disentangled representations, potentially blurrier outputs", isCorrect: true },
      { id: "c", label: "Faster training", isCorrect: false },
      { id: "d", label: "No effect", isCorrect: false },
    ],
  },
  {
    id: "gan-game-theory",
    type: "multiple-choice",
    question:
      "In a GAN, what happens at the Nash equilibrium?",
    hint: "Both players are playing their best response to the other's strategy.",
    explanation:
      "At Nash equilibrium, the generator produces samples indistinguishable from real data (D(x) = 0.5 for all x), and the discriminator can do no better than random guessing.",
    options: [
      { id: "a", label: "The generator produces perfect copies of training data", isCorrect: false },
      { id: "b", label: "The discriminator achieves 100% accuracy", isCorrect: false },
      { id: "c", label: "The discriminator outputs 0.5 for all samples — can't tell real from fake", isCorrect: true },
      { id: "d", label: "Both networks stop training", isCorrect: false },
    ],
  },
  {
    id: "gan-mode-collapse",
    type: "multiple-choice",
    question:
      "What is 'mode collapse' in GANs?",
    hint: "Think about what happens when the generator finds a shortcut to fool the discriminator.",
    explanation:
      "Mode collapse occurs when the generator produces only a few types of outputs that are good at fooling the discriminator, ignoring the full diversity of the training data.",
    options: [
      { id: "a", label: "The discriminator becomes too powerful", isCorrect: false },
      { id: "b", label: "The generator produces only a narrow set of outputs, missing the data's full diversity", isCorrect: true },
      { id: "c", label: "The latent space collapses to a single point", isCorrect: false },
      { id: "d", label: "Both networks converge too quickly", isCorrect: false },
    ],
  },
  {
    id: "gan-wgan",
    type: "multiple-choice",
    question:
      "What is the main advantage of Wasserstein GAN (WGAN) over standard GANs?",
    hint: "Think about training stability and loss interpretation.",
    explanation:
      "WGAN provides a meaningful loss metric that correlates with image quality and has more stable training. Standard GAN loss oscillates and doesn't indicate training progress.",
    options: [
      { id: "a", label: "Faster generation", isCorrect: false },
      { id: "b", label: "More stable training with meaningful loss metric", isCorrect: true },
      { id: "c", label: "Better image quality", isCorrect: false },
      { id: "d", label: "Simpler architecture", isCorrect: false },
    ],
  },
  {
    id: "diffusion-forward-reverse",
    type: "multiple-choice",
    question:
      "In a diffusion model, what does the neural network learn to predict?",
    hint: "The forward process adds something to the image. The model tries to undo that.",
    explanation:
      "The denoising network learns to predict the noise that was added at each timestep. By predicting and removing noise iteratively, it reverses the forward noising process to generate new samples.",
    options: [
      { id: "a", label: "The final clean image directly", isCorrect: false },
      { id: "b", label: "The noise that was added at each timestep", isCorrect: true },
      { id: "c", label: "The class label of the image", isCorrect: false },
      { id: "d", label: "The latent vector for a decoder", isCorrect: false },
    ],
  },
  {
    id: "diffusion-schedule",
    type: "multiple-choice",
    question:
      "Why is the cosine noise schedule preferred over the linear schedule for diffusion models?",
    hint: "Think about how quickly noise is added in early vs late steps.",
    explanation:
      "The cosine schedule adds noise more gradually, keeping the image recognizable longer. The linear schedule adds noise too quickly in early steps, making it harder for the model to learn meaningful denoising patterns.",
    options: [
      { id: "a", label: "It's faster to compute", isCorrect: false },
      { id: "b", label: "It adds noise more gradually, giving the model more time to learn", isCorrect: true },
      { id: "c", label: "It requires fewer timesteps", isCorrect: false },
      { id: "d", label: "It produces higher resolution images", isCorrect: false },
    ],
  },
  {
    id: "diffusion-sampling",
    type: "multiple-choice",
    question:
      "How does DDIM accelerate diffusion model sampling?",
    hint: "Think about skipping timesteps.",
    explanation:
      "DDIM allows skipping timesteps during sampling — going from 1000 steps to 50-100 steps with minimal quality loss. It reformulates the process as deterministic, enabling fewer steps.",
    options: [
      { id: "a", label: "It uses a smaller neural network", isCorrect: false },
      { id: "b", label: "It allows skipping timesteps during sampling", isCorrect: true },
      { id: "c", label: "It removes the forward process", isCorrect: false },
      { id: "d", label: "It uses a different loss function", isCorrect: false },
    ],
  },
];

export const exercises: Record<string, Exercise> = Object.fromEntries(
  allExercises.map((exercise) => [exercise.id, exercise])
);

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}
