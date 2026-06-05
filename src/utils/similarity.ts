const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "in", "on", "for",
  "at", "by", "with", "as", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "its", "i", "you", "we", "they", "he",
  "she", "them", "our", "your", "my", "me", "us", "do", "does", "did", "have",
  "has", "had", "will", "would", "can", "could", "should", "than", "from", "so",
  "not", "no", "yes", "just", "now", "into", "out", "up", "down", "over", "about",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function bigrams(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    out.push(`${words[i]} ${words[i + 1]}`);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Similarity score in [0, 1]. Combines unigram and bigram Jaccard
 * (bigrams weighted higher because they catch phrase reuse).
 */
export function similarity(a: string, b: string): number {
  const wa = tokens(a);
  const wb = tokens(b);
  const unigramScore = jaccard(new Set(wa), new Set(wb));
  const bigramScore = jaccard(new Set(bigrams(wa)), new Set(bigrams(wb)));
  return unigramScore * 0.4 + bigramScore * 0.6;
}

/**
 * Returns the highest similarity score against any candidate, plus the matched text.
 */
export function maxSimilarity(
  target: string,
  candidates: readonly string[],
): { score: number; against: string | null } {
  let best = 0;
  let against: string | null = null;
  for (const c of candidates) {
    const s = similarity(target, c);
    if (s > best) {
      best = s;
      against = c;
    }
  }
  return { score: best, against };
}
