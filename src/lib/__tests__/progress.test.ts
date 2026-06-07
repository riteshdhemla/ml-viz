// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useProgress } from "@/lib/progress";

function reset() {
  useProgress.setState({ courses: {}, lessons: {} });
}

describe("progress store", () => {
  beforeEach(reset);

  it("starts empty", () => {
    expect(useProgress.getState().lessons).toEqual({});
    expect(useProgress.getState().isLessonComplete("c", "l")).toBe(false);
  });

  it("marks a lesson complete", () => {
    useProgress.getState().markLessonComplete("clustering", "01-k-means");
    const s = useProgress.getState();
    expect(s.isLessonComplete("clustering", "01-k-means")).toBe(true);
    expect(s.lessons["clustering/01-k-means"].completedAt).toBeTruthy();
  });

  it("records an exercise result and preserves completion", () => {
    const s = () => useProgress.getState();
    s().markLessonComplete("svm", "01-maximum-margin");
    s().recordExerciseResult("svm", "01-maximum-margin", "margin-calc", "correct");

    const lesson = s().lessons["svm/01-maximum-margin"];
    expect(lesson.completed).toBe(true);
    expect(lesson.exerciseResults["margin-calc"]).toBe("correct");
  });

  it("records a result before completion without marking complete", () => {
    const s = () => useProgress.getState();
    s().recordExerciseResult("svm", "02-kernel-trick", "kernel-choice", "incorrect");
    const lesson = s().lessons["svm/02-kernel-trick"];
    expect(lesson.completed).toBe(false);
    expect(lesson.exerciseResults["kernel-choice"]).toBe("incorrect");
  });

  it("computes course progress as a percentage", () => {
    const s = () => useProgress.getState();
    expect(s().getCourseProgress("pca-dimensionality")).toBe(0);

    s().markLessonComplete("pca-dimensionality", "01-pca");
    s().recordExerciseResult("pca-dimensionality", "02-t-sne-and-umap", "x", "correct");

    // one of two tracked lessons is complete -> 50%
    expect(s().getCourseProgress("pca-dimensionality")).toBe(50);
  });

  it("isolates progress between courses", () => {
    const s = () => useProgress.getState();
    s().markLessonComplete("a", "l1");
    expect(s().getCourseProgress("a")).toBe(100);
    expect(s().getCourseProgress("b")).toBe(0);
  });
});
