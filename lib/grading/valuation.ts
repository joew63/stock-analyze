import { VALUATION_CURVES } from "./thresholds";
import { scoreFromCurve } from "./interpolate";
import { weightedAverage, type GradeResult, type MetricScore } from "./types";
import { formatMultiple } from "./format";
import type { FundamentalRatios } from "@/lib/providers/types";

export function gradeValuation(ratios: FundamentalRatios | null): GradeResult {
  if (!ratios) {
    return {
      category: "Valuation",
      score: 0,
      metrics: [],
      notes: ["No fundamentals data available."],
      insufficientData: true,
    };
  }

  const notes: string[] = [];
  const unprofitable = ratios.peRatioTTM === null || ratios.peRatioTTM <= 0;
  if (unprofitable) {
    notes.push(
      "No positive P/E (unprofitable or data unavailable) — graded on sales/cash-flow/EV multiples only."
    );
  }

  const metrics: MetricScore[] = [
    {
      key: "peRatio",
      label: "P/E (TTM)",
      value: ratios.peRatioTTM,
      displayValue: formatMultiple(ratios.peRatioTTM),
      score:
        ratios.peRatioTTM !== null && ratios.peRatioTTM > 0
          ? scoreFromCurve(ratios.peRatioTTM, VALUATION_CURVES.peRatio)
          : null,
      weight: unprofitable ? 0 : 3,
    },
    {
      key: "pegRatio",
      label: "PEG (TTM)",
      value: ratios.pegRatioTTM,
      displayValue: formatMultiple(ratios.pegRatioTTM),
      score:
        ratios.pegRatioTTM !== null && ratios.pegRatioTTM > 0
          ? scoreFromCurve(ratios.pegRatioTTM, VALUATION_CURVES.pegRatio)
          : null,
      weight: unprofitable ? 0 : 2,
    },
    {
      key: "priceToSales",
      label: "Price / Sales (TTM)",
      value: ratios.priceToSalesRatioTTM,
      displayValue: formatMultiple(ratios.priceToSalesRatioTTM),
      score:
        ratios.priceToSalesRatioTTM !== null
          ? scoreFromCurve(ratios.priceToSalesRatioTTM, VALUATION_CURVES.priceToSales)
          : null,
      weight: 2,
    },
    {
      key: "priceToFCF",
      label: "Price / Free Cash Flow (TTM)",
      value: ratios.priceToFreeCashFlowRatioTTM,
      displayValue: formatMultiple(ratios.priceToFreeCashFlowRatioTTM),
      score:
        ratios.priceToFreeCashFlowRatioTTM !== null &&
        ratios.priceToFreeCashFlowRatioTTM > 0
          ? scoreFromCurve(
              ratios.priceToFreeCashFlowRatioTTM,
              VALUATION_CURVES.priceToFreeCashFlow
            )
          : null,
      weight: 2,
    },
    {
      key: "evToEbitda",
      label: "EV / EBITDA (TTM)",
      value: ratios.evToEbitdaTTM,
      displayValue: formatMultiple(ratios.evToEbitdaTTM),
      score:
        ratios.evToEbitdaTTM !== null && ratios.evToEbitdaTTM > 0
          ? scoreFromCurve(ratios.evToEbitdaTTM, VALUATION_CURVES.evToEbitda)
          : null,
      weight: 2,
    },
  ];

  const avg = weightedAverage(metrics);
  const insufficientData =
    avg === null || metrics.filter((m) => m.score !== null).length < 2;
  if (insufficientData) notes.push("Not enough valuation data to grade confidently.");

  return {
    category: "Valuation",
    score: avg ?? 0,
    metrics,
    notes,
    insufficientData,
  };
}
