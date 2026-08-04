export interface MetricScore {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  score: number | null;
  weight: number;
}

export interface GradeResult {
  category: string;
  score: number;
  metrics: MetricScore[];
  notes: string[];
  insufficientData: boolean;
}

export function weightedAverage(metrics: MetricScore[]): number | null {
  const usable = metrics.filter((m) => m.score !== null && m.weight > 0);
  if (usable.length === 0) return null;
  const totalWeight = usable.reduce((sum, m) => sum + m.weight, 0);
  const weightedSum = usable.reduce(
    (sum, m) => sum + (m.score as number) * m.weight,
    0
  );
  return weightedSum / totalWeight;
}
