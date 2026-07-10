# Projects Page — Design Proposal

> Status: **built**. The `/projects` surface and all six projects are implemented
> per this design. This doc remains the reference for the model and stage mapping.
>
> Shipped: `src/types/project.ts`, `src/lib/projects.ts` (registry),
> `src/app/projects/page.tsx` + `src/app/projects/[slug]/page.tsx`,
> `src/components/projects/{ProjectCard,ProjectSpine}.tsx`, nav + sitemap entries,
> and `src/lib/__tests__/projects-integrity.test.ts` (validates every lesson ref).

## The problem

The site has 31 excellent but **topic-siloed** courses. The existing learning
path (`/courses` → "Learning path" view, `LearningPath.tsx`) wires courses by
**prerequisite** ("learn X before Y"), grouped by cluster (Math Foundations →
Classical ML → Deep Learning …). That is a dependency graph, not a *build*.

Nothing threads concepts into "here is how you actually ship a support chatbot."
The flow is brittle: it hops concept-to-concept but never assembles them into
end-to-end thinking. **Projects** fixes that.

## The core idea: a "spine," not another list

Courses are **nodes**. A project is a **spine** that pulls specific lessons from
several courses into one buildable arc, with three parallel rails per stage:

| Rail | Answers | Source |
|------|---------|--------|
| 🧠 **Concept** | "Why does this work?" | Existing lessons + wiki (on-site) |
| 🎥 **Explainer** | "Show me it built from scratch" | Karpathy / canonical videos |
| 🔧 **Implementation** | "What do people actually ship?" | A pinned open-source repo |

A stage with only rail 1 is the brittle status quo. A stage with all three rails
is end-to-end thinking: **concept → from-scratch → production**. External links
(rails 2–3) open in a new tab and are marked "external"; the concept rail always
stays on-site, so the page *pulls* learners into the site's lessons.

**North-star reference:** Karpathy's `nanochat` (Oct 2025) is literally Project 1
as a single ~8k-line repo — tokenizer → pretrain → midtrain → SFT → GRPO RL →
eval → serve. That is the feel every project should have.

---

## The six projects (stage mapping)

Lesson refs are `courseSlug/lessonSlug` (the `NN-` prefix omitted here for
readability; the real data uses the full slug, e.g. `nlp/01-text-preprocessing`).

### 1 · LLM Playground — *"train a tiny ChatGPT"*
Pretraining, tokenization, architectures (GPT/DeepSeek/Qwen), SFT/RLHF, eval.

| Stage | 🧠 Concept lessons | 🎥 Explainer | 🔧 Repo |
|-------|-------------------|-------------|---------|
| Tokenization | `nlp/01-text-preprocessing` | Karpathy minBPE | `karpathy/minbpe` |
| Architecture | `transformers/01`→`02`→`03` | Karpathy build-nanoGPT | `karpathy/nanoGPT` |
| Scale & MoE | `transformers/05-foundation-models-and-scaling`, `transformers/06-mixture-of-experts` | — | `karpathy/nanochat` |
| Align (SFT/RL) | `fine-tuning-alignment/01`, `reinforcement-learning/06-from-policy-gradient-to-rlhf` | — | `karpathy/nanochat` |
| Evaluate | `building-with-llms/08-llm-evaluation` | — | `EleutherAI/lm-evaluation-harness` |

- Zero-to-Hero hub: https://karpathy.ai/zero-to-hero.html
- nanochat announce: https://x.com/karpathy/status/1977755427569111362

### 2 · Customer Support Chatbot — *"a bot that knows your docs"*
PEFT/LoRA, prompt engineering, RAG (retrieval, indexing, generation, RAFT, eval).

| Stage | 🧠 Concept lessons | 🔧 Repo |
|-------|-------------------|---------|
| Prompting | `building-with-llms/01-prompt-engineering` | — |
| Embeddings & retrieval | `building-with-llms/03-embeddings-and-semantic-search` | `run-llama/llama_index` |
| RAG pipeline | `building-with-llms/04-retrieval-augmented-generation` | `run-llama/llama_index` |
| PEFT/LoRA/QLoRA | `fine-tuning-alignment/02-peft-lora-qlora` | `huggingface/peft`, `unslothai/unsloth` |
| **RAFT (gap)** | closest: `04-rag` + `fine-tuning-alignment/02` | `ShishirPatil/gorilla` |
| Evaluate | `building-with-llms/08-llm-evaluation` | `explodinggradients/ragas` |

- ⚠️ **Content gap:** RAFT (retrieval-augmented *fine-tuning*) has no lesson.

### 3 · Ask-the-Web Agent (Perplexity-style) — *"an agent that searches & cites"*
Agent workflows, tool calling, MCP, ReAct, multi-agent / A2A.

| Stage | 🧠 Concept lessons | 🔧 Repo |
|-------|-------------------|---------|
| ReAct / planning | `agent-design-patterns/04-planning-patterns`, `05-model-querying-patterns` | `huggingface/smolagents` |
| Tool use & MCP | `agent-design-patterns/09-tool-use-and-mcp` | `modelcontextprotocol/servers` |
| Multi-agent / **A2A (thin)** | `agent-design-patterns/07-multi-agent-cooperation-patterns` | — |
| Full build | `building-with-llms/05-agents-and-tool-use` | `assafelovic/gpt-researcher`, `ItzCrazyKns/Perplexica` |
| Evaluate agents | `agent-design-patterns/10-evaluating-agents` | — |

- ⚠️ **Content gap:** A2A protocol is only mentioned in passing.

### 4 · Deep Research capability — *"reasoning + inference-time search"*
Reasoning models, inference-time scaling (CoT, ToT), RL training for reasoning.

| Stage | 🧠 Concept lessons | 🎥 Explainer | 🔧 Repo |
|-------|-------------------|-------------|---------|
| Chain-of-thought | `building-with-llms/02-chain-of-thought` | Karpathy "Deep Dive into LLMs" | — |
| Reasoning models | `building-with-llms/07-reasoning-models` (covers GRPO/RLVR) + wiki `grpo-objective` | — | `huggingface/open-r1` |
| RL for reasoning | `fine-tuning-alignment/04-rlhf-and-dpo`, `reinforcement-learning/06` | — | `Jiayi-Pan/TinyZero`, `huggingface/trl` |

- ✅ Well covered already — GRPO, RLVR, CoT, ToT all present on-site.

### 5 · Multi-modal Generation Agent — *"text → image → video"*
VAE/GANs/diffusion, text-to-image, text-to-video (DiT).

| Stage | 🧠 Concept lessons | 🔧 Repo |
|-------|-------------------|---------|
| Autoencoders → VAE | `generative-models/02-autoencoders`, `03-variational-autoencoders` | `huggingface/diffusers` |
| GAN & diffusion | `generative-models/04-generative-adversarial-networks`, `05-diffusion-models` | `huggingface/diffusers` |
| Text→image (CFG/latent) | `generative-models/06-vit-and-modern-genai`, `computer-vision/04-vision-language-models` | `facebookresearch/DiT` |
| **Text→video / DiT (gap)** | closest: `05-diffusion-models` | `hpcaitech/Open-Sora` |

- ⚠️ **Content gap:** text-to-video / DiT (Diffusion Transformers) only mentioned
  in passing in `05-diffusion-models`.

### 6 · Capstone — *self-directed*
Remixes stages from projects 1–5. No fixed spine; presents a checklist of
"pick a track" starting points that deep-link into the earlier project stages.

---

## Content-gap summary (the "what's missing" audit)

Against the pasted 6-week structure, the site already covered almost everything.
The three real gaps have now been **authored** (lesson MDX + companion notebook +
exercises + registry wiring):

1. ✅ **RAFT** (retrieval-augmented fine-tuning) — `building-with-llms/14-retrieval-augmented-fine-tuning`
2. ✅ **Text-to-video / DiT** (Diffusion Transformers, Sora-style) — `generative-models/08-diffusion-transformers-and-video`
3. ✅ **A2A** (agent-to-agent protocol) — `agent-design-patterns/13-agent-to-agent-protocols`

Everything else (GRPO/RLVR, CoT/ToT, MoE, scaling, CLIP, MCP, LoRA, RAG, eval)
already existed. The three project stages that were gap-flagged now link the new
lessons directly (the `gap` flags were removed), and course `estimatedHours`
were recomputed (building-with-llms 9.5→10.5, generative-models 5.5→6.5,
agent-design-patterns 9→10).

---

## How it's built (architecture)

Mirrors existing conventions (`exercises.ts` registry, `wiki-integrity.test.ts`,
server-resolves-then-client-renders).

1. **`src/lib/projects.ts`** — typed `Project[]` registry. Pure data (no JS in
   MDX, same discipline as `exercises.ts`). Shape:
   ```ts
   interface ProjectStage {
     title: string;
     blurb: string;
     lessons: { course: string; lesson: string }[]; // on-site concept rail
     explainer?: { label: string; url: string };     // video rail (optional)
     repo?: { name: string; url: string; blurb: string }; // impl rail (optional)
     gap?: string; // e.g. "RAFT lesson coming soon"
   }
   interface Project {
     slug: string; number: number; title: string; tagline: string;
     builds: string;            // "the thing you ship"
     difficulty: Difficulty; estimatedHours: number;
     prerequisites: string[];   // course slugs (reuse existing gating)
     skills: string[];          // "skills you'll have" chips
     stages: ProjectStage[];
   }
   ```
2. **`src/types/project.ts`** — the `Project` / `ProjectStage` interfaces.
3. **`src/app/projects/page.tsx`** (server) — resolves each `lessons` ref to a
   real title via `content.ts`, computes live progress, passes to…
4. **`ProjectsView` / `ProjectSpine`** (client) — Brilliant-style vertical
   roadmap: numbered stages, the 3 rails per stage, a live completion ring from
   the existing Zustand store (`src/lib/progress.ts`), prereq gating reused from
   `LearningPath`.
5. **Nav:** add `{ href: "/projects", label: "Projects" }` to `SiteHeader`;
   retire the dead `/path` redirect (or point it at `/projects`).
6. **`src/lib/__tests__/projects-integrity.test.ts`** — mirrors wiki-integrity:
   every `lessons` ref resolves to an existing `.mdx`; every `repo.url` /
   `explainer.url` is a well-formed absolute URL; slugs unique.
7. **Sitemap:** add `/projects` and `/projects/[slug]` to `src/app/sitemap.ts`.

External links open in a new tab (`rel="noopener"`) and carry an "external" glyph.

## Open decisions (for sign-off)

- **Rails:** all three (concept + explainer + repo) / concept + repo only /
  concept only. *(Recommendation: all three — the explainer rail is what makes
  it feel like nanochat.)*
- **First deliverable:** commit this doc / build a one-project vertical slice
  (Support Chatbot) / build all six in one pass. *(Recommendation: vertical
  slice, so the look/feel is reviewable before scaling to six.)*
- **Content gaps:** link-closest-lesson-for-now (fast) vs. author RAFT +
  text-to-video/DiT lessons now (larger). *(Recommendation: link now, author
  later as a separate change.)*

## Build walkthroughs (actionability layer)

The spine answers *what/where*; a **build walkthrough** answers *do this, then check
it*. Each project can carry `walkthroughNotebook` (a Colab notebook that builds the
system milestone-by-milestone), and each stage can carry `build` (the thing you make)
+ `checkpoint` (a runnable assert that proves it works). The spine renders these as
"**Build:** … / **Done when:** …" and shows a "Build it yourself" CTA.

**Pilot shipped: Support Chatbot** (`notebooks/projects/support-chatbot.ipynb`) — a
GPU-free, deterministic, top-to-bottom-runnable build:

- M0 walking skeleton → M1 retrieval → M2 grounded generation + citation →
  M3 eval harness (recall@k / faithfulness / correctness) → M4 RAFT robustness under
  retrieval miss → M5 integrate into `SupportBot`, + a "✏️ Your turn" reranker scaffold.
- Every milestone ends in an `assert` checkpoint that passes; §7 shows exactly where to
  swap the toy embedder/LLM/memory for real ones (sentence-transformers, an LLM, a RAFT
  LoRA fine-tune).

Format validated — the remaining five projects follow the same template (scaled-down
runnable build for the GPU-heavy ones, pointing at the full repo for real scale).

## References

- Karpathy, Neural Networks: Zero to Hero — https://karpathy.ai/zero-to-hero.html
- Karpathy, nanoGPT — https://github.com/karpathy/nanoGPT
- Karpathy, nanochat (announce) — https://x.com/karpathy/status/1977755427569111362
- Karpathy, minbpe — https://github.com/karpathy/minbpe
- HF PEFT — https://github.com/huggingface/peft · Unsloth — https://github.com/unslothai/unsloth
- LlamaIndex — https://github.com/run-llama/llama_index · RAGAS — https://github.com/explodinggradients/ragas
- RAFT (Berkeley Gorilla) — https://github.com/ShishirPatil/gorilla
- smolagents — https://github.com/huggingface/smolagents · gpt-researcher — https://github.com/assafelovic/gpt-researcher · Perplexica — https://github.com/ItzCrazyKns/Perplexica
- open-r1 — https://github.com/huggingface/open-r1 · TinyZero — https://github.com/Jiayi-Pan/TinyZero · TRL — https://github.com/huggingface/trl
- diffusers — https://github.com/huggingface/diffusers · DiT — https://github.com/facebookresearch/DiT · Open-Sora — https://github.com/hpcaitech/Open-Sora
