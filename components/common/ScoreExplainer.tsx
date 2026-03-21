interface ScoreExplainerProps {
  score: number;
  type: "safety" | "risk" | "feasibility" | "contract";
}

interface ExplainResult {
  color: string;
  label: string;
  description: string;
}

function getSafetyExplanation(score: number): ExplainResult {
  if (score >= 80) return { color: "#10b981", label: "매우 안전", description: "권리 관계가 깨끗하고 투자 리스크가 낮습니다" };
  if (score >= 60) return { color: "#3b82f6", label: "양호", description: "일부 주의 사항이 있으나 전반적으로 안전합니다" };
  if (score >= 40) return { color: "#f59e0b", label: "주의 필요", description: "권리 관계에 확인이 필요한 사항이 있습니다" };
  return { color: "#ef4444", label: "위험", description: "중대한 권리 문제가 발견되었습니다" };
}

function getRiskExplanation(score: number): ExplainResult {
  if (score <= 20) return { color: "#10b981", label: "저위험", description: "리스크 요인이 거의 없습니다" };
  if (score <= 40) return { color: "#3b82f6", label: "경미", description: "소규모 리스크 요인이 존재합니다" };
  if (score <= 60) return { color: "#f59e0b", label: "주의", description: "중간 수준의 리스크 요인이 있습니다" };
  if (score <= 80) return { color: "#ef4444", label: "고위험", description: "상당한 리스크 요인이 존재합니다" };
  return { color: "#dc2626", label: "매우 위험", description: "심각한 리스크 요인이 다수 발견되었습니다" };
}

function getFeasibilityExplanation(score: number): ExplainResult {
  // feasibility uses grade-like scoring: A(90+), B(70-89), C(50-69), D(30-49), F(<30)
  if (score >= 90) return { color: "#10b981", label: "투자적격", description: "사업성이 매우 우수합니다" };
  if (score >= 70) return { color: "#3b82f6", label: "조건부적격", description: "조건 충족 시 투자 가능합니다" };
  if (score >= 50) return { color: "#f59e0b", label: "주의", description: "사업성 검토가 추가로 필요합니다" };
  if (score >= 30) return { color: "#ef4444", label: "부적격", description: "사업성이 부족합니다" };
  return { color: "#dc2626", label: "투자불가", description: "투자 부적합 판정입니다" };
}

function getContractExplanation(score: number): ExplainResult {
  // contract score = number of risk items
  if (score <= 2) return { color: "#10b981", label: "안전", description: "위험 조항이 거의 없습니다" };
  if (score <= 5) return { color: "#f59e0b", label: "주의", description: "일부 위험 조항이 발견되었습니다" };
  return { color: "#ef4444", label: "위험", description: "다수의 위험 조항이 존재합니다" };
}

export function ScoreExplainer({ score, type }: ScoreExplainerProps) {
  const explain =
    type === "safety" ? getSafetyExplanation(score) :
    type === "risk" ? getRiskExplanation(score) :
    type === "feasibility" ? getFeasibilityExplanation(score) :
    getContractExplanation(score);

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: explain.color }}
      />
      <span className="text-xs font-medium" style={{ color: explain.color }}>
        {explain.label}
      </span>
      <span className="text-xs text-[#6e6e73]">
        {explain.description}
      </span>
    </div>
  );
}
