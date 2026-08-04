import type { HistoricalPricePoint } from "@/lib/providers/types";

export function fiftyTwoWeekRange(
  priceHistory: HistoricalPricePoint[] | null
): { low: number; high: number } | null {
  if (!priceHistory || priceHistory.length === 0) return null;
  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const window = sorted.slice(-252);
  const closes = window.map((p) => p.close);
  return { low: Math.min(...closes), high: Math.max(...closes) };
}
