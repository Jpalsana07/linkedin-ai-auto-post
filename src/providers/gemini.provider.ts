import { GoogleGenAI } from "@google/genai";
import type { LLMProvider } from "../types/index.ts";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private client: GoogleGenAI;

  constructor(apiKey: string, model: string) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
        maxOutputTokens: 800,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Gemini returned empty content");
    return text;
  }
}
