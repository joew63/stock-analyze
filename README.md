# Stock Analyzer

A personal, single-user tool that emails you a daily stock digest: it scans a
curated watchlist once every trading morning and always sends — there's no
"clear the bar" gate. An optional lighter midday update goes out during the
session. A web UI for ad-hoc single-ticker research is bundled in too, but the
email digests are the point.

Not investment advice — every target/stop in the mail is a statistical 30-day
±1σ band from historical volatility, not a promise.

## The morning digest

Sent once per trading day. Four parts:

1. **Market briefing** — SPY/QQQ/DIA/IWM price + % change, with a one-line
   summary of which benchmark led/lagged.
2. **Market sentiment** — a deterministic Bullish/Neutral/Bearish gauge
   computed from watchlist breadth (% of symbols up today), average RSI, and
   benchmark performance. Not a third-party fear/greed index — see
   `computeMarketSentiment` in `lib/digest/market.ts` for the exact weights.
3. **Standouts** — the top 3-5 symbols by score (oversold + proximity to
   52-week low + fundamentals), each with a thesis, 30-day target/stop-loss,
   and grade breakdown.
4. **Full watchlist** — every scanned symbol as a compact row (price, change%,
   RSI, score, oversold/overbought flag), so nothing is hidden just because it
   didn't stand out.

Code lives in `lib/digest/*`, `lib/email/*`, and `app/api/digest/route.ts`.

**Watchlist**: `lib/digest/watchlist.ts`, ~30 liquid large-caps. FMP's free
tier 402s historical prices for a chunk of large-caps (confirmed at time of
writing: AVGO, ORCL, CRM, HD, MCD, LLY, MA, CAT, PG, ABT, TMO, LIN, ACN, TXN,
QCOM, LOW, TJX, BKNG, IBM) — those are already excluded from the default list.
A gated symbol just gets silently skipped with a clear reason (data
unavailable, not a "didn't qualify" judgment) rather than breaking the scan,
so it's safe to experiment with the list.

## The midday update

`GET /api/digest?mode=midday` sends a lighter intraday email: benchmark moves,
an intraday **pulse** (Bullish/Neutral/Bearish from watchlist breadth +
benchmark move — no RSI term, since RSI intraday is just yesterday's close
restated), and the day's top gainers/losers across the watchlist. It only
pulls live Finnhub quotes — no FMP fundamentals or history — so there are
deliberately **no RSI, scores, targets, or stop-losses**; those come from
end-of-day data that doesn't move through the session, and the morning digest
is where they live. See `lib/digest/midday.ts` and `lib/email/middayEmail.ts`.

## Previewing a digest without sending mail

`GET /api/digest?dryRun=true` (with the `x-digest-secret` header) runs the full
scan and returns the rendered email as JSON without sending anything. Add
`&mode=midday` to preview that one. Use this to tune the watchlist or
thresholds before trusting the schedule to send real mail.

## How the numbers are computed

No database — every scan fetches from two free-tier data providers, computes
grades/projections server-side, and caches results in memory for a while (see
`lib/cache.ts`).

- **[Finnhub](https://finnhub.io)** — quote, analyst recommendation trend,
  company news, earnings surprises
- **[Financial Modeling Prep (FMP)](https://financialmodelingprep.com)** —
  company profile, financial ratios, income statement history, historical
  daily prices

The grading methodology (all thresholds, weights, and formulas) lives in
[`lib/grading/thresholds.ts`](lib/grading/thresholds.ts) and the five category
scorers in `lib/grading/*.ts` — Valuation, Growth, Profitability, Momentum,
EPS & Revenue, each a 0-100 rating. Grades are absolute-threshold based, not
sector-relative, since free-tier data doesn't reliably expose sector peer sets.

**No analyst dollar price targets** — no reputable provider offers them for
free, which is why the target/stop shown is a self-computed statistical
estimate (trend + volatility bands from historical prices) rather than a
$ price target.

## Getting API keys (both free)

1. **Finnhub**: sign up at [finnhub.io/register](https://finnhub.io/register),
   copy your API key from the dashboard.
2. **Financial Modeling Prep**: sign up at
   [site.financialmodelingprep.com/register](https://site.financialmodelingprep.com/register),
   copy your API key from the dashboard.

Neither requires a credit card for the free tier.

## Local development

```bash
cp .env.local.example .env.local
# then fill in FINNHUB_API_KEY and FMP_API_KEY in .env.local
npm install
npm run dev
```

Then preview a digest at
[http://localhost:3000/api/digest?dryRun=true](http://localhost:3000/api/digest?dryRun=true)
(you'll need the `x-digest-secret` header — see `app/api/digest/route.ts` for
how it's read locally).

## Deploying and scheduling the digest

The app is a Next.js (TypeScript, App Router) SSR app deployed to AWS Amplify.
It has no persistent server, so the digest needs its own external trigger, and
mail is sent through the Gmail account it's going to anyway rather than a
third-party mailer — sending as yourself through Gmail's own SMTP servers means
SPF/DKIM/DMARC are naturally aligned to gmail.com (no domain to buy or verify,
and nothing for Gmail's spam filter to flag as spoofed). This used to go
through SES; see git history if you need to resurrect that path (e.g. for a
sender address that isn't a personal Gmail account).

### 1. Deploy the app to Amplify

1. Push this repo to GitHub (or GitLab/Bitbucket/CodeCommit).
2. In the [AWS Amplify console](https://console.aws.amazon.com/amplify), choose
   **New app → Host web app**, connect the repo/branch. Amplify auto-detects
   the Next.js SSR app and uses [`amplify.yml`](amplify.yml) for the build
   spec.
3. Under **App settings → Environment variables**, add `FINNHUB_API_KEY` and
   `FMP_API_KEY`.
4. Deploy. Amplify builds and serves the app on Lambda under the hood — no
   server to manage, and well within a small free-tier/low-traffic budget.

**Gotcha**: Amplify only injects console-configured environment variables at
*build* time by default — code that runs at *request* time (our API route)
won't see them unless they're written into `.env.production` during the build.
[`amplify.yml`](amplify.yml) already handles this
(`env | grep -e FINNHUB_API_KEY -e FMP_API_KEY >> .env.production` before
`npm run build`). If you add more env vars later, add them to that same `grep`
pattern or they'll silently be `undefined` at runtime. Note this does mean the
key values end up in the build artifacts — acceptable here since these are
free-tier, read-only data API keys with no billing risk, but don't extend this
pattern to real secrets (use
[SSR compute IAM roles](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html)
for those instead).

### 2. One-time AWS + Gmail setup for sending mail

1. **Enable 2-Step Verification** on the Google account you're sending from, if
   it isn't already (Google Account → Security).
2. **Create an App Password**: Google Account → Security → App passwords →
   generate one for "Mail". You get a 16-character code — a scoped, revocable
   credential, not your real account password.
3. **Store the App Password in SSM Parameter Store** (not env vars — it's a
   real secret, unlike the free-tier API keys the Gotcha note above talks
   about, so it shouldn't end up baked into build artifacts):
   `aws ssm put-parameter --name /digest/gmail-app-password --type
   SecureString --value "xxxx xxxx xxxx xxxx"`.
4. **Generate a cron secret and store it in SSM too** — it's what
   authenticates calls to `/api/digest`, so it's a real secret just like the
   App Password and shouldn't end up baked into build artifacts either:
   `openssl rand -hex 32` to generate it, then `aws ssm put-parameter --name
   /digest/cron-secret --type SecureString --value "<the generated value>"`.
5. **Let the app's Lambda read both parameters**: attach an inline IAM policy
   granting `ssm:GetParameter` (with decryption) on both parameters' ARNs to
   the Amplify app's [SSR compute
   role](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html).
   No AWS access keys go in env vars — the SDK picks up the Lambda's own role.
6. **Add env vars** in Amplify Console → App settings → Environment variables:
   `DIGEST_GMAIL_USER` (the Gmail address sending the mail),
   `DIGEST_GMAIL_APP_PASSWORD_PARAM` (the SSM parameter *name* from step 3,
   e.g. `/digest/gmail-app-password`), `DIGEST_RECIPIENT_EMAIL`,
   `DIGEST_AWS_REGION` (the region you created the SSM parameters in), and
   `DIGEST_CRON_SECRET_PARAM` (the SSM parameter *name* from step 4, e.g.
   `/digest/cron-secret`). All of these are parameter *names*, not secrets
   themselves, so they're fine at build time. Redeploy so `amplify.yml` picks
   them into `.env.production`.
7. **Schedule the daily trigger** with EventBridge Scheduler, since it needs to
   call the app's own HTTPS endpoint with a secret header:
   - Create an EventBridge **connection** (`API_KEY` auth, key name
     `x-digest-secret`, value = the raw secret string you generated in step
     4 — EventBridge holds this in its own managed connection store, not your
     build artifacts).
   - Create an EventBridge **API destination** using that connection, pointing
     at `https://<your-amplify-domain>/api/digest`.
   - Create a **Scheduler schedule** targeting that API destination, e.g. cron
     `cron(0 7 ? * MON-FRI *)` with `ScheduleExpressionTimezone:
     America/New_York` (handles EST/EDT automatically, trading days only).
   The Console wizard is easier to get right than hand-written CLI here since
   this is a multi-resource, IAM-heavy setup — see the [EventBridge Scheduler
   docs](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
   for the exact screens.

Once wired up, hit `GET /api/digest?dryRun=true` yourself first (with the
secret header) to confirm the scan looks right before trusting the schedule to
send real mail.

### 3. Also scheduling the midday update

Add a **second** EventBridge schedule (same as step 7 above) pointing at the
same API destination with the URL `.../api/digest?mode=midday` and a cron like
`cron(0 12 ? * MON-FRI *)` / `America/New_York`. No new env vars, SSM
parameters, or IAM changes — it reuses the daily digest's entire setup.

## The bundled web UI

Also served by the same app: search a ticker and get a breakdown — a
multi-timeframe price chart, key metrics, the five 0-100 ratings, the
statistical price projection, analyst recommendation trend, a financial
statements table, and recent news. Light mode by default, with a dark mode
toggle. Run `npm run dev` and open
[http://localhost:3000](http://localhost:3000), or visit the Amplify URL after
deploy, and search a ticker (e.g. `AAPL`).

## Notes / known limitations

- **No database** — every scan and every page load re-fetches from the
  providers (through the in-memory cache). Fine for single-user use; would need
  a real cache/store (e.g. DynamoDB) if this ever gets multi-user traffic.
- **FMP field names**: FMP has renamed fields across API versions in the past.
  `lib/providers/fmp.ts` tries a few known aliases per metric
  (`pickNumber`/`pickString` helpers) so a minor rename doesn't silently break
  everything — but if a metric shows up as "N/A" for every stock, check the raw
  FMP response for that endpoint and add the correct field name to the alias
  list.
- **Grades show their receipts** — every grade card expands to show the exact
  sub-metrics and values that produced it. If a metric is unavailable, it's
  excluded from the average rather than faked.
- **No hourly/intraday chart** — FMP's free tier paywalls intraday endpoints
  (`/historical-chart/1hour` etc). The price chart uses daily EOD data only,
  with 1M/3M/YTD/1Y/5Y range buttons.
- **FMP `limit` cap** — the free tier caps `limit` at 5 for `/income-statement`
  (both annual and quarterly). `lib/stockData.ts` requests exactly 5 for each;
  requesting more returns a 402, not partial data.
