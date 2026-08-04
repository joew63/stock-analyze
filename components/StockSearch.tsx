"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function StockSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search a ticker (e.g. AAPL, TSLA, NVDA)"
        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder-neutral-500 focus:border-neutral-400 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-neutral-100 px-5 py-3 font-medium text-neutral-900 transition hover:bg-white"
      >
        Analyze
      </button>
    </form>
  );
}
