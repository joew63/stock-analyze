import * as finnhub from "@/lib/providers/finnhub";
import { DEFAULT_WATCHLIST } from "./watchlist";
import type { UpcomingEvent } from "./types";

// How far ahead to look for calendar events. Two weeks catches "reports
// next week" without burying the alert under a month of noise.
const LOOKAHEAD_DAYS = 14;

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function whenLabel(hour: string): string {
  switch (hour.toLowerCase()) {
    case "bmo":
      return "before open";
    case "amc":
      return "after close";
    case "dmh":
      return "during hours";
    default:
      return "";
  }
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function buildEventNote(
  symbol: string,
  date: string,
  daysUntil: number,
  when: string,
  epsEstimate: number | null
): string {
  const timing =
    daysUntil <= 0
      ? "today"
      : daysUntil === 1
        ? "tomorrow"
        : `in ${daysUntil} days (${date})`;
  const whenClause = when ? ` ${when}` : "";
  const epsClause =
    typeof epsEstimate === "number" && Number.isFinite(epsEstimate)
      ? ` Street is looking for $${epsEstimate.toFixed(2)} EPS.`
      : "";
  return `${symbol} reports earnings ${timing}${whenClause}.${epsClause}`;
}

// Pulls the forward earnings calendar (one Finnhub call) and keeps only the
// watchlist names reporting within LOOKAHEAD_DAYS. Deterministic: sorted by
// date, then symbol. `names` maps ticker -> company name (from the scan's
// profile fetches); missing entries just fall back to the ticker.
export async function fetchUpcomingEvents(
  watchlist: string[] = DEFAULT_WATCHLIST,
  names: Record<string, string> = {}
): Promise<UpcomingEvent[]> {
  const now = new Date();
  const todayISO = fmtDate(now);
  const toISO = fmtDate(new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000));

  let calendar: Awaited<ReturnType<typeof finnhub.getEarningsCalendar>>;
  try {
    calendar = await finnhub.getEarningsCalendar(todayISO, toISO);
  } catch {
    // Calendar is a nice-to-have — a provider hiccup shouldn't sink the digest.
    return [];
  }

  const watch = new Set(watchlist.map((s) => s.trim().toUpperCase()));
  const seen = new Set<string>();
  const events: UpcomingEvent[] = [];

  for (const item of calendar) {
    const symbol = item.symbol?.trim().toUpperCase();
    if (!symbol || !watch.has(symbol) || seen.has(symbol)) continue;
    if (!item.date || item.date < todayISO) continue;
    seen.add(symbol);

    const daysUntil = Math.max(0, daysBetween(todayISO, item.date));
    const when = whenLabel(item.hour);
    events.push({
      symbol,
      name: names[symbol] ?? symbol,
      type: "earnings",
      date: item.date,
      daysUntil,
      when,
      epsEstimate: item.epsEstimate,
      revenueEstimate: item.revenueEstimate,
      note: buildEventNote(symbol, item.date, daysUntil, when, item.epsEstimate),
    });
  }

  return events.sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.symbol.localeCompare(b.symbol)
  );
}
