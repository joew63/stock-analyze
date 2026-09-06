import type {
  DigestResult,
  DigestRow,
  MarketSentiment,
  UpcomingEvent,
} from "@/lib/digest/types";
import {
  BODY,
  FAINT,
  fmtCurrency,
  fmtPct,
  HAIRLINE,
  INK,
  MUTED,
  UP,
  DOWN,
  changeColor,
  escapeHtml,
  footnote,
  h1,
  page,
  readsSection,
  relativeTime,
  section,
  SECTION,
} from "./emailTheme";

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

function sentimentColor(label: MarketSentiment["label"]): string {
  if (label === "Bullish") return UP;
  if (label === "Bearish") return DOWN;
  return MUTED;
}

function flagFor(row: DigestRow): string {
  if (row.oversold) return "Oversold";
  if (row.overbought) return "Overbought";
  return "";
}

function flagChip(row: DigestRow): string {
  const label = flagFor(row);
  if (!label) return "";
  const [bg, fg] = row.overbought ? ["#fee2e2", "#991b1b"] : ["#fef3c7", "#92400e"];
  return `<span style="display:inline-block;background:${bg};color:${fg};border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600;">${label}</span>`;
}

export interface RenderedDigestEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderDigestEmail(result: DigestResult): RenderedDigestEmail {
  const subject = `🌅 morning - ${result.marketSentiment.label} sentiment`;
  const html = renderHtml(result);
  const text = renderText(result);

  return { subject, html, text };
}

function renderHtml(result: DigestResult): string {
  return page(
    [
      h1("🌅 morning"),
      briefingSection(result),
      sentimentSection(result),
      eventsSection(result),
      standoutsSection(result),
      readsSection(result.newsHighlights),
      watchlistSection(result),
      skippedSection(result),
      footnote(
        "Not advice. Sentiment and target/stop bands are self-computed from price and " +
          "fundamentals data; “Interesting reads” are third-party headlines. NFA."
      ),
    ].join("")
  );
}

function briefingSection(result: DigestResult): string {
  const rows = result.marketBriefing.benchmarks
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

  return section({
    theme: "briefing",
    label: "Market briefing",
    body: `
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <div style="margin-top:10px;font-size:13px;color:${BODY};line-height:1.55;">${result.marketBriefing.summary}</div>`,
  });
}

function sentimentSection(result: DigestResult): string {
  const s = result.marketSentiment;
  const color = sentimentColor(s.label);
  return section({
    theme: "sentiment",
    label: "Market sentiment",
    body: `
      <div style="margin-bottom:8px;">
        <span style="display:inline-block;padding:3px 11px;border-radius:999px;background:${color};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.02em;">${
          s.label
        }</span>
        <span style="margin-left:8px;font-size:12px;color:${MUTED};">${s.score.toFixed(0)}/100</span>
      </div>
      <div style="font-size:13px;color:${BODY};line-height:1.55;">${s.summary}</div>`,
  });
}

function eventsSection(result: DigestResult): string {
  if (result.upcomingEvents.length === 0) {
    return section({
      theme: "events",
      label: "Upcoming events · next 14 days",
      body: `<div style="font-size:13px;color:${MUTED};">No watchlist earnings scheduled in the next 14 days.</div>`,
    });
  }

  const rows = result.upcomingEvents
    .map((e) => {
      const imminent = e.daysUntil <= 1;
      const dot = imminent
        ? `<span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:${SECTION.events.accent};margin-right:7px;vertical-align:middle;"></span>`
        : "";
      const est =
        typeof e.epsEstimate === "number" && Number.isFinite(e.epsEstimate)
          ? `est. EPS $${e.epsEstimate.toFixed(2)}`
          : "";
      return `
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:13px;color:${INK};font-weight:700;white-space:nowrap;">${dot}${
          e.symbol
        }</td>
        <td style="padding:6px 12px 6px 0;font-size:13px;color:${MUTED};">${escapeHtml(e.name)}</td>
        <td style="padding:6px 12px 6px 0;font-size:13px;color:${
          imminent ? "#b45309" : INK
        };white-space:nowrap;">${eventTiming(e)}${e.when ? `, ${e.when}` : ""}</td>
        <td style="padding:6px 0;font-size:12px;color:${FAINT};white-space:nowrap;">${est}</td>
      </tr>`;
    })
    .join("");

  return section({
    theme: "events",
    label: "Upcoming events · next 14 days",
    body: `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${rows}</table>`,
    note: `${result.upcomingEvents.length} watchlist ${
      result.upcomingEvents.length === 1 ? "company reports" : "companies report"
    } earnings in this window. Dates from Finnhub's calendar and can shift.`,
  });
}

function standoutsSection(result: DigestResult): string {
  if (result.standouts.length === 0) {
    return section({
      theme: "standouts",
      label: "Standouts",
      body: `<div style="font-size:13px;color:${MUTED};">No standouts today.</div>`,
    });
  }

  const accent = SECTION.standouts.accent;
  const cards = result.standouts
    .map((c) => {
      const borderColor = c.allFactorsStrong ? "#e0b528" : HAIRLINE;
      const badge = c.allFactorsStrong
        ? `<span style="display:inline-block;margin-left:8px;background:#d97706;color:#ffffff;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;letter-spacing:.03em;vertical-align:middle;">★ STRONG</span>`
        : "";
      const score = Math.max(0, Math.min(100, c.score));
      const business = c.businessSummary
        ? `<div style="font-size:13px;color:${BODY};line-height:1.55;margin-bottom:8px;"><span style="color:${INK};font-weight:600;">What they do:</span> ${escapeHtml(
            c.businessSummary
          )}</div>`
        : "";
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin-bottom:10px;">
        <tr><td style="background:#ffffff;border:1px solid ${borderColor};border-radius:12px;padding:15px 16px;">
          <div style="font-size:15px;font-weight:700;color:${INK};">
            ${c.symbol}<span style="font-weight:400;color:${MUTED};"> — ${escapeHtml(c.name)}</span>${badge}
          </div>
          <div style="margin:6px 0 8px;font-size:13px;color:${INK};">
            <b>${fmtCurrency(c.price)}</b>
            &nbsp;<span style="color:${changeColor(c.changePercent)};font-weight:600;">${fmtPct(
              c.changePercent
            )}</span>
            &nbsp;·&nbsp; RSI ${c.rsi.toFixed(0)}
            &nbsp;·&nbsp; score ${c.score.toFixed(0)}
            ${flagChip(c) ? `&nbsp; ${flagChip(c)}` : ""}
          </div>
          <div style="height:4px;background:#ececf5;border-radius:999px;overflow:hidden;margin-bottom:10px;">
            <div style="height:4px;width:${score.toFixed(0)}%;background:${accent};"></div>
          </div>
          <div style="font-size:13px;color:${BODY};line-height:1.55;margin-bottom:8px;">${escapeHtml(
            c.thesis
          )}</div>
          ${business}
          <div style="font-size:13px;color:#7c2d12;line-height:1.55;margin-bottom:12px;"><span style="font-weight:600;">Worth watching:</span> ${escapeHtml(
            c.caution
          )}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
            <tr>
              <td style="padding-right:8px;">
                <div style="background:#ecfdf3;border-radius:8px;padding:7px 12px;">
                  <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;">Target · ${
                    c.horizonDays
                  }d</div>
                  <div style="font-size:14px;font-weight:700;color:${UP};">${fmtCurrency(
                    c.targetPrice
                  )}</div>
                </div>
              </td>
              <td>
                <div style="background:#fef2f2;border-radius:8px;padding:7px 12px;">
                  <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;">Stop-loss</div>
                  <div style="font-size:14px;font-weight:700;color:${DOWN};">${fmtCurrency(
                    c.stopLoss
                  )}</div>
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top:10px;font-size:11px;color:${FAINT};">
            Valuation ${c.grades.valuation.toFixed(0)} · Growth ${c.grades.growth.toFixed(
              0
            )} · Profitability ${c.grades.profitability.toFixed(0)} · Momentum ${c.grades.momentum.toFixed(
              0
            )} · EPS&nbsp;&amp;&nbsp;Revenue ${c.grades.epsRevenue.toFixed(0)}
          </div>
        </td></tr>
      </table>`;
    })
    .join("");

  return section({
    theme: "standouts",
    label: `Standouts · ${result.standouts.length}`,
    body: cards,
    note: "Ranked by a blended oversold + proximity-to-low + fundamentals score. ★ STRONG = strong on all three factors individually. Target/stop are a 30-day ±1σ band from historical volatility.",
  });
}

function watchlistSection(result: DigestResult): string {
  const standoutSymbols = new Set(result.standouts.map((r) => r.symbol));
  const th =
    "text-align:right;padding:0 0 7px 8px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:" +
    FAINT +
    ";";
  const rows = result.rows
    .map((r, i) => {
      const flag = flagFor(r);
      const star = standoutSymbols.has(r.symbol)
        ? `<span style="color:#d97706;">★</span> `
        : "";
      return `<tr style="background:${i % 2 ? "#ffffff" : "#fbfbfc"};">
        <td style="padding:6px 8px 6px 0;font-size:13px;color:${INK};">${star}${r.symbol}</td>
        <td style="padding:6px 0 6px 8px;font-size:13px;color:${INK};text-align:right;">${fmtCurrency(
          r.price
        )}</td>
        <td style="padding:6px 0 6px 8px;font-size:13px;text-align:right;color:${changeColor(
          r.changePercent
        )};">${fmtPct(r.changePercent)}</td>
        <td style="padding:6px 0 6px 8px;font-size:13px;color:${INK};text-align:right;">${r.rsi.toFixed(
          0
        )}</td>
        <td style="padding:6px 0 6px 8px;font-size:13px;color:${INK};text-align:right;">${r.score.toFixed(
          0
        )}</td>
        <td style="padding:6px 0 6px 10px;font-size:11px;color:${MUTED};text-align:right;white-space:nowrap;">${flag}</td>
      </tr>`;
    })
    .join("");

  return section({
    theme: "watchlist",
    label: `Full watchlist · ${result.rows.length}`,
    body: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid ${HAIRLINE};">
            <th style="text-align:left;padding:0 8px 7px 0;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${FAINT};">Symbol</th>
            <th style="${th}">Price</th>
            <th style="${th}">Chg</th>
            <th style="${th}">RSI</th>
            <th style="${th}">Score</th>
            <th style="${th}"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`,
  });
}

function skippedSection(result: DigestResult): string {
  if (result.skipped.length === 0) return "";
  return section({
    theme: "skipped",
    label: "Not scored · data gaps",
    body: `<div style="font-size:12px;color:${MUTED};line-height:1.6;">${result.skipped
      .map((s) => `${s.symbol} (${escapeHtml(s.reason)})`)
      .join(" &nbsp;·&nbsp; ")}</div>`,
  });
}

function renderText(result: DigestResult): string {
  const lines: string[] = ["🌅 morning", ""];

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
