import { EPS_REVENUE_CURVES } from "./thresholds";
import { scoreFromCurve } from "./interpolate";
import { scoreToLetter } from "./letter";
import { weightedAverage, type GradeResult, type MetricScore } from "./types";
import { formatPercent } from "./format";
import type { EarningsSurprise } from "@/lib/providers/types";

export function gradeEpsRevenue(
  earnings: EarningsSurprise[] | null
): GradeResult {
  if (!earnings || earnings.length === 0) {
    return {
      category: "EPS & Revenue",
      letter: "F",
      score: 0,
      metrics: [],
      notes: ["No earnings-surprise history available."],
      insufficientData: true,
    };
  }

  const recent = earnings
    .slice(0, 8)
    .filter((e) => e.actualEps !== null && e.estimateEps !== null);

  if (recent.length === 0) {
    return {
      category: "EPS & Revenue",
      letter: "F",
      score: 0,
      metrics: [],
      notes: ["Earnings data present but missing actual/estimate figures."],
      insufficientData: true,
    };
  }

  const beats = recent.filter(
    (e) => (e.actualEps as number) >= (e.estimateEps as number)
  ).length;
  const beatRate = beats / recent.length;

  // Finnhub reports surprisePercent as a percent (e.g. 5.2 = 5.2%), so
  // convert to fraction form to match the curve config's units.
  const surprisesPercent = recent
    .map((e) => e.surprisePercent)
    .filter((s): s is number => s !== null);
  const avgSurprisePercent = surprisesPercent.length
    ? surprisesPercent.reduce((a, b) => a + b, 0) / surprisesPercent.length
    : null;
  const avgSurpriseFraction =
    avgSurprisePercent !== null ? avgSurprisePercent / 100 : null;

  let consistency: number | null = null;
  if (surprisesPercent.length >= 2 && avgSurprisePercent !== null) {
    const variance =
      surprisesPercent.reduce((s, v) => s + (v - avgSurprisePercent) ** 2, 0) /
      surprisesPercent.length;
    const stdev = Math.sqrt(variance);
    const denom = Math.max(Math.abs(avgSurprisePercent), 2);
    const cv = stdev / denom;
    consistency = 1 / (1 + cv);
  }

  const notes: string[] = [];
  if (recent.length < 4) {
    notes.push("Fewer than 4 quarters of earnings history — beat rate may be noisy.");
  }

  const metrics: MetricScore[] = [
    {
      key: "beatRate",
      label: `Beat rate (last ${recent.length}Q)`,
      value: beatRate,
      displayValue: formatPercent(beatRate),
      score: scoreFromCurve(beatRate, EPS_REVENUE_CURVES.beatRate),
      weight: 3,
    },
    {
      key: "avgSurprisePercent",
      label: "Avg. earnings surprise",
      value: avgSurpriseFraction,
      displayValue: formatPercent(avgSurpriseFraction),
      score:
        avgSurpriseFraction !== null
          ? scoreFromCurve(avgSurpriseFraction, EPS_REVENUE_CURVES.avgSurprisePercent)
          : null,
      weight: 3,
    },
    {
      key: "consistency",
      label: "Execution consistency",
      value: consistency,
      displayValue: consistency !== null ? `${(consistency * 100).toFixed(0)}/100` : "N/A",
      score:
        consistency !== null
          ? scoreFromCurve(consistency, EPS_REVENUE_CURVES.consistency)
          : null,
      weight: 2,
    },
  ];

  const avg = weightedAverage(metrics);
  const insufficientData = avg === null;

  return {
    category: "EPS & Revenue",
    letter: scoreToLetter(avg ?? 0),
    score: avg ?? 0,
    metrics,
    notes,
    insufficientData,
  };
}
