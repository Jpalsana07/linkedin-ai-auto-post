import type { HistoryEntry, ValidationResult } from "../types/index.ts";
import { maxSimilarity } from "../utils/similarity.ts";

const BANNED_PHRASES = [
  "in the world of",
  "the rise of",
  "leveraging",
  "synergy",
  "unlock",
  "game-changer",
  "game changer",
  "revolutionize",
  "in today's fast-paced",
  "at the end of the day",
  "circle back",
  "deep dive",
  "dive into",
  "thought leader",
  "needle-moving",
  "needle moving",
  "harness the power",
  "elevate your",
  "take it to the next level",
];

const GENERIC_HOOKS = [
  /^in today'?s\b/i,
  /^have you ever\b/i,
  /^let me tell you\b/i,
  /^are you tired\b/i,
  /^did you know\b/i,
  /^imagine if\b/i,
];

const LAZY_CLOSING_QUESTIONS = [
  /^thoughts\??\s*$/i,
  /^agree\??\s*$/i,
  /^what do you think\??\s*$/i,
  /^am i wrong\??\s*$/i,
];

export interface ValidatorOptions {
  minWords: number;
  maxWords: number;
  maxHookWords: number;
  similarityThreshold: number;
  history: HistoryEntry[];
}

export function validatePost(content: string, opts: ValidatorOptions): ValidationResult {
  const reasons: string[] = [];
  const trimmed = content.trim();

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < opts.minWords) {
    reasons.push(`Too short: ${words.length} words, need at least ${opts.minWords}.`);
  }
  if (words.length > opts.maxWords) {
    reasons.push(`Too long: ${words.length} words, max is ${opts.maxWords}.`);
  }

  if (!trimmed.endsWith("?")) {
    reasons.push("Post must end with a question (the final character should be '?').");
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? "";
  const lastLine = lines[lines.length - 1] ?? "";

  if (GENERIC_HOOKS.some((rx) => rx.test(firstLine))) {
    reasons.push(`Hook is too generic: "${firstLine.slice(0, 80)}". Open with a concrete moment, number, or sharp opinion.`);
  }

  const hookWordCount = firstLine.split(/\s+/).filter(Boolean).length;
  if (hookWordCount > opts.maxHookWords) {
    reasons.push(`Hook is too long: ${hookWordCount} words. Must be under ${opts.maxHookWords + 1} words to win the first-impression test.`);
  }

  if (LAZY_CLOSING_QUESTIONS.some((rx) => rx.test(lastLine))) {
    reasons.push(`Closing question is lazy: "${lastLine}". Ask for an opinion specific to the post's lesson.`);
  }

  const lower = trimmed.toLowerCase();
  const hits = BANNED_PHRASES.filter((p) => lower.includes(p));
  if (hits.length > 0) {
    reasons.push(`Contains banned phrases: ${hits.join(", ")}.`);
  }

  const markdownTells = /^#+\s|^\*\s|^-\s|\*\*/m;
  if (markdownTells.test(content)) {
    reasons.push("Contains markdown formatting (headers/bullets/bold). LinkedIn renders plain text.");
  }

  const emojiCount = countEmojis(content);
  if (emojiCount > 1) {
    reasons.push(`Too many emojis (${emojiCount}). Max 1.`);
  }

  const hashtagCount = (content.match(/#\w+/g) ?? []).length;
  if (hashtagCount > 3) {
    reasons.push(`Too many hashtags (${hashtagCount}). Max 3.`);
  }

  if (!hasSpecificAnchor(trimmed)) {
    reasons.push("Post lacks a specific number or named tool. Add at least one concrete anchor (latency, cost, count, framework name, company, dollar amount).");
  }

  if (opts.history.length > 0) {
    const { score, against } = maxSimilarity(
      content,
      opts.history.map((h) => h.content),
    );
    if (score >= opts.similarityThreshold) {
      const preview = against ? against.split("\n")[0]?.slice(0, 80) ?? "" : "";
      reasons.push(
        `Too similar (${(score * 100).toFixed(0)}%) to a recent post. Overlap with: "${preview}".`,
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}

function countEmojis(s: string): number {
  const matches = s.match(/\p{Extended_Pictographic}/gu);
  return matches ? matches.length : 0;
}

/**
 * Returns true if the post contains at least one specific anchor —
 * a number (digits) or a capitalized multi-letter token that looks like a tool/framework/company name.
 *
 * We intentionally use a permissive heuristic. False positives are fine
 * (the prompt already pushes for specificity); we just want to catch the
 * worst case where the post is entirely generic prose.
 */
function hasSpecificAnchor(content: string): boolean {
  const hasNumber = /\b\d+(?:[.,]\d+)?(?:%|x|ms|s|m|h|k|M|B)?\b/.test(content);
  if (hasNumber) return true;

  // Look for capitalized identifiers after the first word of any sentence
  // (so we don't false-positive on "I" or sentence-initial capitals alone).
  const sentences = content.split(/[.!?\n]+/);
  for (const sentence of sentences) {
    const tokens = sentence.trim().split(/\s+/).slice(1);
    for (const tok of tokens) {
      const clean = tok.replace(/[^A-Za-z0-9.+-]/g, "");
      if (clean.length >= 2 && /^[A-Z]/.test(clean) && /[a-zA-Z]/.test(clean.slice(1))) {
        return true;
      }
    }
  }
  return false;
}
