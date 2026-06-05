import { describe, expect, test } from "bun:test";
import { hasExactDuplicate, hashContent, recentEntries } from "../src/storage/history.ts";
import type { HistoryEntry } from "../src/types/index.ts";

function entry(date: string, content: string): HistoryEntry {
  return {
    date,
    topic: "Test",
    contentHash: hashContent(content),
    content,
    provider: "openai",
    model: "test",
  };
}

describe("hashContent", () => {
  test("is stable for identical input", () => {
    expect(hashContent("hello world")).toBe(hashContent("hello world"));
  });

  test("ignores surrounding whitespace", () => {
    expect(hashContent("hello")).toBe(hashContent("  hello  "));
  });

  test("differs for different content", () => {
    expect(hashContent("a")).not.toBe(hashContent("b"));
  });
});

describe("recentEntries", () => {
  test("returns most recent first, limited", () => {
    const items = [
      entry("2025-01-01T00:00:00Z", "old"),
      entry("2025-06-01T00:00:00Z", "newer"),
      entry("2025-03-01T00:00:00Z", "middle"),
    ];
    const recent = recentEntries(items, 2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.content).toBe("newer");
    expect(recent[1]?.content).toBe("middle");
  });
});

describe("hasExactDuplicate", () => {
  test("detects exact duplicate via hash", () => {
    const history = [entry("2025-01-01T00:00:00Z", "the exact same content")];
    expect(hasExactDuplicate(history, "the exact same content")).toBe(true);
  });

  test("returns false for different content", () => {
    const history = [entry("2025-01-01T00:00:00Z", "one")];
    expect(hasExactDuplicate(history, "two")).toBe(false);
  });
});
