import type { ScoreCurve } from "./interpolate";

// All grading bands live here so they're auditable and easy to retune.
// Bands are absolute (not sector-relative) — free-tier data doesn't
// reliably expose sector peer sets, so a stock is graded against fixed,
// reasonable multiples/margins rather than against its industry median.
// Fractions are used for rates (0.1 = 10%), multiples for ratios (12 = 12x).

export const VALUATION_CURVES = {
  // P/E: lower is cheaper.
  peRatio: [
    [8, 100], [12, 92], [18, 78], [24, 62], [32, 45], [45, 25], [70, 5],
  ] as ScoreCurve,
  // PEG < 1 means price is justified by growth; > 3 is expensive relative to growth.
  pegRatio: [
    [0.5, 100], [1, 88], [1.5, 70], [2, 52], [3, 30], [5, 10],
  ] as ScoreCurve,
  priceToSales: [
    [1, 95], [2.5, 80], [5, 60], [8, 42], [12, 25], [20, 8],
  ] as ScoreCurve,
  priceToFreeCashFlow: [
    [10, 95], [18, 80], [25, 62], [35, 42], [50, 22], [80, 5],
  ] as ScoreCurve,
  evToEbitda: [
    [6, 95], [10, 82], [15, 65], [20, 48], [28, 28], [40, 8],
  ] as ScoreCurve,
};

export const GROWTH_CURVES = {
  revenueGrowthYoY: [
    [-0.15, 5], [0, 30], [0.05, 50], [0.1, 65], [0.2, 82], [0.35, 95], [0.6, 100],
  ] as ScoreCurve,
  epsGrowthYoY: [
    [-0.25, 5], [0, 28], [0.05, 48], [0.15, 68], [0.3, 85], [0.5, 96], [0.8, 100],
  ] as ScoreCurve,
  revenueCAGR3yr: [
    [-0.05, 10], [0, 35], [0.05, 55], [0.1, 70], [0.2, 85], [0.35, 97],
  ] as ScoreCurve,
};

export const PROFITABILITY_CURVES = {
  grossMargin: [
    [0.1, 15], [0.25, 40], [0.4, 60], [0.55, 78], [0.7, 92], [0.85, 100],
  ] as ScoreCurve,
  operatingMargin: [
    [-0.05, 5], [0, 25], [0.08, 45], [0.15, 65], [0.25, 85], [0.35, 97],
  ] as ScoreCurve,
  netMargin: [
    [-0.05, 5], [0, 22], [0.05, 42], [0.1, 60], [0.2, 82], [0.3, 97],
  ] as ScoreCurve,
  returnOnEquity: [
    [-0.05, 5], [0, 25], [0.08, 45], [0.15, 65], [0.22, 85], [0.35, 97],
  ] as ScoreCurve,
  returnOnAssets: [
    [-0.02, 5], [0, 25], [0.03, 45], [0.07, 65], [0.12, 85], [0.2, 97],
  ] as ScoreCurve,
};

export const MOMENTUM_CURVES = {
  return1m: [[-0.15, 5], [-0.05, 30], [0, 55], [0.05, 72], [0.12, 88], [0.25, 100]] as ScoreCurve,
  return3m: [[-0.25, 5], [-0.1, 30], [0, 55], [0.1, 72], [0.22, 88], [0.4, 100]] as ScoreCurve,
  return6m: [[-0.3, 5], [-0.15, 30], [0, 55], [0.15, 72], [0.3, 88], [0.5, 100]] as ScoreCurve,
  return12m: [[-0.4, 5], [-0.2, 30], [0, 55], [0.2, 72], [0.4, 88], [0.7, 100]] as ScoreCurve,
  // price / moving-average ratio: 1.0 = trading exactly at the average.
  priceVs50dma: [[0.85, 10], [0.95, 40], [1, 60], [1.05, 78], [1.15, 92], [1.3, 100]] as ScoreCurve,
  priceVs200dma: [[0.75, 10], [0.9, 35], [1, 60], [1.1, 80], [1.25, 95]] as ScoreCurve,
};

export const EPS_REVENUE_CURVES = {
  // fraction of last N quarters where actual EPS >= estimate.
  beatRate: [[0, 10], [0.25, 35], [0.5, 58], [0.75, 80], [1, 98]] as ScoreCurve,
  avgSurprisePercent: [
    [-0.2, 5], [-0.05, 30], [0, 55], [0.03, 72], [0.08, 90], [0.15, 100],
  ] as ScoreCurve,
  // 1 = perfectly consistent surprises, decays toward 0 as variance grows.
  consistency: [[0, 20], [0.3, 45], [0.5, 65], [0.7, 82], [0.9, 97]] as ScoreCurve,
};
