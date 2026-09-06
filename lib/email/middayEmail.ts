import type { MiddayPulse, MiddayQuote, MiddayResult } from "@/lib/digest/types";

function fmtCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

// "2026-09-05 13:45 ET" — the time matters for an intraday update in a way
// it doesn't for the daily digest, so spell it out in US market time.
function stampLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} ${time} ET`;
}

function pulseColor(label: MiddayPulse["label"]): string {
  if (label === "Bullish") return "#059669";
  if (label === "Bearish") return "#dc2626";
  return "#737373";
}

function changeColor(n: number): string {
  if (n > 0) return "#059669";
  if (n < 0) return "#dc2626";
  return "#525252";
}

export interface RenderedMiddayEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderMiddayEmail(result: MiddayResult): RenderedMiddayEmail {
  const stamp = stampLabel(result.scannedAt);
  const benchAvg = result.pulse.benchmarkAvgChange;
  const subject =
    `Midday market update ${stamp}: ${result.pulse.label} pulse, ` +
    `benchmarks ${benchAvg >= 0 ? "+" : ""}${benchAvg.toFixed(2)}%`;

  return {
    subject,
    html: renderHtml(result, stamp),
    text: renderText(result, stamp),
  };
}

function renderHtml(result: MiddayResult, stamp: string): string {
  const sectionTitleStyle =
    "font-size:14px;font-weight:600;color:#171717;margin:24px 0 8px 0;";

  const benchmarkRows = result.marketBriefing.benchmarks
    .map(
      (b) =>
        `<tr>` +
        `<td style="padding:4px 10px 4px 0;font-size:13px;color:#171717;">${b.label}</td>` +
        `<td style="padding:4px 10px 4px 0;font-size:13px;color:#171717;">${fmtCurrency(
          b.price
        )}</td>` +
        `<td style="padding:4px 0;font-size:13px;font-weight:600;color:${changeColor(
          b.changePercent
        )};">${fmtPct(b.changePercent)}</td>` +
        `</tr>`
    )
    .join("");

  const moverList = (quotes: MiddayQuote[]) =>
    quotes.length > 0
      ? `<table style="border-collapse:collapse;">` +
        quotes
          .map(
            (q) =>
              `<tr>` +
              `<td style="padding:3px 12px 3px 0;font-size:13px;color:#171717;font-weight:600;">${q.symbol}</td>` +
              `<td style="padding:3px 12px 3px 0;font-size:13px;color:#171717;">${fmtCurrency(
                q.price
              )}</td>` +
              `<td style="padding:3px 0;font-size:13px;font-weight:600;color:${changeColor(
                q.changePercent
              )};">${fmtPct(q.changePercent)}</td>` +
              `</tr>`
          )
          .join("") +
        `</table>`
      : `<div style="font-size:13px;color:#737373;">None.</div>`;

  const skipped =
    result.skipped.length > 0
      ? `<div style="margin-top:16px;font-size:12px;color:#a3a3a3;">
           <div style="margin-bottom:4px;">No live quote (skipped):</div>
           ${result.skipped
             .map((s) => `${s.symbol} (${s.reason})`)
             .join(" &nbsp;·&nbsp; ")}
         </div>`
      : "";

  return `
<div style="max-width:640px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#171717;padding:20px;">
  <h1 style="font-size:18px;margin:0 0 4px 0;">Midday market update — ${stamp}</h1>
  <p style="font-size:12px;color:#737373;margin:0 0 12px 0;">
    An intraday snapshot of live prices only. Quoted ${result.quotedCount} of
    ${result.watchlistSize} watchlist symbols plus the four benchmark ETFs. No RSI,
    scores, targets, or stop-losses here — those come from end-of-day data and don't
    change through the trading day; see the morning digest for that.
  </p>

  <div style="${sectionTitleStyle}">Benchmarks</div>
  <table style="border-collapse:collapse;margin-bottom:8px;">${benchmarkRows}</table>
  <div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:16px;">
    ${result.marketBriefing.summary}
  </div>

  <div style="${sectionTitleStyle}margin-top:0;">
    Intraday pulse: <span style="color:${pulseColor(result.pulse.label)};">${
      result.pulse.label
    }</span>
  </div>
  <div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:8px;">
    ${result.pulse.summary}
  </div>

  <div style="${sectionTitleStyle}">Top gainers</div>
  ${moverList(result.gainers)}

  <div style="${sectionTitleStyle}">Top losers</div>
  ${moverList(result.losers)}

  ${skipped}

  <p style="margin-top:24px;font-size:12px;color:#a3a3a3;line-height:1.5;">
    Intraday quotes via Finnhub, delayed per their free tier. Pulse is a deterministic
    breadth + benchmark gauge, not a third-party index. NFA.
  </p>
</div>`;
}

function renderText(result: MiddayResult, stamp: string): string {
  const lines: string[] = [`Midday market update — ${stamp}`, ""];

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
