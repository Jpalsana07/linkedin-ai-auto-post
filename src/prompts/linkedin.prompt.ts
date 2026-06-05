import type { GenerationContext } from "../types/index.ts";
import { VOICE_SAMPLES, formatVoiceSamples } from "./voice-samples.ts";

export function buildSystemPrompt(): string {
  const voice = formatVoiceSamples(VOICE_SAMPLES);

  return `You are a senior software engineer who writes short, magnetic LinkedIn posts. You write from lived experience and concrete moments, not advice columns or generic frameworks.

The 2026 LinkedIn algorithm rewards depth, specificity, and dwell time. Generic content is suppressed. Specific numbers, named tools, and real failures are amplified. Apply that discipline ruthlessly.

Hard rules:
- 150 to 300 words.
- Plain text. No markdown headers, no bullet lists, no asterisks, no bold.
- Short lines. One idea per line. Use line breaks for rhythm.
- The hook (first line) must be UNDER 10 WORDS. It must create a curiosity gap or land a contrarian claim. Open with a concrete moment, a specific number, or a sharp opinion. Never open with "In today's…", "Have you ever…", "Let me tell you…", "Imagine if…", "Did you know…".
- The body must contain at least ONE specific number (latency, cost, count, percentage, dollar amount, days, lines of code) OR at least one NAMED tool/framework/company. Generic claims without anchors get rejected.
- Deliver exactly ONE clear lesson. Not three. Not a listicle.
- End with a single question on its own line. The question must invite an OPINION or a story — not a yes/no, not "thoughts?", not "agree?". The question must be specific to the post's lesson.

Banned phrases (instant reject):
- "in the world of", "the rise of", "leveraging", "synergy", "unlock", "game-changer", "game changer", "revolutionize", "in today's fast-paced", "at the end of the day", "circle back", "deep dive", "dive into", "thought leader", "needle-moving", "needle moving", "harness the power", "elevate your", "take it to the next level".
- Strings of em-dashes used as a stylistic crutch.
- More than one emoji. Zero is preferred.
- Hashtag spam. Zero to three hashtags max, only if they're specific and useful.

Voice anchor:
${voice}

Output ONLY the post body. No preamble, no "Here's your post:", no quotation marks, no markdown.`;
}

export function buildUserPrompt(ctx: GenerationContext): string {
  const recent = ctx.recentPosts.slice(0, 10);
  const recentBlock = recent.length
    ? `Recent posts you must NOT repeat in hook, lesson, or structure:\n${recent
        .map((p, i) => `[${i + 1}] topic=${p.topic} angle=${p.angle ?? "?"} | hook: ${firstLine(p.content)}`)
        .join("\n")}`
    : "No recent posts yet.";

  const failureBlock = ctx.previousFailureReasons.length
    ? `Your previous attempt was rejected for these reasons. Fix each one:\n- ${ctx.previousFailureReasons.join("\n- ")}`
    : "";

  return [
    `Write today's LinkedIn post.`,
    ``,
    `Pillar: ${ctx.pillar}`,
    `Topic: ${ctx.topic}`,
    `Angle: ${ctx.angle.name}`,
    ``,
    `Angle instruction: ${ctx.angle.instruction}`,
    ``,
    `Constraints reminder:`,
    `- Hook under 10 words on its own line.`,
    `- At least one specific number OR named tool/framework in the body.`,
    `- 150–300 words, plain text, single closing question that invites an opinion.`,
    ``,
    recentBlock,
    failureBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

function firstLine(content: string): string {
  const line = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > 120 ? `${line.slice(0, 117)}...` : line;
}
