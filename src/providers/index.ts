import type { LLMProvider, LLMProviderName } from "../types/index.ts";
import { AnthropicProvider } from "./anthropic.provider.ts";
import { GeminiProvider } from "./gemini.provider.ts";
import { OpenAIProvider } from "./openai.provider.ts";

export function resolveProviderName(raw: string | undefined): LLMProviderName {
  switch ((raw ?? "openai").toLowerCase()) {
    case "openai":
      return "openai";
    case "anthropic":
    case "claude":
      return "anthropic";
    case "gemini":
    case "google":
      return "gemini";
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${raw}`);
  }
}

export function createProvider(
  name: LLMProviderName,
  env: Record<string, string | undefined>,
): LLMProvider {
  switch (name) {
    case "openai":
      return new OpenAIProvider(env.OPENAI_API_KEY ?? "", env.OPENAI_MODEL ?? "gpt-5.4-mini");
    case "anthropic":
      return new AnthropicProvider(
        env.ANTHROPIC_API_KEY ?? "",
        env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      );
    case "gemini":
      return new GeminiProvider(
        env.GEMINI_API_KEY ?? "",
        env.GEMINI_MODEL ?? "gemini-2.5-flash",
      );
  }
}
