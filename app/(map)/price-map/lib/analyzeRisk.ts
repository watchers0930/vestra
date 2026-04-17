import type { AptData, RiskItem } from "../types";

export function analyzeRisk(apt: AptData): { score: number; grade: string; color: string; items: RiskItem[] } {
  const items: RiskItem[] = [];
  let riskScore = 0;

  const change = apt.change ?? 0;
  if (change <= -10) {
    items.push({ label: "시세 변동", level: "위험", value: `${change}%`, detail: "최근 1년 시세가 10% 이상 하락했습니다" });
    riskScore += 30;
  } else if (change <= -5) {
    items.push({ label: "시세 변동", level: "주의", value: `${change}%`, detail: "최근 1년 시세가 5% 이상 하락했습니다" });
    riskScore += 15;
  } else {
    items.push({ label: "시세 변동", level: "안전", value: `${change >= 0 ? "+" : ""}${change}%`, detail: "시세가 안정적이거나 상승 중입니다" });
  }

  const age = new Date().getFullYear() - apt.year;
  if (age >= 30) {
    items.push({ label: "건물 연식", level: "위험", value: `${age}년 (${apt.year}년 준공)`, detail: "30년 이상 노후 건물로 재건축 가능성 검토 필요" });
    riskScore += 25;
  } else if (age >= 20) {
    items.push({ label: "건물 연식", level: "주의", value: `${age}년 (${apt.year}년 준공)`, detail: "20년 이상 경과, 시설 노후화 확인 필요" });
    riskScore += 10;
  } else {
    items.push({ label: "건물 연식", level: "안전", value: `${age}년 (${apt.year}년 준공)`, detail: "비교적 신축 건물입니다" });
  }

  const pricePerPyeong = apt.price / apt.area;
  if (pricePerPyeong > 8000) {
    items.push({ label: "평당가", level: "주의", value: `${Math.round(pricePerPyeong).toLocaleString()}만원/평`, detail: "고가 매물로 가격 변동 리스크가 큽니다" });
    riskScore += 10;
  } else if (pricePerPyeong < 2000) {
    items.push({ label: "평당가", level: "주의", value: `${Math.round(pricePerPyeong).toLocaleString()}만원/평`, detail: "주변 시세 대비 낮은 가격, 원인 확인 필요" });
    riskScore += 15;
  } else {
    items.push({ label: "평당가", level: "안전", value: `${Math.round(pricePerPyeong).toLocaleString()}만원/평`, detail: "적정 가격 범위입니다" });
  }

  if (apt.area <= 20) {
    items.push({ label: "면적 리스크", level: "주의", value: `${apt.area}평`, detail: "소형 평수는 전세보증금 반환 리스크가 높을 수 있습니다" });
    riskScore += 10;
  } else {
    items.push({ label: "면적", level: "안전", value: `${apt.area}평`, detail: "일반적인 면적대입니다" });
  }

  const totalScore = Math.min(100, riskScore);
  const safeScore = 100 - totalScore;
  let grade: string, color: string;
  if (safeScore >= 80) { grade = "양호"; color = "#22c55e"; }
  else if (safeScore >= 60) { grade = "보통"; color = "#f59e0b"; }
  else if (safeScore >= 40) { grade = "주의"; color = "#f97316"; }
  else { grade = "위험"; color = "#ef4444"; }

  return { score: safeScore, grade, color, items };
}

export function getAreaColor(area: number): string {
  if (area >= 60) return "#1e3a5f";
  if (area >= 50) return "#1e40af";
  if (area >= 40) return "#2563eb";
  if (area >= 30) return "#3b82f6";
  return "#93c5fd";
}
