/**
 * LinkedIn OAuth 2.0 helpers — authorization code flow with refresh-token support.
 *
 * Endpoints reference: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 *
 * Notes:
 * - `w_member_social` is the scope required to post on behalf of the authenticated user.
 * - `openid profile` is required to retrieve the user's identity (the "sub" claim used to build their person URN).
 * - Refresh tokens are issued only when your LinkedIn app is approved for "Programmatic Refresh Tokens".
 *   If you don't have them, you must re-run the auth CLI roughly every 60 days when the access token expires.
 */

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export const DEFAULT_SCOPES = ["openid", "profile", "w_member_social"] as const;

export interface LinkedInTokens {
  accessToken: string;
  /** Unix epoch in ms when access token stops working. */
  expiresAt: number;
  refreshToken?: string;
  /** Unix epoch in ms when refresh token stops working (if issued). */
  refreshTokenExpiresAt?: number;
  scope: string;
}

export interface BuildAuthUrlOptions {
  clientId: string;
  redirectUri: string;
  scopes?: readonly string[];
  state: string;
}

export function buildAuthUrl(opts: BuildAuthUrlOptions): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    scope: (opts.scopes ?? DEFAULT_SCOPES).join(" "),
    state: opts.state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface ExchangeCodeOptions {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export async function exchangeCodeForTokens(opts: ExchangeCodeOptions): Promise<LinkedInTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`LinkedIn token exchange failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return parseTokenResponse(await response.json());
}

export interface RefreshTokenOptions {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export async function refreshAccessToken(opts: RefreshTokenOptions): Promise<LinkedInTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`LinkedIn token refresh failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return parseTokenResponse(await response.json());
}

/**
 * Fetch the authenticated user's person URN (e.g. `urn:li:person:abc123`).
 * Required as the `author` field on every posted Share.
 */
export async function fetchPersonUrn(accessToken: string): Promise<string> {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`LinkedIn userinfo failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as { sub?: string };
  if (!data.sub) throw new Error("LinkedIn userinfo response missing 'sub' field");
  return `urn:li:person:${data.sub}`;
}

interface RawTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

function parseTokenResponse(raw: unknown): LinkedInTokens {
  const data = raw as RawTokenResponse;
  if (!data.access_token || typeof data.expires_in !== "number") {
    throw new Error("LinkedIn token response missing access_token or expires_in");
  }
  const now = Date.now();
  return {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
    refreshToken: data.refresh_token,
    refreshTokenExpiresAt:
      typeof data.refresh_token_expires_in === "number"
        ? now + data.refresh_token_expires_in * 1000
        : undefined,
    scope: data.scope ?? "",
  };
}
