# Stock Analyzer

A personal research tool: search a ticker and get a breakdown — key metrics,
five brutally honest letter grades (Valuation, Growth, Profitability,
Momentum, EPS & Revenue), a statistical price projection, analyst
recommendation trend, and recent news.

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

## Notes / known limitations

- **No database** — every page load re-fetches from the providers (through the in-memory cache). Fine for single-user use; would need a real cache/store (e.g. DynamoDB) if this ever gets multi-user traffic.
- **FMP field names**: FMP has renamed fields across API versions in the past. `lib/providers/fmp.ts` tries a few known aliases per metric (`pickNumber`/`pickString` helpers) so a minor rename doesn't silently break everything — but if a metric shows up as "N/A" for every stock, check the raw FMP response for that endpoint and add the correct field name to the alias list.
- **Grades show their receipts** — every grade card expands to show the exact sub-metrics and values that produced it. If a metric is unavailable, it's excluded from the average rather than faked.
