import type {
  CompanyProfile,
  FundamentalRatios,
  HistoricalPricePoint,
  Quote,
} from "@/lib/providers/types";
import { fiftyTwoWeekRange } from "@/lib/priceStats";

function fmtNum(n: number | null, opts?: Intl.NumberFormatOptions) {
  if (n === null) return "N/A";
  return new Intl.NumberFormat("en-US", opts).format(n);
}

function fmtCompact(n: number | null) {
  if (n === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPercent(n: number | null) {
  if (n === null) return "N/A";
  return `${(n * 100).toFixed(2)}%`;
}

export function MetricsGrid({
  quote,
  profile,
  ratios,
  priceHistory,
}: {
  quote: Quote | null;
  profile: CompanyProfile | null;
  ratios: FundamentalRatios | null;
  priceHistory: HistoricalPricePoint[] | null;
}) {
  const range = fiftyTwoWeekRange(priceHistory);

  const items: { label: string; value: string }[] = [
    {
      label: "Price",
      value: quote ? `$${fmtNum(quote.price, { maximumFractionDigits: 2 })}` : "N/A",
    },
    {
      label: "Day change",
      value: quote
        ? `${quote.change >= 0 ? "+" : ""}${fmtNum(quote.change, {
            maximumFractionDigits: 2,
          })} (${quote.changePercent.toFixed(2)}%)`
        : "N/A",
    },
    { label: "Market cap", value: `$${fmtCompact(profile?.marketCap ?? null)}` },
    {
      label: "P/E (TTM)",
      value: ratios?.peRatioTTM ? `${ratios.peRatioTTM.toFixed(1)}x` : "N/A",
    },
    {
      label: "PEG (TTM)",
      value: ratios?.pegRatioTTM ? `${ratios.pegRatioTTM.toFixed(1)}x` : "N/A",
    },
    {
      label: "52-week range",
      value: range ? `$${range.low.toFixed(2)} – $${range.high.toFixed(2)}` : "N/A",
    },
    {
      label: "Beta",
      value:
        profile?.beta !== null && profile?.beta !== undefined
          ? profile.beta.toFixed(2)
          : "N/A",
    },
    { label: "Dividend yield", value: fmtPercent(ratios?.dividendYieldTTM ?? null) },
    { label: "Sector", value: profile?.sector ?? "N/A" },
    { label: "Industry", value: profile?.industry ?? "N/A" },
    { label: "Exchange", value: profile?.exchange ?? "N/A" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
        >
          <div className="text-xs text-neutral-500">{item.label}</div>
          <div className="mt-1 text-lg font-medium text-neutral-900 dark:text-neutral-100">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
