import { writePostMarkdown } from "../storage/history.storage.ts";
import type { GeneratedPost, PublishResult, Publisher } from "../types/index.ts";

export class DraftPublisher implements Publisher {
  readonly name = "draft" as const;

  constructor(private readonly date: string) {}

  async publish(post: GeneratedPost): Promise<PublishResult> {
    const path = await writePostMarkdown(this.date, post.topic, post.content);
    return {
      ok: true,
      destination: path,
      detail: `Saved markdown draft. Copy-paste to LinkedIn manually.`,
    };
  }
}
