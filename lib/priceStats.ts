import type { HistoricalPricePoint } from "@/lib/providers/types";

export function fiftyTwoWeekRange(
  priceHistory: HistoricalPricePoint[] | null
): { low: number; high: number } | null {
  if (!priceHistory || priceHistory.length === 0) return null;
  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const window = sorted.slice(-252);
  return {
    low: Math.min(...window.map((p) => p.low)),
    high: Math.max(...window.map((p) => p.high)),
  };
}
