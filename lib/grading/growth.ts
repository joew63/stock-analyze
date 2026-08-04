import { GROWTH_CURVES } from "./thresholds";
import { scoreFromCurve } from "./interpolate";
import { scoreToLetter } from "./letter";
import { weightedAverage, type GradeResult, type MetricScore } from "./types";
import { formatPercent } from "./format";
import type { IncomeStatementPoint } from "@/lib/providers/types";

function yoyGrowth(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev <= 0) return null;
  return (curr - prev) / prev;
}

function cagr(curr: number | null, past: number | null, years: number): number | null {
  if (curr === null || past === null || past <= 0 || curr <= 0) return null;
  return Math.pow(curr / past, 1 / years) - 1;
}

export function gradeGrowth(
  incomeHistory: IncomeStatementPoint[] | null
): GradeResult {
  if (!incomeHistory || incomeHistory.length < 2) {
    return {
      category: "Growth",
      letter: "F",
      score: 0,
      metrics: [],
      notes: ["Not enough income-statement history to grade growth."],
      insufficientData: true,
    };
  }

  const sorted = [...incomeHistory].sort((a, b) => (a.date < b.date ? 1 : -1));
  const [latest, prior] = sorted;
  const threeYearsAgo = sorted[3] ?? null;

  const revenueGrowthYoY = yoyGrowth(latest.revenue, prior.revenue);
  const epsGrowthYoY = yoyGrowth(latest.eps, prior.eps);
  const revenueCAGR3yr = threeYearsAgo
    ? cagr(latest.revenue, threeYearsAgo.revenue, 3)
    : null;

  const notes: string[] = [];
  if (!threeYearsAgo) {
    notes.push("Fewer than 4 years of history — 3-year revenue CAGR not available.");
  }

  const metrics: MetricScore[] = [
    {
      key: "revenueGrowthYoY",
      label: "Revenue growth (YoY)",
      value: revenueGrowthYoY,
      displayValue: formatPercent(revenueGrowthYoY),
      score:
        revenueGrowthYoY !== null
          ? scoreFromCurve(revenueGrowthYoY, GROWTH_CURVES.revenueGrowthYoY)
          : null,
      weight: 3,
    },
    {
      key: "epsGrowthYoY",
      label: "EPS growth (YoY)",
      value: epsGrowthYoY,
      displayValue: formatPercent(epsGrowthYoY),
      score:
        epsGrowthYoY !== null
          ? scoreFromCurve(epsGrowthYoY, GROWTH_CURVES.epsGrowthYoY)
          : null,
      weight: 3,
    },
    {
      key: "revenueCAGR3yr",
      label: "Revenue CAGR (3yr)",
      value: revenueCAGR3yr,
      displayValue: formatPercent(revenueCAGR3yr),
      score:
        revenueCAGR3yr !== null
          ? scoreFromCurve(revenueCAGR3yr, GROWTH_CURVES.revenueCAGR3yr)
          : null,
      weight: 2,
    },
  ];

  const avg = weightedAverage(metrics);
  const insufficientData = avg === null;
  if (insufficientData) notes.push("Not enough growth data to grade confidently.");

  return {
    category: "Growth",
    letter: scoreToLetter(avg ?? 0),
    score: avg ?? 0,
    metrics,
    notes,
    insufficientData,
  };
}
