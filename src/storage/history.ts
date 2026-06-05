import { createHash } from "node:crypto";
import type { HistoryEntry } from "../types/index.ts";

export function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex").slice(0, 16);
}

export function recentEntries(history: HistoryEntry[], limit: number): HistoryEntry[] {
  return [...history]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function hasExactDuplicate(history: HistoryEntry[], content: string): boolean {
  const target = hashContent(content);
  return history.some((entry) => entry.contentHash === target);
}
