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
      "Frame this as a postmortem of a specific failure. Open with what broke, then what you tried, then the actual root cause, then the lesson. Include at least one named tool or specific number (latency, cost, count, time).",
  },
  {
    name: "contrarian-take",
    instruction:
      "Take a contrarian position against the dominant narrative on this topic. Open with the hot take in one short line. Back it with one piece of concrete evidence or a real story. Acknowledge the strongest counterargument before closing.",
  },
  {
    name: "mistake-and-lesson",
    instruction:
      "Open with a concrete mistake you (or a team) made. Be specific — what was shipped, what broke, what it cost. Then the lesson, in one sentence. Avoid generic 'I learned to be humble' wrap-ups.",
  },
  {
    name: "tool-comparison",
    instruction:
      "Compare two specific tools, frameworks, or approaches that solve the same problem. Name them. Use real numbers (benchmarks, cost, dev time). Pick a winner and say why. Avoid 'it depends' wishy-washy endings.",
  },
  {
    name: "build-in-public",
    instruction:
      "Frame as a real shipping update: what you shipped this week, what metric moved, what's broken. Use specific numbers. No vague 'making progress' language — name the actual feature and the actual number.",
  },
  {
    name: "tradeoff-breakdown",
    instruction:
      "Pick one architectural or technical decision. Lay out the tradeoff in one short paragraph. Show which side you chose and the specific reason — usually a constraint most people miss. Close with where this tradeoff might not apply.",
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
