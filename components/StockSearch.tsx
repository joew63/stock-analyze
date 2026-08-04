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
        className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-400"
      />
      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-5 py-3 font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        Analyze
      </button>
    </form>
  );
}
