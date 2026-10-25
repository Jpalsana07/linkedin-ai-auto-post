/**
 * Post decorations appended after validation: pillar-specific hashtags on every
 * post, plus a soft availability CTA on every Nth post. Kept out of the LLM
 * prompt so they are deterministic and never count against the 150–300 word
 * budget or the similarity dedup (history stores the undecorated body).
 */

/** Append the CTA to every Nth post. Daily self-promo kills reach — keep ≥ 4. */
export const CTA_EVERY_N = 5;

export const CTA_LINE =
  "I build AI agents and full-stack products for clients end-to-end. My DMs are open if you're building something.";

/** 2–3 niche tags per pillar. LinkedIn search still indexes these; feeds don't. */
export const PILLAR_HASHTAGS: Readonly<Record<string, readonly string[]>> = {
  "AI Engineering": ["#AIAgents", "#AIEngineering", "#MCP"],
  "Architecture and Stack": ["#TypeScript", "#WebDevelopment", "#SoftwareEngineering"],
  "Founder and Career": ["#Freelancing", "#BuildInPublic", "#SoftwareEngineering"],
};

/**
 * Append CTA (when due) and pillar hashtags to a validated post body.
 * @param postCount number of posts already in history — post N+1 carries the CTA
 *   when (postCount + 1) is a multiple of CTA_EVERY_N.
 */
export function decoratePost(content: string, pillarName: string, postCount: number): string {
  const parts = [content.trim()];
  if ((postCount + 1) % CTA_EVERY_N === 0) {
    parts.push(CTA_LINE);
  }
  const tags = PILLAR_HASHTAGS[pillarName];
  if (tags && tags.length > 0) {
    parts.push(tags.join(" "));
  }
  return parts.join("\n\n");
}
