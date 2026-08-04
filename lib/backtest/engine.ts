import type { HistoricalPricePoint } from "@/lib/providers/types";
import { computeRSI } from "./indicators";
import type { BacktestParams, BacktestResult, EquityPoint, Trade } from "./types";

export const DEFAULT_BACKTEST_PARAMS: BacktestParams = {
  initialCapital: 50000,
  rsiPeriod: 14,
  buyThreshold: 30,
  sellThreshold: 70,
};

function emptyResult(params: BacktestParams): BacktestResult {
  return {
    params,
    summary: {
      initialCapital: params.initialCapital,
      finalEquity: params.initialCapital,
      totalReturnPercent: 0,
      buyHoldFinalEquity: params.initialCapital,
      buyHoldReturnPercent: 0,
      cagrPercent: null,
      maxDrawdownPercent: 0,
      numberOfTrades: 0,
      winRate: null,
      openPosition: false,
      startDate: "",
      endDate: "",
    },
    trades: [],
    equityCurve: [],
    insufficientData: true,
  };
}

// Single-position RSI mean-reversion strategy: go all-in when RSI drops into
// oversold territory (buy low), go all-cash when RSI rises into overbought
// territory (sell high). Benchmarked against a buy-and-hold of the same
// initial capital over the same window. No fees, slippage, or taxes modeled.
export function runBacktest(
  priceHistory: HistoricalPricePoint[] | null,
  params: BacktestParams = DEFAULT_BACKTEST_PARAMS
): BacktestResult {
  if (!priceHistory || priceHistory.length < params.rsiPeriod + 2) {
    return emptyResult(params);
  }

  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closes = sorted.map((p) => p.close);
  const rsi = computeRSI(closes, params.rsiPeriod);

  let cash = params.initialCapital;
  let shares = 0;
  let entryPrice = 0;
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  const buyHoldShares = Math.floor(params.initialCapital / closes[0]);
  const buyHoldCashLeftover = params.initialCapital - buyHoldShares * closes[0];

  let peakEquity = params.initialCapital;
  let maxDrawdownPercent = 0;

  for (let i = 0; i < sorted.length; i++) {
    const close = closes[i];
    const r = rsi[i];

    if (r !== null) {
      if (shares === 0 && r <= params.buyThreshold && cash > 0) {
        const sharesToBuy = Math.floor(cash / close);
        if (sharesToBuy > 0) {
          cash -= sharesToBuy * close;
          shares = sharesToBuy;
          entryPrice = close;
          trades.push({
            type: "buy",
            date: sorted[i].date,
            price: close,
            shares: sharesToBuy,
            cashAfter: cash,
            pnl: null,
            pnlPercent: null,
          });
        }
      } else if (shares > 0 && r >= params.sellThreshold) {
        const proceeds = shares * close;
        const cost = shares * entryPrice;
        const pnl = proceeds - cost;
        cash += proceeds;
        trades.push({
          type: "sell",
          date: sorted[i].date,
          price: close,
          shares,
          cashAfter: cash,
          pnl,
          pnlPercent: (pnl / cost) * 100,
        });
        shares = 0;
        entryPrice = 0;
      }
    }

    const strategyEquity = cash + shares * close;
    const buyHoldEquity = buyHoldCashLeftover + buyHoldShares * close;

    peakEquity = Math.max(peakEquity, strategyEquity);
    const drawdown =
      peakEquity > 0 ? ((peakEquity - strategyEquity) / peakEquity) * 100 : 0;
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdown);

    equityCurve.push({
      date: sorted[i].date,
      strategyEquity,
      buyHoldEquity,
      close,
      rsi: r,
    });
  }

  const finalClose = closes[closes.length - 1];
  const finalEquity = cash + shares * finalClose;
  const buyHoldFinalEquity = buyHoldCashLeftover + buyHoldShares * finalClose;

  const totalReturnPercent =
    ((finalEquity - params.initialCapital) / params.initialCapital) * 100;
  const buyHoldReturnPercent =
    ((buyHoldFinalEquity - params.initialCapital) / params.initialCapital) * 100;

  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;
  const daysElapsed =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
    (1000 * 60 * 60 * 24);
  const years = daysElapsed / 365.25;
  const cagrPercent =
    years > 0 && finalEquity > 0
      ? (Math.pow(finalEquity / params.initialCapital, 1 / years) - 1) * 100
      : null;

  const completedTrades = trades.filter((t) => t.type === "sell");
  const winners = completedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const winRate =
    completedTrades.length > 0
      ? (winners.length / completedTrades.length) * 100
      : null;

  return {
    params,
    summary: {
      initialCapital: params.initialCapital,
      finalEquity,
      totalReturnPercent,
      buyHoldFinalEquity,
      buyHoldReturnPercent,
      cagrPercent,
      maxDrawdownPercent,
      numberOfTrades: completedTrades.length,
      winRate,
      openPosition: shares > 0,
      startDate,
      endDate,
    },
    trades,
    equityCurve,
    insufficientData: false,
  };
}
