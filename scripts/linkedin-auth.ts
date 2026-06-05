/**
 * One-time LinkedIn OAuth CLI.
 *
 * Usage:
 *   1. Create a LinkedIn Developer App at https://developer.linkedin.com
 *   2. Add `http://localhost:8765/callback` as an Authorized redirect URL.
 *   3. Request the "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn" products.
 *   4. Copy the app's Client ID and Client Secret.
 *   5. Run:  LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=... bun run auth:linkedin
 *   6. Browser opens, you authorize, this script prints the tokens to paste into .env / GH Secrets.
 *
 * The script spins up a temporary HTTP server on port 8765 just long enough to
 * catch the OAuth callback, then shuts down.
 */

import { randomBytes } from "node:crypto";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  fetchPersonUrn,
} from "../src/auth/linkedin-oauth.ts";

const CALLBACK_PORT = 8765;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

const clientId = process.env.LINKEDIN_CLIENT_ID;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Error: set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET before running this script.");
  console.error("Example:");
  console.error("  LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=... bun run auth:linkedin");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const authUrl = buildAuthUrl({ clientId, redirectUri: REDIRECT_URI, state });

console.log("\n=== LinkedIn OAuth CLI ===\n");
console.log("1. Open this URL in your browser to authorize the app:\n");
console.log(`   ${authUrl}\n`);
console.log(`2. After authorizing, LinkedIn will redirect to ${REDIRECT_URI}.`);
console.log("   This script is listening on that port and will pick up the code automatically.\n");
console.log("Waiting for callback...\n");

const result = await new Promise<{ code: string; state: string }>((resolve, reject) => {
  const server = Bun.serve({
    port: CALLBACK_PORT,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/callback") {
        return new Response("Not found", { status: 404 });
      }
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        const description = url.searchParams.get("error_description") ?? "";
        const message = `OAuth error: ${errorParam} — ${description}`;
        setTimeout(() => server.stop(), 100);
        reject(new Error(message));
        return new Response(`<h1>OAuth failed</h1><p>${message}</p>`, {
          status: 400,
          headers: { "Content-Type": "text/html" },
        });
      }

      if (!code || !returnedState) {
        return new Response("Missing code/state", { status: 400 });
      }

      setTimeout(() => server.stop(), 100);
      resolve({ code, state: returnedState });
      return new Response(
        `<h1>Authorized</h1><p>You can close this tab and return to the terminal.</p>`,
        { headers: { "Content-Type": "text/html" } },
      );
    },
  });
});

if (result.state !== state) {
  console.error(`State mismatch — expected ${state}, got ${result.state}. Aborting (possible CSRF).`);
  process.exit(1);
}

console.log("Exchanging authorization code for tokens...");
const tokens = await exchangeCodeForTokens({
  code: result.code,
  clientId,
  clientSecret,
  redirectUri: REDIRECT_URI,
});

console.log("Fetching your LinkedIn person URN...");
const personUrn = await fetchPersonUrn(tokens.accessToken);

console.log("\n=== SUCCESS — paste these into .env (locally) and GitHub Secrets ===\n");
console.log(`LINKEDIN_PERSON_URN=${personUrn}`);
console.log(`LINKEDIN_ACCESS_TOKEN=${tokens.accessToken}`);
if (tokens.refreshToken) {
  console.log(`LINKEDIN_REFRESH_TOKEN=${tokens.refreshToken}`);
  console.log(`LINKEDIN_CLIENT_ID=${clientId}`);
  console.log(`LINKEDIN_CLIENT_SECRET=${clientSecret}`);
}

const expiryDays = Math.round((tokens.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
console.log(`\nScope granted: ${tokens.scope || "(none reported)"}`);
console.log(`Access token expires in ~${expiryDays} days.`);
if (!tokens.refreshToken) {
  console.log(
    "\nNo refresh token was issued. You'll need to re-run this script when the access token expires.",
  );
  console.log(
    "To get refresh tokens, request the 'Programmatic Refresh Tokens' feature from LinkedIn for your app.",
  );
} else {
  const refreshDays =
    tokens.refreshTokenExpiresAt &&
    Math.round((tokens.refreshTokenExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  console.log(`Refresh token expires in ~${refreshDays} days.`);
  console.log("With CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN, the cron will mint fresh access tokens daily.");
}
console.log("\nDone.\n");
