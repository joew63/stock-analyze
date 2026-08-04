import type { GradeResult } from "@/lib/grading";

function scoreColorClass(score: number): string {
  if (score >= 90) return "text-emerald-700 border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-400";
  if (score >= 80) return "text-lime-700 border-lime-500/40 bg-lime-500/10 dark:text-lime-400";
  if (score >= 70) return "text-yellow-700 border-yellow-500/40 bg-yellow-500/10 dark:text-yellow-400";
  if (score >= 60) return "text-orange-700 border-orange-500/40 bg-orange-500/10 dark:text-orange-400";
  return "text-red-700 border-red-500/40 bg-red-500/10 dark:text-red-400";
}

export function GradeCard({ grade }: { grade: GradeResult }) {
  const colorClass = scoreColorClass(grade.score);

  return (
    <details className="group rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{grade.category}</div>
          {grade.insufficientData && (
            <div className="text-xs text-neutral-400 dark:text-neutral-500">Limited data</div>
          )}
        </div>
        <div className={`rounded-lg border px-3 py-1 text-xl font-bold ${colorClass}`}>
          {grade.score.toFixed(0)}
          <span className="text-sm font-normal opacity-60">/100</span>
        </div>
      </summary>

      <div className="mt-4 space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        {grade.notes.map((note, i) => (
          <p key={i} className="text-xs text-neutral-500">
            {note}
          </p>
        ))}
        <ul className="space-y-1.5">
          {grade.metrics.map((m) => (
            <li key={m.key} className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{m.label}</span>
              <span
                className={
                  m.score === null
                    ? "text-neutral-400 dark:text-neutral-600"
                    : "text-neutral-800 dark:text-neutral-200"
                }
              >
                {m.displayValue}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
