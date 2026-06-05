/**
 * Paste 3–5 LinkedIn posts here that match the voice you want.
 * They can be your own past posts or posts from creators you admire.
 * Real examples beat written-out rules — the model will copy the rhythm.
 *
 * Keep each sample 100–300 words. Remove any names/handles you don't want copied.
 */
export const VOICE_SAMPLES: readonly string[] = [
  // Example placeholder — replace with your own samples before first run.
  `I shipped my first SaaS in 2019.
It made $12 in the first three months.

I almost quit.

Then I noticed something: every paying customer had the same pain. They didn't want my "all-in-one" feature set. They wanted one thing done well.

I deleted half the product in a weekend.
Revenue 4x'd in 60 days.

The lesson I keep relearning: customers don't pay for ambition. They pay for relief.

What's the one feature you'd be embarrassed to ship alone?`,
];

export function formatVoiceSamples(samples: readonly string[]): string {
  if (samples.length === 0) return "";
  const blocks = samples.map((s, i) => `<sample index="${i + 1}">\n${s.trim()}\n</sample>`);
  return `Here are reference posts in the exact voice and rhythm you should match. Study the cadence, the line breaks, the hook style, and the way the lesson lands.\n\n${blocks.join("\n\n")}`;
}
