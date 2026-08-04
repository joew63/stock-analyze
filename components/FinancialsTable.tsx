"use client";

import { useState } from "react";
import type { IncomeStatementPoint } from "@/lib/providers/types";

type Period = "annual" | "quarter";

interface Row {
  label: string;
  get: (p: IncomeStatementPoint) => number | null;
  format: "currency" | "eps" | "shares";
  emphasis?: boolean;
}

const ROWS: Row[] = [
  { label: "Revenue", get: (p) => p.revenue, format: "currency", emphasis: true },
  { label: "Cost of Revenue", get: (p) => p.costOfRevenue, format: "currency" },
  { label: "Gross Profit", get: (p) => p.grossProfit, format: "currency", emphasis: true },
  { label: "R&D Expense", get: (p) => p.researchAndDevelopmentExpenses, format: "currency" },
  {
    label: "SG&A Expense",
    get: (p) => p.sellingGeneralAndAdministrativeExpenses,
    format: "currency",
  },
  { label: "Total Operating Expenses", get: (p) => p.operatingExpenses, format: "currency" },
  { label: "Operating Income", get: (p) => p.operatingIncome, format: "currency", emphasis: true },
  { label: "Other Income & Expenses", get: (p) => p.totalOtherIncomeExpensesNet, format: "currency" },
  { label: "Pre-Tax Income", get: (p) => p.incomeBeforeTax, format: "currency" },
  { label: "Income Tax Expense", get: (p) => p.incomeTaxExpense, format: "currency" },
  { label: "Net Income", get: (p) => p.netIncome, format: "currency", emphasis: true },
  { label: "EBITDA", get: (p) => p.ebitda, format: "currency" },
  { label: "EBIT", get: (p) => p.ebit, format: "currency" },
  { label: "EPS (Basic)", get: (p) => p.eps, format: "eps" },
  { label: "EPS (Diluted)", get: (p) => p.epsDiluted, format: "eps" },
  { label: "Shares Outstanding (Basic)", get: (p) => p.weightedAverageShsOut, format: "shares" },
  { label: "Shares Outstanding (Diluted)", get: (p) => p.weightedAverageShsOutDil, format: "shares" },
];

function formatValue(value: number | null, format: Row["format"]): string {
  if (value === null) return "N/A";
  if (format === "eps") return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
  if (format === "shares") {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(
      value
    );
  }
  const sign = value < 0 ? "-" : "";
  return `${sign}$${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Math.abs(value))}`;
}

export function FinancialsTable({
  annual,
  quarterly,
}: {
  annual: IncomeStatementPoint[] | null;
  quarterly: IncomeStatementPoint[] | null;
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;

  if (!annual && !quarterly) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        No financial statement data available.
      </div>
    );
  }

  const periods = (source ?? []).slice(0, 5);

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Income statement
        </h3>
        <div className="flex gap-1">
          {(["annual", "quarter"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
                period === p
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {p === "annual" ? "Annual" : "Quarterly"}
            </button>
          ))}
        </div>
      </div>

      {periods.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No {period === "annual" ? "annual" : "quarterly"} data available.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="sticky left-0 bg-neutral-50 py-2 pr-4 text-left font-medium text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                  &nbsp;
                </th>
                {periods.map((p) => (
                  <th
                    key={p.date}
                    className="whitespace-nowrap py-2 pl-4 text-right font-medium text-neutral-500 dark:text-neutral-400"
                  >
                    {p.period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td
                    className={`sticky left-0 whitespace-nowrap bg-neutral-50 py-2 pr-4 dark:bg-neutral-900/60 ${
                      row.emphasis
                        ? "font-medium text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {row.label}
                  </td>
                  {periods.map((p) => (
                    <td
                      key={p.date}
                      className={`whitespace-nowrap py-2 pl-4 text-right ${
                        row.emphasis
                          ? "font-medium text-neutral-900 dark:text-neutral-100"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {formatValue(row.get(p), row.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
