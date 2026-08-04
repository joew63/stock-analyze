import type { GradeResult, StockGrades } from "@/lib/grading";

function topMetricFor(grade: GradeResult): string | null {
  const scored = grade.metrics.filter((m) => m.score !== null);
  if (scored.length === 0) return null;
  const best = [...scored].sort((a, b) => (b.score as number) - (a.score as number))[0];
  return `${best.label.toLowerCase()} ${best.displayValue}`;
}

// Composes a plain-English thesis purely from numbers already computed
// elsewhere in the app (grade sub-metrics, RSI, 52-week range) — no LLM
// call, no new modeling.
export function buildThesis(params: {
  symbol: string;
  price: number;
  rsi: number;
  rsiPeriod: number;
  range: { low: number; high: number } | null;
  grades: StockGrades;
}): string {
  const { symbol, price, rsi, rsiPeriod, range, grades } = params;
  const parts: string[] = [];

  if (range && range.high > 0) {
    const pctFromHigh = ((range.high - price) / range.high) * 100;
    parts.push(
      `${symbol} is trading at $${price.toFixed(2)}, ${pctFromHigh.toFixed(0)}% below its 52-week high of $${range.high.toFixed(2)}`
    );
  } else {
    parts.push(`${symbol} is trading at $${price.toFixed(2)}`);
  }

  parts.push(`with RSI(${rsiPeriod}) at ${rsi.toFixed(0)}, signaling oversold conditions`);

  const categories: { label: string; grade: GradeResult }[] = [
    { label: "Profitability", grade: grades.profitability },
    { label: "Growth", grade: grades.growth },
    { label: "Valuation", grade: grades.valuation },
    { label: "Momentum", grade: grades.momentum },
    { label: "EPS & Revenue", grade: grades.epsRevenue },
  ];
  const usable = categories.filter((c) => !c.grade.insufficientData);
  const strongest = [...usable].sort((a, b) => b.grade.score - a.grade.score)[0];
  const weakest = [...usable].sort((a, b) => a.grade.score - b.grade.score)[0];

  if (strongest) {
    const topMetric = topMetricFor(strongest.grade);
    parts.push(
      `${strongest.label.toLowerCase()} is a strength (${strongest.grade.score.toFixed(0)}/100${
        topMetric ? `: ${topMetric}` : ""
      })`
    );
  }
  if (weakest && weakest.label !== strongest?.label) {
    parts.push(`while ${weakest.label.toLowerCase()} lags (${weakest.grade.score.toFixed(0)}/100)`);
  }

  return `${parts.join(", ")} — a buy-the-dip setup on fundamentals that haven't broken.`;
}
