import type { HistoryEntry } from "../types/index.ts";

export interface Angle {
  readonly name: string;
  /** Inline instruction injected into the user prompt to shape the post's structure. */
  readonly instruction: string;
}

/**
 * Post angles. Each angle is a different *way* to deliver content on a topic.
 * Same topic × different angle = very different post. Research (June 2026) shows
 * these structures dominate LinkedIn dev/tech engagement.
 */
export const ANGLES: readonly Angle[] = [
  {
    name: "postmortem",
    instruction:
      "Frame this as a postmortem of a specific failure. In the first 3 lines, set the scene in plain English: what were you building, who was it for, and what went wrong. Only THEN go into what you tried, the actual root cause, and the lesson. Every technical term gets a 3–6 word inline gloss. A non-engineer should be able to summarize the post in one sentence.",
  },
  {
    name: "contrarian-take",
    instruction:
      "Take a contrarian position against the dominant narrative on this topic. State the hot take in one short line. Before getting technical, spend 1–2 lines explaining the dominant view in plain English (so the reader knows what you're pushing against). Back the take with one concrete story or number. Acknowledge the strongest counterargument before closing.",
  },
  {
    name: "mistake-and-lesson",
    instruction:
      "Open with a concrete mistake you (or a team) made. In the first 2–3 lines, make sure the reader knows what was at stake — what you were trying to do and why it mattered — before you describe what went wrong. Then the lesson, in one plain sentence. Avoid generic 'I learned to be humble' wrap-ups.",
  },
  {
    name: "tool-comparison",
    instruction:
      "Compare two specific tools, frameworks, or approaches that solve the same problem. Name them. In the first 2 lines, explain in plain English WHAT problem these tools solve, so the reader cares about the comparison. Use real numbers (benchmarks, cost, dev time). Pick a winner and say why. Avoid 'it depends' wishy-washy endings.",
  },
  {
    name: "build-in-public",
    instruction:
      "Frame as a real shipping update. In the first 2 lines, remind the reader what you're building and who it's for — many readers will be seeing this project for the first time. Then: what you shipped this week, what metric moved, what's broken. Use specific numbers. No vague 'making progress' language.",
  },
  {
    name: "tradeoff-breakdown",
    instruction:
      "Pick one architectural or technical decision. First, explain in plain English what the decision is about and why it matters (2–3 lines, no jargon). Then lay out the tradeoff in one short paragraph. Show which side you chose and the specific reason — usually a constraint most people miss. Close with where this tradeoff might not apply.",
  },
];

/**
 * Pick an angle that hasn't been used in the recent history window.
 * Cooldown is implicit: prefer angles that appear least in the last N entries.
 */
export function pickNextAngle(history: HistoryEntry[]): Angle {
  const recent = history.slice(-ANGLES.length * 2);
  const counts = new Map<string, number>();
  for (const angle of ANGLES) counts.set(angle.name, 0);
  for (const entry of recent) {
    if (entry.angle) counts.set(entry.angle, (counts.get(entry.angle) ?? 0) + 1);
  }

  let best: Angle | undefined;
  let bestCount = Number.POSITIVE_INFINITY;
  let bestLastIndex = Number.POSITIVE_INFINITY;
  for (const angle of ANGLES) {
    const count = counts.get(angle.name) ?? 0;
    const lastIndex = findLastIndex(recent, (e) => e.angle === angle.name);
    if (count < bestCount || (count === bestCount && lastIndex < bestLastIndex)) {
      best = angle;
      bestCount = count;
      bestLastIndex = lastIndex;
    }
  }

  if (!best) throw new Error("ANGLES list is empty");
  return best;
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    const item = arr[i];
    if (item !== undefined && pred(item)) return i;
  }
  return -1;
}
