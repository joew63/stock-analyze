// In-memory TTL cache. Lives per warm server instance — fine for a
// single-user tool where the goal is just staying under free-tier rate
// limits, not correctness across instances.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }
  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export const TTL = {
  QUOTE: 60_000,
  FUNDAMENTALS: 24 * 60 * 60_000,
  HISTORY: 24 * 60 * 60_000,
  NEWS: 15 * 60_000,
  EARNINGS: 24 * 60 * 60_000,
  RECOMMENDATION: 24 * 60 * 60_000,
} as const;
