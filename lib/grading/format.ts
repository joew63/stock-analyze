export function formatPercent(n: number | null, digits = 1): string {
  return n === null ? "N/A" : `${(n * 100).toFixed(digits)}%`;
}

export function formatMultiple(n: number | null, digits = 1): string {
  return n === null ? "N/A" : `${n.toFixed(digits)}x`;
}
