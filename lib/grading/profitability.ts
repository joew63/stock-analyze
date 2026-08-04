import { PROFITABILITY_CURVES } from "./thresholds";
import { scoreFromCurve } from "./interpolate";
import { weightedAverage, type GradeResult, type MetricScore } from "./types";
import { formatPercent } from "./format";
import type { FundamentalRatios } from "@/lib/providers/types";

export function gradeProfitability(
  ratios: FundamentalRatios | null
): GradeResult {
  if (!ratios) {
    return {
      category: "Profitability",
      score: 0,
      metrics: [],
      notes: ["No fundamentals data available."],
      insufficientData: true,
    };
  }

  const metrics: MetricScore[] = [
    {
      key: "grossMargin",
      label: "Gross margin",
      value: ratios.grossProfitMarginTTM,
      displayValue: formatPercent(ratios.grossProfitMarginTTM),
      score:
        ratios.grossProfitMarginTTM !== null
          ? scoreFromCurve(ratios.grossProfitMarginTTM, PROFITABILITY_CURVES.grossMargin)
          : null,
      weight: 2,
    },
    {
      key: "operatingMargin",
      label: "Operating margin",
      value: ratios.operatingProfitMarginTTM,
      displayValue: formatPercent(ratios.operatingProfitMarginTTM),
      score:
        ratios.operatingProfitMarginTTM !== null
          ? scoreFromCurve(ratios.operatingProfitMarginTTM, PROFITABILITY_CURVES.operatingMargin)
          : null,
      weight: 3,
    },
    {
      key: "netMargin",
      label: "Net margin",
      value: ratios.netProfitMarginTTM,
      displayValue: formatPercent(ratios.netProfitMarginTTM),
      score:
        ratios.netProfitMarginTTM !== null
          ? scoreFromCurve(ratios.netProfitMarginTTM, PROFITABILITY_CURVES.netMargin)
          : null,
      weight: 3,
    },
    {
      key: "roe",
      label: "Return on equity",
      value: ratios.returnOnEquityTTM,
      displayValue: formatPercent(ratios.returnOnEquityTTM),
      score:
        ratios.returnOnEquityTTM !== null
          ? scoreFromCurve(ratios.returnOnEquityTTM, PROFITABILITY_CURVES.returnOnEquity)
          : null,
      weight: 2,
    },
    {
      key: "roa",
      label: "Return on assets",
      value: ratios.returnOnAssetsTTM,
      displayValue: formatPercent(ratios.returnOnAssetsTTM),
      score:
        ratios.returnOnAssetsTTM !== null
          ? scoreFromCurve(ratios.returnOnAssetsTTM, PROFITABILITY_CURVES.returnOnAssets)
          : null,
      weight: 2,
    },
  ];

  const avg = weightedAverage(metrics);
  const insufficientData =
    avg === null || metrics.filter((m) => m.score !== null).length < 2;
  const notes = insufficientData
    ? ["Not enough profitability data to grade confidently."]
    : [];

  return {
    category: "Profitability",
    score: avg ?? 0,
    metrics,
    notes,
    insufficientData,
  };
}
