import { describe, expect, test } from "bun:test";
import { PILLARS, TOPICS, pickNextTopic, pillarForTopic } from "../src/config/topics.ts";
import type { HistoryEntry } from "../src/types/index.ts";

function entry(topic: string, daysAgo: number): HistoryEntry {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    date: d.toISOString(),
    topic,
    pillar: pillarForTopic(topic)?.name,
    contentHash: "x",
    content: "x",
    provider: "openai",
    model: "test",
  };
}

describe("PILLARS configuration", () => {
  test("weights sum to 100", () => {
    const total = PILLARS.reduce((sum, p) => sum + p.weight, 0);
    expect(total).toBe(100);
  });

  test("every topic belongs to exactly one pillar", () => {
    for (const topic of TOPICS) {
      const matches = PILLARS.filter((p) => p.topics.includes(topic));
      expect(matches).toHaveLength(1);
    }
  });
});

describe("pickNextTopic", () => {
  test("returns a topic from the list when history is empty", () => {
    const { topic, pillar } = pickNextTopic([], 7);
    expect(TOPICS).toContain(topic);
    expect(PILLARS).toContain(pillar);
  });

  test("avoids topics used within cooldown window", () => {
    const aiTopics = PILLARS.find((p) => p.name === "AI Engineering")!.topics;
    const used = aiTopics.slice(0, 3).map((t) => entry(t, 1));
    const { topic } = pickNextTopic(used, 7);
    expect(used.map((e) => e.topic)).not.toContain(topic);
  });

  test("biases toward under-represented pillar when history skews", () => {
    // Bias history heavily toward AI Engineering (over its 45% target).
    const aiTopics = PILLARS.find((p) => p.name === "AI Engineering")!.topics;
    const history: HistoryEntry[] = [];
    for (let i = 0; i < 20; i++) {
      const topic = aiTopics[i % aiTopics.length];
      if (topic) history.push(entry(topic, 30 + i));
    }
    const { pillar } = pickNextTopic(history, 7);
    expect(pillar.name).not.toBe("AI Engineering");
  });

  test("with empty history picks the highest-weight pillar first", () => {
    const { pillar } = pickNextTopic([], 7);
    expect(pillar.name).toBe("AI Engineering");
  });
});

describe("pillarForTopic", () => {
  test("returns the correct pillar for a known topic", () => {
    expect(pillarForTopic("AI Agents")?.name).toBe("AI Engineering");
    expect(pillarForTopic("PostgreSQL Lessons")?.name).toBe("Architecture and Stack");
    expect(pillarForTopic("Startup Lessons")?.name).toBe("Founder and Career");
  });

  test("returns undefined for an unknown topic", () => {
    expect(pillarForTopic("Underwater Basket Weaving")).toBeUndefined();
  });
});
