import { buildSystemPrompt, buildUserPrompt } from "../prompts/linkedin.prompt.ts";
import type { GeneratedPost, GenerationContext, LLMProvider } from "../types/index.ts";

export class LinkedInGenerator {
  constructor(private readonly provider: LLMProvider) {}

  async generate(ctx: GenerationContext): Promise<GeneratedPost> {
    const system = buildSystemPrompt();
    const user = buildUserPrompt(ctx);
    const raw = await this.provider.generate(system, user);
    const content = sanitize(raw);
    return {
      topic: ctx.topic,
      pillar: ctx.pillar,
      angle: ctx.angle.name,
      content,
      provider: this.provider.name,
      model: this.provider.model,
    };
  }
}

/**
 * Models sometimes wrap output in quotes, prefix with "Here's your post:",
 * or sneak in markdown. Strip the most common offenders.
 */
function sanitize(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^["'`]+|["'`]+$/g, "");
  s = s.replace(/^(here'?s? (your|the) post[:\-]?)\s*/i, "");
  s = s.replace(/^post[:\-]\s*/i, "");
  s = s.replace(/^#+\s.*$/gm, "");
  return s.trim();
}
