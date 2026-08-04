// Normalized shapes used throughout the app. UI and grading/projection code
// never touch raw Finnhub/FMP response shapes directly — only these.

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string | null;
  industry: string | null;
  sector: string | null;
  marketCap: number | null;
  sharesOutstanding: number | null;
  logo: string | null;
  website: string | null;
  description: string | null;
  currency: string | null;
  beta: number | null;
}

export interface FundamentalRatios {
  peRatioTTM: number | null;
  pegRatioTTM: number | null;
  priceToSalesRatioTTM: number | null;
  priceToFreeCashFlowRatioTTM: number | null;
  evToEbitdaTTM: number | null;
  grossProfitMarginTTM: number | null;
  operatingProfitMarginTTM: number | null;
  netProfitMarginTTM: number | null;
  returnOnEquityTTM: number | null;
  returnOnAssetsTTM: number | null;
  dividendYieldTTM: number | null;
}

export interface IncomeStatementPoint {
  date: string;
  period: string;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
}

export interface HistoricalPricePoint {
  date: string;
  close: number;
}

export interface RecommendationTrendPoint {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface NewsItem {
  id: number | string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  datetime: number;
}

export interface EarningsSurprise {
  period: string;
  actualEps: number | null;
  estimateEps: number | null;
  surprisePercent: number | null;
}

export interface StockDataBundle {
  symbol: string;
  quote: Quote | null;
  profile: CompanyProfile | null;
  ratios: FundamentalRatios | null;
  incomeHistory: IncomeStatementPoint[] | null;
  priceHistory: HistoricalPricePoint[] | null;
  recommendationTrend: RecommendationTrendPoint[] | null;
  news: NewsItem[] | null;
  earningsSurprises: EarningsSurprise[] | null;
  errors: string[];
}
