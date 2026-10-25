import { describe, expect, test } from "bun:test";
import { CTA_EVERY_N, CTA_LINE, PILLAR_HASHTAGS, decoratePost } from "../src/config/engagement.ts";
import { PILLARS } from "../src/config/topics.ts";

describe("PILLAR_HASHTAGS configuration", () => {
  test("every pillar has 2-3 hashtags", () => {
    for (const pillar of PILLARS) {
      const tags = PILLAR_HASHTAGS[pillar.name];
      expect(tags).toBeDefined();
      expect(tags!.length).toBeGreaterThanOrEqual(2);
      expect(tags!.length).toBeLessThanOrEqual(3);
      for (const tag of tags!) expect(tag.startsWith("#")).toBe(true);
    }
  });
});

describe("decoratePost", () => {
  const body = "Hook line.\n\nBody of the post.\n\nWhat would you do?";

  test("appends pillar hashtags on every post", () => {
    const out = decoratePost(body, "AI Engineering", 0);
    expect(out).toStartWith(body);
    expect(out).toEndWith(PILLAR_HASHTAGS["AI Engineering"]!.join(" "));
  });

  test("adds the CTA only on every Nth post", () => {
    const withCta = decoratePost(body, "AI Engineering", CTA_EVERY_N - 1);
    const withoutCta = decoratePost(body, "AI Engineering", CTA_EVERY_N);
    expect(withCta).toContain(CTA_LINE);
    expect(withoutCta).not.toContain(CTA_LINE);
  });

  test("CTA lands between body and hashtags", () => {
    const out = decoratePost(body, "Founder and Career", CTA_EVERY_N * 2 - 1);
    const ctaIndex = out.indexOf(CTA_LINE);
    const tagsIndex = out.indexOf(PILLAR_HASHTAGS["Founder and Career"]!.join(" "));
    expect(ctaIndex).toBeGreaterThan(body.length - 1);
    expect(tagsIndex).toBeGreaterThan(ctaIndex);
  });

  test("unknown pillar gets no hashtags", () => {
    expect(decoratePost(body, "Unknown Pillar", 0)).toBe(body);
  });
});
