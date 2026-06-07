import { describe, it, expect } from "vitest";
import { exercises, getExercise } from "@/lib/exercises";

const all = Object.values(exercises);

describe("exercise registry", () => {
  it("is non-empty", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it("has unique ids (the registry's core invariant)", () => {
    const ids = all.map((e) => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("keys every entry by its own id", () => {
    for (const [key, ex] of Object.entries(exercises)) {
      expect(ex.id).toBe(key);
    }
  });

  it("gives every exercise a non-empty question and explanation", () => {
    for (const ex of all) {
      expect(ex.question.trim().length, ex.id).toBeGreaterThan(0);
      expect(ex.explanation.trim().length, ex.id).toBeGreaterThan(0);
    }
  });
});

describe("getExercise", () => {
  it("resolves a known id", () => {
    const ex = getExercise(all[0].id);
    expect(ex).toBeDefined();
    expect(ex?.id).toBe(all[0].id);
  });

  it("returns undefined for an unknown id", () => {
    expect(getExercise("does-not-exist-xyz")).toBeUndefined();
  });
});

describe("multiple-choice exercises", () => {
  const mc = all.filter((e) => e.type === "multiple-choice");

  it("exist in the registry", () => {
    expect(mc.length).toBeGreaterThan(0);
  });

  it("each have at least two options", () => {
    for (const ex of mc) {
      if (ex.type !== "multiple-choice") continue;
      expect(ex.options.length, ex.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("each have exactly one correct option", () => {
    for (const ex of mc) {
      if (ex.type !== "multiple-choice") continue;
      const correct = ex.options.filter((o) => o.isCorrect);
      expect(correct.length, ex.id).toBe(1);
    }
  });

  it("each have unique option ids", () => {
    for (const ex of mc) {
      if (ex.type !== "multiple-choice") continue;
      const ids = ex.options.map((o) => o.id);
      expect(new Set(ids).size, ex.id).toBe(ids.length);
    }
  });
});

describe("slider exercises", () => {
  const sliders = all.filter((e) => e.type === "slider");

  it("have a valid range and a correct band inside it", () => {
    for (const ex of sliders) {
      if (ex.type !== "slider") continue;
      expect(ex.min, ex.id).toBeLessThan(ex.max);
      const [lo, hi] = ex.correctRange;
      expect(lo, ex.id).toBeLessThanOrEqual(hi);
      expect(lo, ex.id).toBeGreaterThanOrEqual(ex.min);
      expect(hi, ex.id).toBeLessThanOrEqual(ex.max);
      expect(ex.step, ex.id).toBeGreaterThan(0);
    }
  });
});
