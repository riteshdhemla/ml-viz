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
  {
    id: "forward-pass-matrix",
    type: "multiple-choice",
    question:
      "A hidden layer computes z = Wx + b = [-1.5, 2.0]. After applying ReLU element-wise, what is the activation vector h?",
    hint: "ReLU(z) = max(0, z), applied to each entry separately.",
    explanation:
      "ReLU clamps negative entries to zero and passes positive ones through: h = [max(0, −1.5), max(0, 2.0)] = [0, 2.0]. The first neuron is inactive for this input.",
    options: [
      { id: "a", label: "[-1.5, 2.0]", isCorrect: false },
      { id: "b", label: "[0, 2.0]", isCorrect: true },
      { id: "c", label: "[1.5, 2.0]", isCorrect: false },
      { id: "d", label: "[0, 0]", isCorrect: false },
    ],
  },
  {
    id: "hidden-width",
    type: "slider",
    question:
      "A network has 2 inputs, one hidden layer of 4 neurons, and 1 output. How many parameters (weights + biases) does it have in total?",
    hint: "Each layer mapping n inputs to m outputs has m×n weights plus m biases. Sum both layers.",
    explanation:
      "Hidden layer: 4×2 weights + 4 biases = 12. Output layer: 1×4 weights + 1 bias = 5. Total = 17. In general a 2→h→1 network has 4h + 1 parameters — width makes the count grow fast.",
    min: 0,
    max: 40,
    step: 1,
    correctRange: [17, 17],
    unit: "params",
  },
  {
    id: "depth-vs-width",
    type: "multiple-choice",
    question:
      "Why does a deep network often need far fewer parameters than a single wide hidden layer to fit the same function?",
    hint: "Think about what later layers receive as input.",
    explanation:
      "Each layer builds on the previous layer's outputs, so intermediate features are computed once and re-used by everything downstream. A single wide layer cannot compose features — it may need exponentially many neurons to match what composition gives almost for free.",
    options: [
      { id: "a", label: "Deeper networks always have smaller weights", isCorrect: false },
      { id: "b", label: "Later layers re-use and compose features computed by earlier layers", isCorrect: true },
      { id: "c", label: "Depth removes the need for biases", isCorrect: false },
      { id: "d", label: "Wide layers require more training data per neuron", isCorrect: false },
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

  // ── Recurrent Neural Networks ───────────────────────────────────
  {
    id: "rnn-hidden-state",
    type: "multiple-choice",
    question:
      "What role does the hidden state h_t play in a recurrent neural network?",
    hint: "Think about what gets passed from one time step to the next.",
    explanation:
      "The hidden state is the RNN's memory — a running summary of everything seen so far. It is passed from step to step, letting earlier inputs influence later outputs.",
    options: [
      { id: "a", label: "It stores the network's final prediction only", isCorrect: false },
      { id: "b", label: "It summarizes all past inputs and is passed to the next step", isCorrect: true },
      { id: "c", label: "It holds the learning rate for each step", isCorrect: false },
      { id: "d", label: "It is the raw input at the current time step", isCorrect: false },
    ],
  },
  {
    id: "rnn-weight-sharing",
    type: "multiple-choice",
    question:
      "Why can an RNN process sequences of any length with a fixed number of parameters?",
    hint: "Consider what is reused at every time step.",
    explanation:
      "The same weight matrices (W_xh, W_hh, W_hy) are applied at every time step. This parameter sharing means the parameter count is independent of sequence length, and a pattern learned at one position transfers to all positions.",
    options: [
      { id: "a", label: "It adds new weights for each new time step", isCorrect: false },
      { id: "b", label: "It shares the same weights across all time steps", isCorrect: true },
      { id: "c", label: "It pads every sequence to a fixed length", isCorrect: false },
      { id: "d", label: "It only keeps the last input", isCorrect: false },
    ],
  },
  {
    id: "rnn-sequence-types",
    type: "multiple-choice",
    question:
      "Classifying the sentiment of a product review (a sequence of words) into one label is which RNN pattern?",
    hint: "Count the inputs and outputs.",
    explanation:
      "Many words in, one label out — this is a many-to-one pattern. The final hidden state h_n is typically fed to a classifier.",
    options: [
      { id: "a", label: "one-to-many", isCorrect: false },
      { id: "b", label: "many-to-one", isCorrect: true },
      { id: "c", label: "many-to-many (aligned)", isCorrect: false },
      { id: "d", label: "one-to-one", isCorrect: false },
    ],
  },
  {
    id: "bptt-gradient-product",
    type: "multiple-choice",
    question:
      "In BPTT, the gradient across a gap of T−k steps is a product of T−k Jacobians. If each factor has magnitude ~0.7, what happens over 20 steps?",
    hint: "Compute 0.7 raised to the 20th power.",
    explanation:
      "0.7^20 ≈ 0.0008 — the gradient shrinks to less than 0.1% of its original size. This is the vanishing gradient: distant steps receive almost no learning signal.",
    options: [
      { id: "a", label: "It grows large (exploding gradient)", isCorrect: false },
      { id: "b", label: "It stays roughly constant", isCorrect: false },
      { id: "c", label: "It shrinks to nearly zero (vanishing gradient)", isCorrect: true },
      { id: "d", label: "It oscillates between large and small", isCorrect: false },
    ],
  },
  {
    id: "vanishing-gradient-cause",
    type: "multiple-choice",
    question:
      "What is the root cause of the vanishing gradient problem in vanilla RNNs?",
    hint: "Think about what happens when you multiply many similar matrices together.",
    explanation:
      "BPTT multiplies one Jacobian per time step. If the recurrent weight's effective gain is below 1, repeated multiplication shrinks the gradient exponentially with the gap length. The tanh derivative (≤ 1) makes it worse.",
    options: [
      { id: "a", label: "Too large a learning rate", isCorrect: false },
      { id: "b", label: "Repeated multiplication by factors with magnitude < 1 across steps", isCorrect: true },
      { id: "c", label: "Using too few hidden units", isCorrect: false },
      { id: "d", label: "Not enough training data", isCorrect: false },
    ],
  },
  {
    id: "gradient-clipping-purpose",
    type: "multiple-choice",
    question:
      "Gradient clipping addresses which problem in training RNNs?",
    hint: "It rescales gradients that are too large.",
    explanation:
      "Clipping rescales an over-large gradient back to a safe norm, preventing exploding gradients and NaNs. It does nothing for vanishing gradients — you cannot rescale a signal that has already decayed to zero.",
    options: [
      { id: "a", label: "Vanishing gradients", isCorrect: false },
      { id: "b", label: "Exploding gradients", isCorrect: true },
      { id: "c", label: "Overfitting", isCorrect: false },
      { id: "d", label: "Slow convergence on short sequences", isCorrect: false },
    ],
  },
  {
    id: "lstm-forget-gate",
    type: "multiple-choice",
    question:
      "In an LSTM, what does a forget gate value near 1 do to the cell state?",
    hint: "The forget gate multiplies the previous cell state.",
    explanation:
      "c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t. A forget gate near 1 preserves the previous cell state (keeps the memory); near 0 it erases it.",
    options: [
      { id: "a", label: "Erases the previous memory", isCorrect: false },
      { id: "b", label: "Preserves the previous memory", isCorrect: true },
      { id: "c", label: "Doubles the cell state", isCorrect: false },
      { id: "d", label: "Resets the hidden state to zero", isCorrect: false },
    ],
  },
  {
    id: "lstm-cell-state",
    type: "multiple-choice",
    question:
      "Why does the LSTM cell state help with the vanishing gradient problem?",
    hint: "Look at how the cell state is updated — by addition or by matrix multiplication?",
    explanation:
      "The cell state is updated mainly by addition (c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t). Its gradient is multiplied by the forget gate (often ≈ 1), not by a weight matrix raised to a power — creating a gradient 'highway' that survives many steps.",
    options: [
      { id: "a", label: "It uses a larger learning rate", isCorrect: false },
      { id: "b", label: "Its additive update gives gradients a near-constant path across steps", isCorrect: true },
      { id: "c", label: "It removes the tanh nonlinearity", isCorrect: false },
      { id: "d", label: "It only keeps the most recent input", isCorrect: false },
    ],
  },
  {
    id: "gru-vs-lstm",
    type: "multiple-choice",
    question:
      "How does a GRU differ from an LSTM?",
    hint: "Compare the number of gates and state vectors.",
    explanation:
      "A GRU merges the cell and hidden state into one and uses two gates (reset, update) instead of three. It has ~25% fewer parameters and trains faster, performing comparably on most tasks.",
    options: [
      { id: "a", label: "A GRU has more gates than an LSTM", isCorrect: false },
      { id: "b", label: "A GRU uses two gates and a single state vector", isCorrect: true },
      { id: "c", label: "A GRU has no gates at all", isCorrect: false },
      { id: "d", label: "A GRU cannot model long-range dependencies", isCorrect: false },
    ],
  },

  // ── Attention & Transformers ────────────────────────────────────
  {
    id: "attention-qkv",
    type: "multiple-choice",
    question:
      "In self-attention, which vector represents 'what a token is looking for'?",
    hint: "Query, Key, or Value?",
    explanation:
      "The Query asks 'what am I looking for?'. It is compared against every Key ('what do I offer?') to score relevance, and the scores weight the Values that get summed.",
    options: [
      { id: "a", label: "Query", isCorrect: true },
      { id: "b", label: "Key", isCorrect: false },
      { id: "c", label: "Value", isCorrect: false },
      { id: "d", label: "Positional encoding", isCorrect: false },
    ],
  },
  {
    id: "attention-scale",
    type: "multiple-choice",
    question:
      "Why does scaled dot-product attention divide the scores by √d_k?",
    hint: "Think about how the variance of a dot product grows with dimension.",
    explanation:
      "The dot product of two d_k-dimensional vectors has variance proportional to d_k. Without scaling, large scores push softmax into saturated regions with near-zero gradients. Dividing by √d_k keeps variance ≈ 1 and softmax well-behaved.",
    options: [
      { id: "a", label: "To make the output sum to one", isCorrect: false },
      { id: "b", label: "To keep score variance stable so softmax gradients don't vanish", isCorrect: true },
      { id: "c", label: "To reduce the number of parameters", isCorrect: false },
      { id: "d", label: "To enforce the causal mask", isCorrect: false },
    ],
  },
  {
    id: "attention-complexity",
    type: "multiple-choice",
    question:
      "What is the computational complexity of self-attention in sequence length n?",
    hint: "Every token attends to every other token.",
    explanation:
      "Self-attention computes an n×n matrix of scores (every token vs every token), so it is O(n²) in sequence length. This quadratic cost is the main bottleneck for long sequences.",
    options: [
      { id: "a", label: "O(n)", isCorrect: false },
      { id: "b", label: "O(n log n)", isCorrect: false },
      { id: "c", label: "O(n²)", isCorrect: true },
      { id: "d", label: "O(1)", isCorrect: false },
    ],
  },
  {
    id: "multihead-dimensions",
    type: "multiple-choice",
    question:
      "A Transformer has d_model = 512 and 8 attention heads. What is the dimension d_k of each head?",
    hint: "Split the model dimension evenly across heads.",
    explanation:
      "Each head uses d_k = d_model / h = 512 / 8 = 64. The 8 heads each output 64 dims; concatenating gives 8 × 64 = 512, back to d_model.",
    options: [
      { id: "a", label: "512", isCorrect: false },
      { id: "b", label: "64", isCorrect: true },
      { id: "c", label: "8", isCorrect: false },
      { id: "d", label: "4096", isCorrect: false },
    ],
  },
  {
    id: "positional-encoding-purpose",
    type: "multiple-choice",
    question:
      "Why do Transformers need positional encoding?",
    hint: "What happens to the attention output if you shuffle the input tokens?",
    explanation:
      "Self-attention is permutation-invariant — without position information it cannot tell 'dog bites man' from 'man bites dog'. Positional encoding injects order so the model can use word position.",
    options: [
      { id: "a", label: "To normalize the embeddings", isCorrect: false },
      { id: "b", label: "Because attention has no built-in sense of token order", isCorrect: true },
      { id: "c", label: "To reduce the number of heads needed", isCorrect: false },
      { id: "d", label: "To prevent overfitting", isCorrect: false },
    ],
  },
  {
    id: "attention-permutation",
    type: "multiple-choice",
    question:
      "Without positional encoding, a Transformer effectively treats the input as what?",
    hint: "Order doesn't matter to it.",
    explanation:
      "Self-attention with no positional information is permutation-invariant, so the model becomes a bag-of-words — it sees which tokens are present but not their order.",
    options: [
      { id: "a", label: "A bag of words (order-independent)", isCorrect: true },
      { id: "b", label: "A strict left-to-right sequence", isCorrect: false },
      { id: "c", label: "A single averaged vector", isCorrect: false },
      { id: "d", label: "An image", isCorrect: false },
    ],
  },
  {
    id: "transformer-ffn",
    type: "multiple-choice",
    question:
      "In a Transformer block, the position-wise feed-forward network (FFN) operates how?",
    hint: "Does it mix information between tokens or process each one alone?",
    explanation:
      "The FFN is applied to each position independently (same weights per token), doing per-token computation. Attention mixes information between tokens; the FFN processes each token on its own.",
    options: [
      { id: "a", label: "It mixes information across all tokens", isCorrect: false },
      { id: "b", label: "It transforms each token independently", isCorrect: true },
      { id: "c", label: "It computes attention weights", isCorrect: false },
      { id: "d", label: "It applies the causal mask", isCorrect: false },
    ],
  },
  {
    id: "transformer-residual",
    type: "multiple-choice",
    question:
      "Why are residual connections important in deep Transformer stacks?",
    hint: "Think about how gradients reach early layers.",
    explanation:
      "Residual connections (x + sublayer(x)) give gradients a direct path to early layers, making it possible to train networks dozens of layers deep — the same trick that made ResNets work.",
    options: [
      { id: "a", label: "They reduce the vocabulary size", isCorrect: false },
      { id: "b", label: "They give gradients a direct path, enabling very deep stacks", isCorrect: true },
      { id: "c", label: "They replace the need for attention", isCorrect: false },
      { id: "d", label: "They enforce permutation invariance", isCorrect: false },
    ],
  },
  {
    id: "transformer-families",
    type: "multiple-choice",
    question:
      "GPT-style language models use which Transformer family?",
    hint: "They generate text one token at a time and must not see the future.",
    explanation:
      "GPT is decoder-only with causal (masked) attention — each position attends only to past tokens, which is what enables autoregressive generation. BERT is encoder-only (bidirectional); T5 is encoder-decoder.",
    options: [
      { id: "a", label: "Encoder-only (bidirectional)", isCorrect: false },
      { id: "b", label: "Decoder-only (causal)", isCorrect: true },
      { id: "c", label: "Encoder-decoder", isCorrect: false },
      { id: "d", label: "None — GPT is not a Transformer", isCorrect: false },
    ],
  },

  // ── Graphical Models ────────────────────────────────────────────
  {
    id: "bn-factorization",
    type: "multiple-choice",
    question:
      "A Bayesian Network factorizes the joint distribution as a product of what?",
    hint: "Each variable depends on a specific set of other variables.",
    explanation:
      "P(X₁,...,Xₙ) = ∏ P(Xᵢ | Parents(Xᵢ)). Each variable is conditioned on its parents in the DAG, which exploits conditional independence to shrink the parameter count.",
    options: [
      { id: "a", label: "Marginal distributions of each variable", isCorrect: false },
      { id: "b", label: "Conditional distributions of each variable given its parents", isCorrect: true },
      { id: "c", label: "Unnormalized potential functions", isCorrect: false },
      { id: "d", label: "Pairwise correlations", isCorrect: false },
    ],
  },
  {
    id: "bn-parameters",
    type: "multiple-choice",
    question:
      "For 4 binary variables, the full joint needs 15 parameters. Why does a Bayesian Network usually need fewer?",
    hint: "Each CPT only depends on a node's parents, not all other variables.",
    explanation:
      "By conditioning each variable only on its parents (not all others), the network replaces one exponential table with several small CPTs. In the Sprinkler example this drops 15 parameters to 9 — and the savings grow with network size.",
    options: [
      { id: "a", label: "It ignores some variables entirely", isCorrect: false },
      { id: "b", label: "Conditional independence lets each node store only a small CPT over its parents", isCorrect: true },
      { id: "c", label: "It rounds probabilities to fewer digits", isCorrect: false },
      { id: "d", label: "It uses undirected edges", isCorrect: false },
    ],
  },
  {
    id: "bn-explaining-away",
    type: "multiple-choice",
    question:
      "In a collider A → B ← C, what happens to A and C once you observe their common effect B?",
    hint: "This is the 'explaining away' phenomenon.",
    explanation:
      "A and C are marginally independent, but observing the common effect B makes them dependent. Learning that one cause occurred lowers the probability of the other — they 'explain away' the observed effect.",
    options: [
      { id: "a", label: "They become independent", isCorrect: false },
      { id: "b", label: "They become dependent (explaining away)", isCorrect: true },
      { id: "c", label: "Nothing changes", isCorrect: false },
      { id: "d", label: "Both become impossible", isCorrect: false },
    ],
  },
  {
    id: "mrf-partition-function",
    type: "multiple-choice",
    question:
      "What makes the partition function Z hard to compute in a Markov Random Field?",
    hint: "Think about how many joint configurations it sums over.",
    explanation:
      "Z sums the product of potentials over all joint configurations — 2ⁿ of them for n binary nodes — making it exponential in general. This is why MRF learning and inference rely on approximations.",
    options: [
      { id: "a", label: "It requires matrix inversion", isCorrect: false },
      { id: "b", label: "It sums over exponentially many joint configurations", isCorrect: true },
      { id: "c", label: "It needs the graph to be directed", isCorrect: false },
      { id: "d", label: "It depends on the learning rate", isCorrect: false },
    ],
  },
  {
    id: "mrf-vs-bn",
    type: "multiple-choice",
    question:
      "When is a Markov Random Field (undirected) a more natural choice than a Bayesian Network (directed)?",
    hint: "Think about symmetric vs causal relationships.",
    explanation:
      "MRFs suit symmetric, non-causal relationships — like neighboring pixels that mutually influence each other — where there is no natural arrow direction. Bayesian Networks suit causal/generative stories.",
    options: [
      { id: "a", label: "When relationships are symmetric with no natural causal direction", isCorrect: true },
      { id: "b", label: "When you need a clear cause-and-effect story", isCorrect: false },
      { id: "c", label: "When the graph must be acyclic", isCorrect: false },
      { id: "d", label: "When there is only one variable", isCorrect: false },
    ],
  },
  {
    id: "mrf-potentials",
    type: "multiple-choice",
    question:
      "How do MRF potential functions ψ differ from the conditional probability tables in a Bayesian Network?",
    hint: "Are potentials required to be valid probabilities?",
    explanation:
      "Potentials are non-negative compatibility scores — they need NOT be normalized probabilities. Only the product of potentials divided by the partition function Z forms a valid distribution.",
    options: [
      { id: "a", label: "Potentials are always valid probabilities", isCorrect: false },
      { id: "b", label: "Potentials are unnormalized scores; normalization comes from Z", isCorrect: true },
      { id: "c", label: "Potentials must sum to one per node", isCorrect: false },
      { id: "d", label: "Potentials are always negative", isCorrect: false },
    ],
  },
  {
    id: "hmm-assumptions",
    type: "multiple-choice",
    question:
      "Which two assumptions define a Hidden Markov Model?",
    hint: "One is about hidden states, one about observations.",
    explanation:
      "(1) Markov property: the next hidden state depends only on the current one. (2) Output independence: each observation depends only on the current hidden state.",
    options: [
      { id: "a", label: "States are observed; observations are hidden", isCorrect: false },
      { id: "b", label: "Markov property on hidden states + observation depends only on current state", isCorrect: true },
      { id: "c", label: "All states are independent and identically distributed", isCorrect: false },
      { id: "d", label: "The graph must be undirected", isCorrect: false },
    ],
  },
  {
    id: "hmm-forward-viterbi",
    type: "multiple-choice",
    question:
      "What is the key difference between the Forward algorithm and the Viterbi algorithm for HMMs?",
    hint: "One sums over paths, the other maximizes.",
    explanation:
      "They are the same recursion with one operator swapped: Forward SUMS over hidden paths (total likelihood of the evidence), while Viterbi takes the MAX (the single most likely hidden path).",
    options: [
      { id: "a", label: "Forward maximizes, Viterbi sums", isCorrect: false },
      { id: "b", label: "Forward sums over paths (likelihood); Viterbi maximizes (best path)", isCorrect: true },
      { id: "c", label: "They compute exactly the same thing", isCorrect: false },
      { id: "d", label: "Forward is for learning, Viterbi for transitions", isCorrect: false },
    ],
  },
  {
    id: "hmm-baum-welch",
    type: "multiple-choice",
    question:
      "The Baum-Welch algorithm for learning HMM parameters is an instance of which general algorithm?",
    hint: "It alternates an E-step and an M-step.",
    explanation:
      "Baum-Welch is an instance of Expectation-Maximization (EM). The E-step uses forward-backward to compute expected state/transition counts; the M-step re-estimates π, A, B. It converges to a local optimum.",
    options: [
      { id: "a", label: "Gradient descent", isCorrect: false },
      { id: "b", label: "Expectation-Maximization (EM)", isCorrect: true },
      { id: "c", label: "Value iteration", isCorrect: false },
      { id: "d", label: "K-Means", isCorrect: false },
    ],
  },

  // ── Reinforcement Learning ──────────────────────────────────────
  {
    id: "mdp-components",
    type: "multiple-choice",
    question:
      "Which of these is NOT one of the five components of a Markov Decision Process?",
    hint: "The five are states, actions, transitions, rewards, and discount.",
    explanation:
      "An MDP is (S, A, P, R, γ): states, actions, transition probabilities, reward function, and discount factor. A 'loss function' is not part of the MDP definition.",
    options: [
      { id: "a", label: "Transition probabilities P(s'|s,a)", isCorrect: false },
      { id: "b", label: "Reward function R(s,a)", isCorrect: false },
      { id: "c", label: "A loss function", isCorrect: true },
      { id: "d", label: "Discount factor γ", isCorrect: false },
    ],
  },
  {
    id: "mdp-discount",
    type: "multiple-choice",
    question:
      "With discount factor γ = 0.9, what is a reward received 10 steps in the future worth relative to an immediate one?",
    hint: "Compute 0.9 raised to the 10th power.",
    explanation:
      "γ^10 = 0.9^10 ≈ 0.35. A reward 10 steps away is worth about 35% of an immediate reward. Lower γ makes the agent more myopic.",
    options: [
      { id: "a", label: "About 0.35×", isCorrect: true },
      { id: "b", label: "About 0.9×", isCorrect: false },
      { id: "c", label: "About 9×", isCorrect: false },
      { id: "d", label: "Exactly 1× (undiscounted)", isCorrect: false },
    ],
  },
  {
    id: "mdp-bellman",
    type: "multiple-choice",
    question:
      "The Bellman optimality equation expresses the value of a state as what?",
    hint: "Immediate reward plus something about the future.",
    explanation:
      "V*(s) = max over actions of [immediate reward + γ × expected value of the next state]. Value is recursive: the best you can do now plus the discounted value of where you land.",
    options: [
      { id: "a", label: "The sum of all past rewards", isCorrect: false },
      { id: "b", label: "Best immediate reward plus discounted value of the next state", isCorrect: true },
      { id: "c", label: "The average reward across all states", isCorrect: false },
      { id: "d", label: "The number of actions available", isCorrect: false },
    ],
  },
  {
    id: "ql-td-update",
    type: "multiple-choice",
    question:
      "With α=0.1, γ=0.9, current Q(s,a)=5, reward r=2, and max Q(s',·)=10, what is the updated Q(s,a)?",
    hint: "TD target = r + γ·max Q(s'); new Q = old + α·(target − old).",
    explanation:
      "TD target = 2 + 0.9×10 = 11. TD error = 11 − 5 = 6. New Q = 5 + 0.1×6 = 5.6.",
    options: [
      { id: "a", label: "5.6", isCorrect: true },
      { id: "b", label: "11.0", isCorrect: false },
      { id: "c", label: "6.0", isCorrect: false },
      { id: "d", label: "5.0", isCorrect: false },
    ],
  },
  {
    id: "ql-off-policy",
    type: "multiple-choice",
    question:
      "Why is Q-learning called 'off-policy'?",
    hint: "Look at which next action the update's target uses.",
    explanation:
      "The update target uses max_a' Q(s',a') — the value of the BEST next action — regardless of the (possibly exploratory) action the agent actually takes. So it learns the optimal policy while behaving with a different one.",
    options: [
      { id: "a", label: "It never explores", isCorrect: false },
      { id: "b", label: "Its target uses the best next action, not the one actually taken", isCorrect: true },
      { id: "c", label: "It requires a model of the environment", isCorrect: false },
      { id: "d", label: "It only works offline from logged data", isCorrect: false },
    ],
  },
  {
    id: "ql-exploration",
    type: "multiple-choice",
    question:
      "In ε-greedy exploration, why is ε typically decayed over training?",
    hint: "How good is the Q-table at the start vs later?",
    explanation:
      "Early on the Q estimates are poor, so the agent should explore widely (high ε). As estimates improve, it should increasingly exploit known-good actions (low ε). Decaying ε implements this schedule.",
    options: [
      { id: "a", label: "To increase exploration over time", isCorrect: false },
      { id: "b", label: "To shift from exploration early to exploitation as estimates improve", isCorrect: true },
      { id: "c", label: "To keep the learning rate constant", isCorrect: false },
      { id: "d", label: "To guarantee a deterministic policy from step 1", isCorrect: false },
    ],
  },
  {
    id: "dqn-replay-buffer",
    type: "multiple-choice",
    question:
      "What problem does the experience replay buffer solve in DQN?",
    hint: "Consecutive transitions in an episode are highly similar.",
    explanation:
      "Consecutive transitions are highly correlated, violating the i.i.d. assumption of SGD. Sampling random minibatches from a replay buffer decorrelates the data (and reuses each experience many times).",
    options: [
      { id: "a", label: "It enforces the causal mask", isCorrect: false },
      { id: "b", label: "It decorrelates training data by sampling random past transitions", isCorrect: true },
      { id: "c", label: "It removes the need for a reward signal", isCorrect: false },
      { id: "d", label: "It makes the action space continuous", isCorrect: false },
    ],
  },
  {
    id: "dqn-target-network",
    type: "multiple-choice",
    question:
      "Why does DQN use a separate, periodically-updated target network?",
    hint: "What would happen if the target depended on the same weights being updated each step?",
    explanation:
      "Without it, the regression target depends on the same θ being updated every step — a moving target that causes oscillation or divergence. A frozen copy θ⁻, synced every N steps, stabilizes training.",
    options: [
      { id: "a", label: "To explore more efficiently", isCorrect: false },
      { id: "b", label: "To stop the regression target from moving every update", isCorrect: true },
      { id: "c", label: "To handle continuous actions", isCorrect: false },
      { id: "d", label: "To reduce the size of the network", isCorrect: false },
    ],
  },
  {
    id: "dqn-double",
    type: "multiple-choice",
    question:
      "What problem does Double DQN address?",
    hint: "Think about the max operator over noisy Q-estimates.",
    explanation:
      "The max in the standard target systematically overestimates Q-values (a max over noisy estimates). Double DQN decouples action selection (online net) from evaluation (target net) to reduce this overestimation bias.",
    options: [
      { id: "a", label: "Overestimation of Q-values from the max operator", isCorrect: true },
      { id: "b", label: "Slow exploration", isCorrect: false },
      { id: "c", label: "Continuous action spaces", isCorrect: false },
      { id: "d", label: "Vanishing gradients", isCorrect: false },
    ],
  },
  {
    id: "pg-theorem",
    type: "multiple-choice",
    question:
      "The policy gradient ∇J = E[∇log π(a|s) · G] adjusts action probabilities how?",
    hint: "What is the weight on each action's log-probability?",
    explanation:
      "It increases the log-probability of actions weighted by the return that followed them. Actions leading to high returns get their probability pushed up; low-return actions get pushed down.",
    options: [
      { id: "a", label: "It increases probabilities of actions weighted by their resulting return", isCorrect: true },
      { id: "b", label: "It sets all action probabilities equal", isCorrect: false },
      { id: "c", label: "It always picks the greedy action", isCorrect: false },
      { id: "d", label: "It requires a known transition model", isCorrect: false },
    ],
  },
  {
    id: "pg-baseline",
    type: "multiple-choice",
    question:
      "Why subtract a baseline (e.g. the value function) from the return in policy gradient methods?",
    hint: "Does it change the expected gradient? What about its variance?",
    explanation:
      "Subtracting a state-dependent baseline does not bias the gradient but greatly reduces its variance, speeding learning. Using V(s) as the baseline gives the advantage A(s,a) = G − V(s).",
    options: [
      { id: "a", label: "It biases the gradient toward better actions", isCorrect: false },
      { id: "b", label: "It reduces gradient variance without adding bias", isCorrect: true },
      { id: "c", label: "It makes the policy deterministic", isCorrect: false },
      { id: "d", label: "It removes the need for rewards", isCorrect: false },
    ],
  },
  {
    id: "pg-actor-critic",
    type: "multiple-choice",
    question:
      "In actor-critic methods, what are the roles of the actor and the critic?",
    hint: "One chooses actions, one evaluates them.",
    explanation:
      "The actor is the policy π(a|s) that chooses actions; the critic estimates the value function and supplies the advantage signal that tells the actor how much better/worse than expected an action was.",
    options: [
      { id: "a", label: "The actor estimates values; the critic picks actions", isCorrect: false },
      { id: "b", label: "The actor chooses actions; the critic estimates value to guide the actor", isCorrect: true },
      { id: "c", label: "Both estimate the same value function", isCorrect: false },
      { id: "d", label: "The critic explores while the actor stores experiences", isCorrect: false },
    ],
  },
  // ── Linear Algebra ──────────────────────────────────────────────
  {
    id: "linalg-dot-product",
    type: "multiple-choice",
    question:
      "What is the dot product of u = [3, 1] and v = [2, 4]?",
    hint: "Multiply component-wise and sum: u₁v₁ + u₂v₂.",
    explanation:
      "3×2 + 1×4 = 6 + 4 = 10. The dot product sums the products of corresponding components.",
    options: [
      { id: "a", label: "10", isCorrect: true },
      { id: "b", label: "14", isCorrect: false },
      { id: "c", label: "6", isCorrect: false },
      { id: "d", label: "7", isCorrect: false },
    ],
  },
  {
    id: "linalg-orthogonality",
    type: "multiple-choice",
    question:
      "Two vectors are orthogonal if their dot product equals what?",
    hint: "Think about what cos(90°) equals.",
    explanation:
      "Orthogonal vectors are perpendicular (90° apart). cos(90°) = 0, so u·v = ‖u‖‖v‖cos(90°) = 0. Orthogonal vectors carry no shared information.",
    options: [
      { id: "a", label: "1", isCorrect: false },
      { id: "b", label: "-1", isCorrect: false },
      { id: "c", label: "0", isCorrect: true },
      { id: "d", label: "Depends on the norms", isCorrect: false },
    ],
  },
  {
    id: "linalg-norm",
    type: "multiple-choice",
    question:
      "What is the Euclidean norm of v = [3, 4]?",
    hint: "Use the Pythagorean theorem: ‖v‖ = √(v₁² + v₂²).",
    explanation:
      "‖v‖ = √(3² + 4²) = √(9 + 16) = √25 = 5. This is the 3-4-5 right triangle.",
    options: [
      { id: "a", label: "7", isCorrect: false },
      { id: "b", label: "5", isCorrect: true },
      { id: "c", label: "25", isCorrect: false },
      { id: "d", label: "√7", isCorrect: false },
    ],
  },
  {
    id: "linalg-matmul",
    type: "multiple-choice",
    question:
      "A = [[1,2],[3,4]] and x = [1, 0]. What is Ax?",
    hint: "Each output row is the dot product of a row of A with x.",
    explanation:
      "Row 1: 1×1 + 2×0 = 1. Row 2: 3×1 + 4×0 = 3. So Ax = [1, 3]. Multiplying by a standard basis vector just selects a column of A.",
    options: [
      { id: "a", label: "[1, 2]", isCorrect: false },
      { id: "b", label: "[1, 3]", isCorrect: true },
      { id: "c", label: "[3, 4]", isCorrect: false },
      { id: "d", label: "[4, 6]", isCorrect: false },
    ],
  },
  {
    id: "linalg-rank",
    type: "multiple-choice",
    question:
      "A 3×3 matrix has rank 2. What can you conclude?",
    hint: "Rank = dimension of the column space.",
    explanation:
      "Rank 2 means the matrix has 2 linearly independent columns — one column is a linear combination of the others. The matrix is not invertible (det = 0) and maps 3D space onto a 2D plane.",
    options: [
      { id: "a", label: "The matrix is invertible", isCorrect: false },
      { id: "b", label: "One column is a linear combination of the others", isCorrect: true },
      { id: "c", label: "All columns are identical", isCorrect: false },
      { id: "d", label: "The matrix is the identity", isCorrect: false },
    ],
  },
  {
    id: "linalg-transpose",
    type: "multiple-choice",
    question:
      "For matrices A and B, which identity is always true?",
    hint: "Think about the transpose of a product.",
    explanation:
      "(AB)ᵀ = BᵀAᵀ — the order reverses when transposing a product. This is analogous to reversing the order when inverting a product: (AB)⁻¹ = B⁻¹A⁻¹.",
    options: [
      { id: "a", label: "(AB)ᵀ = AᵀBᵀ", isCorrect: false },
      { id: "b", label: "(AB)ᵀ = BᵀAᵀ", isCorrect: true },
      { id: "c", label: "(AB)ᵀ = AB", isCorrect: false },
      { id: "d", label: "Aᵀ = A⁻¹ always", isCorrect: false },
    ],
  },
  {
    id: "linalg-eigenvalue",
    type: "multiple-choice",
    question:
      "A matrix A has eigenvalue λ = 0. What does this imply?",
    hint: "Av = 0·v = 0 for some non-zero v.",
    explanation:
      "λ = 0 means Av = 0 for some non-zero v, so the null space is non-trivial. The matrix is singular (det = 0) and not invertible — it collapses space in the eigenvector direction.",
    options: [
      { id: "a", label: "All vectors are eigenvectors", isCorrect: false },
      { id: "b", label: "The matrix is not invertible", isCorrect: true },
      { id: "c", label: "The matrix is the identity", isCorrect: false },
      { id: "d", label: "The matrix has rank n", isCorrect: false },
    ],
  },
  {
    id: "linalg-eigenvector",
    type: "multiple-choice",
    question:
      "If you scale an eigenvector v by 3 to get 3v, is 3v also an eigenvector?",
    hint: "A(cv) = cAv for any scalar c.",
    explanation:
      "A(3v) = 3Av = 3(λv) = λ(3v). Yes, 3v is also an eigenvector with the same eigenvalue λ. Eigenvectors are only defined up to a scalar multiple — direction matters, not magnitude.",
    options: [
      { id: "a", label: "No — scaling changes the eigenvalue", isCorrect: false },
      { id: "b", label: "Yes — with the same eigenvalue λ", isCorrect: true },
      { id: "c", label: "Only if λ = 1", isCorrect: false },
      { id: "d", label: "No — eigenvectors must have norm 1", isCorrect: false },
    ],
  },
  {
    id: "linalg-pca-connection",
    type: "multiple-choice",
    question:
      "In PCA, the first principal component is the eigenvector of the covariance matrix with what property?",
    hint: "PCA maximizes variance.",
    explanation:
      "The first principal component is the eigenvector with the largest eigenvalue. Since the covariance matrix eigenvalue equals the variance along that direction, the largest eigenvalue → direction of maximum variance.",
    options: [
      { id: "a", label: "The smallest eigenvalue", isCorrect: false },
      { id: "b", label: "The largest eigenvalue", isCorrect: true },
      { id: "c", label: "Eigenvalue = 1", isCorrect: false },
      { id: "d", label: "Any eigenvalue — order doesn't matter", isCorrect: false },
    ],
  },
  // ── Calculus for ML ──────────────────────────────────────────────
  {
    id: "calc-partial-derivative",
    type: "multiple-choice",
    question:
      "For f(x, y) = 3x²y + y², what is ∂f/∂x?",
    hint: "Treat y as a constant and differentiate with respect to x.",
    explanation:
      "∂f/∂x = 6xy. When computing ∂/∂x, y is a constant, so d/dx(3x²y) = 6xy and d/dx(y²) = 0.",
    options: [
      { id: "a", label: "6xy + 2y", isCorrect: false },
      { id: "b", label: "6xy", isCorrect: true },
      { id: "c", label: "3x² + 2y", isCorrect: false },
      { id: "d", label: "6x", isCorrect: false },
    ],
  },
  {
    id: "calc-gradient-direction",
    type: "multiple-choice",
    question:
      "The gradient ∇f(x) points in the direction of steepest ___.",
    hint: "Think about which direction gradient descent moves.",
    explanation:
      "The gradient points in the direction of steepest ascent (uphill). Gradient descent moves in the opposite direction (−∇f) to decrease the loss as quickly as possible.",
    options: [
      { id: "a", label: "Descent (downhill)", isCorrect: false },
      { id: "b", label: "Ascent (uphill)", isCorrect: true },
      { id: "c", label: "Neither — it's perpendicular to level sets", isCorrect: false },
      { id: "d", label: "Parallel to the x-axis", isCorrect: false },
    ],
  },
  {
    id: "calc-sigmoid-derivative",
    type: "multiple-choice",
    question:
      "The derivative of sigmoid σ(x) is σ(x)(1 − σ(x)). What is its maximum value?",
    hint: "Maximize σ(x)(1 − σ(x)) — treat it as a function of p = σ(x) in [0,1].",
    explanation:
      "p(1−p) is maximized at p = 0.5, giving 0.25. This means the sigmoid gradient is at most 0.25 — it saturates near 0 and 1. Stacking 4 sigmoid layers reduces gradients by at least 0.25⁴ ≈ 0.004.",
    options: [
      { id: "a", label: "1.0", isCorrect: false },
      { id: "b", label: "0.5", isCorrect: false },
      { id: "c", label: "0.25", isCorrect: true },
      { id: "d", label: "0.0", isCorrect: false },
    ],
  },
  {
    id: "calc-chain-rule",
    type: "multiple-choice",
    question:
      "For h(x) = (3x + 1)⁴, what is h'(x)?",
    hint: "Use the chain rule: d/dx f(g(x)) = f'(g(x)) · g'(x).",
    explanation:
      "Let g = 3x + 1, f(g) = g⁴. Then h'(x) = 4g³ · 3 = 12(3x + 1)³.",
    options: [
      { id: "a", label: "4(3x + 1)³", isCorrect: false },
      { id: "b", label: "12(3x + 1)³", isCorrect: true },
      { id: "c", label: "4(3x + 1)³ · 3x", isCorrect: false },
      { id: "d", label: "(3x + 1)⁴ · 3", isCorrect: false },
    ],
  },
  {
    id: "calc-backprop-simple",
    type: "multiple-choice",
    question:
      "In backpropagation, the gradient at each node is computed as the product of what two things?",
    hint: "Each node has its own derivative and receives a signal from downstream.",
    explanation:
      "Each node multiplies the upstream gradient (from the next layer) by its local gradient (derivative of its own output w.r.t. its input). This is the chain rule applied to the computational graph.",
    options: [
      { id: "a", label: "The weight and the activation", isCorrect: false },
      { id: "b", label: "The upstream gradient and the local gradient", isCorrect: true },
      { id: "c", label: "The loss and the learning rate", isCorrect: false },
      { id: "d", label: "The input and the output", isCorrect: false },
    ],
  },
  {
    id: "calc-vanishing",
    type: "multiple-choice",
    question:
      "Why does stacking many sigmoid activations cause vanishing gradients?",
    hint: "Think about what happens when you multiply many numbers less than 1.",
    explanation:
      "Each sigmoid has a maximum derivative of 0.25. Backprop multiplies these together: with 10 sigmoid layers, the gradient is at most 0.25¹⁰ ≈ 10⁻⁶ — essentially zero. ReLU's derivative is 1 for positive inputs, avoiding this.",
    options: [
      { id: "a", label: "Sigmoid outputs are too large", isCorrect: false },
      { id: "b", label: "Multiplying many values ≤ 0.25 drives gradients to zero", isCorrect: true },
      { id: "c", label: "Sigmoid doesn't have a derivative", isCorrect: false },
      { id: "d", label: "The learning rate becomes too large", isCorrect: false },
    ],
  },
  {
    id: "calc-critical-points",
    type: "multiple-choice",
    question:
      "At a saddle point, the gradient is zero. How can you identify it (vs a minimum)?",
    hint: "Look at the Hessian matrix.",
    explanation:
      "At a saddle point, the Hessian is indefinite — it has both positive and negative eigenvalues, meaning the function curves up in some directions and down in others. A local minimum has a positive definite Hessian (all eigenvalues > 0).",
    options: [
      { id: "a", label: "The Hessian is positive definite", isCorrect: false },
      { id: "b", label: "The Hessian is indefinite (mixed eigenvalue signs)", isCorrect: true },
      { id: "c", label: "The gradient is non-zero", isCorrect: false },
      { id: "d", label: "The loss is at a global minimum", isCorrect: false },
    ],
  },
  {
    id: "calc-convexity",
    type: "multiple-choice",
    question:
      "Which of the following is a convex function?",
    hint: "Convex functions have a bowl shape — no local minima other than the global one.",
    explanation:
      "f(x) = x² is convex (bowl-shaped, f'' = 2 > 0). sin(x) oscillates (non-convex). x³ has an inflection point (neither convex nor concave globally). A neural network with non-linear activations is non-convex.",
    options: [
      { id: "a", label: "f(x) = sin(x)", isCorrect: false },
      { id: "b", label: "f(x) = x²", isCorrect: true },
      { id: "c", label: "f(x) = x³", isCorrect: false },
      { id: "d", label: "A neural network with ReLU activations", isCorrect: false },
    ],
  },
  {
    id: "calc-learning-rate",
    type: "multiple-choice",
    question:
      "If the loss landscape has Lipschitz constant L (maximum curvature), what is the optimal gradient descent step size?",
    hint: "Too large and you overshoot; too small and you crawl.",
    explanation:
      "The theoretically optimal step size is η = 1/L where L is the Lipschitz constant (largest eigenvalue of the Hessian). Larger steps cause oscillation or divergence; smaller steps converge slowly.",
    options: [
      { id: "a", label: "η = L", isCorrect: false },
      { id: "b", label: "η = 1/L", isCorrect: true },
      { id: "c", label: "η = L²", isCorrect: false },
      { id: "d", label: "η = 1/L² ", isCorrect: false },
    ],
  },
  {
    id: "calc-jacobian-shape",
    type: "multiple-choice",
    question:
      "A neural network layer maps an input vector of size 256 to an output vector of size 128. What is the shape of its Jacobian?",
    hint: "Rows index outputs; columns index inputs.",
    explanation:
      "The Jacobian of a function f: R^n → R^m has shape m × n — rows for outputs, columns for inputs. Here n=256 (inputs) and m=128 (outputs), so J ∈ R^{128×256}.",
    options: [
      { id: "a", label: "256 × 128", isCorrect: false },
      { id: "b", label: "128 × 256", isCorrect: true },
      { id: "c", label: "256 × 256", isCorrect: false },
      { id: "d", label: "128 × 128", isCorrect: false },
    ],
  },
  {
    id: "calc-jacobian-linear",
    type: "multiple-choice",
    question:
      "For the affine layer y = Wx + b (W ∈ R^{m×n}), what is the Jacobian ∂y/∂x?",
    hint: "Differentiate each output with respect to each input.",
    explanation:
      "Output i is f_i(x) = Σ_k W_{ik} x_k + b_i. The partial ∂f_i/∂x_j = W_{ij}, so the Jacobian is the weight matrix W itself. The bias b has no effect on the Jacobian because it is a constant.",
    options: [
      { id: "a", label: "W^T", isCorrect: false },
      { id: "b", label: "W", isCorrect: true },
      { id: "c", label: "W^T W", isCorrect: false },
      { id: "d", label: "Identity matrix", isCorrect: false },
    ],
  },
  {
    id: "calc-vjp",
    type: "multiple-choice",
    question:
      "During backpropagation through y = Wx + b, the upstream gradient is v = ∂L/∂y. What is the gradient ∂L/∂x passed to the previous layer?",
    hint: "This is the vector-Jacobian product (VJP): v^T J.",
    explanation:
      "The VJP is v^T J = v^T W, which equals W^T v as a column vector. This is ∂L/∂x — multiply by the transpose of the weight matrix. This is why the backward pass of a linear layer uses W^T while the forward pass uses W.",
    options: [
      { id: "a", label: "Wv", isCorrect: false },
      { id: "b", label: "W^T v", isCorrect: true },
      { id: "c", label: "v^T W^T", isCorrect: false },
      { id: "d", label: "v / W", isCorrect: false },
    ],
  },
  // ── Probability & Statistics ────────────────────────────────────
  {
    id: "prob-expectation",
    type: "multiple-choice",
    question:
      "A die is rolled. What is E[X]?",
    hint: "E[X] = Σ x · P(X = x) over all outcomes.",
    explanation:
      "E[X] = (1+2+3+4+5+6)/6 = 21/6 = 3.5. Each face has probability 1/6, so E[X] = 1×(1/6) + 2×(1/6) + ... + 6×(1/6) = 3.5.",
    options: [
      { id: "a", label: "3", isCorrect: false },
      { id: "b", label: "3.5", isCorrect: true },
      { id: "c", label: "4", isCorrect: false },
      { id: "d", label: "2.5", isCorrect: false },
    ],
  },
  {
    id: "prob-gaussian",
    type: "multiple-choice",
    question:
      "For X ~ N(μ, σ²), approximately what percentage of values fall within 1 standard deviation of the mean?",
    hint: "Recall the 68-95-99.7 rule.",
    explanation:
      "The 68-95-99.7 rule: ~68% of values lie within ±1σ, ~95% within ±2σ, ~99.7% within ±3σ. This is a fundamental property of the Gaussian distribution.",
    options: [
      { id: "a", label: "50%", isCorrect: false },
      { id: "b", label: "68%", isCorrect: true },
      { id: "c", label: "95%", isCorrect: false },
      { id: "d", label: "99.7%", isCorrect: false },
    ],
  },
  {
    id: "prob-independence",
    type: "multiple-choice",
    question:
      "If A and B are independent events, what is P(A ∩ B)?",
    hint: "Independence means knowing B tells you nothing about A.",
    explanation:
      "P(A ∩ B) = P(A) · P(B) when A and B are independent. This is the definition of independence. If dependent, P(A ∩ B) = P(A|B) · P(B) ≠ P(A) · P(B) in general.",
    options: [
      { id: "a", label: "P(A) + P(B)", isCorrect: false },
      { id: "b", label: "P(A) · P(B)", isCorrect: true },
      { id: "c", label: "P(A) / P(B)", isCorrect: false },
      { id: "d", label: "P(A|B)", isCorrect: false },
    ],
  },
  {
    id: "mle-gaussian",
    type: "multiple-choice",
    question:
      "MLE for the mean of a Gaussian distribution gives which estimate?",
    hint: "Maximize the log-likelihood by setting the derivative to zero.",
    explanation:
      "MLE for the Gaussian mean is μ̂ = (1/n)Σxᵢ — the sample mean. Setting ∂ℓ/∂μ = 0 gives exactly the arithmetic mean of the observed data.",
    options: [
      { id: "a", label: "The median of the data", isCorrect: false },
      { id: "b", label: "The sample mean (1/n)Σxᵢ", isCorrect: true },
      { id: "c", label: "The mode of the data", isCorrect: false },
      { id: "d", label: "Zero always", isCorrect: false },
    ],
  },
  {
    id: "mle-loss-connection",
    type: "multiple-choice",
    question:
      "Minimizing mean squared error (MSE) is equivalent to MLE under what assumption?",
    hint: "Which distribution has MSE as its negative log-likelihood?",
    explanation:
      "MSE corresponds to MLE under a Gaussian noise model: yᵢ = f(xᵢ) + ε, ε ~ N(0, σ²). The negative log-likelihood of this model is (up to constants) the MSE.",
    options: [
      { id: "a", label: "Bernoulli noise", isCorrect: false },
      { id: "b", label: "Gaussian (normal) noise", isCorrect: true },
      { id: "c", label: "Laplace noise", isCorrect: false },
      { id: "d", label: "Uniform noise", isCorrect: false },
    ],
  },
  {
    id: "mle-bernoulli",
    type: "multiple-choice",
    question:
      "You flip a coin 10 times and get 7 heads. What is the MLE estimate of p (probability of heads)?",
    hint: "MLE for Bernoulli is the empirical frequency.",
    explanation:
      "p̂_MLE = 7/10 = 0.7. For Bernoulli, the MLE is always the fraction of observed positives. This maximizes the log-likelihood Σ[xᵢ log p + (1−xᵢ) log(1−p)].",
    options: [
      { id: "a", label: "0.5 (assume fair coin)", isCorrect: false },
      { id: "b", label: "0.7", isCorrect: true },
      { id: "c", label: "7", isCorrect: false },
      { id: "d", label: "Cannot be determined", isCorrect: false },
    ],
  },
  {
    id: "bayes-posterior",
    type: "multiple-choice",
    question:
      "P(Disease | Positive test) is the posterior. Which theorem connects it to P(Positive | Disease)?",
    hint: "We need to 'flip' the conditional.",
    explanation:
      "Bayes' theorem: P(D|T+) = P(T+|D)·P(D) / P(T+). It lets us compute the posterior P(Disease|Test) from the likelihood P(Test|Disease) and the prior P(Disease). This is critical in medical diagnosis where we know sensitivity but want the actual disease probability.",
    options: [
      { id: "a", label: "The law of large numbers", isCorrect: false },
      { id: "b", label: "Bayes' theorem", isCorrect: true },
      { id: "c", label: "The central limit theorem", isCorrect: false },
      { id: "d", label: "The law of total expectation", isCorrect: false },
    ],
  },
  {
    id: "bayes-map-regularization",
    type: "multiple-choice",
    question:
      "MAP estimation with a Gaussian prior N(0, τ²) on weights is equivalent to what regularization?",
    hint: "The log of a Gaussian prior involves the squared norm of the weights.",
    explanation:
      "log p(w) = -‖w‖²/(2τ²) + const for a Gaussian prior. Adding this to the log-likelihood gives MAP, which is equivalent to minimizing the loss + λ‖w‖² where λ = 1/(2τ²). That's L2 (Ridge) regularization.",
    options: [
      { id: "a", label: "L1 (Lasso) regularization", isCorrect: false },
      { id: "b", label: "L2 (Ridge) regularization", isCorrect: true },
      { id: "c", label: "Dropout", isCorrect: false },
      { id: "d", label: "Batch normalization", isCorrect: false },
    ],
  },
  {
    id: "bayes-conjugate",
    type: "multiple-choice",
    question:
      "You use a Beta(2, 2) prior for a coin's bias p. After observing 6 heads and 4 tails, what is the posterior?",
    hint: "For Beta-Bernoulli conjugacy: posterior = Beta(α + heads, β + tails).",
    explanation:
      "Beta(2+6, 2+4) = Beta(8, 6). The Beta prior is conjugate to the Bernoulli likelihood — the posterior is also Beta with α updated by the number of heads and β by the number of tails.",
    options: [
      { id: "a", label: "Beta(6, 4)", isCorrect: false },
      { id: "b", label: "Beta(8, 6)", isCorrect: true },
      { id: "c", label: "Beta(2, 2)", isCorrect: false },
      { id: "d", label: "Beta(4, 8)", isCorrect: false },
    ],
  },
  // ── T30 Slider exercises ────────────────────────────────────────
  {
    id: "slider-knn-k",
    type: "slider",
    question:
      "For a training set of 500 points in 2D, set k (number of neighbors) for a balanced KNN classifier.",
    hint: "Too small = memorizes training data (high variance); too large = over-smooths. Rule of thumb: start around √n ≈ 22.",
    explanation:
      "√500 ≈ 22. A range of 3–25 captures the practical sweet spot. k=1 overfits (each point has its own boundary); k>50 typically blurs local structure for 500 samples. Always cross-validate across odd values.",
    min: 1,
    max: 100,
    step: 1,
    correctRange: [3, 25],
    unit: "neighbors",
  },
  {
    id: "slider-svm-c",
    type: "slider",
    question:
      "Set the SVM soft-margin penalty C for a noisy, overlapping 2-class dataset.",
    hint: "C=0 ignores all violations. Very large C tries to classify everything correctly (overfits to noise).",
    explanation:
      "C ∈ [0.1, 10] is the practical starting range. C<0.01 often makes the margin too wide (underfitting). C>100 overfits without clear benefit on noisy data. Always use cross-validation to fine-tune C.",
    min: 0.01,
    max: 100,
    step: 0.01,
    correctRange: [0.1, 10],
    unit: "",
  },
  {
    id: "slider-rbf-gamma",
    type: "slider",
    question:
      "Set the RBF kernel γ for an SVM to capture non-linear structure without memorizing every training point.",
    hint: "High γ = tight kernels → complex/jagged boundary. Low γ = wide kernels → smooth boundary.",
    explanation:
      "γ ∈ [0.01, 1] (with 1/n_features as a common default) balances expressiveness and generalization. γ > 5 typically causes jagged overfitting; γ < 0.001 approaches a linear kernel. Always pair with cross-validated C.",
    min: 0.001,
    max: 10,
    step: 0.001,
    correctRange: [0.01, 1],
    unit: "",
  },
  {
    id: "slider-tsne-perplexity-range",
    type: "slider",
    question:
      "Set the t-SNE perplexity for exploring cluster structure in a 3000-point dataset.",
    hint: "Perplexity ≈ effective number of neighbors. Too low → fractured clusters; too high → washed-out global structure.",
    explanation:
      "Perplexity 20–80 is the practical range for ~3000 points (Maaten & Hinton recommend 5–50 generally). No single perplexity is universally correct — always try several values and compare. The optimal value scales weakly with n.",
    min: 5,
    max: 200,
    step: 1,
    correctRange: [20, 80],
    unit: "",
  },
  {
    id: "slider-epsilon-greedy",
    type: "slider",
    question:
      "Set the initial ε for ε-greedy exploration at the start of Q-learning (before any decay).",
    hint: "At the very start, the Q-table contains random values. Pure exploitation of noise leads nowhere.",
    explanation:
      "Starting near ε = 1.0 (fully random) is standard when the Q-table is uninitialized. Typical schedules start at 1.0 and decay to 0.01–0.1 over training. ε < 0.5 at initialization means the agent exploits noisy Q-values too early.",
    min: 0,
    max: 1,
    step: 0.01,
    correctRange: [0.5, 1.0],
    unit: "",
  },
  {
    id: "slider-vae-beta-strength",
    type: "slider",
    question:
      "Set β in a β-VAE to encourage disentangled representations while keeping reconstructions reasonable.",
    hint: "β = 1 is a standard VAE. Higher β forces more independent latent dimensions at the cost of reconstruction quality.",
    explanation:
      "β ∈ [2, 10] produces disentanglement without catastrophic reconstruction loss. The original β-VAE papers (Higgins et al.) used β = 4–6 on dSprites. β > 10 often collapses the latent space into a few dimensions.",
    min: 0.1,
    max: 20,
    step: 0.1,
    correctRange: [2, 10],
    unit: "",
  },
  {
    id: "slider-dropout",
    type: "slider",
    question:
      "Set the dropout rate for a fully-connected layer in a CNN fine-tuned on a small dataset (~1 000 images).",
    hint: "Too low = no regularization; too high = most activations drop and the network can't learn.",
    explanation:
      "Dropout 0.2–0.5 is the standard range for fully-connected layers. 0.5 was Hinton's original recommendation; 0.2–0.3 is common in convolutional layers. Beyond 0.7, training stalls because too few units survive each forward pass.",
    min: 0,
    max: 0.9,
    step: 0.05,
    correctRange: [0.2, 0.5],
    unit: "",
  },
  {
    id: "slider-momentum",
    type: "slider",
    question:
      "Set the momentum coefficient β for SGD with momentum (not Adam).",
    hint: "β = 0 is standard SGD with no memory. β → 1 gives the optimizer infinitely long memory.",
    explanation:
      "β ∈ [0.8, 0.95] is the practical range; 0.9 is the PyTorch/TensorFlow default. β < 0.5 barely accumulates history. β > 0.99 overshoots sharp minima because past gradients dominate the current one.",
    min: 0,
    max: 1,
    step: 0.01,
    correctRange: [0.8, 0.95],
    unit: "",
  },
  {
    id: "slider-boosting-n-trees",
    type: "slider",
    question:
      "Set the number of boosting rounds for gradient boosting on a medium-sized tabular classification task.",
    hint: "More trees = lower training loss, but too many overfit. Use early stopping to find the sweet spot.",
    explanation:
      "50–500 trees is the practical range; 100–300 is the typical sweet spot. With early stopping (halting when validation loss plateaus), you can search a wider range safely. Optimal count depends on learning rate and tree depth.",
    min: 10,
    max: 1000,
    step: 10,
    correctRange: [50, 500],
    unit: "trees",
  },
  {
    id: "slider-discount-factor",
    type: "slider",
    question:
      "Set the discount factor γ for an RL agent in a game with ~100-step episodes where future rewards matter.",
    hint: "γ = 0 → only immediate reward; γ = 1 → all future rewards equally weighted.",
    explanation:
      "γ ∈ [0.9, 0.99] for 100-step episodes. At γ = 0.99, a reward 100 steps ahead is still weighted at 0.99^100 ≈ 0.37 — meaningful. γ < 0.9 makes the agent myopic, ignoring consequences beyond ~10 steps. γ = 1 causes instability without terminal states.",
    min: 0,
    max: 1,
    step: 0.01,
    correctRange: [0.9, 0.999],
    unit: "",
  },

  // ── Third-lesson exercises (regularization, bias-variance, etc.) ────
  {
    id: "linreg-regularization-lambda",
    type: "multiple-choice",
    question:
      "You train Ridge regression and see training error 0.1, validation error 2.4. What should you do with λ?",
    hint: "A big train/validation gap is a variance problem.",
    explanation:
      "Low training error with much higher validation error means overfitting — a variance problem. Increasing λ strengthens the penalty, shrinks the weights, and trades a little training fit for better generalization. Decreasing λ would widen the gap further.",
    options: [
      { id: "a", label: "Increase λ — the model is overfitting", isCorrect: true },
      { id: "b", label: "Decrease λ — the model is underfitting", isCorrect: false },
      { id: "c", label: "Set λ = 0 to recover OLS", isCorrect: false },
      { id: "d", label: "λ has no effect on this gap", isCorrect: false },
    ],
  },
  {
    id: "knntree-bias-variance",
    type: "multiple-choice",
    question:
      "Training error and validation error are both high, and close together. What's the diagnosis and cure?",
    hint: "The model can't even fit the data it has seen.",
    explanation:
      "High error on both sets with a small gap is a bias problem: the model is too simple to capture the signal. Add capacity (smaller k, deeper trees, more features). Gathering more data fixes variance, not bias — a too-simple model stays too simple with a million samples.",
    options: [
      { id: "a", label: "High bias — increase model capacity", isCorrect: true },
      { id: "b", label: "High variance — collect more data", isCorrect: false },
      { id: "c", label: "High variance — regularize harder", isCorrect: false },
      { id: "d", label: "Irreducible noise — nothing can be done", isCorrect: false },
    ],
  },
  {
    id: "svm-slack-meaning",
    type: "multiple-choice",
    question: "A training point has slack ξ = 1.4 in a soft-margin SVM. Where is it?",
    hint: "ξ = 0 is outside the margin; ξ = 1 is exactly on the decision boundary.",
    explanation:
      "ξ measures margin violation: ξ = 0 means no violation, 0 < ξ < 1 means inside the margin but correctly classified, ξ = 1 means exactly on the boundary, and ξ > 1 means the point has crossed to the wrong side — misclassified. At 1.4, it's 0.4 'past' the boundary.",
    options: [
      { id: "a", label: "On the wrong side of the boundary — misclassified", isCorrect: true },
      { id: "b", label: "Inside the margin, correctly classified", isCorrect: false },
      { id: "c", label: "Exactly on the margin", isCorrect: false },
      { id: "d", label: "Safely outside the margin", isCorrect: false },
    ],
  },
  {
    id: "ensemble-xgb-eta",
    type: "multiple-choice",
    question:
      "You cut XGBoost's learning rate η from 0.3 to 0.03. What else must change for good results?",
    hint: "Each tree now corrects 10× less of the remaining error.",
    explanation:
      "With each tree contributing 10× less, you need roughly proportionally more trees to reach the same training fit — typically with early stopping deciding the exact count. Small η + many trees + early stopping is the standard recipe for better generalization at higher compute cost.",
    options: [
      { id: "a", label: "Train many more trees (ideally with early stopping)", isCorrect: true },
      { id: "b", label: "Reduce the number of trees to compensate", isCorrect: false },
      { id: "c", label: "Increase max_depth to 50", isCorrect: false },
      { id: "d", label: "Nothing — η doesn't interact with tree count", isCorrect: false },
    ],
  },
  {
    id: "clustering-silhouette",
    type: "multiple-choice",
    question: "A point has silhouette score s = −0.3. What does that tell you?",
    hint: "Negative means b(i) < a(i) — compare the definitions.",
    explanation:
      "s < 0 means the point's average distance to its own cluster exceeds its distance to the nearest other cluster — it sits closer to the neighbors than to its assigned mates, suggesting misassignment. Many negative-silhouette points signal a wrong k or the wrong algorithm for the data's shape.",
    options: [
      { id: "a", label: "It's closer to another cluster than its own — likely misassigned", isCorrect: true },
      { id: "b", label: "It's a perfectly central member of its cluster", isCorrect: false },
      { id: "c", label: "It's an outlier far from every cluster", isCorrect: false },
      { id: "d", label: "Silhouette can't be negative — a computation bug", isCorrect: false },
    ],
  },
  {
    id: "pca-components-choice",
    type: "multiple-choice",
    question:
      "PCA feeds a classifier. The first 10 components explain 95% of variance, but validation accuracy peaks at 40 components. How many should you keep?",
    hint: "Variance explained is PCA's objective — is it the classifier's?",
    explanation:
      "Keep 40 — the number that maximizes the metric you actually care about, found by cross-validating the full pipeline. Explained variance measures reconstruction fidelity, not class information; discriminative signal can live in low-variance directions that the 95% rule throws away.",
    options: [
      { id: "a", label: "40 — cross-validated downstream accuracy outranks variance rules", isCorrect: true },
      { id: "b", label: "10 — always stop at 95% variance", isCorrect: false },
      { id: "c", label: "All components — more is always better", isCorrect: false },
      { id: "d", label: "1 — the first component is the most important", isCorrect: false },
    ],
  },
  {
    id: "probmodel-nb-smoothing",
    type: "multiple-choice",
    question:
      "Without Laplace smoothing, what happens when a test email contains a word never seen in spam during training?",
    hint: "One factor in the product becomes zero.",
    explanation:
      "P(word | spam) = 0 makes the entire product zero (log → −∞), so spam scores zero probability no matter how spammy every other word is — one unseen word vetoes all other evidence. Adding pseudo-count α keeps every probability positive and the votes additive.",
    options: [
      { id: "a", label: "P(spam | email) collapses to 0, vetoing all other evidence", isCorrect: true },
      { id: "b", label: "The word is silently skipped", isCorrect: false },
      { id: "c", label: "The classifier falls back to the prior", isCorrect: false },
      { id: "d", label: "Nothing — unseen words get average probability", isCorrect: false },
    ],
  },

  // ── Neural Networks course quiz ──────────────────────────────────────
  {
    id: "nn-quiz-activation",
    type: "multiple-choice",
    question: "Why does a neural network need non-linear activation functions?",
    hint: "What happens when you compose two linear functions?",
    explanation:
      "Composing linear layers gives another linear function: W₂(W₁x) = (W₂W₁)x. Without non-linearities, a 100-layer network can only represent what a single linear layer can. Activations like ReLU break this collapse and let networks approximate arbitrary functions.",
    options: [
      { id: "a", label: "Stacked linear layers collapse into one linear map", isCorrect: true },
      { id: "b", label: "They make training faster", isCorrect: false },
      { id: "c", label: "They prevent overfitting", isCorrect: false },
      { id: "d", label: "They keep outputs positive", isCorrect: false },
    ],
  },
  {
    id: "nn-quiz-backprop",
    type: "multiple-choice",
    question: "What does backpropagation actually compute?",
    hint: "It's an application of one rule from calculus.",
    explanation:
      "Backprop is the chain rule applied efficiently: it computes the gradient of the loss with respect to every weight in one backward sweep, reusing intermediate results. The optimizer (e.g. SGD) then uses those gradients to update weights — backprop itself doesn't update anything.",
    options: [
      { id: "a", label: "The gradient of the loss w.r.t. every weight", isCorrect: true },
      { id: "b", label: "The optimal weight values directly", isCorrect: false },
      { id: "c", label: "The network's prediction", isCorrect: false },
      { id: "d", label: "The learning rate schedule", isCorrect: false },
    ],
  },
  {
    id: "nn-quiz-xor",
    type: "multiple-choice",
    question: "Why can't a single perceptron solve XOR?",
    hint: "Try drawing the four XOR points and separating them with one line.",
    explanation:
      "A perceptron draws a single linear decision boundary. XOR's positive points (0,1) and (1,0) sit on opposite corners, so no single line separates them from (0,0) and (1,1). A hidden layer fixes this by transforming the inputs into a linearly separable space.",
    options: [
      { id: "a", label: "XOR is not linearly separable", isCorrect: true },
      { id: "b", label: "XOR needs more than two inputs", isCorrect: false },
      { id: "c", label: "Perceptrons can't take binary inputs", isCorrect: false },
      { id: "d", label: "The learning rate is too small", isCorrect: false },
    ],
  },
  {
    id: "nn-quiz-forward",
    type: "multiple-choice",
    question: "A dense layer with weights W, bias b, and activation σ computes which function of its input x?",
    hint: "Linear transformation first, then the non-linearity.",
    explanation:
      "Each layer applies an affine map then a non-linearity: σ(Wx + b). The order matters — applying σ before the weights would give Wσ(x) + b, a different (and less useful) computation.",
    options: [
      { id: "a", label: "σ(Wx + b)", isCorrect: true },
      { id: "b", label: "Wσ(x) + b", isCorrect: false },
      { id: "c", label: "σ(W)x + b", isCorrect: false },
      { id: "d", label: "Wx + σ(b)", isCorrect: false },
    ],
  },
  {
    id: "nn-quiz-init",
    type: "multiple-choice",
    question: "Why not initialize all weights to zero?",
    hint: "Think about what gradients each hidden neuron would receive.",
    explanation:
      "With identical weights, every neuron in a layer computes the same output and receives the same gradient — they stay identical forever. This symmetry means the layer effectively has one neuron. Random initialization breaks the symmetry so neurons can specialize.",
    options: [
      { id: "a", label: "All neurons stay identical — symmetry is never broken", isCorrect: true },
      { id: "b", label: "Zero weights cause division-by-zero errors", isCorrect: false },
      { id: "c", label: "The loss would be undefined", isCorrect: false },
      { id: "d", label: "Biases would also have to be zero", isCorrect: false },
    ],
  },

  {
    id: "nn-batchnorm-step",
    type: "multiple-choice",
    question:
      "A mini-batch has pre-activations [1, 3, 5, 7] for one feature. After BatchNorm (with γ=1, β=0), what is the normalized value of 7?",
    hint: "Compute the batch mean and standard deviation first.",
    explanation:
      "Mean = (1+3+5+7)/4 = 4. Variance = ((1-4)²+(3-4)²+(5-4)²+(7-4)²)/4 = (9+1+1+9)/4 = 5. Std = √5 ≈ 2.236. Normalized 7: (7-4)/√5 ≈ 3/2.236 ≈ 1.342. With γ=1, β=0 the output is ≈ 1.342.",
    options: [
      { id: "a", label: "≈ 1.342", isCorrect: true },
      { id: "b", label: "7", isCorrect: false },
      { id: "c", label: "0.75", isCorrect: false },
      { id: "d", label: "≈ 0.447", isCorrect: false },
    ],
  },
  {
    id: "nn-dropout-inverted",
    type: "multiple-choice",
    question:
      "With inverted dropout (rate p=0.5), a surviving neuron's activation is multiplied by:",
    hint: "Inverted dropout keeps expected activation magnitude constant.",
    explanation:
      "With dropout rate p, only (1-p) fraction of neurons survive. To keep the expected sum the same as without dropout, survivors are scaled by 1/(1-p). For p=0.5: scale = 1/0.5 = 2. This means no scaling is needed at inference time — a key advantage of inverted dropout.",
    options: [
      { id: "a", label: "0.5", isCorrect: false },
      { id: "b", label: "1 (no scaling)", isCorrect: false },
      { id: "c", label: "2 (i.e., 1/(1-p))", isCorrect: true },
      { id: "d", label: "4", isCorrect: false },
    ],
  },
  {
    id: "nn-regularizer-type",
    type: "multiple-choice",
    question:
      "A network achieves 98% training accuracy but only 72% validation accuracy. Which technique is most likely to help?",
    hint: "Think about what each technique addresses: optimization vs. overfitting.",
    explanation:
      "The large gap between training and validation accuracy is a classic sign of overfitting — the network has memorized the training data. Dropout reduces overfitting by forcing the network to learn redundant, generalizable features. BatchNorm helps with training instability and speed, not overfitting per se.",
    options: [
      { id: "a", label: "BatchNorm — to stabilize training", isCorrect: false },
      { id: "b", label: "Dropout — to reduce overfitting", isCorrect: true },
      { id: "c", label: "A higher learning rate — to escape local minima", isCorrect: false },
      { id: "d", label: "Removing BatchNorm — it is causing the gap", isCorrect: false },
    ],
  },
  {
    id: "nn-xor-solution",
    type: "multiple-choice",
    question:
      "A single perceptron cannot solve XOR. What is the simplest architecture that can?",
    hint: "Think about what a hidden layer adds that a single layer doesn't have.",
    explanation:
      "A two-layer MLP with one hidden layer (even just 2 hidden neurons) can solve XOR. The hidden layer learns a new representation where the two XOR=1 points map to the same hidden activation, making the problem linearly separable for the output neuron. No single linear classifier (perceptron) can separate XOR because the two classes are not linearly separable.",
    options: [
      { id: "a", label: "A perceptron with more inputs", isCorrect: false },
      { id: "b", label: "A two-layer MLP with one hidden layer", isCorrect: true },
      { id: "c", label: "A deeper network with at least 3 layers", isCorrect: false },
      { id: "d", label: "A perceptron with a different activation function", isCorrect: false },
    ],
  },
  {
    id: "nn-softmax-gradient",
    type: "multiple-choice",
    question:
      "After softmax, a 3-class model outputs probabilities (0.7, 0.2, 0.1). The true label is class 0. What is ∂L/∂z₀, the cross-entropy gradient w.r.t. logit 0?",
    hint: "For softmax + cross-entropy, ∂L/∂z_k = p̂_k − 1[k=y].",
    explanation:
      "The gradient of cross-entropy loss w.r.t. logit k is p̂_k − 1[k=y]. For the correct class (k=0): 0.7 − 1 = −0.3. The negative sign means we push logit 0 up. For incorrect classes: 0.2 − 0 = 0.2 and 0.1 − 0 = 0.1 (push those logits down). The gradients sum to zero: −0.3+0.2+0.1=0.",
    options: [
      { id: "a", label: "−0.3", isCorrect: true },
      { id: "b", label: "0.7", isCorrect: false },
      { id: "c", label: "0.3", isCorrect: false },
      { id: "d", label: "−0.7", isCorrect: false },
    ],
  },
  {
    id: "nn-perceptron-update",
    type: "multiple-choice",
    question:
      "A perceptron with w=(1, −1), b=0 sees input x=(2, 3). It predicts 0, but the true label is 1. With learning rate η=1, what are the new weights?",
    hint: "Perceptron rule: w ← w + η(y − ŷ)x.",
    explanation:
      "The perceptron rule adds η(y−ŷ)x to the weights. Since y=1 and ŷ=0, the update is +x=(2,3). New w = (1+2, −1+3) = (3, 2). The bias b also gets η(y−ŷ) = 1 added, so b becomes 1. The new hyperplane is rotated to correctly classify this example.",
    options: [
      { id: "a", label: "w = (3, 2)", isCorrect: true },
      { id: "b", label: "w = (−1, −4)", isCorrect: false },
      { id: "c", label: "w = (2, −3)", isCorrect: false },
      { id: "d", label: "w = (1, −1) (no change)", isCorrect: false },
    ],
  },

  // ── Linear & Logistic Regression course quiz ─────────────────────────
  {
    id: "linreg-quiz-ols",
    type: "multiple-choice",
    question: "Ordinary least squares chooses the line that minimizes what?",
    hint: "Residual = actual − predicted.",
    explanation:
      "OLS minimizes the sum of squared residuals Σ(yᵢ − ŷᵢ)². Squaring penalizes large errors heavily and makes the objective differentiable everywhere, which yields the closed-form normal equations.",
    options: [
      { id: "a", label: "Sum of squared residuals", isCorrect: true },
      { id: "b", label: "Sum of absolute residuals", isCorrect: false },
      { id: "c", label: "Maximum residual", isCorrect: false },
      { id: "d", label: "Number of misclassified points", isCorrect: false },
    ],
  },
  {
    id: "linreg-quiz-lasso",
    type: "multiple-choice",
    question: "What distinguishes Lasso (L1) from Ridge (L2) regularization in practice?",
    hint: "Look at the shape of the L1 constraint region — it has corners.",
    explanation:
      "Lasso's L1 penalty has corners at zero, so the optimum often lands exactly on an axis — driving some weights to exactly 0 and performing feature selection. Ridge shrinks all weights smoothly toward zero but rarely makes any exactly zero.",
    options: [
      { id: "a", label: "Lasso drives some weights exactly to zero", isCorrect: true },
      { id: "b", label: "Lasso always achieves lower test error", isCorrect: false },
      { id: "c", label: "Ridge removes features; Lasso shrinks them", isCorrect: false },
      { id: "d", label: "Lasso has a closed-form solution; Ridge does not", isCorrect: false },
    ],
  },
  {
    id: "linreg-quiz-sigmoid",
    type: "multiple-choice",
    question: "What does logistic regression output for an input x?",
    hint: "The sigmoid squashes wᵀx + b into (0, 1).",
    explanation:
      "Logistic regression outputs σ(wᵀx + b) ∈ (0, 1), interpreted as P(y = 1 | x). It's a probability, not a class — you get a class by thresholding (usually at 0.5), and you can move that threshold to trade precision against recall.",
    options: [
      { id: "a", label: "A probability that y = 1", isCorrect: true },
      { id: "b", label: "A class label directly", isCorrect: false },
      { id: "c", label: "An unbounded real score", isCorrect: false },
      { id: "d", label: "The distance to the decision boundary", isCorrect: false },
    ],
  },
  {
    id: "linreg-quiz-boundary",
    type: "multiple-choice",
    question: "What shape is logistic regression's decision boundary?",
    hint: "Where does σ(wᵀx + b) = 0.5?",
    explanation:
      "σ(z) = 0.5 exactly when z = 0, so the boundary is the set wᵀx + b = 0 — a straight line (hyperplane in higher dimensions). The sigmoid makes the output non-linear in x, but the boundary itself stays linear.",
    options: [
      { id: "a", label: "Linear (a hyperplane)", isCorrect: true },
      { id: "b", label: "S-shaped, like the sigmoid", isCorrect: false },
      { id: "c", label: "Circular", isCorrect: false },
      { id: "d", label: "Piecewise constant", isCorrect: false },
    ],
  },
  {
    id: "linreg-quiz-r2",
    type: "multiple-choice",
    question: "An R² of 0.8 means what?",
    hint: "Compare your model's squared error to that of always predicting the mean.",
    explanation:
      "R² = 1 − SS_res/SS_tot: the fraction of the target's variance the model explains relative to a predict-the-mean baseline. 0.8 means the model accounts for 80% of the variance. It is not accuracy, a probability, or a correlation coefficient (though it equals the squared correlation for simple linear regression).",
    options: [
      { id: "a", label: "The model explains 80% of the variance in y", isCorrect: true },
      { id: "b", label: "80% of predictions are correct", isCorrect: false },
      { id: "c", label: "The slope of the fitted line is 0.8", isCorrect: false },
      { id: "d", label: "20% of the data are outliers", isCorrect: false },
    ],
  },

  // ── KNN & Decision Trees course quiz ─────────────────────────────────
  {
    id: "knntree-quiz-k1",
    type: "multiple-choice",
    question: "What happens to a KNN classifier as k decreases to 1?",
    hint: "With k = 1, the training error is exactly zero. Suspicious?",
    explanation:
      "k = 1 memorizes the training set — every training point is its own nearest neighbor, so training error is 0 while the boundary becomes jagged and noise-sensitive: low bias, high variance. Larger k smooths the boundary, trading variance for bias.",
    options: [
      { id: "a", label: "Lower bias, higher variance — it overfits", isCorrect: true },
      { id: "b", label: "Higher bias, lower variance — it underfits", isCorrect: false },
      { id: "c", label: "Both bias and variance decrease", isCorrect: false },
      { id: "d", label: "Nothing — k doesn't affect the boundary", isCorrect: false },
    ],
  },
  {
    id: "knntree-quiz-scaling",
    type: "multiple-choice",
    question: "Why does KNN usually require feature scaling?",
    hint: "Imagine one feature in meters (0–2) and another in dollars (0–100,000).",
    explanation:
      "KNN ranks neighbors by distance. A feature with a large numeric range dominates the distance computation, making other features irrelevant. Standardizing puts features on comparable scales so each contributes meaningfully. Tree-based models don't need this — splits are scale-invariant.",
    options: [
      { id: "a", label: "Large-range features dominate the distance metric", isCorrect: true },
      { id: "b", label: "Unscaled features cause numeric overflow", isCorrect: false },
      { id: "c", label: "Scaling reduces the number of neighbors needed", isCorrect: false },
      { id: "d", label: "Distances are undefined for unscaled data", isCorrect: false },
    ],
  },
  {
    id: "knntree-quiz-infogain",
    type: "multiple-choice",
    question: "Information gain measures what about a candidate split?",
    hint: "Entropy before vs. entropy after.",
    explanation:
      "Information gain = entropy(parent) − weighted average entropy(children). A split that produces purer child nodes reduces entropy more, so the tree greedily picks the split with the highest gain at each node.",
    options: [
      { id: "a", label: "The reduction in entropy it achieves", isCorrect: true },
      { id: "b", label: "The number of samples it separates", isCorrect: false },
      { id: "c", label: "The depth it adds to the tree", isCorrect: false },
      { id: "d", label: "The accuracy of the resulting leaves", isCorrect: false },
    ],
  },
  {
    id: "knntree-quiz-gini",
    type: "multiple-choice",
    question: "What is the Gini impurity of a node containing only one class?",
    hint: "Gini = 1 − Σpᵢ². What if one pᵢ = 1?",
    explanation:
      "A pure node has p = 1 for one class, so Gini = 1 − 1² = 0. Gini impurity is the probability of misclassifying a randomly drawn sample if labeled by the node's class distribution — zero when there's nothing to confuse.",
    options: [
      { id: "a", label: "0", isCorrect: true },
      { id: "b", label: "1", isCorrect: false },
      { id: "c", label: "0.5", isCorrect: false },
      { id: "d", label: "Depends on the number of samples", isCorrect: false },
    ],
  },
  {
    id: "knntree-quiz-overfit",
    type: "multiple-choice",
    question: "An unconstrained decision tree grown to purity usually does what?",
    hint: "Each leaf may end up holding a single training point.",
    explanation:
      "Grown to purity, a tree carves a leaf for nearly every training point, memorizing noise — near-perfect training accuracy, poor generalization. Limiting depth, requiring minimum samples per leaf, or pruning trades a little training accuracy for much better test performance.",
    options: [
      { id: "a", label: "Overfits — memorizes noise in the training data", isCorrect: true },
      { id: "b", label: "Underfits — the tree is too simple", isCorrect: false },
      { id: "c", label: "Generalizes perfectly", isCorrect: false },
      { id: "d", label: "Fails to converge", isCorrect: false },
    ],
  },

  // ── CNNs course quiz ─────────────────────────────────────────────────
  {
    id: "cnn-quiz-sharing",
    type: "multiple-choice",
    question: "What is the main benefit of weight sharing in a convolutional layer?",
    hint: "The same 3×3 kernel slides across the whole image.",
    explanation:
      "One kernel is reused at every spatial position, so an edge detector learned in one corner works everywhere (translation equivariance) and the layer needs only kernel-sized parameters instead of one weight per pixel pair — a dense layer on a 224×224 image would need billions.",
    options: [
      { id: "a", label: "Far fewer parameters + features detected anywhere in the image", isCorrect: true },
      { id: "b", label: "It eliminates the need for pooling", isCorrect: false },
      { id: "c", label: "It guarantees rotation invariance", isCorrect: false },
      { id: "d", label: "It makes the network deeper", isCorrect: false },
    ],
  },
  {
    id: "cnn-quiz-pooling",
    type: "multiple-choice",
    question: "What does max pooling contribute to a CNN?",
    hint: "It keeps the strongest activation in each window and throws away its exact position.",
    explanation:
      "Max pooling downsamples feature maps, cutting computation and growing the effective receptive field, while keeping only the strongest response per window — adding tolerance to small translations. It has no learnable parameters.",
    options: [
      { id: "a", label: "Downsampling and small-shift invariance", isCorrect: true },
      { id: "b", label: "Additional learnable parameters", isCorrect: false },
      { id: "c", label: "Non-linearity, replacing ReLU", isCorrect: false },
      { id: "d", label: "Normalization of activations", isCorrect: false },
    ],
  },
  {
    id: "cnn-quiz-outputsize",
    type: "multiple-choice",
    question: "A 32×32 input goes through a 5×5 convolution with stride 1 and no padding. What's the output size?",
    hint: "Output = (N − F)/S + 1.",
    explanation:
      "(32 − 5)/1 + 1 = 28, so the output is 28×28. The kernel can only be placed where it fully fits, losing F − 1 = 4 pixels per dimension. 'Same' padding (P = 2 here) would preserve 32×32.",
    options: [
      { id: "a", label: "28×28", isCorrect: true },
      { id: "b", label: "32×32", isCorrect: false },
      { id: "c", label: "27×27", isCorrect: false },
      { id: "d", label: "30×30", isCorrect: false },
    ],
  },
  {
    id: "cnn-quiz-receptive",
    type: "multiple-choice",
    question: "How does the receptive field of a neuron change with network depth?",
    hint: "A neuron in layer 2 sees a window of layer-1 outputs, each of which saw a window of pixels.",
    explanation:
      "Each layer's neurons see a window of the previous layer, so the region of the input image influencing a neuron compounds with depth. Early layers see edges in small patches; deep layers see object-scale structure — this growing receptive field is what builds the feature hierarchy.",
    options: [
      { id: "a", label: "It grows — deep neurons see larger input regions", isCorrect: true },
      { id: "b", label: "It shrinks with depth", isCorrect: false },
      { id: "c", label: "It stays fixed at the kernel size", isCorrect: false },
      { id: "d", label: "It depends only on the learning rate", isCorrect: false },
    ],
  },
  {
    id: "cnn-quiz-transfer",
    type: "multiple-choice",
    question: "Why does transfer learning from ImageNet work for, say, medical images?",
    hint: "What do the first few conv layers of any vision network learn?",
    explanation:
      "Early conv layers learn generic features — edges, textures, color blobs — that are useful for almost any visual task. Reusing them means only the task-specific later layers need training, so a small dataset suffices. The less similar the domain, the more layers you'll want to fine-tune.",
    options: [
      { id: "a", label: "Early layers learn generic features that transfer across domains", isCorrect: true },
      { id: "b", label: "ImageNet contains medical images", isCorrect: false },
      { id: "c", label: "Pretrained weights are always optimal", isCorrect: false },
      { id: "d", label: "It avoids the need for any labeled data", isCorrect: false },
    ],
  },

  {
    id: "cnn-1x1-params",
    type: "multiple-choice",
    question:
      "A 1×1 convolution takes a (H, W, 256) feature map and outputs (H, W, 64). How many learnable parameters does it have (ignoring bias)?",
    hint: "A 1×1 conv is equivalent to a fully-connected layer applied at each spatial position independently.",
    explanation:
      "A 1×1 convolution with C_in=256 input channels and C_out=64 output channels has weight shape (1, 1, 256, 64) = 256×64 = 16,384 parameters. It applies the same linear projection at every spatial position, mixing channels without looking at neighbours.",
    options: [
      { id: "a", label: "256", isCorrect: false },
      { id: "b", label: "16,384 (256×64)", isCorrect: true },
      { id: "c", label: "64", isCorrect: false },
      { id: "d", label: "4,096 (64×64)", isCorrect: false },
    ],
  },
  {
    id: "cnn-bottleneck",
    type: "multiple-choice",
    question:
      "A ResNet bottleneck block processes a (H, W, 256) input with: 1×1 conv (256→64), 3×3 conv (64→64), 1×1 conv (64→256). Approximately how many parameters does this use vs. a naive 3×3 conv (256→256)?",
    hint: "Count parameters for each layer: kernel_h × kernel_w × C_in × C_out.",
    explanation:
      "Bottleneck: (1×1×256×64) + (3×3×64×64) + (1×1×64×256) = 16,384 + 36,864 + 16,384 = 69,632. Naive 3×3: 3×3×256×256 = 589,824. The bottleneck uses ~8.5× fewer parameters for a similar effective computation.",
    options: [
      { id: "a", label: "The same — same receptive field, same capacity", isCorrect: false },
      { id: "b", label: "About 8× fewer parameters", isCorrect: true },
      { id: "c", label: "About 2× more parameters", isCorrect: false },
      { id: "d", label: "About 64× fewer parameters", isCorrect: false },
    ],
  },
  {
    id: "cnn-residual-gradient",
    type: "multiple-choice",
    question:
      "In a residual block y = F(x) + x, what is ∂y/∂x?",
    hint: "Differentiate both the residual path F(x) and the skip path x.",
    explanation:
      "By the chain rule, ∂y/∂x = ∂F/∂x + 1. The constant 1 comes from the skip connection (identity path). Even if ∂F/∂x ≈ 0 (e.g. dead ReLUs), the gradient of the loss still flows back through the skip path unchanged. This is why residual connections solve the vanishing gradient problem in very deep networks.",
    options: [
      { id: "a", label: "∂F/∂x", isCorrect: false },
      { id: "b", label: "∂F/∂x + 1", isCorrect: true },
      { id: "c", label: "2 · ∂F/∂x", isCorrect: false },
      { id: "d", label: "0 when F(x) = 0", isCorrect: false },
    ],
  },

  // ── SVM course quiz ──────────────────────────────────────────────────
  {
    id: "svm-quiz-sv",
    type: "multiple-choice",
    question: "Which training points actually determine an SVM's decision boundary?",
    hint: "Most points could be deleted without changing the solution.",
    explanation:
      "Only the support vectors — points on or inside the margin — have non-zero weight in the solution. Every other point could be removed and the boundary wouldn't move. This sparsity is what makes SVMs memory-efficient at prediction time.",
    options: [
      { id: "a", label: "The support vectors on or inside the margin", isCorrect: true },
      { id: "b", label: "All training points equally", isCorrect: false },
      { id: "c", label: "The class centroids", isCorrect: false },
      { id: "d", label: "A random subsample", isCorrect: false },
    ],
  },
  {
    id: "svm-quiz-margin",
    type: "multiple-choice",
    question: "Maximizing the margin is equivalent to minimizing what?",
    hint: "The margin width is 2/‖w‖.",
    explanation:
      "The margin equals 2/‖w‖, so maximizing it means minimizing ‖w‖ (in practice ½‖w‖² for a differentiable objective) subject to all points being classified correctly with margin ≥ 1. A wider margin gives better generalization guarantees.",
    options: [
      { id: "a", label: "The norm of the weight vector ‖w‖", isCorrect: true },
      { id: "b", label: "The number of support vectors", isCorrect: false },
      { id: "c", label: "The training error", isCorrect: false },
      { id: "d", label: "The bias term b", isCorrect: false },
    ],
  },
  {
    id: "svm-quiz-kernel",
    type: "multiple-choice",
    question: "What does the kernel trick let an SVM do?",
    hint: "K(x, x') = φ(x)·φ(x') — but you never compute φ.",
    explanation:
      "The dual SVM only needs dot products between data points. A kernel computes φ(x)·φ(x') in a high- (even infinite-) dimensional feature space without ever constructing φ(x), so the SVM learns a non-linear boundary at essentially linear-model cost.",
    options: [
      { id: "a", label: "Learn non-linear boundaries without computing the feature map", isCorrect: true },
      { id: "b", label: "Train faster on linearly separable data", isCorrect: false },
      { id: "c", label: "Avoid the need for support vectors", isCorrect: false },
      { id: "d", label: "Guarantee zero training error", isCorrect: false },
    ],
  },
  {
    id: "svm-quiz-gamma",
    type: "multiple-choice",
    question: "What does a very large γ in an RBF kernel do to the decision boundary?",
    hint: "γ controls how fast similarity decays with distance.",
    explanation:
      "Large γ makes the kernel's influence extremely local — each support vector affects only its immediate neighborhood, so the boundary wraps tightly around individual points and overfits. Small γ smooths the boundary toward nearly linear.",
    options: [
      { id: "a", label: "Makes it wiggly and prone to overfitting", isCorrect: true },
      { id: "b", label: "Makes it smoother and more linear", isCorrect: false },
      { id: "c", label: "Has no effect on its shape", isCorrect: false },
      { id: "d", label: "Forces it through the origin", isCorrect: false },
    ],
  },
  {
    id: "svm-quiz-c",
    type: "multiple-choice",
    question: "In a soft-margin SVM, what does a very large C encourage?",
    hint: "C is the price of each margin violation.",
    explanation:
      "C penalizes slack (margin violations). A huge C makes violations so expensive the optimizer fits the training data as tightly as possible — narrow margin, risk of overfitting. Small C tolerates misclassifications in exchange for a wider, more robust margin.",
    options: [
      { id: "a", label: "Few margin violations — narrow margin, possible overfitting", isCorrect: true },
      { id: "b", label: "A wider margin with more violations", isCorrect: false },
      { id: "c", label: "More support vectors", isCorrect: false },
      { id: "d", label: "A non-linear boundary", isCorrect: false },
    ],
  },

  // ── Ensemble Methods course quiz ─────────────────────────────────────
  {
    id: "ensemble-quiz-bagging",
    type: "multiple-choice",
    question: "Bagging primarily reduces which component of error?",
    hint: "Averaging many noisy estimates does what to the noise?",
    explanation:
      "Bagging trains the same model on bootstrap resamples and averages. Averaging nearly-independent estimates cancels their fluctuations — variance drops while bias stays roughly the same. That's why it shines with high-variance learners like deep decision trees.",
    options: [
      { id: "a", label: "Variance", isCorrect: true },
      { id: "b", label: "Bias", isCorrect: false },
      { id: "c", label: "Irreducible noise", isCorrect: false },
      { id: "d", label: "Both bias and noise", isCorrect: false },
    ],
  },
  {
    id: "ensemble-quiz-boosting",
    type: "multiple-choice",
    question: "How does boosting differ fundamentally from bagging?",
    hint: "Can you train boosted trees in parallel?",
    explanation:
      "Bagging trains members independently (parallelizable) and averages them. Boosting is sequential: each new weak learner focuses on the mistakes of the ensemble so far — reweighted points in AdaBoost, residual gradients in gradient boosting — so it reduces bias, not just variance.",
    options: [
      { id: "a", label: "Models are trained sequentially, each fixing previous errors", isCorrect: true },
      { id: "b", label: "Boosting uses deeper trees", isCorrect: false },
      { id: "c", label: "Boosting requires fewer models", isCorrect: false },
      { id: "d", label: "Boosting only works for regression", isCorrect: false },
    ],
  },
  {
    id: "ensemble-quiz-rf",
    type: "multiple-choice",
    question: "Beyond bagging, what extra randomness does a Random Forest add?",
    hint: "Look at what each split is allowed to consider.",
    explanation:
      "At every split, each tree considers only a random subset of features (typically √p for classification). This decorrelates the trees — otherwise a single dominant feature would head every tree, and averaging correlated trees barely reduces variance.",
    options: [
      { id: "a", label: "Each split considers only a random subset of features", isCorrect: true },
      { id: "b", label: "Random learning rates per tree", isCorrect: false },
      { id: "c", label: "Random class labels during training", isCorrect: false },
      { id: "d", label: "Randomly deleted branches after training", isCorrect: false },
    ],
  },
  {
    id: "ensemble-quiz-oob",
    type: "multiple-choice",
    question: "What are out-of-bag (OOB) samples used for?",
    hint: "Each bootstrap sample leaves out ~37% of the training points.",
    explanation:
      "A bootstrap resample omits ~1/e ≈ 37% of points. Each point can be evaluated by the trees that never saw it, giving an unbiased validation estimate for free — no separate held-out set needed.",
    options: [
      { id: "a", label: "Free validation — estimating generalization without a held-out set", isCorrect: true },
      { id: "b", label: "Extra training data for deeper trees", isCorrect: false },
      { id: "c", label: "Initializing tree weights", isCorrect: false },
      { id: "d", label: "Balancing class distributions", isCorrect: false },
    ],
  },
  {
    id: "ensemble-quiz-gbt",
    type: "multiple-choice",
    question: "In gradient boosting, what does each new tree fit?",
    hint: "For squared error, this is just the residuals.",
    explanation:
      "Each tree fits the negative gradient of the loss with respect to the current ensemble's predictions — the 'pseudo-residuals.' For squared error these are literally the residuals y − ŷ. Adding the tree (scaled by the learning rate) is a gradient-descent step in function space.",
    options: [
      { id: "a", label: "The negative gradient of the loss (pseudo-residuals)", isCorrect: true },
      { id: "b", label: "The original labels, reweighted", isCorrect: false },
      { id: "c", label: "The predictions of the previous tree", isCorrect: false },
      { id: "d", label: "A random subsample of labels", isCorrect: false },
    ],
  },

  // ── Clustering course quiz ───────────────────────────────────────────
  {
    id: "clustering-quiz-objective",
    type: "multiple-choice",
    question: "What objective does K-Means minimize?",
    hint: "It's also called inertia.",
    explanation:
      "K-Means minimizes within-cluster sum of squared distances to centroids (inertia): Σᵢ ‖xᵢ − μ_c(i)‖². Both steps reduce it — assignment picks the nearest centroid, the update moves each centroid to its cluster mean — so the algorithm always converges (to a local optimum).",
    options: [
      { id: "a", label: "Sum of squared distances from points to their centroids", isCorrect: true },
      { id: "b", label: "Distance between the two closest centroids", isCorrect: false },
      { id: "c", label: "The number of clusters", isCorrect: false },
      { id: "d", label: "Cross-entropy between clusters", isCorrect: false },
    ],
  },
  {
    id: "clustering-quiz-kmeans-fail",
    type: "multiple-choice",
    question: "On which data shape does K-Means fail badly?",
    hint: "K-Means assigns each point to the nearest centroid — what geometry does that impose?",
    explanation:
      "Nearest-centroid assignment partitions space into convex (Voronoi) cells, so K-Means assumes roughly spherical, similar-sized clusters. Two interleaved crescents or concentric rings get sliced through the middle. Density-based methods like DBSCAN handle those.",
    options: [
      { id: "a", label: "Non-convex shapes like nested rings or crescents", isCorrect: true },
      { id: "b", label: "Well-separated spherical blobs", isCorrect: false },
      { id: "c", label: "Any data with more than two clusters", isCorrect: false },
      { id: "d", label: "High-dimensional data of any shape", isCorrect: false },
    ],
  },
  {
    id: "clustering-quiz-dbscan",
    type: "multiple-choice",
    question: "What can DBSCAN do that K-Means cannot?",
    hint: "DBSCAN's clusters are regions of high density.",
    explanation:
      "DBSCAN grows clusters from density-connected points, so it finds arbitrarily shaped clusters, determines the number of clusters itself, and explicitly labels sparse points as noise. Its trade-off: sensitivity to ε/minPts and trouble with clusters of differing densities.",
    options: [
      { id: "a", label: "Find arbitrary-shaped clusters and label outliers as noise", isCorrect: true },
      { id: "b", label: "Run faster on all datasets", isCorrect: false },
      { id: "c", label: "Guarantee a globally optimal clustering", isCorrect: false },
      { id: "d", label: "Work without any hyperparameters", isCorrect: false },
    ],
  },
  {
    id: "clustering-quiz-elbow",
    type: "multiple-choice",
    question: "How does the elbow method choose k?",
    hint: "Plot inertia against k and look at the shape of the curve.",
    explanation:
      "Inertia always decreases as k grows (more centroids = shorter distances), so you can't just minimize it. The elbow is where adding another cluster stops buying much — the point of diminishing returns. Silhouette score is a common, more principled alternative.",
    options: [
      { id: "a", label: "Pick k where the inertia curve's improvement levels off", isCorrect: true },
      { id: "b", label: "Pick k that minimizes inertia", isCorrect: false },
      { id: "c", label: "Pick k equal to the number of features", isCorrect: false },
      { id: "d", label: "Pick the k with the most balanced cluster sizes", isCorrect: false },
    ],
  },
  {
    id: "clustering-quiz-linkage",
    type: "multiple-choice",
    question: "Single linkage in hierarchical clustering is prone to which artifact?",
    hint: "It merges clusters based on their two closest points.",
    explanation:
      "Single linkage measures cluster distance by the closest pair, so a thin trail of intermediate points can 'chain' two well-separated groups into one long straggly cluster. Complete or Ward linkage resists chaining by considering farthest pairs or variance.",
    options: [
      { id: "a", label: "Chaining — long straggly clusters connected by stray points", isCorrect: true },
      { id: "b", label: "Splitting every cluster in half", isCorrect: false },
      { id: "c", label: "Ignoring small clusters entirely", isCorrect: false },
      { id: "d", label: "Producing overlapping clusters", isCorrect: false },
    ],
  },

  // ── PCA & Dimensionality Reduction course quiz ───────────────────────
  {
    id: "pca-quiz-firstpc",
    type: "multiple-choice",
    question: "What is the first principal component?",
    hint: "Project the data onto a line — which line keeps the data most spread out?",
    explanation:
      "The first PC is the direction along which projected data has maximum variance — equivalently, the line minimizing total squared perpendicular reconstruction error. Each subsequent PC maximizes remaining variance while staying orthogonal to the previous ones.",
    options: [
      { id: "a", label: "The direction of maximum variance in the data", isCorrect: true },
      { id: "b", label: "The feature with the largest values", isCorrect: false },
      { id: "c", label: "The direction connecting the two farthest points", isCorrect: false },
      { id: "d", label: "The mean of all data points", isCorrect: false },
    ],
  },
  {
    id: "pca-quiz-eigen",
    type: "multiple-choice",
    question: "Mathematically, the principal components are the…",
    hint: "PCA diagonalizes a particular matrix built from the data.",
    explanation:
      "PCs are the eigenvectors of the data's covariance matrix, and each eigenvalue is the variance captured along its eigenvector. Sorting eigenvalues descending orders the components by importance — this is why eigendecomposition (or SVD) is the engine of PCA.",
    options: [
      { id: "a", label: "Eigenvectors of the covariance matrix", isCorrect: true },
      { id: "b", label: "Rows of the data matrix", isCorrect: false },
      { id: "c", label: "Gradients of the loss function", isCorrect: false },
      { id: "d", label: "Cluster centroids of the data", isCorrect: false },
    ],
  },
  {
    id: "pca-quiz-variance",
    type: "multiple-choice",
    question: "The 'explained variance ratio' of a principal component equals…",
    hint: "Each eigenvalue measures variance along its component.",
    explanation:
      "It's that component's eigenvalue divided by the sum of all eigenvalues — the fraction of total variance it captures. Cumulative explained variance is the standard tool for choosing how many components to keep (e.g., enough for 95%).",
    options: [
      { id: "a", label: "Its eigenvalue over the sum of all eigenvalues", isCorrect: true },
      { id: "b", label: "Its eigenvalue times the number of features", isCorrect: false },
      { id: "c", label: "The norm of its eigenvector", isCorrect: false },
      { id: "d", label: "1 divided by the component's rank", isCorrect: false },
    ],
  },
  {
    id: "pca-quiz-standardize",
    type: "multiple-choice",
    question: "Why standardize features before PCA?",
    hint: "Variance has units. Income in dollars has huge variance; age in years doesn't.",
    explanation:
      "PCA chases variance, and raw variance depends on units. A feature measured in large numbers (income in dollars) swamps one in small numbers (age in years), so PC1 would just point along the big-unit feature. Standardizing makes variance comparable so every feature competes fairly.",
    options: [
      { id: "a", label: "Otherwise large-scale features dominate the components", isCorrect: true },
      { id: "b", label: "PCA is undefined for unstandardized data", isCorrect: false },
      { id: "c", label: "It guarantees orthogonal components", isCorrect: false },
      { id: "d", label: "It makes all eigenvalues equal", isCorrect: false },
    ],
  },
  {
    id: "pca-quiz-tsne",
    type: "multiple-choice",
    question: "What does t-SNE preserve that makes it good for visualization — and what does it sacrifice?",
    hint: "Trust the clusters; don't measure with a ruler between them.",
    explanation:
      "t-SNE preserves local neighborhoods — nearby points stay nearby — which makes cluster structure pop visually. But global geometry is sacrificed: distances between separated clusters and relative cluster sizes in the embedding are essentially meaningless.",
    options: [
      { id: "a", label: "Preserves local neighborhoods; distorts global distances", isCorrect: true },
      { id: "b", label: "Preserves all pairwise distances exactly", isCorrect: false },
      { id: "c", label: "Preserves global structure; distorts local structure", isCorrect: false },
      { id: "d", label: "Preserves feature interpretability", isCorrect: false },
    ],
  },

  // ── Probabilistic Models & EM course quiz ────────────────────────────
  {
    id: "probmodel-quiz-gmm",
    type: "multiple-choice",
    question: "How does a GMM's cluster assignment differ from K-Means?",
    hint: "A point near the boundary between two Gaussians belongs to… both?",
    explanation:
      "GMMs assign soft responsibilities — each point gets a probability of belonging to every component — while K-Means makes hard nearest-centroid assignments. GMMs also fit per-component covariances, so clusters can be elliptical and differently sized.",
    options: [
      { id: "a", label: "Soft probabilistic assignments instead of hard ones", isCorrect: true },
      { id: "b", label: "GMM assigns each point to exactly one cluster faster", isCorrect: false },
      { id: "c", label: "GMM requires no choice of component count", isCorrect: false },
      { id: "d", label: "GMM only works in one dimension", isCorrect: false },
    ],
  },
  {
    id: "probmodel-quiz-estep",
    type: "multiple-choice",
    question: "What does the E-step of EM compute for a GMM?",
    hint: "Given current parameters, how responsible is each Gaussian for each point?",
    explanation:
      "The E-step computes responsibilities: the posterior probability that each component generated each point, given current parameters (via Bayes' rule on the component densities and mixing weights). These soft assignments are what the M-step then uses as weights.",
    options: [
      { id: "a", label: "The posterior probability each component generated each point", isCorrect: true },
      { id: "b", label: "New means and covariances", isCorrect: false },
      { id: "c", label: "The gradient of the likelihood", isCorrect: false },
      { id: "d", label: "The optimal number of components", isCorrect: false },
    ],
  },
  {
    id: "probmodel-quiz-mstep",
    type: "multiple-choice",
    question: "And the M-step?",
    hint: "It's a weighted version of fitting each Gaussian to 'its' points.",
    explanation:
      "The M-step re-estimates each component's mean, covariance, and mixing weight as responsibility-weighted averages over all points — maximizing the expected complete-data log-likelihood given the E-step's soft assignments.",
    options: [
      { id: "a", label: "Updates parameters using responsibility-weighted averages", isCorrect: true },
      { id: "b", label: "Assigns points to their most likely component", isCorrect: false },
      { id: "c", label: "Adds or removes mixture components", isCorrect: false },
      { id: "d", label: "Randomly perturbs the parameters", isCorrect: false },
    ],
  },
  {
    id: "probmodel-quiz-em-guarantee",
    type: "multiple-choice",
    question: "What does EM guarantee about the data log-likelihood?",
    hint: "Guaranteed progress, not a guaranteed destination.",
    explanation:
      "Each EM iteration never decreases the log-likelihood, so it converges — but only to a local optimum (or saddle). Different initializations can give very different fits, which is why GMMs are typically run from multiple random starts (or K-Means initialization).",
    options: [
      { id: "a", label: "It never decreases, but may reach only a local optimum", isCorrect: true },
      { id: "b", label: "It converges to the global maximum", isCorrect: false },
      { id: "c", label: "It increases by a fixed amount per step", isCorrect: false },
      { id: "d", label: "Nothing — likelihood can oscillate", isCorrect: false },
    ],
  },
  {
    id: "probmodel-quiz-naivebayes",
    type: "multiple-choice",
    question: "What is the 'naive' assumption in Naive Bayes?",
    hint: "How does it factor P(x₁, x₂, …, xₙ | y)?",
    explanation:
      "Naive Bayes assumes features are conditionally independent given the class: P(x | y) = Π P(xᵢ | y). It's false in practice (words in an email correlate!) yet classification often survives because the argmax over classes is robust to the miscalibrated probabilities.",
    options: [
      { id: "a", label: "Features are conditionally independent given the class", isCorrect: true },
      { id: "b", label: "All classes are equally likely", isCorrect: false },
      { id: "c", label: "Features follow Gaussian distributions", isCorrect: false },
      { id: "d", label: "The training data is unbiased", isCorrect: false },
    ],
  },

  // ── RNNs course quiz ─────────────────────────────────────────────────
  {
    id: "rnn-quiz-sharing",
    type: "multiple-choice",
    question: "How are an RNN's weights used across time steps?",
    hint: "Unroll the network — how many distinct weight matrices do you see?",
    explanation:
      "The same weight matrices are reused at every time step. That's what lets one RNN handle sequences of any length and generalize patterns across positions — and it's also why gradients through time multiply the same matrix repeatedly, causing vanishing/exploding gradients.",
    options: [
      { id: "a", label: "The same weights are shared at every step", isCorrect: true },
      { id: "b", label: "Each time step has its own weights", isCorrect: false },
      { id: "c", label: "Weights alternate between two sets", isCorrect: false },
      { id: "d", label: "Weights grow with sequence length", isCorrect: false },
    ],
  },
  {
    id: "rnn-quiz-vanishing",
    type: "multiple-choice",
    question: "Why do gradients vanish in vanilla RNNs over long sequences?",
    hint: "What happens when you multiply 50 numbers that are each less than 1?",
    explanation:
      "Backprop through time multiplies the recurrent Jacobian at every step. If its spectral norm is below 1, the product shrinks exponentially with distance — gradients from step 50 barely reach step 1, so long-range dependencies can't be learned. Norms above 1 explode instead.",
    options: [
      { id: "a", label: "Repeated multiplication of small Jacobians shrinks gradients exponentially", isCorrect: true },
      { id: "b", label: "The loss saturates at zero", isCorrect: false },
      { id: "c", label: "Long sequences exceed floating-point range", isCorrect: false },
      { id: "d", label: "Weight sharing prevents gradient flow entirely", isCorrect: false },
    ],
  },
  {
    id: "rnn-quiz-cellstate",
    type: "multiple-choice",
    question: "How does the LSTM cell state combat vanishing gradients?",
    hint: "Compare 'multiply at every step' with 'add at every step'.",
    explanation:
      "The cell state is updated additively — gated contributions are added rather than the state being re-multiplied through a squashing non-linearity each step. With the forget gate near 1, gradients flow back through this 'highway' nearly unchanged across many steps.",
    options: [
      { id: "a", label: "Additive, gated updates create a path where gradients flow undiminished", isCorrect: true },
      { id: "b", label: "It uses a larger learning rate for distant steps", isCorrect: false },
      { id: "c", label: "It clips all gradients to a fixed norm", isCorrect: false },
      { id: "d", label: "It processes the sequence in both directions", isCorrect: false },
    ],
  },
  {
    id: "rnn-quiz-forget",
    type: "multiple-choice",
    question: "What does the LSTM forget gate control?",
    hint: "It outputs values in (0, 1) that multiply the previous cell state.",
    explanation:
      "The forget gate outputs a value in (0, 1) per cell dimension, multiplying the previous cell state: 1 = keep this memory entirely, 0 = erase it. Combined with the input gate (what new information to write), it gives the LSTM explicit, learnable memory management.",
    options: [
      { id: "a", label: "How much of the previous cell state to keep or erase", isCorrect: true },
      { id: "b", label: "Which inputs to ignore at the current step", isCorrect: false },
      { id: "c", label: "The size of the hidden layer", isCorrect: false },
      { id: "d", label: "When to stop processing the sequence", isCorrect: false },
    ],
  },
  {
    id: "rnn-quiz-bptt",
    type: "multiple-choice",
    question: "What is backpropagation through time (BPTT)?",
    hint: "First unroll, then apply something familiar.",
    explanation:
      "BPTT unrolls the RNN into a deep feed-forward graph — one copy per time step with shared weights — and runs ordinary backprop through it, summing each weight's gradient contributions across all steps. Truncated BPTT caps how many steps back gradients flow to bound cost.",
    options: [
      { id: "a", label: "Standard backprop applied to the network unrolled across time steps", isCorrect: true },
      { id: "b", label: "Training the RNN on time-reversed sequences", isCorrect: false },
      { id: "c", label: "A separate optimizer for recurrent weights", isCorrect: false },
      { id: "d", label: "Backprop run once per epoch instead of per batch", isCorrect: false },
    ],
  },

  // ── Graphical Models course quiz ─────────────────────────────────────
  {
    id: "graphical-quiz-bn",
    type: "multiple-choice",
    question: "What does a Bayesian network's DAG structure encode?",
    hint: "Missing edges are the informative part.",
    explanation:
      "The DAG encodes conditional independencies: each node is independent of its non-descendants given its parents. This factorizes the joint as Π P(xᵢ | parents(xᵢ)), collapsing an exponential joint table into small local conditionals.",
    options: [
      { id: "a", label: "Conditional independencies that factorize the joint distribution", isCorrect: true },
      { id: "b", label: "The causal strength of every relationship", isCorrect: false },
      { id: "c", label: "The time-order of observations", isCorrect: false },
      { id: "d", label: "Correlation coefficients between variables", isCorrect: false },
    ],
  },
  {
    id: "graphical-quiz-collider",
    type: "multiple-choice",
    question: "In the collider structure A → C ← B, when does information flow between A and B?",
    hint: "This is the 'explaining away' pattern — it's backwards from chains and forks.",
    explanation:
      "A collider blocks the path when C is unobserved (A and B are marginally independent) and opens it when C — or any descendant of C — is observed. That's explaining away: knowing the alarm rang and that there was an earthquake lowers the probability of a burglary.",
    options: [
      { id: "a", label: "Only when C (or a descendant) is observed", isCorrect: true },
      { id: "b", label: "Only when C is unobserved", isCorrect: false },
      { id: "c", label: "Always — colliders never block", isCorrect: false },
      { id: "d", label: "Never — colliders always block", isCorrect: false },
    ],
  },
  {
    id: "graphical-quiz-hmm",
    type: "multiple-choice",
    question: "What two assumptions define a hidden Markov model?",
    hint: "One about state transitions, one about emissions.",
    explanation:
      "(1) Hidden states form a Markov chain — the next state depends only on the current one. (2) Each observation depends only on the current hidden state. Together these factorize the joint over an arbitrarily long sequence into transition and emission tables.",
    options: [
      { id: "a", label: "Markov transitions between hidden states; observations depend only on current state", isCorrect: true },
      { id: "b", label: "Gaussian states and linear observations", isCorrect: false },
      { id: "c", label: "Independent states and independent observations", isCorrect: false },
      { id: "d", label: "Observable states with hidden transitions", isCorrect: false },
    ],
  },
  {
    id: "graphical-quiz-viterbi",
    type: "multiple-choice",
    question: "What does the Viterbi algorithm find?",
    hint: "Compare with the forward algorithm, which sums over paths.",
    explanation:
      "Viterbi finds the single most probable hidden-state sequence given the observations, using dynamic programming with a max instead of the forward algorithm's sum. Maxing path-by-path differs from picking each step's most likely state independently — the joint best path is what Viterbi guarantees.",
    options: [
      { id: "a", label: "The most likely complete sequence of hidden states", isCorrect: true },
      { id: "b", label: "The total probability of the observations", isCorrect: false },
      { id: "c", label: "The most likely state at each step, independently", isCorrect: false },
      { id: "d", label: "The optimal transition matrix", isCorrect: false },
    ],
  },
  {
    id: "graphical-quiz-forward",
    type: "multiple-choice",
    question: "And the forward algorithm computes…",
    hint: "It marginalizes over all possible hidden paths.",
    explanation:
      "The forward algorithm computes P(observations) by summing over all hidden-state paths with dynamic programming — O(TK²) instead of the naive O(Kᵀ). That likelihood is what you maximize when training an HMM (e.g., inside Baum–Welch / EM).",
    options: [
      { id: "a", label: "The likelihood of the observation sequence under the model", isCorrect: true },
      { id: "b", label: "The best single hidden path", isCorrect: false },
      { id: "c", label: "The stationary distribution of the chain", isCorrect: false },
      { id: "d", label: "The number of hidden states to use", isCorrect: false },
    ],
  },

  // ── Attention & Transformers course quiz ─────────────────────────────
  {
    id: "transformer-quiz-attention",
    type: "multiple-choice",
    question: "In self-attention, the output for each token is a…",
    hint: "softmax(QKᵀ/√d)V — read it right to left.",
    explanation:
      "Each token's output is a weighted sum of all tokens' value vectors, with weights from softmaxing its query against every key. Every token can directly gather information from every other token in one step — no recurrence needed.",
    options: [
      { id: "a", label: "Weighted sum of value vectors, weighted by query–key similarity", isCorrect: true },
      { id: "b", label: "Concatenation of all other tokens' embeddings", isCorrect: false },
      { id: "c", label: "The value vector of the single most similar token", isCorrect: false },
      { id: "d", label: "A recurrent update of the previous token's state", isCorrect: false },
    ],
  },
  {
    id: "transformer-quiz-scale",
    type: "multiple-choice",
    question: "Why divide QKᵀ by √d before the softmax?",
    hint: "What's the variance of a dot product of two random d-dimensional vectors?",
    explanation:
      "Dot products of d-dimensional vectors have variance growing with d. Large logits push softmax into its saturated regime where it's nearly one-hot and gradients vanish. Dividing by √d keeps logit variance near 1, so attention stays trainable.",
    options: [
      { id: "a", label: "To stop large dot products from saturating the softmax", isCorrect: true },
      { id: "b", label: "To normalize the values to unit length", isCorrect: false },
      { id: "c", label: "To reduce computation cost", isCorrect: false },
      { id: "d", label: "To make attention weights sum to 1", isCorrect: false },
    ],
  },
  {
    id: "transformer-quiz-multihead",
    type: "multiple-choice",
    question: "Why use multiple attention heads instead of one big one?",
    hint: "One softmax produces one weighting pattern per token.",
    explanation:
      "Each head learns its own Q/K/V projections and can attend to a different relationship — one tracks syntax, another coreference, another nearby positions. A single head gives each token one attention distribution; multiple heads let it gather several kinds of context at once.",
    options: [
      { id: "a", label: "Each head can attend to different relationships in parallel", isCorrect: true },
      { id: "b", label: "More heads always means lower overfitting", isCorrect: false },
      { id: "c", label: "It reduces the parameter count", isCorrect: false },
      { id: "d", label: "Softmax requires at least 8 heads", isCorrect: false },
    ],
  },
  {
    id: "transformer-quiz-posenc",
    type: "multiple-choice",
    question: "Why do transformers need positional encodings at all?",
    hint: "Shuffle the input tokens — what changes in the attention computation?",
    explanation:
      "Self-attention is permutation-equivariant: it treats input as an unordered set, so 'dog bites man' and 'man bites dog' would be identical without position information. Positional encodings (sinusoidal, learned, or rotary) inject token order into the representations.",
    options: [
      { id: "a", label: "Attention is order-blind — it sees a set, not a sequence", isCorrect: true },
      { id: "b", label: "They speed up training convergence", isCorrect: false },
      { id: "c", label: "They prevent attention weights from overflowing", isCorrect: false },
      { id: "d", label: "They are needed only for images, not text", isCorrect: false },
    ],
  },
  {
    id: "transformer-quiz-vs-rnn",
    type: "multiple-choice",
    question: "What is the transformer's key computational advantage over RNNs?",
    hint: "What did sequential hidden-state updates prevent?",
    explanation:
      "RNNs must process tokens one at a time — step t needs the state from t−1. Self-attention computes all positions simultaneously as matrix multiplications, fully exploiting parallel hardware. That's what made training on web-scale corpora practical (at O(n²) attention cost).",
    options: [
      { id: "a", label: "All sequence positions are processed in parallel during training", isCorrect: true },
      { id: "b", label: "It uses fewer parameters than an RNN", isCorrect: false },
      { id: "c", label: "It needs no training data labels", isCorrect: false },
      { id: "d", label: "Its memory usage is independent of sequence length", isCorrect: false },
    ],
  },

  {
    id: "transformer-cross-attention",
    type: "multiple-choice",
    question:
      "In encoder-decoder cross-attention (e.g., machine translation), where do the Queries, Keys, and Values come from?",
    hint: "The decoder wants to 'look up' information from the encoder's output.",
    explanation:
      "Queries come from the decoder (what the decoder currently wants to find), while Keys and Values come from the encoder's output (the encoded representation of the input sequence). This lets every decoder position attend to any encoder position, effectively reading the source sequence to guide generation.",
    options: [
      { id: "a", label: "Q from decoder, K and V from encoder", isCorrect: true },
      { id: "b", label: "Q, K, V all from decoder", isCorrect: false },
      { id: "c", label: "Q from encoder, K and V from decoder", isCorrect: false },
      { id: "d", label: "Q, K, V all from encoder", isCorrect: false },
    ],
  },
  {
    id: "transformer-gqa",
    type: "multiple-choice",
    question:
      "A model with 16 Q-heads uses Grouped-Query Attention (GQA) with 4 KV groups. Compared to Multi-Head Attention (MHA), how large is the KV cache?",
    hint: "KV cache scales with the number of K/V heads, not Q heads.",
    explanation:
      "In MHA, K and V have the same number of heads as Q (16). In GQA with 4 groups, there are only 4 K/V heads shared across the 16 Q-heads. The KV cache therefore shrinks to 4/16 = 1/4 of the MHA size. GQA achieves most of MQA's memory savings while retaining model quality closer to MHA.",
    options: [
      { id: "a", label: "The same as MHA (no change)", isCorrect: false },
      { id: "b", label: "1/4 of MHA", isCorrect: true },
      { id: "c", label: "1/16 of MHA (one K/V head)", isCorrect: false },
      { id: "d", label: "1/2 of MHA", isCorrect: false },
    ],
  },
  {
    id: "transformer-rope",
    type: "multiple-choice",
    question:
      "What is the key advantage of Rotary Positional Encoding (RoPE) over additive sinusoidal encodings?",
    hint: "Think about how RoPE encodes position and what property the dot product has.",
    explanation:
      "RoPE encodes position by rotating Q and K vectors, so the attention dot product Q_m·K_n depends only on the relative offset (m-n), not on absolute positions. This makes RoPE naturally suited to extrapolating to longer sequences than seen during training, and allows efficient KV-cache extensions like RoPE scaling.",
    options: [
      { id: "a", label: "Attention scores depend only on relative position, not absolute", isCorrect: true },
      { id: "b", label: "It uses fewer parameters than sinusoidal PE", isCorrect: false },
      { id: "c", label: "It prevents any positional information from being encoded", isCorrect: false },
      { id: "d", label: "It removes the need for positional encoding entirely", isCorrect: false },
    ],
  },

  // ── Generative Models course quiz ────────────────────────────────────
  {
    id: "genmodel-quiz-vaeloss",
    type: "multiple-choice",
    question: "A VAE's loss combines which two terms?",
    hint: "One term wants faithful outputs; the other disciplines the latent space.",
    explanation:
      "The ELBO has a reconstruction term (decode z back to something close to the input) and a KL divergence pulling the encoder's posterior q(z|x) toward the prior N(0, I). The KL term is what organizes the latent space so that sampling from the prior decodes to realistic data.",
    options: [
      { id: "a", label: "Reconstruction error + KL divergence to the prior", isCorrect: true },
      { id: "b", label: "Classification loss + adversarial loss", isCorrect: false },
      { id: "c", label: "Two reconstruction errors at different scales", isCorrect: false },
      { id: "d", label: "Pixel loss + perceptual loss", isCorrect: false },
    ],
  },
  {
    id: "genmodel-quiz-reparam",
    type: "multiple-choice",
    question: "What problem does the reparameterization trick solve?",
    hint: "Can you backprop through 'draw a random sample'?",
    explanation:
      "Sampling z ~ N(μ, σ²) is not differentiable w.r.t. μ and σ. Rewriting z = μ + σ·ε with ε ~ N(0,1) moves the randomness into an external input, leaving a deterministic, differentiable path from the encoder's outputs to the loss — so the encoder can train by backprop.",
    options: [
      { id: "a", label: "It makes sampling differentiable so gradients reach the encoder", isCorrect: true },
      { id: "b", label: "It prevents posterior collapse", isCorrect: false },
      { id: "c", label: "It reduces the latent dimensionality", isCorrect: false },
      { id: "d", label: "It removes the KL term from the loss", isCorrect: false },
    ],
  },
  {
    id: "genmodel-quiz-gan",
    type: "multiple-choice",
    question: "In a GAN, what objective does the generator pursue?",
    hint: "It never sees real data directly — only the discriminator's reaction.",
    explanation:
      "The generator maps noise to samples and is trained to make the discriminator classify them as real — its gradient signal comes entirely through the discriminator. The two play a minimax game whose equilibrium (in theory) is the generator matching the data distribution.",
    options: [
      { id: "a", label: "Produce samples the discriminator classifies as real", isCorrect: true },
      { id: "b", label: "Minimize pixel distance to training images", isCorrect: false },
      { id: "c", label: "Maximize the likelihood of the training data", isCorrect: false },
      { id: "d", label: "Classify real vs. fake samples", isCorrect: false },
    ],
  },
  {
    id: "genmodel-quiz-modecollapse",
    type: "multiple-choice",
    question: "What is mode collapse in GAN training?",
    hint: "The generator finds one thing that fools the discriminator and…",
    explanation:
      "Mode collapse is when the generator concentrates on a few outputs (or one) that currently fool the discriminator, abandoning the diversity of the data distribution — e.g., generating the same face over and over. Remedies include minibatch discrimination, unrolled discriminators, and Wasserstein losses.",
    options: [
      { id: "a", label: "The generator produces only a narrow subset of the data's variety", isCorrect: true },
      { id: "b", label: "The discriminator's accuracy collapses to 50%", isCorrect: false },
      { id: "c", label: "Gradients explode and weights diverge", isCorrect: false },
      { id: "d", label: "The latent space dimension shrinks during training", isCorrect: false },
    ],
  },
  {
    id: "genmodel-quiz-diffusion",
    type: "multiple-choice",
    question: "What does a diffusion model learn to do?",
    hint: "Training corrupts images with noise; generation runs that movie backwards.",
    explanation:
      "The forward process gradually adds Gaussian noise until the data is pure noise. The model learns the reverse: at each step it predicts (the noise component of) a less-noisy version. Generation starts from random noise and applies the learned denoiser step by step until an image emerges.",
    options: [
      { id: "a", label: "Reverse a gradual noising process, denoising step by step", isCorrect: true },
      { id: "b", label: "Compress images into a discrete codebook", isCorrect: false },
      { id: "c", label: "Distinguish real images from noisy ones", isCorrect: false },
      { id: "d", label: "Map noise directly to images in one step", isCorrect: false },
    ],
  },

  {
    id: "genai-vit-patches",
    type: "multiple-choice",
    question:
      "A Vision Transformer (ViT) processes a 224×224 image with patch size P=16. How many patches (tokens) does it create, and what is the dimension of each flattened patch?",
    hint: "Divide each spatial dimension by P to get patch grid size; flatten the patch to a vector.",
    explanation:
      "Number of patches: (224/16)² = 14² = 196. Each patch is 16×16×3 = 768 pixels, which is flattened to a 768-dimensional vector before a linear projection to d_model. So the transformer sees a sequence of 196 tokens (plus one [CLS] token = 197 total), each of 768 dimensions.",
    options: [
      { id: "a", label: "196 patches, each 768-dimensional", isCorrect: true },
      { id: "b", label: "49 patches, each 3072-dimensional", isCorrect: false },
      { id: "c", label: "784 patches, each 192-dimensional", isCorrect: false },
      { id: "d", label: "196 patches, each 3-dimensional (RGB only)", isCorrect: false },
    ],
  },
  {
    id: "genai-cfg",
    type: "multiple-choice",
    question:
      "Classifier-Free Guidance with scale w=7.5 combines conditioned and unconditioned predictions as: output = (1+w)·model(x,c) − w·model(x,∅). What happens as w increases?",
    hint: "Think about what happens to the unconditioned component as w grows.",
    explanation:
      "As w increases, the conditioned output is amplified and the unconditioned output is subtracted more strongly. The model steers more aggressively toward the text condition, producing outputs that are more faithful to the prompt but less diverse (higher fidelity, lower variety). At w=0 the output is fully unconditioned.",
    options: [
      { id: "a", label: "Outputs become more faithful to the prompt but less diverse", isCorrect: true },
      { id: "b", label: "Outputs become more random and diverse", isCorrect: false },
      { id: "c", label: "The conditioning is ignored completely", isCorrect: false },
      { id: "d", label: "Inference becomes faster", isCorrect: false },
    ],
  },
  {
    id: "genai-cycle-loss",
    type: "multiple-choice",
    question:
      "CycleGAN uses a cycle consistency loss. If G_AB translates domain A→B and G_BA translates B→A, what does the cycle consistency loss enforce?",
    hint: "What should happen if you translate an image there and back?",
    explanation:
      "The cycle consistency loss enforces G_BA(G_AB(x)) ≈ x: translating from domain A to B and then back to A should recover the original image. This constraint prevents the generators from collapsing to one output or ignoring input content, enabling unpaired image-to-image translation without paired training data.",
    options: [
      { id: "a", label: "G_BA(G_AB(x)) ≈ x — round-trip translation recovers the original", isCorrect: true },
      { id: "b", label: "G_AB(x) looks realistic in domain B", isCorrect: false },
      { id: "c", label: "G_AB and G_BA use the same weights", isCorrect: false },
      { id: "d", label: "The discriminator cannot tell real from fake", isCorrect: false },
    ],
  },

  // ── Reinforcement Learning course quiz ───────────────────────────────
  {
    id: "rl-quiz-markov",
    type: "multiple-choice",
    question: "The Markov property of an MDP states that…",
    hint: "How much history does the transition function get to see?",
    explanation:
      "The next state and reward depend only on the current state and action — not on how the agent got there: P(s'|s, a, history) = P(s'|s, a). This is what makes value functions over states well-defined and dynamic programming tractable.",
    options: [
      { id: "a", label: "The future depends only on the current state and action", isCorrect: true },
      { id: "b", label: "Rewards must be deterministic", isCorrect: false },
      { id: "c", label: "All states are equally likely", isCorrect: false },
      { id: "d", label: "The agent always knows the full environment model", isCorrect: false },
    ],
  },
  {
    id: "rl-quiz-offpolicy",
    type: "multiple-choice",
    question: "Why is Q-learning called an off-policy algorithm?",
    hint: "Compare the action it takes with the action in its update target.",
    explanation:
      "Q-learning explores with one policy (e.g., ε-greedy) but its update target uses max_a Q(s', a) — the value of the greedy policy. It learns about the optimal policy while behaving differently. SARSA, which plugs in the action it actually takes next, is the on-policy counterpart.",
    options: [
      { id: "a", label: "It learns the greedy policy's values while following an exploratory one", isCorrect: true },
      { id: "b", label: "It never uses a policy during training", isCorrect: false },
      { id: "c", label: "It updates Q-values only after episodes end", isCorrect: false },
      { id: "d", label: "It requires a model of the environment", isCorrect: false },
    ],
  },
  {
    id: "rl-quiz-bellman",
    type: "multiple-choice",
    question: "The Bellman optimality equation for Q* says Q*(s, a) equals…",
    hint: "Immediate reward plus the discounted value of acting optimally afterward.",
    explanation:
      "Q*(s, a) = E[r + γ max_{a'} Q*(s', a')]: the immediate reward plus the discounted value of the best action in the next state. Q-learning is a stochastic approximation that nudges Q toward this self-consistent fixed point from sampled transitions.",
    options: [
      { id: "a", label: "E[r + γ max over a' of Q*(s', a')]", isCorrect: true },
      { id: "b", label: "E[r + γ average of Q*(s', a') over all a']", isCorrect: false },
      { id: "c", label: "The sum of all future rewards, undiscounted", isCorrect: false },
      { id: "d", label: "The probability of reaching the goal from s", isCorrect: false },
    ],
  },
  {
    id: "rl-quiz-epsilon",
    type: "multiple-choice",
    question: "What does ε-greedy action selection accomplish?",
    hint: "What happens to an agent that always exploits from day one?",
    explanation:
      "With probability ε the agent picks a random action; otherwise it exploits the best-known one. Without exploration, the agent locks onto early lucky estimates and may never discover better strategies. ε is typically annealed: explore widely early, exploit increasingly later.",
    options: [
      { id: "a", label: "Balances exploring unknown actions against exploiting known good ones", isCorrect: true },
      { id: "b", label: "Guarantees convergence in fewer episodes", isCorrect: false },
      { id: "c", label: "Eliminates the need for a reward signal", isCorrect: false },
      { id: "d", label: "Makes the policy deterministic", isCorrect: false },
    ],
  },
  {
    id: "rl-quiz-policygrad",
    type: "multiple-choice",
    question: "How do policy-gradient methods differ from value-based ones like Q-learning?",
    hint: "What object does each method parameterize and optimize?",
    explanation:
      "Policy-gradient methods parameterize the policy π(a|s; θ) directly and ascend the gradient of expected return — no argmax over actions needed. That handles continuous action spaces and naturally stochastic policies, where value-based methods' max over actions becomes impractical.",
    options: [
      { id: "a", label: "They optimize a parameterized policy directly instead of a value function", isCorrect: true },
      { id: "b", label: "They require a perfect environment model", isCorrect: false },
      { id: "c", label: "They cannot use neural networks", isCorrect: false },
      { id: "d", label: "They only work in deterministic environments", isCorrect: false },
    ],
  },
  // ── Probability & Statistics: Thinking in Probabilities ──────────────
  {
    id: "prob-expectation-die",
    type: "multiple-choice",
    question:
      "A fair six-sided die has expectation E[X] = 3.5. What does that number mean?",
    hint: "Can a die ever show 3.5?",
    explanation:
      "Expectation is the probability-weighted average — the long-run mean over many rolls, the center of mass of the distribution. It is not a prediction of any single roll (3.5 is not even a possible outcome), and it is not the most likely value (all six faces are equally likely).",
    options: [
      { id: "a", label: "The average over many rolls converges to 3.5", isCorrect: true },
      { id: "b", label: "The next roll will most likely be 3 or 4", isCorrect: false },
      { id: "c", label: "3.5 is the most probable outcome", isCorrect: false },
      { id: "d", label: "Half of all rolls land above 3.5 only if the die is biased", isCorrect: false },
    ],
  },
  // ── Probability & Statistics: Entropy & KL Divergence ────────────────
  {
    id: "prob-kl-asymmetry",
    type: "multiple-choice",
    question:
      "Your model q assigns probability 0 to a word that actually occurs in the data distribution p. What happens to the forward KL divergence D(p‖q)?",
    hint: "Look at the term p(x) · log(p(x)/q(x)) when q(x) = 0 but p(x) > 0.",
    explanation:
      "The term p(x)·log(p(x)/0) is infinite: forward KL imposes an unbounded penalty for calling a possible event impossible. This is why MLE-trained models must spread probability over everything seen in training, and why smoothing (e.g. Laplace) exists. Reverse KL D(q‖p) would NOT blow up here — the asymmetry is real and consequential.",
    options: [
      { id: "a", label: "It becomes infinite — q called a possible event impossible", isCorrect: true },
      { id: "b", label: "It equals the entropy of p", isCorrect: false },
      { id: "c", label: "It is unaffected, since q(x)=0 contributes nothing", isCorrect: false },
      { id: "d", label: "It becomes negative", isCorrect: false },
    ],
  },
  // ── Linear Algebra: SVD & Low-Rank Approximation ─────────────────────
  {
    id: "linalg-svd-rank",
    type: "multiple-choice",
    question:
      "A 1000×800 matrix has singular values [95, 80, 60, 0.4, 0.3, 0.2, ...all below 0.4]. What's the best way to describe it?",
    hint: "Where does the spectrum drop off a cliff?",
    explanation:
      "Three singular values dominate; the rest form a tiny noise floor. By Eckart–Young, the rank-3 truncation reconstructs the matrix almost perfectly (error = the discarded tail, which is tiny). The matrix is effectively rank 3 — three underlying factors plus noise — and can be stored as 3(1000+800+1) numbers instead of 800,000.",
    options: [
      { id: "a", label: "Effectively rank 3 — a rank-3 truncation captures nearly everything", isCorrect: true },
      { id: "b", label: "Full rank, since all singular values are non-zero", isCorrect: false },
      { id: "c", label: "Rank 800, because that's min(1000, 800)", isCorrect: false },
      { id: "d", label: "Impossible to compress without losing important structure", isCorrect: false },
    ],
  },

  // ── Optimization for ML ─────────────────────────────────────────
  {
    id: "opt-sgd-noise",
    type: "multiple-choice",
    question:
      "Why does the gradient noise in mini-batch SGD often help generalization compared to full-batch gradient descent?",
    hint: "Think about the geometry of the loss landscape near flat vs. sharp minima.",
    explanation:
      "SGD noise acts as implicit regularization: it escapes sharp minima (narrow, high-curvature basins) that tend to generalize poorly, and settles into flat minima (wide basins) that generalize better. Full-batch GD converges more precisely to sharp local minima because the gradient is exact. Flat minima are preferred because a small perturbation of the weights causes less change in test loss.",
    options: [
      { id: "a", label: "Noise prevents overfitting by randomly zeroing weights each step", isCorrect: false },
      { id: "b", label: "Noise escapes sharp minima and settles into flat, better-generalizing minima", isCorrect: true },
      { id: "c", label: "Noise reduces the number of parameters the model must learn", isCorrect: false },
      { id: "d", label: "Noise reduces the effective learning rate, acting like L2 regularization", isCorrect: false },
    ],
  },
  {
    id: "opt-momentum-ema",
    type: "multiple-choice",
    question:
      "Momentum maintains velocity v_t = β·v_{t-1} + (1-β)·g_t. With β=0.9, how many recent gradient steps does this exponential moving average effectively average over?",
    hint: "The effective window of an EMA with factor β is approximately 1/(1-β).",
    explanation:
      "With β=0.9, the effective window is 1/(1-β) = 1/0.1 = 10 steps. Gradients from 10+ steps ago have weight (0.9)^10 ≈ 0.35, which is still significant, but the effective average is dominated by roughly the last 10 steps. This smooths out oscillations while still following the dominant gradient direction.",
    options: [
      { id: "a", label: "1 step (just the current gradient)", isCorrect: false },
      { id: "b", label: "About 10 steps", isCorrect: true },
      { id: "c", label: "About 90 steps", isCorrect: false },
      { id: "d", label: "All steps equally", isCorrect: false },
    ],
  },
  {
    id: "opt-adam-bias",
    type: "multiple-choice",
    question:
      "Adam initializes m_0 = v_0 = 0 and uses bias-corrected estimates m̂_t = m_t / (1-β₁^t). Why is this correction needed at early timesteps?",
    hint: "What does m_0 = 0 imply about m_1 if β₁ = 0.9 and the true gradient is g?",
    explanation:
      "At t=1: m_1 = β₁·0 + (1-β₁)·g = 0.1·g. Without correction, m_1 is 10× smaller than the true gradient — the estimate is biased toward zero. Dividing by (1-β₁^1) = 0.1 recovers g. The bias decays exponentially: by t=100, β₁^100 ≈ 0.00003, making the correction negligible.",
    options: [
      { id: "a", label: "Zero initialization biases early estimates toward zero; dividing by (1-β^t) corrects this", isCorrect: true },
      { id: "b", label: "To normalize the gradient scale across all parameters", isCorrect: false },
      { id: "c", label: "To ensure the learning rate is always positive", isCorrect: false },
      { id: "d", label: "To prevent gradient explosion during the first few steps", isCorrect: false },
    ],
  },
  {
    id: "opt-convex-definition",
    type: "multiple-choice",
    question:
      "Which of the following functions is convex?",
    hint: "A function is convex if the line segment between any two points on its graph lies above or on the graph.",
    explanation:
      "f(x) = x² is convex (bowl-shaped, second derivative ≥ 0 everywhere). f(x) = -x² is concave. f(x) = x³ is neither (second derivative changes sign). f(x) = sin(x) is neither over [0, 2π] (it curves up then down). Convexity requires f(λx + (1-λ)y) ≤ λf(x) + (1-λ)f(y) for all λ ∈ [0,1].",
    options: [
      { id: "a", label: "f(x) = −x²", isCorrect: false },
      { id: "b", label: "f(x) = x²", isCorrect: true },
      { id: "c", label: "f(x) = x³", isCorrect: false },
      { id: "d", label: "f(x) = sin(x) over [0, 2π]", isCorrect: false },
    ],
  },
  {
    id: "opt-global-min",
    type: "multiple-choice",
    question:
      "For a convex function, what does finding a point where the gradient equals zero guarantee?",
    hint: "Consider what it means for a convex function to have a local minimum.",
    explanation:
      "For a convex function, every local minimum is a global minimum. This is the key property that makes convex optimization tractable: once you find a stationary point (∇f = 0), you are guaranteed it is globally optimal. Non-convex functions may have many local minima, saddle points, and the gradient-zero condition doesn't imply global optimality.",
    options: [
      { id: "a", label: "It's a local minimum but may not be the global one", isCorrect: false },
      { id: "b", label: "It's a global minimum (for convex functions, local = global)", isCorrect: true },
      { id: "c", label: "It's a saddle point", isCorrect: false },
      { id: "d", label: "Nothing — gradient can be zero at inflection points", isCorrect: false },
    ],
  },
  {
    id: "opt-sgd-convex",
    type: "multiple-choice",
    question:
      "For a convex loss with Lipschitz gradient (L-smooth), what step size η = 1/L guarantees about gradient descent convergence?",
    hint: "Think about what the Lipschitz condition says about how fast the gradient can change.",
    explanation:
      "For L-smooth convex functions, gradient descent with η = 1/L converges at rate O(1/T) in the function value gap f(x_T) - f(x*). This is the Polyak-Łojasiewicz guarantee. The step size 1/L is optimal without additional curvature information (strong convexity) — using η > 2/L can cause divergence.",
    options: [
      { id: "a", label: "Convergence at rate O(1/T) in function value gap", isCorrect: true },
      { id: "b", label: "Convergence at rate O(1/T²) — subgradient method speed", isCorrect: false },
      { id: "c", label: "Linear (exponential) convergence rate", isCorrect: false },
      { id: "d", label: "No guarantee — must also be strongly convex", isCorrect: false },
    ],
  },
  {
    id: "opt-lagrange-multiplier",
    type: "multiple-choice",
    question:
      "At a constrained optimum, the Lagrange condition ∇f(x*) = λ∇g(x*) says what geometrically?",
    hint: "The gradient of a function at a point is perpendicular to its level curves.",
    explanation:
      "The gradient of f and the gradient of the constraint g are parallel (pointing in the same direction or opposite). This means the level curves of f and the constraint surface are tangent at x*. If they weren't tangent, you could move along the constraint and decrease f — contradicting optimality. The multiplier λ is the rate at which the optimal value changes per unit tightening of the constraint.",
    options: [
      { id: "a", label: "The objective gradient and constraint gradient are perpendicular at x*", isCorrect: false },
      { id: "b", label: "The objective gradient and constraint gradient are parallel at x*", isCorrect: true },
      { id: "c", label: "The objective value equals the constraint value at x*", isCorrect: false },
      { id: "d", label: "The step size is proportional to the constraint violation", isCorrect: false },
    ],
  },
  {
    id: "opt-kkt-slackness",
    type: "multiple-choice",
    question:
      "KKT complementary slackness: μᵢ·gᵢ(x*) = 0 for each inequality constraint gᵢ(x) ≤ 0. If μᵢ > 0 at the solution, what does this imply about the constraint?",
    hint: "If the product is zero and one factor is non-zero, what must the other be?",
    explanation:
      "If μᵢ > 0, then gᵢ(x*) = 0 — the constraint is active (tight, binding). An active constraint is one the optimal solution sits exactly on. If a constraint were inactive (gᵢ(x*) < 0), the optimal solution would be in the interior relative to that constraint and it wouldn't influence the optimum, so μᵢ = 0. This makes intuitive sense: only active constraints push back against the objective.",
    options: [
      { id: "a", label: "The constraint is inactive (gᵢ(x*) < 0)", isCorrect: false },
      { id: "b", label: "The constraint is active (gᵢ(x*) = 0)", isCorrect: true },
      { id: "c", label: "The constraint is violated (gᵢ(x*) > 0)", isCorrect: false },
      { id: "d", label: "Nothing — μᵢ and gᵢ are independent", isCorrect: false },
    ],
  },
  {
    id: "opt-svm-dual",
    type: "multiple-choice",
    question:
      "In the SVM dual, why do only support vectors (points on the margin boundary) have non-zero dual variables αᵢ?",
    hint: "Apply complementary slackness to the SVM margin constraints.",
    explanation:
      "The SVM dual has constraints αᵢ ≥ 0 and complementary slackness: αᵢ(yᵢ(w·xᵢ+b) - 1) = 0. For points strictly inside the margin (yᵢ(w·xᵢ+b) > 1), the bracket is non-zero so αᵢ = 0. Only for support vectors where yᵢ(w·xᵢ+b) = 1 (on the margin) can αᵢ > 0. The weight vector w = Σαᵢyᵢxᵢ is therefore determined entirely by support vectors — the sparse representation that makes SVMs efficient.",
    options: [
      { id: "a", label: "Support vectors have the largest gradients, so they get more weight", isCorrect: false },
      { id: "b", label: "Complementary slackness forces αᵢ=0 for non-margin points", isCorrect: true },
      { id: "c", label: "Points inside the margin violate the constraint and are excluded", isCorrect: false },
      { id: "d", label: "It's a design choice; any subset of points could be support vectors", isCorrect: false },
    ],
  },

  // ── Optimization for ML — Quiz ───────────────────────────────────
  {
    id: "opt-quiz-adam-update",
    type: "multiple-choice",
    question:
      "Adam uses β₁=0.9, β₂=0.999, ε=1e-8 by default. What is the role of ε in the update θ_t = θ_{t-1} − η·m̂_t/(√v̂_t + ε)?",
    hint: "What happens when v̂_t ≈ 0 (parameter never received a significant gradient)?",
    explanation:
      "ε prevents division by zero when the second moment estimate v̂_t is very small (e.g., for parameters that have rarely received gradients). Without ε, a near-zero v̂ would cause a huge, destabilizing update. The value 1e-8 is small enough not to interfere when v̂ is substantial but large enough to prevent numerical instability.",
    options: [
      { id: "a", label: "It sets the maximum allowed step size", isCorrect: false },
      { id: "b", label: "It prevents division by zero when the second moment is near zero", isCorrect: true },
      { id: "c", label: "It scales the learning rate by the gradient magnitude", isCorrect: false },
      { id: "d", label: "It controls the momentum decay rate", isCorrect: false },
    ],
  },
  {
    id: "opt-quiz-convex-ce",
    type: "multiple-choice",
    question:
      "Is the cross-entropy loss L(w) = -log σ(yᵀw) convex in the weight vector w (for binary logistic regression)?",
    hint: "Compute the Hessian of L with respect to w and check its sign.",
    explanation:
      "Yes, the binary cross-entropy loss for logistic regression is convex in w. The Hessian is H = σ(yᵀw)(1-σ(yᵀw))·yyᵀ, which is positive semi-definite (outer product scaled by a non-negative scalar). This convexity guarantees that gradient descent converges to the global optimum — there are no local minima to get trapped in for logistic regression.",
    options: [
      { id: "a", label: "No — sigmoid introduces non-convexity", isCorrect: false },
      { id: "b", label: "Yes — the Hessian is PSD, so the loss is convex in w", isCorrect: true },
      { id: "c", label: "Only when the data is linearly separable", isCorrect: false },
      { id: "d", label: "It depends on the learning rate used", isCorrect: false },
    ],
  },
  {
    id: "opt-quiz-kkt-conditions",
    type: "multiple-choice",
    question:
      "Which of the following is NOT one of the KKT necessary conditions for a constrained optimization problem?",
    hint: "The KKT conditions include stationarity, primal feasibility, dual feasibility, and complementary slackness.",
    explanation:
      "The four KKT conditions are: (1) Stationarity: ∇f + Σλᵢ∇hᵢ + Σμᵢ∇gᵢ = 0; (2) Primal feasibility: hᵢ(x*)=0, gᵢ(x*)≤0; (3) Dual feasibility: μᵢ≥0; (4) Complementary slackness: μᵢgᵢ(x*)=0. 'The Hessian must be positive definite at x*' is a second-order sufficiency condition for a local minimum, not a KKT condition.",
    options: [
      { id: "a", label: "Stationarity: ∇L = 0 at the optimal point", isCorrect: false },
      { id: "b", label: "Complementary slackness: μᵢ·gᵢ(x*) = 0", isCorrect: false },
      { id: "c", label: "Dual feasibility: μᵢ ≥ 0 for inequality constraints", isCorrect: false },
      { id: "d", label: "The Hessian must be positive definite at x*", isCorrect: true },
    ],
  },
  {
    id: "opt-quiz-lr-decay",
    type: "multiple-choice",
    question:
      "Cosine annealing decays the learning rate as η_t = η_min + ½(η_max - η_min)(1 + cos(πt/T)). What is the learning rate at t = T (the end of training)?",
    hint: "Compute cos(π·T/T) = cos(π).",
    explanation:
      "At t=T: η_T = η_min + ½(η_max - η_min)(1 + cos(π)) = η_min + ½(η_max - η_min)(1 + (-1)) = η_min + 0 = η_min. The schedule smoothly decays from η_max (at t=0, cos(0)=1) to η_min (at t=T). This warm restart variant cycles multiple times — each cycle resets t to 0 and optionally increases T to allow longer warm-up phases.",
    options: [
      { id: "a", label: "η_max (back to the initial learning rate)", isCorrect: false },
      { id: "b", label: "η_min (the minimum learning rate)", isCorrect: true },
      { id: "c", label: "(η_max + η_min) / 2", isCorrect: false },
      { id: "d", label: "0 (always decays to zero)", isCorrect: false },
    ],
  },
  {
    id: "opt-quiz-saddle-point",
    type: "multiple-choice",
    question:
      "At a saddle point of a loss function, what can you say about the eigenvalues of the Hessian?",
    hint: "A saddle point is neither a local min nor a local max — it goes down in some directions, up in others.",
    explanation:
      "At a saddle point, the Hessian has both positive and negative eigenvalues (it is indefinite). Positive eigenvalues correspond to directions of upward curvature (rising away from the saddle), negative eigenvalues to directions of downward curvature (descending). A local minimum has all positive eigenvalues (PD Hessian); a local maximum has all negative eigenvalues (ND Hessian). Saddle points are common in high-dimensional neural network loss surfaces.",
    options: [
      { id: "a", label: "All eigenvalues are positive (positive definite)", isCorrect: false },
      { id: "b", label: "All eigenvalues are negative (negative definite)", isCorrect: false },
      { id: "c", label: "Both positive and negative eigenvalues (indefinite Hessian)", isCorrect: true },
      { id: "d", label: "All eigenvalues are zero (flat region)", isCorrect: false },
    ],
  },
];

export const exercises: Record<string, Exercise> = Object.fromEntries(
  allExercises.map((exercise) => [exercise.id, exercise])
);

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}
