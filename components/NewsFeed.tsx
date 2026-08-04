import type { NewsItem } from "@/lib/providers/types";

function timeAgo(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NewsFeed({ news }: { news: NewsItem[] | null }) {
  if (!news || news.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        No recent news found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {news.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-neutral-600"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>{item.source}</span>
            <span>{timeAgo(item.datetime)}</span>
          </div>
          <h4 className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {item.headline}
          </h4>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.summary}</p>
          )}
        </a>
      ))}
    </div>
  );
}
