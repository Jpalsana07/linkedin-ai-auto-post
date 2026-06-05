import { describe, expect, test } from "bun:test";
import { validatePost } from "../src/validation/post.validator.ts";

const baseOpts = {
  minWords: 150,
  maxWords: 300,
  maxHookWords: 10,
  similarityThreshold: 0.6,
  history: [],
};

interface PostOptions {
  endsWith?: string;
  firstLine?: string;
  bodyExtras?: string;
}

function makePost(wordCount: number, opts: PostOptions = {}): string {
  const filler = Array.from({ length: wordCount - 4 }, (_, i) => `word${i}`).join(" ");
  const first = opts.firstLine ?? "I shipped Stripe in 47 minutes.";
  const last = opts.endsWith ?? "What would you have shipped instead?";
  const extras = opts.bodyExtras ?? "";
  return `${first}\n\n${filler} ${extras}\n\n${last}`;
}

describe("validatePost", () => {
  test("accepts a clean post with a specific anchor", () => {
    const post = makePost(200);
    const result = validatePost(post, baseOpts);
    if (!result.ok) console.log("unexpected rejection:", result.reasons);
    expect(result.ok).toBe(true);
  });

  test("rejects too short", () => {
    const post = makePost(100);
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("Too short");
  });

  test("rejects too long", () => {
    const post = makePost(400);
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("Too long");
  });

  test("rejects when missing closing question mark", () => {
    const post = makePost(200, { endsWith: "That is all." });
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("question");
  });

  test("rejects generic hooks", () => {
    const post = makePost(200, { firstLine: "In today's world Stripe shipped fast" });
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/generic/i);
  });

  test("rejects hooks over 10 words", () => {
    const post = makePost(200, {
      firstLine: "Last Tuesday at three in the afternoon I shipped my biggest feature ever for Stripe.",
    });
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("Hook is too long");
  });

  test("rejects lazy closing questions", () => {
    const post = makePost(200, { endsWith: "Thoughts?" });
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("lazy");
  });

  test("rejects banned phrases", () => {
    const post = makePost(200, { bodyExtras: "I love to leverage synergy daily." });
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("banned");
  });

  test("rejects markdown formatting", () => {
    const post = `# Big Header\n\n${makePost(200)}`;
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("markdown");
  });

  test("rejects posts without any specific number or named tool", () => {
    // Hook has no number, body is just generic words, no capitalized tool names.
    const filler = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
    const post = `i wrote some code yesterday\n\n${filler}\n\nWhat would you change about that?`;
    const result = validatePost(post, baseOpts);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("specific number or named tool");
  });
});
