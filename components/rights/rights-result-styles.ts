/**
 * RightsResult 스타일 상수 + 표시 헬퍼
 */
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

/** 위험요인 심각도별 배지 스타일 */
export const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "치명" },
  high: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "고위험" },
  medium: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "주의" },
  low: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "참고" },
};

/** 위험 분석 항목(danger/warning/safe)별 스타일·아이콘 */
export const RISK_CONFIG = {
  danger: { bg: "bg-red-50 border-red-200", text: "text-red-700", descText: "text-red-600", icon: XCircle, iconColor: "text-red-500" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", descText: "text-amber-600", icon: AlertTriangle, iconColor: "text-amber-500" },
  safe: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", descText: "text-emerald-600", icon: CheckCircle, iconColor: "text-emerald-500" },
};

/** 안전도 점수 → 라벨 */
export function getScoreLabel(score: number) {
  if (score >= 70) return "안전";
  if (score >= 40) return "주의";
  return "위험";
}
