/**
 * Lightweight fuzzy search: matches products even with typos.
 * Uses bigram similarity (similar to PostgreSQL's pg_trgm).
 */

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "");
}

function bigrams(str: string): Set<string> {
  const s = normalize(str);
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.substring(i, i + 2));
  }
  return set;
}

function similarity(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  bigramsA.forEach((bg) => { if (bigramsB.has(bg)) intersection++; });
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

export interface FuzzyProduct {
  name: string;
  brand?: string | null;
  description?: string | null;
  tags?: string[] | null;
  [key: string]: any;
}

/**
 * Score a product against a query. Higher = better match.
 * Returns 0 if no match at all.
 */
export function fuzzyScore(product: FuzzyProduct, query: string): number {
  const q = normalize(query);
  if (!q || q.length < 2) return 0;

  const fields = [
    { text: product.name, weight: 3 },
    { text: product.brand || "", weight: 2 },
    { text: product.description || "", weight: 1 },
    { text: (product.tags || []).join(" "), weight: 1.5 },
  ];

  let bestScore = 0;

  for (const { text, weight } of fields) {
    const normalized = normalize(text);
    
    // Exact substring match = highest score
    if (normalized.includes(q)) {
      const exactScore = weight * 1.0;
      bestScore = Math.max(bestScore, exactScore);
      continue;
    }

    // Word-level matching
    const words = normalized.split(/\s+/).filter(w => w.length >= 2);
    for (const word of words) {
      // Check if query starts with the word or word starts with query
      if (word.startsWith(q) || q.startsWith(word)) {
        bestScore = Math.max(bestScore, weight * 0.9);
        continue;
      }
      const sim = similarity(q, word);
      if (sim >= 0.4) {
        bestScore = Math.max(bestScore, weight * sim * 0.8);
      }
    }

    // Also check bigram similarity against the full field
    const fullSim = similarity(q, normalized);
    if (fullSim >= 0.3) {
      bestScore = Math.max(bestScore, weight * fullSim * 0.7);
    }
  }

  return bestScore;
}

/**
 * Filter and sort products by fuzzy relevance.
 * Returns only products with score > threshold.
 */
export function fuzzyFilter<T extends FuzzyProduct>(
  products: T[],
  query: string,
  threshold = 0.3
): T[] {
  if (!query || query.trim().length < 2) return products;

  const scored = products
    .map((p) => ({ product: p, score: fuzzyScore(p, query) }))
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.product);
}
