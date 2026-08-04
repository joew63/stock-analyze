export interface BacktestParams {
  initialCapital: number;
  rsiPeriod: number;
  buyThreshold: number; // RSI at/below this = oversold -> buy
  sellThreshold: number; // RSI at/above this = overbought -> sell
}

export interface Trade {
  type: "buy" | "sell";
  date: string;
  price: number;
  shares: number;
  cashAfter: number;
  pnl: number | null; // realized P&L, sell trades only
  pnlPercent: number | null;
}

export interface EquityPoint {
  date: string;
  strategyEquity: number;
  buyHoldEquity: number;
  close: number;
  rsi: number | null;
}

export interface BacktestSummary {
  initialCapital: number;
  finalEquity: number;
  totalReturnPercent: number;
  buyHoldFinalEquity: number;
  buyHoldReturnPercent: number;
  cagrPercent: number | null;
  maxDrawdownPercent: number;
  numberOfTrades: number; // completed round trips
  winRate: number | null; // % of round trips with positive pnl
  openPosition: boolean;
  startDate: string;
  endDate: string;
}

export interface BacktestResult {
  params: BacktestParams;
  summary: BacktestSummary;
  trades: Trade[];
  equityCurve: EquityPoint[];
  insufficientData: boolean;
}
