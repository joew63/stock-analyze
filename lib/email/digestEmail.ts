import type {
  DigestResult,
  DigestRow,
  MarketSentiment,
  NewsHighlight,
  UpcomingEvent,
} from "@/lib/digest/types";

function fmtCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function todayLabel(iso: string): string {
  return iso.slice(0, 10);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "in 2 days (Tue, Sep 9)" style label for a calendar event.
function eventTiming(e: UpcomingEvent): string {
  const dow = new Date(`${e.date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const rel =
    e.daysUntil <= 0 ? "today" : e.daysUntil === 1 ? "tomorrow" : `in ${e.daysUntil} days`;
  return `${rel} (${dow})`;
}

// Rough "3h ago" / "2d ago" from a unix-seconds timestamp.
function relativeTime(unixSec: number): string {
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - unixSec);
  if (diffSec < 3600) return `${Math.max(1, Math.round(diffSec / 60))}m ago`;
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86_400)}d ago`;
}

function sentimentColor(label: MarketSentiment["label"]): string {
  if (label === "Bullish") return "#059669";
  if (label === "Bearish") return "#dc2626";
  return "#737373";
}

function changeColor(n: number): string {
  if (n > 0) return "#059669";
  if (n < 0) return "#dc2626";
  return "#525252";
}

function flagFor(row: DigestRow): string {
  if (row.oversold) return "Oversold";
  if (row.overbought) return "Overbought";
  return "";
}

export interface RenderedDigestEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderDigestEmail(result: DigestResult): RenderedDigestEmail {
  const date = todayLabel(result.scannedAt);
  const lead = result.standouts[0];
  const baseSubject = lead
    ? `Stock digest ${date}: ${result.marketSentiment.label} sentiment, ${lead.symbol} leads`
    : `Stock digest ${date}: ${result.marketSentiment.label} sentiment`;

  // Surface an imminent earnings date right in the subject — that's the
  // part of "important news coming up" you'd want to see without opening.
  const imminent = result.upcomingEvents.filter((e) => e.daysUntil <= 1);
  const subject =
    imminent.length > 0
      ? `${baseSubject} · ${imminent.map((e) => e.symbol).join(", ")} earns ${
          imminent.every((e) => e.daysUntil === 0) ? "today" : "soon"
        }`
      : baseSubject;

  const html = renderHtml(result, date);
  const text = renderText(result, date);

  return { subject, html, text };
}

function renderHtml(result: DigestResult, date: string): string {
  const cardStyle = (highlighted: boolean) =>
    `border:1px solid ${
      highlighted ? "#d97706" : "#e5e5e5"
    };border-radius:12px;padding:16px;margin-bottom:12px;${highlighted ? "background:#fffbeb;" : ""}`;
  const sectionTitleStyle = "font-size:14px;font-weight:600;color:#171717;margin:24px 0 8px 0;";
  const labelStyle = "color:#737373;font-size:12px;";
  const gradeRow = (grades: DigestRow["grades"]) =>
    `Valuation ${grades.valuation.toFixed(0)} · Growth ${grades.growth.toFixed(0)} · ` +
    `Profitability ${grades.profitability.toFixed(0)} · Momentum ${grades.momentum.toFixed(
      0
    )} · EPS &amp; Revenue ${grades.epsRevenue.toFixed(0)}`;

  const benchmarkRow = result.marketBriefing.benchmarks
    .map(
      (b) =>
        `<td style="padding:4px 10px 4px 0;font-size:13px;color:#171717;">${b.label}</td>` +
        `<td style="padding:4px 10px 4px 0;font-size:13px;color:#171717;">${fmtCurrency(b.price)}</td>` +
        `<td style="padding:4px 0;font-size:13px;font-weight:600;color:${changeColor(
          b.changePercent
        )};">${fmtPct(b.changePercent)}</td>`
    )
    .map((cells) => `<tr>${cells}</tr>`)
    .join("");

  const marketSection = `
  <div style="${sectionTitleStyle}">Market briefing</div>
  <table style="border-collapse:collapse;margin-bottom:8px;">${benchmarkRow}</table>
  <div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:16px;">
    ${result.marketBriefing.summary}
  </div>
  <div style="${sectionTitleStyle}margin-top:0;">
    Market sentiment: <span style="color:${sentimentColor(result.marketSentiment.label)};">${
      result.marketSentiment.label
    }</span>
  </div>
  <div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:8px;">
    ${result.marketSentiment.summary}
  </div>`;

  const standoutCards = result.standouts
    .map(
      (c) => `
      <div style="${cardStyle(c.allFactorsStrong)}">
        <div style="font-size:16px;font-weight:600;color:#171717;">
          ${c.symbol} <span style="font-weight:400;color:#525252;">— ${c.name}</span>
          ${
            c.allFactorsStrong
              ? `<span style="margin-left:8px;background:#d97706;color:#ffffff;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;vertical-align:middle;">★ Strong signal</span>`
              : ""
          }
        </div>
        <div style="margin:4px 0 10px 0;font-size:14px;color:#171717;">
          ${fmtCurrency(c.price)} &nbsp;·&nbsp;
          <span style="color:${changeColor(c.changePercent)};">${fmtPct(c.changePercent)}</span>
          &nbsp;·&nbsp; RSI(14) ${c.rsi.toFixed(0)} &nbsp;·&nbsp; score ${c.score.toFixed(0)}/100
          ${flagFor(c) ? ` &nbsp;·&nbsp; ${flagFor(c)}` : ""}
        </div>
        <div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:10px;">
          ${c.thesis}
        </div>
        ${
          c.businessSummary
            ? `<div style="font-size:13px;color:#404040;line-height:1.5;margin-bottom:8px;">
                 <b style="color:#171717;">What they do:</b> ${c.businessSummary}
               </div>`
            : ""
        }
        <div style="font-size:13px;color:#7c2d12;line-height:1.5;margin-bottom:10px;">
          <b>Worth watching:</b> ${c.caution}
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

  const standoutSection = `
  <div style="${sectionTitleStyle}">Standouts</div>
  ${
    result.standouts.length > 0
      ? standoutCards
      : `<div style="${cardStyle(false)}color:#525252;font-size:14px;">No standouts today.</div>`
  }`;

  const standoutSymbols = new Set(result.standouts.map((r) => r.symbol));
  const fullListRows = result.rows
    .map((r) => {
      const flag = flagFor(r);
      return `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:6px 8px 6px 0;font-size:13px;color:#171717;">${
          standoutSymbols.has(r.symbol) ? "★ " : ""
        }${r.symbol}</td>
        <td style="padding:6px 8px;font-size:13px;color:#171717;">${fmtCurrency(r.price)}</td>
        <td style="padding:6px 8px;font-size:13px;color:${changeColor(r.changePercent)};">${fmtPct(
          r.changePercent
        )}</td>
        <td style="padding:6px 8px;font-size:13px;color:#171717;">${r.rsi.toFixed(0)}</td>
        <td style="padding:6px 8px;font-size:13px;color:#171717;">${r.score.toFixed(0)}</td>
        <td style="padding:6px 0;font-size:12px;color:#737373;">${flag}</td>
      </tr>`;
    })
    .join("");

  const fullListSection = `
  <div style="${sectionTitleStyle}">Full watchlist (${result.rows.length})</div>
  <table style="border-collapse:collapse;width:100%;">
    <thead>
      <tr style="border-bottom:1px solid #d4d4d4;">
        <th style="text-align:left;padding:0 8px 6px 0;font-size:11px;color:#a3a3a3;">Symbol</th>
        <th style="text-align:left;padding:0 8px 6px;font-size:11px;color:#a3a3a3;">Price</th>
        <th style="text-align:left;padding:0 8px 6px;font-size:11px;color:#a3a3a3;">Chg</th>
        <th style="text-align:left;padding:0 8px 6px;font-size:11px;color:#a3a3a3;">RSI</th>
        <th style="text-align:left;padding:0 8px 6px;font-size:11px;color:#a3a3a3;">Score</th>
        <th style="text-align:left;padding:0 0 6px;font-size:11px;color:#a3a3a3;"></th>
      </tr>
    </thead>
    <tbody>${fullListRows}</tbody>
  </table>`;

  const skippedList =
    result.skipped.length > 0
      ? `<div style="margin-top:16px;font-size:12px;color:#a3a3a3;">
           <div style="margin-bottom:4px;">Not scored (data gaps):</div>
           ${result.skipped
             .map((s) => `${s.symbol} (${s.reason})`)
             .join(" &nbsp;·&nbsp; ")}
         </div>`
      : "";

  const eventRows = result.upcomingEvents
    .map((e) => {
      const imminent = e.daysUntil <= 1;
      return `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:6px 10px 6px 0;font-size:13px;color:#171717;font-weight:600;">${
          imminent ? "⚠ " : ""
        }${e.symbol}</td>
        <td style="padding:6px 10px 6px 0;font-size:13px;color:#525252;">${escapeHtml(e.name)}</td>
        <td style="padding:6px 10px 6px 0;font-size:13px;color:${
          imminent ? "#b45309" : "#171717"
        };">${eventTiming(e)}${e.when ? `, ${e.when}` : ""}</td>
        <td style="padding:6px 0;font-size:13px;color:#737373;">${
          typeof e.epsEstimate === "number" && Number.isFinite(e.epsEstimate)
            ? `est. EPS $${e.epsEstimate.toFixed(2)}`
            : ""
        }</td>
      </tr>`;
    })
    .join("");

  const eventsSection = `
  <div style="${sectionTitleStyle}">Upcoming events (next 14 days)</div>
  ${
    result.upcomingEvents.length > 0
      ? `<table style="border-collapse:collapse;width:100%;">
          <tbody>${eventRows}</tbody>
        </table>
        <div style="font-size:12px;color:#737373;line-height:1.5;margin-top:6px;">
          ${result.upcomingEvents.length} watchlist ${
            result.upcomingEvents.length === 1 ? "company reports" : "companies report"
          } earnings in this window. Earnings dates from Finnhub's calendar and can shift.
        </div>`
      : `<div style="font-size:13px;color:#525252;">No watchlist earnings scheduled in the next 14 days.</div>`
  }`;

  const newsCards = result.newsHighlights
    .map(
      (n: NewsHighlight) => `
      <div style="border:1px solid #e5e5e5;border-radius:12px;padding:14px;margin-bottom:10px;">
        <a href="${escapeHtml(n.url)}" style="font-size:14px;font-weight:600;color:#1d4ed8;text-decoration:none;line-height:1.4;">
          ${escapeHtml(n.headline)}
        </a>
        <div style="margin:4px 0 ${n.summary ? "8px" : "0"} 0;font-size:11px;color:#a3a3a3;">
          <span style="background:#f5f5f5;color:#525252;border-radius:4px;padding:1px 6px;">${escapeHtml(
            n.category
          )}</span>
          &nbsp;${escapeHtml(n.source)} &nbsp;·&nbsp; ${relativeTime(n.datetime)}
        </div>
        ${
          n.summary
            ? `<div style="font-size:13px;color:#404040;line-height:1.5;">${escapeHtml(
                n.summary
              )}</div>`
            : ""
        }
      </div>`
    )
    .join("");

  const newsSection = `
  <div style="${sectionTitleStyle}">Interesting reads</div>
  ${
    result.newsHighlights.length > 0
      ? newsCards
      : `<div style="font-size:13px;color:#525252;">No notable headlines surfaced today.</div>`
  }`;

  return `
<div style="max-width:640px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#171717;padding:20px;">
  <h1 style="font-size:18px;margin:0 0 4px 0;">Daily stock digest — ${date}</h1>
  <p style="font-size:12px;color:#737373;margin:0 0 12px 0;">
    Scanned ${result.watchlistSize} watchlist symbols. Standouts are ranked by an oversold +
    proximity-to-low + fundamentals score; a ★ Strong signal badge means a symbol scores well on
    all three factors individually, not just on the blended score. "What they do" and "Worth
    watching" are composed from the company profile and grade sub-metrics already in the scan —
    not third-party commentary. Target/stop are a statistical 30-day ±1σ band from historical
    volatility. Market sentiment is a deterministic breadth/RSI/benchmark gauge, not a third-party
    index. "Upcoming events" lists watchlist earnings dates from Finnhub's calendar; "Interesting
    reads" are third-party headlines ranked by recency and keyword signal — the only part of this
    email that isn't self-computed.
  </p>
  ${marketSection}
  ${eventsSection}
  ${standoutSection}
  ${newsSection}
  ${fullListSection}
  ${skippedList}
</div>`;
}

function renderText(result: DigestResult, date: string): string {
  const lines: string[] = [`Daily stock digest — ${date}`, ""];

  lines.push("MARKET BRIEFING");
  for (const b of result.marketBriefing.benchmarks) {
    lines.push(`  ${b.label}: ${fmtCurrency(b.price)} (${fmtPct(b.changePercent)})`);
  }
  lines.push(`  ${result.marketBriefing.summary}`);
  lines.push("");

  lines.push(`MARKET SENTIMENT: ${result.marketSentiment.label}`);
  lines.push(`  ${result.marketSentiment.summary}`);
  lines.push("");

  lines.push("UPCOMING EVENTS (next 14 days)");
  if (result.upcomingEvents.length === 0) {
    lines.push("  No watchlist earnings scheduled in the next 14 days.");
  } else {
    for (const e of result.upcomingEvents) {
      lines.push(`  ${e.daysUntil <= 1 ? "! " : "  "}${e.note}`);
    }
    lines.push("  (Earnings dates from Finnhub's calendar and can shift.)");
  }
  lines.push("");

  lines.push("STANDOUTS");
  if (result.standouts.length === 0) {
    lines.push("  None today.");
  } else {
    for (const c of result.standouts) {
      lines.push(`${c.symbol} — ${c.name}${c.allFactorsStrong ? " [★ STRONG SIGNAL]" : ""}`);
      lines.push(
        `  ${fmtCurrency(c.price)} (${fmtPct(c.changePercent)}) · RSI(14) ${c.rsi.toFixed(
          0
        )} · score ${c.score.toFixed(0)}/100${flagFor(c) ? ` · ${flagFor(c)}` : ""}`
      );
      lines.push(`  ${c.thesis}`);
      if (c.businessSummary) {
        lines.push(`  What they do: ${c.businessSummary}`);
      }
      lines.push(`  Worth watching: ${c.caution}`);
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

  lines.push("INTERESTING READS");
  if (result.newsHighlights.length === 0) {
    lines.push("  No notable headlines surfaced today.");
  } else {
    for (const n of result.newsHighlights) {
      lines.push(`- ${n.headline}`);
      lines.push(`  ${n.category} · ${n.source} · ${relativeTime(n.datetime)}`);
      if (n.summary) lines.push(`  ${n.summary}`);
      lines.push(`  ${n.url}`);
      lines.push("");
    }
  }
  lines.push("");

  const standoutSymbols = new Set(result.standouts.map((r) => r.symbol));
  lines.push(`FULL WATCHLIST (${result.rows.length})`);
  for (const r of result.rows) {
    const star = standoutSymbols.has(r.symbol) ? "* " : "  ";
    const flag = flagFor(r);
    lines.push(
      `${star}${r.symbol.padEnd(6)} ${fmtCurrency(r.price).padStart(9)} ${fmtPct(
        r.changePercent
      ).padStart(8)}  RSI ${r.rsi.toFixed(0).padStart(3)}  score ${r.score
        .toFixed(0)
        .padStart(3)}${flag ? `  ${flag}` : ""}`
    );
  }
  lines.push("");

  if (result.skipped.length > 0) {
    lines.push("Not scored (data gaps):");
    lines.push(result.skipped.map((s) => `${s.symbol} (${s.reason})`).join(", "));
    lines.push("");
  }

  lines.push(
    "Target/stop are a statistical 30-day +/-1 std-dev band from historical volatility, not a guarantee. Market sentiment is a deterministic breadth/RSI/benchmark gauge, not a third-party index. Upcoming events are watchlist earnings dates from Finnhub's calendar (can shift). Interesting reads are third-party headlines, ranked by recency/keywords, not endorsements. NFA."
  );

  return lines.join("\n");
}
