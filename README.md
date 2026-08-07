# Stock Analyzer

A personal research tool: search a ticker and get a breakdown — a
multi-timeframe price chart, key metrics, five brutally honest 0-100 ratings
(Valuation, Growth, Profitability, Momentum, EPS & Revenue), a statistical
price projection, analyst recommendation trend, a financial statements
table, and recent news. Light mode by default, with a dark mode toggle.

## How it's built

Next.js (TypeScript, App Router) full-stack app, no database — every request
fetches from two free-tier data providers, computes grades/projections
server-side, and caches results in memory for a while (see `lib/cache.ts`).

- **[Finnhub](https://finnhub.io)** — quote, analyst recommendation trend, company news, earnings surprises
- **[Financial Modeling Prep (FMP)](https://financialmodelingprep.com)** — company profile, financial ratios, income statement history, historical daily prices

Both providers' free tiers have gotten more restrictive over time — notably,
**no reputable provider offers analyst dollar price targets for free**, which
is why the projection feature shows a self-computed statistical estimate
(trend + volatility bands from historical prices) alongside the analyst
buy/hold/sell recommendation trend, instead of a $ price target.

The grading methodology (all thresholds, weights, and formulas) lives in
[`lib/grading/thresholds.ts`](lib/grading/thresholds.ts) and the five
category scorers in `lib/grading/*.ts` — read those to see exactly why a
stock got the grade it did. Grades are absolute-threshold based, not
sector-relative, since free-tier data doesn't reliably expose sector peer
sets.

## Getting API keys (both free)

1. **Finnhub**: sign up at [finnhub.io/register](https://finnhub.io/register), copy your API key from the dashboard.
2. **Financial Modeling Prep**: sign up at [site.financialmodelingprep.com/register](https://site.financialmodelingprep.com/register), copy your API key from the dashboard.

Neither requires a credit card for the free tier.

## Local development

```bash
cp .env.local.example .env.local
# then fill in FINNHUB_API_KEY and FMP_API_KEY in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and search a ticker (e.g. `AAPL`).

## Deploying to AWS Amplify

1. Push this repo to GitHub (or GitLab/Bitbucket/CodeCommit).
2. In the [AWS Amplify console](https://console.aws.amazon.com/amplify), choose **New app → Host web app**, connect the repo/branch. Amplify auto-detects the Next.js SSR app and uses [`amplify.yml`](amplify.yml) for the build spec.
3. Under **App settings → Environment variables**, add:
   - `FINNHUB_API_KEY`
   - `FMP_API_KEY`
4. Deploy. Amplify builds and serves the Next.js SSR app on Lambda under the hood — no server to manage, and well within a small free-tier/low-traffic budget.
5. After deploy, open the Amplify-provided URL and repeat the ticker search smoke test to confirm the env vars are being read correctly in production (not just from local `.env.local`).

**Gotcha**: Amplify only injects console-configured environment variables at *build* time by default — Next.js code that runs at *request* time (our API route) won't see them unless they're written into `.env.production` during the build. [`amplify.yml`](amplify.yml) already handles this (`env | grep -e FINNHUB_API_KEY -e FMP_API_KEY >> .env.production` before `npm run build`). If you add more env vars later, add them to that same `grep` pattern or they'll silently be `undefined` at runtime. Note this does mean the key values end up in the build artifacts — acceptable here since these are free-tier, read-only data API keys with no billing risk, but don't extend this pattern to real secrets (use [SSR compute IAM roles](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html) for those instead).

## Daily stock digest email

Optional feature: scans a curated watchlist once a day and always sends —
there's no "clear the bar" gate anymore. The email has four parts:

1. **Market briefing** — SPY/QQQ/DIA/IWM price + % change, with a one-line
   summary of which benchmark led/lagged.
2. **Market sentiment** — a deterministic Bullish/Neutral/Bearish gauge
   computed from watchlist breadth (% of symbols up today), average RSI,
   and benchmark performance. Not a third-party fear/greed index — see
   `computeMarketSentiment` in `lib/digest/market.ts` for the exact weights.
3. **Standouts** — the top 3-5 symbols by score (oversold + proximity to
   52-week low + fundamentals), each with a thesis, 30-day target/stop-loss,
   and grade breakdown.
4. **Full watchlist** — every scanned symbol as a compact row (price,
   change%, RSI, score, oversold/overbought flag), so nothing is hidden
   just because it didn't stand out.

See `lib/digest/*` and `app/api/digest/route.ts`.

- **Not investment advice** — target/stop are a statistical 30-day ±1σ band
  from historical volatility (the same math as the projection chart), not a
  promise.
- **Watchlist**: `lib/digest/watchlist.ts`, ~30 liquid large-caps. FMP's
  free tier 402s historical prices for a chunk of large-caps (confirmed at
  time of writing: AVGO, ORCL, CRM, HD, MCD, LLY, MA, CAT, PG, ABT, TMO,
  LIN, ACN, TXN, QCOM, LOW, TJX, BKNG, IBM) — those are already excluded
  from the default list. A gated symbol just gets silently skipped with a
  clear reason (data unavailable, not a "didn't qualify" judgment) rather
  than breaking the scan, so it's safe to experiment with the list.
- **Preview without sending mail**: `GET /api/digest?dryRun=true` (with the
  `x-digest-secret` header) runs the full scan and returns the rendered
  email as JSON without calling SES — use this to tune the watchlist or
  thresholds before trusting it to actually send.

### One-time AWS + Gmail setup

This app has no persistent server, so the digest needs its own trigger, and
mail is sent through the Gmail account it's going to anyway rather than a
third-party mailer — sending as yourself through Gmail's own SMTP servers
means SPF/DKIM/DMARC are naturally aligned to gmail.com (no domain to buy
or verify, and nothing for Gmail's spam filter to flag as spoofed). This
used to go through SES; see git history if you need to resurrect that path
(e.g. for a sender address that isn't a personal Gmail account).

1. **Enable 2-Step Verification** on the Google account you're sending
   from, if it isn't already (Google Account → Security).
2. **Create an App Password**: Google Account → Security → App passwords →
   generate one for "Mail". You get a 16-character code — a scoped,
   revocable credential, not your real account password.
3. **Store the App Password in SSM Parameter Store** (not env vars — it's a
   real secret, unlike the free-tier API keys the Gotcha note below talks
   about, so it shouldn't end up baked into build artifacts):
   `aws ssm put-parameter --name /digest/gmail-app-password --type
   SecureString --value "xxxx xxxx xxxx xxxx"`.
4. **Let the app's Lambda read it**: attach an inline IAM policy granting
   `ssm:GetParameter` (with decryption) on that parameter's ARN to the
   Amplify app's [SSR compute
   role](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html)
   (the same role the Gotcha note below points to for real secrets). No AWS
   access keys go in env vars — the SDK picks up the Lambda's own role.
5. **Add env vars** in Amplify Console → App settings → Environment
   variables: `DIGEST_GMAIL_USER` (the Gmail address sending the mail),
   `DIGEST_GMAIL_APP_PASSWORD_PARAM` (the SSM parameter *name* from step 3,
   e.g. `/digest/gmail-app-password` — not the secret itself, so this one's
   fine at build time), `DIGEST_RECIPIENT_EMAIL`, `DIGEST_AWS_REGION` (the
   region you created the SSM parameter in), and `DIGEST_CRON_SECRET` (any
   random string, e.g. `openssl rand -hex 32`). Redeploy so `amplify.yml`
   picks them into `.env.production`.
6. **Schedule the daily trigger** with EventBridge Scheduler, since it needs
   to call the app's own HTTPS endpoint with a secret header:
   - Create an EventBridge **connection** (`API_KEY` auth, key name
     `x-digest-secret`, value = your `DIGEST_CRON_SECRET`).
   - Create an EventBridge **API destination** using that connection,
     pointing at `https://<your-amplify-domain>/api/digest`.
   - Create a **Scheduler schedule** targeting that API destination, e.g.
     cron `cron(0 7 ? * MON-FRI *)` with `ScheduleExpressionTimezone:
     America/New_York` (handles EST/EDT automatically, trading days only).
   The Console wizard is easier to get right than hand-written CLI here
   since this is a multi-resource, IAM-heavy setup — see the [EventBridge
   Scheduler docs](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
   for the exact screens.

Once wired up, hit `GET /api/digest?dryRun=true` yourself first (with the
secret header) to confirm the scan looks right before trusting the
schedule to send real mail.

## Notes / known limitations

- **No database** — every page load re-fetches from the providers (through the in-memory cache). Fine for single-user use; would need a real cache/store (e.g. DynamoDB) if this ever gets multi-user traffic.
- **FMP field names**: FMP has renamed fields across API versions in the past. `lib/providers/fmp.ts` tries a few known aliases per metric (`pickNumber`/`pickString` helpers) so a minor rename doesn't silently break everything — but if a metric shows up as "N/A" for every stock, check the raw FMP response for that endpoint and add the correct field name to the alias list.
- **Grades show their receipts** — every grade card expands to show the exact sub-metrics and values that produced it. If a metric is unavailable, it's excluded from the average rather than faked.
- **No hourly/intraday chart** — FMP's free tier paywalls intraday endpoints (`/historical-chart/1hour` etc). The price chart uses daily EOD data only, with 1M/3M/YTD/1Y/5Y range buttons.
- **FMP `limit` cap** — the free tier caps `limit` at 5 for `/income-statement` (both annual and quarterly). `lib/stockData.ts` requests exactly 5 for each; requesting more returns a 402, not partial data.
