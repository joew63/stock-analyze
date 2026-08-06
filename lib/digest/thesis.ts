import type { GradeResult, StockGrades } from "@/lib/grading";

function topMetricFor(grade: GradeResult): string | null {
  const scored = grade.metrics.filter((m) => m.score !== null);
  if (scored.length === 0) return null;
  const best = [...scored].sort((a, b) => (b.score as number) - (a.score as number))[0];
  return `${best.label.toLowerCase()} ${best.displayValue}`;
}

// RSI band -> plain-English momentum description + closing framing. Every
// scanned symbol gets a thesis now (not just oversold ones), so the wording
// has to track the actual RSI value instead of assuming "oversold".
function rsiDescription(rsi: number): { phrase: string; framing: string } {
  if (rsi <= 30) {
    return {
      phrase: `RSI(14) at ${rsi.toFixed(0)}, deeply oversold`,
      framing: "a buy-the-dip setup on fundamentals that haven't broken",
    };
  }
  if (rsi <= 45) {
    return {
      phrase: `RSI(14) at ${rsi.toFixed(0)}, oversold`,
      framing: "a mild pullback worth watching if fundamentals hold up",
    };
  }
  if (rsi < 55) {
    return {
      phrase: `RSI(14) at ${rsi.toFixed(0)}, neutral momentum`,
      framing: "no strong technical signal either way right now",
    };
  }
  if (rsi < 70) {
    return {
      phrase: `RSI(14) at ${rsi.toFixed(0)}, firm momentum`,
      framing: "trending well but not yet stretched",
    };
  }
  return {
    phrase: `RSI(14) at ${rsi.toFixed(0)}, overbought`,
    framing: "extended enough that chasing here carries more risk",
  };
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
  const { symbol, price, rsi, range, grades } = params;
  const parts: string[] = [];

  if (range && range.high > 0) {
    const pctFromHigh = ((range.high - price) / range.high) * 100;
    parts.push(
      `${symbol} is trading at $${price.toFixed(2)}, ${pctFromHigh.toFixed(0)}% below its 52-week high of $${range.high.toFixed(2)}`
    );
  } else {
    parts.push(`${symbol} is trading at $${price.toFixed(2)}`);
  }

  const { phrase, framing } = rsiDescription(rsi);
  parts.push(`with ${phrase}`);

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

  return `${parts.join(", ")} — ${framing}.`;
}
