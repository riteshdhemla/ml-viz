# Content Review Notes

Append-only findings from `prompts/content-review-plan.md`. **Format per item:**

```
## <queue item> — <date>
### <course/lesson-slug or wiki/slug> — grasp N/5
- P1|P2|P3: <finding> → <proposed improvement>
- no issues            (when clean — say so explicitly)
```

Severity: **P1** blocks understanding · **P2** real friction · **P3** polish.
Notes are proposals, not commitments — triage happens after the queue completes.

---

## Seed notes (spot review during Langfuse/OTel/sub-agent content addition) — 2026-07-02

Scope: only the four pieces read end-to-end while adding the new wiki pages.
The full course items in the queue remain unchecked — these are early samples,
not substitutes for the full pass.

### building-with-llms/09-llm-observability-and-prompt-management — grasp 4/5
- P2: The trace/span tree — the lesson's central mental model — is described in
  text only. A small static trace-waterfall figure (or a `viz-kit` component
  showing spans nesting under a request) would carry the concept in seconds.
  → candidate `TraceWaterfallViz`, reusable by agent-design-patterns/11.
- P2: Drift section names three drift types but shows no concrete "proxy
  catches it" example → add one 2-line example (e.g. format-validity rate
  dropping after a provider model update).
- P3: In the cost formula, $n$ and $p$ are only defined by subscript naming
  → add "where $n$ = tokens, $p$ = price per token" inline.
- P3: (addressed 2026-07-02) no pointer to concrete tooling/standards
  → `<WikiLink slug="langfuse-and-opentelemetry">` added.

### agent-design-patterns/07-multi-agent-cooperation-patterns — grasp 4/5
- P2: Condorcet's jury theorem is the lesson's one mathematical claim, given as
  a formula plus two spot values. A tiny plot of $P(\text{majority correct})$
  vs $N$ for a few $p$ curves would make "approaches 1" *visible* → candidate
  mini-viz or static figure; at minimum a 3-row table ($N$=1,5,11).
- P2: The debate synthesis equation uses $\text{score}(A_r)$ without ever
  defining the score function; as written the equation adds confusion, not
  rigor → either define it ("mediator's per-round rubric grade") or drop the
  equation and keep the 3-step protocol.
- P3: Borda count appears in the table without a worked one-liner; it's the
  only aggregation rule a newcomer likely hasn't met → 1-sentence example
  (3 options, 3 voters).
- P3: (addressed 2026-07-02) control-flow axis (sequential/parallel/loop) was
  absent → `<WikiLink slug="sub-agent-orchestration">` added.

### agent-design-patterns/11-deploying-agents — grasp 4/5
- P2: Six systems topics (topology, checkpointing, HITL, guardrails,
  observability, cost) in one 20-minute lesson is the densest pacing in the
  course; the checkpointing/state-graph section in particular compresses a big
  idea into four bullets → link the state-graph paragraph to `/wiki/langgraph`
  (page exists, currently only linked from building-with-llms/05).
- P3: "Thought / Action / Observation" loop vocabulary is used here but defined
  two courses away (building-with-llms/05) → add the back-link at first use.
- P3: (addressed 2026-07-02) observability bullet now links to
  `<WikiLink slug="agent-observability">`.

### wiki/agent-protocols-mcp-a2a — grasp 5/5
- P3: JSON-RPC 2.0 is assumed known; a half-sentence gloss ("a minimal
  request/response format over any transport — method, params, id") would cover
  the beginner reading this from the agents lesson.
- P3: The A2A task lifecycle states are listed inline; a tiny state diagram
  (`submitted → working → input-required → completed/failed`) as a code block
  would make mistake #4 ("ignoring task lifecycle") land harder.
- Otherwise a model example of the wiki format: concrete wire examples, a
  composition diagram, a comparison table, and security framing.

### Recurring themes to watch for in the full pass
1. **Applied-course lessons are viz-poor**: foundations/classical courses
   average ~1 viz per lesson; building-with-llms and agent-design-patterns
   lessons are mostly text + tables. Where a concept is a *tree, flow, or
   loop* (traces, orchestration topologies, agent loops), a small SVG viz is
   likely the single highest-impact improvement.
2. **Equations without defined symbols** show up even in otherwise strong
   lessons — rubric dimension 3 deserves explicit attention.
3. **Cross-course vocabulary** (ReAct loop, trace, span, HITL) is defined once
   and reused across courses without back-links; learners entering via search
   land mid-vocabulary. Consider a "first use in this lesson → link" rule.

---

## Fix queue (populate after review queue completes)

*(empty — triage P1s first, then high-frequency P2 themes)*
