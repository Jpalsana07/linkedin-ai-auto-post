import OpenAI from "openai";
import type { LLMProvider } from "../types/index.ts";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  readonly model: string;
  private client: OpenAI;

  constructor(apiKey: string, model: string) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required");
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_completion_tokens: 800,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned empty content");
    return text;
  }
}
