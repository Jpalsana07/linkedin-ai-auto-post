import type { HistoryEntry } from "../types/index.ts";

export interface Pillar {
  readonly name: string;
  /** Target percentage of overall posting volume (0–100). Pillars should sum to 100. */
  readonly weight: number;
  readonly topics: readonly string[];
}

/**
 * Topic pillars, weighted by target share of overall posting volume.
 * Derived from June 2026 LinkedIn engagement research:
 *  - AI/agent/eval content is the highest-reach niche right now.
 *  - Architecture & stack-specific stories work when bundled into real shipping moments.
 *  - Career/founder lessons work only with specific numbers — keep them <20% of mix.
 *  - Productivity and Remote Work intentionally dropped (algorithmically suppressed).
 */
export const PILLARS: readonly Pillar[] = [
  {
    name: "AI Engineering",
    weight: 45,
    topics: [
      "AI Agents",
      "AI Evals",
      "MCP and Context Engineering",
      "Agent Reliability",
      "LLM in Production",
      "LLM Cost Optimization",
    ],
  },
  {
    name: "Architecture and Stack",
    weight: 35,
    topics: [
      "Software Architecture",
      "React Shipping Stories",
      "Next.js in Production",
      "TypeScript Pitfalls",
      "Node.js at Scale",
      "PostgreSQL Lessons",
    ],
  },
  {
    name: "Founder and Career",
    weight: 20,
    topics: [
      "Startup Lessons",
      "SaaS Build-in-Public Metrics",
      "Freelancing with Numbers",
      "Career Inflection Moments",
    ],
  },
] as const;

export const TOPICS: readonly string[] = PILLARS.flatMap((p) => p.topics);

export function pillarForTopic(topic: string): Pillar | undefined {
  return PILLARS.find((p) => p.topics.includes(topic));
}

export interface TopicSelection {
  pillar: Pillar;
  topic: string;
}

/**
 * Pick the next post's pillar+topic.
 *
 * Pillar selection: pick whichever pillar has the largest deficit between its
 * target share and its actual share in history. Converges to target weights
 * over time without needing randomness (tests stay deterministic).
 *
 * Topic selection within pillar: LRU, with an N-day cooldown to avoid repeats.
 */
export function pickNextTopic(
  history: HistoryEntry[],
  cooldownDays: number,
  now: Date = new Date(),
): TopicSelection {
  const pillar = pickPillarByDeficit(history);
  const topic = pickTopicWithinPillar(pillar, history, cooldownDays, now);
  return { pillar, topic };
}

function pickPillarByDeficit(history: HistoryEntry[]): Pillar {
  const totalPosts = history.length;
  const counts = new Map<string, number>();
  for (const pillar of PILLARS) counts.set(pillar.name, 0);
  for (const entry of history) {
    const pillar = pillarForTopic(entry.topic);
    if (pillar) counts.set(pillar.name, (counts.get(pillar.name) ?? 0) + 1);
  }

  let best: Pillar | undefined;
  let bestDeficit = Number.NEGATIVE_INFINITY;
  for (const pillar of PILLARS) {
    const actual = totalPosts === 0 ? 0 : (counts.get(pillar.name) ?? 0) / totalPosts;
    const target = pillar.weight / 100;
    const deficit = target - actual;
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = pillar;
    }
  }

  if (!best) throw new Error("PILLARS list is empty");
  return best;
}

function pickTopicWithinPillar(
  pillar: Pillar,
  history: HistoryEntry[],
  cooldownDays: number,
  now: Date,
): string {
  const lastUsedAt = new Map<string, number>();
  for (const entry of history) {
    const t = new Date(entry.date).getTime();
    const prev = lastUsedAt.get(entry.topic) ?? 0;
    if (t > prev) lastUsedAt.set(entry.topic, t);
  }

  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  const eligible = pillar.topics.filter((topic) => {
    const last = lastUsedAt.get(topic);
    return last === undefined || nowMs - last > cooldownMs;
  });

  const pool = eligible.length > 0 ? eligible : [...pillar.topics];
  pool.sort((a, b) => (lastUsedAt.get(a) ?? 0) - (lastUsedAt.get(b) ?? 0));

  const first = pool[0];
  if (!first) throw new Error(`Pillar "${pillar.name}" has no topics`);
  return first;
}
