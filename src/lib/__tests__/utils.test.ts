import { describe, it, expect } from "vitest";
import {
  cn,
  slugify,
  formatMinutes,
  clamp,
  lerp,
  range,
  getNotebookUrl,
} from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips non-word characters", () => {
    expect(slugify("K-Means & DBSCAN!")).toBe("k-means--dbscan");
  });
});

describe("formatMinutes", () => {
  it("formats minutes under an hour", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  it("formats whole hours", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatMinutes(95)).toBe("1h 35m");
  });
});

describe("clamp", () => {
  it("clamps below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps above the maximum", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("passes through values in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("lerp", () => {
  it("returns endpoints at t=0 and t=1", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
  it("interpolates at the midpoint", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("range", () => {
  it("produces [0..n-1]", () => {
    expect(range(4)).toEqual([0, 1, 2, 3]);
  });
  it("returns an empty array for 0", () => {
    expect(range(0)).toEqual([]);
  });
});

describe("getNotebookUrl", () => {
  it("builds a Colab URL from the course/lesson convention", () => {
    expect(getNotebookUrl("neural-networks", "02-gradient-descent")).toBe(
      "https://colab.research.google.com/github/riteshdhemla/ml-viz/blob/main/notebooks/neural-networks/02-gradient-descent.ipynb"
    );
  });

  it("uses an explicit override when provided", () => {
    expect(
      getNotebookUrl("x", "y", "https://example.com/custom.ipynb")
    ).toBe("https://example.com/custom.ipynb");
  });
});
