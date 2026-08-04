import type { GradeResult } from "@/lib/grading";

const LETTER_COLORS: Record<string, string> = {
  "A+": "text-emerald-700 border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-400",
  A: "text-emerald-700 border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-400",
  "A-": "text-emerald-700 border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-400",
  "B+": "text-lime-700 border-lime-500/40 bg-lime-500/10 dark:text-lime-400",
  B: "text-lime-700 border-lime-500/40 bg-lime-500/10 dark:text-lime-400",
  "B-": "text-lime-700 border-lime-500/40 bg-lime-500/10 dark:text-lime-400",
  "C+": "text-yellow-700 border-yellow-500/40 bg-yellow-500/10 dark:text-yellow-400",
  C: "text-yellow-700 border-yellow-500/40 bg-yellow-500/10 dark:text-yellow-400",
  "C-": "text-yellow-700 border-yellow-500/40 bg-yellow-500/10 dark:text-yellow-400",
  "D+": "text-orange-700 border-orange-500/40 bg-orange-500/10 dark:text-orange-400",
  D: "text-orange-700 border-orange-500/40 bg-orange-500/10 dark:text-orange-400",
  "D-": "text-orange-700 border-orange-500/40 bg-orange-500/10 dark:text-orange-400",
  F: "text-red-700 border-red-500/40 bg-red-500/10 dark:text-red-400",
};

export function GradeCard({ grade }: { grade: GradeResult }) {
  const colorClass =
    LETTER_COLORS[grade.letter] ?? "text-neutral-500 border-neutral-300 dark:border-neutral-700";

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
          {grade.letter}
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
        <div className="pt-1 text-xs text-neutral-500">
          Composite score: {grade.score.toFixed(0)}/100
        </div>
      </div>
    </details>
  );
}
