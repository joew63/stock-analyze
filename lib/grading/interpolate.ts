// [metricValue, score(0-100)] pairs, sorted ascending by value. Direction
// (higher-is-better vs lower-is-better) is encoded by the scores you assign
// at each value, not by a separate flag.
export type ScoreCurve = [number, number][];

export function scoreFromCurve(value: number, curve: ScoreCurve): number {
  if (curve.length === 0) throw new Error("Empty score curve");
  if (value <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 0; i < curve.length - 1; i++) {
    const [v1, s1] = curve[i];
    const [v2, s2] = curve[i + 1];
    if (value >= v1 && value <= v2) {
      const t = (value - v1) / (v2 - v1);
      return s1 + t * (s2 - s1);
    }
  }
  return last[1];
}
