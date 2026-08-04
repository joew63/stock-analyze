export type Letter =
  | "A+" | "A" | "A-"
  | "B+" | "B" | "B-"
  | "C+" | "C" | "C-"
  | "D+" | "D" | "D-"
  | "F";

const BANDS: [number, Letter][] = [
  [97, "A+"], [93, "A"], [90, "A-"],
  [87, "B+"], [83, "B"], [80, "B-"],
  [77, "C+"], [73, "C"], [70, "C-"],
  [67, "D+"], [63, "D"], [60, "D-"],
  [0, "F"],
];

export function scoreToLetter(score: number): Letter {
  for (const [min, letter] of BANDS) {
    if (score >= min) return letter;
  }
  return "F";
}
