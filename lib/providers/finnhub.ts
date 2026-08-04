import { cached, TTL } from "@/lib/cache";
import type {
  EarningsSurprise,
  NewsItem,
  Quote,
  RecommendationTrendPoint,
} from "./types";

const BASE_URL = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY is not set");
  return key;
}

async function finnhubGet<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("token", apiKey());
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface RawQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export async function getQuote(symbol: string): Promise<Quote> {
  return cached(`finnhub:quote:${symbol}`, TTL.QUOTE, async () => {
    const raw = await finnhubGet<RawQuote>("/quote", { symbol });
    if (raw.c === 0 && raw.pc === 0) {
      throw new Error(`No quote data for symbol "${symbol}"`);
    }
    return {
      price: raw.c,
      change: raw.d,
      changePercent: raw.dp,
      dayHigh: raw.h,
      dayLow: raw.l,
      open: raw.o,
      previousClose: raw.pc,
      timestamp: raw.t,
    };
  });
}

interface RawRecommendation {
  symbol: string;
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export async function getRecommendationTrend(
  symbol: string
): Promise<RecommendationTrendPoint[]> {
  return cached(`finnhub:recommendation:${symbol}`, TTL.RECOMMENDATION, async () => {
    const raw = await finnhubGet<RawRecommendation[]>("/stock/recommendation", {
      symbol,
    });
    return raw
      .map((r) => ({
        period: r.period,
        strongBuy: r.strongBuy,
        buy: r.buy,
        hold: r.hold,
        sell: r.sell,
        strongSell: r.strongSell,
      }))
      .sort((a, b) => (a.period < b.period ? 1 : -1));
  });
}

interface RawNews {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
}

export async function getCompanyNews(
  symbol: string,
  days = 14
): Promise<NewsItem[]> {
  return cached(`finnhub:news:${symbol}`, TTL.NEWS, async () => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const raw = await finnhubGet<RawNews[]>("/company-news", {
      symbol,
      from: fmt(from),
      to: fmt(to),
    });
    return raw
      .filter((n) => n.headline && n.url)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 20)
      .map((n) => ({
        id: n.id,
        headline: n.headline,
        summary: n.summary,
        source: n.source,
        url: n.url,
        image: n.image || null,
        datetime: n.datetime,
      }));
  });
}

interface RawEarnings {
  actual: number | null;
  estimate: number | null;
  period: string;
  surprisePercent: number | null;
}

export async function getEarningsSurprises(
  symbol: string
): Promise<EarningsSurprise[]> {
  return cached(`finnhub:earnings:${symbol}`, TTL.EARNINGS, async () => {
    const raw = await finnhubGet<RawEarnings[]>("/stock/earnings", { symbol });
    return raw
      .map((e) => ({
        period: e.period,
        actualEps: e.actual,
        estimateEps: e.estimate,
        surprisePercent: e.surprisePercent,
      }))
      .sort((a, b) => (a.period < b.period ? 1 : -1));
  });
}
