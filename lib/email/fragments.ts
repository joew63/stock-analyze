// Markup fragments shared by the morning digest and the midday update, so
// the two emails render benchmarks, the sentiment gauge, and the data-gap
// list identically. Each returns an inline-styled HTML string; the caller
// wraps it in `section()`.

import type { MarketBenchmark, DigestSkip } from "@/lib/digest/types";
import {
  BODY,
  changeColor,
  DOWN,
  escapeHtml,
  fmtCurrency,
  fmtPct,
  INK,
  MUTED,
  UP,
} from "./emailTheme";

type GaugeLabel = "Bullish" | "Neutral" | "Bearish";

// Bullish/Bearish take the gain/loss colors; Neutral stays muted.
export function gaugeColor(label: GaugeLabel): string {
  if (label === "Bullish") return UP;
  if (label === "Bearish") return DOWN;
  return MUTED;
}

// Benchmark ETF rows: label, last price, % change.
export function benchmarkTable(benchmarks: MarketBenchmark[]): string {
  const rows = benchmarks
    .map(
      (b) => `
      <tr>
        <td style="padding:5px 14px 5px 0;font-size:13px;color:${MUTED};">${b.label}</td>
        <td style="padding:5px 14px 5px 0;font-size:13px;color:${INK};text-align:right;">${fmtCurrency(
          b.price
        )}</td>
        <td style="padding:5px 0;font-size:13px;font-weight:700;text-align:right;color:${changeColor(
          b.changePercent
        )};">${fmtPct(b.changePercent)}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

// The Bullish/Neutral/Bearish pill + score + one-line summary, used by both
// the daily "Market sentiment" section and the midday "Intraday pulse".
export function gaugeBadge(gauge: {
  label: GaugeLabel;
  score: number;
  summary: string;
}): string {
  const color = gaugeColor(gauge.label);
  return `
      <div style="margin-bottom:8px;">
        <span style="display:inline-block;padding:3px 11px;border-radius:999px;background:${color};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.02em;">${
          gauge.label
        }</span>
        <span style="margin-left:8px;font-size:12px;color:${MUTED};">${gauge.score.toFixed(
          0
        )}/100</span>
      </div>
      <div style="font-size:13px;color:${BODY};line-height:1.55;">${gauge.summary}</div>`;
}

// "SYM (reason) · SYM (reason)" line for symbols that couldn't be scored.
export function skippedList(skipped: DigestSkip[]): string {
  return `<div style="font-size:12px;color:${MUTED};line-height:1.6;">${skipped
    .map((s) => `${s.symbol} (${escapeHtml(s.reason)})`)
    .join(" &nbsp;·&nbsp; ")}</div>`;
}
