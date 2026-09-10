# Agent notes

Single-user stock digest emailer. No web server, no framework, no database.
A script scans a watchlist and emails a digest; GitHub Actions runs it on a
cron.

## Layout

- `scripts/run-digest.ts` — entry point. Flags: `--midday`, `--dry-run`,
  `--expect-hour=<N>` (skips unless the current America/New_York hour is N;
  the workflows use it so only the correct one of each DST-paired cron sends).
- `lib/digest/` — `scan.ts` (morning: quotes + fundamentals + RSI + scoring),
  `midday.ts` (intraday: live quotes only), plus market/news/events/thesis
  helpers.
- `lib/grading/` — five 0-100 category scorers, thresholds in `thresholds.ts`.
- `lib/providers/` — `finnhub.ts`, `fmp.ts`. Both free tier.
- `lib/email/` — `digestEmail.ts` / `middayEmail.ts` render `{subject, html,
  text}`; `gmail.ts` sends over Gmail SMTP.
- `.github/workflows/` — `digest-morning.yml` (7am ET), `digest-midday.yml`
  (12pm ET), weekdays.

## Running

```bash
npm run digest -- --dry-run
node --env-file=.env.local node_modules/.bin/tsx scripts/run-digest.ts --dry-run
```

Env vars (also the GitHub Actions secrets): `FINNHUB_API_KEY`, `FMP_API_KEY`,
`DIGEST_GMAIL_USER`, `DIGEST_GMAIL_APP_PASSWORD`, `DIGEST_RECIPIENT_EMAIL`.

## Constraints

- Typecheck with `npx tsc --noEmit`. `@/*` in tsconfig maps to the repo root.
- Free-tier rate limits: running the scan repeatedly in a short window returns
  429s (not a bug). FMP caps `limit=5` on `/income-statement`; more returns a
  402, not partial data.
- A symbol with unavailable data is skipped with a reason, never faked.
