import * as finnhub from "@/lib/providers/finnhub";
import type { NewsItem } from "@/lib/providers/types";
import type { NewsHighlight } from "./types";

const MAX_HIGHLIGHTS = 6;
const MAX_STANDOUT_FEEDS = 7;
const FRESH_WINDOW_SEC = 48 * 3600;
const MAX_PER_SOURCE = 3;
const SUMMARY_MAX_CHARS = 240;

// Headlines that tend to actually move a stock or matter to a holder, vs.
// routine "here's the closing price" filler. Matched case-insensitively as
// substrings against headline + summary. Not exhaustive — just enough of a
// signal to float the interesting stuff to the top of a recency sort.
const INTERESTING_KEYWORDS = [
  "upgrade",
  "downgrade",
  "guidance",
  "forecast",
  "beats",
  "beat",
  "misses",
  "miss",
  "lawsuit",
  "sues",
  "settlement",
  "acquire",
  "acquisition",
  "merger",
  "buyout",
  "takeover",
  "stake",
  "activist",
  "buyback",
  "repurchase",
  "dividend",
  "split",
  "layoff",
  "job cuts",
  "restructur",
  "ceo",
  "cfo",
  "resign",
  "steps down",
  "recall",
  "investigation",
  "probe",
  "sec ",
  "antitrust",
  "fda",
  "approval",
  "patent",
  "breakthrough",
  "launch",
  "unveil",
  "partnership",
  "deal",
  "contract",
  "record",
  "surge",
  "plunge",
  "warns",
  "warning",
  "cuts",
  "raises",
  "tariff",
  "chip",
  "ai ",
];

function truncate(text: string, max: number): string {
  const t = (text ?? "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : max)}…`;
}

function scoreArticle(item: NewsItem, nowSec: number): number {
  let score = 0;

  const ageSec = nowSec - item.datetime;
  if (ageSec <= FRESH_WINDOW_SEC) {
    score += 40 * (1 - Math.max(0, ageSec) / FRESH_WINDOW_SEC);
  } else {
    // Older than the fresh window: fade out over the next few days.
    score += Math.max(0, 15 - (ageSec - FRESH_WINDOW_SEC) / (24 * 3600) * 5);
  }

  const hay = `${item.headline} ${item.summary}`.toLowerCase();
  let keywordHits = 0;
  for (const kw of INTERESTING_KEYWORDS) {
    if (hay.includes(kw)) keywordHits += 1;
  }
  score += Math.min(keywordHits, 3) * 12;

  if (item.summary && item.summary.trim().length >= 80) score += 5;

  return score;
}

// Builds the "interesting reads" list: general market news plus recent
// company news for the standouts, ranked by a deterministic recency +
// keyword score, deduped by headline, and capped per source so one wire
// service can't take over the section. Best-effort — any feed that fails
// is just skipped.
export async function fetchNewsHighlights(
  standoutSymbols: string[],
  limit: number = MAX_HIGHLIGHTS
): Promise<NewsHighlight[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const collected: { item: NewsItem; category: string }[] = [];

  try {
    const market = await finnhub.getMarketNews("general");
    for (const item of market) collected.push({ item, category: "Market" });
  } catch {
    // fall through with whatever else we can get
  }

  const symbols = standoutSymbols.slice(0, MAX_STANDOUT_FEEDS);
  const feeds = await Promise.allSettled(
    symbols.map((s) => finnhub.getCompanyNews(s))
  );
  feeds.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    for (const item of res.value.slice(0, 6)) {
      collected.push({ item, category: symbols[i] });
    }
  });

  const ranked = collected
    .map((c) => ({ ...c, score: scoreArticle(c.item, nowSec) }))
    .sort((a, b) => b.score - a.score);

  const seenHeadlines = new Set<string>();
  const perSource = new Map<string, number>();
  const highlights: NewsHighlight[] = [];

  const take = (
    item: NewsItem,
    category: string,
    perSourceCap: number
  ): boolean => {
    const key = item.headline.trim().toLowerCase().replace(/\s+/g, " ");
    if (seenHeadlines.has(key)) return false;

    const source = item.source || "Unknown";
    const used = perSource.get(source) ?? 0;
    if (used >= perSourceCap) return false;

    seenHeadlines.add(key);
    perSource.set(source, used + 1);
    highlights.push({
      headline: item.headline.trim(),
      source,
      url: item.url,
      datetime: item.datetime,
      summary: truncate(item.summary, SUMMARY_MAX_CHARS),
      category,
    });
    return true;
  };

  // First pass: only articles that clear the keyword/recency bar, capped
  // per source so one wire service can't take over the section.
  for (const { item, category, score } of ranked) {
    if (score <= 0) continue;
    take(item, category, MAX_PER_SOURCE);
    if (highlights.length >= limit) break;
  }

  // Top-up pass: if the bar left us short of a full section, backfill with
  // the next-freshest headlines (score gate dropped, per-source cap loosened)
  // so the list reliably lands at `limit` when the volume exists.
  if (highlights.length < limit) {
    for (const { item, category } of ranked) {
      take(item, category, MAX_PER_SOURCE + 2);
      if (highlights.length >= limit) break;
    }
  }

  return highlights;
}
