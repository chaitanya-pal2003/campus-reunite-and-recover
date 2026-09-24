const STOP = new Set([
  "the","a","an","my","i","is","was","in","on","at","of","and","or","to","near","with","for","it","this","that","lost","found","please","help",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export type MatchableItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  location: string;
  occurred_at: string;
};

/**
 * Similarity between a lost report and a found report.
 * Combines word overlap (title + description), shared tags,
 * category match, location match and time proximity.
 */
export function matchScore(a: MatchableItem, b: MatchableItem): number {
  const wordsA = new Set([...tokenize(a.title), ...tokenize(a.description)]);
  const wordsB = new Set([...tokenize(b.title), ...tokenize(b.description)]);
  let shared = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) shared += 1;
  });
  const union = new Set([...wordsA, ...wordsB]).size || 1;
  const textScore = shared / union; // Jaccard

  const tagsA = new Set(a.tags.map((t) => t.toLowerCase().trim()));
  const tagsB = new Set(b.tags.map((t) => t.toLowerCase().trim()));
  let sharedTags = 0;
  tagsA.forEach((t) => {
    if (tagsB.has(t)) sharedTags += 1;
  });
  const tagScore = tagsA.size && tagsB.size ? sharedTags / Math.max(tagsA.size, tagsB.size) : 0;

  const categoryScore = a.category && a.category === b.category ? 1 : 0;

  const locA = a.location.toLowerCase().trim();
  const locB = b.location.toLowerCase().trim();
  const locationScore =
    locA && locB && (locA === locB || locA.includes(locB) || locB.includes(locA)) ? 1 : 0;

  const days =
    Math.abs(new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()) /
    86_400_000;
  const timeScore = days <= 14 ? 1 - days / 14 : 0;

  const score =
    textScore * 0.4 + tagScore * 0.25 + categoryScore * 0.15 + locationScore * 0.1 + timeScore * 0.1;

  return Math.min(1, score);
}

export function matchReasons(a: MatchableItem, b: MatchableItem): string[] {
  const reasons: string[] = [];
  const wordsA = new Set([...tokenize(a.title), ...tokenize(a.description)]);
  const shared = [...new Set([...tokenize(b.title), ...tokenize(b.description)])].filter((w) =>
    wordsA.has(w),
  );
  if (shared.length) reasons.push(`Same words: ${shared.slice(0, 4).join(", ")}`);

  const tagsA = new Set(a.tags.map((t) => t.toLowerCase().trim()));
  const sharedTags = b.tags.filter((t) => tagsA.has(t.toLowerCase().trim()));
  if (sharedTags.length) reasons.push(`Shared tags: ${sharedTags.slice(0, 4).join(", ")}`);

  if (a.category && a.category === b.category) reasons.push(`Both in ${a.category}`);

  const locA = a.location.toLowerCase().trim();
  const locB = b.location.toLowerCase().trim();
  if (locA && locB && (locA === locB || locA.includes(locB) || locB.includes(locA)))
    reasons.push("Nearby place");

  const days =
    Math.abs(new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()) / 86_400_000;
  if (days <= 3) reasons.push("Within a few days");

  return reasons;
}
