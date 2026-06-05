import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "../types/index.ts";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 800,
      temperature: 0.9,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block && "text" in block ? block.text.trim() : "";
    if (!text) throw new Error("Anthropic returned empty content");
    return text;
  }
}
