import type { RecommendationTrendPoint } from "@/lib/providers/types";

const SEGMENTS: {
  key: keyof RecommendationTrendPoint;
  label: string;
  color: string;
}[] = [
  { key: "strongBuy", label: "Strong Buy", color: "bg-emerald-500" },
  { key: "buy", label: "Buy", color: "bg-lime-500" },
  { key: "hold", label: "Hold", color: "bg-yellow-500" },
  { key: "sell", label: "Sell", color: "bg-orange-500" },
  { key: "strongSell", label: "Strong Sell", color: "bg-red-500" },
];

export function RecommendationTrend({
  trend,
}: {
  trend: RecommendationTrendPoint[] | null;
}) {
  if (!trend || trend.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-500">
        No analyst recommendation data available.
      </div>
    );
  }

  const latest = trend[0];
  const total = SEGMENTS.reduce((sum, s) => sum + (latest[s.key] as number), 0);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">
          Analyst recommendation trend
        </h3>
        <span className="text-xs text-neutral-500">Period: {latest.period}</span>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        Analyst buy/hold/sell consensus — not a dollar price target (unavailable on
        free-tier data from any reputable provider).
      </p>

      {total > 0 ? (
        <>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-800">
            {SEGMENTS.map((s) => {
              const value = latest[s.key] as number;
              const width = (value / total) * 100;
              return width > 0 ? (
                <div
                  key={s.key}
                  className={s.color}
                  style={{ width: `${width}%` }}
                  title={`${s.label}: ${value}`}
                />
              ) : null;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.label}: {latest[s.key] as number}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-neutral-500">No analysts currently covering this stock.</p>
      )}
    </div>
  );
}
