import type { MiddayPulse, MiddayQuote, MiddayResult } from "@/lib/digest/types";
import {
  BODY,
  fmtCurrency,
  fmtPct,
  INK,
  MUTED,
  UP,
  DOWN,
  changeColor,
  escapeHtml,
  footnote,
  h1,
  page,
  section,
} from "./emailTheme";

function pulseColor(label: MiddayPulse["label"]): string {
  if (label === "Bullish") return UP;
  if (label === "Bearish") return DOWN;
  return MUTED;
}

export interface RenderedMiddayEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderMiddayEmail(result: MiddayResult): RenderedMiddayEmail {
  const subject = `☀️ afternoon - ${result.pulse.label} sentiment`;

  return {
    subject,
    html: renderHtml(result),
    text: renderText(result),
  };
}

function moverTable(quotes: MiddayQuote[]): string {
  if (quotes.length === 0) {
    return `<div style="font-size:13px;color:${MUTED};">None.</div>`;
  }
  const rows = quotes
    .map(
      (q) => `
      <tr>
        <td style="padding:4px 14px 4px 0;font-size:13px;color:${INK};font-weight:700;">${q.symbol}</td>
        <td style="padding:4px 14px 4px 0;font-size:13px;color:${INK};text-align:right;">${fmtCurrency(
          q.price
        )}</td>
        <td style="padding:4px 0;font-size:13px;font-weight:700;text-align:right;color:${changeColor(
          q.changePercent
        )};">${fmtPct(q.changePercent)}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

function renderHtml(result: MiddayResult): string {
  const benchRows = result.marketBriefing.benchmarks
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

  const pulse = result.pulse;
  const pColor = pulseColor(pulse.label);

  const parts = [
    h1("☀️ afternoon"),
    section({
      theme: "briefing",
      label: "Benchmarks",
      body: `
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${benchRows}</table>
        <div style="margin-top:10px;font-size:13px;color:${BODY};line-height:1.55;">${result.marketBriefing.summary}</div>`,
    }),
    section({
      theme: "sentiment",
      label: "Intraday pulse",
      body: `
        <div style="margin-bottom:8px;">
          <span style="display:inline-block;padding:3px 11px;border-radius:999px;background:${pColor};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.02em;">${
            pulse.label
          }</span>
          <span style="margin-left:8px;font-size:12px;color:${MUTED};">${pulse.score.toFixed(
            0
          )}/100</span>
        </div>
        <div style="font-size:13px;color:${BODY};line-height:1.55;">${pulse.summary}</div>`,
    }),
    section({
      theme: "gainers",
      label: `Top gainers${result.gainers.length ? ` · ${result.gainers.length}` : ""}`,
      body: moverTable(result.gainers),
    }),
    section({
      theme: "losers",
      label: `Top losers${result.losers.length ? ` · ${result.losers.length}` : ""}`,
      body: moverTable(result.losers),
    }),
  ];

  if (result.skipped.length > 0) {
    parts.push(
      section({
        theme: "skipped",
        label: "No live quote",
        body: `<div style="font-size:12px;color:${MUTED};line-height:1.6;">${result.skipped
          .map((s) => `${s.symbol} (${escapeHtml(s.reason)})`)
          .join(" &nbsp;·&nbsp; ")}</div>`,
      })
    );
  }

  parts.push(
    footnote(
      `Intraday snapshot of live prices only — quoted ${result.quotedCount} of ${result.watchlistSize} ` +
        "watchlist names plus the benchmark ETFs. No RSI, scores, or targets; those are end-of-day " +
        "(see the morning digest). Quotes via Finnhub, delayed per their free tier. Pulse is a " +
        "deterministic breadth + benchmark gauge. NFA."
    )
  );

  return page(parts.join(""));
}

function renderText(result: MiddayResult): string {
  const lines: string[] = ["☀️ afternoon", ""];

  lines.push("BENCHMARKS");
  for (const b of result.marketBriefing.benchmarks) {
    lines.push(`  ${b.label}: ${fmtCurrency(b.price)} (${fmtPct(b.changePercent)})`);
  }
  lines.push(`  ${result.marketBriefing.summary}`);
  lines.push("");

  lines.push(`INTRADAY PULSE: ${result.pulse.label}`);
  lines.push(`  ${result.pulse.summary}`);
  lines.push("");

  const moverLines = (quotes: MiddayQuote[]) => {
    if (quotes.length === 0) {
      lines.push("  None.");
      return;
    }
    for (const q of quotes) {
      lines.push(
        `  ${q.symbol.padEnd(6)} ${fmtCurrency(q.price).padStart(9)} ${fmtPct(
          q.changePercent
        ).padStart(8)}`
      );
    }
  };

  lines.push("TOP GAINERS");
  moverLines(result.gainers);
  lines.push("");
  lines.push("TOP LOSERS");
  moverLines(result.losers);
  lines.push("");

  if (result.skipped.length > 0) {
    lines.push("No live quote (skipped):");
    lines.push(result.skipped.map((s) => `${s.symbol} (${s.reason})`).join(", "));
    lines.push("");
  }

  lines.push(
    "Intraday snapshot of live prices only — no RSI, scores, or targets (those are end-of-day; see the morning digest). Quotes via Finnhub, delayed per their free tier. Pulse is a deterministic breadth + benchmark gauge, not a third-party index. NFA."
  );

  return lines.join("\n");
}
