"use client";

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
  if (!priceHistory || priceHistory.length === 0 || projection.insufficientData) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-sm text-neutral-500">
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">
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
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a3a3a3" }} minTickGap={40} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#a3a3a3" }} width={60} />
          <Tooltip
            contentStyle={{ background: "#171717", border: "1px solid #404040", fontSize: 12 }}
            labelStyle={{ color: "#e5e5e5" }}
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
            stroke="#e5e5e5"
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
