export type LLMProviderName = "openai" | "anthropic" | "gemini";

export interface HistoryEntry {
  date: string;
  topic: string;
  pillar?: string;
  angle?: string;
  contentHash: string;
  content: string;
  provider: LLMProviderName;
  model: string;
}

export interface GeneratedPost {
  topic: string;
  pillar: string;
  angle: string;
  content: string;
  provider: LLMProviderName;
  model: string;
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

export interface GenerationContext {
  topic: string;
  pillar: string;
  angle: { name: string; instruction: string };
  recentPosts: HistoryEntry[];
  attempt: number;
  previousFailureReasons: string[];
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly model: string;
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface Publisher {
  readonly name: string;
  publish(post: GeneratedPost): Promise<PublishResult>;
}

export interface PublishResult {
  ok: boolean;
  destination: string;
  detail?: string;
}
