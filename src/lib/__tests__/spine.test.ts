import { describe, it, expect } from "vitest";
import {
  SPINES,
  SPINE_IDS,
  getSpine,
  getStage,
  isValidStage,
  resolveStages,
} from "@/lib/spine";

const spines = Object.values(SPINES);

describe("spine registry", () => {
  it("has exactly the two known spines", () => {
    expect(SPINE_IDS.sort()).toEqual(["agentic", "ml"]);
  });

  it("keys every spine by its own id", () => {
    for (const [key, spine] of Object.entries(SPINES)) {
      expect(spine.id).toBe(key);
    }
  });

  it("gives every spine exactly six ordered stages", () => {
    for (const spine of spines) {
      expect(spine.stages.length, spine.id).toBe(6);
    }
  });

  it("has unique stage ids within each spine", () => {
    for (const spine of spines) {
      const ids = spine.stages.map((s) => s.id);
      expect(new Set(ids).size, spine.id).toBe(ids.length);
    }
  });

  it("gives every stage a label, blurb, and colour", () => {
    for (const spine of spines) {
      for (const stage of spine.stages) {
        expect(stage.label.trim().length, `${spine.id}/${stage.id}`).toBeGreaterThan(0);
        expect(stage.blurb.trim().length, `${spine.id}/${stage.id}`).toBeGreaterThan(0);
        expect(stage.color, `${spine.id}/${stage.id}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("gives every spine a well-formed hub slug", () => {
    for (const spine of spines) {
      expect(spine.hubSlug, spine.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("spine helpers", () => {
  it("getSpine resolves known ids and rejects unknown/undefined", () => {
    expect(getSpine("ml")?.id).toBe("ml");
    expect(getSpine("agentic")?.id).toBe("agentic");
    expect(getSpine("nope")).toBeUndefined();
    expect(getSpine(undefined)).toBeUndefined();
  });

  it("getStage / isValidStage recognise real stages only", () => {
    expect(getStage("ml", "objective")?.label).toBe("Objective");
    expect(isValidStage("ml", "objective")).toBe(true);
    expect(isValidStage("ml", "orchestration")).toBe(false); // agentic-only
    expect(isValidStage("agentic", "context")).toBe(true);
    expect(isValidStage("agentic", "data")).toBe(false); // ml-only
    expect(isValidStage("nope", "data")).toBe(false);
  });

  it("resolveStages preserves order and drops invalid ids", () => {
    const resolved = resolveStages("ml", ["objective", "data", "bogus"]);
    expect(resolved.map((s) => s.id)).toEqual(["objective", "data"]);
    expect(resolveStages("ml", undefined)).toEqual([]);
    expect(resolveStages(undefined, ["data"])).toEqual([]);
  });
});
