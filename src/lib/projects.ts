import type {
  Project,
  ResolvedProject,
  ResolvedStage,
  ResolvedLesson,
} from "@/types/project";
import { getLessonMeta } from "@/lib/content";

/**
 * Project registry — each project is an END-TO-END build that threads specific
 * lessons from several courses into one buildable arc. Where the site's courses
 * are prerequisite-ordered *nodes*, a project is a *spine*: concept → from-scratch
 * explainer → shippable open-source code, stage by stage.
 *
 * Referenced lessons are validated by `projects-integrity.test.ts`.
 */
const allProjects: Project[] = [
  {
    slug: "llm-playground",
    number: 1,
    title: "LLM Playground",
    tagline: "Train a tiny ChatGPT from scratch",
    builds: "A small language model you tokenized, pretrained, fine-tuned, and RL-aligned yourself.",
    difficulty: "advanced",
    estimatedHours: 12,
    prerequisites: ["transformers", "nlp"],
    skills: ["BPE tokenization", "Transformer internals", "Scaling laws", "SFT + RLHF", "LLM eval"],
    accent: "bg-gradient-to-r from-brand-500 to-accent-orange",
    stages: [
      {
        title: "Tokenization",
        blurb: "Turn raw text into tokens with byte-pair encoding — the first stage of every LLM.",
        lessons: [{ course: "nlp", lesson: "01-text-preprocessing" }],
        explainer: { name: "Karpathy — Let's build the GPT Tokenizer", url: "https://www.youtube.com/watch?v=zduSFxRajkE" },
        repo: { name: "karpathy/minbpe", url: "https://github.com/karpathy/minbpe", blurb: "Minimal, clean BPE — the tokenizer used across the GPT series, built from scratch." },
      },
      {
        title: "Architecture",
        blurb: "Self-attention, multi-head + positional encoding, and the full decoder block.",
        lessons: [
          { course: "transformers", lesson: "01-self-attention" },
          { course: "transformers", lesson: "02-multi-head-and-positional" },
          { course: "transformers", lesson: "03-transformer-architecture" },
        ],
        explainer: { name: "Karpathy — Let's build GPT from scratch", url: "https://www.youtube.com/watch?v=kCc8FmEb1nY" },
        repo: { name: "karpathy/nanoGPT", url: "https://github.com/karpathy/nanoGPT", blurb: "The smallest, fastest repo for training/finetuning medium-sized GPTs." },
      },
      {
        title: "Scale & mixture-of-experts",
        blurb: "How loss scales with params/data/compute, and how MoE buys capacity cheaply (DeepSeek, Qwen).",
        lessons: [
          { course: "transformers", lesson: "05-foundation-models-and-scaling" },
          { course: "transformers", lesson: "06-mixture-of-experts" },
        ],
        repo: { name: "karpathy/nanochat", url: "https://github.com/karpathy/nanochat", blurb: "Full-stack ChatGPT clone in ~8k lines — the north star for this whole project." },
      },
      {
        title: "Align — SFT + RL",
        blurb: "Instruction-tune the base model, then push it with GRPO-style RL on verifiable rewards.",
        lessons: [
          { course: "fine-tuning-alignment", lesson: "01-supervised-fine-tuning" },
          { course: "reinforcement-learning", lesson: "06-from-policy-gradient-to-rlhf" },
        ],
        explainer: { name: "Karpathy — Deep Dive into LLMs like ChatGPT", url: "https://www.youtube.com/watch?v=7xTGNNLPyMI" },
        repo: { name: "karpathy/nanochat", url: "https://github.com/karpathy/nanochat", blurb: "Its speedrun runs midtrain → SFT → GRPO RL on GSM8K end to end." },
      },
      {
        title: "Evaluate",
        blurb: "Measure the model you built with standard harnesses instead of vibes.",
        lessons: [{ course: "building-with-llms", lesson: "08-llm-evaluation" }],
        repo: { name: "EleutherAI/lm-evaluation-harness", url: "https://github.com/EleutherAI/lm-evaluation-harness", blurb: "The de-facto standard for few-shot LM benchmarking." },
      },
    ],
  },
  {
    slug: "support-chatbot",
    number: 2,
    title: "Customer Support Chatbot",
    tagline: "A bot that actually knows your docs",
    builds: "A grounded assistant that retrieves from your knowledge base and is LoRA-tuned on your domain.",
    difficulty: "advanced",
    estimatedHours: 9,
    prerequisites: ["building-with-llms"],
    skills: ["Prompt engineering", "Semantic search", "RAG", "LoRA / QLoRA", "RAFT", "RAG eval"],
    accent: "bg-gradient-to-r from-brand-500 to-accent-teal",
    stages: [
      {
        title: "Prompting",
        blurb: "Get a strong baseline from prompting alone before you add any machinery.",
        lessons: [{ course: "building-with-llms", lesson: "01-prompt-engineering" }],
      },
      {
        title: "Embeddings & retrieval",
        blurb: "Embed your docs and pull back the passages that matter for a query.",
        lessons: [{ course: "building-with-llms", lesson: "03-embeddings-and-semantic-search" }],
        repo: { name: "run-llama/llama_index", url: "https://github.com/run-llama/llama_index", blurb: "Data framework for indexing + retrieval over your own documents." },
      },
      {
        title: "RAG pipeline",
        blurb: "Wire retrieval into generation so answers are grounded and citable.",
        lessons: [{ course: "building-with-llms", lesson: "04-retrieval-augmented-generation" }],
        repo: { name: "run-llama/llama_index", url: "https://github.com/run-llama/llama_index", blurb: "Retriever → prompt → response query engines out of the box." },
      },
      {
        title: "Adapt with PEFT",
        blurb: "Cheaply specialize the model to your domain with LoRA / QLoRA adapters.",
        lessons: [{ course: "fine-tuning-alignment", lesson: "02-peft-lora-qlora" }],
        repo: { name: "unslothai/unsloth", url: "https://github.com/unslothai/unsloth", blurb: "2x faster QLoRA finetuning; HF PEFT is the reference implementation." },
      },
      {
        title: "RAFT — retrieval-augmented fine-tuning",
        blurb: "Train the model to ignore distractor passages and cite the right one — RAG's weak spot.",
        lessons: [
          { course: "building-with-llms", lesson: "14-retrieval-augmented-fine-tuning" },
          { course: "fine-tuning-alignment", lesson: "02-peft-lora-qlora" },
        ],
        repo: { name: "ShishirPatil/gorilla (RAFT)", url: "https://github.com/ShishirPatil/gorilla/tree/main/raft", blurb: "The Berkeley RAFT recipe: fine-tune for domain-specific RAG robustness." },
      },
      {
        title: "Evaluate",
        blurb: "Score faithfulness and answer relevance instead of eyeballing responses.",
        lessons: [{ course: "building-with-llms", lesson: "08-llm-evaluation" }],
        repo: { name: "explodinggradients/ragas", url: "https://github.com/explodinggradients/ragas", blurb: "Reference-free metrics purpose-built for RAG pipelines." },
      },
    ],
  },
  {
    slug: "ask-the-web-agent",
    number: 3,
    title: "Ask-the-Web Agent",
    tagline: "A Perplexity-style agent that searches and cites",
    builds: "An agent that plans, calls a search tool, reads results, and answers with citations.",
    difficulty: "advanced",
    estimatedHours: 8,
    prerequisites: ["agent-design-patterns"],
    skills: ["ReAct", "Tool calling", "MCP", "Multi-agent", "Agent evaluation"],
    accent: "bg-gradient-to-r from-accent-teal to-brand-500",
    stages: [
      {
        title: "Plan with ReAct",
        blurb: "Interleave reasoning and actions so the agent decides what to look up next.",
        lessons: [
          { course: "agent-design-patterns", lesson: "04-planning-patterns" },
          { course: "agent-design-patterns", lesson: "05-model-querying-patterns" },
        ],
        repo: { name: "huggingface/smolagents", url: "https://github.com/huggingface/smolagents", blurb: "Barebones ReAct/CodeAct agents that think in code." },
      },
      {
        title: "Tool use & MCP",
        blurb: "Give the agent a search tool via the Model Context Protocol.",
        lessons: [{ course: "agent-design-patterns", lesson: "09-tool-use-and-mcp" }],
        repo: { name: "modelcontextprotocol/servers", url: "https://github.com/modelcontextprotocol/servers", blurb: "Reference MCP servers (incl. web/search) you can plug straight in." },
      },
      {
        title: "Multi-agent & A2A",
        blurb: "Split work across cooperating agents, and let independent agents delegate over A2A.",
        lessons: [
          { course: "agent-design-patterns", lesson: "07-multi-agent-cooperation-patterns" },
          { course: "agent-design-patterns", lesson: "13-agent-to-agent-protocols" },
        ],
      },
      {
        title: "Assemble the search agent",
        blurb: "Put planning + tools + synthesis together into a working web researcher.",
        lessons: [{ course: "building-with-llms", lesson: "05-agents-and-tool-use" }],
        repo: { name: "ItzCrazyKns/Perplexica", url: "https://github.com/ItzCrazyKns/Perplexica", blurb: "An open-source Perplexity clone — study the real thing you're rebuilding." },
      },
      {
        title: "Evaluate the agent",
        blurb: "Score trajectories and outcomes, not just the final string.",
        lessons: [{ course: "agent-design-patterns", lesson: "10-evaluating-agents" }],
        repo: { name: "assafelovic/gpt-researcher", url: "https://github.com/assafelovic/gpt-researcher", blurb: "Autonomous research agent — a fuller reference architecture." },
      },
    ],
  },
  {
    slug: "deep-research",
    number: 4,
    title: "Deep Research Capability",
    tagline: "Reasoning models + inference-time search",
    builds: "A reasoning system that thinks step-by-step and is RL-trained on verifiable rewards.",
    difficulty: "advanced",
    estimatedHours: 8,
    prerequisites: ["building-with-llms", "reinforcement-learning"],
    skills: ["Chain-of-thought", "Tree-of-thought", "Test-time compute", "GRPO / RLVR"],
    accent: "bg-gradient-to-r from-accent-orange to-accent-rose",
    stages: [
      {
        title: "Chain-of-thought",
        blurb: "Elicit intermediate reasoning and scale it with self-consistency / best-of-N.",
        lessons: [{ course: "building-with-llms", lesson: "02-chain-of-thought" }],
        explainer: { name: "Karpathy — Deep Dive into LLMs (reasoning)", url: "https://www.youtube.com/watch?v=7xTGNNLPyMI" },
      },
      {
        title: "Reasoning models",
        blurb: "How o1/R1-style models trade test-time compute for accuracy.",
        lessons: [{ course: "building-with-llms", lesson: "07-reasoning-models" }],
        repo: { name: "huggingface/open-r1", url: "https://github.com/huggingface/open-r1", blurb: "Open reproduction of the DeepSeek-R1 training pipeline." },
      },
      {
        title: "RL for reasoning",
        blurb: "Train the reasoning with GRPO on rewards you can verify (math, code).",
        lessons: [
          { course: "fine-tuning-alignment", lesson: "04-rlhf-and-dpo" },
          { course: "reinforcement-learning", lesson: "06-from-policy-gradient-to-rlhf" },
        ],
        repo: { name: "Jiayi-Pan/TinyZero", url: "https://github.com/Jiayi-Pan/TinyZero", blurb: "Reproduce the R1-zero 'aha moment' for under $30; TRL implements GRPO." },
      },
    ],
  },
  {
    slug: "multimodal-generation",
    number: 5,
    title: "Multi-modal Generation Agent",
    tagline: "Text → image → video",
    builds: "A generation stack from autoencoders up to a diffusion-transformer text-to-video model.",
    difficulty: "advanced",
    estimatedHours: 10,
    prerequisites: ["generative-models"],
    skills: ["VAE", "GAN", "Diffusion", "Latent diffusion + CFG", "CLIP", "DiT / text-to-video"],
    accent: "bg-gradient-to-r from-accent-rose to-brand-500",
    stages: [
      {
        title: "Autoencoders → VAE",
        blurb: "Compress to a latent space and learn to sample from it.",
        lessons: [
          { course: "generative-models", lesson: "02-autoencoders" },
          { course: "generative-models", lesson: "03-variational-autoencoders" },
        ],
        repo: { name: "huggingface/diffusers", url: "https://github.com/huggingface/diffusers", blurb: "State-of-the-art diffusion models for images, audio, and video." },
      },
      {
        title: "GAN & diffusion",
        blurb: "Adversarial vs. denoising generation — and why diffusion won.",
        lessons: [
          { course: "generative-models", lesson: "04-generative-adversarial-networks" },
          { course: "generative-models", lesson: "05-diffusion-models" },
        ],
        repo: { name: "huggingface/diffusers", url: "https://github.com/huggingface/diffusers", blurb: "Composable schedulers + pipelines for the diffusion stages." },
      },
      {
        title: "Text → image",
        blurb: "Condition generation on text with CLIP + classifier-free guidance in latent space.",
        lessons: [
          { course: "generative-models", lesson: "06-vit-and-modern-genai" },
          { course: "computer-vision", lesson: "04-vision-language-models" },
        ],
        repo: { name: "facebookresearch/DiT", url: "https://github.com/facebookresearch/DiT", blurb: "Diffusion Transformers — replacing the U-Net with a transformer backbone." },
      },
      {
        title: "Text → video (DiT)",
        blurb: "Extend diffusion transformers across time for Sora-style video generation.",
        lessons: [{ course: "generative-models", lesson: "08-diffusion-transformers-and-video" }],
        repo: { name: "hpcaitech/Open-Sora", url: "https://github.com/hpcaitech/Open-Sora", blurb: "Open Sora-like video model with a spatial-temporal DiT (STDiT)." },
      },
    ],
  },
  {
    slug: "capstone",
    number: 6,
    title: "Capstone",
    tagline: "Your own end-to-end build",
    builds: "A self-directed project that remixes stages from the five tracks above.",
    difficulty: "advanced",
    estimatedHours: 12,
    prerequisites: [],
    skills: ["Systems thinking", "Project scoping", "End-to-end delivery"],
    accent: "bg-gradient-to-r from-brand-400 to-brand-600",
    stages: [
      {
        title: "Pick a foundation",
        blurb: "Start from the model you trained in the LLM Playground.",
        lessons: [],
        projectLink: "llm-playground",
      },
      {
        title: "Add grounding or adaptation",
        blurb: "Layer in RAG + PEFT from the Support Chatbot track.",
        lessons: [],
        projectLink: "support-chatbot",
      },
      {
        title: "Give it agency",
        blurb: "Wrap it in tools and planning from the Ask-the-Web Agent track.",
        lessons: [],
        projectLink: "ask-the-web-agent",
      },
      {
        title: "Make it reason or generate",
        blurb: "Bring in reasoning (Deep Research) or generation (Multi-modal) as your differentiator.",
        lessons: [],
        projectLink: "deep-research",
      },
    ],
  },
];

export function getAllProjects(): Project[] {
  return [...allProjects].sort((a, b) => a.number - b.number);
}

export function getProject(slug: string): Project | null {
  return allProjects.find((p) => p.slug === slug) ?? null;
}

function resolveStage(stage: Project["stages"][number]): ResolvedStage {
  const lessons: ResolvedLesson[] = stage.lessons.map(({ course, lesson }) => {
    const meta = getLessonMeta(course, lesson);
    return {
      course,
      lesson,
      href: `/courses/${course}/${lesson}`,
      title: meta?.title ?? lesson,
      missing: !meta,
    };
  });
  return { ...stage, lessons };
}

export function resolveProject(project: Project): ResolvedProject {
  const stages = project.stages.map(resolveStage);
  const lessonKeys = [
    ...new Set(
      stages.flatMap((s) => s.lessons.map((l) => `${l.course}/${l.lesson}`))
    ),
  ];
  return { ...project, stages, lessonKeys, stageCount: stages.length };
}

export function getResolvedProjects(): ResolvedProject[] {
  return getAllProjects().map(resolveProject);
}
