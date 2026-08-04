import * as finnhub from "@/lib/providers/finnhub";
import * as fmp from "@/lib/providers/fmp";
import { gradeStock, type StockGrades } from "@/lib/grading";
import { computeProjection, type PriceProjection } from "@/lib/projections/trend";
import type { StockDataBundle } from "@/lib/providers/types";

export interface StockData {
  bundle: StockDataBundle;
  grades: StockGrades;
  projection: PriceProjection;
}

async function settle<T>(
  promise: Promise<T>,
  label: string,
  errors: string[]
): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export class SymbolNotFoundError extends Error {}

export async function getStockData(rawSymbol: string): Promise<StockData> {
  const symbol = rawSymbol.trim().toUpperCase();
  const errors: string[] = [];

  const [
    quote,
    profile,
    ratios,
    incomeHistory,
    priceHistory,
    recommendationTrend,
    news,
    earningsSurprises,
  ] = await Promise.all([
    settle(finnhub.getQuote(symbol), "quote", errors),
    settle(fmp.getCompanyProfile(symbol), "profile", errors),
    settle(fmp.getFundamentalRatios(symbol), "ratios", errors),
    settle(fmp.getIncomeStatementHistory(symbol), "incomeHistory", errors),
    settle(fmp.getHistoricalPrices(symbol), "priceHistory", errors),
    settle(finnhub.getRecommendationTrend(symbol), "recommendationTrend", errors),
    settle(finnhub.getCompanyNews(symbol), "news", errors),
    settle(finnhub.getEarningsSurprises(symbol), "earningsSurprises", errors),
  ]);

  if (!quote && !profile) {
    throw new SymbolNotFoundError(
      `Could not find data for symbol "${symbol}". Check the ticker and try again.`
    );
  }

  const bundle: StockDataBundle = {
    symbol,
    quote,
    profile,
    ratios,
    incomeHistory,
    priceHistory,
    recommendationTrend,
    news,
    earningsSurprises,
    errors,
  };

  const grades = gradeStock(bundle);
  const projection = computeProjection(priceHistory);

  return { bundle, grades, projection };
}
