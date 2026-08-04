"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { HistoricalPricePoint } from "@/lib/providers/types";

type PeriodKey = "1M" | "3M" | "YTD" | "1Y" | "5Y";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "YTD", label: "YTD" },
  { key: "1Y", label: "1Y" },
  { key: "5Y", label: "5Y" },
];

const CHART_COLORS = {
  light: {
    grid: "#e5e5e5",
    axis: "#525252",
    line: "#2563eb",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d4d4d4",
  },
  dark: {
    grid: "#262626",
    axis: "#a3a3a3",
    line: "#60a5fa",
    tooltipBg: "#171717",
    tooltipBorder: "#404040",
  },
};

function cutoffDateFor(period: PeriodKey, lastDate: Date): Date {
  const cutoff = new Date(lastDate);
  switch (period) {
    case "1M":
      cutoff.setMonth(cutoff.getMonth() - 1);
      return cutoff;
    case "3M":
      cutoff.setMonth(cutoff.getMonth() - 3);
      return cutoff;
    case "YTD":
      return new Date(lastDate.getFullYear(), 0, 1);
    case "1Y":
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      return cutoff;
    case "5Y":
      cutoff.setFullYear(cutoff.getFullYear() - 5);
      return cutoff;
  }
}

function filterByPeriod(
  sorted: HistoricalPricePoint[],
  period: PeriodKey
): HistoricalPricePoint[] {
  if (sorted.length === 0) return [];
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const cutoffStr = cutoffDateFor(period, lastDate).toISOString().slice(0, 10);
  return sorted.filter((p) => p.date >= cutoffStr);
}

function fmtCompactNum(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as HistoricalPricePoint;
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-2 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="font-medium text-neutral-900 dark:text-neutral-100">{point.date}</div>
      <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 text-neutral-600 dark:text-neutral-400">
        <span>Open</span>
        <span className="text-right">${point.open.toFixed(2)}</span>
        <span>High</span>
        <span className="text-right">${point.high.toFixed(2)}</span>
        <span>Low</span>
        <span className="text-right">${point.low.toFixed(2)}</span>
        <span>Close</span>
        <span className="text-right">${point.close.toFixed(2)}</span>
        {point.volume > 0 && (
          <>
            <span>Volume</span>
            <span className="text-right">{fmtCompactNum(point.volume)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function StockChart({
  priceHistory,
}: {
  priceHistory: HistoricalPricePoint[] | null;
}) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;
  const [period, setPeriod] = useState<PeriodKey>("1Y");

  const sorted = useMemo(
    () =>
      priceHistory ? [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1)) : [],
    [priceHistory]
  );
  const data = useMemo(() => filterByPeriod(sorted, period), [sorted, period]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        No price history available.
      </div>
    );
  }

  const highs = data.map((p) => p.high);
  const lows = data.map((p) => p.low);
  const periodHigh = highs.length ? Math.max(...highs) : null;
  const periodLow = lows.length ? Math.min(...lows) : null;
  const first = data[0]?.close;
  const last = data[data.length - 1]?.close;
  const change = first ? ((last - first) / first) * 100 : null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Price history
          </h3>
          {periodHigh !== null && periodLow !== null && (
            <p className="mt-0.5 text-xs text-neutral-500">
              Range: ${periodLow.toFixed(2)} – ${periodHigh.toFixed(2)}
              {change !== null && (
                <span
                  className={
                    change >= 0
                      ? " text-emerald-600 dark:text-emerald-400"
                      : " text-red-600 dark:text-red-400"
                  }
                >
                  {" "}
                  ({change >= 0 ? "+" : ""}
                  {change.toFixed(2)}%)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                period === p.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axis }} minTickGap={40} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: colors.axis }} width={60} />
          <Tooltip content={ChartTooltip} />
          <Line
            type="monotone"
            dataKey="close"
            stroke={colors.line}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
