export interface DigestCandidate {
  symbol: string;
  name: string;
  price: number;
  rsi: number;
  score: number;
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

export interface DigestResult {
  scannedAt: string;
  watchlistSize: number;
  candidates: DigestCandidate[];
  skipped: DigestSkip[];
}
