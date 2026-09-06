// Shared visual system for the digest emails.
//
// Constraints that shape everything here: many clients strip <style>/<link>
// and web fonts (Gmail especially), so every rule is inline, there are no
// images, and the font is a stack that degrades to the OS UI sans. Light
// theme only. The daily email is long, so each section gets a faint color
// wash plus an accent rule on the left to stay scannable.

// "Google Sans" isn't licensed for third-party embedding, so this targets
// Roboto — Google's open UI typeface, the same shapes — and falls back to
// the platform UI sans (SF on Apple, Segoe on Windows) everywhere it can't
// load. The <link> below only lands in clients that keep <head> (Apple
// Mail, iOS); elsewhere the fallback is what renders, which is fine.
export const FONT =
  "'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";
const FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">';

export function fmtCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Neutral ramp + gain/loss colors, shared so the two emails stay in sync.
export const INK = "#18181b";
export const BODY = "#3f3f46";
export const MUTED = "#71717a";
export const FAINT = "#a1a1aa";
export const HAIRLINE = "#e8e8ea";
export const UP = "#059669";
export const DOWN = "#dc2626";
export const FLAT = "#52525b";

export function changeColor(n: number): string {
  if (n > 0) return UP;
  if (n < 0) return DOWN;
  return FLAT;
}

export interface SectionTheme {
  accent: string;
  tint: string;
}

// One entry per section across both emails. Accent is the label/rule color;
// tint is a barely-there wash of the same hue — kept close to white so the
// email doesn't read as a stack of colored boxes.
export const SECTION = {
  briefing: { accent: "#2563eb", tint: "#f7f9fe" },
  sentiment: { accent: "#0d9488", tint: "#f5faf9" },
  events: { accent: "#d97706", tint: "#fdfaf4" },
  standouts: { accent: "#4f46e5", tint: "#f8f8fd" },
  reads: { accent: "#64748b", tint: "#f9fafb" },
  watchlist: { accent: "#52525b", tint: "#fafafa" },
  gainers: { accent: "#059669", tint: "#f5fbf8" },
  losers: { accent: "#dc2626", tint: "#fdf7f7" },
  skipped: { accent: "#a1a1aa", tint: "#fafafa" },
} as const satisfies Record<string, SectionTheme>;

export type SectionKey = keyof typeof SECTION;

// A washed section block: accent left rule, label in the accent color,
// caller's body HTML, and an optional small footnote.
export function section(opts: {
  theme: SectionKey | SectionTheme;
  label: string;
  body: string;
  note?: string;
}): string {
  const t = typeof opts.theme === "string" ? SECTION[opts.theme] : opts.theme;
  const note = opts.note
    ? `<div style="margin-top:12px;font-size:11px;color:${FAINT};line-height:1.55;">${opts.note}</div>`
    : "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:12px 0;">
    <tr><td style="background:${t.tint};border-left:2px solid ${t.accent};border-radius:2px 10px 10px 2px;padding:16px 18px;">
      <div style="font-size:14px;font-weight:700;color:${t.accent};margin-bottom:12px;">${opts.label}</div>
      ${opts.body}
      ${note}
    </td></tr>
  </table>`;
}

// Outer shell: full document (so the font <link> has somewhere to live),
// pale gray page, one centered white "sheet" the content sits on.
export function page(inner: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT};">
  <div style="max-width:640px;margin:0 auto;padding:24px 12px 36px;">
    <div style="background:#ffffff;border:1px solid ${HAIRLINE};border-radius:16px;padding:28px 22px;font-family:${FONT};color:${INK};font-size:14px;line-height:1.5;">
      ${inner}
    </div>
  </div>
</body>
</html>`;
}

export function h1(text: string): string {
  return `<h1 style="font-size:22px;font-weight:700;margin:0 0 18px;letter-spacing:-.01em;">${text}</h1>`;
}

export function footnote(text: string): string {
  return `<div style="margin-top:22px;padding-top:14px;border-top:1px solid ${HAIRLINE};font-size:11px;color:${FAINT};line-height:1.6;">${text}</div>`;
}
