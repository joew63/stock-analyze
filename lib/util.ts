// Small shared helpers used across the scan and grading code.

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Ascending comparator for records carrying an ISO `date` string. Provider
// responses and price history get re-sorted with this in several places.
export function byDateAsc(a: { date: string }, b: { date: string }): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

// Runs `fn` over `items` with at most `limit` promises in flight, preserving
// input order in the result. Used to keep the per-symbol fan-out inside the
// providers' free-tier rate limits.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}
