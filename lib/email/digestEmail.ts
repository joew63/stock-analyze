import type { DigestResult } from "@/lib/digest/types";

function fmtCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function todayLabel(iso: string): string {
  return iso.slice(0, 10);
}

export interface RenderedDigestEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderDigestEmail(result: DigestResult): RenderedDigestEmail {
  const date = todayLabel(result.scannedAt);
  const subject =
    result.candidates.length > 0
      ? `Stock digest ${date}: ${result.candidates.length} buy-the-dip candidate${
          result.candidates.length === 1 ? "" : "s"
        }`
      : `Stock digest ${date}: no candidates cleared the bar`;

  const html = renderHtml(result, date);
  const text = renderText(result, date);

  return { subject, html, text };
}

function renderHtml(result: DigestResult, date: string): string {
  const cardStyle =
    "border:1px solid #e5e5e5;border-radius:12px;padding:16px;margin-bottom:12px;";
  const labelStyle = "color:#737373;font-size:12px;";
  const gradeRow = (grades: DigestResult["candidates"][number]["grades"]) =>
    `Valuation ${grades.valuation.toFixed(0)} · Growth ${grades.growth.toFixed(0)} · ` +
    `Profitability ${grades.profitability.toFixed(0)} · Momentum ${grades.momentum.toFixed(
      0
    )} · EPS &amp; Revenue ${grades.epsRevenue.toFixed(0)}`;

  const candidateCards = result.candidates
    .map(
      (c) => `
      <div style="${cardStyle}">
        <div style="font-size:16px;font-weight:600;color:#171717;">
          ${c.symbol} <span style="font-weight:400;color:#525252;">— ${c.name}</span>
        </div>
        <div style="margin:4px 0 10px 0;font-size:14px;color:#171717;">
          ${fmtCurrency(c.price)} &nbsp;·&nbsp; RSI(14) ${c.rsi.toFixed(0)} &nbsp;·&nbsp; score ${c.score.toFixed(
            0
          )}/100
        </div>
        <div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:10px;">
          ${c.thesis}
        </div>
        <div style="font-size:13px;color:#171717;margin-bottom:6px;">
          Target (${c.horizonDays}d): <b style="color:#059669;">${fmtCurrency(
            c.targetPrice
          )}</b> &nbsp;·&nbsp; Stop-loss: <b style="color:#dc2626;">${fmtCurrency(c.stopLoss)}</b>
        </div>
        <div style="${labelStyle}">${gradeRow(c.grades)}</div>
      </div>`
    )
    .join("");

  const body =
    result.candidates.length > 0
      ? candidateCards
      : `<div style="${cardStyle}color:#525252;font-size:14px;">
           No stock in the ${result.watchlistSize}-symbol watchlist cleared the bar today
           (oversold RSI + a fundamental floor). Sometimes the right move is no move —
           see the skipped list below for context.
         </div>`;

  const skippedList =
    result.skipped.length > 0
      ? `<div style="margin-top:16px;font-size:12px;color:#a3a3a3;">
           <div style="margin-bottom:4px;">Also scanned, not flagged:</div>
           ${result.skipped
             .map((s) => `${s.symbol} (${s.reason})`)
             .join(" &nbsp;·&nbsp; ")}
         </div>`
      : "";

  return `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#171717;padding:20px;">
  <h1 style="font-size:18px;margin:0 0 4px 0;">Daily stock digest — ${date}</h1>
  <p style="font-size:12px;color:#737373;margin:0 0 20px 0;">
    Scanned ${result.watchlistSize} watchlist symbols for RSI-oversold setups backed by solid
    fundamentals. Target/stop are a statistical 30-day ±1σ band from historical volatility —
    not a guarantee. This is historical/statistical analysis, not investment advice.
  </p>
  ${body}
  ${skippedList}
</div>`;
}

function renderText(result: DigestResult, date: string): string {
  const lines: string[] = [`Daily stock digest — ${date}`, ""];

  if (result.candidates.length === 0) {
    lines.push(
      `No stock in the ${result.watchlistSize}-symbol watchlist cleared the bar today.`
    );
  } else {
    for (const c of result.candidates) {
      lines.push(`${c.symbol} — ${c.name}`);
      lines.push(
        `  ${fmtCurrency(c.price)} · RSI(14) ${c.rsi.toFixed(0)} · score ${c.score.toFixed(0)}/100`
      );
      lines.push(`  ${c.thesis}`);
      lines.push(
        `  Target (${c.horizonDays}d): ${fmtCurrency(c.targetPrice)} · Stop-loss: ${fmtCurrency(
          c.stopLoss
        )}`
      );
      lines.push(
        `  Valuation ${c.grades.valuation.toFixed(0)} / Growth ${c.grades.growth.toFixed(
          0
        )} / Profitability ${c.grades.profitability.toFixed(
          0
        )} / Momentum ${c.grades.momentum.toFixed(0)} / EPS&Rev ${c.grades.epsRevenue.toFixed(0)}`
      );
      lines.push("");
    }
  }

  if (result.skipped.length > 0) {
    lines.push("Also scanned, not flagged:");
    lines.push(result.skipped.map((s) => `${s.symbol} (${s.reason})`).join(", "));
    lines.push("");
  }

  lines.push(
    "Target/stop are a statistical 30-day +/-1 std-dev band from historical volatility, not a guarantee. Not investment advice."
  );

  return lines.join("\n");
}
