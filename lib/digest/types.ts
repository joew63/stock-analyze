export interface DigestRow {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  rsi: number;
  oversold: boolean;
  overbought: boolean;
  score: number;
  allFactorsStrong: boolean;
  grades: {
    valuation: number;
    growth: number;
    profitability: number;
    momentum: number;
    epsRevenue: number;
  };
  thesis: string;
  targetPrice: number;
  stopLoss: number;
  horizonDays: number;
}

export interface DigestSkip {
  symbol: string;
  reason: string;
}

export interface MarketBenchmark {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
}

export interface MarketBriefing {
  benchmarks: MarketBenchmark[];
  summary: string;
}

export interface MarketSentiment {
  label: "Bullish" | "Neutral" | "Bearish";
  score: number;
  breadthPct: number;
  avgRsi: number;
  oversoldCount: number;
  overboughtCount: number;
  summary: string;
}

export interface DigestResult {
  scannedAt: string;
  watchlistSize: number;
  marketBriefing: MarketBriefing;
  marketSentiment: MarketSentiment;
  standouts: DigestRow[];
  rows: DigestRow[];
  skipped: DigestSkip[];
}
