import { describe, expect, test } from "bun:test";
import { maxSimilarity, similarity } from "../src/utils/similarity.ts";

describe("similarity", () => {
  test("identical strings score 1", () => {
    const text = "I shipped my first SaaS in 2019. It made twelve dollars.";
    expect(similarity(text, text)).toBeCloseTo(1, 2);
  });

  test("completely unrelated strings score low", () => {
    const a = "I shipped my first SaaS in 2019. It made twelve dollars.";
    const b = "The quantum entanglement experiment confirmed Bell's inequality violations.";
    expect(similarity(a, b)).toBeLessThan(0.1);
  });

  test("paraphrased versions of the same idea score above 0.3", () => {
    const a = "I shipped my first SaaS in 2019. It made twelve dollars in three months.";
    const b = "Launched my first SaaS back in 2019. Earned twelve dollars across three months.";
    expect(similarity(a, b)).toBeGreaterThan(0.3);
  });
});

describe("maxSimilarity", () => {
  test("returns 0 with empty candidates", () => {
    const result = maxSimilarity("hello world", []);
    expect(result.score).toBe(0);
    expect(result.against).toBeNull();
  });

  test("finds the most similar candidate", () => {
    const target = "TypeScript saved me hours of debugging last week";
    const result = maxSimilarity(target, [
      "Quantum computers are fascinating",
      "TypeScript saved me hours debugging last week",
      "I love long walks on the beach",
    ]);
    expect(result.against).toContain("TypeScript");
  });
});
