import { gradeValuation } from "./valuation";
import { gradeGrowth } from "./growth";
import { gradeProfitability } from "./profitability";
import { gradeMomentum } from "./momentum";
import { gradeEpsRevenue } from "./epsRevenue";
import type { GradeResult } from "./types";
import type { StockDataBundle } from "@/lib/providers/types";

export interface StockGrades {
  valuation: GradeResult;
  growth: GradeResult;
  profitability: GradeResult;
  momentum: GradeResult;
  epsRevenue: GradeResult;
}

export function gradeStock(bundle: StockDataBundle): StockGrades {
  return {
    valuation: gradeValuation(bundle.ratios),
    growth: gradeGrowth(bundle.incomeHistory),
    profitability: gradeProfitability(bundle.ratios),
    momentum: gradeMomentum(bundle.priceHistory),
    epsRevenue: gradeEpsRevenue(bundle.earningsSurprises),
  };
}

export type { GradeResult, MetricScore } from "./types";
