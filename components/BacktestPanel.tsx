"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoricalPricePoint } from "@/lib/providers/types";
import { runBacktest } from "@/lib/backtest/engine";
import type { BacktestParams } from "@/lib/backtest/types";

type RangeKey = "1Y" | "3Y" | "5Y";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1Y", label: "1Y" },
  { key: "3Y", label: "3Y" },
  { key: "5Y", label: "5Y (Max)" },
];

const CHART_COLORS = {
  light: {
    grid: "#e5e5e5",
    axis: "#525252",
    strategy: "#2563eb",
    buyHold: "#a3a3a3",
    rsi: "#7c3aed",
    threshold: "#dc2626",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d4d4d4",
    tooltipText: "#171717",
  },
  dark: {
    grid: "#262626",
    axis: "#a3a3a3",
    strategy: "#60a5fa",
    buyHold: "#737373",
    rsi: "#c084fc",
    threshold: "#f87171",
    tooltipBg: "#171717",
    tooltipBorder: "#404040",
    tooltipText: "#e5e5e5",
  },
};

function cutoffDateFor(range: RangeKey, lastDate: Date): Date {
  const cutoff = new Date(lastDate);
  switch (range) {
    case "1Y":
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      return cutoff;
    case "3Y":
      cutoff.setFullYear(cutoff.getFullYear() - 3);
      return cutoff;
    case "5Y":
      cutoff.setFullYear(cutoff.getFullYear() - 5);
      return cutoff;
  }
}

function filterByRange(
  sorted: HistoricalPricePoint[],
  range: RangeKey
): HistoricalPricePoint[] {
  if (sorted.length === 0) return [];
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const cutoffStr = cutoffDateFor(range, lastDate).toISOString().slice(0, 10);
  return sorted.filter((p) => p.date >= cutoffStr);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPercentSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function signColor(n: number): string {
  return n >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-500">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
      />
    </label>
  );
}

export function BacktestPanel({
  priceHistory,
}: {
  priceHistory: HistoricalPricePoint[] | null;
}) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;

  const [range, setRange] = useState<RangeKey>("5Y");
  const [initialCapital, setInitialCapital] = useState(50000);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [buyThreshold, setBuyThreshold] = useState(30);
  const [sellThreshold, setSellThreshold] = useState(70);

  const sorted = useMemo(
    () =>
      priceHistory ? [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1)) : [],
    [priceHistory]
  );
  const windowed = useMemo(() => filterByRange(sorted, range), [sorted, range]);

  const params: BacktestParams = { initialCapital, rsiPeriod, buyThreshold, sellThreshold };
  const result = useMemo(
    () => runBacktest(windowed, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [windowed, initialCapital, rsiPeriod, buyThreshold, sellThreshold]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        No price history available to backtest.
      </div>
    );
  }

  const { summary, trades, equityCurve, insufficientData } = result;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Backtest: buy low, sell high (RSI strategy)
        </h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                range === r.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        Simulates a single position sized with a starting cash balance: goes
        all-in when RSI({rsiPeriod}) drops to {buyThreshold} or below
        (oversold / &quot;buy low&quot;), and exits to all-cash when RSI rises
        to {sellThreshold} or above (overbought / &quot;sell high&quot;).
        Compared against buying and holding the same starting cash. Historical
        simulation only — ignores fees, slippage, and taxes, and is not
        investment advice.
      </p>

      <div className="mb-4 flex flex-wrap gap-4 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
        <NumberField
          label="Starting cash ($)"
          value={initialCapital}
          onChange={setInitialCapital}
          min={100}
          max={10000000}
          step={1000}
        />
        <NumberField
          label="RSI period (days)"
          value={rsiPeriod}
          onChange={setRsiPeriod}
          min={2}
          max={50}
        />
        <NumberField
          label="Buy when RSI ≤"
          value={buyThreshold}
          onChange={setBuyThreshold}
          min={1}
          max={99}
        />
        <NumberField
          label="Sell when RSI ≥"
          value={sellThreshold}
          onChange={setSellThreshold}
          min={1}
          max={99}
        />
      </div>

      {insufficientData ? (
        <p className="text-sm text-neutral-500">
          Not enough price history in this range to run the backtest — try a
          longer range or a shorter RSI period.
        </p>
      ) : (
        <>
          {buyThreshold >= sellThreshold && (
            <div className="mb-4 rounded-lg border border-yellow-600/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-500">
              Buy threshold is not below the sell threshold — this inverts the
              usual &quot;buy low, sell high&quot; logic.
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Final value</div>
              <div className="mt-1 text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {fmtCurrency(summary.finalEquity)}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Strategy return</div>
              <div className={`mt-1 text-lg font-medium ${signColor(summary.totalReturnPercent)}`}>
                {fmtPercentSigned(summary.totalReturnPercent)}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Buy &amp; hold return</div>
              <div className={`mt-1 text-lg font-medium ${signColor(summary.buyHoldReturnPercent)}`}>
                {fmtPercentSigned(summary.buyHoldReturnPercent)}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">CAGR</div>
              <div className="mt-1 text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {summary.cagrPercent !== null ? fmtPercentSigned(summary.cagrPercent) : "N/A"}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Max drawdown</div>
              <div className="mt-1 text-lg font-medium text-red-600 dark:text-red-400">
                -{summary.maxDrawdownPercent.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Completed trades</div>
              <div className="mt-1 text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {summary.numberOfTrades}
                {summary.openPosition && (
                  <span className="ml-1 text-xs font-normal text-neutral-500">(+1 open)</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Win rate</div>
              <div className="mt-1 text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {summary.winRate !== null ? `${summary.winRate.toFixed(0)}%` : "N/A"}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axis }} minTickGap={40} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: colors.axis }}
                width={70}
                tickFormatter={(v: number) => fmtCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  background: colors.tooltipBg,
                  border: `1px solid ${colors.tooltipBorder}`,
                  fontSize: 12,
                }}
                labelStyle={{ color: colors.tooltipText }}
                formatter={(value, name) => [fmtCurrency(Number(value)), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="strategyEquity"
                name="RSI strategy"
                stroke={colors.strategy}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="buyHoldEquity"
                name="Buy & hold"
                stroke={colors.buyHold}
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={equityCurve} margin={{ top: 8 }}>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: colors.axis }} width={70} />
              <ReferenceLine y={buyThreshold} stroke={colors.threshold} strokeDasharray="3 3" />
              <ReferenceLine y={sellThreshold} stroke={colors.threshold} strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="rsi"
                name={`RSI(${rsiPeriod})`}
                stroke={colors.rsi}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {trades.length > 0 && (
            <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900">
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Action</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-500">Price</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-500">Shares</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-500">Cash after</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-500">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={i} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{t.date}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            t.type === "buy"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          }`}
                        >
                          {t.type === "buy" ? "Buy" : "Sell"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                        ${t.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {t.shares.toLocaleString("en-US")}
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {fmtCurrency(t.cashAfter)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right ${
                          t.pnl === null ? "text-neutral-400" : signColor(t.pnl)
                        }`}
                      >
                        {t.pnl === null
                          ? "—"
                          : `${fmtCurrency(t.pnl)} (${fmtPercentSigned(t.pnlPercent ?? 0)})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
