import { describe, expect, test } from "bun:test";
import { ANGLES, pickNextAngle } from "../src/config/angles.ts";
import type { HistoryEntry } from "../src/types/index.ts";

function entry(angle: string): HistoryEntry {
  return {
    date: new Date().toISOString(),
    topic: "AI Agents",
    pillar: "AI Engineering",
    angle,
    contentHash: "x",
    content: "x",
    provider: "openai",
    model: "test",
  };
}

describe("pickNextAngle", () => {
  test("returns a known angle when history is empty", () => {
    const angle = pickNextAngle([]);
    expect(ANGLES.map((a) => a.name)).toContain(angle.name);
  });

  test("avoids the most-recently-used angle", () => {
    const history = [entry("postmortem")];
    const next = pickNextAngle(history);
    expect(next.name).not.toBe("postmortem");
  });

  test("prefers under-used angles over heavily-used ones", () => {
    // Use 'postmortem' 5 times, others 0 times.
    const history = Array.from({ length: 5 }, () => entry("postmortem"));
    const next = pickNextAngle(history);
    expect(next.name).not.toBe("postmortem");
  });
});
