import { describe, it, expect } from "vitest";
import { buildKnowledgeGraph, neighbors, getGraphNode } from "@/lib/knowledge-graph";

const graph = buildKnowledgeGraph();
const ids = new Set(graph.nodes.map((n) => n.id));

describe("knowledge graph", () => {
  it("has course, lesson, and wiki nodes", () => {
    const kinds = new Set(graph.nodes.map((n) => n.kind));
    expect(kinds.has("course")).toBe(true);
    expect(kinds.has("lesson")).toBe(true);
    expect(kinds.has("wiki")).toBe(true);
    expect(graph.nodes.length).toBeGreaterThan(100);
  });

  it("gives every node a unique id, title, and href", () => {
    expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(graph.nodes.length);
    for (const n of graph.nodes) {
      expect(n.title.trim().length, n.id).toBeGreaterThan(0);
      expect(n.href.startsWith("/"), n.id).toBe(true);
    }
  });

  it("resolves every edge endpoint to a real node", () => {
    const dangling = graph.edges.filter((e) => !ids.has(e.source) || !ids.has(e.target));
    expect(dangling).toEqual([]);
  });

  it("has no self-edges or duplicate edges", () => {
    expect(graph.edges.filter((e) => e.source === e.target)).toEqual([]);
    const keys = graph.edges.map((e) => `${e.source}|${e.target}|${e.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("produces a rich set of every edge kind", () => {
    const byKind = new Map<string, number>();
    for (const e of graph.edges) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
    for (const kind of ["contains", "prerequisite", "related", "deep-dive"]) {
      expect(byKind.get(kind) ?? 0, kind).toBeGreaterThan(0);
    }
  });

  it("carries spine metadata onto lesson nodes (the spine ↔ graph link)", () => {
    const lessons = graph.nodes.filter((n) => n.kind === "lesson");
    const tagged = lessons.filter((n) => n.spineStages && n.spineStages.length > 0);
    // Phase B tagged every non-quiz lesson, so the vast majority carry stages.
    expect(tagged.length).toBeGreaterThan(lessons.length * 0.8);
    expect(lessons.every((n) => n.spine === "ml" || n.spine === "agentic")).toBe(true);
  });

  it("connects the two spine hub wiki pages into the graph", () => {
    for (const slug of ["ml-project-loop", "agentic-project-loop", "inductive-bias"]) {
      const node = getGraphNode(`wiki:${slug}`);
      expect(node, slug).toBeDefined();
      expect(neighbors(`wiki:${slug}`).length, slug).toBeGreaterThan(0);
    }
  });

  it("neighbors() returns directed, node-resolved connections", () => {
    const anyLesson = graph.nodes.find((n) => n.kind === "lesson")!;
    for (const nb of neighbors(anyLesson.id)) {
      expect(ids.has(nb.node.id)).toBe(true);
      expect(["in", "out"]).toContain(nb.direction);
    }
  });
});
