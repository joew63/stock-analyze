import { StockSearch } from "@/components/StockSearch";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-100">
          Stock Analyzer
        </h1>
        <p className="mt-2 text-neutral-400">
          Brutally honest grades, key metrics, projections, and news for any stock.
        </p>
      </div>
      <StockSearch />
    </main>
  );
}
