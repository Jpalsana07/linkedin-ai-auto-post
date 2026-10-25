/**
 * Paste 3–5 LinkedIn posts here that match the voice you want.
 * They can be your own past posts or posts from creators you admire.
 * Real examples beat written-out rules — the model will copy the rhythm.
 *
 * Keep each sample 100–300 words. Remove any names/handles you don't want copied.
 */
export const VOICE_SAMPLES: readonly string[] = [
  `My automation showed green checkmarks for three months.
It wasn't working for a single one of them.

I built a daily job on GitHub Actions — a free scheduler that runs code on a timer.
It did its work, hit an expired API token, logged one quiet error line, and exited clean.
Green checkmark. Every day. Zero output.

The fix took 10 minutes.
Finding it took one honest look at the logs.

I had written "fail soft" error handling — catch the error, log it, move on — so one bad step wouldn't kill the whole run.
Sensible. Except nothing ever told me the most important step was the one failing.

The lesson: a pipeline that can't fail loudly will fail silently.
Now the job turns red the moment the critical step breaks, and everything else stays soft.

What's quietly showing green in your stack right now?`,
];

export function formatVoiceSamples(samples: readonly string[]): string {
  if (samples.length === 0) return "";
  const blocks = samples.map((s, i) => `<sample index="${i + 1}">\n${s.trim()}\n</sample>`);
  return `Here are reference posts in the exact voice and rhythm you should match. Study the cadence, the line breaks, the hook style, and the way the lesson lands.\n\n${blocks.join("\n\n")}`;
}
