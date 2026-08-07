import type { GradeResult, StockGrades } from "@/lib/grading";

function topMetricFor(grade: GradeResult): string | null {
  const scored = grade.metrics.filter((m) => m.score !== null);
  if (scored.length === 0) return null;
  const best = [...scored].sort((a, b) => (b.score as number) - (a.score as number))[0];
  return `${best.label.toLowerCase()} ${best.displayValue}`;
}

function bottomMetricFor(grade: GradeResult): string | null {
  const scored = grade.metrics.filter((m) => m.score !== null);
  if (scored.length === 0) return null;
  const worst = [...scored].sort((a, b) => (a.score as number) - (b.score as number))[0];
  return `${worst.label.toLowerCase()} ${worst.displayValue}`;
}

const MAX_BUSINESS_SUMMARY_CHARS = 220;

// Trims the company profile description (already fetched for grading) down
// to roughly one sentence, cutting at a sentence boundary when there is one
// within range rather than a hard character chop.
export function summarizeBusiness(description: string | null): string | null {
  if (!description) return null;
  const trimmed = description.trim();
  if (trimmed.length <= MAX_BUSINESS_SUMMARY_CHARS) return trimmed;

  const window = trimmed.slice(0, MAX_BUSINESS_SUMMARY_CHARS);
  const sentenceEnd = window.lastIndexOf(". ");
  if (sentenceEnd > 60) return window.slice(0, sentenceEnd + 1);

  const wordEnd = window.lastIndexOf(" ");
  return `${window.slice(0, wordEnd > 0 ? wordEnd : MAX_BUSINESS_SUMMARY_CHARS)}…`;
}

// Plain-English risk framing per grade category — paired with whichever
// category scored lowest for a given symbol in buildCaution below.
const CAUTION_BY_CATEGORY: Record<string, string> = {
  Valuation:
    "shares are priced richly relative to fundamentals, leaving little room for error if growth or sentiment disappoints",
  Growth: "growth has been sluggish, a headwind if the thesis depends on re-acceleration",
  Profitability: "margins are thin, leaving less cushion against rising costs or pricing pressure",
  Momentum: "price momentum is working against the stock right now, not with it",
  "EPS & Revenue":
    "the company has a mixed recent record of meeting earnings and revenue estimates, adding execution risk",
};

// Composes a caution line purely from the grade sub-metrics already
// computed for scoring — same "no LLM, no new modeling" approach as
// buildThesis below, just framed as a counter-argument instead of a case.
export function buildCaution(grades: StockGrades): string {
  const categories: { label: string; grade: GradeResult }[] = [
    { label: "Valuation", grade: grades.valuation },
    { label: "Growth", grade: grades.growth },
    { label: "Profitability", grade: grades.profitability },
    { label: "Momentum", grade: grades.momentum },
    { label: "EPS & Revenue", grade: grades.epsRevenue },
  ];
  const usable = categories.filter((c) => !c.grade.insufficientData);
  if (usable.length === 0) {
    return "Fundamentals data was too thin here to pin down a specific risk — weigh the technical setup with extra caution.";
  }

  const weakest = [...usable].sort((a, b) => a.grade.score - b.grade.score)[0];
  const worstMetric = bottomMetricFor(weakest.grade);
  const reason = CAUTION_BY_CATEGORY[weakest.label] ?? `${weakest.label.toLowerCase()} is the weakest part of the picture`;

  return `${weakest.label} is the weakest part of the case (${weakest.grade.score.toFixed(0)}/100${
    worstMetric ? `: ${worstMetric}` : ""
  }) — ${reason}.`;
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
