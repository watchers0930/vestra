export type RiskGrade = "A" | "B" | "C" | "D" | "F";
export const GRADE_THRESHOLDS: Array<{ min: number; grade: RiskGrade; label: string; color: string }> = [
  { min: 85, grade: "A", label: "안전", color: "emerald" },
  { min: 70, grade: "B", label: "양호", color: "blue" },
  { min: 50, grade: "C", label: "주의", color: "amber" },
  { min: 30, grade: "D", label: "위험", color: "orange" },
  { min: 0, grade: "F", label: "매우위험", color: "red" },
];
export function getGrade(score: number): { grade: RiskGrade; label: string; color: string } {
  const { grade, label, color } = GRADE_THRESHOLDS.find(t => Number.isFinite(score) && score >= t.min)
    ?? GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
  return { grade, label, color };
}
