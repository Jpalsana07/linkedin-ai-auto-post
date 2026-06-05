import { pickNextAngle } from "./config/angles.ts";
import { pickNextTopic } from "./config/topics.ts";
import { LinkedInGenerator } from "./generators/linkedin.generator.ts";
import { createProvider, resolveProviderName } from "./providers/index.ts";
import { DraftPublisher } from "./publishers/draft.publisher.ts";
import { LinkedInPublisher } from "./publishers/linkedin.publisher.ts";
import { appendHistory, readHistory } from "./storage/history.storage.ts";
import { hashContent, hasExactDuplicate, recentEntries } from "./storage/history.ts";
import type { GeneratedPost, HistoryEntry, Publisher } from "./types/index.ts";
import { validatePost } from "./validation/post.validator.ts";

const env = process.env;

const CONFIG = {
  maxAttempts: Number(env.MAX_GENERATION_ATTEMPTS ?? 3),
  cooldownDays: Number(env.TOPIC_COOLDOWN_DAYS ?? 7),
  lookback: Number(env.HISTORY_LOOKBACK ?? 30),
  similarityThreshold: Number(env.SIMILARITY_THRESHOLD ?? 0.55),
  maxHookWords: Number(env.MAX_HOOK_WORDS ?? 10),
  dryRun: env.DRY_RUN === "true",
};

async function main(): Promise<void> {
  const now = new Date();
  const date = formatDate(now);

  console.log(`[${date}] Starting daily LinkedIn post generation`);
  console.log(`  config:`, CONFIG);

  const providerName = resolveProviderName(env.LLM_PROVIDER);
  const provider = createProvider(providerName, env);
  console.log(`  provider: ${provider.name} (${provider.model})`);

  const history = await readHistory();
  const recent = recentEntries(history, CONFIG.lookback);
  console.log(`  history: ${history.length} total, using last ${recent.length} for context`);

  const { pillar, topic } = pickNextTopic(history, CONFIG.cooldownDays, now);
  const angle = pickNextAngle(history);
  console.log(`  pillar: ${pillar.name}`);
  console.log(`  topic:  ${topic}`);
  console.log(`  angle:  ${angle.name}`);

  const generator = new LinkedInGenerator(provider);
  const post = await generateValidated(generator, pillar.name, topic, angle, recent);

  if (CONFIG.dryRun) {
    console.log("\n--- DRY RUN: generated post ---\n");
    console.log(post.content);
    console.log("\n--- end ---");
    return;
  }

  const publishers: Publisher[] = [new DraftPublisher(date)];
  const linkedInPublisher = buildLinkedInPublisher();
  if (linkedInPublisher) {
    publishers.push(linkedInPublisher);
  } else {
    console.log(`  linkedin: credentials not configured — skipping auto-post`);
  }

  for (const publisher of publishers) {
    try {
      const result = await publisher.publish(post);
      console.log(`  [${publisher.name}] ${result.destination}${result.detail ? ` — ${result.detail}` : ""}`);
    } catch (err) {
      // Fail soft: a publishing error (e.g. Make webhook timeout) should not
      // discard the draft or the history entry. Log and move on.
      console.error(`  [${publisher.name}] FAILED: ${(err as Error).message}`);
    }
  }

  const entry: HistoryEntry = {
    date: now.toISOString(),
    topic: post.topic,
    pillar: post.pillar,
    angle: post.angle,
    contentHash: hashContent(post.content),
    content: post.content,
    provider: post.provider,
    model: post.model,
  };
  await appendHistory(entry);
  console.log(`  history: appended ${entry.contentHash}`);
}

async function generateValidated(
  generator: LinkedInGenerator,
  pillar: string,
  topic: string,
  angle: { name: string; instruction: string },
  recent: HistoryEntry[],
): Promise<GeneratedPost> {
  const failures: string[] = [];

  for (let attempt = 1; attempt <= CONFIG.maxAttempts; attempt++) {
    console.log(`  attempt ${attempt}/${CONFIG.maxAttempts}...`);
    const post = await generator.generate({
      topic,
      pillar,
      angle,
      recentPosts: recent,
      attempt,
      previousFailureReasons: failures,
    });

    if (hasExactDuplicate(recent, post.content)) {
      failures.length = 0;
      failures.push("Generated content is an exact duplicate of a previous post.");
      console.log(`    rejected: exact duplicate`);
      continue;
    }

    const verdict = validatePost(post.content, {
      minWords: 150,
      maxWords: 300,
      maxHookWords: CONFIG.maxHookWords,
      similarityThreshold: CONFIG.similarityThreshold,
      history: recent,
    });

    if (verdict.ok) {
      console.log(`    accepted`);
      return post;
    }

    failures.length = 0;
    failures.push(...verdict.reasons);
    for (const r of verdict.reasons) console.log(`    rejected: ${r}`);
  }

  throw new Error(
    `Failed to produce a valid post after ${CONFIG.maxAttempts} attempts. Last failures:\n- ${failures.join("\n- ")}`,
  );
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildLinkedInPublisher(): LinkedInPublisher | null {
  const personUrn = env.LINKEDIN_PERSON_URN;
  if (!personUrn) return null;

  const refreshToken = env.LINKEDIN_REFRESH_TOKEN;
  const clientId = env.LINKEDIN_CLIENT_ID;
  const clientSecret = env.LINKEDIN_CLIENT_SECRET;
  const accessToken = env.LINKEDIN_ACCESS_TOKEN;

  if (refreshToken && clientId && clientSecret) {
    return new LinkedInPublisher({
      personUrn,
      refresh: { refreshToken, clientId, clientSecret },
    });
  }
  if (accessToken) {
    return new LinkedInPublisher({ personUrn, accessToken });
  }
  return null;
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
