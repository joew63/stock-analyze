"use client";

import { useTheme } from "next-themes";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoricalPricePoint } from "@/lib/providers/types";
import type { PriceProjection } from "@/lib/projections/trend";

const CHART_COLORS = {
  light: { grid: "#e5e5e5", axis: "#525252", actual: "#171717", tooltipBg: "#ffffff", tooltipBorder: "#d4d4d4", tooltipText: "#171717" },
  dark: { grid: "#262626", axis: "#a3a3a3", actual: "#e5e5e5", tooltipBg: "#171717", tooltipBorder: "#404040", tooltipText: "#e5e5e5" },
};

interface ChartPoint {
  date: string;
  actual?: number;
  median?: number;
  band?: [number, number];
}

export function ProjectionChart({
  priceHistory,
  projection,
}: {
  priceHistory: HistoricalPricePoint[] | null;
  projection: PriceProjection;
}) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;

  if (!priceHistory || priceHistory.length === 0 || projection.insufficientData) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        Not enough price history to build a projection.
      </div>
    );
  }

  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const recent = sorted.slice(-90);

  const data: ChartPoint[] = recent.map((p) => ({ date: p.date, actual: p.close }));

  const anchor = recent[recent.length - 1];
  data.push({
    date: anchor.date,
    actual: anchor.close,
    median: anchor.close,
    band: [anchor.close, anchor.close],
  });

  for (const point of projection.points) {
    data.push({
      date: point.date,
      median: point.median,
      band: [point.lower1sd, point.upper1sd],
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Model-based price projection
        </h3>
        <span className="text-xs text-neutral-500">
          Ann. volatility: {(projection.annualizedVolatility * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        Statistical estimate from {projection.lookbackDays} trading days of price history
        — not investment advice. Dashed line = projected median, shaded band = ±1 standard
        deviation.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axis }} minTickGap={40} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: colors.axis }} width={60} />
          <Tooltip
            contentStyle={{
              background: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              fontSize: 12,
            }}
            labelStyle={{ color: colors.tooltipText }}
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="#3b82f6"
            fillOpacity={0.15}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={colors.actual}
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="median"
            stroke="#60a5fa"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
