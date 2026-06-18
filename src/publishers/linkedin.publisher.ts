import { refreshAccessToken } from "../auth/linkedin-oauth.ts";
import type { GeneratedPost, PublishResult, Publisher } from "../types/index.ts";

const POSTS_ENDPOINT = "https://api.linkedin.com/rest/posts";
/**
 * LinkedIn rotates API versions monthly and supports the last ~12 months.
 * Bump this every ~6 months to stay safely within the window.
 * Latest supported versions: https://learn.microsoft.com/en-us/linkedin/marketing/versioning
 */
const LINKEDIN_API_VERSION = "202506";

export interface LinkedInPublisherConfig {
  /** The user's person URN, e.g. `urn:li:person:abc123`. Required as `author` on every post. */
  personUrn: string;
  /** Static access token. Used directly if no refresh credentials are provided. */
  accessToken?: string;
  /** If provided, the publisher refreshes the access token on every run. Preferred over a static token. */
  refresh?: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  };
  /** Defaults to "PUBLIC". Set to "CONNECTIONS" to limit visibility. */
  visibility?: "PUBLIC" | "CONNECTIONS";
}

/**
 * Publishes a post to LinkedIn via the official Posts API (`/rest/posts`).
 *
 * Auth strategy:
 *   - If `refresh` is provided, mint a fresh access token before every post.
 *   - Otherwise fall back to the static `accessToken` (will fail when it expires).
 */
export class LinkedInPublisher implements Publisher {
  readonly name = "linkedin" as const;

  constructor(private readonly config: LinkedInPublisherConfig) {
    if (!config.personUrn) {
      throw new Error("LinkedInPublisher: personUrn is required");
    }
    if (!config.accessToken && !config.refresh) {
      throw new Error("LinkedInPublisher: provide either accessToken or refresh credentials");
    }
  }

  async publish(post: GeneratedPost): Promise<PublishResult> {
    const accessToken = await this.getAccessToken();

    const payload = {
      author: this.config.personUrn,
      commentary: post.content,
      visibility: this.config.visibility ?? "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    const response = await fetch(POSTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_API_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`LinkedIn API ${response.status}: ${body.slice(0, 400)}`);
    }

    const postUrn = response.headers.get("x-restli-id") ?? response.headers.get("x-linkedin-id");

    return {
      ok: true,
      destination: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : "linkedin",
      detail: `Published via LinkedIn Posts API. URN: ${postUrn ?? "unknown"}.`,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.config.refresh) {
      const tokens = await refreshAccessToken({
        refreshToken: this.config.refresh.refreshToken,
        clientId: this.config.refresh.clientId,
        clientSecret: this.config.refresh.clientSecret,
      });
      return tokens.accessToken;
    }
    if (this.config.accessToken) return this.config.accessToken;
    throw new Error("No LinkedIn credentials configured");
  }
}
