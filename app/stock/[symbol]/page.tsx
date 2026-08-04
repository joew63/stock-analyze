import Link from "next/link";
import { getStockData, SymbolNotFoundError } from "@/lib/stockData";
import { StockSearch } from "@/components/StockSearch";
import { MetricsGrid } from "@/components/MetricsGrid";
import { GradeCard } from "@/components/GradeCard";
import { ProjectionChart } from "@/components/ProjectionChart";
import { RecommendationTrend } from "@/components/RecommendationTrend";
import { NewsFeed } from "@/components/NewsFeed";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  let data;
  try {
    data = await getStockData(symbol);
  } catch (err) {
    const message =
      err instanceof SymbolNotFoundError
        ? err.message
        : "Something went wrong fetching this stock. Try again in a moment.";
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="text-neutral-300">{message}</p>
        <Link href="/" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          Back to search
        </Link>
      </main>
    );
  }

  const { bundle, grades, projection } = data;
  const { quote, profile } = bundle;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">
            {profile?.name ?? symbol} <span className="text-neutral-500">({symbol})</span>
          </h1>
          {quote && (
            <p className="mt-1 text-lg">
              <span className="font-medium text-neutral-100">${quote.price.toFixed(2)}</span>{" "}
              <span className={quote.change >= 0 ? "text-emerald-400" : "text-red-400"}>
                {quote.change >= 0 ? "+" : ""}
                {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
              </span>
            </p>
          )}
        </div>
        <div className="w-full sm:w-auto">
          <StockSearch initialValue={symbol} />
        </div>
      </div>

      {bundle.errors.length > 0 && (
        <div className="rounded-lg border border-yellow-700/40 bg-yellow-500/5 p-3 text-xs text-yellow-500">
          Some data sources were unavailable, so parts of this page may be incomplete:{" "}
          {bundle.errors.join("; ")}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Key metrics
        </h2>
        <MetricsGrid
          quote={quote}
          profile={profile}
          ratios={bundle.ratios}
          priceHistory={bundle.priceHistory}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Brutally honest grades
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GradeCard grade={grades.valuation} />
          <GradeCard grade={grades.growth} />
          <GradeCard grade={grades.profitability} />
          <GradeCard grade={grades.momentum} />
          <GradeCard grade={grades.epsRevenue} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProjectionChart priceHistory={bundle.priceHistory} projection={projection} />
        <RecommendationTrend trend={bundle.recommendationTrend} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Latest news
        </h2>
        <NewsFeed news={bundle.news} />
      </section>
    </main>
  );
}
